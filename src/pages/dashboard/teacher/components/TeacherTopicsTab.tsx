import { useState, useEffect, useMemo, useCallback, type MutableRefObject } from "react";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import type { TFunction } from "@/contexts/LanguageContext";
import { getChallengeResultScorePercent } from "@/lib/challengeResultScore";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Eye, Gamepad2, MoreVertical, Edit,
    Trash, Plus, BookOpen, Video, Calendar,
    AlertTriangle, ListChecks, Target, Clock, Image as ImageIcon,
    FileText, CheckCircle, XCircle, Save, X, BookMarked, GraduationCap, BarChart3, QrCode, Copy, ExternalLink, Download,
    Users, Trophy, ChevronRight, TrendingUp, ChevronUp, ChevronDown, ArrowUpDown, RotateCcw, Loader2,
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
    useGrades,
    useTeacherClassAccess,
    useTeacherAllTopics,
    useCreateTopic,
    useUpdateTopic,
    useDeleteTopic,
    useReorderTopics,
    useSaveTopicMedia,
    useSaveChallengeQuestions,
    useCreateTopicLiveSession,
    useVisitorGradeClassMode,
    useUser,
    useTeacherProfile,
    useHostedChallengeResults,
    useTeacherSingleChallengeResults,
    useTeacherTopicContentReport,
    useResetTopicSingleChallengeResults,
    useTopicRatings,
} from "@/hooks/useDatabase";
import { aggregateTopicLessonRatings } from "@/lib/topicRatingStats";
import { localizeLessonRatingSummary } from "@/lib/lessonRatingLabels";
import LessonRatingSummaryCard from "@/components/LessonRatingSummaryCard";
import { filterGradesForPublicCatalog } from "@/lib/contentVisibility";
import {
    applyTeacherClassAccessToGrades,
    getAllowedSubjectIdsFromGrades,
} from "@/lib/teacherClassAccess";
import { orgAdminScopedOrganizationId } from "@/lib/accountCapabilities";
import { downloadChallengeReportPdf } from "@/lib/challengeReportPdf";
import {
    aggregateChallengeQuestionStats,
    getQuestionResultsFromAttempt,
    resolveQuestionLabel,
} from "@/lib/challengeQuestionAnalytics";
import type { ChallengeQuestion } from "@/data/challengeTypes";
import { selectValueToPresetFields, type StudentChallengePresetValue } from "@/lib/topicChallengePreset";
import { resolveWheelSpinSoundUrl } from "@/lib/wheelSpinSounds";
import { sortTopicsByOrder, getTopicSortOrder } from "@/lib/sortTopics";
import ContentEditor from "./ContentEditor";
import {
    hasLiveSessionDraft,
    liveSessionDraftToPayload,
    type PendingLiveSessionDraft,
} from "@/lib/topicLiveSession";
import { useToast } from "@/components/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
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
    /** Set by ContentEditor when question edits are unsaved (dashboard nav guard). */
    onUnsavedQuestionsChange?: (dirty: boolean) => void;
    navigationGuardRef?: MutableRefObject<((onProceed: () => void) => void) | null>;
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
    wheel_spin_sound_url?: string | null;
    discussions_enabled?: boolean;
    collect_single_challenge_participant_data?: boolean | null;
    student_challenge_mode?: string | null;
    student_challenge_category?: string | null;
    sort_order?: number;
    sortOrder?: number;
    createdAt: string;
    media?: any[];
    quiz?: any[];
    challengeItems?: ChallengeQuestion[];
    status?: "published" | "draft";
    mediaCount?: number;
    quizCount?: number;
}

type SingleShareCategory = "activities" | "games" | "mixed";

const getSingleShareOptions = (t: TFunction): Array<{ category: SingleShareCategory; label: string }> => [
    { category: "activities", label: t("dash.teacher.topics.shareActivitiesOnly") },
    { category: "games", label: t("dash.teacher.topics.shareGamesOnly") },
    { category: "mixed", label: t("dash.teacher.topics.shareMixed") },
];

const toRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" ? value as Record<string, unknown> : {};

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

const getParticipantName = (result: unknown, guestLabel: string) => {
    const row = toRecord(result);
    const user = getNestedRecord(row, "user");
    return getStringField(user, ["name"])
        || getStringField(row, ["participant_display_name", "name"])
        || guestLabel;
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

const getAttemptKey = (result: unknown, fallback = "") => {
    const row = toRecord(result);
    return String(row.id ?? `${getAttemptTimestamp(result) || "attempt"}-${getParticipantName(result, guestLabel)}-${fallback}`);
};

const getAttemptQuestionRows = (result: unknown, topic: unknown) =>
    getQuestionResultsFromAttempt(result).map((question, index) => {
        const questionId = String(question.questionId ?? question.question_id ?? question.id ?? index + 1);
        return {
            questionId,
            label: resolveQuestionLabel(question, index, topic),
            correct: Boolean(question.correct ?? question.isCorrect ?? question.is_correct),
            timeTaken: getNumberField(question, ["timeTaken", "time_taken"]),
            pointsEarned: getNumberField(question, ["pointsEarned", "points_earned"]),
            userAnswer: getStringField(question, ["userAnswer", "user_answer", "answer"]),
        };
    });

const TeacherTopicsTab = ({
    gradeId: propGradeId,
    subjectId: propSubjectId,
    teacherProfileId,
    onCreateChallenge,
    onUnsavedQuestionsChange,
    navigationGuardRef,
}: TeacherTopicsTabProps) => {
    const { t, dir, locale, language } = useDashboardLocale();
    const { toast } = useToast();

    const formatSeconds = useCallback((seconds: number) => {
        if (!Number.isFinite(seconds) || seconds <= 0) return "—";
        if (seconds < 60) return t("dash.teacher.topics.secondsShort", { n: Math.round(seconds) });
        const minutes = Math.floor(seconds / 60);
        const rest = Math.round(seconds % 60);
        return rest > 0
            ? t("dash.teacher.topics.minutesSeconds", { m: minutes, s: rest })
            : t("dash.teacher.topics.minutesShort", { n: minutes });
    }, [t]);

    const singleShareOptions = useMemo(() => getSingleShareOptions(t), [t]);
    const singleResultsResetConfirmPhrase = t("dash.teacher.topics.resetConfirmPhrase");
    const guestLabel = t("dash.teacher.topics.guest");
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

    const organizationId = orgAdminScopedOrganizationId(currentUser ?? undefined);
    const { data: grades } = useGrades({
        organizationId: organizationId ?? undefined,
    });
    const { data: classAccess } = useTeacherClassAccess(effectiveTeacherProfileId);
    const { data: allTeacherTopics, isLoading: isLoadingTeacherTopics } = useTeacherAllTopics(
        effectiveTeacherProfileId,
    );
    const { mode: visitorGradeMode } = useVisitorGradeClassMode();
    const visibleGrades = useMemo(() => {
        const catalog = filterGradesForPublicCatalog(grades as any[] | undefined, visitorGradeMode);
        return applyTeacherClassAccessToGrades(
            catalog,
            classAccess,
            currentTeacherProfile?.grade_id,
        );
    }, [grades, visitorGradeMode, classAccess, currentTeacherProfile?.grade_id]);

    const allowedSubjectIds = useMemo(
        () => getAllowedSubjectIdsFromGrades(visibleGrades),
        [visibleGrades],
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
            const isValidSubject =
                availableSubjects.some((s: any) => s.id === selectedSubjectId) &&
                allowedSubjectIds.has(selectedSubjectId);
            if (!isValidSubject) {
                setSelectedSubjectId(availableSubjects[0].id);
            }
        } else {
            setSelectedSubjectId("");
        }
    }, [selectedGradeId, availableSubjects, allowedSubjectIds, selectedSubjectId]);

    // Mutations
    const createTopicMutation = useCreateTopic();
    const updateTopicMutation = useUpdateTopic();
    const deleteTopicMutation = useDeleteTopic();
    const reorderTopicsMutation = useReorderTopics();
    const saveMediaMutation = useSaveTopicMedia();
    const saveChallengeQuestionsMutation = useSaveChallengeQuestions();
    const createLiveSessionMutation = useCreateTopicLiveSession();

    const mapDbTopicToExtended = (topic: any): ExtendedTopic => ({
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
        challengeItems: (topic.challengeItems || topic.challenge_questions || []).map((q: any) => ({
            ...q,
            type: q.type?.toLowerCase() || "multiple_choice",
        })),
    });

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
    const [singleResultsResetOpen, setSingleResultsResetOpen] = useState(false);
    const [singleResultsResetConfirmText, setSingleResultsResetConfirmText] = useState("");
    const [reorderingTopicId, setReorderingTopicId] = useState<string | null>(null);
    const resetSingleResultsMutation = useResetTopicSingleChallengeResults();

    const sortedSingleResultsForDialog = useMemo(() => {
        if (!singleChallengeResultsTopic) return [];
        const raw = singleResultsByTopicId.get(String(singleChallengeResultsTopic.id)) || [];
        return [...raw].sort(
            (a, b) =>
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
    }, [singleChallengeResultsTopic, singleResultsByTopicId]);

    const singleTopicIdForRatings = singleChallengeResultsTopic?.id
        ? String(singleChallengeResultsTopic.id)
        : "";
    const { data: singleTopicRatings = [] } = useTopicRatings(singleTopicIdForRatings);
    const lessonRatingSummary = useMemo(
        () => aggregateTopicLessonRatings(singleTopicRatings),
        [singleTopicRatings]
    );

    const contentReportTopicId = selectedTopicStats?.id ? String(selectedTopicStats.id) : "";
    const { data: contentReportTopicRatings = [] } = useTopicRatings(contentReportTopicId);
    const contentReportLessonRating = useMemo(
        () => aggregateTopicLessonRatings(contentReportTopicRatings),
        [contentReportTopicRatings]
    );

    const singleChallengeCollectedReport = useMemo(() => {
        const list = sortedSingleResultsForDialog;
        if (!list.length) return null;

        const scoreRows = list.map((result: unknown) => ({
            result,
            name: getParticipantName(result, guestLabel),
            score: getChallengeResultScorePercent(result),
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
            { label: t("dash.teacher.topics.scoreBelow50"), count: scoreRows.filter((row) => row.score < 50).length, fill: "#ef4444" },
            { label: t("dash.teacher.topics.score5069"), count: scoreRows.filter((row) => row.score >= 50 && row.score < 70).length, fill: "#f59e0b" },
            { label: t("dash.teacher.topics.score7089"), count: scoreRows.filter((row) => row.score >= 70 && row.score < 90).length, fill: "#3b82f6" },
            { label: t("dash.teacher.topics.score90100"), count: highPerformers, fill: "#10b981" },
        ];

        const participantTypeData = [
            { name: t("dash.teacher.topics.registered"), value: registeredAttempts, color: "#2563eb" },
            { name: t("dash.teacher.topics.guest"), value: guestAttempts, color: "#8b5cf6" },
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
                day: day.toLocaleDateString(locale, { weekday: "short" }),
                date: day.toLocaleDateString(locale, { day: "numeric", month: "short" }),
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

        const questionAnalytics = aggregateChallengeQuestionStats(
            list,
            singleChallengeResultsTopic
        ).sort((a, b) => a.accuracy - b.accuracy);

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
            { name: t("dash.teacher.topics.correct"), value: totalCorrect, color: "#10b981" },
            { name: t("dash.teacher.topics.wrong"), value: totalWrong, color: "#ef4444" },
        ].filter((item) => item.value > 0);

        const questionAccuracyChartData = questionAnalytics.map((question, index) => ({
            ...question,
            shortLabel: t("dash.teacher.topics.questionShort", { n: index + 1 }),
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
                ? t("dash.teacher.topics.correlation.weak")
                : scoreTimeCorrelation > 0
                    ? t("dash.teacher.topics.correlation.positive")
                    : t("dash.teacher.topics.correlation.negative");
        const lowOutlierThreshold = q1Score - (1.5 * iqrScore);
        const highOutlierThreshold = q3Score + (1.5 * iqrScore);
        const lowOutliers = scoreRows.filter((row) => row.score < lowOutlierThreshold);
        const highOutliers = scoreRows.filter((row) => row.score > highOutlierThreshold);

        const scoreBoxData = [
            { label: t("dash.teacher.topics.lowest"), value: Math.round(Math.min(...scores)), fill: "#ef4444" },
            { label: "Q1", value: Math.round(q1Score), fill: "#f59e0b" },
            { label: t("dash.teacher.topics.medianShort"), value: getMedianScore(scores), fill: "#3b82f6" },
            { label: "Q3", value: Math.round(q3Score), fill: "#6366f1" },
            { label: t("dash.teacher.topics.highest"), value: Math.round(Math.max(...scores)), fill: "#10b981" },
        ];

        const scoreTimeScatterData = timeScoreRows.map((row) => ({
            name: row.name,
            time: Math.round(row.timeTaken),
            score: row.score,
        }));

        const averageTimeForSegments = withTime.length ? getAverage(withTime.map((row) => row.timeTaken)) : 0;
        const learnerSegments = [
            {
                name: t("dash.teacher.topics.segment.fastPrecise"),
                count: scoreRows.filter((row) => row.score >= 80 && (!averageTimeForSegments || row.timeTaken <= averageTimeForSegments)).length,
                fill: "#10b981",
            },
            {
                name: t("dash.teacher.topics.segment.fastNeedsWork"),
                count: scoreRows.filter((row) => row.score < 80 && (!averageTimeForSegments || row.timeTaken <= averageTimeForSegments)).length,
                fill: "#f59e0b",
            },
            {
                name: t("dash.teacher.topics.segment.slowPrecise"),
                count: scoreRows.filter((row) => row.score >= 80 && row.timeTaken > averageTimeForSegments).length,
                fill: "#3b82f6",
            },
            {
                name: t("dash.teacher.topics.segment.slowStruggling"),
                count: scoreRows.filter((row) => row.score < 80 && row.timeTaken > averageTimeForSegments).length,
                fill: "#ef4444",
            },
        ].filter((segment) => segment.count > 0);

        const questionDifficultyData = [
            { name: t("dash.teacher.topics.difficulty.hard"), count: questionAnalytics.filter((q) => q.accuracy < 50).length, fill: "#ef4444" },
            { name: t("dash.teacher.topics.difficulty.medium"), count: questionAnalytics.filter((q) => q.accuracy >= 50 && q.accuracy < 80).length, fill: "#f59e0b" },
            { name: t("dash.teacher.topics.difficulty.easy"), count: questionAnalytics.filter((q) => q.accuracy >= 80).length, fill: "#10b981" },
        ].filter((item) => item.count > 0);

        const recommendations = [
            supportNeeded > 0
                ? t("dash.teacher.topics.insight.supportAttempts", { n: supportNeeded })
                : t("dash.teacher.topics.insight.noLowAttempts"),
            stdDevScore >= 20
                ? t("dash.teacher.topics.insight.highDispersion")
                : t("dash.teacher.topics.insight.lowDispersion"),
            weakestQuestion
                ? `${t("dash.teacher.topics.insight.reviewWeakest")}"${weakestQuestion.label}"${t("dash.teacher.topics.insight.weakestBecause", { accuracy: weakestQuestion.accuracy })}`
                : "",
            scoreTimeCorrelation < -0.3
                ? t("dash.teacher.topics.insight.negativeTime")
                : scoreTimeCorrelation > 0.3
                    ? t("dash.teacher.topics.insight.positiveTime")
                    : t("dash.teacher.topics.insight.noTimeRelation"),
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
    }, [sortedSingleResultsForDialog, singleChallengeResultsTopic, t, locale, guestLabel]);

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
            toast({ title: t("dash.teacher.topics.toast.downloaded"), description: t("dash.teacher.topics.toast.qrDownloaded") });
        } catch (error) {
            console.error("Failed to download QR:", error);
            toast({
                title: t("dash.teacher.topics.toast.qrFailed"),
                description: t("dash.teacher.topics.toast.qrError"),
                variant: "destructive",
            });
        }
    };

    const handleResetSingleChallengeResults = async () => {
        if (!singleChallengeResultsTopic) return;
        if (singleResultsResetConfirmText.trim() !== singleResultsResetConfirmPhrase) return;

        try {
            await resetSingleResultsMutation.mutateAsync({
                topicId: String(singleChallengeResultsTopic.id),
                teacherProfileId: effectiveTeacherProfileId,
            });
            toast({
                title: t("dash.teacher.topics.toast.resetSuccess"),
                description: t("dash.teacher.topics.toast.resetDesc"),
            });
            setSingleResultsResetOpen(false);
            setSingleResultsResetConfirmText("");
            setExpandedSingleAttempt(null);
            setSingleChallengeResultsTopic(null);
        } catch (error) {
            console.error("Failed to reset single challenge results:", error);
            toast({
                variant: "destructive",
                title: t("dash.teacher.topics.toast.resetFailed"),
                description: error instanceof Error ? error.message : t("dash.teacher.topics.toast.resetErr"),
            });
        }
    };

    const handleDownloadSingleReportPdf = async () => {
        if (!singleChallengeResultsTopic || !singleChallengeCollectedReport) return;

        setIsSingleReportPdfDownloading(true);
        try {
            toast({
                title: t("dash.teacher.topics.generatingReport"),
                description: t("dash.teacher.topics.generatingReportDesc"),
            });
            const pdfResults = sortedSingleResultsForDialog.map((result: unknown) => {
                const row = toRecord(result);
                const user = getNestedRecord(row, "user");
                return {
                    ...row,
                    name: getParticipantName(result, guestLabel),
                    user: {
                        ...user,
                        id: user.id || row.user_id || null,
                    },
                    percentage: getChallengeResultScorePercent(result),
                    score: getNumberField(result, ["score"]) || getChallengeResultScorePercent(result),
                    correct_answers: getNumberField(result, ["correct_answers", "correctAnswers"]),
                    wrong_answers: getNumberField(result, ["wrong_answers", "wrongAnswers"]),
                    time_taken: getNumberField(result, ["time_taken", "timeTaken"]),
                    participant_display_name: getParticipantName(result, guestLabel),
                };
            });

            const questionRows = singleChallengeCollectedReport.questionAnalytics.map((question) => ({
                questionText: question.label,
                accuracy: question.accuracy,
                correct: question.correct,
                total: question.attempts,
            }));

            await downloadChallengeReportPdf({
                language,
                topicTitle: t("dash.teacher.topics.pdfReportTitle", { title: singleChallengeResultsTopic.title }),
                lessonTitle: singleChallengeResultsTopic.title,
                className: currentGrade?.name,
                subjectName: selectedSubjectName,
                teacherName: currentUser?.name || (currentTeacherProfile as any)?.name,
                sessionDate: new Date().toLocaleDateString(locale, { dateStyle: "full" }),
                sessionTime: new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
                mergedSessionsNote: t("dash.teacher.topics.pdfReportSummary", { count: singleChallengeCollectedReport.count, avg: singleChallengeCollectedReport.averageScore, pass: singleChallengeCollectedReport.passRate }),
                lessonRating:
                    lessonRatingSummary.total > 0
                        ? localizeLessonRatingSummary(lessonRatingSummary, language)
                        : undefined,
                analysisRows: [
                    ...(lessonRatingSummary.total > 0
                        ? [
                            {
                                label: t("dash.teacher.topics.lessonRating"),
                                value: `${lessonRatingSummary.average.toFixed(1)} / 5`,
                            },
                            {
                                label: t("dash.teacher.topics.ratingCount"),
                                value: lessonRatingSummary.total,
                            },
                        ]
                        : []),
                    { label: t("dash.teacher.topics.median"), value: `${singleChallengeCollectedReport.medianScore}%` },
                    { label: t("dash.teacher.topics.lowestScore"), value: `${singleChallengeCollectedReport.lowestScore}%` },
                    { label: "Q1", value: `${singleChallengeCollectedReport.q1Score}%` },
                    { label: "Q3", value: `${singleChallengeCollectedReport.q3Score}%` },
                    { label: "IQR", value: singleChallengeCollectedReport.iqrScore },
                    { label: t("dash.teacher.topics.stdDev"), value: singleChallengeCollectedReport.stdDevScore },
                    { label: t("dash.teacher.topics.dispersionCoef"), value: `${singleChallengeCollectedReport.coefficientOfVariation}%` },
                    { label: t("dash.teacher.topics.correlation.timeScore"), value: `${singleChallengeCollectedReport.scoreTimeCorrelation} (${singleChallengeCollectedReport.scoreTimeCorrelationLabel})` },
                    { label: t("dash.teacher.topics.weeklyAttempts"), value: singleChallengeCollectedReport.weeklyAttempts },
                    { label: t("dash.teacher.topics.weeklySuccess"), value: `${singleChallengeCollectedReport.weeklyPassRate}%` },
                    { label: t("dash.teacher.topics.excellentScores"), value: singleChallengeCollectedReport.highPerformers },
                    { label: t("dash.teacher.topics.needsSupport"), value: singleChallengeCollectedReport.supportNeeded },
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
                title: t("dash.teacher.topics.toast.pdfDownloaded"),
                description: t("dash.teacher.challengesTab.toastPdfSaved"),
            });
        } catch (error) {
            console.error("Failed to download single challenge PDF:", error);
            toast({
                title: t("dash.teacher.topics.toast.pdfFailed"),
                description: t("dash.teacher.topics.toast.reportFailed"),
                variant: "destructive",
            });
        } finally {
            setIsSingleReportPdfDownloading(false);
        }
    };

    // Only this teacher's topics for the selected (allowed) subject
    useEffect(() => {
        if (!selectedSubjectId || !allowedSubjectIds.has(selectedSubjectId)) {
            setTopics([]);
            return;
        }
        const forSubject = (allTeacherTopics || []).filter(
            (topic: any) =>
                String(topic.subject_id) === String(selectedSubjectId) ||
                String(topic.subject?.id) === String(selectedSubjectId),
        );
        setTopics(sortTopicsByOrder(forSubject.map(mapDbTopicToExtended)));
    }, [allTeacherTopics, selectedSubjectId, allowedSubjectIds]);

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
            const score = getChallengeResultScorePercent(result);
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
        if (!selectedSubjectId || !allowedSubjectIds.has(selectedSubjectId)) {
            toast({
                title: t("dash.common.error"),
                description: t("dash.teacher.topics.noSubjectAccess"),
                variant: "destructive",
            });
            return;
        }
        setEditingTopic(null);
        setIsEditorOpen(true);
    };

    const handleEditTopic = (topic: ExtendedTopic) => {
        setEditingTopic(topic);
        setIsEditorOpen(true);
    };

    const handleMoveTopic = async (topicId: string, direction: "up" | "down") => {
        if (searchQuery.trim() || !selectedSubjectId) return;

        const index = topics.findIndex((t) => t.id === topicId);
        if (index < 0) return;

        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= topics.length) return;

        const previousTopics = topics;
        const nextTopics = [...topics];
        [nextTopics[index], nextTopics[swapIndex]] = [nextTopics[swapIndex], nextTopics[index]];
        const withOrder = nextTopics.map((topic, sortIndex) => ({ ...topic, sort_order: sortIndex }));
        setTopics(withOrder);
        setReorderingTopicId(topicId);

        try {
            await reorderTopicsMutation.mutateAsync({
                orders: withOrder.map((topic, sortIndex) => ({ id: topic.id, sort_order: sortIndex })),
                subjectId: String(selectedSubjectId),
            });
            toast({ title: t("dash.teacher.topics.toast.reordered") });
        } catch (error: any) {
            setTopics(previousTopics);
            toast({
                title: t("dash.teacher.topics.toast.reorderFailed"),
                description: error?.message || t("dash.teacher.topics.tryAgain"),
                variant: "destructive",
            });
        } finally {
            setReorderingTopicId(null);
        }
    };

    const persistPendingLiveSession = async (
        topicId: string,
        draft: PendingLiveSessionDraft | null | undefined,
        lessonTitle: string
    ) => {
        if (!hasLiveSessionDraft(draft) || !effectiveTeacherProfileId) return;

        const payload = liveSessionDraftToPayload(
            draft!,
            lessonTitle.trim()
                ? t("dash.teacher.live.sessionTitle", { title: lessonTitle.trim() })
                : null
        );
        await createLiveSessionMutation.mutateAsync({
            topicId,
            teacherId: effectiveTeacherProfileId,
            provider: payload.provider,
            meetingUrl: payload.meetingUrl,
            title: payload.title,
            startsAt: payload.startsAt,
            endsAt: payload.endsAt,
            notes: payload.notes,
        });
    };

    const handleSaveTopic = async (topicData: any) => {
        const mediaItems = topicData.media || [];
        const challengeItems = topicData.challengeItems || [];
        const pendingLiveSessions = (topicData.pendingLiveSessions || []) as PendingLiveSessionDraft[];

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
                        wheel_spin_sound_url: topicData.wheelSpinSoundUrl || null,
                    }
                });

                const topicId = updatedTopic?.id || editingTopic.id;
                try {
                    // Only replace media when the teacher changed resources in the editor
                    if (topicData.mediaDirty === true) {
                        await saveMediaMutation.mutateAsync({ topicId, media: mediaItems });
                    }
                    // Always save challenge questions to DB
                    await saveChallengeQuestionsMutation.mutateAsync({ topicId, questions: challengeItems });
                    for (const draft of pendingLiveSessions) {
                        await persistPendingLiveSession(topicId, draft, topicData.title || "");
                    }
                    toast({ title: t("dash.teacher.topics.toast.updated") });
                    setIsEditorOpen(false);
                    setEditingTopic(null);
                } catch (err: any) {
                    console.error("Error saving topic details:", err);
                    toast({
                        title: t("dash.teacher.topics.toast.saveComponentsFailed"),
                        description: err.message || t("dash.teacher.topics.toast.mediaErr"),
                        variant: "destructive"
                    });
                }
            } else {
                // Create new topic - use mutateAsync for proper error handling
                const nextSortOrder =
                    topics.length > 0
                        ? Math.max(...topics.map((t) => getTopicSortOrder(t))) + 1
                        : 0;

                if (!selectedSubjectId || !allowedSubjectIds.has(selectedSubjectId)) {
                    throw new Error(t("dash.teacher.topics.noSubjectAccess"));
                }

                const newTopic = await createTopicMutation.mutateAsync({
                    subject_id: String(selectedSubjectId),
                    teacherId: effectiveTeacherProfileId,
                    title: topicData.title,
                    description: topicData.description,
                    thumbnail: topicData.thumbnail,
                    duration: topicData.duration,
                    sort_order: nextSortOrder,
                    discussions_enabled: topicData.discussionsEnabled ?? true,
                    collect_single_challenge_participant_data: topicData.collectSingleChallengeParticipantData === true,
                    student_challenge_mode: presetFields.student_challenge_mode,
                    student_challenge_category: presetFields.student_challenge_category,
                    correct_sound_url: topicData.correctSoundUrl || null,
                    wrong_sound_url: topicData.wrongSoundUrl || null,
                    answering_background_sound_url: topicData.answeringBackgroundSoundUrl || null,
                    wheel_spin_sound_url: topicData.wheelSpinSoundUrl || null,
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
                        for (const draft of pendingLiveSessions) {
                            await persistPendingLiveSession(topicId, draft, topicData.title || "");
                        }
                        toast({ title: t("dash.teacher.topics.toast.created") });
                        setIsEditorOpen(false);
                        setEditingTopic(null);
                    } catch (err: any) {
                        console.error("Error saving new topic details:", err);
                        toast({
                            title: t("dash.teacher.topics.toast.createdPartial"),
                            description: err.message || t("dash.teacher.topics.toast.mediaSaveFailed"),
                            variant: "destructive"
                        });
                    }
                }
            }
        } catch (error: any) {
            console.error("Error saving topic:", error);
            toast({
                title: t("dash.teacher.topics.toast.unexpected"),
                description: error.message || t("dash.teacher.topics.toast.saveFailed"),
                variant: "destructive"
            });
        }
    };

    const handleDeleteTopic = (id: string) => {
        const previousTopics = topics;
        setTopics((prev) => prev.filter((t) => t.id !== id));
        deleteTopicMutation.mutate(id, {
            onSuccess: () => {
                toast({ title: t("dash.teacher.topics.toast.deleted") });
                setDeleteConfirmId(null);
            },
            onError: (error: unknown) => {
                setTopics(previousTopics);
                toast({
                    title: t("dash.common.error"),
                    description: error instanceof Error ? error.message : t("dash.teacher.topics.tryAgain"),
                    variant: "destructive",
                });
            },
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
                    title: newStatus === "published" ? t("dash.teacher.topics.toast.published") : t("dash.teacher.topics.toast.drafted"),
                    description: topic.title,
                });
            }
        });
    };

    const selectedSubjectName =
        availableSubjects.find((s: any) => s.id === selectedSubjectId)?.name || "";
    const canManageSelectedSubject =
        !!selectedSubjectId && allowedSubjectIds.has(selectedSubjectId);
    const isLoadingTopicsList = isLoadingTeacherTopics;

    return (
        <div className="space-y-6">
            {!visibleGrades?.length && (
                <p className="text-sm rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-foreground">
                    {t("dash.teacher.topics.noClassAccess")}
                </p>
            )}
            {/* Grade & Subject Selector */}
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
                <CardContent className="p-4">
                    <div className="flex flex-col gap-4">
                        {/* Grade picker */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary min-w-[120px]">
                                <GraduationCap className="w-5 h-5" />
                                <span>{t("dash.teacher.topics.gradeLabel")}</span>
                            </div>
                            <Select value={selectedGradeId} onValueChange={(val) => { setSelectedGradeId(val); setSelectedSubjectId(""); }}>
                                <SelectTrigger className="w-full sm:w-64 bg-white">
                                    <SelectValue placeholder={t("dash.teacher.topics.selectGrade")} />
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
                        {selectedGradeId && availableSubjects.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-primary min-w-[120px]">
                                    <BookMarked className="w-5 h-5" />
                                    <span>{t("dash.teacher.topics.subjectLabel")}</span>
                                </div>
                                <Select
                                    value={selectedSubjectId}
                                    onValueChange={(val) => {
                                        if (allowedSubjectIds.has(val)) setSelectedSubjectId(val);
                                    }}
                                >
                                    <SelectTrigger className="w-full sm:w-64 bg-white">
                                        <SelectValue placeholder={t("dash.teacher.topics.selectSubject")} />
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
                    teacherProfileId={effectiveTeacherProfileId}
                    lessonPagePath={
                        editingTopic?.id && currentGrade?.slug && selectedSubjectId
                            ? `/grade/${currentGrade.slug}/subject/${selectedSubjectId}/topic/${editingTopic.id}`
                            : ""
                    }
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
                        wheelSpinSoundUrl: resolveWheelSpinSoundUrl(editingTopic.wheel_spin_sound_url),
                        discussionsEnabled: editingTopic.discussions_enabled ?? true,
                        collectSingleChallengeParticipantData: editingTopic.collect_single_challenge_participant_data === true,
                        studentChallengeMode: editingTopic.student_challenge_mode ?? null,
                        studentChallengeCategory: editingTopic.student_challenge_category ?? null,
                        views: editingTopic.views,
                        createdAt: editingTopic.createdAt
                    } : undefined}
                    onSave={handleSaveTopic}
                    onUnsavedQuestionsChange={onUnsavedQuestionsChange}
                    registerNavigationGuard={(guard) => {
                        if (navigationGuardRef) {
                            navigationGuardRef.current = guard;
                        }
                    }}
                    onCancel={() => {
                        onUnsavedQuestionsChange?.(false);
                        if (navigationGuardRef) {
                            navigationGuardRef.current = (onProceed) => onProceed();
                        }
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
                                placeholder={t("dash.teacher.topics.searchPlaceholder")}
                                className="pr-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button
                            className="gap-2"
                            onClick={handleCreateTopic}
                            disabled={!canManageSelectedSubject}
                        >
                            <Plus className="w-4 h-4" />{t("dash.teacher.topics.newLesson")}</Button>
                    </div>
                    {!searchQuery.trim() && topics.length > 1 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            {t("dash.teacher.topics.reorderHint")}
                        </p>
                    )}

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
                                                <h3 className="font-bold text-destructive">{t("dash.teacher.topics.deleteConfirmTitle")}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {t("dash.teacher.topics.deleteConfirmDesc")}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>{t("dash.common.cancel")}</Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteTopic(deleteConfirmId)}>
                                                    <Trash className="w-4 h-4 ml-1" />{t("dash.common.delete")}</Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Topics List */}
                    <div className="grid grid-cols-1 gap-4">
                        {isLoadingTopicsList ? (
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
                                {filteredTopics.map((topic, i) => {
                                    const topicIndex = topics.findIndex((t) => t.id === topic.id);
                                    return (
                                        <motion.div
                                            key={topic.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            layout
                                        >
                                            <Card className={`hover:shadow-md transition-shadow ${deleteConfirmId === topic.id ? "ring-2 ring-destructive" : ""}`}>
                                                <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                                                    {!searchQuery.trim() && topics.length > 1 && topicIndex >= 0 && (
                                                        <div
                                                            className="flex md:flex-col items-center justify-center gap-1 shrink-0 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-1.5"
                                                            aria-label={t("dash.teacher.topics.lessonOrder")}
                                                        >
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-9 w-9 bg-background"
                                                                disabled={topicIndex === 0 || reorderingTopicId !== null}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    void handleMoveTopic(topic.id, "up");
                                                                }}
                                                                title={t("dash.teacher.topics.moveUp")}
                                                            >
                                                                <ChevronUp className="w-4 h-4" />
                                                            </Button>
                                                            <span className="text-xs font-bold text-primary tabular-nums">
                                                                {topicIndex + 1}
                                                            </span>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-9 w-9 bg-background"
                                                                disabled={topicIndex === topics.length - 1 || reorderingTopicId !== null}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    void handleMoveTopic(topic.id, "down");
                                                                }}
                                                                title={t("dash.teacher.topics.moveDown")}
                                                            >
                                                                <ChevronDown className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
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
                                                            {topic.status === "published" ? t("dash.teacher.topics.publishedBadge") : t("dash.teacher.topics.draft")}
                                                        </button>
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Link to={`/grade/${selectedGradeId}/subject/${selectedSubjectId}/topic/${topic.id}`}>
                                                                <Button size="sm" variant="secondary" className="gap-2">
                                                                    <Eye className="w-4 h-4" />{t("dash.teacher.topics.preview")}</Button>
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
                                                                            <Edit className="w-4 h-4" />{t("dash.common.edit")}</DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            className="gap-2 text-destructive"
                                                                            onClick={() => setDeleteConfirmId(topic.id)}
                                                                        >
                                                                            <Trash className="w-4 h-4" />{t("dash.common.delete")}</DropdownMenuItem>
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
                                                                    {t("dash.teacher.topics.resourcesCount", { n: topic.mediaCount ?? 0 })}
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <ListChecks className="w-4 h-4" />
                                                                    {t("dash.teacher.topics.questionsCount", { n: topic.quizCount ?? 0 })}
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Eye className="w-4 h-4" />
                                                                    {t("dash.teacher.topics.viewsCount", { n: getTopicViewerCount(topic) })}
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
                                                                <Edit className="w-4 h-4" />{t("dash.teacher.topics.editContent")}</Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="gap-2 text-primary hover:text-primary"
                                                                onClick={() => setSelectedTopicStats(topic)}
                                                            >
                                                                <BarChart3 className="w-4 h-4" />{t("dash.teacher.topics.contentStats")}</Button>
                                                            <div className="flex flex-1 min-w-[min(100%,14rem)] gap-2">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            className="flex-1 min-w-0 gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                                                            disabled={topic.status === "draft"}
                                                                        >
                                                                            <Gamepad2 className="w-4 h-4 shrink-0" />{t("dash.teacher.topics.createChallenge")}</Button>
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
                                                                            <ListChecks className="w-4 h-4 text-blue-500 shrink-0" />{t("dash.teacher.topics.interactiveActivities")}</DropdownMenuItem>
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
                                                                            <Gamepad2 className="w-4 h-4 text-purple-500 shrink-0" />{t("dash.teacher.topics.gamifiedActivities")}</DropdownMenuItem>
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
                                                                            {t("dash.teacher.topics.shareMixed")}
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
                                                                            <Calendar className="w-4 h-4 shrink-0" />{t("dash.teacher.topics.scheduledChallenge")}</Button>
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
                                                                            <ListChecks className="w-4 h-4 text-blue-500 shrink-0" />{t("dash.teacher.topics.interactiveActivities")}</DropdownMenuItem>
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
                                                                            <Gamepad2 className="w-4 h-4 text-purple-500 shrink-0" />{t("dash.teacher.topics.gamifiedActivities")}</DropdownMenuItem>
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
                                                                            {t("dash.teacher.topics.shareMixed")}
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
                                                                            <QrCode className="w-4 h-4 shrink-0" />{t("dash.teacher.topics.singleQr")}</Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-56">
                                                                        {singleShareOptions.map((option) => (
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
                                                                    dir={dir}
                                                                    className="group relative h-auto w-full overflow-hidden rounded-2xl border-primary/25 bg-gradient-to-br from-primary/[0.09] via-primary/[0.02] to-transparent py-4 px-4 shadow-sm transition-all hover:border-primary/45 hover:shadow-md hover:from-primary/[0.12] sm:max-w-md"
                                                                    onClick={() => setSingleChallengeResultsTopic(topic)}
                                                                >
                                                                    <span className="flex w-full items-center justify-between gap-3">
                                                                        <span className="flex min-w-0 flex-1 items-center gap-3">
                                                                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner ring-1 ring-primary/15">
                                                                                <Trophy className="h-6 w-6" />
                                                                            </span>
                                                                            <span className="flex min-w-0 flex-col gap-0.5 text-start">
                                                                                <span className="font-bold leading-tight text-foreground">{t("dash.teacher.topics.singleResultsTitle")}</span>
                                                                                <span className="text-xs font-normal text-muted-foreground">
                                                                                    {t("dash.teacher.topics.attemptNamesScores")}
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
                                    );
                                })}

                                {/* Empty State */}
                                {filteredTopics.length === 0 && (
                                    <Card className="p-12 text-center">
                                        <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                                        <h3 className="text-xl font-bold mb-2">
                                            {searchQuery ? t("dash.teacher.topics.noResults") : t("dash.teacher.topics.noLessons")}
                                        </h3>
                                        <p className="text-muted-foreground mb-4">
                                            {searchQuery
                                                ? t("dash.teacher.topics.noSearchResults", { query: searchQuery })
                                                : t("dash.teacher.topics.noLessonsDesc")}
                                        </p>
                                        {!searchQuery && (
                                            <Button onClick={handleCreateTopic} className="gap-2">
                                                <Plus className="w-4 h-4" />{t("dash.teacher.topics.addNewLesson")}</Button>
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
                                <CardTitle className="text-base">{t("dash.teacher.topics.statsTitle")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-primary">{topics.length}</div>
                                        <div className="text-xs text-muted-foreground">{t("dash.teacher.topics.totalLessons")}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-success">
                                            {topics.filter(t => t.status === "published").length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{t("dash.teacher.topics.published")}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-500">
                                            {topics.reduce((sum, t) => sum + (t.mediaCount || 0), 0)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{t("dash.teacher.topics.resources")}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-500">
                                            {topics.reduce((sum, t) => sum + (t.quizCount || 0), 0)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{t("dash.teacher.topics.questionsGames")}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
            <Dialog open={!!selectedTopicStats} onOpenChange={(open) => !open && setSelectedTopicStats(null)}>
                <DialogContent dir={dir} className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t("dash.teacher.topics.contentReportTitle", { title: selectedTopicStats?.title ?? "" })}</DialogTitle>
                        <DialogDescription>
                            {t("dash.teacher.topics.contentReportDesc")}
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
                                    { name: t("dash.teacher.topics.single"), value: metrics.singleAttempts, color: "#3b82f6" },
                                    { name: t("dash.teacher.topics.group"), value: metrics.groupAttempts, color: "#10b981" },
                                ].filter((d) => d.value > 0);
                                const scoreChartData = [
                                    { label: t("dash.teacher.topics.average"), value: metrics.averageScoreOverall },
                                    { label: t("dash.teacher.topics.medianShort"), value: metrics.medianScore },
                                    { label: t("dash.teacher.topics.highest"), value: metrics.highestScore },
                                    { label: t("dash.teacher.topics.lowest"), value: metrics.lowestScore },
                                ];

                                const quickCards = [
                                    { label: t("dash.teacher.topics.totalViews"), value: metrics.viewers },
                                    { label: t("dash.teacher.topics.uniqueViewers"), value: metrics.uniqueViewers },
                                    { label: t("dash.teacher.topics.totalAttempts"), value: metrics.totalAttempts },
                                    { label: t("dash.teacher.topics.avgPerformance"), value: `${metrics.averageScoreOverall}%` },
                                    { label: t("dash.teacher.topics.highestScore"), value: `${metrics.highestScore}%` },
                                    { label: t("dash.teacher.topics.passRate"), value: `${metrics.passRate}%` },
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

                                        <LessonRatingSummaryCard
                                            summary={contentReportLessonRating}
                                            emptyMessage={t("dash.teacher.topics.noRatings")}
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Card className="border-blue-200 bg-blue-50/50">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">{t("dash.teacher.topics.singleDetails")}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.attempts")}</span>
                                                        <span className="font-bold">{metrics.singleAttempts}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.uniqueUsers")}</span>
                                                        <span className="font-bold">{metrics.uniqueSingleParticipants}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.avgScore")}</span>
                                                        <span className="font-bold">{metrics.averageScoreSingle}%</span>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-emerald-200 bg-emerald-50/50">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">{t("dash.teacher.topics.groupDetails")}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.attempts")}</span>
                                                        <span className="font-bold">{metrics.groupAttempts}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.uniqueUsers")}</span>
                                                        <span className="font-bold">{metrics.uniqueGroupParticipants}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.avgScore")}</span>
                                                        <span className="font-bold">{metrics.averageScoreGroup}%</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Card className="border-primary/20">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">{t("dash.teacher.topics.attemptsChart")}</CardTitle>
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
                                                            {t("dash.teacher.topics.noChartData")}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                                                        <div className="flex items-center gap-1">
                                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                            {t("dash.teacher.topics.singleAttempts", { n: metrics.singleAttempts })}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                            {t("dash.teacher.topics.groupAttempts", { n: metrics.groupAttempts })}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-primary/20">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">{t("dash.teacher.topics.scoreChart")}</CardTitle>
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
                                                <CardTitle className="text-sm">{t("dash.teacher.topics.reportSummary")}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="text-sm space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">{t("dash.teacher.topics.totalParticipants")}</span>
                                                    <span className="font-bold">{metrics.uniqueParticipants}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">{t("dash.teacher.topics.lastAttempt")}</span>
                                                    <span className="font-bold">
                                                        {metrics.lastAttemptAt
                                                            ? new Date(metrics.lastAttemptAt).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })
                                                            : t("dash.teacher.topics.none")}
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-primary/20">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm">{t("dash.teacher.topics.questionAnalysis")}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {Array.isArray(metrics.questionAnalytics) && metrics.questionAnalytics.length > 0 ? (
                                                    <>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div className="rounded-xl border bg-red-50/50 p-3">
                                                                <div className="text-xs text-muted-foreground mb-1">{t("dash.teacher.topics.mostWrong")}</div>
                                                                <div className="font-bold text-sm line-clamp-1">
                                                                    {(() => {
                                                                        const mostWrong = [...metrics.questionAnalytics].sort((a: any, b: any) => b.wrong - a.wrong)[0];
                                                                        return mostWrong?.questionText || "—";
                                                                    })()}
                                                                </div>
                                                            </div>
                                                            <div className="rounded-xl border bg-emerald-50/50 p-3">
                                                                <div className="text-xs text-muted-foreground mb-1">{t("dash.teacher.topics.mostCorrect")}</div>
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
                                                                <div className="col-span-5">{t("dash.teacher.topics.question")}</div>
                                                                <div className="col-span-2 text-center">{t("dash.teacher.topics.attempts")}</div>
                                                                <div className="col-span-2 text-center">{t("dash.teacher.topics.correct")}</div>
                                                                <div className="col-span-1 text-center">{t("dash.teacher.topics.wrong")}</div>
                                                                <div className="col-span-2 text-center">{t("dash.teacher.topics.accuracy")}</div>
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
                                                        {t("dash.teacher.topics.noQuestionAnalysisData")}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Card className="border-amber-200 bg-amber-50/40">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">{t("dash.teacher.topics.distributionAnalysis")}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.lowestScore")}</span>
                                                        <span className="font-bold">{metrics.lowestScore}%</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.median")}</span>
                                                        <span className="font-bold">{metrics.medianScore}%</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.excellent90Plus")}</span>
                                                        <span className="font-bold">{metrics.highPerformersCount}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.lowScores")}</span>
                                                        <span className="font-bold">{metrics.lowPerformersCount}</span>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-violet-200 bg-violet-50/40">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">{t("dash.teacher.topics.activityAnalysis")}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.todayAttempts")}</span>
                                                        <span className="font-bold">{metrics.attemptsToday}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.last7Attempts")}</span>
                                                        <span className="font-bold">{metrics.attemptsLast7Days}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.activeDays30")}</span>
                                                        <span className="font-bold">{metrics.activityDaysLast30Days}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.singleAttemptPct")}</span>
                                                        <span className="font-bold">{singleShare}%</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">{t("dash.teacher.topics.groupAttemptPct")}</span>
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
                    dir={dir}
                    className="flex h-[90dvh] max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
                >
                    <DialogHeader className="relative shrink-0 space-y-0 border-0 bg-gradient-to-bl from-primary/[0.12] via-primary/[0.04] to-transparent px-6 pb-5 pt-6 text-start">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex min-w-0 flex-1 items-start gap-4">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-background/90 text-primary shadow-md ring-1 ring-primary/10">
                                    <Trophy className="h-7 w-7" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1 text-start">
                                    <DialogTitle className="text-start text-xl font-black leading-snug sm:text-2xl">{t("dash.teacher.topics.singleResultsTitle")}</DialogTitle>
                                    {singleChallengeResultsTopic && (
                                        <p className="truncate text-start text-sm font-semibold text-primary">
                                            {singleChallengeResultsTopic.title}
                                        </p>
                                    )}
                                    <DialogDescription className="text-start text-xs leading-relaxed text-muted-foreground sm:text-sm">
                                        {t("dash.teacher.topics.singleReportDesc")}
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                {singleChallengeCollectedReport && (
                                    <>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            dir={dir}
                                            className="gap-2 border-primary/30 bg-background/80 text-primary hover:bg-primary/10"
                                            onClick={handleDownloadSingleReportPdf}
                                            disabled={isSingleReportPdfDownloading}
                                        >
                                            <Download className="h-4 w-4 shrink-0" />
                                            {isSingleReportPdfDownloading ? t("dash.teacher.topics.loading") : t("dash.teacher.topics.downloadPdf")}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            dir={dir}
                                            className="gap-2 border-destructive/30 bg-background/80 text-destructive hover:bg-destructive/10"
                                            onClick={() => {
                                                setSingleResultsResetConfirmText("");
                                                setSingleResultsResetOpen(true);
                                            }}
                                        >
                                            <RotateCcw className="h-4 w-4 shrink-0" />{t("dash.teacher.topics.resetResultsBtn")}</Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </DialogHeader>

                    {singleChallengeResultsTopic && singleChallengeCollectedReport && (
                        <ScrollArea dir={dir} className="min-h-0 flex-1">
                            <div className="space-y-4 p-4 sm:p-6">
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
                                    {[
                                        { label: t("dash.teacher.topics.attempts"), value: singleChallengeCollectedReport.count, color: "text-foreground" },
                                        { label: t("dash.teacher.topics.participants"), value: singleChallengeCollectedReport.uniqueParticipants, color: "text-primary" },
                                        { label: t("dash.teacher.topics.average"), value: `${singleChallengeCollectedReport.averageScore}%`, color: "text-emerald-700" },
                                        { label: t("dash.teacher.topics.best"), value: `${singleChallengeCollectedReport.bestScore}%`, color: "text-amber-700" },
                                        { label: t("dash.teacher.topics.median"), value: `${singleChallengeCollectedReport.medianScore}%`, color: "text-blue-700" },
                                        { label: t("dash.teacher.topics.passRate"), value: `${singleChallengeCollectedReport.passRate}%`, color: "text-violet-700" },
                                    ].map((card) => (
                                        <div key={card.label} className="rounded-2xl border bg-background/80 p-3 text-center shadow-sm">
                                            <div className={`text-xl font-black tabular-nums ${card.color}`}>{card.value}</div>
                                            <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{card.label}</div>
                                        </div>
                                    ))}
                                </div>

                                <LessonRatingSummaryCard summary={lessonRatingSummary} />

                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                    <Card className="border-primary/20">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">{t("dash.teacher.topics.scoreDistribution")}</CardTitle>
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
                                            <CardTitle className="text-sm">{t("dash.teacher.topics.activity7days")}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                                                <div className="rounded-xl border bg-background/80 p-2 text-center">
                                                    <div className="text-lg font-black text-primary">{singleChallengeCollectedReport.weeklyAttempts}</div>
                                                    <div className="text-muted-foreground">{t("dash.teacher.topics.weeklyAttempts")}</div>
                                                </div>
                                                <div className="rounded-xl border bg-background/80 p-2 text-center">
                                                    <div className="text-lg font-black text-emerald-700">{singleChallengeCollectedReport.weeklyAverageScore}%</div>
                                                    <div className="text-muted-foreground">{t("dash.teacher.topics.weeklyAvg")}</div>
                                                </div>
                                                <div className="rounded-xl border bg-background/80 p-2 text-center">
                                                    <div className="text-lg font-black text-violet-700">{singleChallengeCollectedReport.weeklyActiveDays}</div>
                                                    <div className="text-muted-foreground">{t("dash.teacher.topics.activeDays")}</div>
                                                </div>
                                                <div className="rounded-xl border bg-background/80 p-2 text-center">
                                                    <div className="text-lg font-black text-amber-700">
                                                        {singleChallengeCollectedReport.weeklyAttempts > 0 ? `${singleChallengeCollectedReport.weeklyPassRate}%` : "—"}
                                                    </div>
                                                    <div className="text-muted-foreground">{t("dash.teacher.topics.weeklySuccess70")}</div>
                                                    {singleChallengeCollectedReport.weeklyAttempts > 0 && (
                                                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                                                            {t("dash.teacher.topics.attemptsOf", { passed: singleChallengeCollectedReport.weeklyPassedAttempts, total: singleChallengeCollectedReport.weeklyAttempts })}
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
                                                        <Line yAxisId="left" type="monotone" dataKey="attempts" name={t("dash.teacher.topics.attempts")} stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                                                        <Line yAxisId="right" type="monotone" dataKey="avg" name={t("dash.teacher.topics.average")} stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                                                        <Line yAxisId="right" type="monotone" dataKey="passRate" name={t("dash.teacher.topics.successRate")} stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                                                <div className="rounded-xl border bg-blue-50/60 p-3">
                                                    <div className="font-bold text-blue-900">{t("dash.teacher.topics.busiestDay")}</div>
                                                    <div className="mt-1 text-muted-foreground">
                                                        {singleChallengeCollectedReport.busiestDay?.attempts
                                                            ? t("dash.teacher.topics.busiestDayDetail", { day: singleChallengeCollectedReport.busiestDay.day, date: singleChallengeCollectedReport.busiestDay.date, attempts: singleChallengeCollectedReport.busiestDay.attempts })
                                                            : t("dash.teacher.topics.noAttempts7days")}
                                                    </div>
                                                </div>
                                                <div className="rounded-xl border bg-emerald-50/60 p-3">
                                                    <div className="font-bold text-emerald-900">{t("dash.teacher.topics.bestDay")}</div>
                                                    <div className="mt-1 text-muted-foreground">
                                                        {singleChallengeCollectedReport.bestActivityDay
                                                            ? t("dash.teacher.topics.bestDayDetail", { day: singleChallengeCollectedReport.bestActivityDay.day, date: singleChallengeCollectedReport.bestActivityDay.date, avg: singleChallengeCollectedReport.bestActivityDay.avg })
                                                            : t("dash.teacher.topics.noPerformanceData")}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border overflow-hidden">
                                                <div className="grid grid-cols-6 bg-muted/50 px-3 py-2 text-[11px] font-bold text-muted-foreground">
                                                    <div>{t("dash.teacher.topics.today")}</div>
                                                    <div className="text-center">{t("dash.teacher.topics.date")}</div>
                                                    <div className="text-center">{t("dash.teacher.topics.attempts")}</div>
                                                    <div className="text-center">{t("dash.teacher.topics.participants")}</div>
                                                    <div className="text-center">{t("dash.teacher.topics.average")}</div>
                                                    <div className="text-center">{t("dash.teacher.topics.success")}</div>
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
                                            <CardTitle className="text-sm">{t("dash.teacher.topics.participantType")}</CardTitle>
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
                                                <div className="py-10 text-center text-sm text-muted-foreground">{t("dash.teacher.topics.noData")}</div>
                                            )}
                                            <div className="flex justify-center gap-4 text-xs">
                                                <span>{t("dash.teacher.topics.registered")}: {singleChallengeCollectedReport.registeredAttempts}</span>
                                                <span>{t("dash.teacher.topics.guest")}: {singleChallengeCollectedReport.guestAttempts}</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-emerald-200 bg-emerald-50/40 lg:col-span-2">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">{t("dash.teacher.topics.performanceDetails")}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black text-emerald-700">{singleChallengeCollectedReport.answerAccuracy}%</div>
                                                <div className="text-xs text-muted-foreground">{t("dash.teacher.topics.answerAccuracy")}</div>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black">{singleChallengeCollectedReport.totalCorrect}/{singleChallengeCollectedReport.totalCorrect + singleChallengeCollectedReport.totalWrong}</div>
                                                <div className="text-xs text-muted-foreground">{t("dash.teacher.topics.correctFromTotal")}</div>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black">{formatSeconds(singleChallengeCollectedReport.averageTime)}</div>
                                                <div className="text-xs text-muted-foreground">{t("dash.teacher.topics.avgTime")}</div>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black">{formatSeconds(singleChallengeCollectedReport.fastestTime)}</div>
                                                <div className="text-xs text-muted-foreground">{t("dash.teacher.topics.fastestAttempt")}</div>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black text-amber-700">{singleChallengeCollectedReport.highPerformers}</div>
                                                <div className="text-xs text-muted-foreground">{t("dash.teacher.topics.excellent90")}</div>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black text-rose-700">{singleChallengeCollectedReport.supportNeeded}</div>
                                                <div className="text-xs text-muted-foreground">{t("dash.teacher.topics.needsSupport50")}</div>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black">{singleChallengeCollectedReport.lowestScore}%</div>
                                                <div className="text-xs text-muted-foreground">{t("dash.teacher.topics.lowestScore")}</div>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-3 text-center">
                                                <div className="font-black">{singleChallengeCollectedReport.averageStreak}</div>
                                                <div className="text-xs text-muted-foreground">{t("dash.teacher.topics.avgStreak")}</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card className="border-blue-200 bg-blue-50/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">{t("dash.teacher.topics.quickAnalysis")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                                        <div className="rounded-xl border bg-background/80 p-3">
                                            <div className="mb-1 text-xs font-bold text-muted-foreground">{t("dash.teacher.topics.weakestQuestion")}</div>
                                            <div className="line-clamp-2 font-bold">{singleChallengeCollectedReport.weakestQuestion?.label || t("dash.teacher.topics.noData")}</div>
                                            <div className="mt-1 text-xs text-rose-700">
                                                {t("dash.teacher.topics.accuracyPct", { n: singleChallengeCollectedReport.weakestQuestion?.accuracy ?? 0 })}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border bg-background/80 p-3">
                                            <div className="mb-1 text-xs font-bold text-muted-foreground">{t("dash.teacher.topics.strongestQuestion")}</div>
                                            <div className="line-clamp-2 font-bold">{singleChallengeCollectedReport.strongestQuestion?.label || t("dash.teacher.topics.noData")}</div>
                                            <div className="mt-1 text-xs text-emerald-700">
                                                {t("dash.teacher.topics.accuracyPct", { n: singleChallengeCollectedReport.strongestQuestion?.accuracy ?? 0 })}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border bg-background/80 p-3">
                                            <div className="mb-1 text-xs font-bold text-muted-foreground">{t("dash.teacher.topics.slowestQuestion")}</div>
                                            <div className="line-clamp-2 font-bold">{singleChallengeCollectedReport.slowestQuestion?.label || t("dash.teacher.topics.noData")}</div>
                                            <div className="mt-1 text-xs text-amber-700">
                                                {t("dash.teacher.topics.avgTimeFormat", { time: formatSeconds(singleChallengeCollectedReport.slowestQuestion?.avgTime || 0) })}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200 bg-slate-50/60">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">{t("dash.teacher.topics.advancedStats")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 lg:grid-cols-6">
                                            {[
                                                { label: "Q1", value: `${singleChallengeCollectedReport.q1Score}%` },
                                                { label: "Q3", value: `${singleChallengeCollectedReport.q3Score}%` },
                                                { label: "IQR", value: `${singleChallengeCollectedReport.iqrScore}` },
                                                { label: t("dash.teacher.topics.stdDev"), value: `${singleChallengeCollectedReport.stdDevScore}` },
                                                { label: t("dash.teacher.topics.dispersionCoef"), value: `${singleChallengeCollectedReport.coefficientOfVariation}%` },
                                                { label: t("dash.teacher.topics.correlation.timeScore"), value: `${singleChallengeCollectedReport.scoreTimeCorrelation} (${singleChallengeCollectedReport.scoreTimeCorrelationLabel})` },
                                            ].map((metric) => (
                                                <div key={metric.label} className="rounded-xl border bg-background/80 p-3 text-center">
                                                    <div className="font-black text-slate-800">{metric.value}</div>
                                                    <div className="mt-1 text-[11px] text-muted-foreground">{metric.label}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="rounded-xl border bg-background/80 p-3">
                                            <div className="mb-2 text-sm font-bold">{t("dash.teacher.topics.dataRecommendations")}</div>
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
                                            <CardTitle className="text-sm">{t("dash.teacher.topics.quartileSummary")}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-56" dir="ltr">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={singleChallengeCollectedReport.scoreBoxData}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="label" />
                                                        <YAxis domain={[0, 100]} />
                                                        <RechartsTooltip />
                                                        <Bar dataKey="value" name={t("dash.teacher.topics.value")} radius={[6, 6, 0, 0]}>
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
                                            <CardTitle className="text-sm">{t("dash.teacher.topics.timeScoreRelation")}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {singleChallengeCollectedReport.scoreTimeScatterData.length > 1 ? (
                                                <div className="h-56" dir="ltr">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <ScatterChart>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis type="number" dataKey="time" name={t("dash.teacher.topics.time")} unit="s" />
                                                            <YAxis type="number" dataKey="score" name={t("dash.teacher.topics.score")} unit="%" domain={[0, 100]} />
                                                            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" />
                                                            <RechartsTooltip cursor={{ strokeDasharray: "3 3" }} />
                                                            <Scatter data={singleChallengeCollectedReport.scoreTimeScatterData} fill="#6366f1" name={t("dash.teacher.topics.attempt")} />
                                                        </ScatterChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="py-12 text-center text-sm text-muted-foreground">{t("dash.teacher.topics.noTimeRelationData")}</div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                    <Card className="border-cyan-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">{t("dash.teacher.topics.learnerSegments")}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-56" dir="ltr">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={singleChallengeCollectedReport.learnerSegments}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                        <YAxis allowDecimals={false} />
                                                        <RechartsTooltip />
                                                        <Bar dataKey="count" name={t("dash.teacher.topics.count")} radius={[6, 6, 0, 0]}>
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
                                            <CardTitle className="text-sm">{t("dash.teacher.topics.questionDifficulty")}</CardTitle>
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
                                                <div className="py-12 text-center text-sm text-muted-foreground">{t("dash.teacher.topics.noQuestionData")}</div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                    <Card className="border-emerald-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">{t("dash.teacher.topics.correctVsWrong")}</CardTitle>
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
                                                <div className="py-12 text-center text-sm text-muted-foreground">{t("dash.teacher.topics.noAnswerData")}</div>
                                            )}
                                            <div className="flex justify-center gap-4 text-xs">
                                                <span>{t("dash.teacher.topics.correct")}: {singleChallengeCollectedReport.totalCorrect}</span>
                                                <span>{t("dash.teacher.topics.wrong")}: {singleChallengeCollectedReport.totalWrong}</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-amber-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">{t("dash.teacher.topics.bestScores")}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-56" dir="ltr">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={singleChallengeCollectedReport.topScoreChartData}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                                        <YAxis domain={[0, 100]} />
                                                        <RechartsTooltip />
                                                        <Bar dataKey="score" name={t("dash.teacher.topics.score")} fill="#f59e0b" radius={[6, 6, 0, 0]} />
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
                                                <CardTitle className="text-sm">{t("dash.teacher.topics.questionAccuracy")}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-64" dir="ltr">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={singleChallengeCollectedReport.questionAccuracyChartData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                            <XAxis dataKey="shortLabel" />
                                                            <YAxis domain={[0, 100]} />
                                                            <RechartsTooltip />
                                                            <Bar dataKey="accuracy" name={t("dash.teacher.topics.accuracy")} fill="#6366f1" radius={[6, 6, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-violet-200">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm">{t("dash.teacher.topics.slowestQuestions")}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-64" dir="ltr">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={singleChallengeCollectedReport.questionTimeChartData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                            <XAxis dataKey="shortLabel" />
                                                            <YAxis allowDecimals={false} />
                                                            <RechartsTooltip />
                                                            <Bar dataKey="avgTime" name={t("dash.teacher.topics.avgTimeSeconds")} fill="#8b5cf6" radius={[6, 6, 0, 0]} />
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
                                            <CardTitle className="text-sm">{t("dash.teacher.topics.singleQuestionAnalysis")}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="rounded-xl border overflow-hidden">
                                                <div className="grid grid-cols-12 bg-muted/50 px-3 py-2 text-xs font-bold text-muted-foreground">
                                                    <div className="col-span-4">{t("dash.teacher.topics.question")}</div>
                                                    <div className="col-span-2 text-center">{t("dash.teacher.topics.attempts")}</div>
                                                    <div className="col-span-2 text-center">{t("dash.teacher.topics.accuracy")}</div>
                                                    <div className="col-span-2 text-center">{t("dash.teacher.topics.avgTime")}</div>
                                                    <div className="col-span-2 text-center">{t("dash.teacher.topics.points")}</div>
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
                                        <CardTitle className="text-sm">{t("dash.teacher.topics.bestAttempts")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {singleChallengeCollectedReport.topAttempts.map((attempt, index) => (
                                            <div key={`${attempt.name}-${index}`} className="flex items-center justify-between rounded-xl border bg-background/80 px-3 py-2 text-sm">
                                                <div>
                                                    <div className="font-bold">{index + 1}. {attempt.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {attempt.correct || attempt.wrong ? t("dash.teacher.topics.correctWrongCount", { correct: attempt.correct, wrong: attempt.wrong }) : t("dash.teacher.topics.answerDetailsUnavailable")}
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
                                        <p className="text-sm font-bold text-foreground">{t("dash.teacher.topics.participantList")}</p>
                                        <p className="text-[11px] text-muted-foreground">{t("dash.teacher.topics.participantListHint")}</p>
                                    </div>
                                    <ul dir={dir} className="space-y-2 p-4">
                                        {sortedSingleResultsForDialog.map((r: any, index: number) => {
                                            const label = getParticipantName(r, guestLabel);
                                            const pct = getChallengeResultScorePercent(r);
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
                                            const questionRows = getAttemptQuestionRows(r, singleChallengeResultsTopic);
                                            const scoreClass =
                                                pct >= 75
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                                                    : pct >= 50
                                                        ? "border-amber-200 bg-amber-50 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100"
                                                        : "border-rose-200 bg-rose-50 text-rose-950 dark:bg-rose-950/35 dark:text-rose-100";
                                            return (
                                                <li key={attemptKey} dir={dir} className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm transition-colors hover:border-primary/25 hover:bg-muted/20">
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
                                                                <span>{correct || wrong ? t("dash.teacher.topics.correctWrongCount", { correct, wrong }) : t("dash.teacher.topics.noAnswerDetails")}</span>
                                                                <span>{t("dash.teacher.topics.time")}: {formatSeconds(timeTaken)}</span>
                                                                {streak > 0 && <span>{t("dash.teacher.topics.avgStreak")}: {streak}</span>}
                                                                <span className="font-semibold text-primary">{isExpanded ? t("dash.teacher.topics.hideDetails") : t("dash.teacher.topics.showQuestionDetails")}</span>
                                                                {!isRegisteredAttempt(r) && (
                                                                    <Badge variant="outline" className="h-5 border-violet-200 bg-violet-50 text-[10px] text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">{t("dash.teacher.topics.guest")}</Badge>
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
                                                                    <p className="text-sm font-black text-foreground">{t("dash.teacher.topics.answerDetailsFor", { name: label })}</p>
                                                                    <p className="text-xs text-muted-foreground">{t("dash.teacher.topics.perQuestionDetails")}</p>
                                                                </div>
                                                                <Badge variant="outline">{t("dash.teacher.topics.questionsCountBadge", { n: questionRows.length })}</Badge>
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
                                                                                            {t("dash.teacher.topics.studentAnswer", { answer: question.userAnswer })}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                                <Badge className={question.correct ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}>
                                                                                    {question.correct ? t("dash.teacher.topics.correct") : t("dash.teacher.topics.wrong")}
                                                                                </Badge>
                                                                            </div>
                                                                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                                                                <span>{t("dash.teacher.topics.time")}: {formatSeconds(question.timeTaken)}</span>
                                                                                <span>{t("dash.teacher.topics.points")}: {question.pointsEarned}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="rounded-xl border border-dashed bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
                                                                    {t("dash.teacher.topics.noQuestionDetails")}
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
                            {t("dash.teacher.topics.noAttemptsRecorded")}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={singleResultsResetOpen}
                onOpenChange={(open) => {
                    setSingleResultsResetOpen(open);
                    if (!open) setSingleResultsResetConfirmText("");
                }}
            >
                <AlertDialogContent dir={dir} className="text-start sm:max-w-md">
                    <AlertDialogHeader className="items-start text-start sm:text-start">
                        <AlertDialogTitle className="w-full text-start text-destructive">
                            {t("dash.teacher.topics.resetResultsTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2 text-start">
                            <span className="block">
                                {t("dash.teacher.topics.resetResultsDesc")}
                                {singleChallengeResultsTopic ? t("dash.teacher.topics.resetResultsForLesson", { title: singleChallengeResultsTopic.title }) : ""}
                                {" "}{t("dash.teacher.topics.resetResultsDesc2")}
                            </span>
                            <span className="block font-medium text-foreground">
                                {t("dash.teacher.topics.resetConfirmLabel")}{" "}
                                <span className="font-black text-destructive">{singleResultsResetConfirmPhrase}</span>
                                {" "}{t("dash.teacher.topics.resetConfirmField")}
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-1 text-start">
                        <Label
                            htmlFor="single-results-reset-confirm"
                            className="block w-full text-start text-xs text-muted-foreground"
                        >
                            {t("dash.teacher.topics.resetConfirmText")}
                        </Label>
                        <Input
                            id="single-results-reset-confirm"
                            dir={dir}
                            className="text-start"
                            value={singleResultsResetConfirmText}
                            onChange={(e) => setSingleResultsResetConfirmText(e.target.value)}
                            placeholder={singleResultsResetConfirmPhrase}
                            autoComplete="off"
                            disabled={resetSingleResultsMutation.isPending}
                        />
                    </div>
                    <AlertDialogFooter className="gap-2 sm:flex-row sm:justify-start sm:space-x-0">
                        <AlertDialogAction
                            dir={dir}
                            className="gap-2 bg-destructive hover:bg-destructive/90"
                            disabled={
                                resetSingleResultsMutation.isPending
                                || singleResultsResetConfirmText.trim() !== singleResultsResetConfirmPhrase
                            }
                            onClick={(e) => {
                                e.preventDefault();
                                void handleResetSingleChallengeResults();
                            }}
                        >
                            {resetSingleResultsMutation.isPending ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                            ) : (
                                <Trash className="h-4 w-4 shrink-0" />
                            )}
                            {t("dash.teacher.topics.deleteAllResults")}
                        </AlertDialogAction>
                        <AlertDialogCancel
                            dir={dir}
                            disabled={resetSingleResultsMutation.isPending}
                        >{t("dash.common.cancel")}</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!singleShareDialogTopic} onOpenChange={(open) => !open && setSingleShareDialogTopic(null)}>
                <DialogContent dir={dir} className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{t("dash.teacher.topics.shareSingleQrTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("dash.teacher.topics.shareSingleQrDesc")}
                        </DialogDescription>
                    </DialogHeader>

                    {singleShareDialogTopic && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {singleShareOptions.map((option) => (
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
                                            toast({ title: t("dash.common.copied"), description: t("dash.teacher.topics.toast.linkCopied") });
                                        }}
                                    >
                                        <Copy className="w-4 h-4" />{t("dash.common.copyLink")}</Button>
                                    <Button
                                        type="button"
                                        className="gap-2"
                                        onClick={() => window.open(buildSingleShareLink(singleShareDialogTopic.id, singleShareCategory), "_blank")}
                                    >
                                        <ExternalLink className="w-4 h-4" />{t("dash.teacher.topics.openLink")}</Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="gap-2"
                                        onClick={handleDownloadSingleQR}
                                    >
                                        <Download className="w-4 h-4" />
                                        {t("dash.teacher.topics.downloadPdf").replace("PDF", "QR")}
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
