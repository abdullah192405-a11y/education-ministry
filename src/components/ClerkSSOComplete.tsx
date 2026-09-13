import { useEffect, useRef, useState } from "react";
import { useUser as useClerkUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

const getDashboardPath = (role: string) => {
    const r = role?.toUpperCase();
    if (r === "SUPERADMIN") return "/dashboard/superadmin";
    if (r === "ADMIN" || r === "مسؤول") return "/dashboard/admin";
    if (r === "TEACHER" || r === "معلم" || r === "معلمة") return "/dashboard/teacher";
    if (r === "STUDENT" || r === "طالب") return "/dashboard/student";
    return "/dashboard/student";
};

/**
 * Runs after Clerk OAuth completes. Syncs an existing Clerk user → Supabase `users`, then dashboard.
 * Google is sign-in only — unknown emails are sent back to login to register with password.
 */
const ClerkSSOComplete = () => {
    const { user: clerkUser, isLoaded: isUserLoaded } = useClerkUser();
    const { isSignedIn, isLoaded: isAuthLoaded, signOut } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { t, dir } = useTranslation();
    const [status, setStatus] = useState<"loading" | "syncing" | "success">("loading");
    const [userName, setUserName] = useState("");
    const syncStarted = useRef(false);

    useEffect(() => {
        if (!isAuthLoaded || !isUserLoaded) return;

        if (!isSignedIn || !clerkUser) {
            navigate("/login", { replace: true });
            return;
        }

        if (syncStarted.current) return;
        syncStarted.current = true;

        /** Sign out of Clerk, then send the user back to login with a reason. */
        const bounceToLogin = async (search = "") => {
            localStorage.removeItem("edu_user");
            queryClient.clear();
            // Pass the target to Clerk too: it redirects on sign-out and would otherwise
            // drop the `?error=...` reason.
            await signOut({ redirectUrl: `/login${search}` }).catch(() => undefined);
            navigate(`/login${search}`, { replace: true });
        };

        const syncUser = async () => {
            setStatus("syncing");

            const email = clerkUser.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
            const fullName =
                clerkUser.fullName ||
                clerkUser.firstName ||
                email?.split("@")[0] ||
                "مستخدم";

            if (!email) {
                console.error("[ClerkSSO] No email found on Clerk user");
                await bounceToLogin();
                return;
            }

            try {
                await supabase.auth.signOut().catch(() => undefined);

                const { data: existingUser, error: fetchError } = await supabase
                    .from("users")
                    .select("*")
                    .ilike("email", email)
                    .maybeSingle();

                if (fetchError) {
                    console.error("[ClerkSSO] Error fetching user:", fetchError);
                }

                if (!existingUser) {
                    await bounceToLogin("?error=no_account");
                    return;
                }

                if (existingUser.is_active === false) {
                    await bounceToLogin("?error=pending");
                    return;
                }

                let userData = existingUser;

                if (clerkUser.imageUrl && clerkUser.imageUrl !== existingUser.avatar_url) {
                    await supabase
                        .from("users")
                        .update({ avatar_url: clerkUser.imageUrl })
                        .eq("id", existingUser.id);
                    userData = { ...userData, avatar_url: clerkUser.imageUrl };
                }

                localStorage.setItem(
                    "edu_user",
                    JSON.stringify({
                        id: userData.id,
                        name: userData.name || fullName,
                        email: userData.email,
                        role: userData.role,
                        details: userData.details,
                    })
                );

                queryClient.setQueryData(["current_user"], userData);
                setUserName(userData.name || fullName);
                setStatus("success");

                const dashboardPath = getDashboardPath(userData.role);
                setTimeout(() => navigate(dashboardPath, { replace: true }), 1000);
            } catch (err) {
                console.error("[ClerkSSO] Unexpected error:", err);
                await bounceToLogin();
            }
        };

        void syncUser();
    }, [isAuthLoaded, isUserLoaded, isSignedIn, clerkUser, navigate, queryClient, signOut]);

    return (
        <div
            className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center px-4"
            dir={dir}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 max-w-md"
            >
                {status === "success" ? (
                    <>
                        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                            <CheckCircle className="w-10 h-10 text-success" />
                        </div>
                        <h3 className="text-xl font-bold">{t("sso.welcome", { name: userName })}</h3>
                        <p className="text-muted-foreground">{t("sso.redirecting")}</p>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        </div>
                        <h3 className="text-xl font-bold">
                            {status === "syncing" ? t("sso.signingIn") : t("sso.loading")}
                        </h3>
                        <p className="text-muted-foreground">{t("sso.pleaseWait")}</p>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default ClerkSSOComplete;
