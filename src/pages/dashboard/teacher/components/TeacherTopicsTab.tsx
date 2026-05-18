import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Eye, Gamepad2, MoreVertical, Edit,
    Trash, Plus, BookOpen, Video, Calendar,
    AlertTriangle, ListChecks, Target, Clock, Image as ImageIcon,
    FileText, CheckCircle, XCircle, Save, X, BookMarked, GraduationCap, BarChart3, QrCode, Copy, ExternalLink, Download,
    Users, Trophy, ChevronRight, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    useSubject,
    useGrades,
    useCreateTopic,
    useUpdateTopic,
    useDeleteTopic,
    useSaveTopicMedia,
    useSaveChallengeQuestions,
    useVisitorGradeClassMode,
    useUser,
    useTeacherProfile,
    useHostedChallengeResults,
    useTeacherSingleChallengeResults,
    useTeacherTopicContentReport,
} from "@/hooks/useDatabase";
import { filterGradesForPublicCatalog } from "@/lib/contentVisibility";
import { downloadChallengeReportPdf } from "@/lib/challengeReportPdf";
import type { ChallengeQuestion } from "@/data/challengeTypes";
import { selectValueToPresetFields, type StudentChallengePresetValue } from "@/lib/topicChallengePreset";
import ContentEditor from "./ContentEditor";
import { useToast } from "@/components/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip as RechartsTooltip,
    BarChart,
    Bar,
    LineChart,
    Line,
    ScatterChart,
    Scatter,
    ReferenceLine,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts";

interface TeacherTopicsTabProps {
    gradeId?: string;
    subjectId?: string;
    teacherProfileId?: string;
    onCreateChallenge: (topicId: string, details?: any) => void;
}

interface ExtendedTopic {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    views: number;
    duration?: string;
    correct_sound_url?: string | null;
    wrong_sound_url?: string | null;
    answering_background_sound_url?: string | null;
    discussions_enabled?: boolean;
    collect_single_challenge_participant_data?: boolean | null;
    student_challenge_mode?: string | null;
    student_challenge_category?: string | null;
    createdAt: string;
    media?: any[];
    quiz?: any[];
    challengeItems?: ChallengeQuestion[];
    status?: "published" | "draft";
    mediaCount?: number;
    quizCount?: number;
}

type SingleShareCategory = "activities" | "games" | "mixed";

const SINGLE_SHARE_OPTIONS: Array<{ category: SingleShareCategory; label: string }> = [
    { category: "activities", label: "الأنشطة التفاعلية فقط" },
    { category: "games", label: "الأنشطة التلعيبية فقط" },
    { category: "mixed", label: "الكل (مختلط)" },
];

const toRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" ? value as Record<string, unknown> : {};

const clampScorePercent = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

const getScorePercent = (result: unknown) => {
    const row = toRecord(result);
    const percentage = Number(row.percentage);
    if (Number.isFinite(percentage)) return clampScorePercent(percentage);

    const score = Number(row.score);
    const maxScore = Number(row.max_score ?? row.maxScore);
    if (Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0) {
        return clampScorePercent((score / maxScore) * 100);
    }

    return Number.isFinite(score) ? clampScorePercent(score) : 0;
};

const getTopicActivityCount = (topic: unknown) => {
    const row = toRecord(topic);
    return Array.isArray(row.activities) ? row.activities.length : 0;
};

const getTopicViewerCount = (topic: unknown) => Number(toRecord(topic).views || 0) + getTopicActivityCount(topic);

const getMedianScore = (scores: number[]) => {
    if (scores.length === 0) return 0;
    const sorted = [...scores].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1
        ? sorted[middle]
        : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

const getAverage = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const getStandardDeviation = (values: number[]) => {
    if (values.length <= 1) return 0;
    const avg = getAverage(values);
    const variance = getAverage(values.map((value) => (value - avg) ** 2));
    return Math.sqrt(variance);
};

const getPercentile = (values: number[], percentile: number) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

const getCorrelation = (xs: number[], ys: number[]) => {
    if (xs.length !== ys.length || xs.length < 2) return 0;
    const avgX = getAverage(xs);
    const avgY = getAverage(ys);
    const numerator = xs.reduce((sum, x, index) => sum + ((x - avgX) * (ys[index] - avgY)), 0);
    const denomX = Math.sqrt(xs.reduce((sum, x) => sum + ((x - avgX) ** 2), 0));
    const denomY = Math.sqrt(ys.reduce((sum, y) => sum + ((y - avgY) ** 2), 0));
    if (denomX === 0 || denomY === 0) return 0;
    return numerator / (denomX * denomY);
};

const getNestedRecord = (row: Record<string, unknown>, key: string) => toRecord(row[key]);

const getNumberValue = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const getNumberField = (row: unknown, keys: string[]) => {
    const record = toRecord(row);
    for (const key of keys) {
        const value = getNumberValue(record[key]);
        if (value > 0) return value;
    }
    return 0;
};

const getStringField = (row: unknown, keys: string[]) => {
    const record = toRecord(row);
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
};

const getParticipantName = (result: unknown) => {
    const row = toRecord(result);
    const user = getNestedRecord(row, "user");
    return getStringField(user, ["name"])
        || getStringField(row, ["participant_display_name", "name"])
        || "زائر";
};

const isRegisteredAttempt = (result: unknown) => {
    const row = toRecord(result);
    const user = getNestedRecord(row, "user");
    return Boolean(row.user_id || user.id);
};

const getAttemptTimestamp = (result: unknown) => {
    const row = toRecord(result);
    const raw = getStringField(row, ["created_at", "joined_at", "updated_at"]);
    if (!raw) return null;
    const time = new Date(raw).getTime();
    return Number.isFinite(time) ? raw : null;
};

const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getAttemptLocalDateKey = (date: string | null) => {
    if (!date) return "";
    const parsed = new Date(date);
    return Number.isFinite(parsed.getTime()) ? getLocalDateKey(parsed) : "";
};

const getQuestionResults = (result: unknown) => {
    const rows = toRecord(result).question_results;
    return Array.isArray(rows) ? rows.map((row) => toRecord(row)) : [];
};

const buildQuestionTextById = (topic: unknown) => {
    const questionTextById = new Map<string, string>();
    const topicRow = toRecord(topic);
    const items = Array.isArray(topicRow.challengeItems)
        ? topicRow.challengeItems
        : Array.isArray(topicRow.challenge_questions)
            ? topicRow.challenge_questions
            : [];

    items.forEach((item, index) => {
        const question = toRecord(item);
        const text = getStringField(question, ["question", "text", "title"]);
        if (!text) return;

        const id = String(question.id ?? index + 1);
        questionTextById.set(id, text);
        questionTextById.set(String(index + 1), text);
    });

    return questionTextById;
};

const getAttemptKey = (result: unknown, fallback = "") => {
    const row = toRecord(result);
    return String(row.id ?? `${getAttemptTimestamp(result) || "attempt"}-${getParticipantName(result)}-${fallback}`);
};

const getAttemptQuestionRows = (result: unknown, questionTextById: Map<string, string>) =>
    getQuestionResults(result).map((question, index) => {
        const questionId = String(question.questionId ?? question.question_id ?? question.id ?? index + 1);
        return {
            questionId,
            label: questionTextById.get(questionId) || `سؤال ${questionId}`,
            correct: Boolean(question.correct ?? question.isCorrect ?? question.is_correct),
            timeTaken: getNumberField(question, ["timeTaken", "time_taken"]),
            pointsEarned: getNumberField(question, ["pointsEarned", "points_earned"]),
            userAnswer: getStringField(question, ["userAnswer", "user_answer", "answer"]),
        };
    });

const formatSeconds = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "—";
    if (seconds < 60) return `${Math.round(seconds)} ث`;
    const minutes = Math.floor(seconds / 60);
    const rest = Math.round(seconds % 60);
    return rest > 0 ? `${minutes} د ${rest} ث` : `${minutes} د`;
};

const TeacherTopicsTab = ({ gradeId: propGradeId, subjectId: propSubjectId, teacherProfileId, onCreateChallenge }: TeacherTopicsTabProps) => {
    const { toast } = useToast();
    const [selectedTopicStats, setSelectedTopicStats] = useState<ExtendedTopic | null>(null);
    const { data: currentUser } = useUser();
    const { data: currentTeacherProfile } = useTeacherProfile(currentUser?.id || "");
    const effectiveTeacherProfileId = teacherProfileId || currentTeacherProfile?.id || "";
    const { data: hostedResults } = useHostedChallengeResults(currentUser?.id || "", 1000);
    const { data: singleResults } = useTeacherSingleChallengeResults(effectiveTeacherProfileId, 1000);

    /** Single-player challenge rows grouped by lesson (topic), for showing names on each درس card */
    const singleResultsByTopicId = useMemo(() => {
        const m = new Map<string, any[]>();
        (singleResults || []).forEach((r: any) => {
            const tid = String(r.session?.topic_id ?? r.session?.topic?.id ?? "");
            if (!tid) return;
            if (!m.has(tid)) m.set(tid, []);
            m.get(tid)!.push(r);
        });
        return m;
    }, [singleResults]);

    const { data: topicReport } = useTeacherTopicContentReport(
        selectedTopicStats ? String(selectedTopicStats.id) : "",
        currentUser?.id || "",
        effectiveTeacherProfileId
    );

    // Get all grades (respect platform visibility for visitors/teachers)
    const { data: grades } = useGrades();
    const { mode: visitorGradeMode } = useVisitorGradeClassMode();
    const visibleGrades = useMemo(
        () => filterGradesForPublicCatalog(grades as any[] | undefined, visitorGradeMode),
        [grades, visitorGradeMode],
    );

    // Selected grade state - defaults to prop or empty
    const [selectedGradeId, setSelectedGradeId] = useState<string>(propGradeId || "");

    // Auto-select first visible grade when list loads or selection becomes invalid
    useEffect(() => {
        if (!visibleGrades?.length) return;
        const valid = visibleGrades.some((g: any) => g.id === selectedGradeId);
        if (!selectedGradeId || !valid) {
            setSelectedGradeId(visibleGrades[0].id);
        }
    }, [visibleGrades, selectedGradeId]);

    // Get available subjects for the selected grade
    const currentGrade = visibleGrades?.find((g: any) => g.id === selectedGradeId);
    const availableSubjects = currentGrade?.subjects || [];

    // Selected subject state - defaults to prop or first available subject
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>(propSubjectId || "");

    // Auto-select first subject when grade changes or subjects load
    useEffect(() => {
        if (availableSubjects.length > 0) {
            // If the currently selected subject is not in the new grade's subjects, reset it
            const isValidSubject = availableSubjects.some((s: any) => s.id === selectedSubjectId);
            if (!isValidSubject) {
                setSelectedSubjectId(availableSubjects[0].id);
            }
        } else {
            setSelectedSubjectId("");
        }
    }, [selectedGradeId, availableSubjects]);

    // Mutations
    const createTopicMutation = useCreateTopic();
    const updateTopicMutation = useUpdateTopic();
    const deleteTopicMutation = useDeleteTopic();
    const saveMediaMutation = useSaveTopicMedia();
    const saveChallengeQuestionsMutation = useSaveChallengeQuestions();

    // Get current subject data from database
    const { data: subjectData, isLoading: isLoadingSubject } = useSubject(String(selectedSubjectId), teacherProfileId);

    // State
    const [topics, setTopics] = useState<ExtendedTopic[]>([]);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingTopic, setEditingTopic] = useState<ExtendedTopic | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [singleShareDialogTopic, setSingleShareDialogTopic] = useState<ExtendedTopic | null>(null);
    const [singleShareCategory, setSingleShareCategory] = useState<SingleShareCategory>("mixed");
    const [singleChallengeResultsTopic, setSingleChallengeResultsTopic] = useState<ExtendedTopic | null>(null);
    const [expandedSingleAttempt, setExpandedSingleAttempt] = useState<unknown | null>(null);
    const [isSingleReportPdfDownloading, setIsSingleReportPdfDownloading] = useState(false);

    const sortedSingleResultsForDialog = useMemo(() => {
        if (!singleChallengeResultsTopic) return [];
        const raw = singleResultsByTopicId.get(String(singleChallengeResultsTopic.id)) || [];
        return [...raw].sort(
            (a, b) =>
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
    }, [singleChallengeResultsTopic, singleResultsByTopicId]);

    const singleQuestionTextById = useMemo(
        () => buildQuestionTextById(singleChallengeResultsTopic),
        [singleChallengeResultsTopic]
    );

    const singleChallengeCollectedReport = useMemo(() => {
        const list = sortedSingleResultsForDialog;
        if (!list.length) return null;

        const scoreRows = list.map((result: unknown) => ({
            result,
            name: getParticipantName(result),
            score: getScorePercent(result),
            correct: getNumberField(result, ["correct_answers", "correctAnswers"]),
            wrong: getNumberField(result, ["wrong_answers", "wrongAnswers"]),
            totalQuestions: getNumberField(result, ["total_questions", "totalQuestions"]),
            timeTaken: getNumberField(result, ["time_taken", "timeTaken"]),
            avgTime: getNumberField(result, ["avg_time_per_question", "averageTimePerQuestion"]),
            streak: getNumberField(result, ["longest_streak", "longestStreak"]),
            points: getNumberField(result, ["score"]),
            registered: isRegisteredAttempt(result),
            createdAt: getAttemptTimestamp(result),
        }));

        const scores = scoreRows.map((row) => row.score);
        const withTime = scoreRows.filter((row) => row.timeTaken > 0);
        const totalCorrect = scoreRows.reduce((sum, row) => sum + row.correct, 0);
        const totalWrong = scoreRows.reduce((sum, row) => sum + row.wrong, 0);
        const answeredQuestions = totalCorrect + totalWrong;
        const uniqueParticipants = new Set(scoreRows.map((row) => row.name)).size;
        const passCount = scoreRows.filter((row) => row.score >= 70).length;
        const highPerformers = scoreRows.filter((row) => row.score >= 90).length;
        const supportNeeded = scoreRows.filter((row) => row.score < 50).length;
        const registeredAttempts = scoreRows.filter((row) => row.registered).length;
        const guestAttempts = scoreRows.length - registeredAttempts;

        const scoreDistribution = [
            { label: "أقل من 50", count: scoreRows.filter((row) => row.score < 50).length, fill: "#ef4444" },
            { label: "50-69", count: scoreRows.filter((row) => row.score >= 50 && row.score < 70).length, fill: "#f59e0b" },
            { label: "70-89", count: scoreRows.filter((row) => row.score >= 70 && row.score < 90).length, fill: "#3b82f6" },
            { label: "90-100", count: highPerformers, fill: "#10b981" },
        ];

        const participantTypeData = [
            { name: "مسجل", value: registeredAttempts, color: "#2563eb" },
            { name: "زائر", value: guestAttempts, color: "#8b5cf6" },
        ].filter((item) => item.value > 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dailyTrend = Array.from({ length: 7 }, (_, idx) => {
            const day = new Date(today);
            day.setDate(today.getDate() - (6 - idx));
            const key = getLocalDateKey(day);
            const attempts = scoreRows.filter((row) => getAttemptLocalDateKey(row.createdAt) === key);
            const avg = attempts.length
                ? Math.round(attempts.reduce((sum, row) => sum + row.score, 0) / attempts.length)
                : 0;
            const passed = attempts.filter((row) => row.score >= 70).length;
            const participants = new Set(attempts.map((row) => row.name)).size;
            const totalTime = attempts.reduce((sum, row) => sum + row.timeTaken, 0);
            return {
                day: day.toLocaleDateString("ar-SA", { weekday: "short" }),
                date: day.toLocaleDateString("ar-SA", { day: "numeric", month: "short" }),
                key,
                attempts: attempts.length,
                participants,
                avg,
                passRate: attempts.length ? Math.round((passed / attempts.length) * 100) : 0,
                averageTime: attempts.length && totalTime > 0 ? Math.round(totalTime / attempts.length) : 0,
            };
        });
        const weeklyAttempts = dailyTrend.reduce((sum, day) => sum + day.attempts, 0);
        const weeklyActiveDays = dailyTrend.filter((day) => day.attempts > 0).length;
        const weeklyAverageScore = weeklyAttempts
            ? Math.round(dailyTrend.reduce((sum, day) => sum + (day.avg * day.attempts), 0) / weeklyAttempts)
            : 0;
        const weeklyPassRate = weeklyAttempts
            ? Math.round(dailyTrend.reduce((sum, day) => sum + ((day.passRate / 100) * day.attempts), 0) / weeklyAttempts * 100)
            : 0;
        const weeklyPassedAttempts = dailyTrend.reduce((sum, day) => sum + Math.round((day.passRate / 100) * day.attempts), 0);
        const busiestDay = [...dailyTrend].sort((a, b) => b.attempts - a.attempts)[0] || null;
        const bestActivityDay = [...dailyTrend]
            .filter((day) => day.attempts > 0)
            .sort((a, b) => b.avg - a.avg || b.attempts - a.attempts)[0] || null;
        const todayActivity = dailyTrend[dailyTrend.length - 1] || null;

        const questionMap = new Map<string, { questionId: string; attempts: number; correct: number; wrong: number; totalTime: number; points: number }>();
        list.forEach((result: unknown) => {
            getQuestionResults(result).forEach((question, index) => {
                const id = String(question.questionId ?? question.question_id ?? question.id ?? index + 1);
                const current = questionMap.get(id) || {
                    questionId: id,
                    attempts: 0,
                    correct: 0,
                    wrong: 0,
                    totalTime: 0,
                    points: 0,
                };
                const isCorrect = Boolean(question.correct ?? question.isCorrect ?? question.is_correct);
                current.attempts += 1;
                if (isCorrect) current.correct += 1;
                else current.wrong += 1;
                current.totalTime += getNumberField(question, ["timeTaken", "time_taken"]);
                current.points += getNumberField(question, ["pointsEarned", "points_earned"]);
                questionMap.set(id, current);
            });
        });

        const questionAnalytics = Array.from(questionMap.values())
            .map((question) => ({
                ...question,
                label: singleQuestionTextById.get(question.questionId) || `سؤال ${question.questionId}`,
                accuracy: question.attempts ? Math.round((question.correct / question.attempts) * 100) : 0,
                avgTime: question.attempts ? Math.round(question.totalTime / question.attempts) : 0,
            }))
            .sort((a, b) => a.accuracy - b.accuracy);

        const topAttempts = [...scoreRows]
            .sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken)
            .slice(0, 5);

        const topScoreChartData = [...scoreRows]
            .sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken)
            .slice(0, 8)
            .map((row) => ({
                name: row.name.length > 14 ? `${row.name.slice(0, 14)}...` : row.name,
                score: row.score,
            }));

        const answerOutcomeData = [
            { name: "صحيح", value: totalCorrect, color: "#10b981" },
            { name: "خطأ", value: totalWrong, color: "#ef4444" },
        ].filter((item) => item.value > 0);

        const questionAccuracyChartData = questionAnalytics.map((question, index) => ({
            ...question,
            shortLabel: `س${index + 1}`,
        }));
        const questionTimeChartData = [...questionAccuracyChartData]
            .sort((a, b) => b.avgTime - a.avgTime)
            .slice(0, 8);

        const strongestQuestion = [...questionAnalytics].sort((a, b) => b.accuracy - a.accuracy)[0] || null;
        const weakestQuestion = questionAnalytics[0] || null;
        const slowestQuestion = [...questionAnalytics].sort((a, b) => b.avgTime - a.avgTime)[0] || null;
        const averageScoreRaw = getAverage(scores);
        const q1Score = getPercentile(scores, 25);
        const q3Score = getPercentile(scores, 75);
        const iqrScore = q3Score - q1Score;
        const stdDevScore = getStandardDeviation(scores);
        const coefficientOfVariation = averageScoreRaw > 0 ? (stdDevScore / averageScoreRaw) * 100 : 0;
        const scoreRange = Math.max(...scores) - Math.min(...scores);
        const timeScoreRows = scoreRows.filter((row) => row.timeTaken > 0);
        const scoreTimeCorrelation = getCorrelation(
            timeScoreRows.map((row) => row.timeTaken),
            timeScoreRows.map((row) => row.score)
        );
        const scoreTimeCorrelationLabel =
            Math.abs(scoreTimeCorrelation) < 0.2
                ? "ضعيف"
                : scoreTimeCorrelation > 0
                    ? "طردي"
                    : "عكسي";
        const lowOutlierThreshold = q1Score - (1.5 * iqrScore);
        const highOutlierThreshold = q3Score + (1.5 * iqrScore);
        const lowOutliers = scoreRows.filter((row) => row.score < lowOutlierThreshold);
        const highOutliers = scoreRows.filter((row) => row.score > highOutlierThreshold);

        const scoreBoxData = [
            { label: "أدنى", value: Math.round(Math.min(...scores)), fill: "#ef4444" },
            { label: "Q1", value: Math.round(q1Score), fill: "#f59e0b" },
            { label: "وسيط", value: getMedianScore(scores), fill: "#3b82f6" },
            { label: "Q3", value: Math.round(q3Score), fill: "#6366f1" },
            { label: "أعلى", value: Math.round(Math.max(...scores)), fill: "#10b981" },
        ];

        const scoreTimeScatterData = timeScoreRows.map((row) => ({
            name: row.name,
            time: Math.round(row.timeTaken),
            score: row.score,
        }));

        const averageTimeForSegments = withTime.length ? getAverage(withTime.map((row) => row.timeTaken)) : 0;
        const learnerSegments = [
            {
                name: "سريع ومتقن",
                count: scoreRows.filter((row) => row.score >= 80 && (!averageTimeForSegments || row.timeTaken <= averageTimeForSegments)).length,
                fill: "#10b981",
            },
            {
                name: "سريع ويحتاج تثبيت",
                count: scoreRows.filter((row) => row.score < 80 && (!averageTimeForSegments || row.timeTaken <= averageTimeForSegments)).length,
                fill: "#f59e0b",
            },
            {
                name: "متأن ومتقن",
                count: scoreRows.filter((row) => row.score >= 80 && row.timeTaken > averageTimeForSegments).length,
                fill: "#3b82f6",
            },
            {
                name: "متعثر وبطيء",
                count: scoreRows.filter((row) => row.score < 80 && row.timeTaken > averageTimeForSegments).length,
                fill: "#ef4444",
            },
        ].filter((segment) => segment.count > 0);

        const questionDifficultyData = [
            { name: "صعبة", count: questionAnalytics.filter((q) => q.accuracy < 50).length, fill: "#ef4444" },
            { name: "متوسطة", count: questionAnalytics.filter((q) => q.accuracy >= 50 && q.accuracy < 80).length, fill: "#f59e0b" },
            { name: "سهلة", count: questionAnalytics.filter((q) => q.accuracy >= 80).length, fill: "#10b981" },
        ].filter((item) => item.count > 0);

        const recommendations = [
            supportNeeded > 0
                ? `يوجد ${supportNeeded} محاولة أقل من 50%؛ يفضل مراجعة المفاهيم الأساسية مع هذه المجموعة.`
                : "لا توجد محاولات منخفضة جدًا؛ مستوى الدعم العاجل منخفض.",
            stdDevScore >= 20
                ? "التشتت مرتفع بين الطلاب؛ قسّم الطلاب إلى مجموعات دعم/إثراء بدل نشاط واحد للجميع."
                : "التشتت محدود؛ يمكن تقديم تغذية راجعة موحدة مع تدخلات فردية بسيطة.",
            weakestQuestion
                ? `ابدأ بالمراجعة من السؤال الأضعف: "${weakestQuestion.label}" لأن دقته ${weakestQuestion.accuracy}%.`
                : "",
            scoreTimeCorrelation < -0.3
                ? "العلاقة عكسية بين الوقت والدرجة: الطلاب الأبطأ غالبًا يواجهون صعوبة، فاختصر السؤال أو أضف مثالًا تمهيديًا."
                : scoreTimeCorrelation > 0.3
                    ? "العلاقة طردية بين الوقت والدرجة: التفكير الأطول يساعد، فشجع الطلاب على التمهل."
                    : "لا توجد علاقة قوية بين الزمن والدرجة؛ ركّز على جودة السؤال والمفهوم أكثر من السرعة.",
        ].filter(Boolean);

        return {
            count: scoreRows.length,
            averageScore: Math.round(averageScoreRaw),
            bestScore: Math.max(...scores),
            lowestScore: Math.min(...scores),
            medianScore: getMedianScore(scores),
            passRate: Math.round((passCount / scoreRows.length) * 100),
            highPerformers,
            supportNeeded,
            uniqueParticipants,
            registeredAttempts,
            guestAttempts,
            totalCorrect,
            totalWrong,
            answerAccuracy: answeredQuestions ? Math.round((totalCorrect / answeredQuestions) * 100) : 0,
            averageTime: withTime.length ? Math.round(withTime.reduce((sum, row) => sum + row.timeTaken, 0) / withTime.length) : 0,
            fastestTime: withTime.length ? Math.min(...withTime.map((row) => row.timeTaken)) : 0,
            averageStreak: Math.round(scoreRows.reduce((sum, row) => sum + row.streak, 0) / scoreRows.length),
            scoreDistribution,
            participantTypeData,
            dailyTrend,
            weeklyAttempts,
            weeklyActiveDays,
            weeklyAverageScore,
            weeklyPassRate,
            weeklyPassedAttempts,
            busiestDay,
            bestActivityDay,
            todayActivity,
            questionAnalytics,
            questionAccuracyChartData,
            questionTimeChartData,
            answerOutcomeData,
            topScoreChartData,
            strongestQuestion,
            weakestQuestion,
            slowestQuestion,
            q1Score: Math.round(q1Score),
            q3Score: Math.round(q3Score),
            iqrScore: Math.round(iqrScore),
            stdDevScore: Math.round(stdDevScore),
            coefficientOfVariation: Math.round(coefficientOfVariation),
            scoreRange,
            scoreTimeCorrelation: Number(scoreTimeCorrelation.toFixed(2)),
            scoreTimeCorrelationLabel,
            lowOutliers,
            highOutliers,
            scoreBoxData,
            scoreTimeScatterData,
            learnerSegments,
            questionDifficultyData,
            recommendations,
            topAttempts,
        };
    }, [sortedSingleResultsForDialog, singleQuestionTextById]);

    const buildSingleShareLink = (topicId: string, category: SingleShareCategory) => {
        const gradeSegment = currentGrade?.slug || selectedGradeId;
        return `${window.location.origin}/grade/${gradeSegment}/subject/${selectedSubjectId}/topic/${topicId}/challenge/single/${category}`;
    };

    const handleDownloadSingleQR = async () => {
        if (!singleShareDialogTopic) return;
        const link = buildSingleShareLink(singleShareDialogTopic.id, singleShareCategory);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(link)}`;

        try {
            const response = await fetch(qrUrl);
            if (!response.ok) {
                throw new Error("QR fetch failed");
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = `single-challenge-${singleShareCategory}-${singleShareDialogTopic.id}.png`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(objectUrl);
            toast({ title: "تم التنزيل", description: "تم تنزيل رمز QR بنجاح." });
        } catch (error) {
            console.error("Failed to download QR:", error);
            toast({
                title: "تعذر تنزيل QR",
                description: "حدث خطأ أثناء تنزيل رمز QR. حاول مرة أخرى.",
                variant: "destructive",
            });
        }
    };

    const handleDownloadSingleReportPdf = async () => {
        if (!singleChallengeResultsTopic || !singleChallengeCollectedReport) return;

        setIsSingleReportPdfDownloading(true);
        try {
            toast({
                title: "جاري إنشاء التقرير الذكي",
                description: "يقوم Gemini الآن بتحليل نتائج التحدي وتوليد توصيات تعليمية مفصلة، قد يستغرق ذلك لحظات.",
            });
            const pdfResults = sortedSingleResultsForDialog.map((result: unknown) => {
                const row = toRecord(result);
                const user = getNestedRecord(row, "user");
                return {
                    ...row,
                    name: getParticipantName(result),
                    user: {
                        ...user,
                        id: user.id || row.user_id || null,
                    },
                    percentage: getScorePercent(result),
                    score: getNumberField(result, ["score"]) || getScorePercent(result),
                    correct_answers: getNumberField(result, ["correct_answers", "correctAnswers"]),
                    wrong_answers: getNumberField(result, ["wrong_answers", "wrongAnswers"]),
                    time_taken: getNumberField(result, ["time_taken", "timeTaken"]),
                    participant_display_name: getParticipantName(result),
                };
            });

            const questionRows = singleChallengeCollectedReport.questionAnalytics.map((question) => ({
                questionText: question.label,
                accuracy: question.accuracy,
                correct: question.correct,
                total: question.attempts,
            }));

            await downloadChallengeReportPdf({
                topicTitle: `تقرير التحدي الفردي: ${singleChallengeResultsTopic.title}`,
                lessonTitle: singleChallengeResultsTopic.title,
                className: currentGrade?.name,
                subjectName: subjectData?.name,
                teacherName: currentUser?.name || (currentTeacherProfile as any)?.name,
                sessionDate: new Date().toLocaleDateString("ar-SA", { dateStyle: "full" }),
                sessionTime: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
                mergedSessionsNote: `تقرير مجمع لكل محاولات رابط التحدي الفردي. إجمالي المحاولات: ${singleChallengeCollectedReport.count}، متوسط الأداء: ${singleChallengeCollectedReport.averageScore}%، معدل النجاح: ${singleChallengeCollectedReport.passRate}%.`,
                analysisRows: [
                    { label: "الوسيط", value: `${singleChallengeCollectedReport.medianScore}%` },
                    { label: "أدنى نتيجة", value: `${singleChallengeCollectedReport.lowestScore}%` },
                    { label: "Q1", value: `${singleChallengeCollectedReport.q1Score}%` },
                    { label: "Q3", value: `${singleChallengeCollectedReport.q3Score}%` },
                    { label: "IQR", value: singleChallengeCollectedReport.iqrScore },
                    { label: "الانحراف المعياري", value: singleChallengeCollectedReport.stdDevScore },
                    { label: "معامل التشتت", value: `${singleChallengeCollectedReport.coefficientOfVariation}%` },
                    { label: "ارتباط الزمن/الدرجة", value: `${singleChallengeCollectedReport.scoreTimeCorrelation} (${singleChallengeCollectedReport.scoreTimeCorrelationLabel})` },
                    { label: "محاولات الأسبوع", value: singleChallengeCollectedReport.weeklyAttempts },
                    { label: "نجاح الأسبوع", value: `${singleChallengeCollectedReport.weeklyPassRate}%` },
                    { label: "نتائج ممتازة", value: singleChallengeCollectedReport.highPerformers },
                    { label: "يحتاجون دعم", value: singleChallengeCollectedReport.supportNeeded },
                ],
                recommendations: singleChallengeCollectedReport.recommendations,
                charts: {
                    scoreDistribution: singleChallengeCollectedReport.scoreDistribution,
                    dailyTrend: singleChallengeCollectedReport.dailyTrend,
                    participantTypeData: singleChallengeCollectedReport.participantTypeData,
                    answerOutcomeData: singleChallengeCollectedReport.answerOutcomeData,
                    topScoreChartData: singleChallengeCollectedReport.topScoreChartData,
                    questionAccuracyChartData: singleChallengeCollectedReport.questionAccuracyChartData,
                    questionTimeChartData: singleChallengeCollectedReport.questionTimeChartData,
                    scoreBoxData: singleChallengeCollectedReport.scoreBoxData,
                    scoreTimeScatterData: singleChallengeCollectedReport.scoreTimeScatterData,
                    learnerSegments: singleChallengeCollectedReport.learnerSegments,
                    questionDifficultyData: singleChallengeCollectedReport.questionDifficultyData,
                },
                results: pdfResults,
                questionRows,
            });

            toast({
                title: "تم تنزيل PDF",
                description: "تم إنشاء تقرير عربي منسق بخط عربي قابل للقراءة والبحث.",
            });
        } catch (error) {
            console.error("Failed to download single challenge PDF:", error);
            toast({
                title: "تعذر تنزيل PDF",
                description: "حدث خطأ أثناء إنشاء التقرير. حاول مرة أخرى.",
                variant: "destructive",
            });
        } finally {
            setIsSingleReportPdfDownloading(false);
        }
    };

    // Sync DB topics to local state
    useEffect(() => {
        if (subjectData?.topics) {
            const mapped = subjectData.topics.map((topic: any) => ({
                ...topic,
                thumbnail: topic.thumbnail || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop",
                views: Number(topic.views || 0),
                createdAt: topic.created_at || topic.createdAt || "",
                status: "published" as const,
                mediaCount: topic.mediaItems?.length || topic.media?.length || 0,
                quizCount: topic.challengeItems?.length || topic.challenge_questions?.length || topic.quiz?.length || 0,
                media: (topic.mediaItems || topic.media || []).map((m: any) => ({
                    ...m,
                    type: m.type?.toLowerCase() || "text",
                    fileName: m.file_name || m.fileName,
                    pdfBase64: m.pdf_base64 || m.pdfBase64,
                })),
                quiz: topic.quizQuestions || topic.quiz || [],
                challengeItems: topic.challengeItems || topic.challenge_questions || [],
            }));
            setTopics(mapped);
        }
    }, [subjectData]);

    // Filter topics based on search
    const filteredTopics = topics.filter(topic =>
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const topicStatsById = useMemo(() => {
        const statsMap = new Map<string, {
            groupAttempts: number;
            singleAttempts: number;
            challengeAttempts: number;
            uniqueChallengeParticipants: number;
            uniqueSingleParticipants: number;
            uniqueGroupParticipants: number;
            viewers: number;
            uniqueViewers: number;
            averageScoreOverall: number;
            averageScoreSingle: number;
            averageScoreGroup: number;
            highestScore: number;
            lowestScore: number;
            medianScore: number;
            passRate: number;
            totalAttempts: number;
            uniqueParticipants: number;
            highPerformersCount: number;
            lowPerformersCount: number;
            attemptsToday: number;
            attemptsLast7Days: number;
            activityDaysLast30Days: number;
            lastAttemptAt: string | null;
            questionAnalytics: unknown[];
        }>();

        const ensure = (topicId: string) => {
            if (!statsMap.has(topicId)) {
                statsMap.set(topicId, {
                    groupAttempts: 0,
                    singleAttempts: 0,
                    challengeAttempts: 0,
                    uniqueChallengeParticipants: 0,
                    uniqueSingleParticipants: 0,
                    uniqueGroupParticipants: 0,
                    viewers: 0,
                    uniqueViewers: 0,
                    averageScoreOverall: 0,
                    averageScoreSingle: 0,
                    averageScoreGroup: 0,
                    highestScore: 0,
                    lowestScore: 0,
                    medianScore: 0,
                    passRate: 0,
                    totalAttempts: 0,
                    uniqueParticipants: 0,
                    highPerformersCount: 0,
                    lowPerformersCount: 0,
                    attemptsToday: 0,
                    attemptsLast7Days: 0,
                    activityDaysLast30Days: 0,
                    lastAttemptAt: null,
                    questionAnalytics: [],
                });
            }
            return statsMap.get(topicId)!;
        };

        const resolveTopicId = (result: any) => {
            const raw =
                result?.topic_id ??
                result?.topicId ??
                result?.session?.topic_id ??
                result?.session?.topicId ??
                result?.session?.topic?.id ??
                "";
            return String(raw || "");
        };

        (topics || []).forEach((topic: any) => {
            const topicId = String(topic.id);
            const topicActivities = topic.activities || [];
            const uniqueViewers = new Set(
                topicActivities
                    .map((a: any) => a.student_id)
                    .filter((id: any) => !!id)
            );
            const row = ensure(topicId);
            row.viewers = getTopicViewerCount(topic);
            row.uniqueViewers = uniqueViewers.size;
        });

        const participantsByTopic = new Map<string, Set<string>>();
        const singleParticipantsByTopic = new Map<string, Set<string>>();
        const groupParticipantsByTopic = new Map<string, Set<string>>();
        const scoreAggByTopic = new Map<string, { total: number; count: number; passed: number; highest: number; lowest: number; scores: number[]; attemptDates: string[]; lastAttemptAt: string | null }>();
        const scoreAggSingleByTopic = new Map<string, { total: number; count: number }>();
        const scoreAggGroupByTopic = new Map<string, { total: number; count: number }>();

        const ensureScoreAgg = (map: Map<string, { total: number; count: number }>, topicId: string) => {
            if (!map.has(topicId)) {
                map.set(topicId, { total: 0, count: 0 });
            }
            return map.get(topicId)!;
        };

        const ensureMainScoreAgg = (topicId: string) => {
            if (!scoreAggByTopic.has(topicId)) {
                scoreAggByTopic.set(topicId, { total: 0, count: 0, passed: 0, highest: 0, lowest: 100, scores: [], attemptDates: [], lastAttemptAt: null });
            }
            return scoreAggByTopic.get(topicId)!;
        };

        const addParticipant = (topicId: string, userId?: string | null, fallbackName?: string | null) => {
            if (!participantsByTopic.has(topicId)) {
                participantsByTopic.set(topicId, new Set<string>());
            }
            const key = userId ? `u:${userId}` : fallbackName ? `n:${fallbackName}` : null;
            if (key) participantsByTopic.get(topicId)!.add(key);
            return key;
        };

        const markAttempt = (topicId: string, result: any, mode: "single" | "group", participantKey: string | null) => {
            const score = getScorePercent(result);
            const mainAgg = ensureMainScoreAgg(topicId);
            mainAgg.total += score;
            mainAgg.count += 1;
            if (score >= 70) mainAgg.passed += 1;
            if (score > mainAgg.highest) mainAgg.highest = score;
            if (score < mainAgg.lowest) mainAgg.lowest = score;
            mainAgg.scores.push(score);

            const attemptDate = result?.created_at || result?.joined_at || result?.updated_at;
            if (attemptDate) {
                mainAgg.attemptDates.push(attemptDate);
                if (!mainAgg.lastAttemptAt || new Date(attemptDate).getTime() > new Date(mainAgg.lastAttemptAt).getTime()) {
                    mainAgg.lastAttemptAt = attemptDate;
                }
            }

            const modeAgg = ensureScoreAgg(mode === "single" ? scoreAggSingleByTopic : scoreAggGroupByTopic, topicId);
            modeAgg.total += score;
            modeAgg.count += 1;

            if (participantKey) {
                const bucket = mode === "single" ? singleParticipantsByTopic : groupParticipantsByTopic;
                if (!bucket.has(topicId)) {
                    bucket.set(topicId, new Set<string>());
                }
                bucket.get(topicId)!.add(participantKey);
            }
        };

        (hostedResults || []).forEach((result: any) => {
            const topicId = resolveTopicId(result);
            if (!topicId) return;
            const row = ensure(topicId);
            row.groupAttempts += 1;
            row.challengeAttempts += 1;
            const participantKey = addParticipant(topicId, result.user_id || result.user?.id, result.user?.name);
            markAttempt(topicId, result, "group", participantKey || null);
        });

        (singleResults || []).forEach((result: any) => {
            const topicId = resolveTopicId(result);
            if (!topicId) return;
            const row = ensure(topicId);
            row.singleAttempts += 1;
            row.challengeAttempts += 1;
            const participantKey = addParticipant(
                topicId,
                result.user_id || result.user?.id,
                result.user?.name || result.name || result.participant_display_name
            );
            markAttempt(topicId, result, "single", participantKey || null);
        });

        const allTopicIds = new Set<string>([
            ...Array.from(statsMap.keys()),
            ...Array.from(participantsByTopic.keys()),
            ...Array.from(singleParticipantsByTopic.keys()),
            ...Array.from(groupParticipantsByTopic.keys()),
            ...Array.from(scoreAggByTopic.keys()),
        ]);

        allTopicIds.forEach((topicId) => {
            const row = ensure(topicId);
            row.uniqueChallengeParticipants = participantsByTopic.get(topicId)?.size || 0;
            row.uniqueParticipants = row.uniqueChallengeParticipants;
            row.uniqueSingleParticipants = singleParticipantsByTopic.get(topicId)?.size || 0;
            row.uniqueGroupParticipants = groupParticipantsByTopic.get(topicId)?.size || 0;
            row.totalAttempts = row.challengeAttempts;

            const allAgg = scoreAggByTopic.get(topicId);
            const singleAgg = scoreAggSingleByTopic.get(topicId);
            const groupAgg = scoreAggGroupByTopic.get(topicId);

            row.averageScoreOverall = allAgg?.count ? Math.round(allAgg.total / allAgg.count) : 0;
            row.averageScoreSingle = singleAgg?.count ? Math.round(singleAgg.total / singleAgg.count) : 0;
            row.averageScoreGroup = groupAgg?.count ? Math.round(groupAgg.total / groupAgg.count) : 0;
            row.highestScore = allAgg?.highest || 0;
            row.lowestScore = allAgg?.count ? allAgg.lowest : 0;
            row.medianScore = allAgg?.scores ? getMedianScore(allAgg.scores) : 0;
            row.passRate = allAgg?.count ? Math.round((allAgg.passed / allAgg.count) * 100) : 0;
            row.highPerformersCount = allAgg?.scores.filter((score) => score >= 90).length || 0;
            row.lowPerformersCount = allAgg?.scores.filter((score) => score < 50).length || 0;
            row.lastAttemptAt = allAgg?.lastAttemptAt || null;

            const now = Date.now();
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
            const attemptTimes = (allAgg?.attemptDates || [])
                .map((date) => new Date(date).getTime())
                .filter((time) => Number.isFinite(time));

            row.attemptsToday = attemptTimes.filter((time) => time >= startOfToday.getTime()).length;
            row.attemptsLast7Days = attemptTimes.filter((time) => time >= sevenDaysAgo).length;
            row.activityDaysLast30Days = new Set(
                (allAgg?.attemptDates || [])
                    .filter((date) => {
                        const time = new Date(date).getTime();
                        return Number.isFinite(time) && time >= thirtyDaysAgo;
                    })
                    .map((date) => new Date(date).toISOString().slice(0, 10))
            ).size;
        });

        return statsMap;
    }, [topics, hostedResults, singleResults]);

    // CRUD Handlers
    const handleCreateTopic = () => {
        setEditingTopic(null);
        setIsEditorOpen(true);
    };

    const handleEditTopic = (topic: ExtendedTopic) => {
        setEditingTopic(topic);
        setIsEditorOpen(true);
    };

    const handleSaveTopic = async (topicData: any) => {
        const mediaItems = topicData.media || [];
        const challengeItems = topicData.challengeItems || [];

        try {
            const presetFields = selectValueToPresetFields(
                (topicData.studentChallengePreset as StudentChallengePresetValue) || "free"
            );

            if (editingTopic) {
                // Update existing topic - use mutateAsync for proper error handling
                const updatedTopic = await updateTopicMutation.mutateAsync({
                    id: editingTopic.id,
                    updates: {
                        title: topicData.title,
                        description: topicData.description,
                        thumbnail: topicData.thumbnail,
                        duration: topicData.duration,
                        discussions_enabled: topicData.discussionsEnabled ?? true,
                        collect_single_challenge_participant_data: topicData.collectSingleChallengeParticipantData === true,
                        student_challenge_mode: presetFields.student_challenge_mode,
                        student_challenge_category: presetFields.student_challenge_category,
                        correct_sound_url: topicData.correctSoundUrl || null,
                        wrong_sound_url: topicData.wrongSoundUrl || null,
                        answering_background_sound_url: topicData.answeringBackgroundSoundUrl || null,
                    }
                });

                const topicId = updatedTopic?.id || editingTopic.id;
                try {
                    // Always save media items to DB (handles add, update and delete cases)
                    await saveMediaMutation.mutateAsync({ topicId, media: mediaItems });
                    // Always save challenge questions to DB
                    await saveChallengeQuestionsMutation.mutateAsync({ topicId, questions: challengeItems });
                    toast({ title: "تم تحديث الدرس بنجاح ✓" });
                    setIsEditorOpen(false);
                } catch (err: any) {
                    console.error("Error saving topic details:", err);
                    toast({
                        title: "خطأ في حفظ المكونات",
                        description: err.message || "حدث خطأ أثناء حفظ الوسائط أو الأسئلة.",
                        variant: "destructive"
                    });
                }
            } else {
                // Create new topic - use mutateAsync for proper error handling
                const newTopic = await createTopicMutation.mutateAsync({
                    subject_id: String(selectedSubjectId),
                    teacherId: teacherProfileId,
                    title: topicData.title,
                    description: topicData.description,
                    thumbnail: topicData.thumbnail,
                    duration: topicData.duration,
                    discussions_enabled: topicData.discussionsEnabled ?? true,
                    collect_single_challenge_participant_data: topicData.collectSingleChallengeParticipantData === true,
                    student_challenge_mode: presetFields.student_challenge_mode,
                    student_challenge_category: presetFields.student_challenge_category,
                    correct_sound_url: topicData.correctSoundUrl || null,
                    wrong_sound_url: topicData.wrongSoundUrl || null,
                    answering_background_sound_url: topicData.answeringBackgroundSoundUrl || null,
                    views: 0
                });

                const topicId = newTopic?.id;
                if (topicId) {
                    try {
                        // Save media items to DB
                        if (mediaItems.length > 0) {
                            await saveMediaMutation.mutateAsync({ topicId, media: mediaItems });
                        }
                        // Save challenge questions to DB
                        if (challengeItems.length > 0) {
                            await saveChallengeQuestionsMutation.mutateAsync({ topicId, questions: challengeItems });
                        }
                        toast({ title: "تم إنشاء الدرس بنجاح ✓" });
                        setIsEditorOpen(false);
                    } catch (err: any) {
                        console.error("Error saving new topic details:", err);
                        toast({
                            title: "تم إنشاء الدرس ولكن مع خطأ",
                            description: "تم إنشاء الدرس، لكن فشل حفظ الوسائط أو الأسئلة.",
                            variant: "destructive"
                        });
                        // Still close editor, let them retry editing
                        setIsEditorOpen(false);
                    }
                }
            }
        } catch (error: any) {
            console.error("Error saving topic:", error);
            toast({
                title: "خطأ غير متوقع",
                description: error.message || "حدث خطأ أثناء محاولة الحفظ.",
                variant: "destructive"
            });
        }
    };

    const handleDeleteTopic = (id: string) => {
        deleteTopicMutation.mutate(id, {
            onSuccess: () => {
                toast({ title: "تم حذف الدرس بنجاح" });
                setDeleteConfirmId(null);
            }
        });
    };

    const handleTogglePublish = (id: string) => {
        const topic = topics.find(t => t.id === id);
        if (!topic) return;

        const newStatus = topic.status === "published" ? "draft" : "published";

        updateTopicMutation.mutate({
            id: topic.id,
            updates: { status: newStatus }
        }, {
            onSuccess: () => {
                toast({
                    title: newStatus === "published" ? "تم نشر الدرس" : "تم تحويل الدرس إلى مسودة",
                    description: topic.title,
                });
            }
        });
    };

    const selectedSubjectName = availableSubjects.find((s: any) => s.id === selectedSubjectId)?.name || "";

    return (
        <div className="space-y-6">
            {/* Grade & Subject Selector */}
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
                <CardContent className="p-4">
                    <div className="flex flex-col gap-4">
                        {/* Grade picker */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary min-w-[120px]">
                                <GraduationCap className="w-5 h-5" />
                                <span>الصف الدراسي:</span>
                            </div>
                            <Select value={selectedGradeId} onValueChange={(val) => { setSelectedGradeId(val); setSelectedSubjectId(""); }}>
                                <SelectTrigger className="w-full sm:w-64 bg-white">
                                    <SelectValue placeholder="اختر الصف" />
                                </SelectTrigger>
                                <SelectContent>
                                    {visibleGrades?.map((grade: any) => (
                                        <SelectItem key={grade.id} value={grade.id}>
                                            {grade.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Subject picker */}
                        {selectedGradeId && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-primary min-w-[120px]">
                                    <BookMarked className="w-5 h-5" />
                                    <span>المادة الدراسية:</span>
                                </div>
                                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                                    <SelectTrigger className="w-full sm:w-64 bg-white">
                                        <SelectValue placeholder="اختر المادة" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSubjects.map((subject: any) => (
                                            <SelectItem key={subject.id} value={subject.id}>
                                                {subject.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedSubjectName && (
                                    <Badge variant="secondary" className="text-xs">
                                        {currentGrade?.name} - {selectedSubjectName}
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Editor View */}
            {isEditorOpen ? (
                <ContentEditor
                    content={editingTopic ? {
                        id: editingTopic.id,
                        title: editingTopic.title,
                        description: editingTopic.description,
                        thumbnail: editingTopic.thumbnail,
                        targetAudience: "all",
                        duration: editingTopic.duration,
                        media: editingTopic.media || [],
                        quiz: editingTopic.quiz || [],
                        challengeItems: editingTopic.challengeItems || [],
                        correctSoundUrl: editingTopic.correct_sound_url || "",
                        wrongSoundUrl: editingTopic.wrong_sound_url || "",
                        answeringBackgroundSoundUrl: editingTopic.answering_background_sound_url || "",
                        discussionsEnabled: editingTopic.discussions_enabled ?? true,
                        collectSingleChallengeParticipantData: editingTopic.collect_single_challenge_participant_data === true,
                        studentChallengeMode: editingTopic.student_challenge_mode ?? null,
                        studentChallengeCategory: editingTopic.student_challenge_category ?? null,
                        views: editingTopic.views,
                        createdAt: editingTopic.createdAt
                    } : undefined}
                    onSave={handleSaveTopic}
                    onCancel={() => {
                        setIsEditorOpen(false);
                        setEditingTopic(null);
                    }}
                />
            ) : (
                <>
                    {/* Header with Search and Add Button */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-96">
                            <Input
                                placeholder="بحث في الدروس..."
                                className="pr-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button className="gap-2" onClick={handleCreateTopic} disabled={!selectedSubjectId}>
                            <Plus className="w-4 h-4" />
                            درس جديد
                        </Button>
                    </div>

                    {/* Delete Confirmation */}
                    <AnimatePresence>
                        {deleteConfirmId !== null && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <Card className="border-destructive/50 bg-destructive/5">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                                <AlertTriangle className="w-6 h-6 text-destructive" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-destructive">تأكيد الحذف</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    هل أنت متأكد من حذف هذا الدرس؟ لا يمكن التراجع عن هذا الإجراء.
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                                                    إلغاء
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteTopic(deleteConfirmId)}>
                                                    <Trash className="w-4 h-4 ml-1" />
                                                    حذف
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Topics List */}
                    <div className="grid grid-cols-1 gap-4">
                        {isLoadingSubject ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <Card key={i} className="overflow-hidden">
                                    <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                                        <Skeleton className="w-full md:w-48 h-32 rounded-lg shrink-0" />
                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <Skeleton className="h-6 w-48 mb-2" />
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-4 w-3/4 mt-1" />
                                            </div>
                                            <div className="flex gap-4 mt-4">
                                                <Skeleton className="h-4 w-20" />
                                                <Skeleton className="h-4 w-20" />
                                                <Skeleton className="h-4 w-20" />
                                            </div>
                                            <div className="flex gap-2 mt-4 pt-4 border-t">
                                                <Skeleton className="h-9 w-32" />
                                                <Skeleton className="h-9 flex-1" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                        <>
                        {filteredTopics.map((topic, i) => (
                            <motion.div
                                key={topic.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                layout
                            >
                                <Card className={`hover:shadow-md transition-shadow ${deleteConfirmId === topic.id ? "ring-2 ring-destructive" : ""}`}>
                                    <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                                        {/* Thumbnail */}
                                        <div className="w-full md:w-48 h-32 rounded-lg overflow-hidden shrink-0 relative group">
                                            <img
                                                src={topic.thumbnail}
                                                alt={topic.title}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                            />
                                            <button
                                                onClick={() => handleTogglePublish(topic.id)}
                                                className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${topic.status === "published"
                                                    ? "bg-success text-success-foreground"
                                                    : "bg-warning text-warning-foreground"
                                                    }`}
                                            >
                                                {topic.status === "published" ? "✓ منشور" : "مسودة"}
                                            </button>
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link to={`/grade/${selectedGradeId}/subject/${selectedSubjectId}/topic/${topic.id}`}>
                                                    <Button size="sm" variant="secondary" className="gap-2">
                                                        <Eye className="w-4 h-4" />
                                                        معاينة
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-bold text-lg">{topic.title}</h3>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground line-clamp-2">{topic.description}</p>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem className="gap-2" onClick={() => handleEditTopic(topic)}>
                                                                <Edit className="w-4 h-4" />
                                                                تعديل
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="gap-2 text-destructive"
                                                                onClick={() => setDeleteConfirmId(topic.id)}
                                                            >
                                                                <Trash className="w-4 h-4" />
                                                                حذف
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>

                                                <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {topic.createdAt}
                                                    </div>
                                                    {topic.duration && (
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-4 h-4" />
                                                            {topic.duration}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1">
                                                        <Video className="w-4 h-4" />
                                                        {topic.mediaCount} موارد
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <ListChecks className="w-4 h-4" />
                                                        {topic.quizCount} سؤال/لعبة
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Eye className="w-4 h-4" />
                                                        {getTopicViewerCount(topic)} مشاهدة
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => handleEditTopic(topic)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    تعديل المحتوى
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-2 text-primary hover:text-primary"
                                                    onClick={() => setSelectedTopicStats(topic)}
                                                >
                                                    <BarChart3 className="w-4 h-4" />
                                                    إحصائيات المحتوى
                                                </Button>
                                                <div className="flex flex-1 min-w-[min(100%,14rem)] gap-2">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                className="flex-1 min-w-0 gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                                                disabled={topic.status === "draft"}
                                                            >
                                                                <Gamepad2 className="w-4 h-4 shrink-0" />
                                                                إنشاء تحدي
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-52">
                                                            <DropdownMenuItem
                                                                className="gap-2 cursor-pointer"
                                                                onClick={() =>
                                                                    onCreateChallenge(topic.id, {
                                                                        title: topic.title,
                                                                        gradeId: selectedGradeId,
                                                                        subjectId: selectedSubjectId,
                                                                        category: "ACTIVITIES",
                                                                    })
                                                                }
                                                            >
                                                                <ListChecks className="w-4 h-4 text-blue-500 shrink-0" />
                                                                أنشطة تفاعلية
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="gap-2 cursor-pointer"
                                                                onClick={() =>
                                                                    onCreateChallenge(topic.id, {
                                                                        title: topic.title,
                                                                        gradeId: selectedGradeId,
                                                                        subjectId: selectedSubjectId,
                                                                        category: "GAMES",
                                                                    })
                                                                }
                                                            >
                                                                <Gamepad2 className="w-4 h-4 text-purple-500 shrink-0" />
                                                                أنشطة تلعيبية
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="gap-2 cursor-pointer font-semibold"
                                                                onClick={() =>
                                                                    onCreateChallenge(topic.id, {
                                                                        title: topic.title,
                                                                        gradeId: selectedGradeId,
                                                                        subjectId: selectedSubjectId,
                                                                        category: "MIXED",
                                                                    })
                                                                }
                                                            >
                                                                <Target className="w-4 h-4 text-emerald-500 shrink-0" />
                                                                الكل (مختلط)
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                className="flex-1 min-w-0 gap-2 border-primary/35 text-primary hover:bg-primary/10"
                                                                disabled={topic.status === "draft"}
                                                            >
                                                                <Calendar className="w-4 h-4 shrink-0" />
                                                                تحدي مجدول
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56">
                                                            <DropdownMenuItem
                                                                className="gap-2 cursor-pointer"
                                                                onClick={() =>
                                                                    onCreateChallenge(topic.id, {
                                                                        title: topic.title,
                                                                        gradeId: selectedGradeId,
                                                                        subjectId: selectedSubjectId,
                                                                        category: "ACTIVITIES",
                                                                        isScheduled: true,
                                                                    })
                                                                }
                                                            >
                                                                <ListChecks className="w-4 h-4 text-blue-500 shrink-0" />
                                                                أنشطة تفاعلية
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="gap-2 cursor-pointer"
                                                                onClick={() =>
                                                                    onCreateChallenge(topic.id, {
                                                                        title: topic.title,
                                                                        gradeId: selectedGradeId,
                                                                        subjectId: selectedSubjectId,
                                                                        category: "GAMES",
                                                                        isScheduled: true,
                                                                    })
                                                                }
                                                            >
                                                                <Gamepad2 className="w-4 h-4 text-purple-500 shrink-0" />
                                                                أنشطة تلعيبية
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="gap-2 cursor-pointer font-semibold"
                                                                onClick={() =>
                                                                    onCreateChallenge(topic.id, {
                                                                        title: topic.title,
                                                                        gradeId: selectedGradeId,
                                                                        subjectId: selectedSubjectId,
                                                                        category: "MIXED",
                                                                        isScheduled: true,
                                                                    })
                                                                }
                                                            >
                                                                <Target className="w-4 h-4 text-emerald-500 shrink-0" />
                                                                الكل (مختلط)
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                className="flex-1 min-w-0 gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
                                                                disabled={topic.status === "draft"}
                                                            >
                                                                <QrCode className="w-4 h-4 shrink-0" />
                                                                QR فردي
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56">
                                                            {SINGLE_SHARE_OPTIONS.map((option) => (
                                                                <DropdownMenuItem
                                                                    key={option.category}
                                                                    className="gap-2 cursor-pointer"
                                                                    onClick={() => {
                                                                        setSingleShareDialogTopic(topic);
                                                                        setSingleShareCategory(option.category);
                                                                    }}
                                                                >
                                                                    <QrCode className="w-4 h-4 text-violet-600 shrink-0" />
                                                                    {option.label}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>

                                            {(singleResultsByTopicId.get(String(topic.id))?.length ?? 0) > 0 && (
                                                <div className="mt-4 pt-4 border-t border-dashed border-primary/20">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        dir="rtl"
                                                        className="group relative h-auto w-full overflow-hidden rounded-2xl border-primary/25 bg-gradient-to-br from-primary/[0.09] via-primary/[0.02] to-transparent py-4 px-4 shadow-sm transition-all hover:border-primary/45 hover:shadow-md hover:from-primary/[0.12] sm:max-w-md"
                                                        onClick={() => setSingleChallengeResultsTopic(topic)}
                                                    >
                                                        <span className="flex w-full items-center justify-between gap-3">
                                                            <span className="flex min-w-0 flex-1 items-center gap-3">
                                                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner ring-1 ring-primary/15">
                                                                    <Trophy className="h-6 w-6" />
                                                                </span>
                                                                <span className="flex min-w-0 flex-col gap-0.5 text-start">
                                                                    <span className="font-bold leading-tight text-foreground">
                                                                        نتائج التحدي الفردي
                                                                    </span>
                                                                    <span className="text-xs font-normal text-muted-foreground">
                                                                        أسماء المحاولات والدرجات — الأحدث أولاً
                                                                    </span>
                                                                </span>
                                                            </span>
                                                            <span className="flex shrink-0 items-center gap-2">
                                                                <Badge className="h-7 min-w-[1.75rem] justify-center rounded-full bg-primary px-2.5 text-xs font-bold text-primary-foreground shadow-sm">
                                                                    {singleResultsByTopicId.get(String(topic.id))!.length}
                                                                </Badge>
                                                                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                                                            </span>
                                                        </span>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}

                        {/* Empty State */}
                        {filteredTopics.length === 0 && (
                            <Card className="p-12 text-center">
                                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                                <h3 className="text-xl font-bold mb-2">
                                    {searchQuery ? "لا توجد نتائج" : "لا توجد دروس"}
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    {searchQuery
                                        ? `لم نجد دروساً تطابق "${searchQuery}"`
                                        : "ابدأ بإضافة درس جديد لمادتك"}
                                </p>
                                {!searchQuery && (
                                    <Button onClick={handleCreateTopic} className="gap-2">
                                        <Plus className="w-4 h-4" />
                                        إضافة درس جديد
                                    </Button>
                                )}
                            </Card>
                        )}
                        </>
                        )}
                    </div>

                    {/* Stats Summary */}
                    {topics.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">إحصائيات الدروس</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-primary">{topics.length}</div>
                                        <div className="text-xs text-muted-foreground">إجمالي الدروس</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-success">
                                            {topics.filter(t => t.status === "published").length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">منشور</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-500">
                                            {topics.reduce((sum, t) => sum + (t.mediaCount || 0), 0)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">موارد تعليمية</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-500">
                                            {topics.reduce((sum, t) => sum + (t.quizCount || 0), 0)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">أسئلة وألعاب</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
            <Dialog open={!!selectedTopicStats} onOpenChange={(open) => !open && setSelectedTopicStats(null)}>
                <DialogContent dir="rtl" className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>تقرير المحتوى الكامل: {selectedTopicStats?.title}</DialogTitle>
                        <DialogDescription>
                            تقرير تفصيلي لأداء المحتوى يشمل المشاهدات، محاولات التحدي، متوسط الدرجات، والنشاط الزمني.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedTopicStats && (
                        <div className="space-y-5">
                            {(() => {
                                const stats = topicStatsById.get(String(selectedTopicStats.id));
                                const metrics = topicReport || stats || {
                                    viewers: selectedTopicStats.views || 0,
                                    uniqueViewers: 0,
                                    totalAttempts: 0,
                                    singleAttempts: 0,
                                    groupAttempts: 0,
                                    uniqueParticipants: 0,
                                    uniqueSingleParticipants: 0,
                                    uniqueGroupParticipants: 0,
                                    averageScoreOverall: 0,
                                    averageScoreSingle: 0,
                                    averageScoreGroup: 0,
                                    highestScore: 0,
                                    lowestScore: 0,
                                    medianScore: 0,
                                    passRate: 0,
                                    highPerformersCount: 0,
                                    lowPerformersCount: 0,
                                    attemptsToday: 0,
                                    attemptsLast7Days: 0,
                                    activityDaysLast30Days: 0,
                                    lastAttemptAt: null,
                                    questionAnalytics: [],
                                };

                                const singleShare = metrics.totalAttempts > 0
                                    ? Math.round((metrics.singleAttempts / metrics.totalAttempts) * 100)
                                    : 0;
                                const groupShare = metrics.totalAttempts > 0
                                    ? Math.round((metrics.groupAttempts / metrics.totalAttempts) * 100)
                                    : 0;
                                const modeChartData = [
                                    { name: "فردي", value: metrics.singleAttempts, color: "#3b82f6" },
                                    { name: "جماعي", value: metrics.groupAttempts, color: "#10b981" },
                                ].filter((d) => d.value > 0);
                                const scoreChartData = [
                                    { label: "متوسط", value: metrics.averageScoreOverall },
                                    { label: "وسيط", value: metrics.medianScore },
                                    { label: "أعلى", value: metrics.highestScore },
                                    { label: "أدنى", value: metrics.lowestScore },
                                ];

                                const quickCards = [
                                    { label: "إجمالي المشاهدات", value: metrics.viewers },
                                    { label: "مشاهدون فريدون", value: metrics.uniqueViewers },
                                    { label: "إجمالي المحاولات", value: metrics.totalAttempts },
                                    { label: "متوسط الأداء العام", value: `${metrics.averageScoreOverall}%` },
                                    { label: "أعلى نتيجة", value: `${metrics.highestScore}%` },
                                    { label: "معدل النجاح", value: `${metrics.passRate}%` },
                                ];

                                return (
                                    <>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {quickCards.map((card) => (
                                                <Card key={card.label} className="border-primary/10 bg-primary/5">
                                                    <CardContent className="p-4 text-center">
                                                        <div className="text-2xl font-black text-primary">{card.value}</div>
                                                        <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Card className="border-blue-200 bg-blue-50/50">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">تفاصيل التحدي الفردي</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">عدد المحاولات</span>
                                                        <span className="font-bold">{metrics.singleAttempts}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">عدد المستخدمين (فريد)</span>
                                                        <span className="font-bold">{metrics.uniqueSingleParticipants}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">متوسط الدرجات</span>
                                                        <span className="font-bold">{metrics.averageScoreSingle}%</span>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-emerald-200 bg-emerald-50/50">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">تفاصيل التحدي الجماعي</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">عدد المحاولات</span>
                                                        <span className="font-bold">{metrics.groupAttempts}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">عدد المستخدمين (فريد)</span>
                                                        <span className="font-bold">{metrics.uniqueGroupParticipants}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">متوسط الدرجات</span>
                                                        <span className="font-bold">{metrics.averageScoreGroup}%</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Card className="border-primary/20">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">مخطط المحاولات (فردي/جماعي)</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    {modeChartData.length > 0 ? (
                                                        <div className="h-56" dir="ltr">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <PieChart>
                                                                    <Pie
                                                                        data={modeChartData}
                                                                        dataKey="value"
                                                                        nameKey="name"
                                                                        cx="50%"
                                                                        cy="50%"
                                                                        innerRadius={50}
                                                                        outerRadius={80}
                                                                        paddingAngle={4}
                                                                    >
                                                                        {modeChartData.map((entry) => (
                                                                            <Cell key={entry.name} fill={entry.color} />
                                                                        ))}
                                                                    </Pie>
                                                                    <RechartsTooltip />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    ) : (
                                                        <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                                                            لا توجد بيانات كافية للرسم
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                                                        <div className="flex items-center gap-1">
                                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                            فردي ({metrics.singleAttempts})
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                            جماعي ({metrics.groupAttempts})
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-primary/20">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">مخطط الدرجات</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="h-56" dir="ltr">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={scoreChartData}>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                                <XAxis dataKey="label" />
                                                                <YAxis domain={[0, 100]} />
                                                                <RechartsTooltip />
                                                                <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        <Card className="border-muted">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm">ملخص التقرير</CardTitle>
                                            </CardHeader>
                                            <CardContent className="text-sm space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">إجمالي الطلاب المشاركين في التحديات</span>
                                                    <span className="font-bold">{metrics.uniqueParticipants}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">آخر محاولة</span>
                                                    <span className="font-bold">
                                                        {metrics.lastAttemptAt
                                                            ? new Date(metrics.lastAttemptAt).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })
                                                            : "لا توجد"}
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-primary/20">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm">تحليل الأسئلة</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {Array.isArray(metrics.questionAnalytics) && metrics.questionAnalytics.length > 0 ? (
                                                    <>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div className="rounded-xl border bg-red-50/50 p-3">
                                                                <div className="text-xs text-muted-foreground mb-1">الأكثر خطأ</div>
                                                                <div className="font-bold text-sm line-clamp-1">
                                                                    {(() => {
                                                                        const mostWrong = [...metrics.questionAnalytics].sort((a: any, b: any) => b.wrong - a.wrong)[0];
                                                                        return mostWrong?.questionText || "—";
                                                                    })()}
                                                                </div>
                                                            </div>
                                                            <div className="rounded-xl border bg-emerald-50/50 p-3">
                                                                <div className="text-xs text-muted-foreground mb-1">الأكثر صحة</div>
                                                                <div className="font-bold text-sm line-clamp-1">
                                                                    {(() => {
                                                                        const mostCorrect = [...metrics.questionAnalytics].sort((a: any, b: any) => b.correct - a.correct)[0];
                                                                        return mostCorrect?.questionText || "—";
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="rounded-xl border overflow-hidden">
                                                            <div className="grid grid-cols-12 bg-muted/50 px-3 py-2 text-xs font-bold text-muted-foreground">
                                                                <div className="col-span-5">السؤال</div>
                                                                <div className="col-span-2 text-center">المحاولات</div>
                                                                <div className="col-span-2 text-center">صحيح</div>
                                                                <div className="col-span-1 text-center">خطأ</div>
                                                                <div className="col-span-2 text-center">الدقة</div>
                                                            </div>
                                                            <div className="max-h-64 overflow-y-auto">
                                                                {metrics.questionAnalytics.map((q: any) => (
                                                                    <div key={q.questionId} className="grid grid-cols-12 px-3 py-2 text-xs border-t">
                                                                        <div className="col-span-5 line-clamp-2">{q.questionText}</div>
                                                                        <div className="col-span-2 text-center font-bold">{q.attempts}</div>
                                                                        <div className="col-span-2 text-center font-bold text-emerald-600">{q.correct}</div>
                                                                        <div className="col-span-1 text-center font-bold text-red-600">{q.wrong}</div>
                                                                        <div className="col-span-2 text-center font-black">{q.accuracy}%</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-sm text-muted-foreground text-center py-6 border rounded-xl border-dashed">
                                                        لا توجد بيانات كافية لتحليل الأسئلة بعد
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Card className="border-amber-200 bg-amber-50/40">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">تحليل التوزيع</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">أدنى نتيجة</span>
                                                        <span className="font-bold">{metrics.lowestScore}%</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">الوسيط (Median)</span>
                                                        <span className="font-bold">{metrics.medianScore}%</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">نتائج ممتازة (+90)</span>
                                                        <span className="font-bold">{metrics.highPerformersCount}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">نتائج منخفضة (&lt;50)</span>
                                                        <span className="font-bold">{metrics.lowPerformersCount}</span>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-violet-200 bg-violet-50/40">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">تحليل النشاط</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">محاولات اليوم</span>
                                                        <span className="font-bold">{metrics.attemptsToday}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">محاولات آخر 7 أيام</span>
                                                        <span className="font-bold">{metrics.attemptsLast7Days}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">أيام نشاط آخر 30 يوم</span>
                                                        <span className="font-bold">{metrics.activityDaysLast30Days}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">نسبة محاولات الفردي</span>
                                                        <span className="font-bold">{singleShare}%</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">نسبة محاولات الجماعي</span>
                                                        <span className="font-bold">{groupShare}%</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!singleChallengeResultsTopic}
                onOpenChange={(open) => {
                    if (!open) {
                        setSingleChallengeResultsTopic(null);
                        setExpandedSingleAttempt(null);
                    }
                }}
            >
                <DialogContent
                    dir="rtl"
                    className="flex h-[90dvh] max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
                >
                    <DialogHeader className="relative shrink-0 space-y-0 border-0 bg-gradient-to-bl from-primary/[0.12] via-primary/[0.04] to-transparent px-6 pb-5 pt-6 text-start">
                        <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-background/90 text-primary shadow-md ring-1 ring-primary/10">
                                <Trophy className="h-7 w-7" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                                <DialogTitle className="text-xl font-black leading-snug sm:text-2xl">
                                    نتائج التحدي الفردي
                                </DialogTitle>
                                {singleChallengeResultsTopic && (
                                    <p className="truncate text-sm font-semibold text-primary">
                                        {singleChallengeResultsTopic.title}
                                    </p>
                                )}
                                <DialogDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                                    تقرير تفصيلي لبيانات التحدي الفردي المجمعة: الدرجات، الزمن، المشاركين، النشاط، وتحليل الأسئلة.
                                </DialogDescription>
                            </div>
                            {singleChallengeCollectedReport && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0 gap-2 border-primary/30 bg-background/80 text-primary hover:bg-primary/10"
                                    onClick={handleDownloadSingleReportPdf}
                                    disabled={isSingleReportPdfDownloading}
                                >
                                    <Download className="h-4 w-4" />
                                    {isSingleReportPdfDownloading ? "جاري..." : "تنزيل PDF"}
                                </Button>
                            )}
                        </div>
                    </DialogHeader>

                    {singleChallengeResultsTopic && singleChallengeCollectedReport && (
                        <ScrollArea dir="rtl" className="min-h-0 flex-1">
                            <div className="space-y-4 p-4 sm:p-6">
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
                                    {[
                                        { label: "محاولات", value: singleChallengeCollectedReport.count, color: "text-foreground" },
                                        { label: "مشاركون", value: singleChallengeCollectedReport.uniqueParticipants, color: "text-primary" },
                                        { label: "المتوسط", value: `${singleChallengeCollectedReport.averageScore}%`, color: "text-emerald-700" },
                                        { label: "الأفضل", value: `${singleChallengeCollectedReport.bestScore}%`, color: "text-amber-700" },
                                        { label: "الوسيط", value: `${singleChallengeCollectedReport.medianScore}%`, color: "text-blue-700" },
                                        { label: "معدل النجاح", value: `${singleChallengeCollectedReport.passRate}%`, color: "text-violet-700" },
                                    ].map((card) => (
                                        <div key={card.label} className="rounded-2xl border bg-background/80 p-3 text-center shadow-sm">
                                            <div className={`text-xl font-black tabular-nums ${card.color}`}>{card.value}</div>
                                            <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{card.label}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                    <Card className="border-primary/20">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">توزيع الدرجات</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-56" dir="ltr">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={singleChallengeCollectedReport.scoreDistribution}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="label" />
                                                        <YAxis allowDecimals={false} />
                                                        <RechartsTooltip />
                                                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                                            {singleChallengeCollectedReport.scoreDistribution.map((entry) => (
                                                                <Cell key={entry.label} fill={entry.fill} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-primary/20">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">النشاط آخر 7 أيام</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                                                <div className="rounded-xl border bg-background/80 p-2 text-center">
                                                    <div className="text-lg font-black text-primary">{singleChallengeCollectedReport.weeklyAttempts}</div>
                                                    <div className="text-muted-foreground">محاولات الأسبوع</div>
                                                </div>
                                                <div className="rounded-xl border bg-background/80 p-2 text-center">
                                                    <div className="text-lg font-black text-emerald-700">{singleChallengeCollectedReport.weeklyAverageScore}%</div>
                                                    <div className="text-muted-foreground">متوسط الأسبوع</div>
                                                </div>
                                                <div className="rounded-xl border bg-background/80 p-2 text-center">
                                                    <div className="text-lg font-black text-violet-700">{singleChallengeCollectedReport.weeklyActiveDays}</div>
                                                    <div className="text-muted-foreground">أيام نشطة</div>
                                                </div>
                                                <div className="rounded-xl border bg-background/80 p-2 text-center">
                                                    <div className="text-lg font-black text-amber-700">
                                                        {singleChallengeCollectedReport.weeklyAttempts > 0 ? `${singleChallengeCollectedReport.weeklyPassRate}%` : "—"}
                                                    </div>
                                                    <div className="text-muted-foreground">نجاح الأسبوع (70%+)</div>
                                                    {singleChallengeCollectedReport.weeklyAttempts > 0 && (
                                                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                                                            {singleChallengeCollectedReport.weeklyPassedAttempts} من {singleChallengeCollectedReport.weeklyAttempts} محاولات
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="h-56" dir="ltr">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={singleChallengeCollectedReport.dailyTrend}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="day" />
                                                        <YAxis yAxisId="left" allowDecimals={false} />
                                                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                                                        <RechartsTooltip />
                                                        <Line yAxisId="left" type="monotone" dataKey="attempts" name="المحاولات" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                                                        <Line yAxisId="right" type="monotone" dataKey="avg" name="المتوسط" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                                                        <Line yAxisId="right" type="monotone" dataKey="passRate" name="نسبة النجاح" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                                                <div className="rounded-xl border bg-blue-50/60 p-3">
                                                    <div className="font-bold text-blue-900">أكثر يوم نشاطًا</div>
                                                    <div className="mt-1 text-muted-foreground">
                                                        {singleChallengeCollectedReport.busiestDay?.attempts
                                                            ? `${singleChallengeCollectedReport.busiestDay.day} (${singleChallengeCollectedReport.busiestDay.date}) — ${singleChallengeCollectedReport.busiestDay.attempts} محاولات`
                                                            : "لا توجد محاولات في آخر 7 أيام"}
                                                    </div>
                                                </div>
                                                <div className="rounded-xl border bg-emerald-50/60 p-3">
                                                    <div className="font-bold text-emerald-900">أفضل يوم أداء</div>
                                                    <div className="mt-1 text-muted-foreground">
                                                        {singleChallengeCollectedReport.bestActivityDay
                                                            ? `${singleChallengeCollectedReport.bestActivityDay.day} (${singleChallengeCollectedReport.bestActivityDay.date}) — متوسط ${singleChallengeCollectedReport.bestActivityDay.avg}%`
                                                            : "لا توجد بيانات أداء كافية"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border overflow-hidden">
                                                <div className="grid grid-cols-6 bg-muted/50 px-3 py-2 text-[11px] font-bold text-muted-foreground">
                                                    <div>اليوم</div>
                                                    <div className="text-center">التاريخ</div>
                                                    <div className="text-center">محاولات</div>
                                                    <div className="text-center">مشاركون</div>
                                                    <div className="text-center">متوسط</div>
                                                    <div className="text-center">نجاح</div>
                                                </div>
                                                {singleChallengeCollectedReport.dailyTrend.map((day) => (
                                                    <div key={day.key} className="grid grid-cols-6 border-t px-3 py-2 text-[11px]">
                                                        <div className="font-bold">{day.day}</div>
                                                        <div className="text-center text-muted-foreground">{day.date}</div>
                                                        <div className="text-center font-bold">{day.attempts}</div>
                                                        <div className="text-center">{day.participants}</div>
                                                        <div className="text-center">{day.attempts > 0 ? `${day.avg}%` : "—"}</div>
                                                        <div className="text-center">{day.attempts > 0 ? `${day.passRate}%` : "—"}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                                    <Card className="border-violet-200 bg-violet-50/40 lg:col-span-1">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">نوع المشاركين</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {singleChallengeCollectedReport.participantTypeData.length > 0 ? (
                                                <div className="h-48" dir="ltr">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie data={singleChallengeCollectedReport.participantTypeData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={4}>
                                                                {singleChallengeCollectedReport.participantTypeData.map((entry) => (
                                                                    <Cell key={entry.name} fill={entry.color} />
                                                                ))}
                                                            </Pie>
                                                            <RechartsTooltip />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات</div>
                                            )}
                                            <div className="flex justify-center gap-4 text-xs">
                                                <span>مسجل: {singleChallengeCollectedReport.registeredAttempts}</span>
                                                <span>زائر: {singleChallengeCollectedReport.guestAttempts}</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-emerald-200 bg-emerald-50/40 lg:col-span-2">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">تفاصيل الأداء والزمن</CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black text-emerald-700">{singleChallengeCollectedReport.answerAccuracy}%</div>
                                                <div className="text-xs text-muted-foreground">دقة الإجابات</div>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black">{singleChallengeCollectedReport.totalCorrect}/{singleChallengeCollectedReport.totalCorrect + singleChallengeCollectedReport.totalWrong}</div>
                                                <div className="text-xs text-muted-foreground">صحيح من الإجمالي</div>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black">{formatSeconds(singleChallengeCollectedReport.averageTime)}</div>
                                                <div className="text-xs text-muted-foreground">متوسط الزمن</div>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black">{formatSeconds(singleChallengeCollectedReport.fastestTime)}</div>
                                                <div className="text-xs text-muted-foreground">أسرع محاولة</div>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black text-amber-700">{singleChallengeCollectedReport.highPerformers}</div>
                                                <div className="text-xs text-muted-foreground">ممتاز +90</div>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black text-rose-700">{singleChallengeCollectedReport.supportNeeded}</div>
                                                <div className="text-xs text-muted-foreground">يحتاج دعم &lt;50</div>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black">{singleChallengeCollectedReport.lowestScore}%</div>
                                                <div className="text-xs text-muted-foreground">أدنى نتيجة</div>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black">{singleChallengeCollectedReport.averageStreak}</div>
                                                <div className="text-xs text-muted-foreground">متوسط السلسلة</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card className="border-blue-200 bg-blue-50/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">قراءة تحليلية سريعة</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                                        <div className="rounded-xl border bg-background/80 p-3">
                                            <div className="mb-1 text-xs font-bold text-muted-foreground">أضعف سؤال</div>
                                            <div className="line-clamp-2 font-bold">{singleChallengeCollectedReport.weakestQuestion?.label || "لا توجد بيانات"}</div>
                                            <div className="mt-1 text-xs text-rose-700">
                                                دقة {singleChallengeCollectedReport.weakestQuestion?.accuracy ?? 0}%
                                            </div>
                                        </div>
                                        <div className="rounded-xl border bg-background/80 p-3">
                                            <div className="mb-1 text-xs font-bold text-muted-foreground">أقوى سؤال</div>
                                            <div className="line-clamp-2 font-bold">{singleChallengeCollectedReport.strongestQuestion?.label || "لا توجد بيانات"}</div>
                                            <div className="mt-1 text-xs text-emerald-700">
                                                دقة {singleChallengeCollectedReport.strongestQuestion?.accuracy ?? 0}%
                                            </div>
                                        </div>
                                        <div className="rounded-xl border bg-background/80 p-3">
                                            <div className="mb-1 text-xs font-bold text-muted-foreground">أبطأ سؤال</div>
                                            <div className="line-clamp-2 font-bold">{singleChallengeCollectedReport.slowestQuestion?.label || "لا توجد بيانات"}</div>
                                            <div className="mt-1 text-xs text-amber-700">
                                                متوسط الزمن {formatSeconds(singleChallengeCollectedReport.slowestQuestion?.avgTime || 0)}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200 bg-slate-50/60">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">تحليل إحصائي متقدم</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 lg:grid-cols-6">
                                            {[
                                                { label: "Q1", value: `${singleChallengeCollectedReport.q1Score}%` },
                                                { label: "Q3", value: `${singleChallengeCollectedReport.q3Score}%` },
                                                { label: "IQR", value: `${singleChallengeCollectedReport.iqrScore}` },
                                                { label: "الانحراف المعياري", value: `${singleChallengeCollectedReport.stdDevScore}` },
                                                { label: "معامل التشتت", value: `${singleChallengeCollectedReport.coefficientOfVariation}%` },
                                                { label: "ارتباط الزمن/الدرجة", value: `${singleChallengeCollectedReport.scoreTimeCorrelation} (${singleChallengeCollectedReport.scoreTimeCorrelationLabel})` },
                                            ].map((metric) => (
                                                <div key={metric.label} className="rounded-xl border bg-background/80 p-3 text-center">
                                                    <div className="font-black text-slate-800">{metric.value}</div>
                                                    <div className="mt-1 text-[11px] text-muted-foreground">{metric.label}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="rounded-xl border bg-background/80 p-3">
                                            <div className="mb-2 text-sm font-bold">توصيات مبنية على البيانات</div>
                                            <ul className="space-y-1 text-sm text-muted-foreground">
                                                {singleChallengeCollectedReport.recommendations.map((item, index) => (
                                                    <li key={index} className="flex gap-2">
                                                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                    <Card className="border-slate-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">ملخص الربعيات والمدى</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-56" dir="ltr">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={singleChallengeCollectedReport.scoreBoxData}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="label" />
                                                        <YAxis domain={[0, 100]} />
                                                        <RechartsTooltip />
                                                        <Bar dataKey="value" name="القيمة" radius={[6, 6, 0, 0]}>
                                                            {singleChallengeCollectedReport.scoreBoxData.map((entry) => (
                                                                <Cell key={entry.label} fill={entry.fill} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-slate-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">علاقة الزمن بالدرجة</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {singleChallengeCollectedReport.scoreTimeScatterData.length > 1 ? (
                                                <div className="h-56" dir="ltr">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <ScatterChart>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis type="number" dataKey="time" name="الوقت" unit="ث" />
                                                            <YAxis type="number" dataKey="score" name="الدرجة" unit="%" domain={[0, 100]} />
                                                            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" />
                                                            <RechartsTooltip cursor={{ strokeDasharray: "3 3" }} />
                                                            <Scatter data={singleChallengeCollectedReport.scoreTimeScatterData} fill="#6366f1" name="محاولة" />
                                                        </ScatterChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="py-12 text-center text-sm text-muted-foreground">لا توجد بيانات زمن كافية لتحليل العلاقة</div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                    <Card className="border-cyan-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">شرائح المتعلمين</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-56" dir="ltr">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={singleChallengeCollectedReport.learnerSegments}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                        <YAxis allowDecimals={false} />
                                                        <RechartsTooltip />
                                                        <Bar dataKey="count" name="العدد" radius={[6, 6, 0, 0]}>
                                                            {singleChallengeCollectedReport.learnerSegments.map((entry) => (
                                                                <Cell key={entry.name} fill={entry.fill} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-rose-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">تصنيف صعوبة الأسئلة</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {singleChallengeCollectedReport.questionDifficultyData.length > 0 ? (
                                                <div className="h-56" dir="ltr">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie data={singleChallengeCollectedReport.questionDifficultyData} dataKey="count" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={4}>
                                                                {singleChallengeCollectedReport.questionDifficultyData.map((entry) => (
                                                                    <Cell key={entry.name} fill={entry.fill} />
                                                                ))}
                                                            </Pie>
                                                            <RechartsTooltip />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="py-12 text-center text-sm text-muted-foreground">لا توجد بيانات أسئلة كافية</div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                    <Card className="border-emerald-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">الصحيح مقابل الخطأ</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {singleChallengeCollectedReport.answerOutcomeData.length > 0 ? (
                                                <div className="h-56" dir="ltr">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie data={singleChallengeCollectedReport.answerOutcomeData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={4}>
                                                                {singleChallengeCollectedReport.answerOutcomeData.map((entry) => (
                                                                    <Cell key={entry.name} fill={entry.color} />
                                                                ))}
                                                            </Pie>
                                                            <RechartsTooltip />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="py-12 text-center text-sm text-muted-foreground">لا توجد بيانات إجابات كافية</div>
                                            )}
                                            <div className="flex justify-center gap-4 text-xs">
                                                <span>صحيح: {singleChallengeCollectedReport.totalCorrect}</span>
                                                <span>خطأ: {singleChallengeCollectedReport.totalWrong}</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-amber-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">أفضل درجات المشاركين</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-56" dir="ltr">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={singleChallengeCollectedReport.topScoreChartData}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                                        <YAxis domain={[0, 100]} />
                                                        <RechartsTooltip />
                                                        <Bar dataKey="score" name="الدرجة" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {singleChallengeCollectedReport.questionAccuracyChartData.length > 0 && (
                                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                        <Card className="border-primary/20">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm">دقة كل سؤال</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-64" dir="ltr">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={singleChallengeCollectedReport.questionAccuracyChartData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                            <XAxis dataKey="shortLabel" />
                                                            <YAxis domain={[0, 100]} />
                                                            <RechartsTooltip />
                                                            <Bar dataKey="accuracy" name="الدقة" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-violet-200">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm">أبطأ الأسئلة زمنًا</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-64" dir="ltr">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={singleChallengeCollectedReport.questionTimeChartData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                            <XAxis dataKey="shortLabel" />
                                                            <YAxis allowDecimals={false} />
                                                            <RechartsTooltip />
                                                            <Bar dataKey="avgTime" name="متوسط الزمن بالثواني" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {singleChallengeCollectedReport.questionAnalytics.length > 0 && (
                                    <Card className="border-primary/20">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">تحليل الأسئلة في التحدي الفردي</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="rounded-xl border overflow-hidden">
                                                <div className="grid grid-cols-12 bg-muted/50 px-3 py-2 text-xs font-bold text-muted-foreground">
                                                    <div className="col-span-4">السؤال</div>
                                                    <div className="col-span-2 text-center">المحاولات</div>
                                                    <div className="col-span-2 text-center">الدقة</div>
                                                    <div className="col-span-2 text-center">متوسط الزمن</div>
                                                    <div className="col-span-2 text-center">النقاط</div>
                                                </div>
                                                <div className="max-h-56 overflow-y-auto">
                                                    {singleChallengeCollectedReport.questionAnalytics.map((question) => (
                                                        <div key={question.questionId} className="grid grid-cols-12 border-t px-3 py-2 text-xs">
                                                            <div className="col-span-4 font-semibold">{question.label}</div>
                                                            <div className="col-span-2 text-center font-bold">{question.attempts}</div>
                                                            <div className="col-span-2 text-center font-black">{question.accuracy}%</div>
                                                            <div className="col-span-2 text-center">{formatSeconds(question.avgTime)}</div>
                                                            <div className="col-span-2 text-center">{question.points}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <Card className="border-amber-200 bg-amber-50/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">أفضل المحاولات</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {singleChallengeCollectedReport.topAttempts.map((attempt, index) => (
                                            <div key={`${attempt.name}-${index}`} className="flex items-center justify-between rounded-xl border bg-background/80 px-3 py-2 text-sm">
                                                <div>
                                                    <div className="font-bold">{index + 1}. {attempt.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {attempt.correct || attempt.wrong ? `${attempt.correct} صحيح / ${attempt.wrong} خطأ` : "تفاصيل الإجابات غير متاحة"}
                                                    </div>
                                                </div>
                                                <div className="text-end">
                                                    <div className="font-black text-amber-700">{attempt.score}%</div>
                                                    <div className="text-xs text-muted-foreground">{formatSeconds(attempt.timeTaken)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <div className="rounded-2xl border bg-card">
                                    <div className="border-b bg-muted/20 px-4 py-3">
                                        <p className="text-sm font-bold text-foreground">قائمة المشاركين التفصيلية</p>
                                        <p className="text-[11px] text-muted-foreground">اضغط على أي مشارك لعرض تفاصيل الأسئلة التي أجابها.</p>
                                    </div>
                                    <ul dir="rtl" className="space-y-2 p-4">
                                        {sortedSingleResultsForDialog.map((r: any, index: number) => {
                                            const label = getParticipantName(r);
                                            const pct = getScorePercent(r);
                                            const initial = label.replace(/\s/g, "").charAt(0) || "?";
                                            const extra = getStringField(r, ["participant_extra"]);
                                            const correct = getNumberField(r, ["correct_answers", "correctAnswers"]);
                                            const wrong = getNumberField(r, ["wrong_answers", "wrongAnswers"]);
                                            const timeTaken = getNumberField(r, ["time_taken", "timeTaken"]);
                                            const streak = getNumberField(r, ["longest_streak", "longestStreak"]);
                                            const createdAt = getAttemptTimestamp(r);
                                            const attemptKey = getAttemptKey(r, String(index));
                                            const expandedKey = expandedSingleAttempt ? getAttemptKey(expandedSingleAttempt, String(index)) : "";
                                            const isExpanded = expandedKey === attemptKey;
                                            const questionRows = getAttemptQuestionRows(r, singleQuestionTextById);
                                            const scoreClass =
                                                pct >= 75
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                                                    : pct >= 50
                                                      ? "border-amber-200 bg-amber-50 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100"
                                                      : "border-rose-200 bg-rose-50 text-rose-950 dark:bg-rose-950/35 dark:text-rose-100";
                                            return (
                                                <li key={attemptKey} dir="rtl" className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm transition-colors hover:border-primary/25 hover:bg-muted/20">
                                                    <button
                                                        type="button"
                                                        className="flex w-full flex-row items-center gap-3 p-3 text-start sm:gap-4 sm:p-4"
                                                        onClick={() => setExpandedSingleAttempt(isExpanded ? null : r)}
                                                    >
                                                        <div className="flex shrink-0 flex-col items-center gap-1">
                                                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-base font-black text-primary ring-1 ring-primary/15">
                                                                {initial}
                                                            </div>
                                                            <span className="text-[10px] font-bold tabular-nums text-muted-foreground">#{index + 1}</span>
                                                        </div>

                                                        <div className="min-w-0 flex-1 space-y-1.5 text-start">
                                                            <p className="truncate text-base font-bold leading-tight text-foreground">{label}</p>
                                                            {extra ? <p className="line-clamp-2 text-start text-xs leading-snug text-muted-foreground">{extra}</p> : null}
                                                            <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <Clock className="h-3.5 w-3.5 shrink-0" />
                                                                    <span className="tabular-nums">
                                                                        {createdAt
                                                                            ? new Date(createdAt).toLocaleString("ar-SA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                                                                            : "—"}
                                                                    </span>
                                                                </span>
                                                                <span>{correct || wrong ? `${correct} صحيح / ${wrong} خطأ` : "بدون تفاصيل إجابات"}</span>
                                                                <span>الوقت: {formatSeconds(timeTaken)}</span>
                                                                {streak > 0 && <span>السلسلة: {streak}</span>}
                                                                <span className="font-semibold text-primary">{isExpanded ? "إخفاء التفاصيل" : "عرض تفاصيل الأسئلة"}</span>
                                                                {!isRegisteredAttempt(r) && (
                                                                    <Badge variant="outline" className="h-5 border-violet-200 bg-violet-50 text-[10px] text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
                                                                        زائر
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className={`flex min-w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-xl border px-2.5 py-2 text-center ${scoreClass}`}>
                                                            <span className="text-xl font-black tabular-nums leading-none">
                                                                {pct}<span className="ms-0.5 text-xs font-bold opacity-80">%</span>
                                                            </span>
                                                        </div>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="border-t bg-muted/20 p-3 sm:p-4">
                                                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                                <div>
                                                                    <p className="text-sm font-black text-foreground">تفاصيل إجابات {label}</p>
                                                                    <p className="text-xs text-muted-foreground">الصحيح والخطأ لكل سؤال، مع الوقت والنقاط.</p>
                                                                </div>
                                                                <Badge variant="outline">{questionRows.length} سؤال</Badge>
                                                            </div>

                                                            {questionRows.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {questionRows.map((question, qIndex) => (
                                                                        <div key={`${attemptKey}-${question.questionId}-${qIndex}`} className={`rounded-xl border p-3 ${question.correct ? "border-emerald-200 bg-emerald-50/70" : "border-rose-200 bg-rose-50/70"}`}>
                                                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                                                <div className="min-w-0 flex-1">
                                                                                    <p className="text-sm font-bold leading-relaxed text-foreground">
                                                                                        {qIndex + 1}. {question.label}
                                                                                    </p>
                                                                                    {question.userAnswer && (
                                                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                                                            إجابة الطالب: {question.userAnswer}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                                <Badge className={question.correct ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}>
                                                                                    {question.correct ? "صحيح" : "خطأ"}
                                                                                </Badge>
                                                                            </div>
                                                                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                                                                <span>الوقت: {formatSeconds(question.timeTaken)}</span>
                                                                                <span>النقاط: {question.pointsEarned}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="rounded-xl border border-dashed bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
                                                                    لا توجد تفاصيل أسئلة محفوظة لهذه المحاولة. تظهر هنا التفاصيل عندما تحتوي النتيجة على بيانات <span dir="ltr">question_results</span>.
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        </ScrollArea>
                    )}

                    {singleChallengeResultsTopic && !singleChallengeCollectedReport && (
                        <div className="px-6 py-14 text-center text-sm text-muted-foreground">
                            لا توجد محاولات مسجّلة لهذا الدرس.
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!singleShareDialogTopic} onOpenChange={(open) => !open && setSingleShareDialogTopic(null)}>
                <DialogContent dir="rtl" className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>مشاركة التحدي الفردي عبر QR</DialogTitle>
                        <DialogDescription>
                            اختر نوع الرابط ثم شاركه مع الطلاب عبر مسح QR أو نسخ الرابط المباشر.
                        </DialogDescription>
                    </DialogHeader>

                    {singleShareDialogTopic && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {SINGLE_SHARE_OPTIONS.map((option) => (
                                    <Button
                                        key={option.category}
                                        type="button"
                                        variant={singleShareCategory === option.category ? "default" : "outline"}
                                        className="text-xs"
                                        onClick={() => setSingleShareCategory(option.category)}
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>

                            <div className="rounded-xl border bg-muted/20 p-4 text-center space-y-3">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(buildSingleShareLink(singleShareDialogTopic.id, singleShareCategory))}`}
                                    alt="QR Code"
                                    className="w-56 h-56 mx-auto rounded-lg border bg-white p-2"
                                />
                                <p className="text-xs text-muted-foreground break-all">
                                    {buildSingleShareLink(singleShareDialogTopic.id, singleShareCategory)}
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => {
                                            navigator.clipboard.writeText(buildSingleShareLink(singleShareDialogTopic.id, singleShareCategory));
                                            toast({ title: "تم النسخ", description: "تم نسخ رابط التحدي الفردي." });
                                        }}
                                    >
                                        <Copy className="w-4 h-4" />
                                        نسخ الرابط
                                    </Button>
                                    <Button
                                        type="button"
                                        className="gap-2"
                                        onClick={() => window.open(buildSingleShareLink(singleShareDialogTopic.id, singleShareCategory), "_blank")}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        فتح الرابط
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="gap-2"
                                        onClick={handleDownloadSingleQR}
                                    >
                                        <Download className="w-4 h-4" />
                                        تنزيل QR
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherTopicsTab;
