import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ClipboardList, Clock, Timer, CheckCircle2, XCircle, AlertTriangle,
    ArrowLeft, ArrowRight, Loader2, Trophy, BookOpen, Lock,
    CalendarX, Send, GraduationCap, Star
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useExamByPin, useSubmitExamResult, useExamSubmission, examCategoryLabels } from "@/hooks/useExams";
import { useUser, useStudentProfile } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/contexts/LanguageContext";
import { formatOptionLabel } from "@/lib/formatOptionLabel";
import { QuestionAttachmentDisplay } from "@/components/QuestionAttachmentDisplay";

// ============================================================================
// Exam Page - Student takes exam via link only
// ============================================================================
const ExamPage = () => {
    const { pin } = useParams<{ pin: string }>();
    const navigate = useNavigate();
    const { dir, language } = useTranslation();
    const ArrowBack = dir === "rtl" ? ArrowRight : ArrowLeft;
    const ArrowForward = dir === "rtl" ? ArrowLeft : ArrowRight;
    const { data: exam, isLoading: loadingExam } = useExamByPin(pin || "");
    const { data: currentUser, isLoading: loadingUser } = useUser();
    const { data: studentProfile, isLoading: loadingStudent } = useStudentProfile(currentUser?.id || "");
    const submitResultMutation = useSubmitExamResult();
    const { data: existingSubmission, isLoading: loadingSubmission } = useExamSubmission(
        exam?.id || "",
        currentUser?.id || ""
    );

    const [phase, setPhase] = useState<"loading" | "notfound" | "early" | "expired" | "already_submitted" | "login_required" | "wrong_grade" | "ready" | "taking" | "submitted">("loading");
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [startedAt, setStartedAt] = useState<Date | null>(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Questions from the exam (mapped in useExamByPin hook)
    const questions = useMemo(() => {
        return exam?.challengeItems || [];
    }, [exam]);

    // Determine exam phase
    useEffect(() => {
        if (loadingExam || loadingUser || loadingSubmission || loadingStudent) {
            setPhase("loading");
            return;
        }

        if (!exam) {
            setPhase("notfound");
            return;
        }

        if (!currentUser) {
            setPhase("login_required");
            return;
        }

        // Check Target Grade (Class Targeting)
        // If exam is targeted at a specific grade, verify student belongs to it
        if (exam.grade_id && studentProfile && studentProfile.grade_id !== exam.grade_id) {
            setPhase("wrong_grade");
            return;
        }

        if (existingSubmission) {
            setResult(existingSubmission);
            setPhase("already_submitted");
            return;
        }

        const now = new Date();
        const start = new Date(exam.start_time);
        const end = new Date(exam.end_time);

        if (now < start) {
            setPhase("early");
            return;
        }

        if (now > end) {
            setPhase("expired");
            return;
        }

        setPhase("ready");
    }, [exam, currentUser, existingSubmission, studentProfile, loadingExam, loadingUser, loadingSubmission, loadingStudent]);

    // Timer
    useEffect(() => {
        if (phase !== "taking" || !startedAt || !exam) return;

        const durationMs = (exam.duration_minutes || 60) * 60 * 1000;
        const endTime = new Date(exam.end_time).getTime();

        const interval = setInterval(() => {
            const now = Date.now();
            const timeSinceStart = now - startedAt.getTime();
            const timeUntilEnd = endTime - now;

            const remaining = Math.min(durationMs - timeSinceStart, timeUntilEnd);

            if (remaining <= 0) {
                clearInterval(interval);
                handleSubmit();
                return;
            }

            setTimeRemaining(Math.ceil(remaining / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [phase, startedAt, exam]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleStartExam = () => {
        setStartedAt(new Date());
        setCurrentQuestionIndex(0);
        setAnswers({});
        setPhase("taking");
    };

    const handleAnswer = (questionIndex: number, answer: any) => {
        setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    };

    const handleSubmit = useCallback(async () => {
        if (isSubmitting || !exam || !currentUser) return;
        setIsSubmitting(true);

        try {
            const timeTaken = startedAt ? (Date.now() - startedAt.getTime()) / 1000 : 0;

            let correctAnswers = 0;
            let totalScore = 0;
            let maxScore = 0;
            const questionResults: any[] = [];

            questions.forEach((q: any, index: number) => {
                const userAnswer = answers[index];
                const points = q.points || 100;
                maxScore += points;

                let correct = false;

                if (q.type === "multiple_choice" || q.type === "true_false" || q.type === "shooting") {
                    correct = userAnswer !== undefined && Number(userAnswer) === Number(q.correctAnswer);
                } else if (q.type === "order_questions") {
                    correct = JSON.stringify(userAnswer) === JSON.stringify(q.orderItems);
                } else if (q.type === "qa" || q.type === "know_dont_know") {
                    correct = userAnswer !== undefined && userAnswer !== null;
                }

                if (correct) {
                    correctAnswers++;
                    totalScore += points;
                }

                questionResults.push({
                    questionId: q.id,
                    correct,
                    timeTaken: 0,
                    pointsEarned: correct ? points : 0,
                    userAnswer,
                });
            });

            const percentage = questions.length > 0 ? (correctAnswers / questions.length) * 100 : 0;

            const resultData = await submitResultMutation.mutateAsync({
                examId: exam.id,
                userId: currentUser.id,
                studentName: currentUser.name,
                totalQuestions: questions.length,
                correctAnswers,
                wrongAnswers: questions.length - correctAnswers,
                score: totalScore,
                maxScore,
                percentage,
                timeTaken,
                questionResults,
            });

            setResult({
                ...resultData,
                percentage,
                correctAnswers,
                wrongAnswers: questions.length - correctAnswers,
                totalQuestions: questions.length,
                score: totalScore,
                maxScore,
                timeTaken,
            });
            setPhase("submitted");
        } catch (error: any) {
            console.error("Failed to submit exam:", error);
            alert("حدث خطأ أثناء تقديم الاختبار: " + (error.message || ""));
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, exam, currentUser, startedAt, questions, answers, submitResultMutation]);

    const currentQuestion = questions[currentQuestionIndex];
    const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

    // ========================================================================
    // Render different phases
    // ========================================================================

    if (phase === "loading") {
        return (
            <div className="min-h-screen font-cairo bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">جاري تحميل الاختبار...</p>
                </div>
            </div>
        );
    }

    if (phase === "notfound") {
        return (
            <div className="min-h-screen font-cairo bg-gradient-to-b from-background via-background to-primary/5">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 max-w-md">
                        <Card className="p-8 text-center">
                            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
                            <h1 className="text-2xl font-black mb-2">الاختبار غير موجود</h1>
                            <p className="text-muted-foreground mb-6">الرابط غير صحيح أو أن الاختبار قد تم حذفه</p>
                            <Button onClick={() => navigate("/")} className="gap-2">
                                <ArrowBack className="w-4 h-4" />
                                العودة للرئيسية
                            </Button>
                        </Card>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (phase === "login_required") {
        return (
            <div className="min-h-screen font-cairo bg-gradient-to-b from-background via-background to-primary/5">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 max-w-md">
                        <Card className="p-8 text-center">
                            <Lock className="w-16 h-16 mx-auto mb-4 text-primary" />
                            <h1 className="text-2xl font-black mb-2">يجب تسجيل الدخول</h1>
                            <p className="text-muted-foreground mb-6">يجب عليك تسجيل الدخول لدخول الاختبار</p>
                            <Button onClick={() => navigate(`/login?redirect=/exam/${pin}`)} className="gap-2 w-full h-12">
                                <ArrowBack className="w-4 h-4" />
                                تسجيل الدخول
                            </Button>
                        </Card>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }
    if (phase === "wrong_grade") {
        return (
            <div className="min-h-screen font-cairo bg-gradient-to-b from-background via-background to-primary/5">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 max-w-md">
                        <Card className="p-8 text-center border-red-200 bg-red-50/30">
                            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                            <h1 className="text-2xl font-black mb-2 text-red-900">غير مسموح بالدخول</h1>
                            <p className="text-red-700/80 mb-6">
                                عذراً، هذا الاختبار مخصص لطلاب 
                                <span className="font-bold border-b-2 border-red-500 mx-1">
                                    {exam?.grade?.name || exam?.topic?.subject?.grade?.name || "صف دراسي آخر"}
                                </span> 
                                فقط. صفك الحالي لا يطابق المستهدف.
                            </p>
                            <Button onClick={() => navigate("/")} variant="outline" className="gap-2 w-full">
                                <ArrowBack className="w-4 h-4" />
                                العودة للمتجر التعليمي
                            </Button>
                        </Card>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }
    if (phase === "early") {
        const startDate = new Date(exam!.start_time);
        return (
            <div className="min-h-screen font-cairo bg-gradient-to-b from-background via-background to-primary/5">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 max-w-md">
                        <Card className="p-8 text-center">
                            <Clock className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                            <h1 className="text-2xl font-black mb-2">الاختبار لم يبدأ بعد</h1>
                            <p className="text-muted-foreground mb-4">يبدأ الاختبار في:</p>
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-6">
                                <p className="text-lg font-black text-blue-600">
                                    {startDate.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                                </p>
                                <p className="text-2xl font-mono font-black text-blue-800 mt-1">
                                    {startDate.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                            <p className="text-sm text-muted-foreground">عد لهذه الصفحة في الوقت المحدد لبدء الاختبار</p>
                        </Card>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (phase === "expired") {
        return (
            <div className="min-h-screen font-cairo bg-gradient-to-b from-background via-background to-primary/5">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 max-w-md">
                        <Card className="p-8 text-center">
                            <CalendarX className="w-16 h-16 mx-auto mb-4 text-red-500" />
                            <h1 className="text-2xl font-black mb-2">انتهى وقت الاختبار</h1>
                            <p className="text-muted-foreground mb-6">لقد انتهى الوقت المسموح لهذا الاختبار</p>
                            <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
                                <ArrowBack className="w-4 h-4" />
                                العودة للرئيسية
                            </Button>
                        </Card>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (phase === "already_submitted" || phase === "submitted") {
        const r = result;
        const isPass = (r?.percentage || 0) >= 50;
        return (
            <div className="min-h-screen font-cairo bg-gradient-to-b from-background via-background to-primary/5">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 max-w-lg" dir="rtl">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                            <Card className="p-8 text-center overflow-hidden">
                                {/* Result Header */}
                                <div className={`-mx-8 -mt-8 mb-8 p-8 ${isPass ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-red-500 to-rose-600"} text-white relative overflow-hidden`}>
                                    <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
                                    <div className="relative z-10">
                                        {isPass ? (
                                            <Trophy className="w-16 h-16 mx-auto mb-3 drop-shadow-lg" />
                                        ) : (
                                            <GraduationCap className="w-16 h-16 mx-auto mb-3 drop-shadow-lg" />
                                        )}
                                        <h1 className="text-3xl font-black mb-2">
                                            {phase === "already_submitted" ? "تم تقديم الاختبار مسبقاً" : (isPass ? "أحسنت! 🎉" : "حاول مرة أخرى")}
                                        </h1>
                                        <p className="text-white/80">
                                            {exam?.title}
                                        </p>
                                    </div>
                                </div>

                                {/* Score */}
                                <div className="mb-8">
                                    <div className={`text-6xl font-black mb-2 ${isPass ? "text-emerald-600" : "text-red-600"}`}>
                                        {Math.round(r?.percentage || 0)}%
                                    </div>
                                    <div className="flex items-center justify-center gap-4 text-sm">
                                        <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 font-bold">
                                            <CheckCircle2 className="w-4 h-4" /> {r?.correct_answers || r?.correctAnswers || 0} صحيح
                                        </span>
                                        <span className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 font-bold">
                                            <XCircle className="w-4 h-4" /> {r?.wrong_answers || r?.wrongAnswers || 0} خطأ
                                        </span>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-muted/50 p-4 rounded-xl">
                                        <p className="text-sm text-muted-foreground">الدرجة</p>
                                        <p className="text-xl font-black">{r?.score || 0} / {r?.max_score || r?.maxScore || 0}</p>
                                    </div>
                                    <div className="bg-muted/50 p-4 rounded-xl">
                                        <p className="text-sm text-muted-foreground">الوقت</p>
                                        <p className="text-xl font-black">{Math.round((r?.time_taken || r?.timeTaken || 0) / 60)} دقيقة</p>
                                    </div>
                                </div>

                                <Button onClick={() => navigate("/")} className="gap-2 w-full h-12">
                                    <ArrowBack className="w-4 h-4" />
                                    العودة للرئيسية
                                </Button>
                            </Card>
                        </motion.div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (phase === "ready") {
        const catLabel = examCategoryLabels[exam!.category] || { label: exam!.category, icon: "📝" };
        return (
            <div className="min-h-screen font-cairo bg-gradient-to-b from-background via-background to-primary/5">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 max-w-lg" dir="rtl">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="p-8">
                                <div className="text-center mb-8">
                                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-xl">
                                        <ClipboardList className="w-10 h-10 text-white" />
                                    </div>
                                    <h1 className="text-2xl font-black mb-2">{exam!.title}</h1>
                                    {exam!.description && (
                                        <p className="text-muted-foreground mb-4">{exam!.description}</p>
                                    )}
                                    <div className="flex items-center justify-center gap-3 flex-wrap">
                                        <Badge variant="outline" className="gap-1">
                                            {catLabel.icon} {catLabel.label}
                                        </Badge>
                                        <Badge variant="outline" className="gap-1">
                                            <BookOpen className="w-3 h-3" />
                                            {exam!.topic?.title || "—"}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Exam Info */}
                                <div className="bg-muted/30 rounded-xl p-5 space-y-4 mb-8 border">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <BookOpen className="w-4 h-4" />
                                            عدد الأسئلة
                                        </span>
                                        <span className="font-bold">{questions.length} سؤال</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <Timer className="w-4 h-4" />
                                            المدة المسموحة
                                        </span>
                                        <span className="font-bold">{exam!.duration_minutes || 60} دقيقة</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <Clock className="w-4 h-4" />
                                            ينتهي الاختبار
                                        </span>
                                        <span className="font-bold">
                                            {new Date(exam!.end_time).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>
                                    {exam?.host && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-2 text-muted-foreground">
                                                <GraduationCap className="w-4 h-4" />
                                                المعلم
                                            </span>
                                            <span className="font-bold">{(exam.host as any)?.name || "—"}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Warning */}
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="text-sm text-amber-800">
                                        <p className="font-bold mb-1">تنبيه مهم</p>
                                        <p>بمجرد البدء لا يمكنك إيقاف الاختبار. تأكد من جاهزيتك قبل الضغط على "ابدأ الاختبار".</p>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-14 text-lg gap-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg"
                                    onClick={handleStartExam}
                                >
                                    <ClipboardList className="w-5 h-5" />
                                    ابدأ الاختبار
                                </Button>
                            </Card>
                        </motion.div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // ======================================================================
    // TAKING EXAM PHASE
    // ======================================================================
    return (
        <div className="min-h-screen font-cairo bg-gradient-to-b from-slate-50 to-white" dir="rtl">
            {/* Top Bar */}
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b shadow-sm">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                                <ClipboardList className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">{exam?.title}</p>
                                <p className="text-[10px] text-muted-foreground">السؤال {currentQuestionIndex + 1} من {questions.length}</p>
                            </div>
                        </div>

                        {/* Timer */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-black text-lg ${
                            timeRemaining < 60 ? "bg-red-100 text-red-700 animate-pulse" :
                            timeRemaining < 300 ? "bg-amber-100 text-amber-700" :
                            "bg-emerald-100 text-emerald-700"
                        }`}>
                            <Timer className="w-4 h-4" />
                            {formatTime(timeRemaining)}
                        </div>
                    </div>
                    <Progress value={progress} className="h-1.5 mt-2" />
                </div>
            </div>

            {/* Question Content */}
            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <AnimatePresence mode="wait">
                    {currentQuestion && (
                        <motion.div
                            key={currentQuestionIndex}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="space-y-6"
                        >
                            {/* Question Card */}
                            <Card className="p-6 border-2">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shrink-0">
                                        {currentQuestionIndex + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-lg font-bold leading-relaxed">{currentQuestion.question}</p>
                                        <QuestionAttachmentDisplay
                                            imageUrl={currentQuestion.imageUrl}
                                            videoUrl={currentQuestion.videoUrl}
                                            audioUrl={currentQuestion.audioUrl}
                                            className="mt-4 mb-0"
                                        />
                                    </div>
                                </div>

                                {/* Options */}
                                {(currentQuestion.type === "multiple_choice" || currentQuestion.type === "true_false" || currentQuestion.type === "shooting") && currentQuestion.options && (
                                    <div className="space-y-3">
                                        {currentQuestion.options.map((option: string, i: number) => {
                                            const isSelected = answers[currentQuestionIndex] === i;
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => handleAnswer(currentQuestionIndex, i)}
                                                    className={`w-full text-start p-4 rounded-xl border-2 transition-all ${
                                                        isSelected
                                                            ? "border-indigo-500 bg-indigo-50 shadow-md"
                                                            : "border-border hover:border-indigo-300 hover:bg-indigo-50/50"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                                                            isSelected ? "bg-indigo-500 text-white" : "bg-muted"
                                                        }`}>
                                                            {formatOptionLabel(i, language)}
                                                        </div>
                                                        <span className="font-medium">{option}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Order Questions */}
                                {currentQuestion.type === "order_questions" && currentQuestion.orderItems && (
                                    <div className="space-y-3">
                                        <p className="text-sm text-muted-foreground mb-2">اختر الترتيب الصحيح بالنقر على العناصر بالتسلسل:</p>
                                        <div className="space-y-2">
                                            {currentQuestion.orderItems.map((item: string, i: number) => {
                                                const currentOrder = answers[currentQuestionIndex] || [];
                                                const orderIndex = currentOrder.indexOf(item);
                                                const isSelected = orderIndex !== -1;
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            const current = answers[currentQuestionIndex] || [];
                                                            if (isSelected) {
                                                                handleAnswer(currentQuestionIndex, current.filter((x: string) => x !== item));
                                                            } else {
                                                                handleAnswer(currentQuestionIndex, [...current, item]);
                                                            }
                                                        }}
                                                        className={`w-full text-start p-3 rounded-xl border-2 transition-all ${
                                                            isSelected ? "border-indigo-500 bg-indigo-50" : "border-border hover:border-indigo-300"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {isSelected && (
                                                                <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-black">
                                                                    {orderIndex + 1}
                                                                </div>
                                                            )}
                                                            <span className="font-medium">{item}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* QA / Know Don't Know */}
                                {(currentQuestion.type === "qa" || currentQuestion.type === "know_dont_know") && (
                                    <div className="space-y-3">
                                        <textarea
                                            className="w-full p-4 rounded-xl border-2 border-border focus:border-indigo-500 focus:ring-0 min-h-[120px] resize-none transition-colors"
                                            placeholder="اكتب إجابتك هنا..."
                                            value={answers[currentQuestionIndex] || ""}
                                            onChange={(e) => handleAnswer(currentQuestionIndex, e.target.value)}
                                        />
                                    </div>
                                )}
                            </Card>

                            {/* Navigation */}
                            <div className="flex items-center justify-between gap-4">
                                <Button
                                    variant="outline"
                                    className="gap-2 h-12"
                                    disabled={currentQuestionIndex === 0}
                                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                                >
                                    <ArrowBack className="w-4 h-4" />
                                    السابق
                                </Button>

                                {/* Question dots */}
                                <div className="flex items-center gap-1 flex-wrap justify-center">
                                    {questions.map((_: any, i: number) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentQuestionIndex(i)}
                                            className={`w-3 h-3 rounded-full transition-all ${
                                                i === currentQuestionIndex ? "bg-indigo-500 scale-125" :
                                                answers[i] !== undefined ? "bg-emerald-400" :
                                                "bg-muted"
                                            }`}
                                        />
                                    ))}
                                </div>

                                {currentQuestionIndex < questions.length - 1 ? (
                                    <Button
                                        className="gap-2 h-12 bg-gradient-to-r from-indigo-500 to-purple-600"
                                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                    >
                                        التالي
                                        <ArrowForward className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        className="gap-2 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        {isSubmitting ? "جاري التقديم..." : "تقديم الاختبار"}
                                    </Button>
                                )}
                            </div>

                            {/* Answered count */}
                            <div className="text-center text-sm text-muted-foreground">
                                أجبت على {Object.keys(answers).length} من {questions.length} سؤال
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default ExamPage;
