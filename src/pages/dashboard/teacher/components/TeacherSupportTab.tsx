import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { LifeBuoy, Send, Loader2, ArrowUpCircle, CheckCircle2, PlayCircle } from "lucide-react";
import {
    useTeacherIncomingStudentTickets,
    useTeacherAdminSupportTickets,
    useCreateTeacherAdminSupportTicket,
    useEscalateStudentSupportTicket,
    useUpdateSupportTicketStatus,
} from "@/hooks/useDatabase";
import { useToast } from "@/components/ui/use-toast";
import { getSupportTicketTypeLabel } from "@/lib/supportTicketTypes";

const statusMeta: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    OPEN: { label: "مفتوحة", variant: "default" },
    IN_PROGRESS: { label: "قيد المعالجة", variant: "secondary" },
    RESOLVED: { label: "تم الحل", variant: "outline" },
    ESCALATED: { label: "مُصعّدة", variant: "destructive" },
};

type TicketRow = {
    id: string;
    subject: string;
    body: string;
    status: string;
    ticketType?: string;
    attachmentUrls?: string[];
    authorNameSnapshot?: string | null;
    createdAt?: string;
    author?: { name?: string; email?: string };
};

/** TEACHER_TO_ADMIN row possibly linked to an escalated student ticket */
type TeacherOutboundTicket = TicketRow & {
    parent?: {
        id: string;
        authorNameSnapshot?: string | null;
        subject?: string;
        body?: string;
        studentAuthor?: { name?: string | null; email?: string | null };
    };
};

type Props = {
    teacherUserId: string;
    teacherGradeId: string | null | undefined;
};

const TeacherSupportTab = ({ teacherUserId, teacherGradeId }: Props) => {
    const { toast } = useToast();
    const { data: incoming, isLoading: loadingIncoming } = useTeacherIncomingStudentTickets(
        teacherGradeId || undefined
    );
    const { data: outbound, isLoading: loadingOutbound } = useTeacherAdminSupportTickets(teacherUserId);
    const createAdmin = useCreateTeacherAdminSupportTicket();
    const escalate = useEscalateStudentSupportTicket();
    const updateStatus = useUpdateSupportTicketStatus();

    const [adminOpen, setAdminOpen] = useState(false);
    const [adminSubject, setAdminSubject] = useState("");
    const [adminBody, setAdminBody] = useState("");

    const [escalateTicket, setEscalateTicket] = useState<TicketRow | null>(null);
    const [escalateNote, setEscalateNote] = useState("");

    const handleCreateAdmin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminSubject.trim() || !adminBody.trim()) return;
        createAdmin.mutate(
            { authorUserId: teacherUserId, subject: adminSubject, body: adminBody },
            {
                onSuccess: () => {
                    toast({ title: "تم الإرسال", description: "وصلت التذكرة إلى الإدارة." });
                    setAdminOpen(false);
                    setAdminSubject("");
                    setAdminBody("");
                },
                onError: (err: any) =>
                    toast({
                        title: "خطأ",
                        description: err?.message,
                        variant: "destructive",
                    }),
            }
        );
    };

    const handleEscalate = () => {
        if (!escalateTicket || !escalateNote.trim()) return;
        escalate.mutate(
            {
                studentTicketId: escalateTicket.id,
                teacherUserId,
                subject: escalateTicket.subject,
                originalBody: escalateTicket.body,
                note: escalateNote,
                studentTicketType: escalateTicket.ticketType,
                parentAttachmentUrls: escalateTicket.attachmentUrls,
            },
            {
                onSuccess: () => {
                    toast({ title: "تم التصعيد", description: "أُرسلت التذكرة إلى الإدارة." });
                    setEscalateTicket(null);
                    setEscalateNote("");
                },
                onError: (err: any) =>
                    toast({
                        title: "خطأ",
                        description: err?.message,
                        variant: "destructive",
                    }),
            }
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <LifeBuoy className="w-6 h-6 text-primary" />
                        تذاكر الدعم
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        طلبات طلاب صفك، وتذاكرك للإدارة
                    </p>
                </div>
                <Button onClick={() => setAdminOpen(true)} className="gap-2">
                    <Send className="w-4 h-4" />
                    تذكرة جديدة للإدارة
                </Button>
            </div>

            {!teacherGradeId && (
                <div className="p-3 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm">
                    لم يُحدد صف في ملفك كمعلم؛ لن تظهر تذاكر الطلاب حتى تربط حسابك بصف من الإعدادات.
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">من الطلاب</CardTitle>
                    <CardDescription>تذاكر الدعم المرسلة من طلاب صفك</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingIncoming ? (
                        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
                    ) : !incoming?.length ? (
                        <p className="text-sm text-muted-foreground">لا توجد تذاكر من الطلاب.</p>
                    ) : (
                        <ul className="space-y-4">
                            {incoming.map((t: TicketRow) => {
                                const sm = statusMeta[t.status] || statusMeta.OPEN;
                                const disabledActions = t.status === "RESOLVED" || t.status === "ESCALATED";
                                return (
                                    <li key={t.id} className="p-4 rounded-xl border bg-card space-y-3 text-right">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="space-y-1">
                                                <Badge variant="outline" className="font-normal">
                                                    {getSupportTicketTypeLabel(t.ticketType)}
                                                </Badge>
                                                <p className="font-semibold">{t.subject}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    من:{" "}
                                                    {t.authorNameSnapshot?.trim() ||
                                                        t.author?.name ||
                                                        "طالب"}
                                                </p>
                                            </div>
                                            <Badge variant={sm.variant}>{sm.label}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.body}</p>
                                        {(t.attachmentUrls?.length ?? 0) > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {t.attachmentUrls!.map((url) => (
                                                    <a
                                                        key={url}
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block shrink-0"
                                                    >
                                                        <img
                                                            src={url}
                                                            alt=""
                                                            className="w-16 h-16 object-cover rounded-lg border"
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={disabledActions || updateStatus.isPending}
                                                onClick={() =>
                                                    updateStatus.mutate(
                                                        { id: t.id, status: "IN_PROGRESS" },
                                                        {
                                                            onSuccess: () =>
                                                                toast({ title: "تم", description: "حالة: قيد المعالجة" }),
                                                        }
                                                    )
                                                }
                                            >
                                                <PlayCircle className="w-4 h-4 ml-1" />
                                                قيد المعالجة
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                disabled={disabledActions || updateStatus.isPending}
                                                onClick={() =>
                                                    updateStatus.mutate(
                                                        { id: t.id, status: "RESOLVED", resolved: true },
                                                        {
                                                            onSuccess: () =>
                                                                toast({ title: "تم الحل", description: "أُغلقت التذكرة." }),
                                                        }
                                                    )
                                                }
                                            >
                                                <CheckCircle2 className="w-4 h-4 ml-1" />
                                                تم الحل
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                disabled={disabledActions || escalate.isPending}
                                                onClick={() => setEscalateTicket(t)}
                                            >
                                                <ArrowUpCircle className="w-4 h-4 ml-1" />
                                                تصعيد للإدارة
                                            </Button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">تذاكري للإدارة</CardTitle>
                    <CardDescription>
                        ما أرسلته إلى الإدارة؛ إن وُجد تصعيد من طالب يُعرض اسم الطالب.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingOutbound ? (
                        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
                    ) : !outbound?.length ? (
                        <p className="text-sm text-muted-foreground">لا توجد تذاكر مرسلة للإدارة.</p>
                    ) : (
                        <ul className="space-y-3">
                            {outbound.map((t: TeacherOutboundTicket) => {
                                const sm = statusMeta[t.status] || statusMeta.OPEN;
                                const studentName =
                                    t.parent?.studentAuthor?.name?.trim() ||
                                    t.parent?.authorNameSnapshot?.trim();
                                const isFromStudent = !!t.parent;
                                return (
                                    <li key={t.id} className="p-4 rounded-xl border text-right space-y-2">
                                        <div className="flex justify-between gap-2">
                                            <span className="font-semibold">{t.subject}</span>
                                            <Badge variant={sm.variant}>{sm.label}</Badge>
                                        </div>
                                        {isFromStudent && (
                                            <p className="text-sm">
                                                <span className="text-muted-foreground">الطالب: </span>
                                                <span className="font-semibold text-foreground">
                                                    {studentName || "—"}
                                                </span>
                                                {t.parent?.studentAuthor?.email ? (
                                                    <span className="text-xs text-muted-foreground mr-1">
                                                        {" "}
                                                        · {t.parent.studentAuthor.email}
                                                    </span>
                                                ) : null}
                                                <Badge variant="outline" className="mr-2 text-[10px] font-normal">
                                                    تصعيد من طالب
                                                </Badge>
                                            </p>
                                        )}
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.body}</p>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
                <DialogContent className="sm:max-w-lg" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>تذكرة دعم للإدارة</DialogTitle>
                        <DialogDescription>صف المشكلة أو الطلب الموجّه لمسؤولي المنصة.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateAdmin} className="space-y-3">
                        <Input
                            value={adminSubject}
                            onChange={(e) => setAdminSubject(e.target.value)}
                            placeholder="العنوان"
                        />
                        <Textarea
                            value={adminBody}
                            onChange={(e) => setAdminBody(e.target.value)}
                            placeholder="التفاصيل"
                            rows={5}
                        />
                        <DialogFooter className="gap-2 sm:justify-start">
                            <Button type="submit" disabled={createAdmin.isPending}>
                                {createAdmin.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!escalateTicket} onOpenChange={(o) => !o && setEscalateTicket(null)}>
                <DialogContent className="sm:max-w-lg" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>تصعيد التذكرة للإدارة</DialogTitle>
                        <DialogDescription>
                            أضف ملاحظة توضّح ما جرّبته أو سبب التصعيد. ستُرسل نسخة للإدارة مع تفاصيل الطالب.
                        </DialogDescription>
                    </DialogHeader>
                    {escalateTicket && (
                        <div className="space-y-3">
                            <p className="text-sm">
                                <span className="text-muted-foreground">الطالب: </span>
                                <span className="font-semibold">
                                    {escalateTicket.authorNameSnapshot?.trim() ||
                                        escalateTicket.author?.name ||
                                        "—"}
                                </span>
                                {escalateTicket.author?.email ? (
                                    <span className="text-xs text-muted-foreground mr-1">
                                        {" "}
                                        · {escalateTicket.author.email}
                                    </span>
                                ) : null}
                            </p>
                            <div className="p-3 rounded-lg bg-muted text-sm">
                                <p className="font-medium">{escalateTicket.subject}</p>
                                <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{escalateTicket.body}</p>
                            </div>
                            <Textarea
                                value={escalateNote}
                                onChange={(e) => setEscalateNote(e.target.value)}
                                placeholder="ملاحظة للإدارة..."
                                rows={4}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEscalateTicket(null)}>
                            إلغاء
                        </Button>
                        <Button onClick={handleEscalate} disabled={!escalateNote.trim() || escalate.isPending}>
                            {escalate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد التصعيد"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherSupportTab;
