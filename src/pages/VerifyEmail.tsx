import { useCallback, useEffect, useRef, useState } from "react";
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
    Pencil,
} from "lucide-react";
import { useSignUp, useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
    findPendingByEmail,
    isPendingExpired,
} from "@/lib/pendingRegistration";
import { completeVerifiedRegistration } from "@/lib/completeRegistration";
import { getClerkErrorMessage } from "@/lib/clerkErrors";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp";

const RESEND_COOLDOWN_SECONDS = 45;

const VerifyEmail = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const { signUp, isLoaded: isClerkLoaded, setActive } = useSignUp();
    const { signOut } = useAuth();
    const { t, dir } = useTranslation();
    const ChevronBack = dir === "rtl" ? ChevronRight : ChevronLeft;

    const emailFromQuery = (searchParams.get("email") || "").trim().toLowerCase();

    const [email, setEmail] = useState(emailFromQuery);
    const [isEditingEmail, setIsEditingEmail] = useState(!emailFromQuery);
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendIn, setResendIn] = useState(0);
    const [successMessage, setSuccessMessage] = useState("");
    const submittedCode = useRef("");

    useEffect(() => {
        if (resendIn <= 0) return;
        const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [resendIn]);

    /** A verification attempt only exists in the browser that started the signup. */
    const hasActiveAttempt = Boolean(signUp && signUp.status === "missing_requirements");

    const handleResendCode = async () => {
        if (!isClerkLoaded || !signUp || resendIn > 0) return;
        setError("");
        setInfo("");
        setIsResending(true);
        try {
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            setPin("");
            setInfo(t("verify.codeResent"));
            setResendIn(RESEND_COOLDOWN_SECONDS);
        } catch (err: any) {
            console.error("[VerifyEmail] resend code:", err);
            setError(
                hasActiveAttempt
                    ? getClerkErrorMessage(err, t, "verify.errGeneric")
                    : t("verify.errNoAttempt")
            );
        } finally {
            setIsResending(false);
        }
    };

    const verifyCode = useCallback(
        async (code: string) => {
            setError("");
            setInfo("");

            const normalizedEmail = email.trim().toLowerCase();
            if (!normalizedEmail) {
                setError(t("register.errEnterEmail"));
                setIsEditingEmail(true);
                return;
            }
            if (code.length < 6) {
                setError(t("verify.errCodeLength"));
                return;
            }
            if (!isClerkLoaded || !signUp) {
                setError(t("verify.errGeneric"));
                return;
            }
            if (!hasActiveAttempt) {
                setError(t("verify.errNoAttempt"));
                return;
            }

            setIsLoading(true);
            try {
                const result = await signUp.attemptEmailAddressVerification({ code });

                if (result.status !== "complete") {
                    setPin("");
                    submittedCode.current = "";
                    setError(t("register.errInvalidCode"));
                    return;
                }

                if (result.createdSessionId && setActive) {
                    await setActive({ session: result.createdSessionId });
                }

                const pending = await findPendingByEmail(normalizedEmail);
                if (!pending || isPendingExpired(pending)) {
                    setError(t("verify.errExpired"));
                    return;
                }

                const { user } = await completeVerifiedRegistration({
                    pending,
                    detailsStudent: t("register.studentPendingShort"),
                    detailsTeacher: t("register.adminPendingShort"),
                });

                // The account still needs approval, so drop the cached identity and end the
                // Clerk session instead of leaving a half-signed-in user on a dashboard.
                localStorage.removeItem("edu_user");
                queryClient.clear();

                const role = String(user.role || "").toUpperCase();
                setSuccessMessage(
                    role === "TEACHER" ? t("register.teacherPending") : t("register.studentPending")
                );
                setTimeout(async () => {
                    await signOut({ redirectUrl: "/login" }).catch(() => undefined);
                    navigate("/login");
                }, 2800);
            } catch (err: any) {
                console.error("[VerifyEmail] Clerk verification:", err);
                setPin("");
                submittedCode.current = "";
                setError(getClerkErrorMessage(err, t, "register.errInvalidCode"));
            } finally {
                setIsLoading(false);
            }
        },
        [email, hasActiveAttempt, isClerkLoaded, navigate, queryClient, setActive, signOut, signUp, t]
    );

    const handlePinChange = (value: string) => {
        setPin(value);
        if (value.length < 6) {
            submittedCode.current = "";
            setError("");
        }
    };

    /** Verify as soon as the 6th digit lands — the button stays as a fallback. */
    const handlePinComplete = (code: string) => {
        if (isLoading || submittedCode.current === code) return;
        submittedCode.current = code;
        void verifyCode(code);
    };

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submittedCode.current = pin.trim();
        void verifyCode(pin.trim());
    };

    const slotClass =
        "h-14 w-12 text-2xl font-mono font-semibold border-input data-[active=true]:border-primary";

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
                                            {/* Where the code went */}
                                            {isEditingEmail ? (
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
                                                    <p className="text-xs text-muted-foreground mt-1.5">
                                                        {t("verify.emailHint")}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-muted-foreground">
                                                            {t("verify.sentToLabel")}
                                                        </p>
                                                        <p className="font-medium truncate" dir="ltr">
                                                            {email}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditingEmail(true)}
                                                        className="flex items-center gap-1 flex-shrink-0 text-xs font-medium text-primary hover:underline"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                        {t("verify.useAnotherEmail")}
                                                    </button>
                                                </div>
                                            )}

                                            {/* The code itself */}
                                            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
                                                <label
                                                    htmlFor="verification-code"
                                                    className="text-base font-semibold mb-1 block text-center"
                                                >
                                                    {t("verify.pinLabel")}
                                                </label>
                                                <p className="text-xs text-muted-foreground mb-4 text-center">
                                                    {t("verify.pinPasteHint")}
                                                </p>

                                                <div className="flex justify-center" dir="ltr">
                                                    <InputOTP
                                                        id="verification-code"
                                                        maxLength={6}
                                                        value={pin}
                                                        onChange={handlePinChange}
                                                        onComplete={handlePinComplete}
                                                        disabled={isLoading}
                                                        autoFocus
                                                        inputMode="numeric"
                                                        pattern={REGEXP_ONLY_DIGITS}
                                                        pasteTransformer={(pasted) => pasted.replace(/\D/g, "").slice(0, 6)}
                                                        containerClassName="gap-3"
                                                        aria-label={t("verify.pinLabel")}
                                                    >
                                                        <InputOTPGroup className="gap-2">
                                                            <InputOTPSlot index={0} className={slotClass} />
                                                            <InputOTPSlot index={1} className={slotClass} />
                                                            <InputOTPSlot index={2} className={slotClass} />
                                                        </InputOTPGroup>
                                                        <InputOTPSeparator className="text-muted-foreground" />
                                                        <InputOTPGroup className="gap-2">
                                                            <InputOTPSlot index={3} className={slotClass} />
                                                            <InputOTPSlot index={4} className={slotClass} />
                                                            <InputOTPSlot index={5} className={slotClass} />
                                                        </InputOTPGroup>
                                                    </InputOTP>
                                                </div>

                                                <p className="text-xs text-center mt-3 font-medium text-muted-foreground">
                                                    {pin.length === 6
                                                        ? t("verify.pinComplete")
                                                        : t("verify.pinDigitsEntered", { count: pin.length })}
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
                                                {info && !error && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm"
                                                    >
                                                        <CheckCircle className="w-4 h-4 shrink-0" />
                                                        {info}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <Button
                                                type="submit"
                                                className="w-full h-12 text-lg gap-2"
                                                disabled={isLoading || !isClerkLoaded || pin.length < 6}
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

                                            <div className="space-y-2">
                                                <p className="text-xs text-muted-foreground text-center">
                                                    {t("verify.checkSpam")}
                                                </p>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={handleResendCode}
                                                    disabled={
                                                        isResending || isLoading || !isClerkLoaded || resendIn > 0
                                                    }
                                                >
                                                    {isResending ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            {t("forgot.sending")}
                                                        </>
                                                    ) : resendIn > 0 ? (
                                                        t("verify.resendIn", { seconds: resendIn })
                                                    ) : (
                                                        t("verify.resendCode")
                                                    )}
                                                </Button>
                                            </div>

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
