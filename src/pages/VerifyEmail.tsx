import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    AlertCircle,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    KeyRound,
    Mail,
    Loader2,
} from "lucide-react";
import { useSignUp } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
    findPendingByEmail,
    isPendingExpired,
} from "@/lib/pendingRegistration";
import { completeVerifiedRegistration } from "@/lib/completeRegistration";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const VerifyEmail = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const { signUp, isLoaded: isClerkLoaded, setActive } = useSignUp();
    const { t, dir } = useTranslation();
    const ChevronBack = dir === "rtl" ? ChevronRight : ChevronLeft;

    const emailFromQuery = (searchParams.get("email") || "").trim().toLowerCase();

    const [email, setEmail] = useState(emailFromQuery);
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const handleResendCode = async () => {
        if (!isClerkLoaded || !signUp) return;
        setError("");
        setIsResending(true);
        try {
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        } catch (err: any) {
            console.error("[VerifyEmail] resend code:", err);
            setError(err?.errors?.[0]?.message || err?.message || t("verify.errGeneric"));
        } finally {
            setIsResending(false);
        }
    };

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            setError(t("register.errEnterEmail"));
            return;
        }
        if (!pin.trim() || pin.trim().length < 6) {
            setError(t("register.errEnterCode"));
            return;
        }
        if (!isClerkLoaded || !signUp) {
            setError(t("verify.errGeneric"));
            return;
        }

        setIsLoading(true);
        try {
            const result = await signUp.attemptEmailAddressVerification({ code: pin.trim() });

            if (result.status !== "complete") {
                setError(t("register.errInvalidCode"));
                return;
            }

            if (result.createdSessionId && setActive) {
                await setActive({ session: result.createdSessionId });
            }

            const pending = await findPendingByEmail(normalizedEmail);
            if (!pending) {
                setError(t("verify.errExpired"));
                return;
            }
            if (isPendingExpired(pending)) {
                setError(t("verify.errExpired"));
                return;
            }

            const { user } = await completeVerifiedRegistration({
                pending,
                detailsStudent: t("register.studentPendingShort"),
                detailsTeacher: t("register.adminPendingShort"),
            });

            localStorage.setItem(
                "edu_user",
                JSON.stringify({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    details: user.details,
                })
            );
            queryClient.setQueryData(["current_user"], user);

            const role = String(user.role || "").toUpperCase();
            setSuccessMessage(
                role === "TEACHER" ? t("register.teacherPending") : t("register.studentPending")
            );
            setTimeout(() => navigate("/login"), 2800);
        } catch (err: any) {
            console.error("[VerifyEmail] Clerk verification:", err);
            setError(
                err?.errors?.[0]?.longMessage ||
                    err?.errors?.[0]?.message ||
                    err?.message ||
                    t("register.errInvalidCode")
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-primary/10 flex flex-col"
            dir={dir}
        >
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center gap-3">
                            <img
                                src="/logo.png"
                                alt={t("common.brand")}
                                className="w-10 h-10 rounded-xl object-contain bg-background"
                            />
                            <span className="text-xl font-bold">{t("common.brand")}</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <LanguageSwitcher />
                            <Link
                                to="/login"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ChevronBack className="w-4 h-4" />
                                {t("forgot.backToLogin")}
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-sky-500 flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">{t("verify.title")}</h1>
                        <p className="text-muted-foreground">{t("verify.subtitle")}</p>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {successMessage ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <Card>
                                    <CardContent className="py-12 text-center">
                                        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-10 h-10 text-success" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">{t("register.successTitle")}</h3>
                                        <p className="text-muted-foreground mb-2">{successMessage}</p>
                                        <p className="text-sm text-muted-foreground">{t("register.redirecting")}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <KeyRound className="w-5 h-5 text-primary" />
                                            {t("verify.cardTitle")}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handlePinSubmit} className="space-y-5">
                                            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                                                {t("verify.hintBoth")}
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium mb-2 block">
                                                    {t("common.email")}
                                                </label>
                                                <div className="relative">
                                                    <Mail
                                                        className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`}
                                                    />
                                                    <Input
                                                        type="email"
                                                        className={dir === "rtl" ? "pr-10" : "pl-10"}
                                                        dir="ltr"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        placeholder={t("common.emailPlaceholder")}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium mb-2 block">
                                                    {t("verify.pinLabel")}
                                                </label>
                                                <div className="flex justify-center" dir="ltr">
                                                    <InputOTP maxLength={6} value={pin} onChange={setPin}>
                                                        <InputOTPGroup>
                                                            <InputOTPSlot index={0} />
                                                            <InputOTPSlot index={1} />
                                                            <InputOTPSlot index={2} />
                                                            <InputOTPSlot index={3} />
                                                            <InputOTPSlot index={4} />
                                                            <InputOTPSlot index={5} />
                                                        </InputOTPGroup>
                                                    </InputOTP>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2 text-center">
                                                    {t("verify.pinHint")}
                                                </p>
                                            </div>

                                            <AnimatePresence>
                                                {error && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                                                    >
                                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                                        {error}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <Button
                                                type="submit"
                                                className="w-full h-12 text-lg gap-2"
                                                disabled={isLoading || !isClerkLoaded}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        {t("register.verifying")}
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-5 h-5" />
                                                        {t("verify.activateWithPin")}
                                                    </>
                                                )}
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full"
                                                onClick={handleResendCode}
                                                disabled={isResending || isLoading || !isClerkLoaded}
                                            >
                                                {isResending ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        {t("forgot.sending")}
                                                    </>
                                                ) : (
                                                    t("verify.resendCode")
                                                )}
                                            </Button>

                                            <div className="text-center pt-2 border-t space-y-2">
                                                <Link
                                                    to="/register"
                                                    className="text-sm text-primary hover:underline block"
                                                >
                                                    {t("verify.backToRegister")}
                                                </Link>
                                                <Link
                                                    to="/login"
                                                    className="text-sm text-muted-foreground hover:text-foreground block"
                                                >
                                                    {t("forgot.backToLogin")}
                                                </Link>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default VerifyEmail;
