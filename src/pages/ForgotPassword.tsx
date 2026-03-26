import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowRight, CheckCircle, AlertCircle, Loader2, Lock, KeyRound } from "lucide-react";
import { useSignIn, useAuth } from "@clerk/clerk-react";

const ForgotPassword = () => {
    const { isLoaded, signIn, setActive } = useSignIn();
    const { signOut, isSignedIn } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [step, setStep] = useState<"req_email" | "req_code" | "success">("req_email");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        setError("");
        setIsLoading(true);

        try {
            // Sign out any existing session to avoid "Session already exists" error
            if (isSignedIn) {
                await signOut();
            }

            await signIn.create({
                strategy: "reset_password_email_code",
                identifier: email,
            });
            setStep("req_code");
        } catch (err: any) {
            console.error("[ForgotPassword] Error sending code:", err);
            setError(err.errors?.[0]?.message || err.message || "حدث خطأ أثناء إرسال رمز التحقق.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        setError("");

        if (password !== confirmPassword) {
            setError("كلمتا المرور غير متطابقتين");
            return;
        }

        if (password.length < 8) {
            setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
            return;
        }

        setIsLoading(true);

        try {
            const result = await signIn.attemptFirstFactor({
                strategy: "reset_password_email_code",
                code,
                password,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                setStep("success");
                setTimeout(() => {
                    navigate("/");
                }, 3000);
            } else {
                console.error("[ForgotPassword] Incomplete reset:", result);
                setError("لم تكتمل عملية إعادة التعيين.");
            }
        } catch (err: any) {
            console.error("[ForgotPassword] Error resetting password:", err);
            setError(err.errors?.[0]?.message || err.message || "الرمز غير صحيح أو حدث خطأ أثناء التحديث.");
        } finally {
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
                            <ArrowRight className="w-4 h-4" />
                            العودة لتسجيل الدخول
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-md">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
                            {step === "req_email" ? (
                                <Mail className="w-10 h-10 text-white" />
                            ) : (
                                <KeyRound className="w-10 h-10 text-white" />
                            )}
                        </div>
                        <h1 className="text-3xl font-bold mb-2">
                            {step === "req_email" ? "نسيت كلمة المرور؟" : "إعادة تعيين كلمة المرور"}
                        </h1>
                        <p className="text-muted-foreground">
                            {step === "req_email"
                                ? "أدخل بريدك الإلكتروني المسجل لدينا"
                                : "أدخل رمز التحقق المرسل إلى بريدك وكلمة المرور الجديدة"}
                        </p>
                    </motion.div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                {step === "req_email" ? (
                                    <><Mail className="w-5 h-5 text-primary" /> استعادة الحساب</>
                                ) : (
                                    <><Lock className="w-5 h-5 text-primary" /> إعداد كلمة المرور الجديدة</>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AnimatePresence mode="wait">
                                {step === "success" ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="py-8 text-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-8 h-8 text-success" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">تم التحديث بنجاح!</h3>
                                        <p className="text-muted-foreground mb-6">
                                            تم تغيير كلمة المرور وتسجيل الدخول بنجاح. سيتم تحويلك...
                                        </p>
                                    </motion.div>
                                ) : step === "req_email" ? (
                                    <motion.form
                                        key="req_email_form"
                                        initial={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onSubmit={handleSendCode}
                                        className="space-y-4"
                                    >
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

                                        <AnimatePresence>
                                            {error && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                                                >
                                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                                    <span className="text-xs">{error}</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <Button
                                            type="submit"
                                            className="w-full h-12 text-lg"
                                            disabled={isLoading || !email || !isLoaded}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                    جارٍ الإرسال...
                                                </>
                                            ) : (
                                                "إرسال كود التحقق"
                                            )}
                                        </Button>
                                    </motion.form>
                                ) : (
                                    <motion.form
                                        key="req_code_form"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        onSubmit={handleResetPassword}
                                        className="space-y-4"
                                    >
                                        <div className="p-3 bg-primary/10 rounded-lg text-sm text-center mb-4 text-primary">
                                            تم إرسال رمز التحقق إلى <span className="font-bold">{email}</span>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium mb-2 block">رمز التحقق</label>
                                            <Input
                                                type="text"
                                                placeholder="أدخل الرمز المكون من 6 أرقام"
                                                className="text-center tracking-widest text-lg"
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                required
                                                maxLength={6}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium mb-2 block">كلمة المرور الجديدة</label>
                                            <div className="relative">
                                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    type="password"
                                                    placeholder="أدخل كلمة المرور الجديدة"
                                                    className="pr-10"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium mb-2 block">تأكيد كلمة المرور</label>
                                            <div className="relative">
                                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    type="password"
                                                    placeholder="أعد تأكيد كلمة المرور الجديدة"
                                                    className="pr-10"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {error && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                                                >
                                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                                    <span className="text-xs">{error}</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="flex gap-2">
                                            <Button
                                                type="submit"
                                                className="flex-1 h-12 text-lg"
                                                disabled={isLoading || !code || !password || !confirmPassword || !isLoaded}
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                                ) : (
                                                    "تغيير كلمة المرور"
                                                )}
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-12 px-4 whitespace-nowrap"
                                                onClick={() => setStep("req_email")}
                                                disabled={isLoading}
                                            >
                                                تعديل الإيميل
                                            </Button>
                                        </div>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default ForgotPassword;
