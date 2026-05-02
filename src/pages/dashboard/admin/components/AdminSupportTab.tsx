import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, CheckCircle2, Loader2 } from "lucide-react";
import { useAdminSupportTickets, useUpdateSupportTicketStatus } from "@/hooks/useDatabase";
import { useToast } from "@/components/ui/use-toast";
import { getSupportTicketTypeLabel } from "@/lib/supportTicketTypes";

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

const statusMeta: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    OPEN: { label: "مفتوحة", variant: "default" },
    IN_PROGRESS: { label: "قيد المعالجة", variant: "secondary" },
    RESOLVED: { label: "تم الحل", variant: "outline" },
    ESCALATED: { label: "مُصعّدة", variant: "destructive" },
};

const AdminSupportTab = () => {
    const { toast } = useToast();
    const { data: tickets, isLoading } = useAdminSupportTickets();
    const updateStatus = useUpdateSupportTicketStatus();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <LifeBuoy className="w-6 h-6 text-primary" />
                    تذاكر الدعم
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    تذاكر المعلمين للإدارة، بما فيها طلبات التصعيد عن تذاكر الطلاب
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">جميع تذاكر المعلمين</CardTitle>
                    <CardDescription>
                        طلبات المعلمين؛ عند التصعيد يُذكر اسم الطالب صاحب التذكرة الأصلية.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            جاري التحميل...
                        </p>
                    ) : !tickets?.length ? (
                        <p className="text-sm text-muted-foreground">لا توجد تذاكر.</p>
                    ) : (
                        <ul className="space-y-4">
                            {tickets.map((t: any) => {
                                const sm = statusMeta[t.status] || statusMeta.OPEN;
                                const parent = t.parent;
                                const studentName =
                                    parent?.studentAuthor?.name?.trim() ||
                                    parent?.authorNameSnapshot?.trim();
                                const studentEmail = parent?.studentAuthor?.email;
                                const closed = t.status === "RESOLVED";
                                return (
                                    <li key={t.id} className="p-4 rounded-xl border bg-card text-right space-y-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="space-y-1.5 min-w-0">
                                                <Badge variant="outline" className="font-normal">
                                                    {getSupportTicketTypeLabel(t.ticketType)}
                                                </Badge>
                                                <p className="font-semibold">{t.subject}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    <span className="text-foreground/80">من المعلم: </span>
                                                    {t.author?.name || "—"}
                                                    {t.author?.email ? ` · ${t.author.email}` : ""}
                                                </p>
                                                {parent && (
                                                    <p className="text-sm">
                                                        <span className="text-muted-foreground">الطالب: </span>
                                                        <span className="font-semibold text-foreground">
                                                            {studentName || "—"}
                                                        </span>
                                                        {studentEmail ? (
                                                            <span className="text-xs text-muted-foreground mr-1">
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
                                                <p className="text-xs font-medium text-primary">تذكرة الطالب الأصلية</p>
                                                <Badge variant="secondary" className="font-normal">
                                                    {getSupportTicketTypeLabel(parent.ticketType)}
                                                </Badge>
                                                <p className="font-medium">{parent.subject}</p>
                                                <p className="text-muted-foreground whitespace-pre-wrap">{parent.body}</p>
                                                <ThumbRow urls={parent.attachmentUrls || []} />
                                            </div>
                                        )}

                                        <p className="text-sm whitespace-pre-wrap">{t.body}</p>
                                        <ThumbRow urls={t.attachmentUrls || []} />

                                        {t.teacherEscalationNote && (
                                            <div className="p-3 rounded-lg bg-amber-500/10 text-sm">
                                                <span className="font-medium">ملاحظة المعلم: </span>
                                                {t.teacherEscalationNote}
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                disabled={closed || updateStatus.isPending}
                                                onClick={() =>
                                                    updateStatus.mutate(
                                                        { id: t.id, status: "IN_PROGRESS" },
                                                        { onSuccess: () => toast({ title: "تم التحديث" }) }
                                                    )
                                                }
                                            >
                                                قيد المعالجة
                                            </Button>
                                            <Button
                                                size="sm"
                                                disabled={closed || updateStatus.isPending}
                                                onClick={() =>
                                                    updateStatus.mutate(
                                                        { id: t.id, status: "RESOLVED", resolved: true },
                                                        {
                                                            onSuccess: () =>
                                                                toast({ title: "تم إغلاق التذكرة" }),
                                                        }
                                                    )
                                                }
                                            >
                                                <CheckCircle2 className="w-4 h-4 ml-1" />
                                                تم الحل
                                            </Button>
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                            {t.createdAt
                                                ? new Date(t.createdAt).toLocaleString("ar-SA")
                                                : ""}
                                        </p>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminSupportTab;
