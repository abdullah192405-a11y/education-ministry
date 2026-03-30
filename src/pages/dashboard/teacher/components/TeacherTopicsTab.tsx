import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Eye, Gamepad2, MoreVertical, Edit,
    Trash, Plus, BookOpen, Video, Calendar,
    AlertTriangle, ListChecks, Target, Clock, Image as ImageIcon,
    FileText, CheckCircle, XCircle, Save, X
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
import { useSubject, useCreateTopic, useUpdateTopic, useDeleteTopic, useSaveTopicMedia, useSaveChallengeQuestions } from "@/hooks/useDatabase";
import type { ChallengeQuestion } from "@/data/challengeTypes";
import ContentEditor from "./ContentEditor";
import { useToast } from "@/components/ui/use-toast";

interface TeacherTopicsTabProps {
    gradeId: string;
    subjectId: string;
    teacherProfileId?: string;
    onCreateChallenge: (topicId: string) => void;
}

interface ExtendedTopic {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    views: number;
    duration?: string;
    createdAt: string;
    media?: any[];
    quiz?: any[];
    challengeItems?: ChallengeQuestion[];
    status?: "published" | "draft";
    mediaCount?: number;
    quizCount?: number;
}

const TeacherTopicsTab = ({ gradeId, subjectId, teacherProfileId, onCreateChallenge }: TeacherTopicsTabProps) => {
    const { toast } = useToast();

    // Mutations
    const createTopicMutation = useCreateTopic();
    const updateTopicMutation = useUpdateTopic();
    const deleteTopicMutation = useDeleteTopic();
    const saveMediaMutation = useSaveTopicMedia();
    const saveChallengeQuestionsMutation = useSaveChallengeQuestions();

    // Get current subject data from database
    const { data: subjectData, isLoading: isLoadingSubject } = useSubject(String(subjectId), teacherProfileId);

    // State
    const [topics, setTopics] = useState<ExtendedTopic[]>([]);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingTopic, setEditingTopic] = useState<ExtendedTopic | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Sync DB topics to local state
    useEffect(() => {
        if (subjectData?.topics) {
            const mapped = subjectData.topics.map((topic: any) => ({
                ...topic,
                thumbnail: topic.thumbnail || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop",
                views: topic.views || 0,
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
                    subject_id: String(subjectId),
                    teacherId: teacherProfileId,
                    title: topicData.title,
                    description: topicData.description,
                    thumbnail: topicData.thumbnail,
                    duration: topicData.duration,
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

    return (
        <div className="space-y-6">
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
                        <Button className="gap-2" onClick={handleCreateTopic}>
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
                                                <Link to={`/grade/${gradeId}/subject/${subjectId}/topic/${topic.id}`}>
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

                                            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
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
                                                    className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                                    onClick={() => onCreateChallenge(topic.id)}
                                                    disabled={topic.status === "draft"}
                                                >
                                                    <Gamepad2 className="w-4 h-4" />
                                                    إنشاء تحدي
                                                </Button>
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
        </div>
    );
};

export default TeacherTopicsTab;
