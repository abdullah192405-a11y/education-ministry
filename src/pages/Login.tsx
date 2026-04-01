import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

// Map role from DB to dashboard path
const getDashboardPath = (role: string) => {
    const r = role?.toUpperCase();
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

const Login = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { signIn, isLoaded: isClerkLoaded } = useSignIn();
    const { signOut, isSignedIn } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        if (!isClerkLoaded || !signIn) return;

        setIsGoogleLoading(true);
        setError("");

        try {
            // Sign out any existing Clerk session first
            if (isSignedIn) {
                await signOut();
            }

            await signIn.authenticateWithRedirect({
                strategy: "oauth_google",
                redirectUrl: "/sso-callback",
                redirectUrlComplete: "/sso-callback",
            });
        } catch (err: any) {
            console.error("[Login] Google sign-in error:", err);
            setError("حدث خطأ أثناء تسجيل الدخول بحساب Google");
            setIsGoogleLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        // Clear existing session and cache to prevent teacher dashboard crossovers
        try {
            await supabase.auth.signOut();
            queryClient.clear();
            localStorage.removeItem("edu_user");
        } catch (e) {
            console.warn("Error clearing previous session:", e);
        }

        try {
            // Attempt Supabase Auth login
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                console.log("[Login] Auth failed, trying fallback via RPC...", authError.message);

                // Fallback: Use RPC function with SECURITY DEFINER
                // This function validates both email and password
                const { data: loginResult, error: dbError } = await supabase
                    .rpc("login_user", { p_email: email, p_password: password })
                    .maybeSingle() as { data: any; error: any };

                console.log("[Login] RPC login result:", { loginResult, dbError });

                if (dbError) {
                    console.log("[Login] RPC error:", dbError);
                    setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
                    setIsLoading(false);
                    return;
                }

                if (loginResult && loginResult.success && loginResult.is_active) {
                    // User exists, password matches, and is active
                    console.log("[Login] User found and authenticated, logging in...", loginResult.email);

                    localStorage.setItem("edu_user", JSON.stringify({
                        id: loginResult.id,
                        name: loginResult.name,
                        email: loginResult.email,
                        role: loginResult.role,
                    }));
                    queryClient.setQueryData(["current_user"], loginResult);
                    setLoginSuccess(loginResult.name);
                    const dashboardPath = getDashboardPath(loginResult.role);
                    setTimeout(() => navigate(dashboardPath), 1000);
                    return;
                }

                console.log("[Login] Login failed:", loginResult?.message || "Unknown error");
                setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
                setIsLoading(false);
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
                    .eq("email", email)
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
            setError(err.message || "حدث خطأ أثناء تسجيل الدخول");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-primary/10 flex flex-col" dir="rtl">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center gap-3">
                            <img src="/logo.png" alt="Lab4" className="w-10 h-10 rounded-xl object-contain bg-background" />
                            <span className="text-xl font-bold">Lab4</span>
                        </Link>
                        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronRight className="w-4 h-4" />
                            العودة للرئيسية
                        </Link>
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
                            تسجيل الدخول
                        </h1>
                        <p className="text-muted-foreground">
                            Lab4 الرقمية
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
                                    تسجيل الدخول بحسابك
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
                                            <h3 className="text-xl font-bold mb-2">مرحباً، {loginSuccess}!</h3>
                                            <p className="text-muted-foreground">جارٍ التحويل إلى لوحة التحكم...</p>
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
                                                        جارٍ تسجيل الدخول...
                                                    </>
                                                ) : (
                                                    <>
                                                        <GoogleIcon />
                                                        تسجيل الدخول بحساب Google
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
                                                        أو
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Email/Password Form */}
                                            <form onSubmit={handleLogin} className="space-y-4">
                                                {/* Email Field */}
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">البريد الإلكتروني</label>
                                                    <div className="relative">
                                                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                        <Input
                                                            type="email"
                                                            placeholder="أدخل بريدك الإلكتروني"
                                                            className="pr-10"
                                                            value={email}
                                                            onChange={(e) => setEmail(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                {/* Password Field */}
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">كلمة المرور</label>
                                                    <div className="relative">
                                                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                        <Input
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder="أدخل كلمة المرور"
                                                            className="pr-10 pl-10"
                                                            value={password}
                                                            onChange={(e) => setPassword(e.target.value)}
                                                            required
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                                                            جارٍ تسجيل الدخول...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <LogIn className="w-5 h-5" />
                                                            تسجيل الدخول
                                                        </>
                                                    )}
                                                </Button>
                                            </form>

                                            <div className="space-y-3 pt-4 border-t">
                                                <Link to="/forgot-password" className="text-sm text-primary hover:underline block text-center">
                                                    نسيت كلمة المرور؟
                                                </Link>
                                                <div className="text-center">
                                                    <span className="text-sm text-muted-foreground">
                                                        ليس لديك حساب؟{" "}
                                                        <Link to="/register" className="text-primary hover:underline font-medium">
                                                            إنشاء حساب جديد
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
                    جميع الحقوق محفوظة © 2024 Lab4
                </div>
            </footer>
        </div>
    );
};

export default Login;
