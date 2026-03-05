import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
    ChevronLeft, Trophy, Zap, Clock, Star, Target,
    CheckCircle2, XCircle, RotateCcw, Home, Share2,
    ArrowLeft, ArrowRight, GripVertical, Sparkles, ArrowUp, ArrowDown,
    Volume2, VolumeX, Music, Trash2
} from "lucide-react";
import {
    useTopic,
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
    useSaveAnswers
} from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import {
    getWheelSubQuestion,
    getLevelFromScore,
    availableBadges,
    type ChallengeQuestion,
    type SinglePlayerResult,
    type Badge
} from "@/data/challengeTypes";
import { useSound } from "@/hooks/useSound";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type GameState = "intro" | "playing" | "results";

const SingleChallenge = () => {
    const { category, gradeId, subjectId, topicId } = useParams();
    const navigate = useNavigate();

    const { toast } = useToast();
    const { data: topic, isLoading } = useTopic(topicId || "");
    const content = topic;

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
    const [resultsSaved, setResultsSaved] = useState(false);

    const [gameState, setGameState] = useState<GameState>("intro");
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

    // Initialize sound system
    const { play, stop } = useSound(musicEnabled);

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

    const handleStartGame = () => {
        setGameState("playing");
        setCurrentIndex(0);
        setScore(0);
        setStreak(0);
        setLongestStreak(0);
        setQuestionResults([]);
        setTotalTime(0);
        setResultsSaved(false);

        // Start background music
        play('background');

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
        setQuestionResults(prev => [...prev, {
            questionId: currentQuestion.id,
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
            processAnswer(true, timeTaken);
        } else {
            // User says they don't know
            setShowResult(true);
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
        processAnswer(isCorrect, timeTaken);
    };

    const handleShare = () => {
        const results = getResults();
        const shareText = `لقد حصلت على ${results.score} نقطة بنسبة ${results.percentage}% في تحدي ${topic?.title || 'تحدي جديد'}! 🏆`;

        if (navigator.share) {
            navigator.share({
                title: 'نتيجة التحدي',
                text: shareText,
                url: window.location.href,
            }).catch(() => {
                navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
                toast({
                    title: "تم نسخ الرابط",
                    description: "يمكنك الآن مشاركته مع أصدقائك",
                });
            });
        } else {
            navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
            toast({
                title: "تم نسخ الرابط",
                description: "يمكنك الآن مشاركته مع أصدقائك",
            });
        }
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
        if (!currentUser?.id || !studentProfile?.id || !topicId || !content) return;

        const saveResults = async () => {
            try {
                setResultsSaved(true);
                const results = getResults();
                const subjectData = content.subject;

                // Skip DB save if there are no questions
                if (results.totalQuestions === 0) {
                    console.warn("No questions to save results for.");
                    stop('background');
                    play('achievement');
                    return;
                }
                // 0. Pre-check: Was this topic already completed?
                // This must happen BEFORE we save the new activity!
                console.log("[Save] Step 0: Checking for previous completions...");
                const { data: previousCompletions } = await supabase
                    .from("student_topic_activities")
                    .select("id")
                    .eq("student_id", studentProfile.id)
                    .eq("topic_id", topicId)
                    .eq("completed", true);

                const wasTopicAlreadyCompleted = (previousCompletions || []).length > 0;
                console.log("[Save] Was topic already completed?", wasTopicAlreadyCompleted);

                // 1. Create a challenge session
                console.log("[Save] Step 1: Creating challenge session...");
                const session = await createSessionMutation.mutateAsync({
                    topicId: topicId,
                    hostId: currentUser.id,
                    mode: "SINGLE",
                    category: (category || "mixed").toUpperCase(),
                });
                console.log("[Save] Step 1 complete. Session ID:", session.id);

                // 2. Save challenge result
                console.log("[Save] Step 2: Saving challenge result...");
                const savedResult = await saveResultMutation.mutateAsync({
                    sessionId: session.id,
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
                if (results.badges.length > 0) {
                    const badgeSlugs = results.badges
                        .filter(Boolean)
                        .map(b => b.id); // badge ids in challengeTypes map to slugs in DB
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
    }, [gameState, resultsSaved, currentUser?.id, studentProfile?.id, topicId, content]);

    // Calculate results
    const getResults = (): SinglePlayerResult => {
        const correctAnswers = questionResults.filter(r => r.correct).length;
        const totalQuestions = questions.length;
        const maxScore = questions.reduce((acc, q) => acc + q.points, 0);
        const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

        const earnedBadges: Badge[] = [];

        if (percentage === 100) {
            earnedBadges.push(availableBadges.find(b => b.id === "perfect")!);
        }
        if (percentage >= 90) {
            earnedBadges.push(availableBadges.find(b => b.id === "scholar")!);
        }
        if (longestStreak >= 5) {
            earnedBadges.push(availableBadges.find(b => b.id === "streak_master")!);
        }
        if (totalTime < 120) {
            earnedBadges.push(availableBadges.find(b => b.id === "quick_learner")!);
        }
        const avgTime = totalQuestions > 0 ? totalTime / totalQuestions : 0;
        if (avgTime < 3 && avgTime > 0) {
            earnedBadges.push(availableBadges.find(b => b.id === "speed_demon")!);
        }

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
            badges: earnedBadges.filter(Boolean),
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
                <Input
                    type="text"
                    placeholder="اكتب إجابتك هنا..."
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    disabled={showResult}
                    className="text-center text-lg h-14"
                    onKeyDown={(e) => e.key === "Enter" && handleQASubmit()}
                />
                {!showResult && (
                    <Button
                        onClick={handleQASubmit}
                        size="lg"
                        className="w-full"
                        disabled={!userAnswer.trim()}
                    >
                        إرسال الإجابة
                    </Button>
                )}

                {showResult && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
                        <div className="text-sm text-muted-foreground mb-1">إجابتك:</div>
                        <div className="text-lg font-bold mb-3">{userAnswer}</div>
                        <div className="text-sm text-muted-foreground mb-1">الإجابة النموذجية:</div>
                        <div className="text-lg font-bold text-green-600">{currentQuestion.correctAnswer as string}</div>
                    </div>
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
                <p className="text-muted-foreground mb-8">
                    سيتضمن هذا التحدي <strong>{questions.length}</strong> سؤال
                    <br />
                    أجب بسرعة للحصول على نقاط إضافية!
                </p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="p-4 rounded-xl bg-muted/50">
                        <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
                        <div className="text-sm text-muted-foreground">وقت محدد</div>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                        <Zap className="w-6 h-6 mx-auto mb-2 text-warning" />
                        <div className="text-sm text-muted-foreground">نقاط سرعة</div>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                        <Star className="w-6 h-6 mx-auto mb-2 text-secondary" />
                        <div className="text-sm text-muted-foreground">شارات</div>
                    </div>
                </div>

                <Button
                    onClick={handleStartGame}
                    size="lg"
                    variant="hero"
                    className="w-full gap-2 text-lg h-14"
                    disabled={questions.length === 0}
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
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                            {currentIndex + 1}/{questions.length}
                        </div>
                        <Progress value={progress} className="w-32 h-2" />
                    </div>

                    <div className="flex items-center gap-4">
                        {streak > 1 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/20 text-orange-500"
                            >
                                🔥 {streak}
                            </motion.div>
                        )}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
                            <Trophy className="w-4 h-4 text-primary" />
                            <span className="font-bold">{score}</span>
                        </div>
                    </div>
                </div>

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

                    <h3 className="text-xl md:text-2xl font-bold text-center mb-8">
                        {currentQuestion.question}
                    </h3>

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
                                        {currentQuestion.explanation && (
                                            <div className="text-sm text-muted-foreground mt-2">
                                                {currentQuestion.explanation}
                                            </div>
                                        )}
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
        const level = getLevelFromScore(results.percentage);

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-2xl mx-auto"
            >
                <Card className="p-8 md:p-12 text-center overflow-hidden relative">
                    {/* Confetti Effect */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
                    </div>

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
                        className="flex flex-wrap gap-4 justify-center relative z-20 pb-10"
                    >
                        <Button
                            onClick={handleStartGame}
                            variant="outline"
                            size="lg"
                            className="rounded-[2rem] px-10 h-16 text-lg border-2 font-bold transition-all hover:scale-105 active:scale-95 gap-3"
                        >
                            <RotateCcw className="w-5 h-5 text-primary" />
                            <span>إعادة التحدي</span>
                        </Button>

                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="rounded-[2rem] px-10 h-16 text-lg border-2 font-bold transition-all hover:scale-105 active:scale-95 gap-3"
                        >
                            <Link to={`/grade/${gradeId}/subject/${subjectId}/topic/${topicId}`} className="flex items-center">
                                <Home className="w-5 h-5 text-secondary" />
                                <span>المحتوى</span>
                            </Link>
                        </Button>

                        <Button
                            asChild
                            size="lg"
                            variant="hero"
                            className="rounded-[2rem] px-12 h-16 text-lg shadow-[0_20px_40px_-10px_rgba(var(--primary),0.4)] font-black transition-all hover:scale-105 active:scale-95 gap-3"
                        >
                            <Link to="/dashboard/student" className="flex items-center">
                                <Trophy className="w-5 h-5" />
                                <span>لوحة التحكم</span>
                            </Link>
                        </Button>

                        <Button
                            onClick={handleShare}
                            size="lg"
                            variant="outline"
                            className="rounded-[2rem] px-10 h-16 text-lg border-2 font-bold transition-all hover:scale-105 active:scale-95 gap-3"
                        >
                            <Share2 className="w-5 h-5 text-primary" />
                            <span>مشاركة</span>
                        </Button>
                    </motion.div>
                </Card>
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
                    setMusicEnabled(!musicEnabled);
                    if (!musicEnabled) {
                        play('background');
                    } else {
                        stop('background');
                    }
                }}
                className="fixed top-24 left-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-2xl flex items-center justify-center hover:shadow-primary/50 transition-all"
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

            <Header />
            <main className="pt-24 pb-16 relative z-10">
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
            <Footer />
        </div>
    );
};

export default SingleChallenge;
