import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    ChevronLeft, Trophy, Zap, Clock, Users, Crown,
    CheckCircle2, XCircle, Play, Copy, Share2, Check,
    Sparkles, Medal, Star, ArrowLeft, ArrowRight, Volume2, VolumeX,
    ArrowUp, ArrowDown, Music, Lock as LockIcon, Activity, Gamepad2,
    Calendar, RefreshCw, BarChart3
} from "lucide-react";
import {
    useTopic,
    useContentVisibilityFocus,
    useUser,
    useStudentProfile,
    useSaveTopicActivity,
    useUpsertSubjectProgress,
    useStudentSubjectProgress,
    useUpdateChallengeSession,
    useUpdatePlayerSession,
    useSaveChallengeResult,
    useUpdateStudentProfile,
    useStudentTopicActivities,
    useAwardBadges,
    useChallengeSession,
    useSaveAnswers,
    useSessionResults
} from "@/hooks/useDatabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
    resolveWheelSpinSoundUrl,
    WHEEL_SPIN_DURATION_MS,
    WHEEL_SPIN_DURATION_SEC,
    WHEEL_SPIN_EASE,
} from "@/lib/wheelSpinSounds";
import {
    getRandomAvatar,
    getWheelSubQuestion,
    getLevelFromScore,
    availableBadges,
    type ChallengeQuestion,
    type Player,
    type SinglePlayerResult,
    type Badge
} from "@/data/challengeTypes";
import { useSound } from "@/hooks/useSound";
import { useToast } from "@/hooks/use-toast";
import { supabase, publicClient } from "@/lib/supabase";
import { LessonEmojiRatingDialog } from "@/components/LessonEmojiRating";
import { QuestionAttachmentDisplay } from "@/components/QuestionAttachmentDisplay";
import { useMutation } from "@tanstack/react-query";
import { gradeMatchesContentFocus, routeGradeMatchesTopicGrade } from "@/lib/contentVisibility";
import { sessionHasScheduledFields } from "@/lib/teacherScheduledChallenge";
import { useHideFloatingChromeWhileActive } from "@/contexts/FloatingChromeContext";
import { useTranslation } from "@/contexts/LanguageContext";

type GamePhase = "lobby" | "countdown" | "playing" | "question_result" | "leaderboard" | "final_results";

const GroupChallenge = () => {
    const { category, pin, gradeId, subjectId, topicId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isHost = searchParams.get("host") === "true";
    const isCreator = searchParams.get("creator") === "true";
    const isScheduledHostUrl = searchParams.get("scheduled") === "1";
    const playerName = searchParams.get("name") || "لاعب";
    const { dir } = useTranslation();
    const ArrowBack = dir === "rtl" ? ArrowRight : ArrowLeft;
    const ArrowForward = dir === "rtl" ? ArrowLeft : ArrowRight;

    const effectiveCategory = category?.toUpperCase() || "ACTIVITIES";
    const [phase, setPhase] = useState<GamePhase>("lobby");
    useHideFloatingChromeWhileActive(phase !== "lobby");
    const { data: topic, isLoading: isLoadingTopic, error: topicError } = useTopic(topicId || "");
    const content = topic;
    const { focus } = useContentVisibilityFocus();
    const [currentIndex, setCurrentIndex] = useState(0);

    // Initialize/Sync Questions
    const questions = useMemo(() => {
        if (content && content.challengeItems?.length > 0) {
            let loaded = content.challengeItems;

            // Filter strictly by category type if possible, otherwise permit all questions to avoid empty challenges
            if (effectiveCategory === 'ACTIVITIES') {
                const filtered = loaded.filter(q => ["multiple_choice", "true_false", "qa", "know_dont_know", "order_questions", "short_answer"].includes(q.type));
                if (filtered.length > 0) loaded = filtered;
            } else if (effectiveCategory === 'GAMES') {
                const filtered = loaded.filter(q => ["matching", "shooting", "wheel_spin", "puzzle", "memory"].includes(q.type));
                if (filtered.length > 0) loaded = filtered;
            }

            return loaded;
        }
        return [];
    }, [content, effectiveCategory]);

    const currentQuestion = questions[currentIndex];
    const [timeLeft, setTimeLeft] = useState(0);
    const [countdown, setCountdown] = useState(3);
    const [selectedAnswer, setSelectedAnswer] = useState<number | string | null>(null);
    const [showQuestionResult, setShowQuestionResult] = useState(false);
    const [musicEnabled, setMusicEnabled] = useState(true);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const { data: currentUser, isLoading: isLoadingUser } = useUser();
    const { data: studentProfile } = useStudentProfile(currentUser?.id || "");

    const { data: sessionData, isLoading, refetch: refetchSession } = useChallengeSession(pin || "", {
        refetchInterval: isHost && isScheduledHostUrl ? 5000 : false,
    });
    const isScheduledSession = sessionHasScheduledFields(sessionData);
    const { data: sessionResults, isLoading: loadingSessionResults, refetch: refetchSessionResults } = useSessionResults(
        sessionData?.id || "",
        { refetchInterval: isHost && isScheduledSession ? 5000 : false }
    );
    const updateSessionMutation = useUpdateChallengeSession();
    const updatePlayerMutation = useUpdatePlayerSession();

    const soundOverrides = useMemo(() => ({
        correct: content?.correct_sound_url?.trim() || undefined,
        wrong: content?.wrong_sound_url?.trim() || undefined,
        background: content?.answering_background_sound_url?.trim() || undefined,
        wheel_spin: resolveWheelSpinSoundUrl(content?.wheel_spin_sound_url),
    }), [content?.correct_sound_url, content?.wrong_sound_url, content?.answering_background_sound_url, content?.wheel_spin_sound_url]);

    const { play, playWheelSpin, stop } = useSound(true, soundOverrides);

    // Mutation hooks for saving results
    const saveResultMutation = useSaveChallengeResult();
    const updateStudentProfileMutation = useUpdateStudentProfile();
    const saveTopicActivityMutation = useSaveTopicActivity();
    const upsertSubjectProgressMutation = useUpsertSubjectProgress();
    const { data: subjectProgress } = useStudentSubjectProgress(studentProfile?.id || "");
    const awardBadgesMutation = useAwardBadges();
    const saveAnswersMutation = useSaveAnswers();
    const { data: topicActivities } = useStudentTopicActivities(studentProfile?.id || "", 50);
    const [resultsSaved, setResultsSaved] = useState(false);
    const [lessonRatingOpen, setLessonRatingOpen] = useState(false);

    // Refs for synchronization
    const phaseRef = useRef(phase);
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    const currentIndexRef = useRef(currentIndex);
    useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
    const questionStartTimeRef = useRef<number | null>(null);
    const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
    useEffect(() => { questionStartTimeRef.current = questionStartTime; }, [questionStartTime]);

    // Game Logic States
    const [players, setPlayers] = useState<Player[]>([]);
    const [playerAnswers, setPlayerAnswers] = useState<Record<string, { answered: boolean, points: number, isCorrect: boolean }>>({});
    const [orderItems, setOrderItems] = useState<string[]>([]);
    const [matchedPairs, setMatchedPairs] = useState<{ leftIndex: number; rightIndex: number }[]>([]);
    const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
    const [shuffledRight, setShuffledRight] = useState<{ text: string; originalIndex: number }[]>([]);
    const [wheelRotation, setWheelRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [wheelResult, setWheelResult] = useState<number | null>(null);
    const [wheelSubQuestion, setWheelSubQuestion] = useState<any>(null);
    const [wheelPoints, setWheelPoints] = useState(0);
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
    const [revealStep, setRevealStep] = useState(0);
    const [userAnswer, setUserAnswer] = useState("");

    // Results & Analysis State
    const [userHistory, setUserHistory] = useState<{
        question: string;
        selectedAnswer: string;
        correctAnswer: string;
        isCorrect: boolean;
        points: number;
        timeTaken: number;
    }[]>([]);
    const [showAnalysis, setShowAnalysis] = useState(false);

    // Concurrency guards
    const isRoundEndingRef = useRef(false);

    // Auto-advance timer state for host
    const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(0);
    const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const currentPlayer = isHost ? null : players.find(p =>
        (currentUser?.id && p.userId === currentUser.id) ||
        (p.name?.trim().toLowerCase() === playerName?.trim().toLowerCase())
    );

    // 🧱 STABLE FUNCTIONS DEFINED BEFORE USE EFFECTS 🧱

    const handleRoundEnd = useCallback(async () => {
        // Guard against multiple simultaneous calls
        if (isRoundEndingRef.current) return;

        // If we are already showing results AND the database status is already RESULT, we can skip.
        if (showQuestionResult && sessionData?.status === 'RESULT') return;

        isRoundEndingRef.current = true;

        // INSTANT LOCAL FEEDBACK
        setShowQuestionResult(true);

        // HOST AUTHORITY: Broadcast the result state to the database
        if (isHost && sessionData?.pin) {
            try {
                // Force status to "RESULT" in the DB
                await supabase.from('challenge_sessions')
                    .update({ status: "RESULT", updated_at: new Date().toISOString() })
                    .eq('pin', sessionData.pin);
            } catch (error) {
                console.error("Failed to sync round end:", error);
            } finally {
                isRoundEndingRef.current = false;
            }
        } else {
            isRoundEndingRef.current = false;
        }

        // Student Local Reveal sound
        if (!isHost && currentPlayer) {
            const myAnswer = playerAnswers[currentPlayer.id];
            play(myAnswer?.isCorrect ? 'correct' : 'wrong');
        }
    }, [showQuestionResult, isHost, sessionData?.pin, sessionData?.status, currentPlayer, playerAnswers, play]);

    const startQuestion = useCallback((index: number) => {
        setPhase("playing");
        setCurrentIndex(index);
        const q = questions[index];

        setTimeLeft(q?.timeLimit || 20);
        setSelectedAnswer(null);
        setShowQuestionResult(false);
        setWheelResult(null);
        setWheelSubQuestion(null);
        setWheelPoints(0);
        setIsSpinning(false);
        setShowCorrectAnswer(false);
        setPlayerAnswers({});

        if (q?.type === "order_questions" && q.orderItems) {
            setOrderItems([...q.orderItems].sort(() => Math.random() - 0.5));
        }
        if (q?.type === "matching" && q.pairs) {
            const rightItems = q.pairs.map((p, i) => ({ text: p.right, originalIndex: i }));
            setShuffledRight(rightItems.sort(() => Math.random() - 0.5));
            setMatchedPairs([]);
            setSelectedLeft(null);
        }

        setUserAnswer("");
    }, [questions]);

    const handleStartGame = useCallback(async () => {
        if (isHost && sessionData?.pin) {
            await supabase.from('challenge_sessions').update({ status: "PLAYING", updated_at: new Date().toISOString() }).eq('pin', sessionData.pin);
            setQuestionStartTime(Date.now());
        }
        setPhase("countdown");
        setCountdown(3);
        play('background');
    }, [isHost, sessionData?.pin, play]);

    const handleTimeout = useCallback(() => {
        handleRoundEnd();
    }, [handleRoundEnd]);

    // Data Fetching & Sync
    useEffect(() => {
        if (!sessionData?.id) return;
        // تحدٍ مجدول + وضع فردي: لا نزامن مراحل الجماعي (كان يحوّل الشاشة من لوحة المتابعة إلى العدّ)
        if (isHost && sessionHasScheduledFields(sessionData)) {
            return;
        }

        const fetchState = async () => {
            const { data: pData } = await publicClient.from('player_sessions').select('*').eq('session_id', sessionData.id);
            if (pData) {
                setPlayers(pData.map(d => ({
                    id: d.id, userId: d.user_id, name: d.name, score: d.score,
                    correctAnswers: d.correct_answers, wrongAnswers: d.wrong_answers,
                    streak: d.streak, isHost: d.is_host, isOnline: d.is_online,
                    lastAnswerTime: d.last_answer_time ? Number(d.last_answer_time) : null,
                    avatar: d.avatar || getRandomAvatar(d.name)
                })));
            }

            const { data: sData } = await supabase.from('challenge_sessions').select('*').eq('id', sessionData.id).single();
            if (sData) {
                setPhase(prevPhase => {
                    if (sData.status === 'PLAYING') {
                        if ((prevPhase === 'playing' || prevPhase === 'countdown') && currentIndexRef.current === sData.current_question_index) return prevPhase;
                        setQuestionStartTime(Date.now());
                        setCurrentIndex(sData.current_question_index);
                        setShowQuestionResult(false);
                        setSelectedAnswer(null);
                        return 'countdown';
                    }
                    if (sData.status === 'RESULT') { setShowQuestionResult(true); return 'playing'; }
                    if (sData.status === 'LEADERBOARD') return 'leaderboard';
                    if (sData.status === 'FINISHED' && prevPhase !== 'final_results') return 'final_results';
                    return prevPhase;
                });

                // --- HOST-ONLY AUTO ADVANCE ---
                if (isHost && sData.status === 'PLAYING' && pData) {
                    const participants = pData.filter(p => !p.is_host);
                    if (participants.length > 0) {
                        const currentTag = sData.current_question_index + 1;
                        const answered = participants.filter(p => Number(p.last_answer_time) === currentTag);
                        if (answered.length >= participants.length) {
                            console.log(`[Host] Polling check: All players answered (${answered.length}/${participants.length}). Advancing...`);
                            handleRoundEnd();
                        }
                    }
                }
            }
        };

        fetchState();
        const pollInterval = setInterval(fetchState, isHost && (phaseRef.current === 'playing' || phaseRef.current === 'countdown') ? 1000 : 3000);

        const playersChannel = publicClient.channel(`session-players-${sessionData.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'player_sessions', filter: `session_id=eq.${sessionData.id}` }, payload => {
                if (payload.eventType === 'DELETE') {
                    setPlayers(prev => prev.filter(p => p.id !== (payload.old as any).id));
                } else if (payload.new) {
                    const u = payload.new as any;
                    const np: Player = {
                        id: u.id, userId: u.user_id, name: u.name, score: u.score,
                        correctAnswers: u.correct_answers, wrongAnswers: u.wrong_answers,
                        streak: u.streak, isHost: u.is_host, isOnline: u.is_online,
                        lastAnswerTime: u.last_answer_time ? Number(u.last_answer_time) : null,
                        avatar: u.avatar || getRandomAvatar(u.name)
                    };
                    setPlayers(prev => prev.some(p => p.id === u.id) ? prev.map(p => p.id === u.id ? np : p) : [...prev, np]);
                }
            }).subscribe();

        const sessionChannel = supabase.channel(`session-${sessionData.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'challenge_sessions', filter: `id=eq.${sessionData.id}` }, payload => {
                const ns = payload.new as any;
                if (!isHost) {
                    if (ns.status === 'PLAYING') {
                        setPhase(curr => {
                            if ((curr === 'playing' || curr === 'countdown') && currentIndexRef.current === ns.current_question_index) return curr;
                            setQuestionStartTime(Date.now());
                            setCurrentIndex(ns.current_question_index);
                            setShowQuestionResult(false);
                            setSelectedAnswer(null);
                            setCountdown(3);
                            return 'countdown';
                        });
                    }
                    if (ns.status === 'RESULT') { setShowQuestionResult(true); setPhase('playing'); }
                    if (ns.status === 'LEADERBOARD') setPhase('leaderboard');
                    if (ns.status === 'FINISHED' && phaseRef.current !== 'final_results') setPhase("final_results");
                }
            }).subscribe();

        return () => { clearInterval(pollInterval); publicClient.removeChannel(playersChannel); supabase.removeChannel(sessionChannel); };
    }, [sessionData?.id, isHost, questions, play]);

    // Auto-End Detection (Direct Database Sync Check)
    useEffect(() => {
        if (phase === "playing" && !isSpinning && players.length > 0) {
            const participants = players.filter(p => !p.isHost);
            if (participants.length === 0) return;

            const currentTag = currentIndex + 1;
            const answeredCount = participants.filter(p => Number(p.lastAnswerTime) === currentTag).length;

            if (answeredCount >= participants.length) {
                // INSTANT LOCAL RESPONSE: If everyone answered, show results locally immediately
                if (!showQuestionResult) {
                    console.log(`[Sync] Locally advancing: all ${answeredCount}/${participants.length} answered.`);
                    setShowQuestionResult(true);
                }

                // IF HOST: Broadcast the official status change to the database
                if (isHost && (!showQuestionResult || sessionData?.status === 'PLAYING')) {
                    handleRoundEnd();
                }
            }
        }
    }, [players, phase, showQuestionResult, isHost, isSpinning, currentIndex, handleRoundEnd, sessionData?.status]);

    // Timer Effect
    useEffect(() => {
        if (phase === "playing" && timeLeft > 0 && !showQuestionResult && !isSpinning) {
            if (timeLeft <= 5) play('countdown');
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && phase === "playing" && !showQuestionResult && !isSpinning) {
            handleTimeout();
        }
    }, [timeLeft, phase, showQuestionResult, isSpinning, play, handleTimeout]);

    useEffect(() => {
        if ((phase === "playing" || phase === "countdown") && musicEnabled) {
            play("background");
            return;
        }
        stop("background");
    }, [phase, musicEnabled, play, stop]);

    // Countdown Effect
    useEffect(() => {
        if (phase === "countdown" && countdown > 0) {
            play('countdown');
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0 && phase === "countdown") {
            startQuestion(currentIndex);
        }
    }, [countdown, phase, play, startQuestion, currentIndex]);

    const processAnswer = useCallback((isCorrect: boolean, customPoints?: number, providedAnswer?: any) => {
        if (!currentPlayer) return;

        // Score Decay: Max points if instant, down to 50% at limit time
        const now = Date.now();
        // The question starts exactly 3 seconds after the 'updated_at' timestamp
        const actualQuestionStartTime = questionStartTime ? questionStartTime + 3000 : now;
        const timeLimit = currentQuestion?.timeLimit || 20;

        let timeTakenSeconds = 0;
        let timeRatio = 0.5; // default if timer unknown

        if (questionStartTime && now >= actualQuestionStartTime) {
            const timeTakenMs = now - actualQuestionStartTime;
            timeTakenSeconds = Math.min(timeTakenMs / 1000, timeLimit); // Clamp to limit
            timeRatio = Math.max(0, 1 - (timeTakenSeconds / timeLimit));
        } else {
            // Fallback to local timer or early answer
            timeTakenSeconds = Math.max(0, timeLimit - timeLeft);
            timeRatio = Math.max(0, timeLeft / timeLimit);
        }

        const basePoints = customPoints !== undefined ? customPoints : (currentQuestion?.points || 100);
        const points = isCorrect ? Math.ceil(basePoints * (0.5 + 0.5 * timeRatio)) : 0;

        // Record history for personal analysis (Player only)
        const getAnswerText = (val: any) => {
            if (val === null || val === undefined) return 'لم تتم الإجابة';
            if (typeof val === 'number' && currentQuestion?.options) {
                return currentQuestion.options[val];
            }
            return String(val);
        };

        const finalAns = providedAnswer !== undefined ? providedAnswer : selectedAnswer;

        if (currentQuestion) {
            setUserHistory(prev => [...prev, {
                question: currentQuestion.question,
                selectedAnswer: finalAns !== null ? getAnswerText(finalAns) : (customPoints !== undefined ? (isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة') : 'انتهى الوقت'),
                correctAnswer: getAnswerText(currentQuestion.correctAnswer),
                isCorrect,
                points,
                timeTaken: Math.round(timeTakenSeconds)
            }]);
        }

        // IMPORTANT: Scoring is strictly deferred until handleRoundEnd
        setPlayerAnswers(prev => ({
            ...prev,
            [currentPlayer.id]: {
                answered: true,
                points, // stored locally for final host-side calculation
                isCorrect // stored locally 
            }
        }));

        // Send actual scores to DB but UI will keep them hidden until showQuestionResult is true
        if (!isHost) {
            try {
                updatePlayerMutation.mutate({
                    id: currentPlayer.id,
                    updates: {
                        score: (currentPlayer.score || 0) + points,
                        correct_answers: isCorrect ? (currentPlayer.correctAnswers || 0) + 1 : (currentPlayer.correctAnswers || 0),
                        wrong_answers: !isCorrect ? (currentPlayer.wrongAnswers || 0) + 1 : (currentPlayer.wrongAnswers || 0),
                        streak: isCorrect ? (currentPlayer.streak || 0) + 1 : 0,
                        last_answer_time: currentIndex + 1 // Use index instead of timestamp to fix clock drift
                    }
                });
            } catch (e) {
                console.error("Failed to sync answer progress", e);
            }
        }
    }, [currentPlayer, questionStartTime, currentQuestion, currentIndex, isHost, timeLeft, selectedAnswer, updatePlayerMutation]);

    const handleAnswerSelect = (answer: number | string) => {
        if (showQuestionResult || selectedAnswer !== null || isHost || !currentQuestion) return;
        setSelectedAnswer(answer);

        // Use loose equality to handle string/number comparison from DB
        const isCorrect = answer == currentQuestion.correctAnswer;

        play(isCorrect ? "correct" : "wrong");

        processAnswer(isCorrect, undefined, answer);
    };

    // Order Items logic
    const moveItem = (index: number, direction: "up" | "down") => {
        if (isHost) return;
        const newItems = [...orderItems];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newItems.length) return;
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        setOrderItems(newItems);
    };

    const submitOrder = () => {
        if (isHost) return;
        const isCorrect = orderItems.every((item, i) => item === currentQuestion.orderItems?.[i]);
        setSelectedAnswer(isCorrect ? "correct" : "wrong");
        play(isCorrect ? "correct" : "wrong");
        processAnswer(isCorrect, undefined, orderItems.join(" -> "));
    };

    // Matching logic
    const handleLeftSelect = (index: number) => {
        if (matchedPairs.some(p => p.leftIndex === index) || isHost) return;
        setSelectedLeft(index);
        play("click");
    };

    const handleRightSelect = (shuffledIdx: number) => {
        if (selectedLeft === null || isHost) return;
        const right = shuffledRight[shuffledIdx];
        if (matchedPairs.some(p => p.rightIndex === right.originalIndex)) return;

        if (selectedLeft === right.originalIndex) {
            const newPairs = [...matchedPairs, { leftIndex: selectedLeft, rightIndex: right.originalIndex }];
            setMatchedPairs(newPairs);
            play("match_pair");
            if (newPairs.length === currentQuestion.pairs?.length) {
                setSelectedAnswer("complete");
                play("correct");
                processAnswer(true, undefined, "جميع الأربطة صحيحة");
            }
        } else {
            play("match_wrong");
        }
        setSelectedLeft(null);
    };

    // Wheel Spin logic
    const spinWheel = () => {
        if (isSpinning) return;
        setIsSpinning(true);
        playWheelSpin();

        const segments = currentQuestion.wheelSegments;
        const labels = segments?.map(s => s.label) || currentQuestion.options || [];

        if (labels.length === 0) return;

        const resultIdx = Math.floor(Math.random() * labels.length);
        const rotation = 1800 + (360 - (resultIdx * (360 / labels.length)));
        setWheelRotation(rotation);

        setTimeout(() => {
            setIsSpinning(false);
            setWheelResult(resultIdx);

            let pointsForQuestion = 100;
            let subQ: any = null;

            if (segments && segments[resultIdx]) {
                const segment = segments[resultIdx];
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
                const resultText = labels[resultIdx];
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
        }, WHEEL_SPIN_DURATION_MS);
    };

    const handleWheelSubAnswer = (answerIdx: number) => {
        if (showQuestionResult || !wheelSubQuestion || isHost) return;
        setSelectedAnswer(answerIdx);
        const isCorrect = answerIdx === wheelSubQuestion.correctAnswer;
        play(isCorrect ? "correct" : "wrong");
        processAnswer(isCorrect, isCorrect ? wheelPoints : 0, answerIdx);
    };

    const handleKnowAnswer = (knows: boolean) => {
        if (showQuestionResult || isHost) return;

        setSelectedAnswer(knows ? 0 : 1);
        // setShowCorrectAnswer(true); // Don't show immediately

        if (knows) {
            // User says they know - they need to verify
            play("correct");
            processAnswer(true, undefined, "أعرف");
        } else {
            // User says they don't know
            play("wrong");
            processAnswer(false, undefined, "لا أعرف");
        }
    };



    const handleNextQuestion = async () => {
        if (!isHost) return;

        if (currentIndex < questions.length - 1) {
            if (sessionData?.pin) {
                try {
                    const { data: updated } = await supabase
                        .from('challenge_sessions')
                        .update({
                            current_question_index: currentIndex + 1,
                            status: "PLAYING",
                            updated_at: new Date().toISOString()
                        })
                        .eq('pin', sessionData.pin)
                        .select()
                        .single();

                    if (updated?.updated_at) {
                        setQuestionStartTime(Date.now());
                    }
                } catch (err) {
                    console.error("Failed to move to next question", err);
                }
            }
            // Local state will be updated by the listener/fetchState
            setPhase("countdown");
            setCountdown(3);
            setCurrentIndex(prev => prev + 1);
            setShowQuestionResult(false);
            setSelectedAnswer(null);
        } else {
            if (sessionData?.pin) {
                try {
                    await updateSessionMutation.mutateAsync({
                        pin: sessionData.pin,
                        updates: { status: "FINISHED" }
                    });
                } catch (err) {
                    console.error("Failed to finish session", err);
                }
            }
            setPhase("final_results");
        }
    };

    const handleShowLeaderboard = async () => {
        if (!isHost || !sessionData?.pin) return;
        try {
            await updateSessionMutation.mutateAsync({
                pin: sessionData.pin,
                updates: { status: "LEADERBOARD" }
            });
            setPhase("leaderboard");
        } catch (err) {
            console.error("Failed to show leaderboard", err);
        }
    };

    const handleCopyPin = () => {
        navigator.clipboard.writeText(pin || "");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Auto-Advance Timer Effect (Host Only)
    useEffect(() => {
        // Only run for host when question result is shown
        if (!isHost || !showQuestionResult || phase !== "playing") {
            setAutoAdvanceCountdown(0);
            if (autoAdvanceTimerRef.current) {
                clearInterval(autoAdvanceTimerRef.current);
                autoAdvanceTimerRef.current = null;
            }
            return;
        }

        // Start countdown from 5 seconds
        if (autoAdvanceCountdown === 0) {
            setAutoAdvanceCountdown(5);
        } else if (autoAdvanceCountdown > 0) {
            autoAdvanceTimerRef.current = setInterval(() => {
                setAutoAdvanceCountdown(prev => {
                    if (prev <= 1) {
                        // Auto-advance to next question
                        handleNextQuestion();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (autoAdvanceTimerRef.current) {
                clearInterval(autoAdvanceTimerRef.current);
                autoAdvanceTimerRef.current = null;
            }
        };
    }, [isHost, showQuestionResult, phase, autoAdvanceCountdown, handleNextQuestion]);

    // --- Save results to database when game ends ---
    useEffect(() => {
        if (phase !== "final_results" || resultsSaved) return;
        if (!currentUser?.id || !topicId || !content) return;

        const saveResults = async () => {
            try {
                setResultsSaved(true);

                // 1. If Host: Update session status to FINISHED
                if (isHost && pin) {
                    console.log("[Host] Updating session status to FINISHED...");
                    try {
                        await updateSessionMutation.mutateAsync({
                            pin: pin,
                            updates: { status: 'FINISHED' }
                        });
                        console.log("[Host] Session updated successfully to FINISHED.");
                    } catch (e) {
                        console.error("Host session update failed:", e);
                    }
                }

                // 2. Save challenge result for ALL participants (host AND players)
                if (currentUser?.id && topicId && content) {
                    console.log("[Save] Saving challenge results for user:", currentUser.id, "isHost:", isHost);
                    const results = getResults();
                    const subjectData = content.subject;

                    // Skip if no questions
                    if (results.totalQuestions === 0) {
                        console.warn("[Save] No questions found, skipping save.");
                        return;
                    }

                    // A: Resolve the real UUID session ID
                    let dbSessionId = sessionData?.id;
                    if (!dbSessionId && pin) {
                        const { data: fetchSession } = await supabase
                            .from('challenge_sessions')
                            .select('id')
                            .eq('pin', pin)
                            .single();
                        if (fetchSession?.id) {
                            dbSessionId = fetchSession.id;
                        }
                    }

                    if (!dbSessionId) {
                        console.error("[Save] Could not find a valid database session ID. Aborting save.");
                        return;
                    }

                    // B: Build enriched question results with full answer details
                    // (We embed answers in questionResults JSONB instead of challenge_answers table
                    //  because challenge_answers.question_id is UUID but our questions use numeric IDs)
                    const enrichedQuestionResults = userHistory.map((h, index) => ({
                        questionIndex: index,
                        questionId: questions[index]?.id || index,
                        questionText: h.question,
                        correct: h.isCorrect,
                        timeTaken: h.timeTaken,
                        pointsEarned: h.points,
                        userAnswer: h.selectedAnswer,
                        correctAnswer: h.correctAnswer,
                    }));

                    console.log("[Save] Step 1: Saving challenge result with", enrichedQuestionResults.length, "answers...");
                    const savedResult = await saveResultMutation.mutateAsync({
                        sessionId: dbSessionId,
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
                        questionResults: enrichedQuestionResults,
                    });
                    console.log("[Save] Step 1 complete. Result ID:", savedResult.id);

                    // C: Log topic activity & update student profile (only if student)
                    if (studentProfile?.id) {
                        try {
                            // Log topic activity
                            await saveTopicActivityMutation.mutateAsync({
                                studentProfileId: studentProfile.id,
                                topicId: topicId,
                                topicTitle: content.title || "تحدي جماعي",
                                score: results.percentage,
                                completed: results.percentage >= 50,
                            });
                            console.log("[Save] Step 2: Topic activity logged.");

                            // Recalculate student profile stats
                            const { data: allCompletions } = await supabase
                                .from("student_topic_activities")
                                .select("topic_id")
                                .eq("student_id", studentProfile.id)
                                .eq("completed", true);

                            const completedTopicIds = [...new Set((allCompletions || []).map(c => c.topic_id))];
                            const newTotalCompletedCount = completedTopicIds.length;
                            const newPoints = (studentProfile.total_points || 0) + results.score;
                            const newChallenges = (studentProfile.total_challenges || 0) + 1;
                            const oldTotal = studentProfile.total_challenges || 0;
                            const oldAvg = studentProfile.average_score || 0;
                            const newAvg = ((oldAvg * oldTotal) + results.percentage) / (oldTotal + 1);

                            await updateStudentProfileMutation.mutateAsync({
                                studentProfileId: studentProfile.id,
                                updates: {
                                    totalPoints: newPoints,
                                    totalChallenges: newChallenges,
                                    completedTopics: newTotalCompletedCount,
                                    averageScore: Math.round(newAvg * 100) / 100,
                                },
                            });
                            console.log("[Save] Step 3: Student profile updated. Completed:", newTotalCompletedCount);

                            // Update subject progress
                            if (subjectData?.id) {
                                try {
                                    const { data: subjectTopics } = await supabase
                                        .from("topics")
                                        .select("id")
                                        .eq("subject_id", subjectData.id);

                                    const subjectTopicIds = (subjectTopics || []).map(t => t.id);
                                    const subjectCompletedCount = completedTopicIds.filter(id => subjectTopicIds.includes(id)).length;

                                    const currentProgress = (subjectProgress || []).find((p: any) =>
                                        String(p.subject_id).toLowerCase() === String(subjectData.id).toLowerCase()
                                    );
                                    const existingAvg = Number(currentProgress?.average_score || 0);
                                    const subjectNewAvg = existingAvg > 0
                                        ? ((existingAvg * 2) + results.percentage) / 3
                                        : results.percentage;

                                    await upsertSubjectProgressMutation.mutateAsync({
                                        studentProfileId: studentProfile.id,
                                        subjectId: subjectData.id,
                                        completedTopics: subjectCompletedCount,
                                        totalTopics: Math.max(subjectTopicIds.length, 1),
                                        averageScore: Math.round(subjectNewAvg * 100) / 100,
                                    });
                                    console.log("[Save] Step 4: Subject progress updated.", subjectCompletedCount, "/", subjectTopicIds.length);
                                } catch (e) {
                                    console.error("[Save] Step 4 failed (subject progress):", e);
                                }
                            }
                        } catch (e) {
                            console.error("[Save] Student profile steps failed:", e);
                        }
                    }

                    toast({
                        title: "تم حفظ النتيجة ✅",
                        description: `حصلت على ${results.score} نقطة بنسبة ${results.percentage}%`,
                    });
                }
            } catch (error) {
                console.error("[Save] Failed to save group challenge results:", error);
            }
        };

        saveResults();
    }, [phase, resultsSaved, currentUser?.id, topicId, content, studentProfile?.id, subjectProgress]);

    useEffect(() => {
        if (phase === "final_results" && topicId) {
            const timer = setTimeout(() => setLessonRatingOpen(true), 6500);
            return () => clearTimeout(timer);
        }
        setLessonRatingOpen(false);
    }, [phase, topicId]);

    // Handle animations sequentially when arriving at final results
    useEffect(() => {
        if (phase === "final_results") {
            const timer1 = setTimeout(() => setRevealStep(1), 1000); // 3rd place
            const timer2 = setTimeout(() => setRevealStep(2), 2500); // 2nd place
            const timer3 = setTimeout(() => setRevealStep(3), 4500); // 1st place
            const timer4 = setTimeout(() => setRevealStep(4), 6500); // Others & Buttons
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
                clearTimeout(timer4);
            };
        } else {
            setRevealStep(0);
        }
    }, [phase]);

    // Calculate results for the current player
    const getResults = (): SinglePlayerResult => {
        const myPlayer = currentPlayer;
        const correctAnswers = myPlayer?.correctAnswers || 0;
        const totalQuestions = questions.length;
        const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        const totalScore = myPlayer?.score || 0;

        // Simplified for group
        return {
            totalQuestions,
            correctAnswers,
            wrongAnswers: totalQuestions - correctAnswers,
            score: totalScore,
            maxScore: questions.reduce((acc, q) => acc + q.points, 0),
            percentage,
            timeTaken: userHistory.reduce((acc, h) => acc + h.timeTaken, 0),
            averageTimePerQuestion: userHistory.length > 0 ? userHistory.reduce((acc, h) => acc + h.timeTaken, 0) / userHistory.length : 0,
            longestStreak: myPlayer?.streak || 0,
            accuracy: percentage,
            questionResults: userHistory.map((h, i) => ({
                questionId: i,
                correct: h.isCorrect,
                timeTaken: h.timeTaken,
                pointsEarned: h.points
            })),
            badges: [], // Could implement badge awarding here too
            level: getLevelFromScore(percentage).level
        };
    };

    const rankedPlayers = useMemo(() => {
        return [...players].sort((a, b) => b.score - a.score).map((p, i) => ({ ...p, rank: i + 1 }));
    }, [players]);

    /** لا نقرر «غير متاح» قبل انتهاء جلب المستخدم؛ وإلا لا يُطابق host_id ويُحجب المعلم لثوانٍ */
    const sessionHostIdForWait = (sessionData as { host_id?: string } | null | undefined)?.host_id;
    const awaitUserToResolveHost =
        !!pin &&
        pin.length === 6 &&
        !!sessionHostIdForWait &&
        isLoadingUser;

    if (isLoading || isLoadingTopic || awaitUserToResolveHost) {
        return (
            <div className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full p-10 rounded-[3rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 shadow-2xl relative overflow-hidden"
                >
                    {/* Animated background pulse */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-30 animate-pulse" />

                    <div className="relative z-10">
                        <div className="relative w-24 h-24 mx-auto mb-8">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border-4 border-primary/10 border-t-primary rounded-full"
                            />
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-4 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg"
                            >
                                <Gamepad2 className="w-8 h-8 text-white" />
                            </motion.div>
                        </div>

                        <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-3">جاري التحميل</h2>
                        <p className="text-muted-foreground font-medium mb-8">نجهز لك غرفتك التنافسية، لحظات من فضلك...</p>

                        {/* Custom Loading Bar */}
                        <div className="w-full h-2.5 bg-primary/10 rounded-full overflow-hidden border border-primary/5">
                            <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="h-full bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-gradient-x"
                            />
                        </div>

                        <div className="mt-6 flex justify-center gap-2">
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        y: [0, -6, 0],
                                        opacity: [0.3, 1, 0.3]
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        delay: i * 0.15
                                    }}
                                    className="w-2 h-2 rounded-full bg-primary"
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>

                <p className="mt-8 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest animate-pulse">
                    Education Ministry Dashboard • Live Sync
                </p>
            </div>
        );
    }

    if (topicError) {
        return (
            <div className="min-h-screen font-cairo bg-background flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-3xl font-bold mb-4 text-red-500">حدث خطأ أثناء جلب البيانات</h1>
                <p className="text-muted-foreground mb-6 max-w-md">{topicError.message}</p>
                <Button asChild>
                    <Link to="/join">العودة لشاشة الانضمام</Link>
                </Button>
            </div>
        );
    }

    if (!content) {
        return (
            <div className="min-h-screen font-cairo bg-background flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-3xl font-bold mb-4">المحتوى غير موجود</h1>
                <p className="text-muted-foreground mb-6 max-w-md">قد يكون الرابط غير صحيح أو أن التحدي غير متوفر حالياً.</p>
                <Button asChild>
                    <Link to="/join">العودة لشاشة الانضمام</Link>
                </Button>
            </div>
        );
    }

    const visibilityGrade = (content as any)?.subject?.grade;
    /** المعلم: من الرابط (?host / ?creator) أو نفس حساب مضيف الجلسة حتى لو نسخ الرابط بدون معاملات */
    const sessionHostId = (sessionData as { host_id?: string } | null | undefined)?.host_id;
    const isLoggedInAsSessionHost =
        !!currentUser?.id &&
        !!sessionHostId &&
        String(currentUser.id) === String(sessionHostId);
    const isTeacherChallengeControl = isHost || isCreator || isLoggedInAsSessionHost;
    /** انضمام برمز من صفحة «انضم للتحدي» — جلسة محمّلة؛ ليس تصفّحاً عشوائياً للمواد */
    const isJoiningWithValidSession =
        !!pin && pin.length === 6 && !!(sessionData as { id?: string } | null | undefined)?.id;
    const canSeeChallengeContent = isTeacherChallengeControl || isJoiningWithValidSession;
    const allowTopicRouteVisibilityBypass = routeGradeMatchesTopicGrade(gradeId, visibilityGrade);
    if (
        visibilityGrade &&
        !gradeMatchesContentFocus(visibilityGrade, focus) &&
        !canSeeChallengeContent &&
        !allowTopicRouteVisibilityBypass
    ) {
        return (
            <div className="min-h-screen font-cairo bg-background flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-3xl font-bold mb-4">المحتوى غير متاح</h1>
                <p className="text-muted-foreground mb-6 max-w-md">هذا المحتوى غير معروض حالياً على المنصة.</p>
                <Button asChild>
                    <Link to="/grades">العودة للصفوف</Link>
                </Button>
            </div>
        );
    }

    // Render Wheel
    const renderWheel = () => {
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
                        transition={{ duration: WHEEL_SPIN_DURATION_SEC, ease: WHEEL_SPIN_EASE }}
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
                        onClick={spinWheel}
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
                                    if (showQuestionResult) {
                                        if (isCorrect) btnClass += "border-green-500 bg-green-500/10 text-green-700";
                                        else if (isSelected) btnClass += "border-red-500 bg-red-500/10 text-red-700";
                                        else btnClass += "opacity-50 border-border";
                                    } else {
                                        if (isSelected) btnClass += "border-primary bg-primary/20 ring-2 ring-primary ring-offset-2";
                                        else if (selectedAnswer !== null) btnClass += "opacity-50 grayscale";
                                        else btnClass += "border-border hover:border-primary hover:bg-primary/5";
                                    }

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleWheelSubAnswer(i)}
                                            disabled={showQuestionResult || selectedAnswer !== null}
                                            className={btnClass}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${showQuestionResult && isCorrect ? "bg-green-500 text-white" : "bg-muted"
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
                                    whileHover={!showQuestionResult && !isMatched ? { scale: 1.02 } : {}}
                                    whileTap={!showQuestionResult && !isMatched ? { scale: 0.98 } : {}}
                                    onClick={() => handleLeftSelect(index)}
                                    disabled={showQuestionResult || isMatched || selectedAnswer !== null}
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
                                    whileHover={!showQuestionResult && !isMatched && selectedLeft !== null ? { scale: 1.02 } : {}}
                                    whileTap={!showQuestionResult && !isMatched ? { scale: 0.98 } : {}}
                                    onClick={() => handleRightSelect(shuffledIndex)}
                                    disabled={showQuestionResult || isMatched || selectedLeft === null || selectedAnswer !== null}
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
                    const isCorrectPosition = showQuestionResult && item === correctItems[index];

                    return (
                        <motion.div
                            key={`order-${index}`}
                            layout
                            className={`p-4 rounded-xl border-2 flex items-center gap-3 ${showQuestionResult
                                ? isCorrectPosition
                                    ? "border-green-500 bg-green-500/10"
                                    : "border-red-500 bg-red-500/10"
                                : "border-border"
                                }`}
                        >
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${showQuestionResult
                                ? isCorrectPosition
                                    ? "bg-green-500 text-white"
                                    : "bg-red-500 text-white"
                                : "bg-muted"
                                }`}>
                                {index + 1}
                            </span>

                            <span className="flex-1 text-right">{item}</span>

                            {!showQuestionResult && (
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => moveItem(index, 'up')}
                                        disabled={index === 0 || selectedAnswer !== null}
                                        className="p-1 rounded hover:bg-muted disabled:opacity-30"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => moveItem(index, 'down')}
                                        disabled={index === orderItems.length - 1 || selectedAnswer !== null}
                                        className="p-1 rounded hover:bg-muted disabled:opacity-30"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {showQuestionResult && (
                                <span className="text-xs">
                                    {isCorrectPosition ? "✓" : `الصحيح: ${correctItems.indexOf(item) + 1}`}
                                </span>
                            )}
                        </motion.div>
                    );
                })}

                {!showQuestionResult && (
                    <Button
                        onClick={submitOrder}
                        className="w-full mt-4"
                        size="lg"
                        disabled={selectedAnswer !== null}
                    >
                        {selectedAnswer !== null ? (
                            <>
                                <Clock className="w-4 h-4 mr-2 animate-pulse" />
                                بانتظار النتائج...
                            </>
                        ) : "تأكيد الترتيب"}
                    </Button>
                )}
            </div>
        );
    };

    // Render Know/Dont Know
    const renderKnowDontKnow = () => {
        return (
            <div className="space-y-6">
                {!showQuestionResult ? (
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



                {/* Show correct answer ONLY after result phase */}
                {(showQuestionResult || showCorrectAnswer) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-xl bg-primary/10 border border-primary/30"
                    >
                        <div className="text-sm text-primary mb-2 font-medium">الإجابة الصحيحة:</div>
                        <div className="text-lg font-bold">
                            {currentQuestion.correctAnswer as string}
                        </div>
                    </motion.div>
                )}
            </div>
        );
    };

    // Render Q&A (Open Answer)
    const renderQA = () => {
        const isAnswered = selectedAnswer !== null;

        return (
            <div className="space-y-4 max-w-lg mx-auto">
                <Textarea
                    placeholder="اكتب إجابتك هنا..."
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    disabled={showQuestionResult || isAnswered || isHost}
                    className="text-lg p-4 min-h-[120px] text-right resize-none border-2 focus:border-primary"
                />
                {!showQuestionResult && !isAnswered && !isHost && (
                    <Button
                        onClick={() => {
                            if (!userAnswer.trim()) return;
                            const isCorrect = userAnswer.trim().toLowerCase() === String(currentQuestion.correctAnswer || "").trim().toLowerCase();
                            setSelectedAnswer(userAnswer);
                            play(isCorrect ? "correct" : "wrong");
                            processAnswer(isCorrect, undefined, userAnswer);
                        }}
                        className="w-full h-14 text-lg shadow-lg"
                        disabled={!userAnswer.trim()}
                    >
                        إرسال الإجابة
                    </Button>
                )}
                
                {showQuestionResult && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 rounded-2xl bg-primary/5 border-2 border-primary/20"
                    >
                        <p className="text-sm font-bold text-primary mb-2">الإجابة المتوقعة:</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">
                            {currentQuestion.correctAnswer as string}
                        </p>
                    </motion.div>
                )}
            </div>
        );
    };

    /** تحدٍ مجدول يُلعب كفردي (SingleChallenge): المنضمون من player_sessions، النتائج من challenge_results */
    const renderScheduledHostMonitor = () => {
        const sd = sessionData as {
            scheduled_start_time?: string;
            scheduled_end_time?: string | null;
            scheduledStartTime?: string;
            scheduledEndTime?: string | null;
            players?: Array<{
                id: string;
                name: string;
                joined_at?: string;
                is_host?: boolean;
                user?: {
                    details?: string | null;
                    student_profiles?:
                        | { grade?: { name?: string | null } | null }
                        | Array<{ grade?: { name?: string | null } | null }>
                        | null;
                } | null;
            }>;
        } | null;

        if (isLoading || !sd) {
            return (
                <motion.div
                    key="scheduled-host-skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-3xl mx-auto px-4 pt-8"
                >
                    <Card className="p-10">
                        <Skeleton className="h-10 w-2/3 mx-auto mb-6" />
                        <Skeleton className="h-32 w-full rounded-xl" />
                    </Card>
                </motion.div>
            );
        }

        const startRaw = sd.scheduled_start_time ?? sd.scheduledStartTime;
        const endRaw = sd.scheduled_end_time ?? sd.scheduledEndTime;
        const start = startRaw ? new Date(startRaw) : null;
        const end = endRaw ? new Date(endRaw) : null;
        const now = new Date();
        const inWindow = !!(start && now >= start && (!end || now <= end));
        const beforeStart = !!(start && now < start);
        const afterEnd = !!(end && now > end);

        const resultsFromDb = (sessionResults || []) as Array<{
            id: string;
            user_id?: string;
            percentage: number;
            score: number;
            time_taken?: number;
            created_at?: string;
            user?: { id?: string; name?: string; avatar?: string | null };
        }>;

        const joiners = (sd.players || []).filter((p) => !p.is_host);

        /** صفوف challenge_results؛ نستبعد من «player_sessions» من لهم نفس user_id حتى لا نكرر */
        const resultUserIds = new Set(
            resultsFromDb
                .map((r) => r.user_id || r.user?.id)
                .filter((id): id is string => !!id)
        );

        const fromPlayerSessionsOnly = joiners
            .filter((p) => {
                const ca = (p as { correct_answers?: number }).correct_answers ?? 0;
                const wa = (p as { wrong_answers?: number }).wrong_answers ?? 0;
                const played = ca + wa > 0 || ((p as { score?: number }).score ?? 0) > 0;
                if (!played) return false;
                const uid = (p as { user_id?: string | null }).user_id;
                if (uid && resultUserIds.has(uid)) return false;
                return true;
            })
            .map((p) => {
                const ca = (p as { correct_answers?: number }).correct_answers ?? 0;
                const wa = (p as { wrong_answers?: number }).wrong_answers ?? 0;
                const pct = ca + wa > 0 ? Math.round((ca / (ca + wa)) * 100) : 0;
                return {
                    id: `ps-${p.id}`,
                    percentage: pct,
                    score: (p as { score?: number }).score ?? 0,
                    time_taken: 0,
                    created_at: (p as { joined_at?: string }).joined_at,
                    user: { name: p.name, avatar: null as string | null },
                };
            });

        const results = [...resultsFromDb, ...fromPlayerSessionsOnly].sort(
            (a, b) => (b.percentage ?? 0) - (a.percentage ?? 0)
        );

        const gradeLabelForScheduledPlayer = (p: (typeof joiners)[number]) => {
            const sp = p.user?.student_profiles;
            const row = Array.isArray(sp) ? sp[0] : sp;
            const n = row?.grade?.name;
            if (typeof n === "string" && n.trim()) return n.trim();
            const d = p.user?.details;
            if (typeof d === "string" && d.trim()) return d.trim();
            return "—";
        };

        return (
            <motion.div
                key="scheduled-host-monitor"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto px-4 pt-6 pb-12"
            >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/dashboard/teacher")}>
                        <ArrowBack className="w-4 h-4" />
                        لوحة المعلم
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                            void refetchSessionResults();
                            void refetchSession();
                        }}
                    >
                        <RefreshCw className="w-4 h-4" />
                        تحديث القائمة
                    </Button>
                </div>

                <Card className="overflow-hidden border-2 border-primary/15 shadow-lg">
                    <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-6 md:p-8 border-b border-border/60">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <Badge className="bg-blue-600 hover:bg-blue-600">
                                        <Calendar className="w-3 h-3 ml-1" />
                                        تحدي مجدول
                                    </Badge>
                                    {beforeStart && (
                                        <Badge variant="secondary">لم يبدأ الموعد بعد</Badge>
                                    )}
                                    {inWindow && (
                                        <Badge className="bg-emerald-600 hover:bg-emerald-600 animate-pulse">النافذة مفتوحة — يمكن اللعب</Badge>
                                    )}
                                    {afterEnd && (
                                        <Badge variant="destructive">انتهت فترة الانضمام</Badge>
                                    )}
                                </div>
                                <h1 className="text-2xl md:text-3xl font-black mb-1">{content?.title || "التحدي"}</h1>
                                <p className="text-sm text-muted-foreground">
                                    يظهر أدناه من انضم برمز التحدي (بعد إدخال الاسم)، ثم من أتم اللعب وسُجّلت نتيجته.
                                </p>
                            </div>
                            <div
                                className="text-center bg-card/80 backdrop-blur px-5 py-3 rounded-2xl border border-primary/20 cursor-pointer"
                                onClick={handleCopyPin}
                                title="نسخ الرمز"
                            >
                                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">رمز الانضمام</span>
                                <span className="text-3xl font-mono font-black text-primary tracking-widest" dir="ltr">{pin}</span>
                            </div>
                        </div>

                        <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
                            {start && (
                                <div className="flex items-center gap-2 rounded-xl bg-background/80 border px-4 py-3">
                                    <Clock className="w-4 h-4 text-primary shrink-0" />
                                    <div>
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase">يبدأ</div>
                                        <div className="font-bold">{start.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</div>
                                    </div>
                                </div>
                            )}
                            {end && (
                                <div className="flex items-center gap-2 rounded-xl bg-background/80 border px-4 py-3">
                                    <Clock className="w-4 h-4 text-destructive shrink-0" />
                                    <div>
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase">ينتهي</div>
                                        <div className="font-bold">{end.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-2xl border bg-muted/30 p-4 text-center">
                                <div className="text-3xl font-black text-primary">{joiners.length}</div>
                                <div className="text-xs font-bold text-muted-foreground mt-1">انضموا بالرمز</div>
                            </div>
                            <div className="rounded-2xl border bg-muted/30 p-4 text-center">
                                <div className="text-3xl font-black text-emerald-600">{results.length}</div>
                                <div className="text-xs font-bold text-muted-foreground mt-1">سجّلوا نتيجة</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 border-b pb-2">
                            <Users className="w-5 h-5 text-primary" />
                            <h2 className="font-black text-lg">المنضمون</h2>
                        </div>

                        {joiners.length === 0 ? (
                            <div className="text-center py-10 rounded-2xl border border-dashed bg-muted/20">
                                <p className="font-bold text-muted-foreground">لم ينضم أحد بعد</p>
                                <p className="text-sm text-muted-foreground mt-1">بعد إدخال الرمز والاسم يظهر الطالب هنا مع وقت الانضمام.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {joiners.map((p, idx) => (
                                    <div
                                        key={p.id}
                                        className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border bg-card"
                                    >
                                        <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-black flex items-center justify-center shrink-0">
                                            {idx + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold truncate">{p.name}</div>
                                            <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                                                <span>
                                                    الصف:{" "}
                                                    <span className="font-semibold text-foreground/80">
                                                        {gradeLabelForScheduledPlayer(p)}
                                                    </span>
                                                </span>
                                                {p.joined_at && (
                                                    <span>
                                                        الانضمام:{" "}
                                                        {new Date(p.joined_at).toLocaleString("ar-EG", {
                                                            dateStyle: "short",
                                                            timeStyle: "short",
                                                        })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-2 border-b pb-2 pt-2">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            <h2 className="font-black text-lg">النتائج المسجّلة</h2>
                        </div>

                        {loadingSessionResults ? (
                            <div className="space-y-3">
                                <Skeleton className="h-16 w-full rounded-xl" />
                                <Skeleton className="h-16 w-full rounded-xl" />
                            </div>
                        ) : results.length === 0 ? (
                            <div className="text-center py-14 rounded-2xl border border-dashed bg-muted/20">
                                <Users className="w-14 h-14 mx-auto mb-3 text-muted-foreground/40" />
                                <p className="font-bold text-muted-foreground">لا توجد نتائج بعد</p>
                                <p className="text-sm text-muted-foreground mt-1">عندما يُكمل الطلاب التحدي ستظهر أسماؤهم ودرجاتهم هنا.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {results.map((r, idx) => (
                                    <div
                                        key={r.id}
                                        className="flex flex-wrap items-center gap-4 p-4 rounded-2xl border bg-card hover:border-primary/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-black flex items-center justify-center shrink-0">
                                                {idx + 1}
                                            </span>
                                            <img
                                                src={r.user?.avatar || getRandomAvatar(r.user?.name || "?")}
                                                alt=""
                                                className="w-11 h-11 rounded-full border bg-muted"
                                            />
                                            <div className="min-w-0">
                                                <div className="font-bold truncate">{r.user?.name || "طالب"}</div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {r.created_at
                                                        ? `أُرسل في ${new Date(r.created_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}`
                                                        : "—"}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 ms-auto">
                                            <div className="text-center">
                                                <div className="text-2xl font-black text-primary leading-none">{Math.round(r.percentage ?? 0)}%</div>
                                                <div className="text-[10px] text-muted-foreground font-bold">الدقة</div>
                                            </div>
                                            <div className="text-center min-w-[4rem]">
                                                <div className="font-bold flex items-center gap-1 justify-center text-muted-foreground">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {String(r.id).startsWith("ps-")
                                                        ? "—"
                                                        : `${Math.round(r.time_taken ?? 0)}ث`}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">الوقت</div>
                                            </div>
                                            <Trophy className="w-5 h-5 text-amber-500 hidden sm:block" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </motion.div>
        );
    };

    // Lobby Phase
    const renderLobby = () => {
        if (isHost && isScheduledSession && sessionData) {
            return renderScheduledHostMonitor();
        }

        // If not a host/creator, show the student's "You're in!" waiting screen
        if (!isHost && !isCreator) {
            return (
                <motion.div
                    key="lobby-student"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="max-w-2xl mx-auto text-center px-4"
                >
                    <Card className="p-8 md:p-12 relative overflow-hidden">
                        {/* Decorative background for student */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/5 rounded-full -ml-16 -mb-16 blur-2xl" />
                        <div className="relative z-10 flex justify-center mb-6">
                            <img src="/logo.png" alt="Lab4" className="w-16 h-16 rounded-xl object-contain bg-background p-1 shadow-sm border" />
                        </div>

                        {!currentPlayer ? (
                            <div className="py-12 flex flex-col items-center">
                                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6" />
                                <h2 className="text-xl font-bold text-muted-foreground animate-pulse">
                                    {sessionData ? "جاري الانضمام للتحدي..." : "جاري الاتصال بالتحدي..."}
                                </h2>
                                <p className="text-sm mt-2 font-medium text-muted-foreground/80">
                                    {sessionData
                                        ? `يتم البحث عن ${playerName} في قائمة المتسابقين`
                                        : "تأكد من إدخال الرمز الصحيح"}
                                </p>
                            </div>
                        ) : (
                            <>
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", damping: 15, delay: 0.1 }}
                                    className="w-24 h-24 mx-auto rounded-full bg-green-500 flex items-center justify-center mb-8 shadow-lg shadow-green-500/30 relative z-10"
                                >
                                    <CheckCircle2 className="w-12 h-12 text-white" />
                                </motion.div>

                                <motion.h2
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-4xl font-black mb-4 text-slate-800 dark:text-white relative z-10"
                                >
                                    أنت في اللعبة!
                                </motion.h2>

                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-lg text-muted-foreground mb-8 relative z-10 font-bold"
                                >
                                    انظر إلى شاشة المعلم
                                </motion.p>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="relative z-10 bg-card p-4 rounded-xl shadow-sm border-2 border-primary/10"
                                >
                                    <p className="text-sm font-bold text-muted-foreground mb-2">اسمك في التحدي:</p>
                                    <p className="text-2xl font-black text-primary">{playerName}</p>
                                </motion.div>

                                {/* Waiting indicator */}
                                <motion.div
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="mt-8 relative z-10 flex flex-col items-center gap-2"
                                >
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                    <span className="text-sm font-bold text-muted-foreground mt-2">في انتظار بدء التحدي...</span>
                                </motion.div>

                                {/* Live Players List for Students */}
                                <div className="mt-12 pt-8 border-t border-primary/10">
                                    <div className="flex items-center justify-center gap-2 mb-6">
                                        <Users className="w-4 h-4 text-primary" />
                                        <h3 className="text-sm font-bold">المشاركون الآن ({players.length})</h3>
                                    </div>

                                    <div className="flex flex-wrap justify-center gap-3">
                                        <AnimatePresence>
                                            {players.map((p) => (
                                                <motion.div
                                                    key={p.id}
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    exit={{ scale: 0 }}
                                                    className={`flex items-center gap-2 p-1.5 pr-4 rounded-full border bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm ${p.id === currentPlayer?.id ? "border-primary shadow-sm ring-2 ring-primary/10" : "border-border"
                                                        }`}
                                                >
                                                    <img src={p.avatar} className="w-6 h-6 rounded-full bg-muted" alt={p.name} />
                                                    <span className={`text-xs font-bold truncate max-w-[80px] ${p.id === currentPlayer?.id ? "text-primary" : ""}`}>
                                                        {p.name}
                                                        {p.id === currentPlayer?.id && " (أنت)"}
                                                    </span>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </>
                        )}
                    </Card>
                </motion.div>
            );
        }

        return (
            <motion.div
                key="lobby-host"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="max-w-2xl mx-auto text-center px-4"
            >
                <Card className="p-8 md:p-12">
                    <div className="flex justify-center mb-5">
                        <img src="/logo.png" alt="Lab4" className="w-16 h-16 rounded-xl object-contain bg-background p-1 shadow-sm border" />
                    </div>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 }}
                        className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6"
                    >
                        <Users className="w-12 h-12 text-white" />
                    </motion.div>

                    <h2 className="text-3xl font-black mb-2">غرفة الانتظار</h2>
                    <p className="text-muted-foreground mb-8">
                        شارك رمز الانضمام مع أصدقائك
                    </p>

                    {/* PIN Display */}
                    <div className="mb-10 flex justify-center">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="relative group cursor-pointer"
                            onClick={handleCopyPin}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                            <div className="relative flex items-center gap-6 bg-card p-6 px-10 rounded-2xl border-2 border-primary/20 shadow-sm hover:border-primary/50 transition-all">
                                <div className="text-5xl md:text-6xl font-black bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent tracking-widest">
                                    {pin}
                                </div>
                                <div className="w-px h-12 bg-border" />
                                <div className="text-muted-foreground flex flex-col items-center gap-1">
                                    {copied ? <Check className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6" />}
                                    <span className="text-[10px] font-bold">نسخ</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Players Section */}
                    <div className="mb-10">
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <Users className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-bold">المشاركون الحاليون</h3>
                            <span className="bg-primary/10 text-primary px-3 py-0.5 rounded-full text-sm font-bold">{players.length}</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            <AnimatePresence>
                                {players.map((player, index) => (
                                    <motion.div
                                        key={player.id}
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0, rotate: 180 }}
                                        transition={{ type: "spring", delay: index * 0.1 }}
                                        className="relative group p-3 rounded-2xl border border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5 transition-all"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="relative">
                                                <img
                                                    src={player.avatar}
                                                    className={`w-14 h-14 rounded-xl bg-muted shadow-sm transition-all ${player.isOnline ? "ring-2 ring-green-500 ring-offset-2" : "opacity-50 grayscale"}`}
                                                    alt={player.name}
                                                />
                                                {player.isOnline && (
                                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                                                )}
                                                {player.isHost && (
                                                    <div className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-400 to-amber-600 p-1 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm">
                                                        <Crown className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-bold text-sm truncate w-full text-center px-1">
                                                {player.name}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* Empty Slots Placeholders */}
                            {[...Array(Math.max(0, 4 - players.length))].map((_, i) => (
                                <div key={`empty-${i}`} className="p-3 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center gap-2 opacity-50">
                                    <div className="w-14 h-14 rounded-xl bg-muted/50 animate-pulse" />
                                    <div className="w-16 h-4 bg-muted/50 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Start Button */}
                    {isHost || isCreator ? (
                        <div className="space-y-4">
                            {questions.length === 0 && (
                                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold">
                                    لا توجد أسئلة (من نوع {effectiveCategory}) في هذا الدرس. يرجى إضافة أسئلة أولاً!
                                </div>
                            )}
                            <Button
                                onClick={() => {
                                    play('click');
                                    handleStartGame();
                                }}
                                size="lg"
                                variant="hero"
                                className="w-full h-14 text-lg gap-2"
                                disabled={players.length < 1 || questions.length === 0}
                            >
                                <Play className="w-5 h-5 ml-2" />
                                ابدأ التحدي {questions.length > 0 ? `(${questions.length} أسئلة)` : ""}
                            </Button>
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl bg-muted/50 animate-pulse text-center">
                            <span className="font-bold">في انتظار المضيف لبدء اللعبة...</span>
                        </div>
                    )}
                </Card>
            </motion.div>
        );
    };

    // Countdown Phase
    const renderCountdown = () => (
        <motion.div
            key="countdown-phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 flex items-center justify-center z-50 px-4"
        >
            <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-center"
            >
                {countdown > 0 ? (
                    <>
                        <div className="text-9xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            {countdown}
                        </div>
                        <div className="text-2xl text-muted-foreground mt-4 font-bold">استعد...</div>
                    </>
                ) : (
                    <div className="text-6xl font-black text-primary animate-bounce">انطلق! 🚀</div>
                )}
            </motion.div>
        </motion.div>
    );

    const renderPlaying = () => {
        if (!currentQuestion) {
            return (
                <motion.div
                    key="playing-empty"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="max-w-4xl mx-auto px-4 text-center mt-20"
                >
                    <div className="bg-destructive/10 text-destructive p-8 rounded-2xl border border-destructive/20 inline-block text-right w-full">
                        <h2 className="text-2xl font-bold mb-4 text-center">خطأ في التحدي</h2>
                        <p className="mb-6 text-center text-lg">لا توجد أسئلة متاحة لعرضها في هذا التحدي من هذا النوع.</p>

                        <div className="bg-white/50 dark:bg-black/50 p-4 rounded-xl text-left font-mono text-xs mb-6 overflow-auto border border-destructive/20" dir="ltr">
                            <div className="font-bold mb-2">Technical Diagnostic Info:</div>
                            <div><span className="opacity-70">Topic ID from URL:</span> {topicId || 'UNDEFINED'}</div>
                            <div><span className="opacity-70">Category from URL:</span> {category || 'UNDEFINED'}</div>
                            <div><span className="opacity-70">Effective Category:</span> {effectiveCategory}</div>
                            <div><span className="opacity-70">Content Object present:</span> {content ? '✅ YES' : '❌ NO'}</div>
                            <div><span className="opacity-70">Expected Host ID:</span> {sessionData?.host_id || 'N/A'}</div>
                            <div><span className="opacity-70">Raw ChallengeItems length:</span> {content?.challengeItems?.length ?? 'undefined'}</div>
                            <div><span className="opacity-70">Final Filtered Questions count:</span> {questions.length}</div>
                            {!content && (
                                <div className="mt-2 text-red-600 font-bold">
                                    CRITICAL: Content is entirely missing! This usually means the useTopic({topicId}) database query failed (e.g. Row Level Security blocked the student, or the ID is invalid).
                                </div>
                            )}
                        </div>

                        <div className="text-center">
                            {isHost ? (
                                <Button variant="default" onClick={() => window.location.href = '/dashboard/teacher'}>العودة للوحة التحكم</Button>
                            ) : (
                                <Button variant="outline" className="border-destructive/30 hover:bg-destructive/10" onClick={() => window.location.href = '/join'}>مغادرة الجلسة</Button>
                            )}
                        </div>
                    </div>
                </motion.div>
            );
        }

        const progress = ((currentIndex + 1) / questions.length) * 100;
        const timeProgress = (timeLeft / currentQuestion.timeLimit) * 100;



        // Host Live Dashboard
        const renderHostLiveDashboard = () => {
            const currentTag = currentIndex + 1;
            const answeredPlayers = players.filter(p => !p.isHost && Number(p.lastAnswerTime) === currentTag);
            const totalPlayers = players.filter(p => !p.isHost).length;

            return (
                <div className="mb-8 p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-primary/20 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Activity className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">
                                    لوحة تحكم المعلم
                                </h3>
                                <p className="text-xs text-muted-foreground">متابعة حية للإجابات</p>
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-primary">{answeredPlayers.length}</span>
                            <span className="text-sm font-bold text-muted-foreground mb-1">/ {totalPlayers}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {players.filter(p => !p.isHost).map(p => {
                            const isThisPlayerAnswered = Number(p.lastAnswerTime) === (currentIndex + 1);
                            const ans = playerAnswers[p.id];
                            const hasAnswered = isThisPlayerAnswered || ans?.answered;
                            const showResult = showQuestionResult && (isThisPlayerAnswered || ans);

                            return (
                                <motion.div
                                    layout
                                    key={p.id}
                                    className={`p-2 rounded-xl border flex items-center gap-3 transition-all ${showResult
                                        ? ((ans?.isCorrect || isThisPlayerAnswered) ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30")
                                        : (hasAnswered ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-dashed border-border opacity-70")
                                        }`}
                                >
                                    <div className="relative shrink-0">
                                        <img src={p.avatar} className="w-8 h-8 rounded-lg" />
                                        {hasAnswered && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${showResult
                                                    ? (ans.isCorrect ? "bg-green-500" : "bg-red-500")
                                                    : "bg-primary"
                                                    }`}
                                            >
                                                {showResult ? (
                                                    ans.isCorrect ? <Check className="w-2 h-2 text-white" /> : <span className="text-[8px] text-white">✗</span>
                                                ) : (
                                                    <Check className="w-2 h-2 text-white" />
                                                )}
                                            </motion.div>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold truncate">{p.name}</span>
                                        {showResult && (
                                            <span className={`text-[10px] font-black ${ans.isCorrect ? "text-green-600" : "text-red-600"}`}>
                                                {ans.isCorrect ? `+${ans.points}` : "0"}
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>

                    <div className="mt-6 flex justify-end border-t pt-4 border-dashed border-border/50">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                play('click');
                                handleTimeout();
                            }}
                            className="gap-2"
                        >
                            <Clock className="w-4 h-4" />
                            إنهاء الوقت فوراً
                        </Button>
                    </div>
                </div>
            )
        };

        return (
            <motion.div
                key="playing-phase"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto px-4"
            >
                {isHost && !showQuestionResult && renderHostLiveDashboard()}

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
                        {currentPlayer && showQuestionResult && (
                            <motion.div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10">
                                <Trophy className="w-4 h-4 text-primary shrink-0" />
                                <span className="font-bold tabular-nums">{currentPlayer.score}</span>
                            </motion.div>
                        )}
                        {isHost && (
                            <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-secondary/10 text-secondary font-bold text-xs sm:text-sm whitespace-nowrap">
                                وضع العرض (Host Mode)
                            </div>
                        )}
                    </div>
                </div>

                {/* Question Card */}
                <Card className="p-6 md:p-8 mb-6">
                    {/* Badge */}
                    <div className="flex justify-center mb-4">
                        <span className="px-4 py-1 rounded-full bg-muted text-sm">
                            {currentQuestion.type === "multiple_choice" && "اختيار متعدد"}
                            {currentQuestion.type === "true_false" && "صح أو خطأ"}
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

                    <QuestionAttachmentDisplay
                        imageUrl={currentQuestion.imageUrl}
                        videoUrl={currentQuestion.videoUrl}
                        audioUrl={currentQuestion.audioUrl}
                    />

                    {/* Multiple Choice / True-False / Puzzle / Shooting */}
                    {["multiple_choice", "true_false", "puzzle", "shooting"].includes(currentQuestion.type) && currentQuestion.options && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentQuestion.options.map((option, index) => {
                                const isSelected = selectedAnswer === index;
                                // Use loose equality since correctAnswer from DB is stored as string
                                const isCorrectOpt = index == currentQuestion.correctAnswer;

                                let buttonClass = "p-5 text-right rounded-xl border-2 transition-all ";

                                if (showQuestionResult) {
                                    if (isCorrectOpt) {
                                        buttonClass += "border-green-500 bg-green-500/10";
                                    } else if (isSelected && !isCorrectOpt) {
                                        buttonClass += "border-red-500 bg-red-500/10";
                                    } else {
                                        buttonClass += "border-border opacity-50";
                                    }
                                } else {
                                    if (isSelected) {
                                        // While waiting for other players, keep it blue/primary (Neutral)
                                        buttonClass += "border-primary bg-primary/20 ring-2 ring-primary ring-offset-2";
                                    } else if (selectedAnswer !== null) {
                                        buttonClass += "border-border opacity-50 grayscale cursor-not-allowed";
                                    } else {
                                        buttonClass += "border-border hover:border-primary hover:bg-primary/5 cursor-pointer";
                                    }
                                }

                                return (
                                    <motion.button
                                        key={index}
                                        whileHover={!showQuestionResult && !isHost ? { scale: 1.02 } : {}}
                                        whileTap={!showQuestionResult && !isHost ? { scale: 0.98 } : {}}
                                        onClick={() => handleAnswerSelect(index)}
                                        disabled={showQuestionResult || selectedAnswer !== null || isHost}
                                        className={buttonClass + (isHost ? " cursor-default" : "")}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${showQuestionResult
                                                ? (isCorrectOpt ? "bg-green-500 text-white" : isSelected ? "bg-red-500 text-white" : "bg-muted")
                                                : (isSelected ? "bg-primary/20 border-2 border-primary" : "bg-muted")
                                                }`}>
                                                {showQuestionResult && isCorrectOpt ? (
                                                    <CheckCircle2 className="w-5 h-5" />
                                                ) : showQuestionResult && isSelected ? (
                                                    <XCircle className="w-5 h-5" />
                                                ) : isSelected ? (
                                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }} className="w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
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

                    {/* Other types using helper functions */}
                    {currentQuestion.type === "know_dont_know" && renderKnowDontKnow()}
                    {currentQuestion.type === "order_questions" && renderOrderQuestions()}
                    {currentQuestion.type === "matching" && renderMatching()}
                    {currentQuestion.type === "wheel_spin" && renderWheel()}
                    {currentQuestion.type === "qa" && renderQA()}

                    {/* Result Feedback */}
                    <AnimatePresence>
                        {/* Waiting Message */}
                        {selectedAnswer !== null && !showQuestionResult && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 text-center"
                            >
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold animate-pulse">
                                    <Clock className="w-4 h-4" />
                                    في انتظار باقي اللاعبين...
                                    <span className="text-xs opacity-70">
                                        ({players.filter(p => !p.isHost && Number(p.lastAnswerTime) === (currentIndex + 1)).length}/{players.filter(p => !p.isHost).length})
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {showQuestionResult && currentQuestion.type !== "wheel_spin" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 flex flex-col gap-4"
                            >
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                                    <p className="text-xl font-bold mb-2">انتهى السؤال!</p>

                                    {!isHost && currentPlayer && playerAnswers[currentPlayer.id] && (
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className={`mb-4 p-4 rounded-2xl flex flex-col items-center gap-2 ${playerAnswers[currentPlayer.id]?.isCorrect
                                                ? "bg-green-500/10 border border-green-500/30 text-green-600"
                                                : "bg-red-500/10 border border-red-500/30 text-red-600"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {playerAnswers[currentPlayer.id]?.isCorrect ? (
                                                    <CheckCircle2 className="w-8 h-8" />
                                                ) : (
                                                    <XCircle className="w-8 h-8" />
                                                )}
                                                <span className="text-2xl font-black">
                                                    {playerAnswers[currentPlayer.id]?.isCorrect ? "إجابة صحيحة!" : "إجابة خاطئة!"}
                                                </span>
                                            </div>
                                            {playerAnswers[currentPlayer.id]?.isCorrect && (
                                                <p className="text-4xl font-black animate-bounce mt-2">
                                                    +{playerAnswers[currentPlayer.id]?.points} <span className="text-sm">نقطة</span>
                                                </p>
                                            )}
                                        </motion.div>
                                    )}

                                    {!isHost && currentPlayer && !playerAnswers[currentPlayer.id] && (
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="mb-4 p-4 rounded-2xl flex flex-col items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600"
                                        >
                                            <Clock className="w-8 h-8" />
                                            <span className="text-2xl font-black">انتهى الوقت!</span>
                                            <p className="text-sm font-bold">لم يتم استلام أي إجابة</p>
                                        </motion.div>
                                    )}

                                </div>

                                {isHost && autoAdvanceCountdown > 0 && (
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="mb-4 p-4 rounded-2xl flex flex-col items-center gap-3 bg-primary/10 border-2 border-primary/30"
                                    >
                                        <p className="text-sm font-bold text-muted-foreground">الانتقال التلقائي للسؤال التالي</p>
                                        <motion.div
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ repeat: Infinity, duration: 0.8 }}
                                            className="text-4xl font-black text-primary"
                                        >
                                            {autoAdvanceCountdown}
                                        </motion.div>
                                        <p className="text-xs text-muted-foreground">انقر على زر لإيقاف العد التنازلي</p>
                                    </motion.div>
                                )}

                                {isHost && (
                                    <div className="flex flex-col gap-3">
                                        <Button
                                            onClick={handleShowLeaderboard}
                                            size="lg"
                                            variant="hero"
                                            className="w-full h-14 text-lg shadow-xl"
                                        >
                                            كشف الترتيب
                                            <ArrowForward className="w-5 h-5 mr-2" />
                                        </Button>
                                        {currentIndex < questions.length - 1 && (
                                            <Button
                                                onClick={handleNextQuestion}
                                                size="lg"
                                                variant="outline"
                                                className="w-full h-14 text-lg shadow-sm"
                                            >
                                                السؤال التالي مباشرة
                                                <ArrowForward className="w-5 h-5 mr-2" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>

                {/* Real-time Player Dash - Group Specific */}
                <div className="flex flex-wrap justify-center gap-4 mt-10">
                    {rankedPlayers.map((p, i) => {
                        const ans = playerAnswers[p.id];
                        return (
                            <motion.div
                                key={p.id}
                                layout={phase === "leaderboard" || phase === "final_results"}
                                className={`flex items-center gap-3 p-3 rounded-2xl bg-card border shadow-sm pr-6 min-w-[160px] transition-all ${showQuestionResult && ans?.isCorrect ? "ring-2 ring-green-500/50 border-green-500/50" : ""
                                    }`}
                            >
                                <div className="relative">
                                    <img src={p.avatar} className="w-12 h-12 rounded-xl bg-muted" alt={p.name} />
                                    {i === 0 && <span className="absolute -top-3 -right-3 text-2xl animate-pulse">👑</span>}
                                    {showQuestionResult && ans && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className={`absolute -bottom-1 -left-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${ans.isCorrect ? "bg-green-500" : "bg-red-500"
                                                }`}
                                        >
                                            {ans.isCorrect ? <Check className="w-3 h-3 text-white" /> : <span className="text-[10px] text-white font-bold">✗</span>}
                                        </motion.div>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <div className="font-bold text-sm truncate max-w-[100px]">{p.name}</div>
                                    {showQuestionResult ? (
                                        <div className="text-primary font-black text-lg leading-tight">
                                            {p.score}
                                            <span className="text-[10px] text-muted-foreground ml-1">نقطة</span>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-muted-foreground font-bold italic">
                                            {Number(p.lastAnswerTime) === (currentIndex + 1) ? "✓ جاهز للنتيجة" : "جاري التفكير..."}
                                        </div>
                                    )}
                                    {showQuestionResult && ans?.isCorrect && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="text-[10px] text-green-600 font-bold"
                                        >
                                            +{ans.points} نقاط
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        );
    };

    const renderLeaderboard = () => (
        <motion.div
            key="leaderboard-phase"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-3xl mx-auto py-10 px-4"
        >
            <Card className="p-8 md:p-12 overflow-hidden relative shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl">
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-primary via-secondary to-primary" />

                <div className="text-center mb-12">
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-amber-50 dark:bg-amber-900/20 mb-6 border border-amber-100 dark:border-amber-800"
                    >
                        <Trophy className="w-12 h-12 text-amber-500" />
                    </motion.div>
                    <h2 className="text-3xl md:text-4xl font-black mb-2 text-slate-900 dark:text-white">
                        ترتيب المتنافسين
                    </h2>
                    <p className="text-muted-foreground text-base md:text-lg">الأجواء بدأت تشتعل! 🔥</p>
                </div>


                <div className="space-y-3 max-w-xl mx-auto mb-10">
                    {rankedPlayers.map((p, i) => (
                        <motion.div
                            key={p.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className={`flex items-center gap-4 md:gap-6 p-4 md:p-5 rounded-2xl md:rounded-[2rem] border-2 transition-all shadow-sm
                  ${i === 0 ? "bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-200 shadow-amber-100" :
                                    (p.isHost ? "bg-primary/5 border-primary/20" : "bg-white/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")}`}
                        >
                            <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-2xl font-black shadow-inner shrink-0
                                ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-amber-700/20 text-amber-800" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                                {i === 0 ? "1" : i === 1 ? "2" : i === 2 ? "3" : i + 1}
                            </div>
                            <div className="relative shrink-0">
                                <img src={p.avatar} className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl border-2 border-white dark:border-slate-700 shadow-sm" />
                                {i === 0 && <Crown className="absolute -top-2 -right-2 w-6 h-6 md:w-8 md:h-8 text-amber-500 rotate-12 drop-shadow-md" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-base md:text-xl text-slate-800 dark:text-slate-100 truncate">
                                    {p.name}
                                    {p.isHost && <span className="text-[9px] md:text-[11px] bg-primary/10 text-primary px-2 md:px-3 py-0.5 md:py-1 rounded-full mr-2 md:mr-3 font-bold uppercase tracking-wider">أنت</span>}
                                </div>
                                <div className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5 md:mt-1">
                                    <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-500" />
                                    {p.correctAnswers} إجابات
                                </div>
                            </div>
                            <div className="text-2xl md:text-3xl font-black bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent shrink-0">
                                {p.score}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {isHost && autoAdvanceCountdown > 0 && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mb-6 p-4 rounded-2xl flex flex-col items-center gap-3 bg-primary/10 border-2 border-primary/30 max-w-md mx-auto"
                    >
                        <p className="text-sm font-bold text-muted-foreground">الانتقال التلقائي للسؤال التالي</p>
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className="text-4xl font-black text-primary"
                        >
                            {autoAdvanceCountdown}
                        </motion.div>
                    </motion.div>
                )}

                {isHost && (
                    <div className="flex justify-center">
                        <Button onClick={handleNextQuestion} variant="hero" size="lg" className="w-full max-w-md h-16 text-xl rounded-[2rem] group shadow-xl">
                            {currentIndex < questions.length - 1 ? (
                                <>
                                    المرحلة القادمة
                                    <ArrowForward className={`w-6 h-6 mr-3 transition-transform ${dir === "rtl" ? "group-hover:-translate-x-2" : "group-hover:translate-x-2"}`} />
                                </>
                            ) : (
                                <>كشف الفائزين 🏆</>
                            )}
                        </Button>
                    </div>
                )}
            </Card>
        </motion.div>
    );

    const renderFinalResults = () => {
        const winners = rankedPlayers.slice(0, 3);
        const otherPlayers = rankedPlayers.slice(3);

        return (
            <motion.div
                key="final-results-phase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-6xl mx-auto py-10 px-4 text-center overflow-hidden"
            >
                {/* Background Decor */}
                <div className="fixed inset-0 pointer-events-none z-0">
                    <AnimatePresence>
                        {revealStep >= 3 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 flex items-center justify-center"
                            >
                                {[...Array(30)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0, x: 0, y: 0 }}
                                        animate={{
                                            scale: [0, 1, 0.5],
                                            x: (Math.random() - 0.5) * 1200,
                                            y: (Math.random() - 0.5) * 1200,
                                            rotate: Math.random() * 360
                                        }}
                                        transition={{ duration: 4, repeat: Infinity, delay: i * 0.1 }}
                                        className={`absolute w-3 h-3 rounded-full ${['bg-primary', 'bg-secondary', 'bg-amber-400', 'bg-green-400'][i % 4]}`}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mb-8 md:mb-12 relative z-10 px-4">
                    <motion.h1
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-3xl md:text-5xl lg:text-6xl font-black mb-3 flex flex-col items-center gap-2"
                    >
                        <span className="text-foreground">أبطال التحدي! 🏅</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed font-medium"
                    >
                        أداء مذهل.. مبارك للفائزين!
                    </motion.p>
                </div>

                <div className="flex flex-col md:flex-row items-end justify-center gap-6 md:gap-0 mb-32 min-h-[550px] relative z-10">
                    {/* 2nd Place */}
                    <AnimatePresence>
                        {revealStep >= 2 && winners[1] && (
                            <motion.div
                                initial={{ y: 300, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ type: "spring", damping: 15 }}
                                className="w-full md:w-72 order-2 md:order-1"
                            >
                                <div className="relative mb-3 md:mb-6">
                                    <motion.img
                                        initial={{ scale: 0, rotate: -20 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ delay: 0.5 }}
                                        src={winners[1].avatar}
                                        className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full md:rounded-full border-4 border-muted p-1 bg-background shadow-lg"
                                    />
                                    <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-muted-foreground text-white px-3 md:px-4 py-0.5 md:py-1 rounded-full text-[10px] font-bold shadow-lg">
                                        المركز الثاني
                                    </div>
                                </div>
                                <div className="font-bold text-xl md:text-2xl mb-3 md:mb-5 text-foreground">{winners[1].name}</div>
                                <div className="h-32 md:h-44 bg-gradient-to-t from-muted to-background/50 backdrop-blur-xl border-x border-t border-border rounded-t-[2rem] md:rounded-t-[2.5rem] flex flex-col items-center justify-center p-3 md:p-5 shadow-xl relative overflow-hidden">
                                    <div className="absolute inset-0 bg-white/40 dark:bg-black/20" />
                                    <span className="text-5xl md:text-6xl mb-2 md:mb-4 filter drop-shadow-md z-10">🥈</span>
                                    <div className="font-black text-xl md:text-3xl text-foreground z-10">{winners[1].score}</div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 1st Place */}
                    <AnimatePresence>
                        {revealStep >= 3 && (
                            <motion.div
                                initial={{ y: 400, opacity: 0, scale: 0.8 }}
                                animate={{ y: 0, opacity: 1, scale: 1.15 }}
                                transition={{ type: "spring", damping: 12, mass: 1.2 }}
                                className="w-full md:w-[26rem] order-1 md:order-2 z-20 md:mx-4 group relative"
                            >
                                <div className="relative mb-5 md:mb-8">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 bg-gradient-hero rounded-full blur-2xl opacity-30"
                                    />
                                    <motion.div
                                        initial={{ y: -50, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.8, type: "spring" }}
                                        className="relative z-10"
                                    >
                                        <Crown className="w-16 h-16 md:w-20 md:h-20 text-warning mx-auto mb-3 md:mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(var(--warning),0.5)]" />
                                        <img
                                            src={winners[0].avatar}
                                            className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full md:rounded-full border-4 border-warning p-1 md:p-1.5 bg-background shadow-[0_15px_30px_rgba(var(--warning),0.3)]"
                                        />
                                        <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-gradient-warning text-warning-foreground px-4 md:px-6 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-black shadow-xl uppercase tracking-widest whitespace-nowrap">
                                            المركز الأول
                                        </div>
                                    </motion.div>
                                </div>
                                <div className="font-black text-2xl md:text-4xl mb-5 md:mb-8 text-foreground">{winners[0].name}</div>
                                <div className="h-44 md:h-64 gradient-warning shadow-lg rounded-t-[2.5rem] md:rounded-t-[3rem] flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden border-t-2 border-warning/50">
                                    <div className="absolute inset-0 bg-white/20 dark:bg-black/20" />
                                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_white_0%,_transparent_100%)] opacity-30" />
                                    <motion.span
                                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                        transition={{ repeat: Infinity, duration: 3 }}
                                        className="text-6xl md:text-[7rem] mb-3 md:mb-4 drop-shadow-2xl z-10"
                                    >
                                        🥇
                                    </motion.span>
                                    <div className="font-black text-3xl md:text-5xl text-amber-950 dark:text-amber-50 z-10">{winners[0].score}</div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 3rd Place */}
                    <AnimatePresence>
                        {revealStep >= 1 && winners[2] && (
                            <motion.div
                                initial={{ y: 250, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ type: "spring", damping: 18 }}
                                className="w-full md:w-64 order-3 md:order-3"
                            >
                                <div className="relative mb-3 md:mb-6">
                                    <motion.img
                                        initial={{ scale: 0, rotate: 20 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ delay: 0.5 }}
                                        src={winners[2].avatar}
                                        className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full md:rounded-full border-4 border-amber-800 p-1 bg-background shadow-xl"
                                    />
                                    <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-amber-800 text-white px-3 md:px-4 py-0.5 md:py-1 rounded-full text-[10px] font-bold shadow-lg whitespace-nowrap">
                                        المركز الثالث
                                    </div>
                                </div>
                                <div className="font-bold text-lg md:text-xl mb-3 md:mb-5 text-foreground">{winners[2].name}</div>
                                <div className="h-24 md:h-36 bg-gradient-to-t from-amber-700/50 to-background/50 backdrop-blur-xl border-x border-t border-amber-800/20 rounded-t-[1.5rem] md:rounded-t-[2rem] flex flex-col items-center justify-center p-3 md:p-5 shadow-xl relative overflow-hidden">
                                    <div className="absolute inset-0 bg-white/40 dark:bg-black/20" />
                                    <span className="text-4xl md:text-5xl mb-2 md:mb-3 filter drop-shadow-md z-10">🥉</span>
                                    <div className="font-black text-lg md:text-2xl text-foreground z-10">{winners[2].score}</div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Rest of Players List */}
                {revealStep >= 4 && otherPlayers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto mb-20 relative z-10"
                    >
                        <h3 className="text-xl font-bold mb-6 text-slate-500 uppercase tracking-widest">باقي المتنافسين</h3>
                        <div className="space-y-3">
                            {otherPlayers.map((p, i) => (
                                <div key={p.id} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border backdrop-blur-sm shadow-sm group hover:scale-[1.02] transition-transform">
                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                                        {i + 4}
                                    </div>
                                    <img src={p.avatar} className="w-12 h-12 rounded-xl" />
                                    <div className="flex-1 text-right font-bold text-lg text-foreground">{p.name}</div>
                                    <div className="text-2xl font-black text-primary">{p.score}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                <AnimatePresence>
                    {revealStep >= 4 && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="flex flex-wrap gap-6 justify-center relative z-20 pb-20"
                        >
                            <Button
                                variant="outline"
                                size="lg"
                                className="rounded-[2rem] px-10 h-16 text-lg border-2 font-bold transition-all hover:scale-105 active:scale-95"
                                onClick={() => setShowAnalysis(true)}
                            >
                                <Zap className="w-5 h-5 ml-2 text-primary" />
                                تحليل نتيجتي
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="rounded-[2rem] px-10 h-16 text-lg border-2 font-bold transition-all hover:scale-105 active:scale-95"
                                onClick={() => window.location.reload()}
                            >
                                <span className="ml-2">🔄</span>
                                تحدي جديد
                            </Button>
                            <Button
                                asChild
                                size="lg"
                                variant="hero"
                                className="rounded-[2rem] px-12 h-16 text-lg shadow-[0_20px_40px_-10px_rgba(var(--primary),0.4)] font-black group transition-all hover:scale-105 active:scale-95"
                            >
                                <Link to={`/grade/${gradeId}/subject/${subjectId}/topic/${topicId}`} className="flex items-center">
                                    <span>العودة للمحتوى</span>
                                    <ArrowBack className={`w-6 h-6 mr-3 transition-transform ${dir === "rtl" ? "group-hover:-translate-x-2" : "group-hover:translate-x-2"}`} />
                                </Link>
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Analysis Modal */}
                <AnimatePresence>
                    {showAnalysis && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowAnalysis(false)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col"
                            >
                                <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                                    <div>
                                        <h2 className="text-3xl font-black mb-1">تحليل الأداء الشخصي</h2>
                                        <p className="text-muted-foreground">تفاصيل إجاباتك خلال هذا التحدي</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setShowAnalysis(false)} className="rounded-full w-12 h-12">
                                        <XCircle className="w-8 h-8" />
                                    </Button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                    {/* Summary Stats */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 rounded-3xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-center">
                                            <div className="text-3xl font-black text-green-600 dark:text-green-400">
                                                {userHistory.filter(h => h.isCorrect).length}
                                            </div>
                                            <div className="text-xs font-bold text-green-600/70 uppercase mt-1">صح</div>
                                        </div>
                                        <div className="p-4 rounded-3xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-center">
                                            <div className="text-3xl font-black text-red-600 dark:text-red-400">
                                                {userHistory.filter(h => !h.isCorrect).length}
                                            </div>
                                            <div className="text-xs font-bold text-red-600/70 uppercase mt-1">خطأ</div>
                                        </div>
                                        <div className="p-4 rounded-3xl bg-primary/5 border border-primary/10 text-center">
                                            <div className="text-3xl font-black text-primary">
                                                {Math.round(userHistory.reduce((acc, h) => acc + h.timeTaken, 0) / (userHistory.length || 1))}s
                                            </div>
                                            <div className="text-xs font-bold text-primary/70 uppercase mt-1">متوسط السرعة</div>
                                        </div>
                                    </div>

                                    {/* Question Breakdown */}
                                    <div className="space-y-4">
                                        {userHistory.map((h, i) => (
                                            <div key={i} className="p-5 rounded-[1.5rem] border bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700/50">
                                                <div className="flex items-start justify-between gap-4 mb-3">
                                                    <h4 className="font-bold text-lg leading-snug">{h.question}</h4>
                                                    {h.isCorrect ? (
                                                        <span className="shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                                                            <Check className="w-5 h-5" />
                                                        </span>
                                                    ) : (
                                                        <span className="shrink-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                                                            <Check className="w-5 h-5 rotate-45" />
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <div className="text-muted-foreground mb-1 text-xs font-bold">إجابتك</div>
                                                        <div className={`font-bold ${h.isCorrect ? "text-green-600" : "text-red-600"}`}>{h.selectedAnswer}</div>
                                                    </div>
                                                    {!h.isCorrect && (
                                                        <div>
                                                            <div className="text-muted-foreground mb-1 text-xs font-bold">الصحيحة</div>
                                                            <div className="font-bold text-green-600">{h.correctAnswer}</div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-4 pt-4 border-t dark:border-slate-700 flex items-center justify-between text-xs font-bold text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-3 h-3" />
                                                        {h.timeTaken} ثانية
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Zap className="w-3 h-3 text-amber-500" />
                                                        {h.points} نقطة
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 dark:bg-slate-800/80 text-center">
                                    <Button onClick={() => setShowAnalysis(false)} className="w-full h-14 rounded-2xl text-lg font-bold">
                                        إغلاق النافذة
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };


    return (
        <div className="min-h-screen font-cairo bg-background relative overflow-hidden text-foreground">
            {/* Animated background pattern matching HeroSection */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 z-0" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-40 -left-40 w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-3xl opacity-50"
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-40 -right-40 w-[35rem] h-[35rem] rounded-full bg-secondary/10 blur-3xl opacity-50"
                />
            </div>

            {/* Music Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                    setMusicEnabled(prev => !prev);
                }}
                className={`fixed left-4 z-50 rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-2xl flex items-center justify-center hover:shadow-primary/50 transition-all ${
                    phase === "lobby"
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

            {phase === "lobby" && <Header />}
            <main className={`relative z-10 ${phase === "lobby" ? "pt-32 pb-20" : "pt-6 pb-20 max-sm:pb-24"}`}>
                <AnimatePresence mode="wait">
                    {phase === "lobby" && renderLobby()}
                    {phase === "countdown" && renderCountdown()}
                    {phase === "playing" && renderPlaying()}
                    {phase === "leaderboard" && renderLeaderboard()}
                    {phase === "final_results" && renderFinalResults()}
                </AnimatePresence>
            </main>
            {phase === "lobby" && <Footer />}

            {topicId && (
                <LessonEmojiRatingDialog
                    topicId={topicId}
                    userId={currentUser?.id}
                    open={lessonRatingOpen}
                    onOpenChange={setLessonRatingOpen}
                />
            )}
        </div>
    );
};

export default GroupChallenge;
