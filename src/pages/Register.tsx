import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    User, Lock, Eye, EyeOff, LogIn, Sparkles,
    Shield, GraduationCap, BookOpen, ChevronLeft,
    Mail, CheckCircle, AlertCircle, UserPlus, ArrowLeft, ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useGrades } from "@/hooks/useDatabase";
import { useQueryClient } from "@tanstack/react-query";

type UserRole = "STUDENT" | "TEACHER";

const Register = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: grades } = useGrades();

    // Form state
    const [step, setStep] = useState<1 | 2>(1); // Step 1: Role, Step 2: Details
    const [role, setRole] = useState<UserRole | null>(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [selectedGradeId, setSelectedGradeId] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [registerSuccess, setRegisterSuccess] = useState(false);

    const handleRoleSelect = (selectedRole: UserRole) => {
        setRole(selectedRole);
        setStep(2);
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

        setIsLoading(true);

        try {
            // 1. Create Supabase Auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        role: role,
                    },
                    emailRedirectTo: undefined,
                }
            });

            if (authError) {
                if (authError.message.includes("already registered")) {
                    setError("هذا البريد الإلكتروني مسجل بالفعل");
                } else if (authError.status === 500 || authError.message.includes("500") || authError.message.toLowerCase().includes("rate limit")) {
                    // Fallback: create user record without Supabase Auth
                    console.warn("Supabase Auth signup failed (likely no SMTP configured or rate limited). Creating user directly.");
                    const now = new Date().toISOString();
                    const { data: directUser, error: directError } = await supabase
                        .from("users")
                        .insert({
                            email,
                            name,
                            role: role,
                            verified: false,
                            is_active: true,
                            details: role === "STUDENT" ? "طالب جديد" : "معلم جديد",
                            updated_at: now,
                        })
                        .select()
                        .single();

                    if (directError) {
                        if (directError.message.includes("duplicate") || directError.message.includes("unique")) {
                            setError("هذا البريد الإلكتروني مسجل بالفعل");
                        } else {
                            setError("خطأ في إنشاء الحساب: " + directError.message);
                        }
                        setIsLoading(false);
                        return;
                    }

                    // Create role-specific profile for the direct user
                    if (role === "STUDENT") {
                        await supabase.from("student_profiles").insert({
                            user_id: directUser.id,
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
                            user_id: directUser.id,
                            total_students: 0,
                            total_topics: 0,
                            total_challenges: 0,
                            average_score: 0,
                            updated_at: now,
                        });
                    }

                    // Store user and navigate
                    localStorage.setItem("edu_user", JSON.stringify({
                        id: directUser.id,
                        name: directUser.name,
                        email: directUser.email,
                        role: directUser.role,
                        details: directUser.details,
                    }));
                    queryClient.setQueryData(["current_user"], directUser);
                    setRegisterSuccess(true);
                    const dashboardPath = role === "TEACHER" ? "/dashboard/teacher" : "/dashboard/student";
                    setTimeout(() => navigate(dashboardPath), 2500);
                    return;
                } else {
                    setError(authError.message);
                }
                setIsLoading(false);
                return;
            }

            if (!authData.user) {
                setError("حدث خطأ أثناء إنشاء الحساب");
                setIsLoading(false);
                return;
            }

            // 2. Create user record in the users table
            const now = new Date().toISOString();
            const { data: newUser, error: userError } = await supabase
                .from("users")
                .insert({
                    auth_id: authData.user.id,
                    email,
                    name,
                    role: role,
                    verified: false,
                    is_active: true,
                    details: role === "STUDENT" ? "طالب جديد" : "معلم جديد",
                    updated_at: now,
                })
                .select()
                .single();

            if (userError) {
                console.error("User insert error:", userError);
                setError("تم إنشاء الحساب لكن فشل في حفظ البيانات. يرجى التواصل مع الدعم.");
                setIsLoading(false);
                return;
            }

            // 3. Create role-specific profile
            if (role === "STUDENT") {
                const { error: profileError } = await supabase
                    .from("student_profiles")
                    .insert({
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

                if (profileError) {
                    console.error("Student profile error:", profileError);
                }
            } else if (role === "TEACHER") {
                const { error: profileError } = await supabase
                    .from("teacher_profiles")
                    .insert({
                        user_id: newUser.id,
                        total_students: 0,
                        total_topics: 0,
                        total_challenges: 0,
                        average_score: 0,
                        updated_at: now,
                    });

                if (profileError) {
                    console.error("Teacher profile error:", profileError);
                }
            }

            // 4. Success — store user and go to dashboard directly
            localStorage.setItem("edu_user", JSON.stringify({
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                details: newUser.details,
            }));

            // Pre-load the user into the query cache so ProtectedRoute sees it immediately
            queryClient.setQueryData(["current_user"], newUser);
            setRegisterSuccess(true);

            const dashboardPath = role === "TEACHER" ? "/dashboard/teacher" : "/dashboard/student";
            setTimeout(() => {
                navigate(dashboardPath);
            }, 2500);

        } catch (err: any) {
            setError(err.message || "حدث خطأ غير متوقع");
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
                            {step === 1 ? "اختر نوع الحساب" : "أكمل بياناتك"}
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
                        ) : (
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
