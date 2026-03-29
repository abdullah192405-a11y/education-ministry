import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    User, Lock, Eye, EyeOff, LogIn, Sparkles,
    Shield, GraduationCap, BookOpen, ChevronLeft,
    Mail, CheckCircle, AlertCircle, UserPlus, ArrowLeft, ArrowRight,
    KeyRound
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useGrades } from "@/hooks/useDatabase";
import { useQueryClient } from "@tanstack/react-query";
import { useSignUp, useAuth } from "@clerk/clerk-react";

// Google SVG Icon
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

type UserRole = "STUDENT" | "TEACHER";

const Register = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: grades } = useGrades();
    const { signUp, isLoaded: isClerkLoaded, setActive } = useSignUp();
    const { signOut, isSignedIn } = useAuth();

    // Form state
    const [step, setStep] = useState<1 | 2 | 3>(1); // Step 1: Role, Step 2: Details, Step 3: Verify Code
    const [role, setRole] = useState<UserRole | null>(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [selectedGradeId, setSelectedGradeId] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [registerSuccess, setRegisterSuccess] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");

    const handleRoleSelect = (selectedRole: UserRole) => {
        setRole(selectedRole);
        setStep(2);
    };

    const handleGoogleSignUp = async () => {
        if (!isClerkLoaded || !signUp) return;

        setIsGoogleLoading(true);
        setError("");

        try {
            // Sign out any existing Clerk session first
            if (isSignedIn) {
                await signOut();
            }

            await signUp.authenticateWithRedirect({
                strategy: "oauth_google",
                redirectUrl: "/sso-callback",
                redirectUrlComplete: "/sso-callback",
            });
        } catch (err: any) {
            console.error("[Register] Google sign-up error:", err);
            setError("حدث خطأ أثناء التسجيل بحساب Google");
            setIsGoogleLoading(false);
        }
    };

    // Helper: create user in Supabase DB after Clerk signup completes
    const createSupabaseUser = async () => {
        const now = new Date().toISOString();

        const { data: newUser, error: userError } = await supabase
            .from("users")
            .insert({
                email,
                name,
                role: role,
                verified: true,
                is_active: true,
                details: role === "STUDENT" ? "طالب جديد" : "معلم جديد",
                updated_at: now,
            })
            .select()
            .single();

        if (userError) {
            if (userError.message.includes("duplicate") || userError.message.includes("unique")) {
                const { data: existingUser } = await supabase
                    .from("users")
                    .select("*")
                    .eq("email", email)
                    .maybeSingle();
                if (existingUser) return existingUser;
            }
            console.error("User insert error:", userError);
            return null;
        }

        // Create role-specific profile
        if (role === "STUDENT") {
            await supabase.from("student_profiles").insert({
                user_id: newUser.id,
                grade_id: selectedGradeId || null,
                total_points: 0,
                total_challenges: 0,
                completed_topics: 0,
                average_score: 0,
                longest_streak: 0,
                current_streak: 0,
                total_study_hours: 0,
                updated_at: now,
            });
        } else if (role === "TEACHER") {
            await supabase.from("teacher_profiles").insert({
                user_id: newUser.id,
                total_students: 0,
                total_topics: 0,
                total_challenges: 0,
                average_score: 0,
                updated_at: now,
            });
        }

        return newUser;
    };

    // Helper: finish registration after Clerk is done
    const finishRegistration = async (sessionId: string | null) => {
        // Set the active session in Clerk
        if (sessionId) {
            await setActive({ session: sessionId });
        }

        // Create user in Supabase DB
        const dbUser = await createSupabaseUser();

        if (dbUser) {
            localStorage.setItem("edu_user", JSON.stringify({
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role,
                details: dbUser.details,
            }));
            queryClient.setQueryData(["current_user"], dbUser);
        }

        setRegisterSuccess(true);
        const dashboardPath = role === "TEACHER" ? "/dashboard/teacher" : "/dashboard/student";
        setTimeout(() => navigate(dashboardPath), 2500);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        if (!name.trim()) {
            setError("يرجى إدخال الاسم");
            return;
        }
        if (!email.trim()) {
            setError("يرجى إدخال البريد الإلكتروني");
            return;
        }
        if (password.length < 6) {
            setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
            return;
        }
        if (password !== confirmPassword) {
            setError("كلمة المرور وتأكيدها غير متطابقتين");
            return;
        }

        if (!isClerkLoaded || !signUp) {
            setError("جارٍ تحميل النظام، يرجى الانتظار...");
            return;
        }

        setIsLoading(true);

        try {
            // Sign out any existing sessions and clear cache
            if (isSignedIn) {
                await signOut();
            }
            await supabase.auth.signOut();
            queryClient.clear();
            localStorage.removeItem("edu_user");

            // 1. Create user in Clerk (appears in Clerk dashboard)
            const nameParts = name.trim().split(" ");
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(" ") || undefined;

            const result = await signUp.create({
                emailAddress: email,
                password: password,
                firstName: firstName,
                lastName: lastName,
            });

            console.log("[Register] Clerk signUp status:", result.status);

            if (result.status === "complete") {
                // No email verification needed — complete directly
                await finishRegistration(result.createdSessionId);

            } else if (result.status === "missing_requirements") {
                // Email verification is required by Clerk
                await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
                setStep(3); // Show verification code input
                setIsLoading(false);
            } else {
                setError("حدث خطأ غير متوقع أثناء إنشاء الحساب");
                setIsLoading(false);
            }

        } catch (err: any) {
            console.error("[Register] Clerk signup error:", err);

            const clerkErrors = err?.errors;
            if (clerkErrors && clerkErrors.length > 0) {
                const firstError = clerkErrors[0];
                if (firstError.code === "form_identifier_exists") {
                    setError("هذا البريد الإلكتروني مسجل بالفعل");
                } else if (firstError.code === "form_password_pwned") {
                    setError("كلمة المرور هذه غير آمنة، يرجى اختيار كلمة مرور أقوى");
                } else if (firstError.code === "form_password_too_short") {
                    setError("كلمة المرور قصيرة جداً");
                } else {
                    setError(firstError.longMessage || firstError.message || "حدث خطأ أثناء إنشاء الحساب");
                }
            } else {
                setError(err.message || "حدث خطأ غير متوقع");
            }
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!verificationCode.trim()) {
            setError("يرجى إدخال رمز التحقق");
            return;
        }

        if (!isClerkLoaded || !signUp) return;

        setIsLoading(true);

        try {
            const result = await signUp.attemptEmailAddressVerification({
                code: verificationCode,
            });

            console.log("[Register] Verification result:", result.status);

            if (result.status === "complete") {
                await finishRegistration(result.createdSessionId);
            } else {
                setError("لم يتم التحقق بنجاح، يرجى المحاولة مرة أخرى");
                setIsLoading(false);
            }

        } catch (err: any) {
            console.error("[Register] Verification error:", err);
            const clerkErrors = err?.errors;
            if (clerkErrors && clerkErrors.length > 0) {
                setError(clerkErrors[0].longMessage || "رمز التحقق غير صحيح");
            } else {
                setError("حدث خطأ أثناء التحقق");
            }
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
                        <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                            العودة لتسجيل الدخول
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
                            <UserPlus className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">
                            إنشاء حساب جديد
                        </h1>
                        <p className="text-muted-foreground">
                            {step === 1 ? "اختر نوع الحساب" : step === 2 ? "أكمل بياناتك" : "أدخل رمز التحقق"}
                        </p>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {registerSuccess ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center"
                            >
                                <Card>
                                    <CardContent className="py-12">
                                        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-10 h-10 text-success" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">تم إنشاء الحساب بنجاح! 🎉</h3>
                                        <p className="text-muted-foreground mb-2">
                                            مرحباً بك في Lab4
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            جارٍ التحويل إلى لوحة التحكم...
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>

                        ) : step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <User className="w-5 h-5 text-primary" />
                                            اختر نوع الحساب
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-muted-foreground">
                                            اختر الدور الذي يناسبك للبدء
                                        </p>

                                        {/* Google Sign-Up Button */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full h-12 text-base gap-3 border-2 hover:bg-muted/50 transition-all"
                                            onClick={handleGoogleSignUp}
                                            disabled={isGoogleLoading || !isClerkLoaded}
                                        >
                                            {isGoogleLoading ? (
                                                <>
                                                    <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                    جارٍ التسجيل...
                                                </>
                                            ) : (
                                                <>
                                                    <GoogleIcon />
                                                    التسجيل بحساب Google
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
                                                    أو اختر نوع الحساب
                                                </span>
                                            </div>
                                        </div>

                                        {/* Student Role */}
                                        <button
                                            onClick={() => handleRoleSelect("STUDENT")}
                                            className="w-full p-5 rounded-xl border-2 hover:border-emerald-500/50 transition-all text-right group hover:shadow-lg"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                                                    <GraduationCap className="w-8 h-8 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-lg">طالب</span>
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600">
                                                            STUDENT
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        تتبع تقدمك، شارك في التحديات، واجمع الأوسمة
                                                    </p>
                                                </div>
                                                <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                                            </div>
                                        </button>

                                        {/* Teacher Role */}
                                        <button
                                            onClick={() => handleRoleSelect("TEACHER")}
                                            className="w-full p-5 rounded-xl border-2 hover:border-blue-500/50 transition-all text-right group hover:shadow-lg"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                    <BookOpen className="w-8 h-8 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-lg">معلم</span>
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600">
                                                            TEACHER
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        أنشئ الدروس والتحديات، وتابع مستوى طلابك
                                                    </p>
                                                </div>
                                                <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                                            </div>
                                        </button>

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

                                        {/* Login Link */}
                                        <div className="text-center pt-4 border-t">
                                            <span className="text-sm text-muted-foreground">
                                                لديك حساب بالفعل؟{" "}
                                                <Link to="/login" className="text-primary hover:underline font-medium">
                                                    تسجيل الدخول
                                                </Link>
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                        ) : step === 3 ? (
                            /* Step 3: Email Verification Code */
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <KeyRound className="w-5 h-5 text-primary" />
                                            تحقق من بريدك الإلكتروني
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleVerifyCode} className="space-y-4">
                                            <p className="text-sm text-muted-foreground">
                                                تم إرسال رمز التحقق إلى <strong className="text-foreground">{email}</strong>
                                            </p>

                                            {/* Verification Code */}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">رمز التحقق</label>
                                                <div className="relative">
                                                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                        type="text"
                                                        placeholder="أدخل رمز التحقق"
                                                        className="pr-10 text-center text-lg tracking-widest"
                                                        dir="ltr"
                                                        value={verificationCode}
                                                        onChange={(e) => setVerificationCode(e.target.value)}
                                                        required
                                                        maxLength={6}
                                                    />
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
                                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                        {error}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Verify Button */}
                                            <Button
                                                type="submit"
                                                className="w-full h-12 text-lg gap-2"
                                                disabled={isLoading}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        جارٍ التحقق...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-5 h-5" />
                                                        تأكيد الرمز
                                                    </>
                                                )}
                                            </Button>

                                            <button
                                                type="button"
                                                onClick={() => { setStep(2); setError(""); }}
                                                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                العودة للخطوة السابقة
                                            </button>
                                        </form>
                                    </CardContent>
                                </Card>
                            </motion.div>

                        ) : (
                            /* Step 2: Registration Form */
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                {role === "STUDENT" ? (
                                                    <GraduationCap className="w-5 h-5 text-emerald-500" />
                                                ) : (
                                                    <BookOpen className="w-5 h-5 text-blue-500" />
                                                )}
                                                تسجيل {role === "STUDENT" ? "طالب" : "معلم"} جديد
                                            </CardTitle>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setStep(1)}
                                                className="gap-1 text-muted-foreground"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                                تغيير الدور
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleRegister} className="space-y-4">
                                            {/* Name */}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">الاسم الكامل</label>
                                                <div className="relative">
                                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                        type="text"
                                                        placeholder="أدخل اسمك الكامل"
                                                        className="pr-10"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Email */}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">البريد الإلكتروني</label>
                                                <div className="relative">
                                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                        type="email"
                                                        placeholder="example@email.com"
                                                        className="pr-10"
                                                        dir="ltr"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Grade Selection (Students only) */}
                                            {role === "STUDENT" && (
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">الصف الدراسي (اختياري)</label>
                                                    <select
                                                        value={selectedGradeId}
                                                        onChange={(e) => setSelectedGradeId(e.target.value)}
                                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    >
                                                        <option value="">اختر الصف...</option>
                                                        {(grades || []).map((grade: any) => (
                                                            <option key={grade.id} value={grade.id}>
                                                                {grade.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Password */}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">كلمة المرور</label>
                                                <div className="relative">
                                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="6 أحرف على الأقل"
                                                        className="pr-10 pl-10"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        required
                                                        minLength={6}
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

                                            {/* Confirm Password */}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">تأكيد كلمة المرور</label>
                                                <div className="relative">
                                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="أعد كتابة كلمة المرور"
                                                        className="pr-10"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        required
                                                        minLength={6}
                                                    />
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
                                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                        {error}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Submit Button */}
                                            <Button
                                                type="submit"
                                                className={`w-full h-12 text-lg gap-2 ${role === "STUDENT"
                                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                                                    : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                                                    }`}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        جارٍ إنشاء الحساب...
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus className="w-5 h-5" />
                                                        إنشاء الحساب
                                                    </>
                                                )}
                                            </Button>

                                            {/* Login Link */}
                                            <div className="text-center pt-4 border-t">
                                                <span className="text-sm text-muted-foreground">
                                                    لديك حساب بالفعل؟{" "}
                                                    <Link to="/login" className="text-primary hover:underline font-medium">
                                                        تسجيل الدخول
                                                    </Link>
                                                </span>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
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

export default Register;
