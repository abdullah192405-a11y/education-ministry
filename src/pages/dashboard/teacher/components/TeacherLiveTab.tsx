import { useMemo, useState } from "react";
import {
    CalendarClock,
    CheckCircle2,
    Clock,
    Copy,
    ExternalLink,
    Link2,
    MessageCircle,
    Radio,
    Send,
    StopCircle,
    Video,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
    useCreateTopicLiveSession,
    useTeacherAllTopics,
    useTeacherLiveSessions,
    useUpdateTopicLiveSession,
} from "@/hooks/useDatabase";

interface TeacherLiveTabProps {
    teacherProfileId?: string;
}

const toDatetimeLocal = (date: Date) => {
    const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return shifted.toISOString().slice(0, 16);
};

const nowIso = () => new Date().toISOString();
const toMillis = (value?: string | null) => {
    const t = new Date(value || "").getTime();
    return Number.isFinite(t) ? t : 0;
};

type LiveProvider = "GOOGLE_MEET" | "ZOOM" | "CUSTOM";
type SessionStatus = "live" | "upcoming" | "ended";

interface LiveTopic {
    id: string;
    topic_id?: string | null;
    title?: string | null;
    subject_id?: string | null;
    subject?: {
        id?: string | null;
        name?: string | null;
        grade?: {
            slug?: string | null;
            name?: string | null;
        } | null;
    } | null;
}

interface LiveSession {
    id: string;
    topic_id?: string | null;
    teacher_id?: string | null;
    provider?: LiveProvider | string | null;
    meeting_url?: string | null;
    title?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    notes?: string | null;
    is_active?: boolean | null;
    topic?: LiveTopic | null;
}

const providerLabels: Record<LiveProvider, string> = {
    GOOGLE_MEET: "Google Meet",
    ZOOM: "Zoom",
    CUSTOM: "رابط مباشر",
};

const providerPlaceholders: Record<LiveProvider, string> = {
    GOOGLE_MEET: "https://meet.google.com/abc-defg-hij",
    ZOOM: "https://zoom.us/j/123456789",
    CUSTOM: "https://example.com/live-class",
};

const getOrigin = () => (typeof window === "undefined" ? "" : window.location.origin);

const isValidMeetingUrl = (value: string, provider: LiveProvider) => {
    try {
        const url = new URL(value.trim());
        if (url.protocol !== "https:") return false;
        const host = url.hostname.toLowerCase();
        if (provider === "GOOGLE_MEET") return host === "meet.google.com" || host.endsWith(".meet.google.com");
        if (provider === "ZOOM") return host.endsWith("zoom.us") || host.endsWith("zoom.com");
        return true;
    } catch {
        return false;
    }
};

const formatDateTime = (value?: string | null) => {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" });
};

const getSessionStatus = (session: LiveSession): SessionStatus => {
    const now = Date.now();
    const start = toMillis(session.starts_at);
    const end = toMillis(session.ends_at);
    if (session.is_active && start <= now && now <= end) return "live";
    if (session.is_active && start > now) return "upcoming";
    return "ended";
};

const getStatusConfig = (status: SessionStatus) => {
    if (status === "live") {
        return {
            label: "مباشر الآن",
            badgeClass: "bg-red-600 hover:bg-red-600 text-white",
            cardClass: "border-red-300 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20",
        };
    }
    if (status === "upcoming") {
        return {
            label: "مجدول",
            badgeClass: "bg-blue-600 hover:bg-blue-600 text-white",
            cardClass: "border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20",
        };
    }
    return {
        label: "منتهي",
        badgeClass: "",
        cardClass: "border-border bg-background",
    };
};

const buildTopicPath = (topic?: LiveTopic | null) => {
    const gradeSlug = topic?.subject?.grade?.slug;
    const subjectId = topic?.subject?.id || topic?.subject_id;
    const topicId = topic?.id || topic?.topic_id;
    if (!gradeSlug || !subjectId || !topicId) return "";
    return `/grade/${gradeSlug}/subject/${subjectId}/topic/${topicId}`;
};

const getTopicUrl = (topic?: LiveTopic | null) => {
    const path = buildTopicPath(topic);
    return path ? `${getOrigin()}${path}` : "";
};

const buildShareText = (session: LiveSession) => {
    const title = session.title || session.topic?.title || "حصة مباشرة";
    const lessonUrl = getTopicUrl(session.topic);
    const parts = [
        `تمت جدولة ${title}`,
        `البداية: ${formatDateTime(session.starts_at)}`,
        `المنصة: ${providerLabels[session.provider as LiveProvider] || "رابط مباشر"}`,
    ];
    if (lessonUrl) parts.push(`صفحة الدرس: ${lessonUrl}`);
    return parts.join("\n");
};

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

const TeacherLiveTab = ({ teacherProfileId }: TeacherLiveTabProps) => {
    const { toast } = useToast();
    const { data: teacherTopics = [] } = useTeacherAllTopics(teacherProfileId || "");
    const { data: teacherLiveSessions = [] } = useTeacherLiveSessions(teacherProfileId || "");
    const topics = teacherTopics as LiveTopic[];
    const liveSessions = teacherLiveSessions as LiveSession[];
    const createLiveSession = useCreateTopicLiveSession();
    const updateLiveSession = useUpdateTopicLiveSession();

    const [topicId, setTopicId] = useState("");
    const [provider, setProvider] = useState<LiveProvider>("GOOGLE_MEET");
    const [meetingUrl, setMeetingUrl] = useState("");
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [startsAt, setStartsAt] = useState(toDatetimeLocal(new Date()));
    const [endsAt, setEndsAt] = useState(toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000)));

    const selectedTopic = useMemo(
        () => topics.find((topic) => topic.id === topicId),
        [topics, topicId]
    );
    const selectedTopicUrl = useMemo(() => getTopicUrl(selectedTopic), [selectedTopic]);

    const activeNow = useMemo(() => {
        return liveSessions.filter((session) => getSessionStatus(session) === "live");
    }, [liveSessions]);

    const upcomingSessions = useMemo(
        () => liveSessions.filter((session) => getSessionStatus(session) === "upcoming"),
        [liveSessions]
    );

    const visibleSessions = useMemo(() => {
        const now = Date.now();
        return [...liveSessions]
            .filter((session) => session.is_active || toMillis(session.ends_at) > now)
            .sort((a, b) => {
                const statusWeight: Record<SessionStatus, number> = { live: 0, upcoming: 1, ended: 2 };
                const statusDiff = statusWeight[getSessionStatus(a)] - statusWeight[getSessionStatus(b)];
                if (statusDiff !== 0) return statusDiff;
                return toMillis(a.starts_at) - toMillis(b.starts_at);
            });
    }, [liveSessions]);

    const setQuickDuration = (minutes: number) => {
        const start = new Date();
        const end = new Date(start.getTime() + minutes * 60 * 1000);
        setStartsAt(toDatetimeLocal(start));
        setEndsAt(toDatetimeLocal(end));
    };

    const copyText = async (text: string, description: string) => {
        if (!text) return;
        await navigator.clipboard.writeText(text);
        toast({ title: "تم النسخ", description });
    };

    const handleCreate = async () => {
        if (!teacherProfileId) return;
        if (!topicId || !meetingUrl.trim()) {
            toast({ title: "بيانات ناقصة", description: "اختر الدرس وأدخل رابط الاجتماع.", variant: "destructive" });
            return;
        }
        if (!isValidMeetingUrl(meetingUrl, provider)) {
            toast({
                title: "رابط غير صالح",
                description:
                    provider === "GOOGLE_MEET"
                        ? "أدخل رابط Google Meet صحيح يبدأ بـ https://meet.google.com/"
                        : provider === "ZOOM"
                            ? "أدخل رابط Zoom صحيح يبدأ بـ https://*.zoom.us/"
                            : "أدخل رابط HTTPS صالح.",
                variant: "destructive",
            });
            return;
        }

        const start = new Date(startsAt);
        const end = new Date(endsAt);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            toast({ title: "وقت غير صالح", description: "يجب أن يكون وقت الانتهاء بعد وقت البداية.", variant: "destructive" });
            return;
        }

        try {
            const sessionTitle = title.trim() || (selectedTopic ? `حصة مباشرة: ${selectedTopic.title}` : null);
            await createLiveSession.mutateAsync({
                topicId,
                teacherId: teacherProfileId,
                provider,
                meetingUrl,
                title: sessionTitle,
                startsAt: start.toISOString(),
                endsAt: end.toISOString(),
                notes: notes || null,
            });
            toast({ title: "تم نشر البث", description: "أصبح ظاهرًا داخل صفحة الدرس ويمكن مشاركته مع الطلاب." });
            setMeetingUrl("");
            setTitle("");
            setNotes("");
            setStartsAt(toDatetimeLocal(new Date()));
            setEndsAt(toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
        } catch (error: unknown) {
            toast({
                title: "فشل إنشاء البث",
                description: getErrorMessage(error, "تعذر حفظ بيانات البث المباشر."),
                variant: "destructive",
            });
        }
    };

    const handleStopSession = async (session: LiveSession) => {
        try {
            await updateLiveSession.mutateAsync({
                id: session.id,
                topicId: session.topic_id || undefined,
                teacherId: teacherProfileId,
                updates: {
                    is_active: false,
                    ends_at: nowIso(),
                },
            });
            toast({ title: "تم إنهاء البث", description: "لن يظهر هذا البث للطلاب كجلسة نشطة." });
        } catch (error: unknown) {
            toast({
                title: "تعذر إنهاء البث",
                description: getErrorMessage(error, "حاول مرة أخرى."),
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-6" dir="rtl">
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.12] via-background to-background shadow-sm">
                <CardHeader className="space-y-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <Badge className="mb-3 bg-primary/10 text-primary hover:bg-primary/10" variant="secondary">
                                مركز البث المتكامل
                            </Badge>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <Video className="w-6 h-6 text-primary" />
                                إدارة البث المباشر
                            </CardTitle>
                            <p className="mt-2 text-sm text-muted-foreground">
                                أنشئ جلسة مرتبطة بالدرس، شارك صفحة المنصة، واترك رابط الاجتماع يظهر للطلاب في نفس مسار التعلم.
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-2xl border bg-background/80 px-4 py-3">
                                <div className="text-2xl font-black text-red-600">{activeNow.length}</div>
                                <div className="text-[11px] text-muted-foreground">مباشر الآن</div>
                            </div>
                            <div className="rounded-2xl border bg-background/80 px-4 py-3">
                                <div className="text-2xl font-black text-blue-600">{upcomingSessions.length}</div>
                                <div className="text-[11px] text-muted-foreground">مجدول</div>
                            </div>
                            <div className="rounded-2xl border bg-background/80 px-4 py-3">
                                <div className="text-2xl font-black text-primary">{topics.length}</div>
                                <div className="text-[11px] text-muted-foreground">درس متاح</div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
                        <div className="space-y-4 rounded-2xl border bg-background/85 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <p className="text-xs font-bold text-muted-foreground">الدرس المرتبط</p>
                                    <Select value={topicId} onValueChange={setTopicId}>
                                        <SelectTrigger className="text-right">
                                            <SelectValue placeholder="اختر الدرس" />
                                        </SelectTrigger>
                                        <SelectContent dir="rtl" align="end">
                                            {topics.map((topic) => (
                                                <SelectItem key={topic.id} value={topic.id}>
                                                    {topic.subject?.grade?.name ? `${topic.subject.grade.name} - ` : ""}
                                                    {topic.subject?.name ? `${topic.subject.name} - ` : ""}
                                                    {topic.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-xs font-bold text-muted-foreground">منصة الاجتماع</p>
                                    <Select value={provider} onValueChange={(value) => setProvider(value as LiveProvider)}>
                                        <SelectTrigger className="text-right">
                                            <SelectValue placeholder="المنصة" />
                                        </SelectTrigger>
                                        <SelectContent dir="rtl" align="end">
                                            <SelectItem value="GOOGLE_MEET">Google Meet</SelectItem>
                                            <SelectItem value="ZOOM">Zoom</SelectItem>
                                            <SelectItem value="CUSTOM">رابط آخر</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <p className="text-xs font-bold text-muted-foreground">رابط الاجتماع</p>
                                <Input
                                    dir="ltr"
                                    className="text-left"
                                    placeholder={providerPlaceholders[provider]}
                                    value={meetingUrl}
                                    onChange={(e) => setMeetingUrl(e.target.value)}
                                />
                            </div>

                            <Input
                                placeholder={selectedTopic ? `حصة مباشرة: ${selectedTopic.title}` : "عنوان البث (اختياري)"}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <Textarea
                                placeholder="ملاحظات تظهر للطلاب قبل الانضمام (اختياري)"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-muted-foreground">وقت البداية</p>
                                    <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-muted-foreground">وقت النهاية</p>
                                    <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setQuickDuration(45)}>
                                    الآن - 45 دقيقة
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setQuickDuration(60)}>
                                    الآن - ساعة
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setQuickDuration(90)}>
                                    الآن - 90 دقيقة
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3 rounded-2xl border bg-background/85 p-4">
                            <div className="flex items-center gap-2 font-bold">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                تكامل المنصة
                            </div>
                            <p className="text-sm text-muted-foreground">
                                عند النشر سيظهر البث في صفحة الدرس للطلاب مع حالة مباشر أو مجدول، ويمكنك مشاركة رابط الدرس بدل إرسال رابط الاجتماع وحده.
                            </p>
                            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                                <div className="text-xs font-bold text-muted-foreground">رابط صفحة الدرس</div>
                                {selectedTopicUrl ? (
                                    <>
                                        <p className="break-all text-xs" dir="ltr">{selectedTopicUrl}</p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => void copyText(selectedTopicUrl, "تم نسخ رابط صفحة الدرس.")}
                                        >
                                            <Copy className="h-4 w-4" />
                                            نسخ رابط الدرس
                                        </Button>
                                    </>
                                ) : (
                                    <p className="text-xs text-muted-foreground">اختر درسًا لعرض رابط المنصة المخصص له.</p>
                                )}
                            </div>
                            <Button onClick={handleCreate} className="w-full gap-2" disabled={createLiveSession.isPending}>
                                <Radio className="w-4 h-4" />
                                {createLiveSession.isPending ? "جاري النشر..." : "نشر البث داخل المنصة"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-primary/15">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <CalendarClock className="w-5 h-5 text-primary" />
                            الجلسات المباشرة
                        </span>
                        <Badge className={activeNow.length > 0 ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""} variant={activeNow.length > 0 ? "default" : "secondary"}>
                            مباشر الآن: {activeNow.length}
                        </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        متابعة الجلسات الجارية والمجدولة مع روابط المنصة والمشاركة السريعة للطلاب.
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {visibleSessions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
                            <Radio className="mx-auto mb-3 h-9 w-9 text-primary/40" />
                            <p className="font-bold">لا توجد جلسات بث حتى الآن</p>
                            <p className="mt-1 text-sm text-muted-foreground">ابدأ بربط بث مباشر بأحد الدروس ليظهر هنا ولدى الطلاب.</p>
                        </div>
                    ) : (
                        visibleSessions.map((session) => {
                            const status = getSessionStatus(session);
                            const statusConfig = getStatusConfig(status);
                            const topicUrl = getTopicUrl(session.topic);
                            const shareText = buildShareText(session);
                            return (
                                <div
                                    key={session.id}
                                    className={`rounded-2xl border p-4 flex flex-col gap-4 transition-colors ${statusConfig.cardClass}`}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="font-bold text-base">{session.title || session.topic?.title || "بث مباشر"}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {session.topic?.subject?.grade?.name || "—"} - {session.topic?.subject?.name || "—"} - {session.topic?.title || "—"}
                                            </p>
                                        </div>
                                        <Badge
                                            className={statusConfig.badgeClass}
                                            variant={status === "live" || status === "upcoming" ? "default" : "secondary"}
                                        >
                                            {statusConfig.label}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background/70">
                                            <Clock className="h-3.5 w-3.5" />
                                            البداية: {formatDateTime(session.starts_at)}
                                        </span>
                                        <span className="px-2 py-1 rounded-md bg-background/70">
                                            النهاية: {formatDateTime(session.ends_at)}
                                        </span>
                                        <span className="px-2 py-1 rounded-md bg-background/70">
                                            المنصة: {providerLabels[session.provider as LiveProvider] || "رابط مباشر"}
                                        </span>
                                    </div>
                                    {session.notes && (
                                        <p className="rounded-xl border bg-background/70 p-3 text-sm text-muted-foreground">
                                            {session.notes}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" variant="outline" className="gap-2" asChild>
                                            <a href={session.meeting_url || "#"} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="w-4 h-4" />
                                                فتح رابط الاجتماع
                                            </a>
                                        </Button>
                                        {topicUrl && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-2"
                                                onClick={() => void copyText(topicUrl, "تم نسخ رابط صفحة الدرس.")}
                                            >
                                                <Link2 className="w-4 h-4" />
                                                نسخ رابط الدرس
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-2"
                                            onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`)}
                                        >
                                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                                            واتساب
                                        </Button>
                                        {topicUrl && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-2"
                                                onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(topicUrl)}&text=${encodeURIComponent(shareText)}`, "_blank")}
                                            >
                                                <Send className="w-4 h-4 text-sky-600" />
                                                تيليجرام
                                            </Button>
                                        )}
                                        {status !== "ended" && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="gap-2"
                                                onClick={() => void handleStopSession(session)}
                                                disabled={updateLiveSession.isPending}
                                            >
                                                <StopCircle className="w-4 h-4" />
                                                {status === "live" ? "إنهاء الآن" : "إلغاء الجدولة"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TeacherLiveTab;
