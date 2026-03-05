import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    User, Lock, Eye, EyeOff, LogIn, Sparkles,
    Shield, GraduationCap, BookOpen, ChevronLeft,
    Mail, CheckCircle, AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

// Map role from DB to dashboard path
const getDashboardPath = (role: string) => {
    const r = role?.toUpperCase();
    if (r === "ADMIN" || r === "مسؤول") return "/dashboard/admin";
    if (r === "TEACHER" || r === "معلم" || r === "معلمة") return "/dashboard/teacher";
    if (r === "STUDENT" || r === "طالب") return "/dashboard/student";
    return "/dashboard/student";
};

const Login = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

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
                    .maybeSingle();

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
                            <ChevronLeft className="w-4 h-4" />
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
                                        <motion.form
                                            key="form"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onSubmit={handleLogin}
                                            className="space-y-4"
                                        >
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

                                            {/* Additional Options */}
                                            <div className="space-y-3 pt-4 border-t">
                                                <a href="#" className="text-sm text-primary hover:underline block text-center">
                                                    نسيت كلمة المرور؟
                                                </a>
                                                <div className="text-center">
                                                    <span className="text-sm text-muted-foreground">
                                                        ليس لديك حساب؟{" "}
                                                        <Link to="/register" className="text-primary hover:underline font-medium">
                                                            إنشاء حساب جديد
                                                        </Link>
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.form>
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
