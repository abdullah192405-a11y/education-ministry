import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { LifeBuoy, CheckCircle2, Loader2, ArrowUpCircle } from "lucide-react";
import {
    useAdminSupportTickets,
    useEscalateAdminSupportTicket,
    useSuperadminSupportTickets,
    useUpdateSupportTicketStatus,
    useUser,
} from "@/hooks/useDatabase";
import { useToast } from "@/components/ui/use-toast";
import { getSupportTicketTypeLabel } from "@/lib/supportTicketTypes";
import { useState } from "react";
import { useOrgAdminTenant } from "@/hooks/useOrgAdminTenant";
import { useTranslation } from "@/contexts/LanguageContext";

function ThumbRow({ urls }: { urls: string[] }) {
    if (!urls?.length) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {urls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block shrink-0">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                </a>
            ))}
        </div>
    );
}

const AdminSupportTab = () => {
    const { toast } = useToast();
    const { t, dir, language } = useTranslation();
    const locale = language === "ar" ? "ar-SA" : "en-US";
    const isRtl = dir === "rtl";
    const textAlign = isRtl ? "text-right" : "text-left";
    const { data: user } = useUser();
    const isSuperadmin = user?.role?.toUpperCase() === "SUPERADMIN";
    const { scopedOrganizationId } = useOrgAdminTenant();
    const { data: adminTickets, isLoading: isLoadingAdmin } = useAdminSupportTickets();
    const { data: superadminTickets, isLoading: isLoadingSuperadmin } = useSuperadminSupportTickets();
    const updateStatus = useUpdateSupportTicketStatus();
    const escalateToSuperadmin = useEscalateAdminSupportTicket();
    const [escalateTicket, setEscalateTicket] = useState<any | null>(null);
    const [escalateNote, setEscalateNote] = useState("");

    const statusMeta: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        OPEN: { label: t("supportTab.status.OPEN"), variant: "default" },
        IN_PROGRESS: { label: t("supportTab.status.IN_PROGRESS"), variant: "secondary" },
        RESOLVED: { label: t("supportTab.status.RESOLVED"), variant: "outline" },
        ESCALATED: { label: t("supportTab.status.ESCALATED"), variant: "destructive" },
    };

    const tickets = isSuperadmin
        ? superadminTickets
        : (adminTickets || []).filter((tk: any) =>
              scopedOrganizationId ? tk?.author?.organization_id === scopedOrganizationId : true
          );
    const isLoading = isSuperadmin ? isLoadingSuperadmin : isLoadingAdmin;

    return (
        <div className="space-y-6" dir={dir}>
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <LifeBuoy className="w-6 h-6 text-primary" />
                    {t("supportTab.title")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {isSuperadmin ? t("supportTab.subtitle.superadmin") : t("supportTab.subtitle.admin")}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        {isSuperadmin ? t("supportTab.card.superadmin") : t("supportTab.card.admin")}
                    </CardTitle>
                    <CardDescription>
                        {isSuperadmin ? t("supportTab.cardDesc.superadmin") : t("supportTab.cardDesc.admin")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t("supportTab.loading")}
                        </p>
                    ) : !tickets?.length ? (
                        <p className="text-sm text-muted-foreground">{t("supportTab.noTickets")}</p>
                    ) : (
                        <ul className="space-y-4">
                            {tickets.map((tk: any) => {
                                const sm = statusMeta[tk.status] || statusMeta.OPEN;
                                const parent = tk.parent;
                                const studentName =
                                    parent?.studentAuthor?.name?.trim() ||
                                    parent?.authorNameSnapshot?.trim();
                                const studentEmail = parent?.studentAuthor?.email;
                                const closed = tk.status === "RESOLVED";
                                return (
                                    <li key={tk.id} className={`p-4 rounded-xl border bg-card ${textAlign} space-y-3`}>
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="space-y-1.5 min-w-0">
                                                <Badge variant="outline" className="font-normal">
                                                    {getSupportTicketTypeLabel(tk.ticketType, language)}
                                                </Badge>
                                                <p className="font-semibold">{tk.subject}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    <span className="text-foreground/80">
                                                        {isSuperadmin ? t("supportTab.fromAdminOrg") : t("supportTab.fromTeacher")}
                                                    </span>
                                                    {tk.author?.name || parent?.parentAuthor?.name || "—"}
                                                    {tk.author?.email ? ` · ${tk.author.email}` : ""}
                                                </p>
                                                {parent && (
                                                    <p className="text-sm">
                                                        <span className="text-muted-foreground">{t("supportTab.studentLabel")}</span>
                                                        <span className="font-semibold text-foreground">
                                                            {studentName || "—"}
                                                        </span>
                                                        {studentEmail ? (
                                                            <span className="text-xs text-muted-foreground mx-1">
                                                                {" "}
                                                                · {studentEmail}
                                                            </span>
                                                        ) : null}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge variant={sm.variant}>{sm.label}</Badge>
                                        </div>

                                        {parent && (
                                            <div className="p-3 rounded-lg bg-muted/80 border border-border text-sm space-y-2">
                                                <p className="text-xs font-medium text-primary">{t("supportTab.parentTitle")}</p>
                                                <Badge variant="secondary" className="font-normal">
                                                    {getSupportTicketTypeLabel(parent.ticketType, language)}
                                                </Badge>
                                                <p className="font-medium">{parent.subject}</p>
                                                <p className="text-muted-foreground whitespace-pre-wrap">{parent.body}</p>
                                                <ThumbRow urls={parent.attachmentUrls || []} />
                                            </div>
                                        )}

                                        <p className="text-sm whitespace-pre-wrap">{tk.body}</p>
                                        <ThumbRow urls={tk.attachmentUrls || []} />

                                        {tk.teacherEscalationNote && (
                                            <div className="p-3 rounded-lg bg-amber-500/10 text-sm">
                                                <span className="font-medium">
                                                    {isSuperadmin ? t("supportTab.adminNote") : t("supportTab.teacherNote")}
                                                </span>
                                                {tk.teacherEscalationNote}
                                            </div>
                                        )}

                                        <div className={`flex ${isRtl ? "justify-end" : "justify-start"} gap-2`}>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                disabled={closed || updateStatus.isPending}
                                                onClick={() =>
                                                    updateStatus.mutate(
                                                        { id: tk.id, status: "IN_PROGRESS" },
                                                        { onSuccess: () => toast({ title: t("supportTab.toast.updated") }) }
                                                    )
                                                }
                                            >
                                                {t("supportTab.inProgress")}
                                            </Button>
                                            <Button
                                                size="sm"
                                                disabled={closed || updateStatus.isPending}
                                                onClick={() =>
                                                    updateStatus.mutate(
                                                        { id: tk.id, status: "RESOLVED", resolved: true },
                                                        {
                                                            onSuccess: () =>
                                                                toast({ title: t("supportTab.toast.closed") }),
                                                        }
                                                    )
                                                }
                                            >
                                                <CheckCircle2 className="w-4 h-4 mx-1" />
                                                {t("supportTab.resolved")}
                                            </Button>
                                            {!isSuperadmin && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={escalateToSuperadmin.isPending}
                                                    onClick={() => setEscalateTicket(tk)}
                                                >
                                                    <ArrowUpCircle className="w-4 h-4 mx-1" />
                                                    {t("supportTab.escalate")}
                                                </Button>
                                            )}
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                            {tk.createdAt
                                                ? new Date(tk.createdAt).toLocaleString(locale)
                                                : ""}
                                        </p>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>

            {!isSuperadmin && (
                <Dialog open={!!escalateTicket} onOpenChange={(o) => !o && setEscalateTicket(null)}>
                    <DialogContent className="sm:max-w-lg" dir={dir}>
                        <DialogHeader>
                            <DialogTitle>{t("supportTab.dialog.title")}</DialogTitle>
                            <DialogDescription>
                                {t("supportTab.dialog.desc")}
                            </DialogDescription>
                        </DialogHeader>
                        {escalateTicket && (
                            <div className="space-y-3">
                                <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
                                    <p className="font-medium">{escalateTicket.subject}</p>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{escalateTicket.body}</p>
                                </div>
                                <Textarea
                                    value={escalateNote}
                                    onChange={(e) => setEscalateNote(e.target.value)}
                                    placeholder={t("supportTab.dialog.placeholder")}
                                    rows={4}
                                />
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEscalateTicket(null)}>
                                {t("common.cancel")}
                            </Button>
                            <Button
                                disabled={!escalateNote.trim() || escalateToSuperadmin.isPending || !user?.id}
                                onClick={() => {
                                    if (!escalateTicket || !user?.id) return;
                                    escalateToSuperadmin.mutate(
                                        {
                                            adminTicketId: escalateTicket.id,
                                            adminUserId: user.id,
                                            subject: escalateTicket.subject,
                                            originalBody: escalateTicket.body,
                                            note: escalateNote,
                                            ticketType: escalateTicket.ticketType,
                                            parentAttachmentUrls: escalateTicket.attachmentUrls,
                                        },
                                        {
                                            onSuccess: () => {
                                                toast({ title: t("supportTab.toast.escalated"), description: t("supportTab.toast.escalatedDesc") });
                                                setEscalateTicket(null);
                                                setEscalateNote("");
                                            },
                                            onError: (e: any) =>
                                                toast({
                                                    title: t("dash.common.error"),
                                                    description: e?.message || t("supportTab.toast.escalateError"),
                                                    variant: "destructive",
                                                }),
                                        }
                                    );
                                }}
                            >
                                {escalateToSuperadmin.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("supportTab.dialog.confirm")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default AdminSupportTab;
