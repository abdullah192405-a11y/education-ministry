import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/contexts/LanguageContext";

const ResetPassword = () => {
    const navigate = useNavigate();
    const { t, dir } = useTranslation();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isValidSession, setIsValidSession] = useState(true);

    const [email, setEmail] = useState("");

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const emailParam = searchParams.get("email");

        if (emailParam) {
            setEmail(emailParam);
            setIsValidSession(true);
            setError("");
        } else {
            const checkSession = async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session && !window.location.hash) {
                    setIsValidSession(false);
                    setError(t("reset.invalidLink"));
                }
            };

            checkSession();

            const { data: authListener } = supabase.auth.onAuthStateChange(
                (event, session) => {
                    if (event === "PASSWORD_RECOVERY") {
                        setIsValidSession(true);
                        setError("");
                    }
                }
            );

            return () => {
                authListener.subscription.unsubscribe();
            };
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError(t("reset.passwordsNoMatch"));
            return;
        }

        if (password.length < 6) {
            setError(t("reset.passwordMinLength"));
            return;
        }

        setIsLoading(true);

        try {
            if (email) {
                // If using our lab direct flow via custom users table
                const { data: updated, error: rpcError } = await supabase.rpc('reset_user_password', {
                    p_email: email,
                    p_new_password: password
                });

                if (rpcError || !updated) {
                    console.error("[ResetPassword] RPC Error:", rpcError);
                    setError(t("reset.errUpdate"));
                    setIsLoading(false);
                    return;
                }
            } else {
                // Using standard Supabase Auth recovery
                const { error: updateError } = await supabase.auth.updateUser({
                    password: password
                });

                if (updateError) {
                    console.error("[ResetPassword] Error:", updateError);
                    setError(t("reset.errUpdate"));
                    setIsLoading(false);
                    return;
                }

                await supabase.auth.signOut();
            }

            setSuccess(true);
            setTimeout(() => {
                navigate("/login");
            }, 3000);

        } catch (err: any) {
            setError(err.message || t("reset.errGeneric"));
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-primary/10 flex flex-col" dir={dir}>
            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-md">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
                            <KeyRound className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">{t("reset.title")}</h1>
                        <p className="text-muted-foreground">
                            {t("reset.description")}
                        </p>
                    </motion.div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-center">{t("reset.cardTitle")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AnimatePresence mode="wait">
                                {success ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="py-8 text-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-8 h-8 text-success" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">{t("reset.successTitle")}</h3>
                                        <p className="text-muted-foreground mb-6">
                                            {t("reset.successDesc")}
                                        </p>
                                    </motion.div>
                                ) : (
                                    <motion.form
                                        key="form"
                                        initial={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onSubmit={handleSubmit}
                                        className="space-y-4"
                                    >
                                        {!isValidSession && (
                                            <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                                                <span className="font-medium">{t("reset.alert")}</span> {error}
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-sm font-medium mb-2 block">{t("reset.newPassword")}</label>
                                            <div className="relative">
                                                <Lock className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder={t("reset.newPasswordPlaceholder")}
                                                    className={dir === "rtl" ? "pr-10 pl-10" : "pl-10 pr-10"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    required
                                                    disabled={!isValidSession}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className={`absolute ${dir === "rtl" ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors`}
                                                    disabled={!isValidSession}
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium mb-2 block">{t("reset.confirmPassword")}</label>
                                            <div className="relative">
                                                <Lock className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder={t("reset.confirmPasswordPlaceholder")}
                                                    className={dir === "rtl" ? "pr-10 pl-10" : "pl-10 pr-10"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    required
                                                    disabled={!isValidSession}
                                                />
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {error && isValidSession && (
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

                                        <Button
                                            type="submit"
                                            className="w-full h-12 text-lg"
                                            disabled={isLoading || !password || !confirmPassword || !isValidSession}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                    {t("reset.saving")}
                                                </>
                                            ) : (
                                                t("reset.save")
                                            )}
                                        </Button>
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

export default ResetPassword;
