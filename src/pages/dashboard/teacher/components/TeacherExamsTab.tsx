import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    ClipboardList, Plus, Calendar, Clock, Users, Trophy, Copy,
    Share2, MessageCircle, Twitter, Send, Trash2, Eye, Search,
    ChevronLeft, BarChart3, CheckCircle2, XCircle, RefreshCw,
    Link2, Timer, BookOpen, Filter, Download, AlertTriangle,
    FileText, GraduationCap, CalendarRange, CalendarDays, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useUser, useTeacherAllTopics, useTeacherProfile } from "@/hooks/useDatabase";
import {
    useTeacherExams,
    useCreateExam,
    useDeleteExam,
    useBulkUpsertExamQuestions,
    useDeleteExamQuestion,
    examCategoryLabels,
    examStatusLabels,
} from "@/hooks/useExams";
import { generatePin } from "@/data/challengeTypes";
import AIQuestionGenerator from "./AIQuestionGenerator";
import QuestionGameEditor from "./QuestionGameEditor";
import { ChallengeQuestion } from "@/data/challengeTypes";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";
import { exclusiveQuestionAttachmentFields } from "@/lib/questionAttachments";

const EXAM_CATEGORY_KEYS: Record<string, TranslationKey> = {
    WEEKLY: "dash.teacher.exams.category.WEEKLY",
    MONTHLY: "dash.teacher.exams.category.MONTHLY",
    MID_SEMESTER: "dash.teacher.exams.category.MID_SEMESTER",
    FINAL_SEMESTER: "dash.teacher.exams.category.FINAL_SEMESTER",
};

const EXAM_STATUS_KEYS: Record<string, TranslationKey> = {
    DRAFT: "dash.teacher.exams.status.DRAFT",
    SCHEDULED: "dash.teacher.exams.status.SCHEDULED",
    ACTIVE: "dash.teacher.exams.status.ACTIVE",
    ENDED: "dash.teacher.exams.status.ENDED",
};

function useExamI18n() {
    const { t, dir, locale, isRtl } = useDashboardLocale();

    const getCategoryLabel = (key: string) => {
        const tk = EXAM_CATEGORY_KEYS[key];
        return tk ? t(tk) : examCategoryLabels[key]?.label ?? key;
    };

    const getStatusLabel = (key: string) => {
        const tk = EXAM_STATUS_KEYS[key];
        return tk ? t(tk) : examStatusLabels[key]?.label ?? key;
    };

    const formatDateTime = (value?: string | null, options?: Intl.DateTimeFormatOptions) => {
        if (!value) return "—";
        return new Date(value).toLocaleString(locale, options);
    };

    const formatTimeRemaining = (liveStatus: string, start: Date, end: Date, now: Date) => {
        if (liveStatus === "SCHEDULED") {
            const diff = start.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return hours > 0
                ? t("dash.teacher.exams.startsInHoursMinutes", { hours, mins })
                : t("dash.teacher.exams.startsInMinutes", { mins });
        }
        if (liveStatus === "ACTIVE") {
            const diff = end.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return hours > 0
                ? t("dash.teacher.exams.endsInHoursMinutes", { hours, mins })
                : t("dash.teacher.exams.endsInMinutes", { mins });
        }
        return "";
    };

    return { t, dir, locale, isRtl, getCategoryLabel, getStatusLabel, formatDateTime, formatTimeRemaining };
}

// ============================================================================
// Exam Details Dialog Content
// ============================================================================
const ExamDetailsContent = ({ exam }: { exam: any }) => {
    const { t, getCategoryLabel, formatDateTime } = useExamI18n();
    const results = exam?.exam_results || [];
    const [searchQuery, setSearchQuery] = useState("");

    const stats = useMemo(() => {
        if (!results || results.length === 0) return null;

        const totalPercentage = results.reduce((acc: number, r: any) => acc + (r.percentage || 0), 0);
        const avgPercentage = Math.round(totalPercentage / results.length);

        const totalTime = results.reduce((acc: number, r: any) => acc + (r.time_taken || 0), 0);
        const avgTime = Math.round(totalTime / results.length);

        const passed = results.filter((r: any) => (r.percentage || 0) >= 50).length;
        const failed = results.length - passed;

        const topStudent = results.reduce((top: any, r: any) =>
            (r.percentage || 0) > (top?.percentage || 0) ? r : top, results[0]);

        return { avgPercentage, avgTime, passed, failed, topStudent };
    }, [results]);

    const filteredResults = useMemo(() => {
        if (!searchQuery) return results;
        return results.filter((r: any) => {
            const name = r.user?.name || r.student_name || "";
            return name.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [results, searchQuery]);

    return (
        <Tabs defaultValue="grades" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 border-b">
                <TabsList className="bg-transparent h-12 gap-6 p-0 border-none">
                    <TabsTrigger value="grades" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-full px-1">
                        <BarChart3 className="w-4 h-4 me-2" />
                        {t("dash.teacher.exams.tabGrades")}
                    </TabsTrigger>
                    <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-full px-1">
                        <Eye className="w-4 h-4 me-2" />
                        {t("dash.teacher.nav.overview")}
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                <TabsContent value="overview" className="mt-0 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Card className="bg-primary/5 border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-3xl font-black text-primary mb-1">{stats?.avgPercentage || 0}%</div>
                                <div className="text-xs font-bold text-muted-foreground uppercase">{t("dash.teacher.exams.avgOverall")}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-emerald-50 border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-3xl font-black text-emerald-600 mb-1">{results.length}</div>
                                <div className="text-xs font-bold text-muted-foreground uppercase">{t("dash.teacher.exams.participantsCountLabel")}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-green-50 border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-3xl font-black text-green-600 mb-1">{stats?.passed || 0}</div>
                                <div className="text-xs font-bold text-muted-foreground uppercase">{t("dash.teacher.exams.passed")}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-red-50 border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-3xl font-black text-red-600 mb-1">{stats?.failed || 0}</div>
                                <div className="text-xs font-bold text-muted-foreground uppercase">{t("dash.teacher.exams.failed")}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Exam Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 font-bold text-lg border-r-4 border-primary pr-3 py-1">
                            {t("dash.teacher.exams.examDetails")}
                        </div>
                        <div className="grid grid-cols-2 gap-y-6 text-sm bg-muted/20 p-6 rounded-2xl border border-border/50">
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">{t("dash.teacher.exams.topicLabel")}</span>
                                <span className="font-bold flex items-center gap-2 text-base"><BookOpen className="w-4 h-4 text-primary" /> {exam?.topic?.title || "—"}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">{t("dash.teacher.exams.categoryField")}</span>
                                <span className="font-bold flex items-center gap-2 text-base">
                                    <span>{examCategoryLabels[exam?.category]?.icon}</span>
                                    {getCategoryLabel(exam?.category)}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">{t("dash.teacher.exams.startLabel")}</span>
                                <span className="font-bold flex items-center gap-2 text-base"><Calendar className="w-4 h-4 text-primary" /> {formatDateTime(exam?.start_time)}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">{t("dash.teacher.exams.endLabel")}</span>
                                <span className="font-bold flex items-center gap-2 text-base"><Calendar className="w-4 h-4 text-primary" /> {formatDateTime(exam?.end_time)}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">{t("dash.teacher.exams.allowedDuration")}</span>
                                <span className="font-bold flex items-center gap-2 text-base"><Timer className="w-4 h-4 text-primary" /> {t("dash.teacher.exams.minutesShort", { n: exam?.duration_minutes || 60 })}</span>
                            </div>
                            {stats?.topStudent && (
                                <div className="flex flex-col gap-1">
                                    <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">{t("dash.teacher.exams.topScore")}</span>
                                    <span className="font-bold flex items-center gap-2 text-base text-amber-600"><Trophy className="w-4 h-4" /> {stats.topStudent.user?.name || stats.topStudent.student_name || "—"} ({Math.round(stats.topStudent.percentage)}%)</span>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="grades" className="mt-0 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder={t("dash.teacher.exams.searchStudent")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-10 h-11"
                        />
                    </div>

                    {/* Results Table */}
                    {filteredResults.length > 0 ? (
                        <div className="space-y-3">
                            {/* Header */}
                            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                <div className="col-span-1">#</div>
                                <div className="col-span-3">{t("dash.teacher.exams.colStudent")}</div>
                                <div className="col-span-2 text-center">{t("dash.teacher.exams.colScore")}</div>
                                <div className="col-span-2 text-center">{t("dash.teacher.exams.colCorrectWrong")}</div>
                                <div className="col-span-2 text-center">{t("dash.teacher.exams.colTime")}</div>
                                <div className="col-span-2 text-center">{t("dash.teacher.exams.colPercentage")}</div>
                            </div>

                            {[...filteredResults]
                                .sort((a: any, b: any) => (b.percentage || 0) - (a.percentage || 0))
                                .map((res: any, index: number) => (
                                    <div
                                        key={res.id}
                                        className="grid grid-cols-12 gap-3 items-center p-4 rounded-2xl border bg-background hover:border-primary/30 transition-all shadow-sm"
                                    >
                                        <div className="col-span-1">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0
                                                ${index === 0 ? "bg-amber-400 text-white" : index === 1 ? "bg-slate-300 text-slate-700" : index === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"}
                                            `}>
                                                {index + 1}
                                            </div>
                                        </div>
                                        <div className="col-span-3 flex items-center gap-2 min-w-0">
                                            {res.user?.avatar && (
                                                <img src={res.user.avatar} alt="" className="w-8 h-8 rounded-full shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <div className="font-bold text-sm truncate">{res.user?.name || res.student_name || t("dash.common.role.student")}</div>
                                                <div className="text-[10px] text-muted-foreground truncate">{res.user?.email || ""}</div>
                                            </div>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <span className="font-black text-lg text-primary">{res.score || 0}</span>
                                            <span className="text-[10px] text-muted-foreground">/{res.max_score || 0}</span>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <div className="flex items-center justify-center gap-2 text-[11px]">
                                                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-bold">
                                                    <CheckCircle2 className="w-3 h-3" /> {res.correct_answers || 0}
                                                </span>
                                                <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 font-bold">
                                                    <XCircle className="w-3 h-3" /> {res.wrong_answers || 0}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <span className="text-sm font-bold flex items-center justify-center gap-1">
                                                <Clock className="w-3 h-3 text-primary" />
                                                {t("dash.teacher.exams.secondsSuffix", { n: Math.round(res.time_taken || 0) })}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <div className={`font-black text-lg ${(res.percentage || 0) >= 90 ? "text-emerald-600" :
                                                (res.percentage || 0) >= 70 ? "text-blue-600" :
                                                    (res.percentage || 0) >= 50 ? "text-amber-600" : "text-red-600"
                                                }`}>
                                                {Math.round(res.percentage || 0)}%
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                                                <div
                                                    className={`h-full rounded-full transition-all ${(res.percentage || 0) >= 90 ? "bg-emerald-500" :
                                                        (res.percentage || 0) >= 70 ? "bg-blue-500" :
                                                            (res.percentage || 0) >= 50 ? "bg-amber-500" : "bg-red-500"
                                                        }`}
                                                    style={{ width: `${res.percentage || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 text-muted-foreground bg-muted/10 rounded-3xl border-2 border-dashed">
                            <Users className="w-16 h-16 mx-auto mb-4 opacity-10" />
                            <p className="font-bold">{searchQuery ? t("dash.teacher.exams.noSearchResults") : t("dash.teacher.exams.noParticipantsYet")}</p>
                        </div>
                    )}
                </TabsContent>
            </div>
        </Tabs>
    );
};

// ============================================================================
// Create Exam Dialog
// ============================================================================
const CreateExamDialog = ({
    open,
    onOpenChange,
    onCreated,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (exam: any) => void;
}) => {
    const { toast } = useToast();
    const { t, dir, getCategoryLabel } = useExamI18n();
    const { data: user } = useUser();
    const { data: profile } = useTeacherProfile(user?.id || "");
    const { data: topics, isLoading: loadingTopics } = useTeacherAllTopics(profile?.id || "");
    const createExamMutation = useCreateExam();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [gradeId, setGradeId] = useState("");
    const [topicId, setTopicId] = useState("");
    const [customTopic, setCustomTopic] = useState("");
    const [category, setCategory] = useState("WEEKLY");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [isCreating, setIsCreating] = useState(false);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setGradeId("");
        setTopicId("");
        setCustomTopic("");
        setCategory("WEEKLY");
        setStartTime("");
        setEndTime("");
        setDurationMinutes(60);
    };

    const handleCreate = async () => {
        if (!title.trim()) {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.exams.toast.titleRequired"), variant: "destructive" });
            return;
        }
        if (!gradeId) {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.exams.toast.gradeRequired"), variant: "destructive" });
            return;
        }
        if (!topicId) {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.exams.toast.topicRequired"), variant: "destructive" });
            return;
        }
        if (topicId === "CUSTOM" && !customTopic.trim()) {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.exams.toast.customTopicRequired"), variant: "destructive" });
            return;
        }
        
        const finalTopicId = topicId === "CUSTOM" ? null : topicId;
        if (!startTime || !endTime) {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.exams.toast.timesRequired"), variant: "destructive" });
            return;
        }
        if (new Date(endTime) <= new Date(startTime)) {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.exams.toast.endAfterStart"), variant: "destructive" });
            return;
        }

        setIsCreating(true);
        try {
            const finalDescription = topicId === "CUSTOM" 
                ? `${t("dash.teacher.exams.customTopicPrefix", { topic: customTopic })}${description ? ` - ${description}` : ''}`
                : description;

            const pin = generatePin();
            const exam = await createExamMutation.mutateAsync({
                title: title.trim(),
                description: finalDescription.trim(),
                gradeId,
                topicId: finalTopicId,
                hostId: user!.id,
                pin,
                category,
                startTime: new Date(startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
                durationMinutes,
            });

            toast({
                title: t("dash.teacher.exams.toast.createSuccess"),
                description: t("dash.teacher.exams.toast.createSuccessPin", { pin }),
            });

            onCreated({ ...exam, pin });
            resetForm();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: t("dash.teacher.exams.toast.createFailed"),
                description: error?.message || t("dash.teacher.exams.toast.createFailedDefault"),
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    };

    // Extract unique grades from teacher's topics
    const availableGrades = useMemo(() => {
        const gradesMap = new Map();
        (topics || []).forEach((t: any) => {
            if (t.subject?.grade) {
                gradesMap.set(t.subject.grade.id, t.subject.grade);
            }
        });
        return Array.from(gradesMap.values());
    }, [topics]);

    // Topics filtered by selected grade
    const availableTopics = useMemo(() => {
        return (topics || []).filter((t: any) => 
            t.title && (!gradeId || t.subject?.grade?.id === gradeId)
        );
    }, [topics, gradeId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir}>
                <DialogHeader>
                    <div className="mx-auto w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <ClipboardList className="w-7 h-7" />
                    </div>
                    <DialogTitle className="text-center text-xl">{t("dash.teacher.exams.createTitle")}</DialogTitle>
                    <DialogDescription className="text-center">
                        {t("dash.teacher.exams.createDesc")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold">{t("dash.teacher.exams.examTitleLabel")}</label>
                        <Input
                            placeholder={t("dash.teacher.exams.titlePlaceholder")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="h-12"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold">{t("dash.teacher.exams.descriptionLabel")}</label>
                        <Input
                            placeholder={t("dash.teacher.exams.descriptionPlaceholder")}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Grade Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold">{t("dash.teacher.exams.gradeLabel")}</label>
                        {loadingTopics ? (
                            <Skeleton className="h-10 w-full" />
                        ) : (
                            <Select value={gradeId} onValueChange={(val) => { setGradeId(val); setTopicId(""); }}>
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder={t("dash.teacher.exams.gradePlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableGrades.map((grade: any) => (
                                        <SelectItem key={grade.id} value={grade.id}>
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                                                <span className="font-bold">{grade.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Topic Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold">{t("dash.teacher.exams.lessonLabel")}</label>
                        {loadingTopics ? (
                            <Skeleton className="h-10 w-full" />
                        ) : (
                            <Select value={topicId} onValueChange={setTopicId} disabled={!gradeId}>
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder={!gradeId ? t("dash.teacher.exams.selectGradeFirst") : t("dash.teacher.exams.lessonPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CUSTOM">
                                        <div className="flex items-center gap-2">
                                            <ClipboardList className="w-4 h-4 text-purple-500 shrink-0" />
                                            <span className="font-bold text-purple-600">{t("dash.teacher.exams.customExam")}</span>
                                        </div>
                                    </SelectItem>
                                    {availableTopics.map((topic: any) => (
                                        <SelectItem key={topic.id} value={topic.id}>
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-primary shrink-0" />
                                                <span>{topic.title}</span>
                                                {topic.subject && (
                                                    <Badge variant="outline" className="text-[9px] mr-2">{topic.subject.name}</Badge>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Custom Topic Input (Visible only if CUSTOM is selected) */}
                    {topicId === "CUSTOM" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-bold text-purple-600">{t("dash.teacher.exams.customLessonName")}</label>
                            <Input
                                placeholder={t("dash.teacher.exams.customLessonPlaceholder")}
                                value={customTopic}
                                onChange={(e) => setCustomTopic(e.target.value)}
                                className="h-12 border-purple-200 focus-visible:ring-purple-500"
                            />
                        </div>
                    )}

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold">{t("dash.teacher.exams.examCategoryLabel")}</label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="h-12">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(examCategoryLabels).map(([key, val]) => (
                                    <SelectItem key={key} value={key}>
                                        <div className="flex items-center gap-2">
                                            <span>{val.icon}</span>
                                            <span>{getCategoryLabel(key)}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Time Window */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                {t("dash.teacher.exams.startTimeLabel")}
                            </label>
                            <Input
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-red-500" />
                                {t("dash.teacher.exams.endTimeLabel")}
                            </label>
                            <Input
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="h-12"
                            />
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold flex items-center gap-2">
                            <Timer className="w-4 h-4 text-primary" />
                            {t("dash.teacher.exams.durationLabel")}
                        </label>
                        <Input
                            type="number"
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(Number(e.target.value))}
                            min={5}
                            max={300}
                            className="h-12"
                        />
                    </div>

                    {/* Create Button */}
                    <Button
                        className="w-full h-14 text-lg gap-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg"
                        onClick={handleCreate}
                        disabled={isCreating}
                    >
                        {isCreating ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <ClipboardList className="w-5 h-5" />
                        )}
                        {isCreating ? t("dash.teacher.exams.creating") : t("dash.teacher.exams.createButton")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// ============================================================================
// Share Exam Dialog
// ============================================================================
const ShareExamDialog = ({
    exam,
    onClose,
}: {
    exam: { pin: string; title: string } | null;
    onClose: () => void;
}) => {
    const { toast } = useToast();
    const { t, dir } = useExamI18n();

    if (!exam) return null;

    const examLink = `${window.location.origin}/exam/${exam.pin}`;
    const shareText = t("dash.teacher.exams.shareText", { title: exam.title, link: examLink, pin: exam.pin });

    return (
        <Dialog open={!!exam} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md" dir={dir}>
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center mb-4">
                        <Link2 className="w-6 h-6" />
                    </div>
                    <DialogTitle className="text-center text-xl">{t("dash.teacher.exams.shareTitle")}</DialogTitle>
                    <DialogDescription className="text-center">
                        {t("dash.teacher.exams.shareDesc")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* PIN Display */}
                    <div className="flex flex-col items-center justify-center bg-muted/50 p-6 rounded-2xl border-2 border-dashed">
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">{t("dash.teacher.exams.pinLabel")}</span>
                        <span className="text-5xl font-mono font-black text-primary tracking-widest">{exam.pin}</span>
                    </div>

                    {/* Link Display */}
                    <div className="flex items-center gap-2 bg-muted/30 p-3 rounded-xl border">
                        <Input
                            value={examLink}
                            readOnly
                            className="border-none bg-transparent text-sm font-mono"
                            dir="ltr"
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                navigator.clipboard.writeText(examLink);
                                toast({ title: t("dash.common.copied"), description: t("dash.teacher.exams.copiedLinkDesc") });
                            }}
                        >
                            <Copy className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Share Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            className="h-12 bg-[#25D366] hover:bg-[#25D366]/90 text-white gap-2"
                            onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`)}
                        >
                            <MessageCircle className="w-5 h-5" />
                            {t("dash.teacher.share.whatsapp")}
                        </Button>
                        <Button
                            className="h-12 bg-[#1DA1F2] hover:bg-[#1DA1F2]/90 text-white gap-2"
                            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank')}
                        >
                            <Twitter className="w-5 h-5" />
                            {t("dash.teacher.share.twitter")}
                        </Button>
                        <Button
                            className="h-12 bg-[#0088cc] hover:bg-[#0088cc]/90 text-white gap-2"
                            onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(examLink)}&text=${encodeURIComponent(shareText)}`, '_blank')}
                        >
                            <Send className="w-5 h-5" />
                            {t("dash.teacher.share.telegram")}
                        </Button>
                        <Button
                            variant="outline"
                            className="h-12 border-primary/20 text-primary hover:bg-primary/5 gap-2"
                            onClick={() => {
                                navigator.clipboard.writeText(examLink);
                                toast({ title: t("dash.common.copied"), description: t("dash.teacher.exams.copiedLinkDesc") });
                            }}
                        >
                            <Copy className="w-5 h-5" />
                            {t("dash.common.copyLink")}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// ============================================================================
// Manage Questions Dialog
// ============================================================================
const ManageQuestionsDialog = ({
    exam,
    onClose,
}: {
    exam: any;
    onClose: () => void;
}) => {
    const { toast } = useToast();
    const { t, dir } = useExamI18n();
    const upsertQuestionsMutation = useBulkUpsertExamQuestions();
    const deleteQuestionMutation = useDeleteExamQuestion();

    // Map DB format to expected ChallengeQuestion format
    const mappedQuestions: ChallengeQuestion[] = useMemo(() => {
        return exam?.challengeItems || [];
    }, [exam]);

    const handleSave = async (updatedQuestions: ChallengeQuestion[]) => {
        try {
            // Find deleted questions
            const oldIds = (exam?.questions || []).map((q: any) => q.id);
            const newIds = updatedQuestions.filter((q: any) => typeof q.id === "string").map((q: any) => q.id);
            const idsToDelete = oldIds.filter((id: string) => !newIds.includes(id));

            // Delete removed questions
            for (const id of idsToDelete) {
                await deleteQuestionMutation.mutateAsync(id);
            }

            // Map and Save new/updated questions
            const questionsToUpsert = updatedQuestions.map((q: any) => {
                const upsertData: any = {
                    type: String(q.type).toUpperCase(),
                    question: q.question,
                    options: q.options || [],
                    correct_answer: String(q.correctAnswer ?? 0),
                    ...exclusiveQuestionAttachmentFields(q),
                    pairs: q.pairs || null,
                    order_items: q.orderItems || [],
                    explanation: q.explanation || null,
                    points: q.points || 100,
                    time_limit: q.timeLimit || 20,
                    wheel_segments: q.wheelSegments || null,
                    is_active: q.isActive ?? true,
                    sort_order: q.sortOrder || 0,
                };

                // Only include ID if it's an existing string UUID from DB
                if (typeof q.id === "string") {
                    upsertData.id = q.id;
                }
                return upsertData;
            });

            await upsertQuestionsMutation.mutateAsync({
                examId: exam.id,
                questions: questionsToUpsert
            });

            toast({ title: t("dash.teacher.exams.toast.saved"), description: t("dash.teacher.exams.toast.questionsSaved") });
            onClose();
        } catch (error) {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.exams.toast.saveQuestionsFailed"), variant: "destructive" });
        }
    };

    if (!exam) return null;

    return (
        <Dialog open={!!exam} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-4 md:p-8 bg-muted/10 border-none rounded-[2rem] shadow-2xl" dir={dir}>
                <QuestionGameEditor
                    items={mappedQuestions}
                    onSave={handleSave}
                    onCancel={onClose}
                    isExamMode={true}
                />
            </DialogContent>
        </Dialog>
    );
};

// ============================================================================
// Main Component: TeacherExamsTab
// ============================================================================
const TeacherExamsTab = () => {
    const { toast } = useToast();
    const { t, dir, locale, isRtl } = useDashboardLocale();
    const { data: user } = useUser();
    const { data: exams, isLoading } = useTeacherExams(user?.id || "");
    const deleteExamMutation = useDeleteExam();

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [manageQuestionsExam, setManageQuestionsExam] = useState<any>(null);
    const [shareExam, setShareExam] = useState<{ pin: string; title: string } | null>(null);
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const getCategoryLabel = (key: string) => {
        const tk = EXAM_CATEGORY_KEYS[key];
        return tk ? t(tk) : examCategoryLabels[key]?.label ?? key;
    };

    const getStatusLabel = (key: string) => {
        const tk = EXAM_STATUS_KEYS[key];
        return tk ? t(tk) : examStatusLabels[key]?.label ?? key;
    };

    const formatExamDateTime = (value?: string | null, options?: Intl.DateTimeFormatOptions) => {
        if (!value) return "—";
        return new Date(value).toLocaleString(locale, options);
    };

    const formatTimeRemaining = (liveStatus: string, start: Date, end: Date, now: Date) => {
        if (liveStatus === "SCHEDULED") {
            const diff = start.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return hours > 0
                ? t("dash.teacher.exams.startsInHoursMinutes", { hours, mins })
                : t("dash.teacher.exams.startsInMinutes", { mins });
        }
        if (liveStatus === "ACTIVE") {
            const diff = end.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return hours > 0
                ? t("dash.teacher.exams.endsInHoursMinutes", { hours, mins })
                : t("dash.teacher.exams.endsInMinutes", { mins });
        }
        return "";
    };

    // Compute exam status dynamically based on time
    const getExamLiveStatus = (exam: any) => {
        if (!exam?.start_time || !exam?.end_time) return "DRAFT";
        const now = new Date();
        const start = new Date(exam.start_time);
        const end = new Date(exam.end_time);

        if (now < start) return "SCHEDULED";
        if (now >= start && now <= end) return "ACTIVE";
        return "ENDED";
    };

    // Filter exams
    const filteredExams = useMemo(() => {
        let filtered = exams || [];

        if (filterCategory !== "all") {
            filtered = filtered.filter((e: any) => e.category === filterCategory);
        }

        if (searchQuery) {
            filtered = filtered.filter((e: any) =>
                e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.pin?.includes(searchQuery)
            );
        }

        return filtered;
    }, [exams, filterCategory, searchQuery]);

    const handleDeleteExam = async (id: string) => {
        try {
            await deleteExamMutation.mutateAsync(id);
            toast({ title: t("dash.teacher.exams.toast.deleted"), description: t("dash.teacher.exams.toast.deletedDesc") });
        } catch {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.exams.toast.deleteFailed"), variant: "destructive" });
        }
    };

    // Stats summary
    const stats = useMemo(() => {
        if (!exams || exams.length === 0) return { total: 0, active: 0, scheduled: 0, ended: 0, totalStudents: 0 };
        const now = new Date();
        return {
            total: exams.length,
            active: exams.filter((e: any) => now >= new Date(e.start_time) && now <= new Date(e.end_time)).length,
            scheduled: exams.filter((e: any) => now < new Date(e.start_time)).length,
            ended: exams.filter((e: any) => now > new Date(e.end_time)).length,
            totalStudents: exams.reduce((acc: number, e: any) => acc + (e.exam_results?.length || 0), 0),
        };
    }, [exams]);

    return (
        <div className="space-y-6" dir={dir}>
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        {t("dash.teacher.exams.title")}
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">{t("dash.teacher.exams.subtitle")}</p>
                </div>
                <Button
                    className="gap-2 h-12 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg"
                    onClick={() => setShowCreateDialog(true)}
                >
                    <Plus className="w-5 h-5" />
                    {t("dash.teacher.exams.createNew")}
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="p-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-none">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-black">{stats.total}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t("dash.teacher.exams.stats.total")}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-3 bg-emerald-50 border-none">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                            <Timer className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-emerald-600">{stats.active}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t("dash.teacher.exams.stats.active")}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-3 bg-blue-50 border-none">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                            <CalendarRange className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-blue-600">{stats.scheduled}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t("dash.teacher.exams.stats.scheduled")}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-3 bg-gray-50 border-none">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-500 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-gray-600">{stats.ended}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t("dash.teacher.exams.stats.ended")}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-3 bg-amber-50 border-none">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-amber-600">{stats.totalStudents}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t("dash.teacher.exams.participant")}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={t("dash.teacher.exams.searchPlaceholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-10 h-11"
                    />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-full md:w-48 h-11">
                        <Filter className="w-4 h-4 ml-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("dash.teacher.exams.allCategories")}</SelectItem>
                        {Object.entries(examCategoryLabels).map(([key, val]) => (
                            <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                    <span>{val.icon}</span> {getCategoryLabel(key)}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Exams List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-48 w-full rounded-2xl" />
                    ))}
                </div>
            ) : filteredExams.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {filteredExams.map((exam: any) => {
                        const liveStatus = getExamLiveStatus(exam);
                        const statusStyle = examStatusLabels[liveStatus] || examStatusLabels.DRAFT;
                        const catLabel = examCategoryLabels[exam.category] || examCategoryLabels.WEEKLY;
                        const resultsCount = exam.exam_results?.length || 0;
                        const avgScore = resultsCount > 0
                            ? Math.round(exam.exam_results.reduce((acc: number, r: any) => acc + (r.percentage || 0), 0) / resultsCount)
                            : 0;

                        // Time remaining
                        const now = new Date();
                        const start = new Date(exam.start_time);
                        const end = new Date(exam.end_time);
                        const timeInfo = formatTimeRemaining(liveStatus, start, end, now);

                        return (
                            <Card
                                key={exam.id}
                                className={`group overflow-hidden relative cursor-pointer hover:shadow-lg transition-all border-r-4 ${
                                    liveStatus === "ACTIVE" ? "border-r-emerald-500" :
                                    liveStatus === "SCHEDULED" ? "border-r-blue-500" :
                                    "border-r-gray-300"
                                }`}
                                onClick={() => setSelectedExam(exam)}
                            >
                                <CardContent className="p-0">
                                    {/* Main Content */}
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{exam.title}</h3>
                                                    <Badge className={`text-white text-[10px] ${statusStyle.color}`}>
                                                        {getStatusLabel(liveStatus)}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[10px] gap-1">
                                                        {catLabel.icon} {getCategoryLabel(exam.category)}
                                                    </Badge>
                                                </div>
                                                {exam.topic && (
                                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <BookOpen className="w-3.5 h-3.5" />
                                                        {exam.topic.title}
                                                        {exam.topic.subject && (
                                                            <Badge variant="outline" className="text-[9px]">{exam.topic.subject.name}</Badge>
                                                        )}
                                                    </p>
                                                )}
                                                {timeInfo && (
                                                    <p className={`text-xs mt-2 flex items-center gap-1 ${
                                                        liveStatus === "ACTIVE" ? "text-emerald-600" : "text-blue-600"
                                                    }`}>
                                                        <Clock className="w-3 h-3" />
                                                        {timeInfo}
                                                    </p>
                                                )}
                                            </div>

                                            {/* PIN */}
                                            <div
                                                className="text-center bg-gradient-to-br from-indigo-500/5 to-purple-500/10 p-3 rounded-xl border border-indigo-500/20 cursor-pointer hover:scale-105 transition-all shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(exam.pin);
                                                    toast({ title: t("dash.common.copied"), description: t("dash.teacher.exams.toast.copiedPin", { pin: exam.pin }) });
                                                }}
                                            >
                                                <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t("dash.teacher.exams.pinShort")}</span>
                                                <span className="block text-2xl font-mono font-black tracking-widest text-indigo-600" dir="ltr">{exam.pin}</span>
                                                <span className="block text-[9px] text-muted-foreground mt-0.5">
                                                    <Copy className="w-2.5 h-2.5 inline me-1" />
                                                    {t("dash.teacher.exams.clickToCopy")}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Time Window */}
                                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground mb-4">
                                            <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg">
                                                <Calendar className="w-3 h-3 text-primary" />
                                                {t("dash.teacher.exams.from")} {formatExamDateTime(exam.start_time, { dateStyle: "short", timeStyle: "short" })}
                                            </span>
                                            <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg">
                                                <Calendar className="w-3 h-3 text-red-500" />
                                                {t("dash.teacher.exams.to")} {formatExamDateTime(exam.end_time, { dateStyle: "short", timeStyle: "short" })}
                                            </span>
                                            <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg">
                                                <Timer className="w-3 h-3 text-primary" />
                                                {t("dash.teacher.exams.minutesShort", { n: exam.duration_minutes || 60 })}
                                            </span>
                                        </div>

                                        {/* Quick Stats Bar */}
                                        <div className="flex items-center justify-between bg-muted/30 rounded-xl p-3 border border-border/50">
                                            <div className="flex items-center gap-5">
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="w-4 h-4 text-blue-500" />
                                                    <span className="font-bold text-sm">{resultsCount}</span>
                                                    <span className="text-[10px] text-muted-foreground">{t("dash.teacher.exams.participant")}</span>
                                                </div>
                                                {resultsCount > 0 && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Award className="w-4 h-4 text-amber-500" />
                                                        <span className="font-bold text-sm">{avgScore}%</span>
                                                        <span className="text-[10px] text-muted-foreground">{t("dash.teacher.students.averageLabel")}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-1.5 text-xs"
                                                    onClick={() => setShareExam({ pin: exam.pin, title: exam.title })}
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                    {t("dash.common.share")}
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-1.5 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                                    onClick={() => setManageQuestionsExam(exam)}
                                                >
                                                    <ClipboardList className="w-3.5 h-3.5" />
                                                    {t("dash.teacher.exams.questions")}
                                                </Button>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10 border-destructive/20 p-0"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent dir={dir}>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t("dash.teacher.exams.deleteTitle")}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t("dash.teacher.exams.deleteDesc", { title: exam.title })}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="flex-row-reverse gap-2">
                                                            <AlertDialogAction
                                                                className="bg-destructive hover:bg-destructive/90"
                                                                onClick={() => handleDeleteExam(exam.id)}
                                                            >
                                                                {t("dash.teacher.exams.deleteConfirm")}
                                                            </AlertDialogAction>
                                                            <AlertDialogCancel>{t("dash.common.cancel")}</AlertDialogCancel>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-24 bg-muted/20 rounded-3xl border-2 border-dashed">
                    <ClipboardList className="w-20 h-20 mx-auto mb-6 text-muted-foreground/20" />
                    <h3 className="text-xl font-bold mb-2">
                        {searchQuery || filterCategory !== "all" ? t("dash.teacher.exams.emptyFiltered") : t("dash.teacher.exams.emptyNone")}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                        {searchQuery || filterCategory !== "all"
                            ? t("dash.teacher.exams.emptyFilteredHint")
                            : t("dash.teacher.exams.emptyNoneHint")}
                    </p>
                    {!searchQuery && filterCategory === "all" && (
                        <Button
                            className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600"
                            onClick={() => setShowCreateDialog(true)}
                        >
                            <Plus className="w-4 h-4" />
                            {t("dash.teacher.exams.createFirst")}
                        </Button>
                    )}
                </div>
            )}

            {/* Create Exam Dialog */}
            <CreateExamDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onCreated={(exam) => setShareExam({ pin: exam.pin, title: exam.title })}
            />

            {/* Share Exam Dialog */}
            <ShareExamDialog exam={shareExam} onClose={() => setShareExam(null)} />

            {/* Manage Questions Dialog */}
            <ManageQuestionsDialog
                exam={manageQuestionsExam}
                onClose={() => setManageQuestionsExam(null)}
            />

            {/* Exam Details Dialog */}
            <Dialog open={!!selectedExam} onOpenChange={(open) => !open && setSelectedExam(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none rounded-[2rem] shadow-2xl" dir={dir}>
                    <DialogHeader className="p-8 bg-gradient-to-bl from-indigo-500/10 via-transparent to-transparent border-b relative shrink-0">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
                                <ClipboardList className="w-8 h-8" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <DialogTitle className="text-2xl md:text-3xl font-black mb-1.5 leading-tight truncate">
                                    {selectedExam?.title}
                                </DialogTitle>
                                <DialogDescription asChild className="text-sm font-bold flex flex-wrap gap-4 text-muted-foreground/80">
                                    <div className="flex flex-wrap gap-4 pt-1">
                                        <span className="flex items-center gap-2">
                                            <span>{examCategoryLabels[selectedExam?.category]?.icon}</span>
                                            {getCategoryLabel(selectedExam?.category)}
                                        </span>
                                        <Badge className={`${examStatusLabels[getExamLiveStatus(selectedExam)]?.color} text-white text-[10px]`}>
                                            {getStatusLabel(getExamLiveStatus(selectedExam))}
                                        </Badge>
                                        <span className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-primary" />
                                            {t("dash.teacher.exams.participantsShort", { n: selectedExam?.exam_results?.length || 0 })}
                                        </span>
                                    </div>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedExam && <ExamDetailsContent exam={selectedExam} />}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherExamsTab;
