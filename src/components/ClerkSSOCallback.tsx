import { useEffect, useState } from "react";
import { useUser as useClerkUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";

// Map role from DB to dashboard path
const getDashboardPath = (role: string) => {
    const r = role?.toUpperCase();
    if (r === "ADMIN" || r === "مسؤول") return "/dashboard/admin";
    if (r === "TEACHER" || r === "معلم" || r === "معلمة") return "/dashboard/teacher";
    if (r === "STUDENT" || r === "طالب") return "/dashboard/student";
    return "/dashboard/student";
};

/**
 * This component handles the SSO callback after Clerk Google sign-in.
 * It syncs the Clerk user with the Supabase database:
 * - If the user exists in DB → fetch their data and redirect
 * - If not → create a new user record with default role (STUDENT)
 */
const ClerkSSOCallback = () => {
    const { user: clerkUser, isLoaded: isClerkLoaded } = useClerkUser();
    const { isSignedIn } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<"loading" | "syncing" | "success">("loading");
    const [userName, setUserName] = useState("");

    useEffect(() => {
        if (!isClerkLoaded) return;

        if (!isSignedIn || !clerkUser) {
            // Not signed in, redirect to login
            navigate("/login", { replace: true });
            return;
        }

        const syncUser = async () => {
            setStatus("syncing");

            const email = clerkUser.primaryEmailAddress?.emailAddress;
            const fullName = clerkUser.fullName || clerkUser.firstName || email?.split("@")[0] || "مستخدم";

            if (!email) {
                console.error("[ClerkSSO] No email found on Clerk user");
                navigate("/login", { replace: true });
                return;
            }

            try {
                // 1. Check if user exists in the database by email
                const { data: existingUser, error: fetchError } = await supabase
                    .from("users")
                    .select("*")
                    .eq("email", email)
                    .maybeSingle();

                if (fetchError) {
                    console.error("[ClerkSSO] Error fetching user:", fetchError);
                }

                let userData = existingUser;

                if (!userData) {
                    // 2. User doesn't exist → create new user with STUDENT role
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
                        // If duplicate key error, try fetching again
                        if (insertError.message.includes("duplicate") || insertError.message.includes("unique")) {
                            const { data: retryUser } = await supabase
                                .from("users")
                                .select("*")
                                .eq("email", email)
                                .maybeSingle();
                            userData = retryUser;
                        }

                        if (!userData) {
                            navigate("/login", { replace: true });
                            return;
                        }
                    } else {
                        userData = newUser;

                        // 3. Create student profile for new user
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
                } else {
                    // 4. User exists → update avatar if changed
                    if (clerkUser.imageUrl && clerkUser.imageUrl !== existingUser.avatar_url) {
                        await supabase
                            .from("users")
                            .update({ avatar_url: clerkUser.imageUrl })
                            .eq("id", existingUser.id);
                        userData = { ...existingUser, avatar_url: clerkUser.imageUrl };
                    }
                }

                if (userData) {
                    // 5. Store user in localStorage and query cache
                    localStorage.setItem("edu_user", JSON.stringify({
                        id: userData.id,
                        name: userData.name,
                        email: userData.email,
                        role: userData.role,
                        details: userData.details,
                    }));

                    queryClient.setQueryData(["current_user"], userData);
                    setUserName(userData.name);
                    setStatus("success");

                    // 6. Redirect to appropriate dashboard
                    const dashboardPath = getDashboardPath(userData.role);
                    setTimeout(() => navigate(dashboardPath, { replace: true }), 1200);
                }
            } catch (err) {
                console.error("[ClerkSSO] Unexpected error:", err);
                navigate("/login", { replace: true });
            }
        };

        syncUser();
    }, [isClerkLoaded, isSignedIn, clerkUser, navigate, queryClient]);

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center" dir="rtl">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
            >
                {status === "success" ? (
                    <>
                        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                            <CheckCircle className="w-10 h-10 text-success" />
                        </div>
                        <h3 className="text-xl font-bold">مرحباً، {userName}!</h3>
                        <p className="text-muted-foreground">جارٍ التحويل إلى لوحة التحكم...</p>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        </div>
                        <h3 className="text-xl font-bold">
                            {status === "syncing" ? "جارٍ تسجيل الدخول..." : "جارٍ التحميل..."}
                        </h3>
                        <p className="text-muted-foreground">يرجى الانتظار قليلاً</p>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default ClerkSSOCallback;
