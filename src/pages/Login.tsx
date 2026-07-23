import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    User, Lock, Eye, EyeOff, LogIn, Sparkles,
    Shield, GraduationCap, BookOpen, ChevronLeft,
    Mail, CheckCircle, AlertCircle,
    ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useSignIn, useAuth } from "@clerk/clerk-react";
import md5 from "js-md5";
import { useTranslation } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// Map role from DB to dashboard path
const getDashboardPath = (role: string) => {
    const r = role?.toUpperCase();
    if (r === "SUPERADMIN") return "/dashboard/superadmin";
    if (r === "ADMIN" || r === "مسؤول") return "/dashboard/admin";
    if (r === "TEACHER" || r === "معلم" || r === "معلمة") return "/dashboard/teacher";
    if (r === "STUDENT" || r === "طالب") return "/dashboard/student";
    return "/dashboard/student";
};

// Google SVG Icon
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

/** PostgREST often returns SETOF / RPC rows as a one-element array. */
function unwrapRpcUserRow(data: unknown): Record<string, unknown> | null {
    if (data == null) return null;
    if (Array.isArray(data)) {
        const first = data[0];
        return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
    }
    if (typeof data === "object") return data as Record<string, unknown>;
    return null;
}

function isTruthyPgBool(v: unknown): boolean {
    return v === true || v === 1 || v === "t" || v === "true" || v === "T";
}

function isFalsyPgBool(v: unknown): boolean {
    return v === false || v === 0 || v === "f" || v === "false" || v === "F";
}

function rpcLoginSucceeded(row: Record<string, unknown> | null): row is Record<string, unknown> & {
    id: string;
    email: string;
    name: string;
    role: string;
} {
    if (!row || row.id == null || String(row.id).length === 0) return false;
    if (!isTruthyPgBool(row.success)) return false;
    if (isFalsyPgBool(row.is_active)) return false;
    return typeof row.email === "string" && typeof row.name === "string" && typeof row.role === "string";
}

const Login = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const { signIn, setActive, isLoaded: isClerkLoaded } = useSignIn();
    const { signOut, isSignedIn } = useAuth();
    const { t, dir } = useTranslation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (searchParams.get("error") === "pending") {
            setError(t("login.errAccountPending"));
        }
    }, [searchParams, t]);

    const handleGoogleLogin = async () => {
        if (!isClerkLoaded || !signIn) return;

        setIsGoogleLoading(true);
        setError("");

        try {
            // Sign out any existing Clerk session first
            if (isSignedIn) {
                await signOut();
            }

            const origin = window.location.origin;
            await signIn.authenticateWithRedirect({
                strategy: "oauth_google",
                redirectUrl: `${origin}/sso-callback`,
                redirectUrlComplete: `${origin}/sso-complete`,
            });
        } catch (err: any) {
            console.error("[Login] Google sign-in error:", err);
            setError(t("login.errGoogle"));
            setIsGoogleLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const normalizedEmail = email.trim().toLowerCase();

        // Clear existing session and cache to prevent teacher dashboard crossovers
        try {
            await supabase.auth.signOut();
            queryClient.clear();
            localStorage.removeItem("edu_user");
        } catch (e) {
            console.warn("Error clearing previous session:", e);
        }

        try {
            // Try Clerk email/password first (accounts created from Register page).
            if (isClerkLoaded && signIn) {
                try {
                    const clerkResult = await signIn.create({
                        identifier: normalizedEmail,
                        password,
                    });

                    if (clerkResult.status === "complete") {
                        if (clerkResult.createdSessionId && setActive) {
                            await setActive({ session: clerkResult.createdSessionId });
                        }

                        const { data: clerkDbUser } = await supabase
                            .from("users")
                            .select("*")
                            .ilike("email", normalizedEmail)
                            .maybeSingle();

                        if (clerkDbUser) {
                            if (clerkDbUser.is_active === false) {
                                setError(t("login.errAccountPending"));
                                return;
                            }

                            localStorage.setItem("edu_user", JSON.stringify({
                                id: clerkDbUser.id,
                                name: clerkDbUser.name,
                                email: clerkDbUser.email,
                                role: clerkDbUser.role,
                                details: clerkDbUser.details
                            }));
                            setLoginSuccess(clerkDbUser.name);
                            queryClient.setQueryData(["current_user"], clerkDbUser);
                            setTimeout(() => {
                                navigate(getDashboardPath(clerkDbUser.role));
                            }, 1000);
                            return;
                        }

                        // Clerk session is valid but no app user row yet — create a student profile.
                        const now = new Date().toISOString();
                        const displayName = normalizedEmail.split("@")[0] || "مستخدم";
                        const { data: createdUser, error: createErr } = await supabase
                            .from("users")
                            .insert({
                                email: normalizedEmail,
                                name: displayName,
                                role: "STUDENT",
                                verified: true,
                                is_active: true,
                                details: "طالب (Clerk)",
                                updated_at: now,
                            })
                            .select()
                            .single();

                        if (!createErr && createdUser) {
                            await supabase.from("student_profiles").insert({
                                user_id: createdUser.id,
                                total_points: 0,
                                total_challenges: 0,
                                completed_topics: 0,
                                average_score: 0,
                                longest_streak: 0,
                                current_streak: 0,
                                total_study_hours: 0,
                                updated_at: now,
                            });
                            localStorage.setItem("edu_user", JSON.stringify({
                                id: createdUser.id,
                                name: createdUser.name,
                                email: createdUser.email,
                                role: createdUser.role,
                                details: createdUser.details,
                            }));
                            setLoginSuccess(createdUser.name);
                            queryClient.setQueryData(["current_user"], createdUser);
                            setTimeout(() => navigate(getDashboardPath(createdUser.role)), 1000);
                            return;
                        }

                        setError(t("login.errGeneric"));
                        return;
                    }
                } catch {
                    // Clerk auth failed; continue to existing Supabase + legacy fallbacks.
                }
            }

            // Attempt Supabase Auth login
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            });

            if (authError) {
                console.log("[Login] Auth failed, trying DB fallbacks...", authError.message);

                const { data: rawRpc, error: rpcError } = await supabase.rpc("login_user", {
                    p_email: normalizedEmail,
                    p_password: password,
                });

                const rpcRow = unwrapRpcUserRow(rawRpc);
                console.log("[Login] RPC login_user:", { rawRpc, rpcRow, rpcError });

                if (!rpcError && rpcLoginSucceeded(rpcRow)) {
                    console.log("[Login] Authenticated via login_user RPC", rpcRow.email);
                    localStorage.setItem("edu_user", JSON.stringify({
                        id: rpcRow.id,
                        name: rpcRow.name,
                        email: rpcRow.email,
                        role: rpcRow.role,
                    }));
                    queryClient.setQueryData(["current_user"], rpcRow);
                    setLoginSuccess(rpcRow.name);
                    setTimeout(() => navigate(getDashboardPath(rpcRow.role)), 1000);
                    return;
                }

                // Fallback when RPC is missing, errors, or returns an unexpected shape:
                // read users row and verify MD5(password) client-side (needs RLS to allow SELECT).
                const { data: u, error: userSelErr } = await supabase
                    .from("users")
                    .select("id, email, name, role, verified, is_active, password_hash")
                    .ilike("email", normalizedEmail)
                    .maybeSingle();

                console.log("[Login] Direct users lookup:", { u, userSelErr });

                if (!userSelErr && u && u.password_hash) {
                    const got = String(md5(password)).toLowerCase();
                    const want = String(u.password_hash).toLowerCase();
                    if (got === want) {
                        if (u.is_active === false) {
                            setError(t("login.errAccountPending"));
                            return;
                        }
                        console.log("[Login] Authenticated via users.password_hash");
                        localStorage.setItem("edu_user", JSON.stringify({
                            id: u.id,
                            name: u.name,
                            email: u.email,
                            role: u.role,
                        }));
                        queryClient.setQueryData(["current_user"], u);
                        setLoginSuccess(u.name);
                        setTimeout(() => navigate(getDashboardPath(u.role)), 1000);
                        return;
                    }
                }
                if (!userSelErr && u && !u.password_hash) {
                    if (u.is_active === false) {
                        setError(t("login.errAccountPending"));
                        return;
                    }
                    setError(t("login.errNeedReset"));
                    return;
                }

                setError(t("login.errInvalidCredentials"));
                return;
            }

            // Auth successful — fetch user data from users table by auth_id
            let userData = null;
            let userError = null;

            const { data: userByAuthId, error: authIdError } = await supabase
                .from("users")
                .select("*")
                .eq("auth_id", authData.user.id)
                .maybeSingle();

            if (userByAuthId) {
                userData = userByAuthId;
            } else {
                // Fallback: find user by email (for seeded users without auth_id)
                const { data: userByEmail, error: emailError } = await supabase
                    .from("users")
                    .select("*")
                    .eq("email", normalizedEmail)
                    .maybeSingle();

                if (userByEmail) {
                    userData = userByEmail;
                    // Link the auth_id for future logins
                    await supabase
                        .from("users")
                        .update({ auth_id: authData.user.id })
                        .eq("id", userByEmail.id);
                } else {
                    userError = authIdError || emailError;
                }
            }

            if (userError || !userData) {
                // User exists in auth but not in users table at all
                setLoginSuccess(authData.user.email?.split("@")[0] || "مستخدم");
                setTimeout(() => {
                    navigate("/dashboard/student");
                }, 1000);
                return;
            }

            if (userData.is_active === false) {
                setError(t("login.errAccountPending"));
                return;
            }

            // Store user info
            localStorage.setItem("edu_user", JSON.stringify({
                id: userData.id,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                details: userData.details
            }));

            setLoginSuccess(userData.name);

            // Pre-load the user into the query cache so ProtectedRoute sees it immediately
            queryClient.setQueryData(["current_user"], userData);

            // Redirect to appropriate dashboard
            const dashboardPath = getDashboardPath(userData.role);
            setTimeout(() => {
                navigate(dashboardPath);
            }, 1000);

        } catch (err: any) {
            setError(err.message || t("login.errGeneric"));
        } finally {
            setIsLoading(false);
        }
    };

    const ChevronIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
    return (
        <div className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-primary/10 flex flex-col" dir={dir}>
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center gap-3">
                            <img src="/logo.png" alt={t("common.brand")} className="w-10 h-10 rounded-xl object-contain bg-background" />
                            <span className="text-xl font-bold">{t("common.brand")}</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <LanguageSwitcher />
                            <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                                <ChevronIcon className="w-4 h-4" />
                                {t("common.backToHome")}
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-md">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
                            <LogIn className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">
                            {t("login.title")}
                        </h1>
                        <p className="text-muted-foreground">
                            {t("login.subtitle")}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <LogIn className="w-5 h-5 text-primary" />
                                    {t("login.cardTitle")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AnimatePresence mode="wait">
                                    {loginSuccess ? (
                                        <motion.div
                                            key="success"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="py-12 text-center"
                                        >
                                            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle className="w-10 h-10 text-success" />
                                            </div>
                                            <h3 className="text-xl font-bold mb-2">{t("login.welcomeBack", { name: loginSuccess })}</h3>
                                            <p className="text-muted-foreground">{t("login.redirecting")}</p>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="form"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="space-y-4"
                                        >
                                            {/* Google Sign-In Button */}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full h-12 text-base gap-3 border-2 hover:bg-muted/50 transition-all"
                                                onClick={handleGoogleLogin}
                                                disabled={isGoogleLoading || !isClerkLoaded}
                                            >
                                                {isGoogleLoading ? (
                                                    <>
                                                        <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                        {t("login.signingIn")}
                                                    </>
                                                ) : (
                                                    <>
                                                        <GoogleIcon />
                                                        {t("login.googleButton")}
                                                    </>
                                                )}
                                            </Button>

                                            {/* Divider */}
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t" />
                                                </div>
                                                <div className="relative flex justify-center text-xs uppercase">
                                                    <span className="bg-card px-2 text-muted-foreground">
                                                        {t("login.or")}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Email/Password Form */}
                                            <form onSubmit={handleLogin} className="space-y-4">
                                                {/* Email Field */}
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">{t("common.email")}</label>
                                                    <div className="relative">
                                                        <Mail className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                                                        <Input
                                                            type="email"
                                                            placeholder={t("common.emailPlaceholder")}
                                                            className={dir === "rtl" ? "pr-10" : "pl-10"}
                                                            value={email}
                                                            onChange={(e) => setEmail(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                {/* Password Field */}
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">{t("common.password")}</label>
                                                    <div className="relative">
                                                        <Lock className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                                                        <Input
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder={t("common.passwordPlaceholder")}
                                                            className={dir === "rtl" ? "pr-10 pl-10" : "pl-10 pr-10"}
                                                            value={password}
                                                            onChange={(e) => setPassword(e.target.value)}
                                                            required
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className={`absolute ${dir === "rtl" ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors`}
                                                        >
                                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Error Message */}
                                                <AnimatePresence>
                                                    {error && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                                                        >
                                                            <AlertCircle className="w-4 h-4" />
                                                            {error}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {/* Submit Button */}
                                                <Button
                                                    type="submit"
                                                    className="w-full h-12 text-lg gap-2"
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            {t("login.signingIn")}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <LogIn className="w-5 h-5" />
                                                            {t("login.title")}
                                                        </>
                                                    )}
                                                </Button>
                                            </form>

                                            <div className="space-y-3 pt-4 border-t">
                                                <Link to="/forgot-password" className="text-sm text-primary hover:underline block text-center">
                                                    {t("login.forgotPassword")}
                                                </Link>
                                                <div className="text-center">
                                                    <span className="text-sm text-muted-foreground">
                                                        {t("login.noAccount")}{" "}
                                                        <Link to="/register" className="text-primary hover:underline font-medium">
                                                            {t("common.registerNew")}
                                                        </Link>
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 border-t text-center text-sm text-muted-foreground">
                <div className="container mx-auto px-4">
                    {t("login.footerCopy")}
                </div>
            </footer>
        </div>
    );
};

export default Login;
