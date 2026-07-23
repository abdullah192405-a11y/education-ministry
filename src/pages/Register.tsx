import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    User, Lock, Eye, EyeOff,
    GraduationCap, BookOpen, ChevronLeft,
    Mail, AlertCircle, UserPlus, ArrowLeft, ArrowRight,
    ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useGrades, useOrganizations } from "@/hooks/useDatabase";
import { useQueryClient } from "@tanstack/react-query";
import { useSignUp, useAuth } from "@clerk/clerk-react";
import { useTranslation } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { createPendingRegistrationAndSendEmail } from "@/lib/pendingRegistration";

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
    const { t, dir } = useTranslation();
    const [role, setRole] = useState<UserRole | null>(null);
    const { data: organizations = [], isLoading: isLoadingOrganizations } = useOrganizations({ includeInactive: true });
    const { signUp, isLoaded: isClerkLoaded } = useSignUp();
    const { signOut, isSignedIn } = useAuth();
    const ChevronBack = dir === "rtl" ? ChevronRight : ChevronLeft;
    const ChangeRoleIcon = dir === "rtl" ? ArrowRight : ArrowLeft;
    const ArrowForward = dir === "rtl" ? ArrowLeft : ArrowRight;

    // Form state
    const [step, setStep] = useState<1 | 2>(1); // Step 1: Role, Step 2: Details → then /verify-email
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
    const [selectedGradeId, setSelectedGradeId] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const { data: grades = [] } = useGrades({
        organizationId: selectedOrganizationId || null,
        enabled: !!selectedOrganizationId && role === "STUDENT",
    });

    useEffect(() => {
        setSelectedGradeId("");
    }, [selectedOrganizationId]);

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

            const origin = window.location.origin;
            await signUp.authenticateWithRedirect({
                strategy: "oauth_google",
                redirectUrl: `${origin}/sso-callback`,
                redirectUrlComplete: `${origin}/sso-complete`,
            });
        } catch (err: any) {
            console.error("[Register] Google sign-up error:", err);
            setError(t("register.errCreate"));
            setIsGoogleLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!role) {
            setError(t("register.errGeneric"));
            return;
        }
        if (!name.trim()) {
            setError(t("register.errEnterName"));
            return;
        }
        if (!email.trim()) {
            setError(t("register.errEnterEmail"));
            return;
        }
        if (!selectedOrganizationId) {
            setError(t("register.errSelectOrg"));
            return;
        }
        if (role === "STUDENT" && !selectedGradeId) {
            setError(t("register.errSelectStudentGrade"));
            return;
        }
        if (password.length < 6) {
            setError(t("register.errPasswordShort"));
            return;
        }
        if (password !== confirmPassword) {
            setError(t("register.errPasswordsNoMatch"));
            return;
        }

        setIsLoading(true);

        try {
            if (isSignedIn) {
                await signOut();
            }
            await supabase.auth.signOut();
            queryClient.clear();
            localStorage.removeItem("edu_user");

            const normalizedEmail = email.trim().toLowerCase();

            const { data: existingUser } = await supabase
                .from("users")
                .select("id")
                .ilike("email", normalizedEmail)
                .maybeSingle();

            if (existingUser) {
                setError(t("register.errEmailExists"));
                setIsLoading(false);
                return;
            }

            // Store pending signup + send PIN + activation link email, then open verify page
            const { email: sentEmail } = await createPendingRegistrationAndSendEmail({
                email: normalizedEmail,
                name: name.trim(),
                role,
                password,
                organizationId: selectedOrganizationId || null,
                gradeId: selectedGradeId || null,
            });

            navigate(`/verify-email?email=${encodeURIComponent(sentEmail)}`, { replace: true });
        } catch (err: any) {
            console.error("[Register] pending signup error:", err);
            setError(err?.message || t("register.errCreate"));
            setIsLoading(false);
        }
    };

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
                            <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                                <ChevronBack className="w-4 h-4" />
                                {t("forgot.backToLogin")}
                            </Link>
                        </div>
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
                            {t("register.title")}
                        </h1>
                        <p className="text-muted-foreground">
                            {step === 1 ? t("register.step1Desc") : t("register.step2Desc")}
                        </p>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {step === 1 ? (
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
                                            {t("register.selectRole")}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-muted-foreground">
                                            {t("register.selectRoleDesc")}
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
                                                    {t("register.signingUp")}
                                                </>
                                            ) : (
                                                <>
                                                    <GoogleIcon />
                                                    {t("register.googleSignup")}
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
                                                    {t("register.orSelectRole")}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Student Role */}
                                        <button
                                            onClick={() => handleRoleSelect("STUDENT")}
                                            className={`w-full p-5 rounded-xl border-2 hover:border-emerald-500/50 transition-all ${dir === "rtl" ? "text-right" : "text-left"} group hover:shadow-lg`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                                                    <GraduationCap className="w-8 h-8 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-lg">{t("register.studentRoleTitle")}</span>
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600">
                                                            STUDENT
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {t("register.studentRoleDesc")}
                                                    </p>
                                                </div>
                                                <ArrowForward className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                                            </div>
                                        </button>

                                        {/* Teacher Role */}
                                        <button
                                            onClick={() => handleRoleSelect("TEACHER")}
                                            className={`w-full p-5 rounded-xl border-2 hover:border-blue-500/50 transition-all ${dir === "rtl" ? "text-right" : "text-left"} group hover:shadow-lg`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                    <BookOpen className="w-8 h-8 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-lg">{t("register.teacherRoleTitle")}</span>
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600">
                                                            TEACHER
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {t("register.teacherRoleDesc")}
                                                    </p>
                                                </div>
                                                <ArrowForward className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
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
                                                {t("register.haveAccount")}{" "}
                                                <Link to="/login" className="text-primary hover:underline font-medium">
                                                    {t("common.login")}
                                                </Link>
                                            </span>
                                        </div>
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
                                                {role === "STUDENT" ? t("register.studentNewSignup") : t("register.teacherNewSignup")}
                                            </CardTitle>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setStep(1)}
                                                className="gap-1 text-muted-foreground"
                                            >
                                                <ChangeRoleIcon className="w-4 h-4" />
                                                {t("register.changeRole")}
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleRegister} className="space-y-4">
                                            {/* Clerk bot protection / captcha mount point */}
                                            <div id="clerk-captcha" />

                                            {/* Name */}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">{t("register.fullName")}</label>
                                                <div className="relative">
                                                    <User className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                                                    <Input
                                                        type="text"
                                                        placeholder={t("register.fullNamePlaceholder")}
                                                        className={dir === "rtl" ? "pr-10" : "pl-10"}
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Email */}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">{t("common.email")}</label>
                                                <div className="relative">
                                                    <Mail className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                                                    <Input
                                                        type="email"
                                                        placeholder={t("register.emailPlaceholder")}
                                                        className={dir === "rtl" ? "pr-10" : "pl-10"}
                                                        dir="ltr"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium mb-2 block">{t("register.schoolOrOrg")}</label>
                                                <select
                                                    value={selectedOrganizationId}
                                                    onChange={(e) => setSelectedOrganizationId(e.target.value)}
                                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    required
                                                    disabled={isLoadingOrganizations}
                                                >
                                                    <option value="">
                                                        {isLoadingOrganizations ? t("register.loadingOrgs") : t("register.selectOrg")}
                                                    </option>
                                                    {(organizations || []).map((org: any) => (
                                                        <option key={org.id} value={org.id}>
                                                            {org.name}{org.is_active === false ? ` ${t("register.orgInactive")}` : ""}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {role === "STUDENT" && (
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">
                                                        {t("register.studyGrade")}
                                                    </label>
                                                    <select
                                                        value={selectedGradeId}
                                                        onChange={(e) => setSelectedGradeId(e.target.value)}
                                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        required
                                                        disabled={!selectedOrganizationId}
                                                    >
                                                        <option value="">
                                                            {!selectedOrganizationId
                                                                ? t("register.selectOrgFirst")
                                                                : grades.length
                                                                    ? t("register.selectGrade")
                                                                    : t("register.noGradesForOrg")}
                                                        </option>
                                                        {grades.map((g: any) => (
                                                            <option key={g.id} value={g.id}>{g.name}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-xs text-muted-foreground mt-1.5">
                                                        {t("register.studentGradeHint")}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Password */}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">{t("common.password")}</label>
                                                <div className="relative">
                                                    <Lock className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder={t("register.passwordMin6Placeholder")}
                                                        className={dir === "rtl" ? "pr-10 pl-10" : "pl-10 pr-10"}
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        required
                                                        minLength={6}
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

                                            {/* Confirm Password */}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">{t("common.confirmPassword")}</label>
                                                <div className="relative">
                                                    <Lock className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder={t("register.confirmPasswordPlaceholder")}
                                                        className={dir === "rtl" ? "pr-10" : "pl-10"}
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
                                                        {t("register.creatingAccount")}
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus className="w-5 h-5" />
                                                        {t("register.createAccount")}
                                                    </>
                                                )}
                                            </Button>

                                            {/* Login Link */}
                                            <div className="text-center pt-4 border-t">
                                                <span className="text-sm text-muted-foreground">
                                                    {t("register.haveAccount")}{" "}
                                                    <Link to="/login" className="text-primary hover:underline font-medium">
                                                        {t("common.login")}
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
                    {t("login.footerCopy")}
                </div>
            </footer>
        </div>
    );
};

export default Register;
