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

// Demo accounts data for educational platform
const demoAccounts = [
    {
        id: "student",
        email: "student@edu.sa",
        password: "student123",
        name: "طالب",
        role: "طالب",
        roleKey: "student",
        icon: GraduationCap,
        color: "from-emerald-500 to-teal-500",
        bgColor: "bg-emerald-500/10",
        textColor: "text-emerald-600",
        description: "لوحة تحكم الطالب - تتبع تقدمك وشاراتك",
        dashboard: "/dashboard/student",
        details: "الصف الأول الابتدائي"
    },
    {
        id: "teacher",
        email: "teacher@edu.sa",
        password: "teacher123",
        name: "معلم",
        role: "معلمة",
        roleKey: "teacher",
        icon: BookOpen,
        color: "from-blue-500 to-purple-500",
        bgColor: "bg-blue-500/10",
        textColor: "text-blue-600",
        description: "لوحة تحكم المعلم - إدارة الدروس والتحديات",
        dashboard: "/dashboard/teacher",
        details: "مادة اللغة العربية"
    },
    {
        id: "admin",
        email: "admin@edu.sa",
        password: "admin123",
        name: "الأدمن",
        role: "مسؤول",
        roleKey: "admin",
        icon: Shield,
        color: "from-amber-500 to-orange-500",
        bgColor: "bg-amber-500/10",
        textColor: "text-amber-600",
        description: "لوحة تحكم المسؤول - إدارة شاملة للمنصة",
        dashboard: "/dashboard/admin",
        details: "الإدارة العامة"
    }
];

const Login = () => {
    const navigate = useNavigate();
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

        // Simulate loading
        await new Promise(resolve => setTimeout(resolve, 800));

        // Check against demo accounts
        const account = demoAccounts.find(
            acc => acc.email === email && acc.password === password
        );

        if (account) {
            setLoginSuccess(account.name);
            // Store user info in localStorage for demo purposes
            localStorage.setItem("edu_user", JSON.stringify({
                id: account.id,
                name: account.name,
                email: account.email,
                role: account.roleKey,
                details: account.details
            }));

            // Redirect after showing success
            setTimeout(() => {
                navigate(account.dashboard);
            }, 1000);
        } else {
            setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
            setIsLoading(false);
        }
    };

    const handleDemoLogin = async (account: typeof demoAccounts[0]) => {
        setEmail(account.email);
        setPassword(account.password);
        setError("");
        setIsLoading(true);

        // Simulate loading
        await new Promise(resolve => setTimeout(resolve, 800));

        setLoginSuccess(account.name);
        // Store user info
        localStorage.setItem("edu_user", JSON.stringify({
            id: account.id,
            name: account.name,
            email: account.email,
            role: account.roleKey,
            details: account.details
        }));

        // Redirect after showing success
        setTimeout(() => {
            navigate(account.dashboard);
        }, 1000);
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
                <div className="w-full max-w-4xl">
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
                            المنصة التعليمية الرقمية
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Demo Accounts Section */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Sparkles className="w-5 h-5 text-warning" />
                                        حسابات تجريبية
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        انقر على أي حساب للدخول مباشرة واستكشاف لوحة التحكم
                                    </p>

                                    {demoAccounts.map((account, i) => (
                                        <motion.div
                                            key={account.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 + i * 0.1 }}
                                        >
                                            <button
                                                onClick={() => handleDemoLogin(account)}
                                                disabled={isLoading}
                                                className={`w-full p-4 rounded-xl border-2 hover:border-primary/50 transition-all text-right group ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${account.color} flex items-center justify-center flex-shrink-0`}>
                                                        <account.icon className="w-7 h-7 text-white" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-bold">{account.name}</span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${account.bgColor} ${account.textColor}`}>
                                                                {account.role}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mb-1">{account.description}</p>
                                                        <p className="text-xs text-primary">{account.details}</p>
                                                        <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                                                            <span><Mail className="w-3 h-3 inline ml-1" />{account.email}</span>
                                                            <span><Lock className="w-3 h-3 inline ml-1" />{account.password}</span>
                                                        </div>
                                                    </div>
                                                    <LogIn className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </div>
                                            </button>
                                        </motion.div>
                                    ))}
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Login Form Section */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="h-full">
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

                    {/* Info Box */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-8"
                    >
                        <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 border-primary/20">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg mb-2">تجربة المنصة التعليمية</h3>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            هذه الحسابات مخصصة للتجربة والعرض. يمكنك استكشاف جميع ميزات المنصة:
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <GraduationCap className="w-4 h-4 text-emerald-600" />
                                                <span>لوحة الطالب - تتبع التقدم</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <BookOpen className="w-4 h-4 text-blue-600" />
                                                <span>لوحة المعلم - إدارة الدروس</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Shield className="w-4 h-4 text-amber-600" />
                                                <span>لوحة المسؤول - إدارة شاملة</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 border-t text-center text-sm text-muted-foreground">
                <div className="container mx-auto px-4">
                    جميع الحقوق محفوظة © 2024 المنصة التعليمية
                </div>
            </footer>
        </div>
    );
};

export default Login;
