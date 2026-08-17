import { useEffect, useRef, useState } from "react";
import { useUser as useClerkUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";
import { readSignupIntent, clearSignupIntent, type SignupIntent } from "@/lib/signupIntent";

const getDashboardPath = (role: string) => {
    const r = role?.toUpperCase();
    if (r === "SUPERADMIN") return "/dashboard/superadmin";
    if (r === "ADMIN" || r === "مسؤول") return "/dashboard/admin";
    if (r === "TEACHER" || r === "معلم" || r === "معلمة") return "/dashboard/teacher";
    if (r === "STUDENT" || r === "طالب") return "/dashboard/student";
    return "/dashboard/student";
};

/**
 * Runs after Clerk OAuth completes. Syncs Clerk user → Supabase `users`, then dashboard.
 * A signup started on /register carries its role/organization here through the redirect.
 */
const ClerkSSOComplete = () => {
    const { user: clerkUser, isLoaded: isUserLoaded } = useClerkUser();
    const { isSignedIn, isLoaded: isAuthLoaded, signOut } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { t, dir } = useTranslation();
    const [status, setStatus] = useState<"loading" | "syncing" | "registering" | "success" | "pending">("loading");
    const [userName, setUserName] = useState("");
    const [pendingMessage, setPendingMessage] = useState("");
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
            // drop the `?error=pending` reason.
            await signOut({ redirectUrl: `/login${search}` }).catch(() => undefined);
            navigate(`/login${search}`, { replace: true });
        };

        /**
         * Google signup started from /register: mirror the password flow — the account is
         * created with the chosen role/organization and waits for approval.
         */
        const createPendingUserFromIntent = async (
            intent: SignupIntent,
            email: string,
            fullName: string
        ) => {
            setStatus("registering");
            const now = new Date().toISOString();
            const isStudent = intent.role === "STUDENT";

            const { data: newUser, error: insertError } = await supabase
                .from("users")
                .insert({
                    email,
                    name: fullName,
                    role: intent.role,
                    verified: true,
                    is_active: false,
                    organization_id: intent.organizationId,
                    details: isStudent
                        ? t("register.studentPendingShort")
                        : t("register.adminPendingShort"),
                    avatar_url: clerkUser.imageUrl || null,
                    updated_at: now,
                })
                .select()
                .single();

            if (insertError || !newUser) {
                console.error("[ClerkSSO] Error creating pending user:", insertError);
                return false;
            }

            if (isStudent) {
                await supabase.from("student_profiles").insert({
                    user_id: newUser.id,
                    grade_id: intent.gradeId,
                    total_points: 0,
                    total_challenges: 0,
                    completed_topics: 0,
                    average_score: 0,
                    longest_streak: 0,
                    current_streak: 0,
                    total_study_hours: 0,
                    updated_at: now,
                });
            } else {
                await supabase.from("teacher_profiles").insert({
                    user_id: newUser.id,
                    grade_id: null,
                    total_students: 0,
                    total_topics: 0,
                    total_challenges: 0,
                    average_score: 0,
                    updated_at: now,
                });
            }

            const requestRow: Record<string, unknown> = {
                applicant_user_id: newUser.id,
                applicant_role: intent.role,
                organization_id: intent.organizationId,
                grade_id: isStudent ? intent.gradeId : null,
                status: "PENDING",
                created_at: now,
                updated_at: now,
                approver_role: isStudent ? "TEACHER" : "ADMIN",
            };
            if (isStudent) {
                requestRow.teacher_user_id = null;
            }

            const { error: reqError } = await supabase
                .from("registration_requests")
                .upsert(requestRow, { onConflict: "applicant_user_id" });
            if (reqError) {
                console.warn("[ClerkSSO] registration_requests:", reqError);
            }

            return true;
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

            const intent = readSignupIntent();

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

                let userData = existingUser;

                if (!userData && intent) {
                    const created = await createPendingUserFromIntent(intent, email, fullName);
                    clearSignupIntent();

                    if (!created) {
                        await bounceToLogin();
                        return;
                    }

                    setPendingMessage(
                        intent.role === "TEACHER"
                            ? t("register.teacherPending")
                            : t("register.studentPending")
                    );
                    setStatus("pending");
                    setTimeout(() => void bounceToLogin("?error=pending"), 2800);
                    return;
                }

                clearSignupIntent();

                if (!userData) {
                    const now = new Date().toISOString();
                    const { data: newUser, error: insertError } = await supabase
                        .from("users")
                        .insert({
                            email,
                            name: fullName,
                            role: "STUDENT",
                            verified: true,
                            is_active: true,
                            details: "طالب جديد (Google)",
                            avatar_url: clerkUser.imageUrl || null,
                            updated_at: now,
                        })
                        .select()
                        .single();

                    if (insertError) {
                        console.error("[ClerkSSO] Error creating user:", insertError);
                        if (
                            insertError.message.includes("duplicate") ||
                            insertError.message.includes("unique") ||
                            insertError.code === "23505"
                        ) {
                            const { data: retryUser } = await supabase
                                .from("users")
                                .select("*")
                                .ilike("email", email)
                                .maybeSingle();
                            userData = retryUser;
                        }

                        if (!userData) {
                            await bounceToLogin();
                            return;
                        }
                    } else {
                        userData = newUser;

                        await supabase.from("student_profiles").insert({
                            user_id: newUser.id,
                            total_points: 0,
                            total_challenges: 0,
                            completed_topics: 0,
                            average_score: 0,
                            longest_streak: 0,
                            current_streak: 0,
                            total_study_hours: 0,
                            updated_at: now,
                        });
                    }
                }

                if (userData && userData.is_active === false) {
                    await bounceToLogin("?error=pending");
                    return;
                }

                if (userData && existingUser && clerkUser.imageUrl && clerkUser.imageUrl !== existingUser.avatar_url) {
                    await supabase
                        .from("users")
                        .update({ avatar_url: clerkUser.imageUrl })
                        .eq("id", existingUser.id);
                    userData = { ...userData, avatar_url: clerkUser.imageUrl };
                }

                if (userData) {
                    localStorage.setItem(
                        "edu_user",
                        JSON.stringify({
                            id: userData.id,
                            name: userData.name,
                            email: userData.email,
                            role: userData.role,
                            details: userData.details,
                        })
                    );

                    queryClient.setQueryData(["current_user"], userData);
                    setUserName(userData.name);
                    setStatus("success");

                    const dashboardPath = getDashboardPath(userData.role);
                    setTimeout(() => navigate(dashboardPath, { replace: true }), 1000);
                }
            } catch (err) {
                console.error("[ClerkSSO] Unexpected error:", err);
                await bounceToLogin();
            }
        };

        void syncUser();
    }, [isAuthLoaded, isUserLoaded, isSignedIn, clerkUser, navigate, queryClient, signOut, t]);

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
                {status === "success" || status === "pending" ? (
                    <>
                        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                            <CheckCircle className="w-10 h-10 text-success" />
                        </div>
                        <h3 className="text-xl font-bold">
                            {status === "pending" ? t("sso.requestSent") : t("sso.welcome", { name: userName })}
                        </h3>
                        <p className="text-muted-foreground">
                            {status === "pending" ? pendingMessage : t("sso.redirecting")}
                        </p>
                        {status === "pending" && (
                            <p className="text-sm text-muted-foreground">{t("sso.redirectingLogin")}</p>
                        )}
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        </div>
                        <h3 className="text-xl font-bold">
                            {status === "registering"
                                ? t("sso.creatingAccount")
                                : status === "syncing"
                                    ? t("sso.signingIn")
                                    : t("sso.loading")}
                        </h3>
                        <p className="text-muted-foreground">{t("sso.pleaseWait")}</p>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default ClerkSSOComplete;
