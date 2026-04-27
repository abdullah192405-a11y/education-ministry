import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Eye, Gamepad2, MoreVertical, Edit,
    Trash, Plus, BookOpen, Video, Calendar,
    AlertTriangle, ListChecks, Target, Clock, Image as ImageIcon,
    FileText, CheckCircle, XCircle, Save, X, BookMarked, GraduationCap, BarChart3, QrCode, Copy, ExternalLink, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import type { ChallengeQuestion } from "@/data/challengeTypes";
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

const TeacherTopicsTab = ({ gradeId: propGradeId, subjectId: propSubjectId, teacherProfileId, onCreateChallenge }: TeacherTopicsTabProps) => {
    const { toast } = useToast();
    const [selectedTopicStats, setSelectedTopicStats] = useState<ExtendedTopic | null>(null);
    const { data: currentUser } = useUser();
    const { data: currentTeacherProfile } = useTeacherProfile(currentUser?.id || "");
    const effectiveTeacherProfileId = teacherProfileId || currentTeacherProfile?.id || "";
    const { data: hostedResults } = useHostedChallengeResults(currentUser?.id || "", 1000);
    const { data: singleResults } = useTeacherSingleChallengeResults(effectiveTeacherProfileId, 1000);
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

    // Sync DB topics to local state
    useEffect(() => {
        if (subjectData?.topics) {
            const mapped = subjectData.topics.map((topic: any) => ({
                ...topic,
                thumbnail: topic.thumbnail || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop",
                views: (topic.views || 0) + (topic.activities?.length || 0),
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
            passRate: number;
            lastAttemptAt: string | null;
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
                    passRate: 0,
                    lastAttemptAt: null,
                });
            }
            return statsMap.get(topicId)!;
        };

        const scoreOf = (result: any) => {
            const scoreValue = Number(result?.percentage ?? result?.score ?? 0);
            return Number.isFinite(scoreValue) ? scoreValue : 0;
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
            row.viewers = Number(topic.views || 0) + topicActivities.length;
            row.uniqueViewers = uniqueViewers.size;
        });

        const participantsByTopic = new Map<string, Set<string>>();
        const singleParticipantsByTopic = new Map<string, Set<string>>();
        const groupParticipantsByTopic = new Map<string, Set<string>>();
        const scoreAggByTopic = new Map<string, { total: number; count: number; passed: number; highest: number; lastAttemptAt: string | null }>();
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
                scoreAggByTopic.set(topicId, { total: 0, count: 0, passed: 0, highest: 0, lastAttemptAt: null });
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
            const score = scoreOf(result);
            const mainAgg = ensureMainScoreAgg(topicId);
            mainAgg.total += score;
            mainAgg.count += 1;
            if (score >= 70) mainAgg.passed += 1;
            if (score > mainAgg.highest) mainAgg.highest = score;
            if (result?.created_at) {
                if (!mainAgg.lastAttemptAt || new Date(result.created_at).getTime() > new Date(mainAgg.lastAttemptAt).getTime()) {
                    mainAgg.lastAttemptAt = result.created_at;
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
            const participantKey = addParticipant(topicId, result.user_id || result.user?.id, result.user?.name || result.name);
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
            row.uniqueSingleParticipants = singleParticipantsByTopic.get(topicId)?.size || 0;
            row.uniqueGroupParticipants = groupParticipantsByTopic.get(topicId)?.size || 0;

            const allAgg = scoreAggByTopic.get(topicId);
            const singleAgg = scoreAggSingleByTopic.get(topicId);
            const groupAgg = scoreAggGroupByTopic.get(topicId);

            row.averageScoreOverall = allAgg?.count ? Math.round(allAgg.total / allAgg.count) : 0;
            row.averageScoreSingle = singleAgg?.count ? Math.round(singleAgg.total / singleAgg.count) : 0;
            row.averageScoreGroup = groupAgg?.count ? Math.round(groupAgg.total / groupAgg.count) : 0;
            row.highestScore = allAgg?.highest || 0;
            row.passRate = allAgg?.count ? Math.round((allAgg.passed / allAgg.count) * 100) : 0;
            row.lastAttemptAt = allAgg?.lastAttemptAt || null;
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
                                                        {topic.views} مشاهدة
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
