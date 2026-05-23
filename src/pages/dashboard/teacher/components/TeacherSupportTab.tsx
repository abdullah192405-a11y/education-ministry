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
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

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
    const { t, dir, language, isRtl, textAlign } = useDashboardLocale();
    const { data: incoming, isLoading: loadingIncoming } = useTeacherIncomingStudentTickets(
        teacherGradeId || undefined,
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

    const statusMeta: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        OPEN: { label: t("supportTab.status.OPEN"), variant: "default" },
        IN_PROGRESS: { label: t("supportTab.status.IN_PROGRESS"), variant: "secondary" },
        RESOLVED: { label: t("supportTab.status.RESOLVED"), variant: "outline" },
        ESCALATED: { label: t("supportTab.status.ESCALATED"), variant: "destructive" },
    };

    const handleCreateAdmin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminSubject.trim() || !adminBody.trim()) return;
        createAdmin.mutate(
            { authorUserId: teacherUserId, subject: adminSubject, body: adminBody },
            {
                onSuccess: () => {
                    toast({ title: t("dash.teacher.support.toast.sent"), description: t("dash.teacher.support.toast.sentDesc") });
                    setAdminOpen(false);
                    setAdminSubject("");
                    setAdminBody("");
                },
                onError: (err: any) =>
                    toast({
                        title: t("dash.common.error"),
                        description: err?.message,
                        variant: "destructive",
                    }),
            },
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
                    toast({ title: t("dash.teacher.support.toast.escalated"), description: t("dash.teacher.support.toast.escalatedDesc") });
                    setEscalateTicket(null);
                    setEscalateNote("");
                },
                onError: (err: any) =>
                    toast({
                        title: t("dash.common.error"),
                        description: err?.message,
                        variant: "destructive",
                    }),
            },
        );
    };

    return (
        <div className="space-y-6" dir={dir}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <LifeBuoy className="w-6 h-6 text-primary" />
                        {t("dash.teacher.support.title")}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">{t("dash.teacher.support.subtitle")}</p>
                </div>
                <Button onClick={() => setAdminOpen(true)} className="gap-2">
                    <Send className="w-4 h-4" />
                    {t("dash.teacher.support.newTicket")}
                </Button>
            </div>

            {!teacherGradeId && (
                <div className="p-3 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm">
                    {t("dash.teacher.support.noGradeWarning")}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t("dash.teacher.support.fromStudents")}</CardTitle>
                    <CardDescription>{t("dash.teacher.support.fromStudentsDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingIncoming ? (
                        <p className="text-sm text-muted-foreground">{t("dash.teacher.support.loading")}</p>
                    ) : !incoming?.length ? (
                        <p className="text-sm text-muted-foreground">{t("dash.teacher.support.noStudentTickets")}</p>
                    ) : (
                        <ul className="space-y-4">
                            {incoming.map((tk: TicketRow) => {
                                const sm = statusMeta[tk.status] || statusMeta.OPEN;
                                const disabledActions = tk.status === "RESOLVED" || tk.status === "ESCALATED";
                                return (
                                    <li key={tk.id} className={cn("p-4 rounded-xl border bg-card space-y-3", textAlign)}>
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="space-y-1">
                                                <Badge variant="outline" className="font-normal">
                                                    {getSupportTicketTypeLabel(tk.ticketType, language)}
                                                </Badge>
                                                <p className="font-semibold">{tk.subject}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {t("dash.teacher.support.fromPrefix")}
                                                    {tk.authorNameSnapshot?.trim() ||
                                                        tk.author?.name ||
                                                        t("dash.teacher.support.studentFallback")}
                                                </p>
                                            </div>
                                            <Badge variant={sm.variant}>{sm.label}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tk.body}</p>
                                        {(tk.attachmentUrls?.length ?? 0) > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {tk.attachmentUrls!.map((url) => (
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
                                        <div className={cn("flex flex-wrap gap-2", isRtl ? "justify-end" : "justify-start")}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={disabledActions || updateStatus.isPending}
                                                onClick={() =>
                                                    updateStatus.mutate(
                                                        { id: tk.id, status: "IN_PROGRESS" },
                                                        {
                                                            onSuccess: () =>
                                                                toast({
                                                                    title: t("dash.teacher.support.toast.inProgress"),
                                                                    description: t("dash.teacher.support.toast.inProgressDesc"),
                                                                }),
                                                        },
                                                    )
                                                }
                                            >
                                                <PlayCircle className="w-4 h-4 mx-1" />
                                                {t("dash.teacher.support.inProgress")}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                disabled={disabledActions || updateStatus.isPending}
                                                onClick={() =>
                                                    updateStatus.mutate(
                                                        { id: tk.id, status: "RESOLVED", resolved: true },
                                                        {
                                                            onSuccess: () =>
                                                                toast({
                                                                    title: t("dash.teacher.support.toast.resolved"),
                                                                    description: t("dash.teacher.support.toast.resolvedDesc"),
                                                                }),
                                                        },
                                                    )
                                                }
                                            >
                                                <CheckCircle2 className="w-4 h-4 mx-1" />
                                                {t("dash.teacher.support.resolved")}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                disabled={disabledActions || escalate.isPending}
                                                onClick={() => setEscalateTicket(tk)}
                                            >
                                                <ArrowUpCircle className="w-4 h-4 mx-1" />
                                                {t("dash.teacher.support.escalate")}
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
                    <CardTitle className="text-lg">{t("dash.teacher.support.toAdmin")}</CardTitle>
                    <CardDescription>{t("dash.teacher.support.toAdminDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingOutbound ? (
                        <p className="text-sm text-muted-foreground">{t("dash.teacher.support.loading")}</p>
                    ) : !outbound?.length ? (
                        <p className="text-sm text-muted-foreground">{t("dash.teacher.support.noAdminTickets")}</p>
                    ) : (
                        <ul className="space-y-3">
                            {outbound.map((tk: TeacherOutboundTicket) => {
                                const sm = statusMeta[tk.status] || statusMeta.OPEN;
                                const studentName =
                                    tk.parent?.studentAuthor?.name?.trim() ||
                                    tk.parent?.authorNameSnapshot?.trim();
                                const isFromStudent = !!tk.parent;
                                return (
                                    <li key={tk.id} className={cn("p-4 rounded-xl border space-y-2", textAlign)}>
                                        <div className="flex justify-between gap-2">
                                            <span className="font-semibold">{tk.subject}</span>
                                            <Badge variant={sm.variant}>{sm.label}</Badge>
                                        </div>
                                        {isFromStudent && (
                                            <p className="text-sm">
                                                <span className="text-muted-foreground">{t("dash.teacher.support.studentLabel")}</span>
                                                <span className="font-semibold text-foreground">
                                                    {studentName || "—"}
                                                </span>
                                                {tk.parent?.studentAuthor?.email ? (
                                                    <span className="text-xs text-muted-foreground mx-1">
                                                        {" "}
                                                        · {tk.parent.studentAuthor.email}
                                                    </span>
                                                ) : null}
                                                <Badge variant="outline" className="mx-2 text-[10px] font-normal">
                                                    {t("dash.teacher.support.escalatedFromStudent")}
                                                </Badge>
                                            </p>
                                        )}
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tk.body}</p>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
                <DialogContent className="sm:max-w-lg" dir={dir}>
                    <DialogHeader>
                        <DialogTitle>{t("dash.teacher.support.adminDialogTitle")}</DialogTitle>
                        <DialogDescription>{t("dash.teacher.support.adminDialogDesc")}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateAdmin} className="space-y-3">
                        <Input
                            value={adminSubject}
                            onChange={(e) => setAdminSubject(e.target.value)}
                            placeholder={t("dash.teacher.support.subjectPlaceholder")}
                        />
                        <Textarea
                            value={adminBody}
                            onChange={(e) => setAdminBody(e.target.value)}
                            placeholder={t("dash.teacher.support.bodyPlaceholder")}
                            rows={5}
                        />
                        <DialogFooter className={cn("gap-2", isRtl ? "sm:justify-start" : "sm:justify-end")}>
                            <Button type="submit" disabled={createAdmin.isPending}>
                                {createAdmin.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("dash.teacher.support.send")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!escalateTicket} onOpenChange={(o) => !o && setEscalateTicket(null)}>
                <DialogContent className="sm:max-w-lg" dir={dir}>
                    <DialogHeader>
                        <DialogTitle>{t("dash.teacher.support.escalateDialogTitle")}</DialogTitle>
                        <DialogDescription>{t("dash.teacher.support.escalateDialogDesc")}</DialogDescription>
                    </DialogHeader>
                    {escalateTicket && (
                        <div className="space-y-3">
                            <p className="text-sm">
                                <span className="text-muted-foreground">{t("dash.teacher.support.studentLabel")}</span>
                                <span className="font-semibold">
                                    {escalateTicket.authorNameSnapshot?.trim() ||
                                        escalateTicket.author?.name ||
                                        "—"}
                                </span>
                                {escalateTicket.author?.email ? (
                                    <span className="text-xs text-muted-foreground mx-1">
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
                                placeholder={t("dash.teacher.support.escalatePlaceholder")}
                                rows={4}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEscalateTicket(null)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleEscalate} disabled={!escalateNote.trim() || escalate.isPending}>
                            {escalate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("dash.teacher.support.confirmEscalate")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherSupportTab;
