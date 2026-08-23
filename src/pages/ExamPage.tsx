import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ClipboardList, Clock, Timer, CheckCircle2, XCircle, AlertTriangle,
    ArrowLeft, ArrowRight, Loader2, Trophy, BookOpen, Lock,
    CalendarX, Send, GraduationCap, RotateCcw, FileQuestion
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useExamByPin, useSubmitExamResult, useExamSubmission, examCategoryLabels } from "@/hooks/useExams";
import { useUser, useStudentProfile } from "@/hooks/useDatabase";
import { useTranslation } from "@/contexts/LanguageContext";
import { formatOptionLabel } from "@/lib/formatOptionLabel";
import { QuestionAttachmentDisplay } from "@/components/QuestionAttachmentDisplay";
import {
    getExamAttemptDeadline,
    getExamDurationMinutes,
    getExamLiveStatus,
    getExamMaxAttempts,
    gradeExam,
    isExamAnswerProvided,
    shuffleWithSeed,
    type ExamAnswer,
} from "@/lib/examLogic";

type ExamPhase =
    | "loading"
    | "notfound"
    | "login_required"
    | "wrong_grade"
    | "early"
    | "expired"
    | "empty"
    | "already_submitted"
    | "ready"
    | "taking"
    | "submitted";

/** A partially finished attempt, mirrored to localStorage so a reload cannot reset the clock. */
type StoredAttempt = {
    startedAt: number;
    answers: Record<number, ExamAnswer>;
    questionTimes: Record<number, number>;
    currentQuestionIndex: number;
};

const attemptStorageKey = (examId: string, userId: string) => `exam_attempt:${examId}:${userId}`;

const readStoredAttempt = (key: string): StoredAttempt | null => {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.startedAt !== "number") return null;
        return {
            startedAt: parsed.startedAt,
            answers: parsed.answers || {},
            questionTimes: parsed.questionTimes || {},
            currentQuestionIndex: Number(parsed.currentQuestionIndex) || 0,
        };
    } catch {
        return null;
    }
};

const writeStoredAttempt = (key: string, attempt: StoredAttempt) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(attempt));
    } catch {
        /* storage unavailable — the attempt simply is not resumable */
    }
};

const clearStoredAttempt = (key: string) => {
    try {
        window.localStorage.removeItem(key);
    } catch {
        /* ignore */
    }
};

// ============================================================================
// Exam Page - Student takes exam via link only
// ============================================================================
const ExamPage = () => {
    const { pin } = useParams<{ pin: string }>();
    const navigate = useNavigate();
    const { dir, language } = useTranslation();
    const locale = language === "ar" ? "ar-SA" : "en-US";
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

    const [phase, setPhase] = useState<ExamPhase>("loading");
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, ExamAnswer>>({});
    const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
    const [startedAt, setStartedAt] = useState<number | null>(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [confirmSubmit, setConfirmSubmit] = useState(false);

    /** Once an attempt is running, external refetches must not rewind the phase. */
    const attemptLockedRef = useRef(false);
    const submittedRef = useRef(false);
    const questionEnteredAtRef = useRef<number>(Date.now());

    const storageKey = exam?.id && currentUser?.id ? attemptStorageKey(exam.id, currentUser.id) : null;

    /**
     * The paper as this student sees it. Shuffling is seeded on exam + student so
     * each student gets their own order and keeps it across reloads — answers are
     * stored by position, so a changing order would corrupt them.
     */
    const questions = useMemo(() => {
        const base = exam?.challengeItems || [];
        if (!exam?.shuffle_questions || !currentUser?.id) return base;
        return shuffleWithSeed(base, `${exam.id}:${currentUser.id}`);
    }, [exam, currentUser?.id]);

    const maxAttempts = getExamMaxAttempts(exam);
    const attemptsUsed = Number(existingSubmission?.attempts_used ?? (existingSubmission ? 1 : 0));
    const canRetake = !!existingSubmission && attemptsUsed < maxAttempts;
    const showResults = exam?.show_results !== false;

    const deadline = useMemo(
        () => (startedAt && exam ? getExamAttemptDeadline(exam, startedAt) : null),
        [exam, startedAt]
    );

    /** Fold the time spent on the question being left into the running totals. */
    const commitQuestionTime = useCallback((index: number) => {
        const spent = (Date.now() - questionEnteredAtRef.current) / 1000;
        questionEnteredAtRef.current = Date.now();
        setQuestionTimes(prev => ({ ...prev, [index]: (prev[index] || 0) + Math.max(0, spent) }));
    }, []);

    const handleSubmit = useCallback(
        async (options?: { answers?: Record<number, ExamAnswer>; questionTimes?: Record<number, number>; startedAt?: number }) => {
            if (submittedRef.current || !exam || !currentUser) return;
            submittedRef.current = true;
            setIsSubmitting(true);
            setSubmitError(null);

            const finalAnswers = options?.answers ?? answers;
            const finalTimes = options?.questionTimes ?? questionTimes;
            const attemptStart = options?.startedAt ?? startedAt ?? Date.now();

            try {
                const grade = gradeExam(questions, finalAnswers, finalTimes);
                const timeTaken = Math.max(0, (Date.now() - attemptStart) / 1000);

                const resultData = await submitResultMutation.mutateAsync({
                    examId: exam.id,
                    userId: currentUser.id,
                    studentName: currentUser.name,
                    totalQuestions: grade.totalQuestions,
                    correctAnswers: grade.correctAnswers,
                    wrongAnswers: grade.wrongAnswers,
                    score: grade.score,
                    maxScore: grade.maxScore,
                    percentage: grade.percentage,
                    timeTaken,
                    questionResults: grade.questionResults,
                    startedAt: new Date(attemptStart).toISOString(),
                });

                if (storageKey) clearStoredAttempt(storageKey);
                setResult({ ...resultData, ...grade, timeTaken });
                attemptLockedRef.current = true;
                setPhase("submitted");
            } catch (error: any) {
                // Let the student try again rather than losing the paper on a
                // network blip; a closed window / spent attempt is terminal.
                const terminal = error?.name === "ExamSubmissionError";
                submittedRef.current = terminal;
                setSubmitError(error?.message || "تعذر تسليم الاختبار، تحقق من اتصالك وحاول مرة أخرى");
                if (terminal && storageKey) clearStoredAttempt(storageKey);
            } finally {
                setIsSubmitting(false);
            }
        },
        [exam, currentUser, answers, questionTimes, startedAt, questions, submitResultMutation, storageKey]
    );

    /** Timer callbacks fire from an interval — always call through the latest closure. */
    const submitRef = useRef(handleSubmit);
    useEffect(() => {
        submitRef.current = handleSubmit;
    }, [handleSubmit]);

    // ------------------------------------------------------------------
    // Phase resolution
    // ------------------------------------------------------------------
    useEffect(() => {
        // A running or finished attempt owns the phase; background refetches of
        // the exam/user queries must never knock the student out of it.
        if (attemptLockedRef.current) return;

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

        // Class targeting: an exam bound to a grade is only for that grade's
        // students. No student profile at all means no way to verify it.
        if (exam.grade_id && studentProfile?.grade_id !== exam.grade_id) {
            setPhase("wrong_grade");
            return;
        }

        if (existingSubmission && !canRetake) {
            setResult(existingSubmission);
            setPhase("already_submitted");
            return;
        }

        const liveStatus = getExamLiveStatus(exam);
        if (liveStatus === "SCHEDULED" || liveStatus === "DRAFT") {
            setPhase(liveStatus === "DRAFT" ? "notfound" : "early");
            return;
        }
        if (liveStatus === "ENDED") {
            if (existingSubmission) {
                setResult(existingSubmission);
                setPhase("already_submitted");
                return;
            }
            setPhase("expired");
            return;
        }

        if (questions.length === 0) {
            setPhase("empty");
            return;
        }

        // Resume an attempt that was already in progress before a reload.
        const stored = storageKey ? readStoredAttempt(storageKey) : null;
        if (stored) {
            const storedDeadline = getExamAttemptDeadline(exam, stored.startedAt);
            if (storedDeadline && Date.now() >= storedDeadline) {
                // The clock ran out while away — hand in what was answered.
                attemptLockedRef.current = true;
                setPhase("taking");
                setStartedAt(stored.startedAt);
                setAnswers(stored.answers);
                setQuestionTimes(stored.questionTimes);
                void submitRef.current({
                    answers: stored.answers,
                    questionTimes: stored.questionTimes,
                    startedAt: stored.startedAt,
                });
                return;
            }

            attemptLockedRef.current = true;
            setStartedAt(stored.startedAt);
            setAnswers(stored.answers);
            setQuestionTimes(stored.questionTimes);
            setCurrentQuestionIndex(Math.min(stored.currentQuestionIndex, questions.length - 1));
            questionEnteredAtRef.current = Date.now();
            setPhase("taking");
            return;
        }

        setPhase(existingSubmission ? "already_submitted" : "ready");
    }, [
        exam, currentUser, existingSubmission, studentProfile, canRetake, questions.length,
        storageKey, loadingExam, loadingUser, loadingSubmission, loadingStudent,
    ]);

    // ------------------------------------------------------------------
    // Countdown — driven by an absolute deadline so tab throttling and reloads
    // cannot buy the student extra time.
    // ------------------------------------------------------------------
    useEffect(() => {
        if (phase !== "taking" || !deadline) return;

        const tick = () => {
            const remaining = deadline - Date.now();
            setTimeRemaining(Math.max(0, Math.ceil(remaining / 1000)));
            if (remaining <= 0) void submitRef.current();
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [phase, deadline]);

    // Mirror progress to localStorage on every change.
    useEffect(() => {
        if (phase !== "taking" || !storageKey || !startedAt) return;
        writeStoredAttempt(storageKey, { startedAt, answers, questionTimes, currentQuestionIndex });
    }, [phase, storageKey, startedAt, answers, questionTimes, currentQuestionIndex]);

    // Warn before a reload/close so the attempt is never abandoned by accident.
    useEffect(() => {
        if (phase !== "taking") return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [phase]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleStartExam = () => {
        if (!exam || getExamLiveStatus(exam) !== "ACTIVE" || questions.length === 0) return;
        const now = Date.now();
        submittedRef.current = false;
        attemptLockedRef.current = true;
        questionEnteredAtRef.current = now;
        setStartedAt(now);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setQuestionTimes({});
        setSubmitError(null);
        setPhase("taking");
    };

    const handleAnswer = (questionIndex: number, answer: ExamAnswer) => {
        setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    };

    const goToQuestion = (index: number) => {
        if (index < 0 || index >= questions.length || index === currentQuestionIndex) return;
        commitQuestionTime(currentQuestionIndex);
        setCurrentQuestionIndex(index);
    };

    const handleManualSubmit = () => {
        commitQuestionTime(currentQuestionIndex);
        void handleSubmit();
    };

    const handleRetake = () => {
        setResult(null);
        submittedRef.current = false;
        // Stay locked: the student explicitly chose to retake, so the phase
        // resolver must not push them back to the previous result.
        attemptLockedRef.current = true;
        setSubmitError(null);
        setPhase("ready");
    };

    const unansweredCount = useMemo(
        () => questions.filter((q: any, i: number) => !isExamAnswerProvided(q, answers[i])).length,
        [questions, answers]
    );

    const currentQuestion = questions[currentQuestionIndex];
    const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

    /**
     * Ordering questions store their items already in the correct sequence, so
     * they must never be rendered in that sequence. Seeded on question + student
     * so the list does not reshuffle on every render.
     */
    const orderChoices = useMemo(() => {
        const items = (currentQuestion?.orderItems || []).filter((i: string) => String(i ?? "").trim());
        if (items.length === 0) return [];
        return shuffleWithSeed(items, `${currentQuestion?.id || currentQuestionIndex}:${currentUser?.id || ""}`);
    }, [currentQuestion, currentQuestionIndex, currentUser?.id]);

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
                                    {startDate.toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                                </p>
                                <p className="text-2xl font-mono font-black text-blue-800 mt-1">
                                    {startDate.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
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

    if (phase === "empty") {
        return (
            <div className="min-h-screen font-cairo bg-gradient-to-b from-background via-background to-primary/5">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 max-w-md">
                        <Card className="p-8 text-center">
                            <FileQuestion className="w-16 h-16 mx-auto mb-4 text-amber-500" />
                            <h1 className="text-2xl font-black mb-2">الاختبار غير جاهز بعد</h1>
                            <p className="text-muted-foreground mb-6">لم يقم المعلم بإضافة أسئلة لهذا الاختبار حتى الآن. تواصل مع معلمك أو عد لاحقاً.</p>
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
        const percentage = Number(r?.percentage ?? 0);
        const isPass = percentage >= 50;
        const timeTakenSeconds = Math.round(Number(r?.time_taken ?? r?.timeTaken ?? 0));
        const attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);

        return (
            <div className="min-h-screen font-cairo bg-gradient-to-b from-background via-background to-primary/5">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 max-w-lg" dir={dir}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                            <Card className="p-8 text-center overflow-hidden">
                                {/* Result Header */}
                                <div className={`-mx-8 -mt-8 mb-8 p-8 ${!showResults ? "bg-gradient-to-br from-indigo-500 to-purple-600" : isPass ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-red-500 to-rose-600"} text-white relative overflow-hidden`}>
                                    <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
                                    <div className="relative z-10">
                                        {!showResults ? (
                                            <CheckCircle2 className="w-16 h-16 mx-auto mb-3 drop-shadow-lg" />
                                        ) : isPass ? (
                                            <Trophy className="w-16 h-16 mx-auto mb-3 drop-shadow-lg" />
                                        ) : (
                                            <GraduationCap className="w-16 h-16 mx-auto mb-3 drop-shadow-lg" />
                                        )}
                                        <h1 className="text-3xl font-black mb-2">
                                            {!showResults
                                                ? "تم استلام إجاباتك"
                                                : phase === "already_submitted"
                                                    ? "تم تقديم الاختبار مسبقاً"
                                                    : isPass ? "أحسنت! 🎉" : "حاول مرة أخرى"}
                                        </h1>
                                        <p className="text-white/80">
                                            {exam?.title}
                                        </p>
                                    </div>
                                </div>

                                {showResults ? (
                                    <>
                                        {/* Score */}
                                        <div className="mb-8">
                                            <div className={`text-6xl font-black mb-2 ${isPass ? "text-emerald-600" : "text-red-600"}`}>
                                                {Math.round(percentage)}%
                                            </div>
                                            <div className="flex items-center justify-center gap-4 text-sm">
                                                <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 font-bold">
                                                    <CheckCircle2 className="w-4 h-4" /> {r?.correct_answers ?? r?.correctAnswers ?? 0} صحيح
                                                </span>
                                                <span className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 font-bold">
                                                    <XCircle className="w-4 h-4" /> {r?.wrong_answers ?? r?.wrongAnswers ?? 0} خطأ
                                                </span>
                                            </div>
                                        </div>

                                        {/* Details */}
                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <div className="bg-muted/50 p-4 rounded-xl">
                                                <p className="text-sm text-muted-foreground">الدرجة</p>
                                                <p className="text-xl font-black">{r?.score ?? 0} / {r?.max_score ?? r?.maxScore ?? 0}</p>
                                            </div>
                                            <div className="bg-muted/50 p-4 rounded-xl">
                                                <p className="text-sm text-muted-foreground">الوقت</p>
                                                <p className="text-xl font-black">{formatTime(timeTakenSeconds)}</p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground mb-8">
                                        سيقوم معلمك بمراجعة إجاباتك، وستظهر النتيجة عند اعتمادها.
                                    </p>
                                )}

                                {canRetake && getExamLiveStatus(exam) === "ACTIVE" && (
                                    <Button onClick={handleRetake} variant="outline" className="gap-2 w-full h-12 mb-3 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                                        <RotateCcw className="w-4 h-4" />
                                        إعادة المحاولة (متبقٍ {attemptsLeft} من {maxAttempts})
                                    </Button>
                                )}

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
        // What the student really gets: the allowed duration, capped by whatever
        // is left of the exam window.
        const effectiveSeconds = Math.max(
            0,
            Math.floor(((getExamAttemptDeadline(exam, Date.now()) ?? Date.now()) - Date.now()) / 1000)
        );
        return (
            <div className="min-h-screen font-cairo bg-gradient-to-b from-background via-background to-primary/5">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 max-w-lg" dir={dir}>
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
                                        <span className="font-bold">{getExamDurationMinutes(exam)} دقيقة</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <Clock className="w-4 h-4" />
                                            ينتهي الاختبار
                                        </span>
                                        <span className="font-bold">
                                            {new Date(exam!.end_time).toLocaleString(locale, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
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
                                        <p>بمجرد البدء يعمل العدّاد ولا يتوقف حتى لو أغلقت الصفحة. أمامك {formatTime(effectiveSeconds)} فعلياً لإنهاء الاختبار.</p>
                                        {maxAttempts > 1 && (
                                            <p className="mt-1">عدد المحاولات المسموحة: {maxAttempts} (استخدمت {attemptsUsed}).</p>
                                        )}
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
        <div className="min-h-screen font-cairo bg-gradient-to-b from-slate-50 to-white" dir={dir}>
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
                                            {orderChoices.map((item: string, i: number) => {
                                                const currentOrder = (answers[currentQuestionIndex] as string[]) || [];
                                                const orderIndex = currentOrder.indexOf(item);
                                                const isSelected = orderIndex !== -1;
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            const current = (answers[currentQuestionIndex] as string[]) || [];
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
                                    onClick={() => goToQuestion(currentQuestionIndex - 1)}
                                >
                                    <ArrowBack className="w-4 h-4" />
                                    السابق
                                </Button>

                                {/* Question dots */}
                                <div className="flex items-center gap-1 flex-wrap justify-center">
                                    {questions.map((_: any, i: number) => (
                                        <button
                                            key={i}
                                            onClick={() => goToQuestion(i)}
                                            className={`w-3 h-3 rounded-full transition-all ${
                                                i === currentQuestionIndex ? "bg-indigo-500 scale-125" :
                                                isExamAnswerProvided(questions[i], answers[i]) ? "bg-emerald-400" :
                                                "bg-muted"
                                            }`}
                                        />
                                    ))}
                                </div>

                                {currentQuestionIndex < questions.length - 1 ? (
                                    <Button
                                        className="gap-2 h-12 bg-gradient-to-r from-indigo-500 to-purple-600"
                                        onClick={() => goToQuestion(currentQuestionIndex + 1)}
                                    >
                                        التالي
                                        <ArrowForward className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        className="gap-2 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg"
                                        onClick={() => setConfirmSubmit(true)}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        {isSubmitting ? "جاري التقديم..." : "تقديم الاختبار"}
                                    </Button>
                                )}
                            </div>

                            {/* Answered count */}
                            <div className="text-center text-sm text-muted-foreground">
                                أجبت على {questions.length - unansweredCount} من {questions.length} سؤال
                            </div>

                            {submitError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <div className="flex-1 text-sm text-red-800">
                                        <p className="font-bold mb-1">تعذر التسليم</p>
                                        <p>{submitError}</p>
                                    </div>
                                    {!submittedRef.current && (
                                        <Button size="sm" variant="outline" onClick={handleManualSubmit} disabled={isSubmitting}>
                                            إعادة المحاولة
                                        </Button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Submit confirmation — the last chance to go back for skipped questions */}
                {confirmSubmit && (
                    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmSubmit(false)}>
                        <Card className="p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
                            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
                            <h2 className="text-xl font-black mb-2">تأكيد التسليم</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                {unansweredCount > 0
                                    ? `لديك ${unansweredCount} سؤال بدون إجابة. لن تتمكن من التعديل بعد التسليم.`
                                    : "لن تتمكن من التعديل بعد التسليم."}
                            </p>
                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1 h-11" onClick={() => setConfirmSubmit(false)}>
                                    مراجعة الإجابات
                                </Button>
                                <Button
                                    className="flex-1 h-11 bg-gradient-to-r from-emerald-500 to-teal-600"
                                    disabled={isSubmitting}
                                    onClick={() => {
                                        setConfirmSubmit(false);
                                        handleManualSubmit();
                                    }}
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "تسليم"}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ExamPage;
