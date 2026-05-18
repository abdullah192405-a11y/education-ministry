import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    ChevronLeft, Trophy, Zap, Clock, Target,
    CheckCircle2, XCircle, RotateCcw, Home, Share2, Check,
    ArrowLeft, ArrowRight, GripVertical, Sparkles, ArrowUp, ArrowDown,
    Volume2, VolumeX, Music, Trash2
} from "lucide-react";
import {
    useTopic,
    useContentVisibilityFocus,
    useUser,
    useStudentProfile,
    useCreateChallengeSession,
    useSaveChallengeResult,
    useUpdateStudentProfile,
    useSaveTopicActivity,
    useUpsertSubjectProgress,
    useStudentSubjectProgress,
    useStudentTopicActivities,
    useAwardBadges,
    useSaveAnswers,
    useChallengeSession,
    useUpdatePlayerSession
} from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import {
    getWheelSubQuestion,
    getLevelFromScore,
    evaluateSessionBadges,
    type ChallengeBadgeContext,
    type ChallengeQuestion,
    type SinglePlayerResult,
    type Badge
} from "@/data/challengeTypes";
import { useSound } from "@/hooks/useSound";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { gradeMatchesContentFocus, routeGradeMatchesTopicGrade } from "@/lib/contentVisibility";
import { sessionHasScheduledFields } from "@/lib/teacherScheduledChallenge";
import { useHideFloatingChromeWhileActive } from "@/contexts/FloatingChromeContext";
import {
    buildChallengeShareMessage,
    buildSingleChallengeShareUrl,
    openWhatsAppShare,
} from "@/lib/challengeShareMessage";

type GameState = "intro" | "playing" | "results";

/** Minimum score (%) to unlock WhatsApp result sharing; below this, offer retry only. */
const SHARE_RESULT_THRESHOLD = 60;

const SingleChallenge = () => {
    const { category, gradeId, subjectId, topicId, pin } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const joinDisplayName = searchParams.get("name");
    const scheduledFromJoinUrl = searchParams.get("scheduled") === "1";
    const playerSessionIdFromJoin = searchParams.get("ps")?.trim() || "";

    const { toast } = useToast();
    const { data: topic, isLoading } = useTopic(topicId || "");
    const content = topic;

    const collectParticipantData = useMemo(
        () => Boolean((topic as any)?.collect_single_challenge_participant_data),
        [topic]
    );
    const teacherHostUserId = useMemo(() => {
        const id = (topic as any)?._TeacherTopics?.[0]?.teacher_profiles?.user_id;
        return typeof id === "string" && id.length > 0 ? id : undefined;
    }, [topic]);
    const { focus } = useContentVisibilityFocus();

    const pinLooksLikeSession = typeof pin === "string" && /^\d{6}$/.test(pin);

    const challengeShareUrl = useMemo(() => {
        if (!gradeId || !subjectId || !topicId || !category) return undefined;
        return buildSingleChallengeShareUrl({ gradeId, subjectId, topicId, category });
    }, [gradeId, subjectId, topicId, category]);
    const { data: sessionForVisibility, isLoading: sessionForVisibilityLoading } = useChallengeSession(
        pinLooksLikeSession ? (pin || "") : ""
    );

    const isScheduledLikeSession =
        scheduledFromJoinUrl ||
        (pinLooksLikeSession && sessionHasScheduledFields(sessionForVisibility));

    // Current user & student profile for saving results
    const { data: currentUser } = useUser();
    const { data: studentProfile } = useStudentProfile(currentUser?.id || "");

    // Mutation hooks for saving results
    const createSessionMutation = useCreateChallengeSession();
    const saveResultMutation = useSaveChallengeResult();
    const updateStudentProfileMutation = useUpdateStudentProfile();
    const saveTopicActivityMutation = useSaveTopicActivity();
    const upsertSubjectProgressMutation = useUpsertSubjectProgress();
    const { data: subjectProgress } = useStudentSubjectProgress(studentProfile?.id || "");
    const awardBadgesMutation = useAwardBadges();
    const saveAnswersMutation = useSaveAnswers();
    const updatePlayerSessionMutation = useUpdatePlayerSession();
    const [resultsSaved, setResultsSaved] = useState(false);
    const [guestDisplayName, setGuestDisplayName] = useState("");

    useEffect(() => {
        const n = joinDisplayName?.trim();
        if (n) setGuestDisplayName(n);
    }, [joinDisplayName]);

    const [gameState, setGameState] = useState<GameState>("intro");
    useHideFloatingChromeWhileActive(gameState !== "intro");
    const [questions, setQuestions] = useState<ChallengeQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [longestStreak, setLongestStreak] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [totalTime, setTotalTime] = useState(0);
    const [questionStartTime, setQuestionStartTime] = useState(0);
    const [questionResults, setQuestionResults] = useState<SinglePlayerResult["questionResults"]>([]);

    // For ordering questions
    const [orderItems, setOrderItems] = useState<string[]>([]);

    // For matching questions
    const [matchedPairs, setMatchedPairs] = useState<{ leftIndex: number; rightIndex: number }[]>([]);
    const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
    const [shuffledRight, setShuffledRight] = useState<{ text: string; originalIndex: number }[]>([]);

    // For wheel spin
    const [wheelRotation, setWheelRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [wheelResult, setWheelResult] = useState<number | null>(null);
    const [wheelSubQuestion, setWheelSubQuestion] = useState<any>(null);
    const [wheelPoints, setWheelPoints] = useState(0);

    // For know/don't know
    const [userAnswer, setUserAnswer] = useState("");
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

    // Music control
    const [musicEnabled, setMusicEnabled] = useState(true);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [earnedSessionBadges, setEarnedSessionBadges] = useState<Badge[]>([]);

    const soundOverrides = useMemo(() => ({
        correct: content?.correct_sound_url?.trim() || undefined,
        wrong: content?.wrong_sound_url?.trim() || undefined,
        background: content?.answering_background_sound_url?.trim() || undefined,
    }), [content?.correct_sound_url, content?.wrong_sound_url, content?.answering_background_sound_url]);

    // Initialize sound system
    const { play, stop } = useSound(true, soundOverrides);

    // Initialize game
    // Initialize game
    useEffect(() => {
        if (content && category) {
            let loadedQuestions: ChallengeQuestion[] = [];

            // Load challenge questions from database
            if (content.challengeItems && content.challengeItems.length > 0) {
                if (category === 'activities') {
                    loadedQuestions = content.challengeItems.filter(q => ["multiple_choice", "true_false", "qa", "know_dont_know", "order_questions"].includes(q.type));
                } else if (category === 'games') {
                    loadedQuestions = content.challengeItems.filter(q => ["matching", "shooting", "wheel_spin", "puzzle"].includes(q.type));
                } else { // mixed
                    loadedQuestions = content.challengeItems;
                }
            }

            setQuestions(loadedQuestions);
        }
    }, [content, category]);

    // Timer
    useEffect(() => {
        if (gameState === "playing" && timeLeft > 0 && !showResult && !isSpinning) {
            // Play timer tick sound for last 5 seconds
            if (timeLeft <= 5) {
                play('countdown');
            }
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && gameState === "playing" && !showResult && !isSpinning) {
            handleTimeout();
        }
    }, [timeLeft, gameState, showResult, isSpinning, play]);

    const currentQuestion = questions[currentIndex];

    useEffect(() => {
        if (gameState !== "playing") return;
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, [currentIndex, gameState]);

    useEffect(() => {
        if (gameState === "playing" && musicEnabled) {
            play("background");
            return;
        }
        stop("background");
    }, [gameState, musicEnabled, play, stop]);

    const handleStartGame = () => {
        const hasFullProfile = !!currentUser?.id && !!studentProfile?.id;
        const needsGuestIdentity =
            collectParticipantData && !hasFullProfile;
        if (needsGuestIdentity) {
            if (!teacherHostUserId) {
                toast({
                    variant: "destructive",
                    title: "تعذّر المتابعة",
                    description: "لا يمكن ربط هذا الدرس بحساب المعلّم لتسجيل البيانات. تواصل مع الدعم أو جرّب لاحقاً.",
                });
                return;
            }
            if (!guestDisplayName.trim()) {
                toast({
                    variant: "destructive",
                    title: "الاسم مطلوب",
                    description: "أدخل اسمك كما طلب المعلّم قبل بدء التحدي.",
                });
                return;
            }
        }

        setGameState("playing");
        setCurrentIndex(0);
        setScore(0);
        setStreak(0);
        setLongestStreak(0);
        setQuestionResults([]);
        setTotalTime(0);
        setResultsSaved(false);
        setShowAnalysis(false);
        setEarnedSessionBadges([]);

        startQuestion(0);
    };

    const startQuestion = (index: number) => {
        const question = questions[index];
        setTimeLeft(question.timeLimit);
        setQuestionStartTime(Date.now());
        setSelectedAnswer(null);
        setShowResult(false);
        setWheelResult(null);
        setWheelSubQuestion(null);
        setWheelPoints(0);
        setIsSpinning(false);
        setUserAnswer("");
        setShowCorrectAnswer(false);

        // Ensure background music is playing if it was stopped/interrupted (optional, but good for robustness)
        // play('background'); // Actually, let's just let it loop from handleStartGame

        // Reset question-specific states
        if (question.type === "order_questions" && question.orderItems) {
            // Shuffle the order items
            const shuffled = [...question.orderItems].sort(() => Math.random() - 0.5);
            setOrderItems(shuffled);
        }
        if (question.type === "matching" && question.pairs) {
            // Shuffle right side for matching
            const rightItems = question.pairs.map((p, i) => ({ text: p.right, originalIndex: i }));
            setShuffledRight(rightItems.sort(() => Math.random() - 0.5));
            setMatchedPairs([]);
            setSelectedLeft(null);
        }
    };

    const handleTimeout = () => {
        const timeTaken = currentQuestion.timeLimit;
        setTotalTime(prev => prev + timeTaken);
        setQuestionResults(prev => [...prev, {
            questionId: currentQuestion.id,
            questionText: currentQuestion.question,
            correct: false,
            timeTaken,
            pointsEarned: 0
        }]);
        setStreak(0);
        setShowResult(true);
        setSelectedAnswer(-1);

        // Play timeout sound (wrong)
        play('wrong');
    };

    const processAnswer = (isCorrect: boolean, timeTaken: number) => {
        let pointsEarned = 0;

        if (isCorrect) {
            const timeBonus = Math.max(0, Math.floor((timeLeft / currentQuestion.timeLimit) * 50));
            const streakBonus = streak >= 2 ? streak * 10 : 0;
            pointsEarned = currentQuestion.points + timeBonus + streakBonus;

            setScore(prev => prev + pointsEarned);
            setStreak(prev => {
                const newStreak = prev + 1;
                if (newStreak > longestStreak) setLongestStreak(newStreak);
                return newStreak;
            });
        } else {
            setStreak(0);
        }

        setQuestionResults(prev => [...prev, {
            questionId: currentQuestion.id,
            questionText: currentQuestion.question,
            correct: isCorrect,
            timeTaken,
            pointsEarned
        }]);
    };

    const handleAnswerSelect = (answer: number | string) => {
        if (showResult) return;

        const timeTaken = (Date.now() - questionStartTime) / 1000;
        setTotalTime(prev => prev + timeTaken);
        setSelectedAnswer(answer);
        setShowResult(true);

        const isCorrect = answer === currentQuestion.correctAnswer;

        // Play sound effect
        play(isCorrect ? 'correct' : 'wrong');

        processAnswer(isCorrect, timeTaken);
    };

    // Order questions handlers
    const moveItemUp = (index: number) => {
        if (index === 0 || showResult) return;
        const newItems = [...orderItems];
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
        setOrderItems(newItems);
    };

    const moveItemDown = (index: number) => {
        if (index === orderItems.length - 1 || showResult) return;
        const newItems = [...orderItems];
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        setOrderItems(newItems);
    };

    const handleOrderSubmit = () => {
        if (showResult) return;

        const timeTaken = (Date.now() - questionStartTime) / 1000;
        setTotalTime(prev => prev + timeTaken);
        setShowResult(true);

        // Check if order is correct
        const correctOrder = currentQuestion.orderItems || [];
        const isCorrect = orderItems.every((item, index) => item === correctOrder[index]);

        setSelectedAnswer(isCorrect ? "correct" : "wrong");
        play(isCorrect ? "correct" : "wrong");
        processAnswer(isCorrect, timeTaken);
    };

    // Matching game handlers
    const handleMatchingLeftSelect = (index: number) => {
        if (showResult) return;
        if (matchedPairs.some(p => p.leftIndex === index)) return;
        setSelectedLeft(index);
    };

    const handleMatchingRightSelect = (shuffledIndex: number) => {
        if (showResult || selectedLeft === null) return;

        const rightItem = shuffledRight[shuffledIndex];
        if (matchedPairs.some(p => p.rightIndex === rightItem.originalIndex)) return;

        // Check if it's a correct match
        if (selectedLeft === rightItem.originalIndex) {
            const newMatchedPairs = [...matchedPairs, { leftIndex: selectedLeft, rightIndex: rightItem.originalIndex }];
            setMatchedPairs(newMatchedPairs);

            // Check if all pairs are matched
            if (newMatchedPairs.length === currentQuestion.pairs?.length) {
                const timeTaken = (Date.now() - questionStartTime) / 1000;
                setTotalTime(prev => prev + timeTaken);
                setShowResult(true);
                setSelectedAnswer("correct");
                play("correct");
                processAnswer(true, timeTaken);
            }
        }
        setSelectedLeft(null);
    };

    // Wheel spin handlers
    const handleWheelSpin = () => {
        if (isSpinning || showResult) return;
        setIsSpinning(true);

        // Play wheel spin sound
        play('wheel_spin');

        const segments = currentQuestion.wheelSegments;
        const labels = segments?.map(s => s.label) || currentQuestion.options || [];

        if (labels.length === 0) return;

        const resultIndex = Math.floor(Math.random() * labels.length);
        const spins = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
        const segmentAngle = 360 / labels.length;
        const targetRotation = spins * 360 + (360 - resultIndex * segmentAngle - segmentAngle / 2);

        setWheelRotation(targetRotation);

        setTimeout(() => {
            setIsSpinning(false);
            setWheelResult(resultIndex);

            let pointsForQuestion = 100;
            let subQ: any = null;

            if (segments && segments[resultIndex]) {
                const segment = segments[resultIndex];
                pointsForQuestion = segment.points;

                // Construct sub-question from segment
                const segmentOptions = segment.options && segment.options.some(o => o && o.trim() !== "")
                    ? segment.options
                    : ["استمرار"];

                subQ = {
                    id: Date.now(),
                    question: segment.question,
                    correctAnswer: segment.correctAnswer ?? 0,
                    options: segmentOptions,
                    points: pointsForQuestion
                };
            } else {
                // Legacy Fallback
                const resultText = labels[resultIndex];
                const pointsMatch = resultText.match(/\+(\d+)/);
                if (pointsMatch) {
                    pointsForQuestion = parseInt(pointsMatch[1]);
                } else if (resultText.includes("سهل")) pointsForQuestion = 50;
                else if (resultText.includes("متوسط")) pointsForQuestion = 100;
                else if (resultText.includes("صعب")) pointsForQuestion = 200;
                else if (resultText.includes("أسطوري")) pointsForQuestion = 500;
                else if (resultText.includes("مكافأة")) pointsForQuestion = 300;

                subQ = getWheelSubQuestion(resultText);
            }

            setWheelPoints(pointsForQuestion);
            setWheelSubQuestion(subQ);
        }, 4000);
    };

    const handleWheelSubAnswer = (answerIdx: number) => {
        if (showResult || !wheelSubQuestion) return;

        const timeTaken = (Date.now() - questionStartTime) / 1000;
        setTotalTime(prev => prev + timeTaken);
        setSelectedAnswer(answerIdx);
        setShowResult(true);

        const isCorrect = answerIdx === wheelSubQuestion.correctAnswer;
        play(isCorrect ? "correct" : "wrong");

        let pointsEarned = 0;
        if (isCorrect) {
            const timeBonus = Math.max(0, Math.floor((timeLeft / currentQuestion.timeLimit) * 50));
            pointsEarned = wheelPoints + timeBonus;
            setScore(prev => prev + pointsEarned);
            setStreak(prev => {
                const newStreak = prev + 1;
                if (newStreak > longestStreak) setLongestStreak(newStreak);
                return newStreak;
            });
        } else {
            setStreak(0);
        }

        setQuestionResults(prev => [...prev, {
            questionId: currentQuestion.id,
            questionText: currentQuestion.question,
            correct: isCorrect,
            timeTaken,
            pointsEarned
        }]);
    };

    // Know/Don't Know handlers
    const handleKnowAnswer = (knows: boolean) => {
        if (showResult) return;

        const timeTaken = (Date.now() - questionStartTime) / 1000;
        setTotalTime(prev => prev + timeTaken);
        setSelectedAnswer(knows ? 0 : 1);
        setShowCorrectAnswer(true);

        if (knows) {
            // User says they know - they need to verify
            // Just show the answer and give points if correct
            setShowResult(true);
            play("correct");
            processAnswer(true, timeTaken);
        } else {
            // User says they don't know
            setShowResult(true);
            play("wrong");
            processAnswer(false, timeTaken);
        }
    };

    // Q&A handler
    const handleQASubmit = () => {
        if (showResult || !userAnswer.trim()) return;

        const timeTaken = (Date.now() - questionStartTime) / 1000;
        setTotalTime(prev => prev + timeTaken);
        setShowResult(true);

        const correct = currentQuestion.correctAnswer?.toString().toLowerCase().trim();
        const user = userAnswer.toLowerCase().trim();

        // Simple fuzzy match or inclusion
        const isCorrect = user === correct || (correct && user.includes(correct)) || (correct && correct.includes(user));

        setSelectedAnswer(isCorrect ? "correct" : "wrong");
        play(isCorrect ? "correct" : "wrong");
        processAnswer(isCorrect, timeTaken);
    };

    const handleShare = () => {
        const results = getResults();
        if (results.percentage < SHARE_RESULT_THRESHOLD) return;

        const shareText = buildChallengeShareMessage({
            topicTitle: topic?.title,
            challengeUrl: challengeShareUrl,
            results,
        });

        if (navigator.share) {
            navigator.share({
                title: "نتيجة التحدي",
                text: shareText,
                url: challengeShareUrl,
            }).catch(() => {
                navigator.clipboard.writeText(shareText);
                toast({
                    title: "تم نسخ الرابط",
                    description: "يمكنك الآن مشاركته مع أصدقائك",
                });
            });
        } else {
            navigator.clipboard.writeText(shareText);
            toast({
                title: "تم نسخ الرابط",
                description: "يمكنك الآن مشاركته مع أصدقائك",
            });
        }
    };

    const handleWhatsAppShare = () => {
        const results = getResults();
        if (results.percentage < SHARE_RESULT_THRESHOLD) return;

        const msg = buildChallengeShareMessage({
            topicTitle: topic?.title,
            challengeUrl: challengeShareUrl,
            results,
        });
        openWhatsAppShare(msg);
    };

    const handleNextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
            startQuestion(currentIndex + 1);
        } else {
            setGameState("results");
        }
    };

    // --- Save results to database when game ends ---
    useEffect(() => {
        if (gameState !== "results" || resultsSaved) return;
        if (!topicId || !content) return;
        /** لا نقرّ «من دون حفظ» قبل تحميل الجلسة عند وجود PIN — لنعرف إن كان المجدول ونستخدم ps */
        if (pinLooksLikeSession && sessionForVisibilityLoading) {
            return;
        }

        const saveResults = async () => {
            const results = getResults();

            if (results.totalQuestions === 0) {
                console.warn("No questions to save results for.");
                setResultsSaved(true);
                stop("background");
                play("achievement");
                return;
            }

            const hasFullProfile = !!currentUser?.id && !!studentProfile?.id;

            /** طلاب مجدولون دون حساب: نحفظ على player_sessions حتى تظهر النتيجة في لوحة المعلم */
            if (isScheduledLikeSession && playerSessionIdFromJoin && !hasFullProfile) {
                setResultsSaved(true);
                try {
                    await updatePlayerSessionMutation.mutateAsync({
                        id: playerSessionIdFromJoin,
                        updates: {
                            score: results.score,
                            correct_answers: results.correctAnswers,
                            wrong_answers: results.wrongAnswers,
                            streak: results.longestStreak,
                        },
                    });
                    stop("background");
                    play("achievement");
                    toast({
                        title: "تم تسجيل النتيجة",
                        description: "ستظهر للمعلّم في قسم النتائج المسجّلة.",
                    });
                } catch (error) {
                    console.error("[Save] Scheduled player_session update failed:", error);
                    stop("background");
                    play("achievement");
                    toast({
                        variant: "destructive",
                        title: "تنبيه",
                        description: "تعذّر حفظ النتيجة للمعلّم. حاول مرة أخرى.",
                    });
                }
                return;
            }

            /** زائر قدّم الاسم المطلوب — يُحفظ صف في challenge_results للمعلّم */
            if (
                !hasFullProfile &&
                collectParticipantData &&
                guestDisplayName.trim() &&
                teacherHostUserId
            ) {
                setResultsSaved(true);
                try {
                    const session = await createSessionMutation.mutateAsync({
                        topicId: topicId as string,
                        hostId: teacherHostUserId,
                        mode: "SINGLE",
                        category: (category || "mixed").toUpperCase(),
                    });

                    const savedResult = await saveResultMutation.mutateAsync({
                        sessionId: session.id,
                        userId: null,
                        participantDisplayName: guestDisplayName.trim(),
                        participantExtra: null,
                        totalQuestions: results.totalQuestions,
                        correctAnswers: results.correctAnswers,
                        wrongAnswers: results.wrongAnswers,
                        score: results.score,
                        maxScore: results.maxScore,
                        percentage: results.percentage,
                        timeTaken: results.timeTaken,
                        averageTimePerQuestion: results.averageTimePerQuestion,
                        longestStreak: results.longestStreak,
                        accuracy: results.accuracy,
                        level: results.level,
                        questionResults: results.questionResults,
                    });

                    const answersToSave = results.questionResults.map((qr: any, index: number) => ({
                        resultId: String(savedResult.id),
                        questionId: String(questions[index]?.id || qr.questionId),
                        userAnswer: qr.userAnswer ? String(qr.userAnswer) : null,
                        isCorrect: !!qr.correct,
                        timeTaken: Number(qr.timeTaken || 0),
                        pointsEarned: Number(qr.pointsEarned || 0),
                    }));

                    if (answersToSave.length > 0) {
                        await saveAnswersMutation.mutateAsync(answersToSave);
                    }

                    toast({
                        title: "تم حفظ النتيجة",
                        description: "ستظهر للمعلّم مع الاسم والبيانات التي أدخلتها.",
                    });
                } catch (error) {
                    console.error("[Save] Guest identified single challenge failed:", error);
                    setResultsSaved(false);
                    toast({
                        variant: "destructive",
                        title: "تعذّر الحفظ",
                        description: "تعذّر ربط النتيجة بحساب المعلّم. يمكنك المحاولة من جديد من صفحة النتائج إن وُجدت.",
                    });
                }

                stop("background");
                play("achievement");
                return;
            }

            if (!hasFullProfile) {
                // Guest/visitor flow: persist aggregated single-attempt stats so teacher report updates.
                try {
                    const { data: existingReport } = await supabase
                        .from("topic_content_reports")
                        .select("*")
                        .eq("topic_id", topicId)
                        .maybeSingle();

                    const prevSingleAttempts = Number(existingReport?.single_attempts || 0);
                    const prevTotalAttempts = Number(existingReport?.total_attempts || 0);
                    const prevUniqueParticipants = Number(existingReport?.unique_participants || 0);
                    const prevUniqueSingleParticipants = Number(existingReport?.unique_single_participants || 0);
                    const prevSingleAvg = Number(existingReport?.average_score_single || 0);
                    const prevOverallAvg = Number(existingReport?.average_score_overall || 0);
                    const prevHigh = Number(existingReport?.highest_score || 0);
                    const prevPassRate = Number(existingReport?.pass_rate || 0);

                    const nextSingleAttempts = prevSingleAttempts + 1;
                    const nextTotalAttempts = prevTotalAttempts + 1;
                    const nextUniqueSingleParticipants = prevUniqueSingleParticipants + 1;
                    const nextUniqueParticipants = prevUniqueParticipants + 1;
                    const nextSingleAvg = Math.round(((prevSingleAvg * prevSingleAttempts) + results.percentage) / Math.max(1, nextSingleAttempts));
                    const nextOverallAvg = Math.round(((prevOverallAvg * prevTotalAttempts) + results.percentage) / Math.max(1, nextTotalAttempts));
                    const nextHighest = Math.max(prevHigh, results.percentage);
                    // Approximate pass-rate update when only aggregate exists
                    const prevPassedApprox = Math.round((prevPassRate / 100) * prevTotalAttempts);
                    const nextPassed = prevPassedApprox + (results.percentage >= 70 ? 1 : 0);
                    const nextPassRate = Math.round((nextPassed / Math.max(1, nextTotalAttempts)) * 100);

                    const prevQuestionAnalytics = Array.isArray(existingReport?.question_analytics)
                        ? existingReport.question_analytics
                        : [];
                    const qaMap = new Map<string, {
                        questionId: string;
                        questionText: string;
                        attempts: number;
                        correct: number;
                        wrong: number;
                        accuracy: number;
                    }>();
                    prevQuestionAnalytics.forEach((q: any) => {
                        const qid = String(q?.questionId || q?.question_id || "");
                        if (!qid) return;
                        qaMap.set(qid, {
                            questionId: qid,
                            questionText: q?.questionText || q?.question_text || `سؤال ${qid}`,
                            attempts: Number(q?.attempts || 0),
                            correct: Number(q?.correct || 0),
                            wrong: Number(q?.wrong || 0),
                            accuracy: Number(q?.accuracy || 0),
                        });
                    });
                    results.questionResults.forEach((qr: any, idx: number) => {
                        const qid = String(qr?.questionId || questions[idx]?.id || idx);
                        const existingQ = qaMap.get(qid) || {
                            questionId: qid,
                            questionText: questions[idx]?.question || `سؤال ${idx + 1}`,
                            attempts: 0,
                            correct: 0,
                            wrong: 0,
                            accuracy: 0,
                        };
                        existingQ.attempts += 1;
                        if (qr?.correct) existingQ.correct += 1;
                        else existingQ.wrong += 1;
                        existingQ.accuracy = existingQ.attempts > 0
                            ? Math.round((existingQ.correct / existingQ.attempts) * 100)
                            : 0;
                        qaMap.set(qid, existingQ);
                    });
                    const mergedQuestionAnalytics = Array.from(qaMap.values()).sort((a, b) => b.attempts - a.attempts);

                    const { error: reportUpsertError } = await supabase
                        .from("topic_content_reports")
                        .upsert(
                            {
                                topic_id: topicId,
                                viewers: Number(existingReport?.viewers || 0),
                                unique_viewers: Number(existingReport?.unique_viewers || 0),
                                total_attempts: nextTotalAttempts,
                                single_attempts: nextSingleAttempts,
                                group_attempts: Number(existingReport?.group_attempts || 0),
                                unique_participants: nextUniqueParticipants,
                                unique_single_participants: nextUniqueSingleParticipants,
                                unique_group_participants: Number(existingReport?.unique_group_participants || 0),
                                average_score_overall: nextOverallAvg,
                                average_score_single: nextSingleAvg,
                                average_score_group: Number(existingReport?.average_score_group || 0),
                                highest_score: nextHighest,
                                pass_rate: nextPassRate,
                                question_analytics: mergedQuestionAnalytics,
                                last_attempt_at: new Date().toISOString(),
                                computed_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            },
                            { onConflict: "topic_id" }
                        );
                    if (reportUpsertError) {
                        throw reportUpsertError;
                    }
                } catch (e) {
                    console.error("[Save] Guest topic_content_reports upsert failed:", e);
                    toast({
                        variant: "destructive",
                        title: "تعذر تحديث إحصائيات المعلم",
                        description: "فشل حفظ بيانات التقرير من وضع الزائر. راجع صلاحيات قاعدة البيانات (RLS/GRANT).",
                    });
                }

                setResultsSaved(true);
                stop("background");
                play("achievement");
                return;
            }

            try {
                setResultsSaved(true);
                const subjectData = content.subject;
                // 0. Pre-check: Was this topic already completed?
                // This must happen BEFORE we save the new activity!
                console.log("[Save] Step 0: Checking for previous completions...");
                const { data: priorTopicActivities } = await supabase
                    .from("student_topic_activities")
                    .select("id, percentage, completed")
                    .eq("student_id", studentProfile.id)
                    .eq("topic_id", topicId);

                const priorRows = priorTopicActivities || [];
                const completedPrior = priorRows.filter((a) => a.completed);
                const wasTopicAlreadyCompleted = completedPrior.length > 0;
                const previousBestPercentage =
                    completedPrior.length > 0
                        ? Math.max(...completedPrior.map((a) => Number(a.percentage) || 0))
                        : null;

                const sessionBadges = evaluateSessionBadges(
                    buildBadgeContext({
                        isFirstAttemptOnTopic: !wasTopicAlreadyCompleted,
                        previousBestPercentage,
                        topicAttemptCount: priorRows.length + 1,
                    })
                );
                console.log("[Save] Was topic already completed?", wasTopicAlreadyCompleted);
                console.log("[Save] Session badges:", sessionBadges.map((b) => b.id));

                // 1. Get or Create challenge session
                console.log("[Save] Step 1: Getting/Creating challenge session...");
                let sessionId = "";
                
                if (pin) {
                    // Try to find the existing session by PIN
                    const { data: existingSession, error: sessionError } = await supabase
                        .from("challenge_sessions")
                        .select("id")
                        .eq("pin", pin)
                        .maybeSingle();
                        
                    if (existingSession) {
                        sessionId = existingSession.id;
                    }
                }
                
                if (!sessionId) {
                    const session = await createSessionMutation.mutateAsync({
                        topicId: topicId,
                        hostId: currentUser.id,
                        mode: "SINGLE",
                        category: (category || "mixed").toUpperCase(),
                    });
                    sessionId = session.id;
                }
                console.log("[Save] Step 1 complete. Session ID:", sessionId);

                // 2. Save challenge result
                console.log("[Save] Step 2: Saving challenge result...");
                const savedResult = await saveResultMutation.mutateAsync({
                    sessionId: sessionId,
                    userId: currentUser.id,
                    totalQuestions: results.totalQuestions,
                    correctAnswers: results.correctAnswers,
                    wrongAnswers: results.wrongAnswers,
                    score: results.score,
                    maxScore: results.maxScore,
                    percentage: results.percentage,
                    timeTaken: results.timeTaken,
                    averageTimePerQuestion: results.averageTimePerQuestion,
                    longestStreak: results.longestStreak,
                    accuracy: results.accuracy,
                    level: results.level,
                    questionResults: results.questionResults,
                });
                console.log("[Save] Step 2 complete. Result ID:", savedResult.id);

                // 2.5. Save individual participant answers
                console.log("[Save] Step 2.5: Saving individual participant answers...");
                const answersToSave = results.questionResults.map((qr: any, index: number) => ({
                    resultId: String(savedResult.id),
                    questionId: String(questions[index]?.id || qr.questionId),
                    userAnswer: qr.userAnswer ? String(qr.userAnswer) : null,
                    isCorrect: !!qr.correct,
                    timeTaken: Number(qr.timeTaken || 0),
                    pointsEarned: Number(qr.pointsEarned || 0),
                }));

                if (answersToSave.length > 0) {
                    await saveAnswersMutation.mutateAsync(answersToSave);
                    console.log("[Save] Step 2.5 complete. Saved", answersToSave.length, "answers.");
                }

                if (isScheduledLikeSession && playerSessionIdFromJoin) {
                    try {
                        await updatePlayerSessionMutation.mutateAsync({
                            id: playerSessionIdFromJoin,
                            updates: {
                                score: results.score,
                                correct_answers: results.correctAnswers,
                                wrong_answers: results.wrongAnswers,
                                streak: results.longestStreak,
                            },
                        });
                    } catch (e) {
                        console.warn("[Save] player_session sync (scheduled):", e);
                    }
                }

                // 3. Log topic activity
                if (studentProfile?.id) {
                    console.log("[Save] Step 3: Saving topic activity...");
                    await saveTopicActivityMutation.mutateAsync({
                        studentProfileId: studentProfile.id,
                        topicId: topicId,
                        topicTitle: content.title || "تحدي",
                        score: results.percentage,
                        completed: results.percentage >= 50,
                    });
                    console.log("[Save] Step 3 complete.");

                    // 4. Update student profile stats (Recalculating from Source of Truth)
                    console.log("[Save] Step 4: Recalculating totals from activities...");

                    // A: Fetch ALL unique completed topics to ensure perfect accuracy
                    const { data: allCompletions } = await supabase
                        .from("student_topic_activities")
                        .select("topic_id")
                        .eq("student_id", studentProfile.id)
                        .eq("completed", true);

                    const completedTopicIds = [...new Set((allCompletions || []).map(c => c.topic_id))];
                    const newTotalCompletedCount = completedTopicIds.length;

                    // B: Recalculate global profile stats
                    const newTotalPoints = (studentProfile.total_points || 0) + results.score;
                    const newTotalChallenges = (studentProfile.total_challenges || 0) + 1;

                    const oldTotal = studentProfile.total_challenges || 0;
                    const oldAvg = studentProfile.average_score || 0;
                    const newTotalAvg = ((oldAvg * oldTotal) + results.percentage) / (newTotalChallenges || 1);

                    const studyHoursAdded = results.timeTaken / 3600;
                    const newStudyHours = (studentProfile.total_study_hours || 0) + studyHoursAdded;

                    const currentStreak = results.percentage >= 50 ? (studentProfile.current_streak || 0) + 1 : 0;
                    const newLongestStreak = Math.max(studentProfile.longest_streak || 0, currentStreak);

                    await updateStudentProfileMutation.mutateAsync({
                        studentProfileId: studentProfile.id,
                        updates: {
                            totalPoints: newTotalPoints,
                            totalChallenges: newTotalChallenges,
                            completedTopics: newTotalCompletedCount,
                            averageScore: Math.round(newTotalAvg * 100) / 100,
                            longestStreak: newLongestStreak,
                            currentStreak: currentStreak,
                            totalStudyHours: Math.round(newStudyHours * 100) / 100,
                        },
                    });
                    console.log("[Save] Step 4 complete. Global Completed:", newTotalCompletedCount);

                    // 5. Update subject progress
                    if (subjectData?.id) {
                        try {
                            console.log("[Save] Step 5: Updating subject progress (Recalculating subject totals)...");

                            // A: Fetch all topics for THIS specific subject
                            const { data: subjectTopics } = await supabase
                                .from("topics")
                                .select("id")
                                .eq("subject_id", subjectData.id);

                            const subjectTopicIds = (subjectTopics || []).map(t => t.id);

                            // B: Count how many of THESE specific topics are completed by this student
                            const subjectCompletedCount = completedTopicIds.filter(id => subjectTopicIds.includes(id)).length;

                            // C: Calculate rolling average for the subject progress record
                            const currentProgress = (subjectProgress || []).find((p: any) =>
                                String(p.subject_id).toLowerCase() === String(subjectData.id).toLowerCase()
                            );

                            const existingAvg = Number(currentProgress?.average_score || 0);
                            const subjectNewAvg = existingAvg > 0
                                ? ((existingAvg * 2) + results.percentage) / 3 // Simple smoothing update
                                : results.percentage;

                            await upsertSubjectProgressMutation.mutateAsync({
                                studentProfileId: studentProfile.id,
                                subjectId: subjectData.id,
                                completedTopics: subjectCompletedCount,
                                totalTopics: Math.max(subjectTopicIds.length, 1),
                                averageScore: Math.round(subjectNewAvg * 100) / 100,
                            });
                            console.log("[Save] Step 5 complete. Subject Progress:", subjectCompletedCount, "/", subjectTopicIds.length);
                        } catch (e) {
                            console.error("[Save] Step 5 failed (subject progress):", e);
                        }
                    }
                } else {
                    console.warn("[Save] No student profile found, skipping steps 3-5.");
                }

                // 6. Award badges
                if (sessionBadges.length > 0) {
                    const badgeSlugs = sessionBadges
                        .filter(Boolean)
                        .map(b => b.id); // badge id = slug in badges table
                    if (badgeSlugs.length > 0) {
                        try {
                            console.log("[Save] Step 6: Awarding badges...", badgeSlugs);
                            await awardBadgesMutation.mutateAsync({
                                userId: currentUser.id,
                                badgeSlugs: badgeSlugs,
                                resultId: savedResult.id,
                            });
                            console.log("[Save] Step 6 complete.");
                        } catch (e) {
                            console.warn("[Save] Step 6 failed (badge awarding):", e);
                        }
                    }
                }

                // Stop background music
                stop('background');
                // Play fanfare
                play('achievement');

                toast({
                    title: "تم حفظ النتيجة ✅",
                    description: `حصلت على ${results.score} نقطة بنسبة ${results.percentage}%`,
                });
            } catch (error) {
                console.error("[Save] Failed to save challenge results at step:", error);
                // Still stop music even if save fails
                stop('background');
                play('achievement');
                toast({
                    variant: "destructive",
                    title: "تنبيه",
                    description: "تم حساب النتيجة لكن حدث خطأ أثناء حفظها في قاعدة البيانات.",
                });
            }
        };

        saveResults();
    }, [
        gameState,
        resultsSaved,
        currentUser?.id,
        studentProfile?.id,
        topicId,
        content,
        isScheduledLikeSession,
        playerSessionIdFromJoin,
        pinLooksLikeSession,
        sessionForVisibilityLoading,
        collectParticipantData,
        guestDisplayName,
        teacherHostUserId,
        category,
        questions,
    ]);

    const buildBadgeContext = (extra?: Partial<ChallengeBadgeContext>): ChallengeBadgeContext => {
        const correctAnswers = questionResults.filter((r) => r.correct).length;
        return {
            correctAnswers,
            totalQuestions: questions.length,
            totalTimeSeconds: totalTime,
            longestStreak,
            ...extra,
        };
    };

    // Recompute session badges when results screen is shown (includes prior attempts when logged in)
    useEffect(() => {
        if (gameState !== "results" || questions.length === 0) {
            if (gameState !== "results") setEarnedSessionBadges([]);
            return;
        }

        const base = buildBadgeContext();
        setEarnedSessionBadges(evaluateSessionBadges(base));

        if (!studentProfile?.id || !topicId) return;

        let cancelled = false;
        (async () => {
            const { data: priorActivities } = await supabase
                .from("student_topic_activities")
                .select("percentage, completed")
                .eq("student_id", studentProfile.id)
                .eq("topic_id", topicId);

            if (cancelled) return;

            const rows = priorActivities || [];
            const completedPrior = rows.filter((a) => a.completed);
            const previousBest =
                completedPrior.length > 0
                    ? Math.max(...completedPrior.map((a) => Number(a.percentage) || 0))
                    : null;

            setEarnedSessionBadges(
                evaluateSessionBadges(
                    buildBadgeContext({
                        isFirstAttemptOnTopic: completedPrior.length === 0,
                        previousBestPercentage: previousBest,
                        topicAttemptCount: rows.length + 1,
                    })
                )
            );
        })();

        return () => {
            cancelled = true;
        };
    }, [
        gameState,
        questionResults,
        questions.length,
        totalTime,
        longestStreak,
        studentProfile?.id,
        topicId,
    ]);

    // Calculate results
    const getResults = (): SinglePlayerResult => {
        const correctAnswers = questionResults.filter(r => r.correct).length;
        const totalQuestions = questions.length;
        const maxScore = questions.reduce((acc, q) => acc + q.points, 0);
        const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        const avgTime = totalQuestions > 0 ? totalTime / totalQuestions : 0;
        const badges =
            gameState === "results"
                ? earnedSessionBadges
                : evaluateSessionBadges(buildBadgeContext());

        return {
            totalQuestions,
            correctAnswers,
            wrongAnswers: totalQuestions - correctAnswers,
            score,
            maxScore,
            percentage,
            timeTaken: totalTime,
            averageTimePerQuestion: avgTime,
            longestStreak,
            accuracy: percentage,
            questionResults,
            badges,
            level: getLevelFromScore(percentage).level
        };
    };

    if (isLoading) {
        return (
            <div className="min-h-screen font-cairo">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 text-center py-20">
                        <Skeleton className="h-12 w-64 mx-auto mb-4" />
                        <Skeleton className="h-40 w-full max-w-2xl mx-auto" />
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!content) {
        return (
            <div className="min-h-screen font-cairo">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 text-center py-20">
                        <h1 className="text-3xl font-bold mb-4">المحتوى غير موجود</h1>
                        <Button asChild>
                            <Link to="/grades">
                                العودة للصفوف
                            </Link>
                        </Button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    /** نحتاج الجلسة عند وجود PIN لنعرف إن كان التحدي مجدولاً قبل تطبيق إخفاء الصفوف */
    if (pinLooksLikeSession && sessionForVisibilityLoading) {
        return (
            <div className="min-h-screen font-cairo">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 text-center py-20">
                        <Skeleton className="h-12 w-64 mx-auto mb-4" />
                        <Skeleton className="h-40 w-full max-w-2xl mx-auto" />
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const visibilityGrade = (content as any)?.subject?.grade;
    /** تجاوز إخفاء الصفوف للمجدول: من الجلسة (حقول متعددة الأشكال) أو ?scheduled=1 من رابط الانضمام */
    const allowScheduledJoinVisibilityBypass =
        pinLooksLikeSession &&
        (sessionHasScheduledFields(sessionForVisibility) || scheduledFromJoinUrl);
    /** نفس منطق ChallengeModeSelect: المسار يشير لصف الموضوع الفعلي (معرّف أو slug) */
    const allowTopicRouteVisibilityBypass = routeGradeMatchesTopicGrade(gradeId, visibilityGrade);

    if (
        visibilityGrade &&
        !gradeMatchesContentFocus(visibilityGrade, focus) &&
        !allowScheduledJoinVisibilityBypass &&
        !allowTopicRouteVisibilityBypass
    ) {
        return (
            <div className="min-h-screen font-cairo">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 text-center py-20">
                        <h1 className="text-3xl font-bold mb-4">المحتوى غير متاح</h1>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">هذا المحتوى غير معروض حالياً على المنصة.</p>
                        <Button asChild>
                            <Link to="/grades">العودة للصفوف</Link>
                        </Button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // Render Wheel
    const renderWheel = () => {
        // Use segments labels or legacy options
        const labels = currentQuestion.wheelSegments?.map(s => s.label) || currentQuestion.options || [];
        const segmentAngle = 360 / Math.max(1, labels.length);
        const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"];

        return (
            <div className="flex flex-col items-center">
                <div className="relative w-72 h-72 md:w-80 md:h-80">
                    {/* Pointer */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                        <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-primary" />
                    </div>

                    {/* Wheel */}
                    <motion.div
                        className="w-full h-full rounded-full overflow-hidden border-4 border-primary shadow-2xl"
                        style={{ transformOrigin: "center center" }}
                        animate={{ rotate: wheelRotation }}
                        transition={{ duration: 4, ease: [0.2, 0.8, 0.2, 1] }}
                    >
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                            {labels.map((option, i) => {
                                const startAngle = i * segmentAngle - 90;
                                const endAngle = (i + 1) * segmentAngle - 90;
                                const largeArcFlag = segmentAngle > 180 ? 1 : 0;

                                const x1 = 50 + 50 * Math.cos((startAngle * Math.PI) / 180);
                                const y1 = 50 + 50 * Math.sin((startAngle * Math.PI) / 180);
                                const x2 = 50 + 50 * Math.cos((endAngle * Math.PI) / 180);
                                const y2 = 50 + 50 * Math.sin((endAngle * Math.PI) / 180);

                                const textAngle = startAngle + segmentAngle / 2;
                                const textX = 50 + 30 * Math.cos((textAngle * Math.PI) / 180);
                                const textY = 50 + 30 * Math.sin((textAngle * Math.PI) / 180);

                                return (
                                    <g key={i}>
                                        <path
                                            d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                                            fill={colors[i % colors.length]}
                                            stroke="white"
                                            strokeWidth="0.5"
                                        />
                                        <text
                                            x={textX}
                                            y={textY}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill="white"
                                            fontSize="4"
                                            fontWeight="bold"
                                            transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                                        >
                                            {option.length > 12 ? option.substring(0, 12) + "..." : option}
                                        </text>
                                    </g>
                                );
                            })}
                            <circle cx="50" cy="50" r="8" fill="white" stroke="#333" strokeWidth="0.5" />
                        </svg>
                    </motion.div>
                </div>

                {!isSpinning && wheelResult === null && (
                    <Button
                        onClick={handleWheelSpin}
                        size="lg"
                        variant="hero"
                        className="mt-6 gap-2 text-lg"
                    >
                        <Sparkles className="w-5 h-5" />
                        أدر العجلة!
                    </Button>
                )}

                {wheelResult !== null && wheelSubQuestion && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 w-full max-w-md"
                    >
                        <Card className="p-6 border-2 border-primary/20 bg-primary/5">
                            <div className="text-center mb-6">
                                <div className="text-sm font-bold text-primary mb-2">تحدي: {labels[wheelResult]}</div>
                                <h4 className="text-lg font-bold">{wheelSubQuestion.question}</h4>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {wheelSubQuestion.options.map((opt: string, i: number) => {
                                    const isSelected = selectedAnswer === i;
                                    const isCorrect = i === wheelSubQuestion.correctAnswer;

                                    let btnClass = "w-full p-4 rounded-xl border-2 text-right transition-all ";
                                    if (showResult) {
                                        if (isCorrect) btnClass += "border-green-500 bg-green-500/10 text-green-700";
                                        else if (isSelected) btnClass += "border-red-500 bg-red-500/10 text-red-700";
                                        else btnClass += "opacity-50 border-border";
                                    } else {
                                        btnClass += "border-border hover:border-primary hover:bg-primary/5";
                                    }

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleWheelSubAnswer(i)}
                                            disabled={showResult}
                                            className={btnClass}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${showResult && isCorrect ? "bg-green-500 text-white" : "bg-muted"
                                                    }`}>
                                                    {i + 1}
                                                </span>
                                                {opt}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>
                    </motion.div>
                )}
            </div>
        );
    };

    // Render Matching Game
    const renderMatching = () => {
        const pairs = currentQuestion.pairs || [];

        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center mb-4">
                    اختر عنصراً من اليمين ثم طابقه مع العنصر المناسب من اليسار
                </p>
                <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-3">
                        <div className="text-sm font-medium text-center mb-2 text-primary">المصدر</div>
                        {pairs.map((pair, index) => {
                            const isMatched = matchedPairs.some(p => p.leftIndex === index);
                            const isSelected = selectedLeft === index;

                            return (
                                <motion.button
                                    key={`left-${index}`}
                                    whileHover={!showResult && !isMatched ? { scale: 1.02 } : {}}
                                    whileTap={!showResult && !isMatched ? { scale: 0.98 } : {}}
                                    onClick={() => handleMatchingLeftSelect(index)}
                                    disabled={showResult || isMatched}
                                    className={`w-full p-4 rounded-xl border-2 transition-all text-center ${isMatched
                                        ? "border-green-500 bg-green-500/10 text-green-700"
                                        : isSelected
                                            ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2"
                                            : "border-border hover:border-primary"
                                        }`}
                                >
                                    {pair.left}
                                    {isMatched && <CheckCircle2 className="w-4 h-4 inline mr-2 text-green-500" />}
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Right Column (Shuffled) */}
                    <div className="space-y-3">
                        <div className="text-sm font-medium text-center mb-2 text-secondary">الوقاية</div>
                        {shuffledRight.map((item, shuffledIndex) => {
                            const isMatched = matchedPairs.some(p => p.rightIndex === item.originalIndex);

                            return (
                                <motion.button
                                    key={`right-${shuffledIndex}`}
                                    whileHover={!showResult && !isMatched && selectedLeft !== null ? { scale: 1.02 } : {}}
                                    whileTap={!showResult && !isMatched ? { scale: 0.98 } : {}}
                                    onClick={() => handleMatchingRightSelect(shuffledIndex)}
                                    disabled={showResult || isMatched || selectedLeft === null}
                                    className={`w-full p-4 rounded-xl border-2 transition-all text-center ${isMatched
                                        ? "border-green-500 bg-green-500/10 text-green-700"
                                        : selectedLeft !== null && !isMatched
                                            ? "border-secondary hover:border-secondary hover:bg-secondary/10"
                                            : "border-border opacity-50"
                                        }`}
                                >
                                    {item.text}
                                    {isMatched && <CheckCircle2 className="w-4 h-4 inline mr-2 text-green-500" />}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* Progress */}
                <div className="text-center text-sm text-muted-foreground">
                    {matchedPairs.length} / {pairs.length} تم المطابقة
                </div>
            </div>
        );
    };

    // Render Order Questions
    const renderOrderQuestions = () => {
        const correctItems = currentQuestion.orderItems || [];

        return (
            <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center mb-4">
                    استخدم الأسهم لترتيب العناصر بالترتيب الصحيح
                </p>

                {orderItems.map((item, index) => {
                    const isCorrectPosition = showResult && item === correctItems[index];
                    const isWrongPosition = showResult && item !== correctItems[index];

                    return (
                        <motion.div
                            key={`order-${index}`}
                            layout
                            className={`p-4 rounded-xl border-2 flex items-center gap-3 ${showResult
                                ? isCorrectPosition
                                    ? "border-green-500 bg-green-500/10"
                                    : "border-red-500 bg-red-500/10"
                                : "border-border"
                                }`}
                        >
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${showResult
                                ? isCorrectPosition
                                    ? "bg-green-500 text-white"
                                    : "bg-red-500 text-white"
                                : "bg-muted"
                                }`}>
                                {index + 1}
                            </span>

                            <span className="flex-1 text-right">{item}</span>

                            {!showResult && (
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => moveItemUp(index)}
                                        disabled={index === 0}
                                        className="p-1 rounded hover:bg-muted disabled:opacity-30"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => moveItemDown(index)}
                                        disabled={index === orderItems.length - 1}
                                        className="p-1 rounded hover:bg-muted disabled:opacity-30"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {showResult && (
                                <span className="text-xs">
                                    {isCorrectPosition ? "✓" : `الصحيح: ${correctItems.indexOf(item) + 1}`}
                                </span>
                            )}
                        </motion.div>
                    );
                })}

                {!showResult && (
                    <Button
                        onClick={handleOrderSubmit}
                        className="w-full mt-4"
                        size="lg"
                    >
                        تأكيد الترتيب
                    </Button>
                )}
            </div>
        );
    };

    // Render Know/Don't Know
    const renderKnowDontKnow = () => {
        return (
            <div className="space-y-6">
                {!showResult ? (
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            onClick={() => handleKnowAnswer(true)}
                            size="lg"
                            className="h-20 text-xl bg-green-500 hover:bg-green-600"
                        >
                            <CheckCircle2 className="w-6 h-6 ml-2" />
                            أعرف!
                        </Button>
                        <Button
                            onClick={() => handleKnowAnswer(false)}
                            size="lg"
                            variant="outline"
                            className="h-20 text-xl border-2"
                        >
                            <XCircle className="w-6 h-6 ml-2" />
                            لا أعرف
                        </Button>
                    </div>
                ) : null}

                {showCorrectAnswer && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-xl bg-primary/10 border border-primary/30 text-center"
                    >
                        <div className="text-sm text-primary mb-2 font-medium">الإجابة:</div>
                        <div className="text-lg font-bold">
                            {currentQuestion.correctAnswer as string}
                        </div>
                    </motion.div>
                )}
            </div>
        );
    };

    // Render Q&A
    const renderQA = () => {
        return (
            <div className="space-y-4 max-w-lg mx-auto">
                <Textarea
                    placeholder="اكتب إجابتك هنا..."
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    disabled={showResult}
                    className="text-lg p-6 min-h-[140px] text-right resize-none border-2 focus:border-primary transition-all rounded-2xl"
                />
                {!showResult && (
                    <Button
                        onClick={handleQASubmit}
                        size="lg"
                        className="w-full h-14 text-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all"
                        disabled={!userAnswer.trim()}
                    >
                        إرسال الإجابة
                    </Button>
                )}

                {showResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 space-y-4"
                    >
                        <div className="p-5 rounded-2xl bg-muted/30 border border-border">
                            <div className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">إجابتك:</div>
                            <div className="text-lg font-black">{userAnswer}</div>
                        </div>
                        
                        <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-200 shadow-sm">
                            <div className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-wider">الإجابة النموذجية:</div>
                            <div className="text-xl font-black text-emerald-700">{currentQuestion.correctAnswer as string}</div>
                        </div>
                    </motion.div>
                )}
            </div>
        );
    };

    // Render Puzzle
    const renderPuzzle = () => {
        // We reuse 'userAnswer' state for the constructed string
        const handlePuzzleOptionClick = (option: string) => {
            if (showResult) return;
            setUserAnswer(prev => prev + option);
        };

        const handlePuzzleBackspace = () => {
            if (showResult) return;
            setUserAnswer("");
        };

        const handlePuzzleSubmit = () => {
            if (showResult || !userAnswer) return;

            const timeTaken = (Date.now() - questionStartTime) / 1000;
            setTotalTime(prev => prev + timeTaken);
            setShowResult(true);

            // Normalize for comparison
            const correct = currentQuestion.correctAnswer?.toString().trim();
            const user = userAnswer.trim();
            const isCorrect = user === correct;

            setSelectedAnswer(isCorrect ? "correct" : "wrong");
            processAnswer(isCorrect, timeTaken);
        };

        return (
            <div className="space-y-8 max-w-xl mx-auto">
                {/* Constructed Answer Display */}
                <div
                    className={`min-h-[80px] flex items-center justify-center p-4 rounded-xl border-2 text-3xl font-bold tracking-widest bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors ${showResult
                        ? selectedAnswer === "correct"
                            ? "border-green-500 text-green-700 bg-green-50"
                            : "border-red-500 text-red-700 bg-red-50"
                        : "border-dashed border-primary/30"
                        }`}
                    onClick={handlePuzzleBackspace}
                    title="انقر للمسح"
                >
                    {userAnswer || <span className="text-muted-foreground/30 text-lg font-normal">اضغط على الحروف لتكوين الكلمة</span>}
                </div>

                {/* Options (Letters/Segments) Grid */}
                <div className="grid grid-cols-4 gap-3 md:gap-4">
                    {currentQuestion.options?.map((option, index) => (
                        <Button
                            key={index}
                            onClick={() => handlePuzzleOptionClick(option)}
                            disabled={showResult}
                            variant="outline"
                            className="h-16 text-2xl font-bold rounded-xl hover:scale-105 active:scale-95 transition-transform"
                        >
                            {option}
                        </Button>
                    ))}
                </div>

                {/* Submit / Reset Actions */}
                {!showResult && (
                    <div className="flex gap-3">
                        <Button
                            onClick={handlePuzzleBackspace}
                            variant="ghost"
                            className="flex-1 h-12 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4 ml-2" />
                            مسح
                        </Button>
                        <Button
                            onClick={handlePuzzleSubmit}
                            className="flex-[2] h-12 text-lg"
                            disabled={!userAnswer}
                        >
                            تحقق
                        </Button>
                    </div>
                )}

                {/* Result Feedback */}
                {showResult && (
                    <div className="text-center animate-in fade-in slide-in-from-bottom-4">
                        {selectedAnswer === "correct" ? (
                            <div className="text-green-600 font-bold text-xl flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-6 h-6" />
                                إجابة صحيحة!
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="text-red-500 font-bold text-xl flex items-center justify-center gap-2">
                                    <XCircle className="w-6 h-6" />
                                    إجابة خاطئة
                                </div>
                                <div className="text-muted-foreground">
                                    الإجابة الصحيحة هي: <span className="font-bold text-foreground">{currentQuestion.correctAnswer as string}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const hasFullProfileForUi = !!currentUser?.id && !!studentProfile?.id;
    const showGuestIdentityForm = collectParticipantData && !hasFullProfileForUi;

    const renderIntro = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto text-center"
        >
            <Card className="p-8 md:p-12">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6"
                >
                    <Trophy className="w-12 h-12 text-white" />
                </motion.div>

                <h2 className="text-3xl font-black mb-4">هل أنت مستعد؟</h2>
                {joinDisplayName && !showGuestIdentityForm && (
                    <p className="text-base font-bold text-primary mb-3">أهلاً، {joinDisplayName}</p>
                )}
                <p className="text-muted-foreground mb-8">
                    سيتضمن هذا التحدي <strong>{questions.length}</strong> سؤال
                    <br />
                    أجب بسرعة للحصول على نقاط إضافية!
                </p>

                {showGuestIdentityForm && (
                    <div className="text-right space-y-4 mb-8 border rounded-xl p-4 bg-muted/30">
                        {!teacherHostUserId && (
                            <p className="text-xs text-destructive">
                                تعذّر تفعيل التسجيل لهذا الدرس تقنياً. يمكنك المتابعة لاحقاً أو التواصل مع المعلّم.
                            </p>
                        )}
                        <div className="space-y-2">
                            <Input
                                dir="rtl"
                                value={guestDisplayName}
                                onChange={(e) => setGuestDisplayName(e.target.value)}
                                placeholder="اكتب اسمك الثنائي"
                                className="text-right"
                            />
                        </div>
                    </div>
                )}

                <Button
                    onClick={handleStartGame}
                    size="lg"
                    variant="hero"
                    className="w-full gap-2 text-lg h-14"
                    disabled={
                        questions.length === 0 ||
                        (showGuestIdentityForm &&
                            (!guestDisplayName.trim() || !teacherHostUserId))
                    }
                >
                    <Sparkles className="w-5 h-5" />
                    ابدأ التحدي
                </Button>
            </Card>
        </motion.div>
    );

    const renderQuestion = () => {
        if (!currentQuestion) return null;

        const progress = ((currentIndex + 1) / questions.length) * 100;
        const timeProgress = (timeLeft / currentQuestion.timeLimit) * 100;

        return (
            <div className="max-w-3xl mx-auto">
                {/* Timer */}
                {!isSpinning && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">الوقت المتبقي</span>
                            <span className={`font-bold ${timeLeft <= 5 ? "text-red-500 animate-pulse" : ""}`}>
                                {timeLeft}s
                            </span>
                        </div>
                        <Progress
                            value={timeProgress}
                            className={`h-3 ${timeLeft <= 5 ? "[&>div]:bg-red-500" : ""}`}
                        />
                    </div>
                )}

                {/* Question progress & score */}
                <div className="flex items-center justify-between gap-2 mb-6">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                        <div className="text-sm text-muted-foreground shrink-0">
                            {currentIndex + 1}/{questions.length}
                        </div>
                        <Progress value={progress} className="h-2 min-w-0 flex-1 sm:flex-none sm:w-32" />
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        {streak > 1 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full bg-orange-500/20 text-orange-500 shrink-0"
                            >
                                🔥 {streak}
                            </motion.div>
                        )}
                        <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10">
                            <Trophy className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-bold tabular-nums">{score}</span>
                        </div>
                    </div>
                </div>

                {/* Question Card */}
                <Card className="p-6 md:p-8 mb-6">
                    {/* Question Type Badge */}
                    <div className="flex justify-center mb-4">
                        <span className="px-4 py-1 rounded-full bg-muted text-sm">
                            {currentQuestion.type === "multiple_choice" && "اختيار متعدد"}
                            {currentQuestion.type === "true_false" && "صح أو خطأ"}
                            {currentQuestion.type === "qa" && "سؤال وجواب"}
                            {currentQuestion.type === "order_questions" && "رتّب الإجابات"}
                            {currentQuestion.type === "matching" && "طابق العناصر"}
                            {currentQuestion.type === "know_dont_know" && "أعرف / لا أعرف"}
                            {currentQuestion.type === "puzzle" && "أكمل الجملة"}
                            {currentQuestion.type === "shooting" && "⚡ سريع!"}
                            {currentQuestion.type === "wheel_spin" && "🎡 عجلة الحظ"}
                        </span>
                    </div>

                    <h3 className="text-xl md:text-2xl font-bold text-center mb-4">
                        {currentQuestion.question}
                    </h3>

                    {/* Question Image */}
                    {currentQuestion.imageUrl && (
                        <div className="flex justify-center mb-8">
                            <img
                                src={currentQuestion.imageUrl}
                                alt=""
                                className="max-h-60 rounded-xl object-contain border shadow-sm"
                            />
                        </div>
                    )}

                    {/* Multiple Choice / True-False / Shooting */}
                    {["multiple_choice", "true_false", "shooting"].includes(currentQuestion.type) && currentQuestion.options && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentQuestion.options.map((option, index) => {
                                const isSelected = selectedAnswer === index;
                                const isCorrect = index === currentQuestion.correctAnswer;

                                let buttonClass = "p-5 text-right rounded-xl border-2 transition-all ";

                                if (showResult) {
                                    if (isCorrect) {
                                        buttonClass += "border-green-500 bg-green-500/10";
                                    } else if (isSelected && !isCorrect) {
                                        buttonClass += "border-red-500 bg-red-500/10";
                                    } else {
                                        buttonClass += "border-border opacity-50";
                                    }
                                } else {
                                    buttonClass += "border-border hover:border-primary hover:bg-primary/5 cursor-pointer";
                                }

                                return (
                                    <motion.button
                                        key={index}
                                        whileHover={!showResult ? { scale: 1.02 } : {}}
                                        whileTap={!showResult ? { scale: 0.98 } : {}}
                                        onClick={() => handleAnswerSelect(index)}
                                        disabled={showResult}
                                        className={buttonClass}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${showResult && isCorrect
                                                ? "bg-green-500 text-white"
                                                : showResult && isSelected
                                                    ? "bg-red-500 text-white"
                                                    : "bg-muted"
                                                }`}>
                                                {showResult && isCorrect ? (
                                                    <CheckCircle2 className="w-5 h-5" />
                                                ) : showResult && isSelected ? (
                                                    <XCircle className="w-5 h-5" />
                                                ) : (
                                                    String.fromCharCode(1571 + index)
                                                )}
                                            </span>
                                            <span className="text-lg">{option}</span>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}

                    {/* Q&A */}
                    {currentQuestion.type === "qa" && renderQA()}

                    {/* Puzzle */}
                    {currentQuestion.type === "puzzle" && renderPuzzle()}

                    {/* Know / Don't Know */}
                    {currentQuestion.type === "know_dont_know" && renderKnowDontKnow()}

                    {/* Order Questions */}
                    {currentQuestion.type === "order_questions" && renderOrderQuestions()}

                    {/* Matching */}
                    {currentQuestion.type === "matching" && renderMatching()}

                    {/* Wheel Spin */}
                    {currentQuestion.type === "wheel_spin" && renderWheel()}

                    {/* Result Feedback */}
                    <AnimatePresence>
                        {showResult && currentQuestion.type !== "wheel_spin" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6"
                            >
                                {questionResults[currentIndex]?.correct ? (
                                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
                                        <div className="text-3xl mb-2">🎉</div>
                                        <div className="font-bold text-green-600">أحسنت!</div>
                                        <div className="text-sm text-muted-foreground">
                                            +{questionResults[currentIndex]?.pointsEarned} نقطة
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
                                        <div className="text-3xl mb-2">😔</div>
                                        <div className="font-bold text-red-600">
                                            {selectedAnswer === -1 ? "انتهى الوقت!" : "حاول مرة أخرى"}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Next Button */}
                    {showResult && (
                        <Button
                            onClick={handleNextQuestion}
                            size="lg"
                            className="w-full mt-4 gap-2"
                        >
                            {currentIndex < questions.length - 1 ? (
                                <>
                                    السؤال التالي
                                    <ArrowLeft className="w-4 h-4" />
                                </>
                            ) : (
                                <>
                                    عرض النتائج
                                    <Trophy className="w-4 h-4" />
                                </>
                            )}
                        </Button>
                    )}
                </Card>
            </div>
        );
    };

    const renderResults = () => {
        const results = getResults();
        const canShareResult = results.percentage >= SHARE_RESULT_THRESHOLD;
        const isScheduledResultsView =
            scheduledFromJoinUrl ||
            (pinLooksLikeSession && sessionHasScheduledFields(sessionForVisibility));

        const whatsAppIcon = (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
        );

        if (isScheduledResultsView) {
            return (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-lg mx-auto"
                >
                    <Card className="p-8 md:p-10 text-center border-2 border-primary/15 shadow-lg">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-5">
                            <CheckCircle2 className="w-9 h-9 text-emerald-600" strokeWidth={2.5} />
                        </div>
                        <h2 className="text-2xl font-black mb-2">تم إكمال التحدي</h2>
                        <p className="text-sm text-muted-foreground mb-5">
                            تحدٍ مجدول — هذه ملخص نتيجتك.
                        </p>
                        {joinDisplayName && (
                            <p className="text-base font-bold text-foreground mb-4">{joinDisplayName}</p>
                        )}
                        <div className="text-5xl font-black text-primary mb-1 tabular-nums" dir="ltr">
                            {results.percentage}%
                        </div>
                        <p className="text-muted-foreground mb-8">{results.score} نقطة</p>
                        <div className="grid grid-cols-2 gap-3 text-start mb-8 text-sm">
                            <div className="rounded-xl border bg-muted/40 px-4 py-3">
                                <div className="text-muted-foreground text-xs mb-1">صحيحة</div>
                                <div className="text-xl font-bold tabular-nums">{results.correctAnswers}</div>
                            </div>
                            <div className="rounded-xl border bg-muted/40 px-4 py-3">
                                <div className="text-muted-foreground text-xs mb-1">خاطئة</div>
                                <div className="text-xl font-bold tabular-nums">{results.wrongAnswers}</div>
                            </div>
                            <div className="rounded-xl border bg-muted/40 px-4 py-3">
                                <div className="text-muted-foreground text-xs mb-1">الوقت</div>
                                <div className="text-xl font-bold tabular-nums">
                                    {Math.round(results.timeTaken)} ثانية
                                </div>
                            </div>
                            <div className="rounded-xl border bg-muted/40 px-4 py-3">
                                <div className="text-muted-foreground text-xs mb-1">أطول سلسلة</div>
                                <div className="text-xl font-bold tabular-nums">{results.longestStreak}</div>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                            {canShareResult
                                ? "أداء رائع! شارك نتيجتك مع أصدقائك عبر واتساب 🎉"
                                : `لم تتجاوز ${SHARE_RESULT_THRESHOLD}% بعد — جرّب مرة أخرى لتحسين نتيجتك.`}
                            {" "}سُجّلت نتيجتك ويمكن لمعلّمك متابعتها.
                        </p>
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-3"
                        >
                            {canShareResult ? (
                                <Button
                                    onClick={handleWhatsAppShare}
                                    size="lg"
                                    className="w-full h-14 text-base font-black gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-lg shadow-[#25D366]/30"
                                >
                                    {whatsAppIcon}
                                    مشاركة النتيجة عبر واتساب
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleStartGame}
                                    size="lg"
                                    variant="hero"
                                    className="w-full h-14 text-base font-black gap-2 rounded-2xl"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                    إعادة التحدي
                                </Button>
                            )}
                            <Button asChild size="lg" variant="outline" className="w-full h-12 text-base font-bold gap-2">
                                <Link to={`/grade/${gradeId}/subject/${subjectId}/topic/${topicId}`}>
                                    <Home className="w-4 h-4" />
                                    العودة إلى المحتوى
                                </Link>
                            </Button>
                        </motion.div>
                    </Card>
                </motion.div>
            );
        }

        const level = getLevelFromScore(results.percentage);

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-2xl mx-auto"
            >
                <Card className="p-8 md:p-12 text-center overflow-hidden relative">
                    {canShareResult && (
                    <motion.div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ y: -50, x: Math.random() * 400 - 200, opacity: 1 }}
                                animate={{ y: 500, opacity: 0 }}
                                transition={{ duration: 3, delay: i * 0.1, repeat: Infinity }}
                                className="absolute w-3 h-3 rounded-full"
                                style={{
                                    backgroundColor: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"][i % 5],
                                    left: `${Math.random() * 100}%`
                                }}
                            />
                        ))}
                    </motion.div>
                    )}

                    {/* Level Badge */}
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", delay: 0.3 }}
                        className="relative z-10"
                    >
                        <div
                            className="w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 shadow-xl"
                            style={{ background: `linear-gradient(135deg, ${level.color}, ${level.color}88)` }}
                        >
                            <span className="text-6xl">{level.emoji}</span>
                        </div>
                        <div
                            className="text-2xl font-black mb-1"
                            style={{ color: level.color }}
                        >
                            {level.level}
                        </div>
                    </motion.div>

                    {/* Score */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mb-8 relative z-10"
                    >
                        <div className="text-6xl font-black mb-2">
                            {results.percentage}%
                        </div>
                        <div className="text-muted-foreground">
                            {results.score} نقطة
                        </div>
                        <p className="text-sm mt-3 font-medium">
                            {canShareResult
                                ? "🎉 أداء رائع! شارك إنجازك مع أصدقائك"
                                : `💪 تحتاج ${SHARE_RESULT_THRESHOLD}% للمشاركة — جرّب مرة أخرى`}
                        </p>
                    </motion.div>

                    {/* Stats Grid */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 relative z-10"
                    >
                        <div className="p-4 rounded-xl bg-green-500/10">
                            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-500" />
                            <div className="text-2xl font-bold text-green-600">{results.correctAnswers}</div>
                            <div className="text-xs text-muted-foreground">صحيحة</div>
                        </div>
                        <div className="p-4 rounded-xl bg-red-500/10">
                            <XCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                            <div className="text-2xl font-bold text-red-600">{results.wrongAnswers}</div>
                            <div className="text-xs text-muted-foreground">خاطئة</div>
                        </div>
                        <div className="p-4 rounded-xl bg-orange-500/10">
                            <Zap className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                            <div className="text-2xl font-bold text-orange-600">{results.longestStreak}</div>
                            <div className="text-xs text-muted-foreground">أطول سلسلة</div>
                        </div>
                        <div className="p-4 rounded-xl bg-blue-500/10">
                            <Clock className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                            <div className="text-2xl font-bold text-blue-600">{Math.round(results.timeTaken)}s</div>
                            <div className="text-xs text-muted-foreground">الوقت</div>
                        </div>
                    </motion.div>

                    {/* Badges */}
                    {results.badges.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="mb-8 relative z-10"
                        >
                            <h3 className="font-bold mb-4">🏅 الشارات المكتسبة</h3>
                            <div className="flex flex-wrap justify-center gap-3">
                                {results.badges.map((badge, index) => (
                                    <motion.div
                                        key={badge.id}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.9 + index * 0.1 }}
                                        className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30"
                                    >
                                        <span className="text-xl ml-2">{badge.icon}</span>
                                        <span className="font-medium">{badge.name}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center relative z-20 pb-10 max-w-md mx-auto"
                    >
                        {canShareResult ? (
                            <Button
                                onClick={handleWhatsAppShare}
                                size="lg"
                                className="rounded-[2rem] px-10 h-16 text-lg font-black transition-all hover:scale-105 active:scale-95 gap-3 w-full sm:flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-lg shadow-[#25D366]/30"
                            >
                                {whatsAppIcon}
                                <span>مشاركة النتيجة عبر واتساب</span>
                            </Button>
                        ) : (
                            <Button
                                onClick={handleStartGame}
                                size="lg"
                                variant="hero"
                                className="rounded-[2rem] px-10 h-16 text-lg font-black transition-all hover:scale-105 active:scale-95 gap-3 w-full sm:flex-1"
                            >
                                <RotateCcw className="w-5 h-5" />
                                <span>إعادة التحدي</span>
                            </Button>
                        )}

                        <Button
                            onClick={() => setShowAnalysis(true)}
                            size="lg"
                            variant="outline"
                            className="rounded-[2rem] px-10 h-16 text-lg border-2 font-bold transition-all hover:scale-105 active:scale-95 gap-3 w-full sm:flex-1"
                        >
                            <Zap className="w-5 h-5" />
                            <span>تحليل نتيجتي</span>
                        </Button>
                    </motion.div>
                </Card>

                {/* Analysis & Share Modal */}
                <AnimatePresence>
                    {showAnalysis && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
                        >
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowAnalysis(false)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ y: "100%", opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: "100%", opacity: 0 }}
                                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                                className="relative bg-white dark:bg-slate-900 w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[85vh] overflow-hidden rounded-t-[1.75rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col min-h-0"
                            >
                                <div className="shrink-0 px-4 pt-3 pb-3 sm:p-8 sm:pb-4 border-b dark:border-slate-800 flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex-1 min-w-0 pt-1 sm:pt-0">
                                        <h2 className="text-xl sm:text-3xl font-black mb-0.5 sm:mb-1 leading-tight">تحليل نتيجتي</h2>
                                        <p className="text-xs sm:text-sm text-muted-foreground leading-snug">تفاصيل أدائك ومشاركة النتيجة</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setShowAnalysis(false)} className="shrink-0 rounded-full w-10 h-10 sm:w-12 sm:h-12">
                                        <XCircle className="w-6 h-6 sm:w-8 sm:h-8" />
                                    </Button>
                                </div>

                                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:p-8 sm:pt-6 space-y-4 sm:space-y-6">
                                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                        <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-center min-w-0">
                                            <div className="text-xl sm:text-3xl font-black text-green-600 dark:text-green-400 tabular-nums">
                                                {results.correctAnswers}
                                            </div>
                                            <div className="text-[10px] sm:text-xs font-bold text-green-600/70 mt-0.5 sm:mt-1">صح</div>
                                        </div>
                                        <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-center min-w-0">
                                            <div className="text-xl sm:text-3xl font-black text-red-600 dark:text-red-400 tabular-nums">
                                                {results.wrongAnswers}
                                            </div>
                                            <div className="text-[10px] sm:text-xs font-bold text-red-600/70 mt-0.5 sm:mt-1">خطأ</div>
                                        </div>
                                        <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-primary/5 border border-primary/10 text-center min-w-0">
                                            <div className="text-xl sm:text-3xl font-black text-primary tabular-nums">
                                                {Math.round(results.averageTimePerQuestion)}s
                                            </div>
                                            <div className="text-[10px] sm:text-xs font-bold text-primary/70 mt-0.5 sm:mt-1 leading-tight">
                                                <span className="sm:hidden">السرعة</span>
                                                <span className="hidden sm:inline">متوسط السرعة</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 sm:space-y-4">
                                        {questionResults.map((qr, i) => {
                                            const q = questions.find((item) => item.id === qr.questionId) ?? questions[i];
                                            return (
                                                <div key={`${qr.questionId}-${i}`} className="p-3 sm:p-5 rounded-xl sm:rounded-[1.5rem] border bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700/50">
                                                    <div className="flex items-start justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
                                                        <h4 className="flex-1 min-w-0 font-bold text-sm sm:text-lg leading-snug text-right break-words">{q?.question || `سؤال ${i + 1}`}</h4>
                                                        {qr.correct ? (
                                                            <span className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                                                                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                                            </span>
                                                        ) : (
                                                            <span className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                                                                <Check className="w-4 h-4 sm:w-5 sm:h-5 rotate-45" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    {q?.explanation && (
                                                        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 text-right leading-relaxed break-words">{q.explanation}</p>
                                                    )}
                                                    <div className="pt-3 sm:pt-4 border-t dark:border-slate-700 flex items-center justify-between gap-2 text-[11px] sm:text-xs font-bold text-muted-foreground">
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <Clock className="w-3 h-3" />
                                                            {Math.round(qr.timeTaken)} ث
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <Zap className="w-3 h-3 text-amber-500" />
                                                            {qr.pointsEarned} نقطة
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <motion.div className="shrink-0 p-4 sm:p-6 pt-3 sm:pt-4 bg-slate-50 dark:bg-slate-800/80 border-t dark:border-slate-800 space-y-2.5 sm:space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                                    {canShareResult ? (
                                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-3">
                                        <Button
                                            onClick={handleWhatsAppShare}
                                            className="h-11 sm:h-14 rounded-xl sm:rounded-2xl text-sm sm:text-lg font-bold gap-1.5 sm:gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-2 sm:flex-1"
                                        >
                                            {whatsAppIcon}
                                            <span className="truncate sm:hidden">واتساب</span>
                                            <span className="truncate hidden sm:inline">مشاركة عبر واتساب</span>
                                        </Button>
                                        <Button
                                            onClick={handleShare}
                                            variant="outline"
                                            className="h-11 sm:h-14 rounded-xl sm:rounded-2xl text-sm sm:text-lg font-bold gap-1.5 sm:gap-2 px-2 sm:flex-1"
                                        >
                                            <Share2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                            مشاركة
                                        </Button>
                                    </div>
                                    ) : (
                                    <Button
                                        onClick={handleStartGame}
                                        variant="hero"
                                        className="w-full h-11 sm:h-14 rounded-xl sm:rounded-2xl text-sm sm:text-lg font-bold gap-2"
                                    >
                                        <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                                        إعادة التحدي
                                    </Button>
                                    )}
                                    <Button variant="ghost" onClick={() => setShowAnalysis(false)} className="w-full h-10 sm:h-12 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold">
                                        إغلاق
                                    </Button>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-br from-slate-50 via-indigo-50/30 to-pink-50/30 dark:from-slate-950 dark:via-indigo-950/20 dark:to-pink-950/20 relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                    backgroundSize: '40px 40px'
                }} />
            </div>

            {/* Floating gradient orbs */}
            <div className="absolute top-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

            {/* Music Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                    setMusicEnabled(prev => !prev);
                }}
                className={`fixed left-4 z-50 rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-2xl flex items-center justify-center hover:shadow-primary/50 transition-all ${
                    gameState === "intro"
                        ? "top-24 w-14 h-14"
                        : "top-4 w-14 h-14 max-sm:top-auto max-sm:bottom-4 max-sm:w-12 max-sm:h-12"
                }`}
            >
                <AnimatePresence mode="wait">
                    {musicEnabled ? (
                        <motion.div key="on" initial={{ rotate: -180, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 180, opacity: 0 }}>
                            <Volume2 className="w-6 h-6" />
                        </motion.div>
                    ) : (
                        <motion.div key="off" initial={{ rotate: 180, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -180, opacity: 0 }}>
                            <VolumeX className="w-6 h-6" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {gameState === "intro" && <Header />}
            <main className={`relative z-10 ${gameState === "intro" ? "pt-24 pb-16" : "pt-6 pb-16 max-sm:pb-24"}`}>
                <div className="container mx-auto px-4">
                    {gameState === "intro" && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8"
                        >
                            <Link
                                to={`/grade/${gradeId}/subject/${subjectId}/topic/${topicId}/challenge`}
                                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>تغيير نوع التحدي</span>
                            </Link>
                        </motion.div>
                    )}

                    <AnimatePresence mode="wait">
                        {gameState === "intro" && renderIntro()}
                        {gameState === "playing" && renderQuestion()}
                        {gameState === "results" && renderResults()}
                    </AnimatePresence>
                </div>
            </main>
            {gameState === "intro" && <Footer />}
        </div>
    );
};

export default SingleChallenge;
