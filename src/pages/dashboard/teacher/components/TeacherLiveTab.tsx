import { useMemo, useState } from "react";
import { ExternalLink, Radio, Video, CalendarClock, StopCircle } from "lucide-react";
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

const isValidMeetingUrl = (value: string, provider: "GOOGLE_MEET" | "ZOOM" | "CUSTOM") => {
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

const TeacherLiveTab = ({ teacherProfileId }: TeacherLiveTabProps) => {
    const { toast } = useToast();
    const { data: topics = [] } = useTeacherAllTopics(teacherProfileId || "");
    const { data: liveSessions = [] } = useTeacherLiveSessions(teacherProfileId || "");
    const createLiveSession = useCreateTopicLiveSession();
    const updateLiveSession = useUpdateTopicLiveSession();

    const [topicId, setTopicId] = useState("");
    const [provider, setProvider] = useState<"GOOGLE_MEET" | "ZOOM" | "CUSTOM">("GOOGLE_MEET");
    const [meetingUrl, setMeetingUrl] = useState("");
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [startsAt, setStartsAt] = useState(toDatetimeLocal(new Date()));
    const [endsAt, setEndsAt] = useState(toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000)));

    const activeNow = useMemo(() => {
        const now = Date.now();
        return liveSessions.filter((session: any) => {
            if (!session.is_active) return false;
            const start = toMillis(session.starts_at);
            const end = toMillis(session.ends_at);
            return start <= now && now <= end;
        });
    }, [liveSessions]);

    const visibleSessions = useMemo(() => {
        const now = Date.now();
        return [...liveSessions]
            .filter((session: any) => session.is_active || toMillis(session.ends_at) > now)
            .sort((a: any, b: any) => toMillis(b.starts_at) - toMillis(a.starts_at));
    }, [liveSessions]);

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
            await createLiveSession.mutateAsync({
                topicId,
                teacherId: teacherProfileId,
                provider,
                meetingUrl,
                title: title || null,
                startsAt: start.toISOString(),
                endsAt: end.toISOString(),
                notes: notes || null,
            });
            toast({ title: "تم إنشاء البث", description: "أصبح البث متاحًا للطلاب في صفحة الدرس." });
            setMeetingUrl("");
            setTitle("");
            setNotes("");
            setStartsAt(toDatetimeLocal(new Date()));
            setEndsAt(toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
        } catch (error: any) {
            toast({
                title: "فشل إنشاء البث",
                description: error?.message || "تعذر حفظ بيانات البث المباشر.",
                variant: "destructive",
            });
        }
    };

    const handleStopNow = async (session: any) => {
        try {
            await updateLiveSession.mutateAsync({
                id: session.id,
                topicId: session.topic_id,
                teacherId: teacherProfileId,
                updates: {
                    is_active: false,
                    ends_at: nowIso(),
                },
            });
            toast({ title: "تم إنهاء البث", description: "لن يظهر هذا البث كـ مباشر الآن." });
        } catch (error: any) {
            toast({
                title: "تعذر إنهاء البث",
                description: error?.message || "حاول مرة أخرى.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-6" dir="rtl">
            <Card className="border-primary/20 bg-gradient-to-b from-primary/[0.06] via-background to-background shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Video className="w-5 h-5 text-primary" />
                        إنشاء بث مباشر جديد
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        اختر الدرس، أضف رابط الاجتماع، وحدد وقت الجلسة ليظهر للطلاب في صفحة الدرس.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Select value={topicId} onValueChange={setTopicId}>
                            <SelectTrigger className="text-right">
                                <SelectValue placeholder="اختر الدرس" />
                            </SelectTrigger>
                            <SelectContent dir="rtl" align="end">
                                {topics.map((topic: any) => (
                                    <SelectItem key={topic.id} value={topic.id}>
                                        {topic.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={provider} onValueChange={(value: any) => setProvider(value)}>
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

                    <Input
                        placeholder="رابط الاجتماع (Google Meet / Zoom)"
                        value={meetingUrl}
                        onChange={(e) => setMeetingUrl(e.target.value)}
                    />
                    <Input
                        placeholder="عنوان البث (اختياري)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <Textarea
                        placeholder="ملاحظات للطلاب (اختياري)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">وقت البداية</p>
                            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">وقت النهاية</p>
                            <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                        </div>
                    </div>

                    <Button onClick={handleCreate} className="gap-2" disabled={createLiveSession.isPending}>
                        <Radio className="w-4 h-4" />
                        {createLiveSession.isPending ? "جاري النشر..." : "نشر البث"}
                    </Button>
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
                        متابعة الجلسات الجارية والمجدولة مع وصول سريع لرابط البث.
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {visibleSessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">لا توجد جلسات بث حتى الآن.</p>
                    ) : (
                        visibleSessions.map((session: any) => {
                            const now = Date.now();
                            const start = toMillis(session.starts_at);
                            const end = toMillis(session.ends_at);
                            const isLiveNow = session.is_active && start <= now && now <= end;
                            const isUpcoming = session.is_active && start > now;
                            return (
                                <div
                                    key={session.id}
                                    className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${
                                        isLiveNow
                                            ? "border-red-300 bg-red-50/40 dark:bg-red-950/20"
                                            : isUpcoming
                                                ? "border-blue-200 bg-blue-50/40 dark:bg-blue-950/20"
                                                : "border-border bg-background"
                                    }`}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="font-bold text-base">{session.title || session.topic?.title || "بث مباشر"}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {session.topic?.subject?.grade?.name || "—"} - {session.topic?.subject?.name || "—"} - {session.topic?.title || "—"}
                                            </p>
                                        </div>
                                        <Badge
                                            className={
                                                isLiveNow
                                                    ? "bg-red-600 hover:bg-red-600 text-white"
                                                    : isUpcoming
                                                        ? "bg-blue-600 hover:bg-blue-600 text-white"
                                                        : ""
                                            }
                                            variant={isLiveNow || isUpcoming ? "default" : "secondary"}
                                        >
                                            {isLiveNow ? "مباشر الآن" : isUpcoming ? "مجدول" : "منتهي"}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <span className="px-2 py-1 rounded-md bg-muted/60">
                                            البداية: {new Date(session.starts_at).toLocaleString("ar-SA")}
                                        </span>
                                        <span className="px-2 py-1 rounded-md bg-muted/60">
                                            النهاية: {new Date(session.ends_at).toLocaleString("ar-SA")}
                                        </span>
                                        <span className="px-2 py-1 rounded-md bg-muted/60">
                                            المنصة: {session.provider === "GOOGLE_MEET" ? "Google Meet" : session.provider === "ZOOM" ? "Zoom" : "رابط مباشر"}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" variant="outline" className="gap-2" asChild>
                                            <a href={session.meeting_url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="w-4 h-4" />
                                                فتح رابط الاجتماع
                                            </a>
                                        </Button>
                                        {isLiveNow && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="gap-2"
                                                onClick={() => void handleStopNow(session)}
                                                disabled={updateLiveSession.isPending}
                                            >
                                                <StopCircle className="w-4 h-4" />
                                                إنهاء الآن
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
