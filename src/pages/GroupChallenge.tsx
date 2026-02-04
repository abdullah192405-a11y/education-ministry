import { useState, useEffect, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    ChevronLeft, Trophy, Zap, Clock, Users, Crown,
    CheckCircle2, XCircle, Play, Copy, Share2, Check,
    Sparkles, Medal, Star, ArrowLeft, Volume2, VolumeX,
    ArrowUp, ArrowDown, Music, Lock as LockIcon, Activity
} from "lucide-react";
import { getChannelById, getContentById } from "@/data/channelsData";
import { getTopicById } from "@/data/educationData";
import {
    generateQuestionsFromContent,
    getRandomAvatar,
    getWheelSubQuestion,
    type ChallengeQuestion,
    type ChallengeCategory,
    type Player
} from "@/data/challengeTypes";
import { useSound } from "@/hooks/useSound";

type GamePhase = "lobby" | "countdown" | "playing" | "question_result" | "leaderboard" | "final_results";

const GroupChallenge = () => {
    const { channelId, contentId, category, pin, gradeId, subjectId, topicId } = useParams();
    const [searchParams] = useSearchParams();
    const isHost = searchParams.get("host") === "true";
    const isCreator = searchParams.get("creator") === "true";
    const playerName = searchParams.get("name") || "لاعب";

    const isEducationMode = !!gradeId && !!subjectId && !!topicId;

    let channel: any = null;
    let content: any = null;

    if (isEducationMode) {
        content = getTopicById(
            parseInt(gradeId || "0"),
            parseInt(subjectId || "0"),
            parseInt(topicId || "0")
        );
    } else {
        channel = getChannelById(parseInt(channelId || "0"));
        content = getContentById(parseInt(channelId || "0"), parseInt(contentId || "0"));
    }

    const [phase, setPhase] = useState<GamePhase>("lobby");
    const [questions, setQuestions] = useState<ChallengeQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [countdown, setCountdown] = useState(3);
    const [selectedAnswer, setSelectedAnswer] = useState<number | string | null>(null);
    const [showQuestionResult, setShowQuestionResult] = useState(false);
    const [musicEnabled, setMusicEnabled] = useState(true);
    const [copied, setCopied] = useState(false);

    // Initialize sound system
    const { play, stop } = useSound(musicEnabled);

    // Game Logic States (Similar to Single Player but for results)
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

    // New State for Deferred Results
    const [playerAnswers, setPlayerAnswers] = useState<Record<string, { answered: boolean, points: number, isCorrect: boolean }>>({});
    const [userHistory, setUserHistory] = useState<{
        question: string;
        selectedAnswer: string;
        correctAnswer: string;
        isCorrect: boolean;
        points: number;
        timeTaken: number;
    }[]>([]);
    const [showAnalysis, setShowAnalysis] = useState(false);




    // Players State - Includes simulated players
    // If isHost is true, the current user is an admin/host and should not be a player
    const [players, setPlayers] = useState<Player[]>(() => {
        if (isHost) return []; // Admin/Host doesn't play
        return [{
            id: "me",
            name: playerName,
            avatar: getRandomAvatar(playerName),
            score: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            streak: 0,
            isHost: false,
            isOnline: true
        }];
    });

    const currentPlayer = isHost ? null : players.find(p => p.id === "me");

    // Simulate players joining in lobby
    useEffect(() => {
        if (phase === "lobby") {
            const simulatedNames = ["أحمد", "سارة", "محمد", "فاطمة", "خالد", "نورة"];
            let index = 0;

            const interval = setInterval(() => {
                if (index < 4 && Math.random() > 0.4) {
                    const name = simulatedNames[index];
                    setPlayers(prev => [...prev, {
                        id: `player-${index}`,
                        name,
                        avatar: getRandomAvatar(name),
                        score: 0,
                        correctAnswers: 0,
                        wrongAnswers: 0,
                        streak: 0,
                        isOnline: true
                    }]);
                    index++;
                }
            }, 2500);

            return () => clearInterval(interval);
        }
    }, [phase]);

    // Initialize questions
    useEffect(() => {
        if (content && category) {
            let loadedQuestions: ChallengeQuestion[] = [];

            // Try to use new challengeItems from content
            if (content.challengeItems && content.challengeItems.length > 0) {
                if (category === 'activities') {
                    loadedQuestions = content.challengeItems.filter(q => ["multiple_choice", "true_false", "qa", "know_dont_know", "order_questions"].includes(q.type));
                } else if (category === 'games') {
                    loadedQuestions = content.challengeItems.filter(q => ["matching", "shooting", "wheel_spin", "puzzle"].includes(q.type));
                } else { // mixed
                    loadedQuestions = content.challengeItems;
                }
            }

            // Fallback to generator if empty
            if (loadedQuestions.length === 0) {
                loadedQuestions = generateQuestionsFromContent(
                    content.id,
                    category as ChallengeCategory
                );
            }

            setQuestions(loadedQuestions);
        }
    }, [content, category]);

    // Timer
    useEffect(() => {
        if (phase === "playing" && timeLeft > 0 && !showQuestionResult && !isSpinning) {
            // Play timer tick sound for last 5 seconds
            if (timeLeft <= 5) {
                play('countdown');
            }
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && phase === "playing" && !showQuestionResult && !isSpinning) {
            handleTimeout();
        }
    }, [timeLeft, phase, showQuestionResult, isSpinning, play]);

    // Countdown
    useEffect(() => {
        if (phase === "countdown" && countdown > 0) {
            // Play tick for countdown too
            play('countdown');
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0 && phase === "countdown") {
            startQuestion(currentIndex);
        }
    }, [countdown, phase, play]);

    // Handle Reveal Step for Final Results
    useEffect(() => {
        if (phase === "final_results") {
            setRevealStep(0);
            const timers = [
                setTimeout(() => setRevealStep(1), 1000), // Show 3rd
                setTimeout(() => setRevealStep(2), 2500), // Show 2nd
                setTimeout(() => setRevealStep(3), 4500), // Show 1st
                setTimeout(() => setRevealStep(4), 5500), // Show Buttons
            ];
            return () => timers.forEach(clearTimeout);
        }
    }, [phase]);

    // Play achievement sound on leaderboard/final results
    useEffect(() => {
        if (phase === "leaderboard" || phase === "final_results") {
            play('achievement');
        }
    }, [phase, play]);


    const currentQuestion = questions[currentIndex];

    const handleStartGame = () => {
        setPhase("countdown");
        setCountdown(3);

        // Start background music
        play('background');
    };

    const startQuestion = (index: number) => {
        setPhase("playing");
        setCurrentIndex(index);
        const q = questions[index];
        setTimeLeft(q.timeLimit);
        setSelectedAnswer(null);
        setShowQuestionResult(false);
        setWheelResult(null);
        setWheelSubQuestion(null);
        setWheelPoints(0);
        setIsSpinning(false);
        setShowCorrectAnswer(false);
        setPlayerAnswers({}); // Reset answers

        // Schedule bots
        scheduleBotAnswers(questions[index].timeLimit);

        // Initial states for specific types
        if (q.type === "order_questions" && q.orderItems) {
            setOrderItems([...q.orderItems].sort(() => Math.random() - 0.5));
        }
        if (q.type === "matching" && q.pairs) {
            const rightItems = q.pairs.map((p, i) => ({ text: p.right, originalIndex: i }));
            setShuffledRight(rightItems.sort(() => Math.random() - 0.5));
            setMatchedPairs([]);
            setSelectedLeft(null);
        }
    };

    const handleTimeout = () => {
        handleRoundEnd();
    };

    // Simulate bots answering
    const botTimeouts = useRef<NodeJS.Timeout[]>([]);

    const scheduleBotAnswers = (timeLimit: number) => {
        // Clear existing timeouts
        botTimeouts.current.forEach(clearTimeout);
        botTimeouts.current = [];

        // Schedule for each player (except the current player if they exist)
        players.forEach(p => {
            if (p.id === "me") return; // Host isn't in players if isHost is true, so this skips the real player only

            // Random time between 2s and timeLimit - 1s
            const delay = Math.random() * (timeLimit * 1000 - 3000) + 2000;

            const timeout = setTimeout(() => {
                // Determine if bot answers correctly
                const isCorrect = Math.random() > 0.4; // 60% chance correct
                // Calculate points (simulated)
                const timeLeftSim = Math.max(0, timeLimit - (delay / 1000));

                // Score Decay: Max points if instant, down to 50% at 0s
                const timeRatio = timeLeftSim / timeLimit;
                const basePoints = currentQuestion.points;
                const points = isCorrect ? Math.ceil(basePoints * (0.5 + 0.5 * timeRatio)) : 0;

                setPlayerAnswers(prev => ({
                    ...prev,
                    [p.id]: { answered: true, points, isCorrect }
                }));
            }, delay);

            botTimeouts.current.push(timeout);
        });
    };

    // Check if round should end
    useEffect(() => {
        if (phase === "playing" && !showQuestionResult) {
            const allAnswered = players.every(p => playerAnswers[p.id]?.answered);
            if (allAnswered) {
                // Small delay to feel natural
                const timer = setTimeout(() => {
                    handleRoundEnd();
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [playerAnswers, phase, showQuestionResult, players]);

    const handleRoundEnd = () => {
        if (showQuestionResult) return;

        // Commit scores
        setPlayers(prev => prev.map(p => {
            const answer = playerAnswers[p.id];
            if (!answer) {
                // Player didn't answer (timeout)
                return { ...p, wrongAnswers: p.wrongAnswers + 1, streak: 0 };
            }

            return {
                ...p,
                score: p.score + answer.points,
                correctAnswers: answer.isCorrect ? p.correctAnswers + 1 : p.correctAnswers,
                wrongAnswers: !answer.isCorrect ? p.wrongAnswers + 1 : p.wrongAnswers,
                streak: answer.isCorrect ? p.streak + 1 : 0
            };
        }));

        setShowQuestionResult(true);

        // Play sound for Current Player Result
        if (currentPlayer) {
            const myAnswer = playerAnswers[currentPlayer.id];
            if (myAnswer) {
                play(myAnswer.isCorrect ? 'correct' : 'wrong');
            } else {
                play('wrong'); // Timeout
            }
        }

        setTimeout(() => {
            if (currentIndex === questions.length - 1) {
                setPhase("final_results");
            } else {
                setPhase("leaderboard");
            }
        }, 3500);
    };

    const processAnswer = (isCorrect: boolean, customPoints?: number, providedAnswer?: any) => {
        // Just record the answer, don't show result yet
        // Score Decay: Max points if instant, down to 50% at 0s
        const timeRatio = timeLeft / currentQuestion.timeLimit;
        const basePoints = customPoints !== undefined ? customPoints : currentQuestion.points;
        const points = isCorrect ? Math.ceil(basePoints * (0.5 + 0.5 * timeRatio)) : 0;

        // Record history for personal analysis (Player only)
        if (currentPlayer) {
            const getAnswerText = (val: any) => {
                if (val === null || val === undefined) return 'لم تتم الإجابة';
                if (typeof val === 'number' && currentQuestion.options) {
                    return currentQuestion.options[val];
                }
                return String(val);
            };

            const finalAns = providedAnswer !== undefined ? providedAnswer : selectedAnswer;

            setUserHistory(prev => [...prev, {
                question: currentQuestion.question,
                selectedAnswer: finalAns !== null ? getAnswerText(finalAns) : (customPoints !== undefined ? (isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة') : 'انتهى الوقت'),
                correctAnswer: getAnswerText(currentQuestion.correctAnswer),
                isCorrect,
                points,
                timeTaken: currentQuestion.timeLimit - timeLeft
            }]);

            setPlayerAnswers(prev => ({
                ...prev,
                [currentPlayer.id]: { answered: true, points, isCorrect }
            }));
        }

        // Note: Sound is deferred to result reveal
        // But we might want a click sound? done in handleAnswerSelect
    };

    const handleAnswerSelect = (answer: number | string) => {
        if (showQuestionResult || selectedAnswer !== null || isHost) return;
        setSelectedAnswer(answer);
        const isCorrect = answer === currentQuestion.correctAnswer;

        // Play sound effect (Just selection sound)
        play('click');

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
        processAnswer(isCorrect, undefined, orderItems.join(" -> "));
    };

    // Matching logic
    const handleLeftSelect = (index: number) => {
        if (matchedPairs.some(p => p.leftIndex === index) || isHost) return;
        setSelectedLeft(index);
    };

    const handleRightSelect = (shuffledIdx: number) => {
        if (selectedLeft === null || isHost) return;
        const right = shuffledRight[shuffledIdx];
        if (matchedPairs.some(p => p.rightIndex === right.originalIndex)) return;

        if (selectedLeft === right.originalIndex) {
            const newPairs = [...matchedPairs, { leftIndex: selectedLeft, rightIndex: right.originalIndex }];
            setMatchedPairs(newPairs);
            if (newPairs.length === currentQuestion.pairs?.length) {
                setSelectedAnswer("complete");
                processAnswer(true, undefined, "جميع الأربطة صحيحة");
            }
        }
        setSelectedLeft(null);
    };

    // Wheel Spin logic
    const spinWheel = () => {
        if (isSpinning) return;
        setIsSpinning(true);

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
        }, 4000);
    };

    const handleWheelSubAnswer = (answerIdx: number) => {
        if (showQuestionResult || !wheelSubQuestion || isHost) return;
        setSelectedAnswer(answerIdx);
        const isCorrect = answerIdx === wheelSubQuestion.correctAnswer;
        processAnswer(isCorrect, isCorrect ? wheelPoints : 0, answerIdx);
    };

    const handleKnowAnswer = (knows: boolean) => {
        if (showQuestionResult || isHost) return;

        setSelectedAnswer(knows ? 0 : 1);
        // setShowCorrectAnswer(true); // Don't show immediately

        if (knows) {
            // User says they know - they need to verify
            processAnswer(true, undefined, "أعرف");
        } else {
            // User says they don't know
            processAnswer(false, undefined, "لا أعرف");
        }
    };



    const handleNextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setPhase("countdown");
            setCountdown(3);
            setCurrentIndex(prev => prev + 1);
        } else {
            setPhase("final_results");
        }
    };

    const handleCopyPin = () => {
        navigator.clipboard.writeText(pin || "");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const rankedPlayers = [...players].sort((a, b) => b.score - a.score).map((p, i) => ({ ...p, rank: i + 1 }));

    if ((!channel && !isEducationMode) || !content) {
        return (
            <div className="min-h-screen font-cairo bg-background flex flex-col items-center justify-center p-4">
                <h1 className="text-3xl font-bold mb-4">المحتوى غير موجود</h1>
                <Button asChild>
                    <Link to={isEducationMode ? "/grades" : "/channels"}>
                        {isEducationMode ? "العودة للصفوف" : "العودة للقنوات"}
                    </Link>
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

    // Render components
    const renderLobby = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center px-4"
        >
            <Card className="p-8 md:p-12">
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
                                                className="w-14 h-14 rounded-xl bg-muted shadow-sm"
                                                alt={player.name}
                                            />
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
                    <Button
                        onClick={() => {
                            play('click');
                            handleStartGame();
                        }}
                        size="lg"
                        variant="hero"
                        className="w-full h-14 text-lg gap-2"
                        disabled={players.length < 1}
                    >
                        <Play className="w-5 h-5 ml-2" />
                        ابدأ التحدي
                    </Button>
                ) : (
                    <div className="p-4 rounded-xl bg-muted/50 animate-pulse text-center">
                        <span className="font-bold">في انتظار المضيف لبدء اللعبة...</span>
                    </div>
                )}
            </Card>
        </motion.div>
    );

    // Countdown Phase
    const renderCountdown = () => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
        if (!currentQuestion) return null;

        const progress = ((currentIndex + 1) / questions.length) * 100;
        const timeProgress = (timeLeft / currentQuestion.timeLimit) * 100;



        // Host Live Dashboard
        const renderHostLiveDashboard = () => {
            const answeredPlayers = players.filter(p => !p.isHost && playerAnswers[p.id]?.answered);
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
                                    {isEducationMode ? "لوحة تحكم المعلم" : "لوحة تحكم المضيف"}
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
                            const hasAnswered = playerAnswers[p.id]?.answered;
                            return (
                                <motion.div
                                    layout
                                    key={p.id}
                                    className={`p-2 rounded-xl border flex items-center gap-3 transition-all ${hasAnswered
                                        ? "bg-green-500/10 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                                        : "bg-muted/30 border-dashed border-border opacity-70"
                                        }`}
                                >
                                    <div className="relative shrink-0">
                                        <img src={p.avatar} className="w-8 h-8 rounded-lg" />
                                        {hasAnswered && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center"
                                            >
                                                <Check className="w-2 h-2 text-white" />
                                            </motion.div>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold truncate">{p.name}</span>
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
            <div className="max-w-4xl mx-auto px-4">
                {isHost && !showQuestionResult && renderHostLiveDashboard()}

                {/* Progress & Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                            {currentIndex + 1}/{questions.length}
                        </div>
                        <Progress value={progress} className="w-32 h-2" />
                    </div>

                    <div className="flex items-center gap-4">
                        {currentPlayer && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
                                <Trophy className="w-4 h-4 text-primary" />
                                <span className="font-bold">{currentPlayer.score}</span>
                            </div>
                        )}
                        {isHost && (
                            <div className="px-4 py-2 rounded-full bg-secondary/10 text-secondary font-bold text-sm">
                                وضع العرض (Host Mode)
                            </div>
                        )}
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

                    <h3 className="text-xl md:text-2xl font-bold text-center mb-8">
                        {currentQuestion.question}
                    </h3>

                    {/* Multiple Choice / True-False / Puzzle / Shooting / QA */}
                    {["multiple_choice", "true_false", "puzzle", "shooting", "qa"].includes(currentQuestion.type) && currentQuestion.options && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentQuestion.options.map((option, index) => {
                                const isSelected = selectedAnswer === index;
                                const isCorrectOpt = index === currentQuestion.correctAnswer;

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
                                            <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${showQuestionResult && isCorrectOpt
                                                ? "bg-green-500 text-white"
                                                : showQuestionResult && isSelected
                                                    ? "bg-red-500 text-white"
                                                    : "bg-muted"
                                                }`}>
                                                {showQuestionResult && isCorrectOpt ? (
                                                    <CheckCircle2 className="w-5 h-5" />
                                                ) : showQuestionResult && isSelected ? (
                                                    <XCircle className="w-5 h-5" />
                                                ) : isSelected ? (
                                                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
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
                                        ({Object.values(playerAnswers).filter(a => a.answered).length}/{players.length})
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {showQuestionResult && currentQuestion.type !== "wheel_spin" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6"
                            >
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                                    <p className="text-xl font-bold mb-2">انتهى السؤال!</p>
                                    <p className="text-muted-foreground">{currentQuestion.explanation}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>

                {/* Real-time Player Dash - Group Specific */}
                <div className="flex flex-wrap justify-center gap-6 mt-10">
                    {rankedPlayers.map((p, i) => (
                        <motion.div key={p.id} layout className="flex items-center gap-3 p-3 rounded-2xl bg-card border shadow-sm pr-6">
                            <div className="relative">
                                <img src={p.avatar} className="w-12 h-12 rounded-xl bg-muted" />
                                {i === 0 && <span className="absolute -top-2 -right-2 text-xl">👑</span>}
                            </div>
                            <div>
                                <div className="font-bold text-sm">{p.name}</div>
                                <div className="text-primary font-black text-lg">{p.score} <span className="text-[10px] text-muted-foreground">نقطة</span></div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    };

    const renderLeaderboard = () => (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto py-10 px-4">
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

                {isHost && (
                    <div className="flex justify-center">
                        <Button onClick={handleNextQuestion} variant="hero" size="lg" className="w-full max-w-md h-16 text-xl rounded-[2rem] group shadow-xl">
                            {currentIndex < questions.length - 1 ? (
                                <>
                                    المرحلة القادمة
                                    <ArrowLeft className="w-6 h-6 mr-3 group-hover:-translate-x-2 transition-transform" />
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto py-10 px-4 text-center overflow-hidden">
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

                <div className="mb-12 md:mb-20 relative z-10 px-4">
                    <motion.h1
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-4xl md:text-7xl lg:text-8xl font-black mb-4 drop-shadow-[0_10px_30px_rgba(0,0,0,0.1)] bg-gradient-to-br from-primary via-slate-800 to-secondary bg-clip-text text-transparent"
                    >
                        أبطال التحدي! 🏅
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-slate-500 dark:text-slate-400 text-lg md:text-2xl font-medium tracking-wide"
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
                                <div className="relative mb-4 md:mb-8">
                                    <motion.img
                                        initial={{ scale: 0, rotate: -20 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ delay: 0.5 }}
                                        src={winners[1].avatar}
                                        className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-[2rem] md:rounded-[2.5rem] border-4 border-slate-200 p-1.5 bg-white shadow-2xl"
                                    />
                                    <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-slate-500 text-white px-4 md:px-5 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-black shadow-lg">
                                        SILVER
                                    </div>
                                </div>
                                <div className="font-bold text-xl md:text-2xl mb-3 md:mb-5 text-slate-700 dark:text-slate-200">{winners[1].name}</div>
                                <div className="h-40 md:h-56 bg-gradient-to-t from-slate-200/50 to-slate-50/10 dark:from-slate-800 dark:to-slate-900/50 backdrop-blur-xl border-x border-t border-slate-200 dark:border-slate-700/50 rounded-t-[2.5rem] md:rounded-t-[3rem] flex flex-col items-center justify-center p-4 md:p-6 shadow-2xl">
                                    <span className="text-6xl md:text-8xl mb-3 md:mb-5 filter drop-shadow-md">🥈</span>
                                    <div className="font-black text-2xl md:text-4xl text-slate-600 dark:text-slate-300">{winners[1].score}</div>
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
                                className="w-full md:w-[26rem] order-1 md:order-2 z-20 md:mx-4 group"
                            >
                                <div className="relative mb-6 md:mb-10">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 bg-gradient-to-r from-amber-400 via-white to-secondary rounded-full blur-3xl opacity-30"
                                    />
                                    <motion.div
                                        initial={{ y: -50, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.8, type: "spring" }}
                                        className="relative z-10"
                                    >
                                        <Crown className="w-20 h-20 md:w-28 md:h-28 text-amber-500 mx-auto mb-4 md:mb-5 animate-bounce drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                                        <img
                                            src={winners[0].avatar}
                                            className="w-32 h-32 md:w-48 md:h-48 mx-auto rounded-[2.5rem] md:rounded-[3.5rem] border-4 border-amber-400 p-1.5 md:p-2 bg-white shadow-[0_20px_50px_rgba(245,158,11,0.3)]"
                                        />
                                        <div className="absolute -bottom-3 md:-bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 md:px-8 py-1.5 md:py-2 rounded-full text-[10px] md:text-sm font-black shadow-xl uppercase tracking-widest">
                                            CHAMPION
                                        </div>
                                    </motion.div>
                                </div>
                                <div className="font-black text-2xl md:text-4xl mb-5 md:mb-8 text-slate-900 dark:text-white">{winners[0].name}</div>
                                <div className="h-56 md:h-96 bg-gradient-to-t from-amber-400 to-amber-50 dark:from-amber-600 dark:to-amber-950 shadow-[0_30px_70px_-10px_rgba(245,158,11,0.4)] rounded-t-[3rem] md:rounded-t-[4rem] flex flex-col items-center justify-center p-6 md:p-10 relative overflow-hidden border-t-2 border-amber-200">
                                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_white_0%,_transparent_100%)] opacity-30" />
                                    <motion.span
                                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                        transition={{ repeat: Infinity, duration: 3 }}
                                        className="text-7xl md:text-[10rem] mb-4 md:mb-6 drop-shadow-2xl z-10"
                                    >
                                        🥇
                                    </motion.span>
                                    <div className="font-black text-4xl md:text-6xl text-amber-950 dark:text-amber-50 z-10">{winners[0].score}</div>
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
                                <div className="relative mb-6 md:mb-8">
                                    <motion.img
                                        initial={{ scale: 0, rotate: 20 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ delay: 0.5 }}
                                        src={winners[2].avatar}
                                        className="w-20 h-20 md:w-28 md:h-28 mx-auto rounded-[1.5rem] md:rounded-[2rem] border-4 border-amber-700/20 p-1 md:p-1.5 bg-white shadow-xl"
                                    />
                                    <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-amber-700/80 text-white px-4 md:px-5 py-1 md:py-1.5 rounded-full text-[10px] md:xs font-black shadow-lg">
                                        BRONZE
                                    </div>
                                </div>
                                <div className="font-bold text-lg md:text-2xl mb-3 md:mb-5 text-slate-600 dark:text-slate-300">{winners[2].name}</div>
                                <div className="h-32 md:h-44 bg-gradient-to-t from-amber-200/30 to-white dark:from-amber-900/40 dark:to-slate-900 backdrop-blur-xl border-x border-t border-amber-700/10 rounded-t-[2.5rem] md:rounded-t-[3rem] flex flex-col items-center justify-center p-4 md:p-6 shadow-2xl">
                                    <span className="text-5xl md:text-7xl mb-3 md:mb-4 filter drop-shadow-md">🥉</span>
                                    <div className="font-black text-xl md:text-3xl text-amber-900/80 dark:text-amber-400">{winners[2].score}</div>
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
                                <div key={p.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 backdrop-blur-sm shadow-sm group hover:scale-[1.02] transition-transform">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                                        {i + 4}
                                    </div>
                                    <img src={p.avatar} className="w-12 h-12 rounded-xl" />
                                    <div className="flex-1 text-right font-bold text-lg">{p.name}</div>
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
                                <Link to={`/channel/${channelId}`} className="flex items-center">
                                    <span>العودة للقناة</span>
                                    <ArrowLeft className="w-6 h-6 mr-3 group-hover:-translate-x-2 transition-transform" />
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
            <main className="pt-32 pb-20 relative z-10">
                <AnimatePresence mode="wait">
                    {phase === "lobby" && renderLobby()}
                    {phase === "countdown" && renderCountdown()}
                    {phase === "playing" && renderPlaying()}
                    {phase === "leaderboard" && renderLeaderboard()}
                    {phase === "final_results" && renderFinalResults()}
                </AnimatePresence>
            </main>
            <Footer />
        </div>
    );
};

export default GroupChallenge;
