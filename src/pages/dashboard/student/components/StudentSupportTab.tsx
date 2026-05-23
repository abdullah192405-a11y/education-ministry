import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Send, Loader2, ImagePlus, X } from "lucide-react";
import {
    useMyStudentSupportTickets,
    useCreateStudentSupportTicket,
} from "@/hooks/useDatabase";
import { useToast } from "@/components/ui/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    SUPPORT_TICKET_TYPE_VALUES,
    getSupportTicketTypeLabel,
    type SupportTicketTypeValue,
} from "@/lib/supportTicketTypes";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const MAX_ATTACHMENTS = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png"]);

function AttachmentPreviewGrid({
    files,
    onRemove,
    removeLabel,
}: {
    files: File[];
    onRemove: (index: number) => void;
    removeLabel: string;
}) {
    const [objectUrls, setObjectUrls] = useState<string[]>([]);

    useEffect(() => {
        const urls = files.map((f) => URL.createObjectURL(f));
        setObjectUrls(urls);
        return () => urls.forEach((u) => URL.revokeObjectURL(u));
    }, [files]);

    if (!files.length) return null;
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {files.map((file, i) => (
                <div key={`${file.name}-${i}`} className="relative group">
                    <img
                        src={objectUrls[i] || ""}
                        alt=""
                        className="w-20 h-20 object-cover rounded-lg border"
                    />
                    <button
                        type="button"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-90 hover:opacity-100"
                        onClick={() => onRemove(i)}
                        aria-label={removeLabel}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}

function TicketAttachmentUrls({ urls }: { urls: string[] }) {
    if (!urls?.length) return null;
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {urls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block shrink-0">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border hover:opacity-90" />
                </a>
            ))}
        </div>
    );
}

type Props = {
    userId: string;
    gradeId: string | null | undefined;
    gradeName?: string | null;
    authorName?: string | null;
};

const StudentSupportTab = ({ userId, gradeId, gradeName, authorName }: Props) => {
    const { toast } = useToast();
    const { t, dir, language, locale, isRtl, textAlign } = useDashboardLocale();
    const { data: tickets, isLoading } = useMyStudentSupportTickets(userId);
    const createMutation = useCreateStudentSupportTicket();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [ticketType, setTicketType] = useState<SupportTicketTypeValue>("TECHNICAL");
    const [body, setBody] = useState("");
    const [files, setFiles] = useState<File[]>([]);

    const statusMeta: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        OPEN: { label: t("supportTab.status.OPEN"), variant: "default" },
        IN_PROGRESS: { label: t("supportTab.status.IN_PROGRESS"), variant: "secondary" },
        RESOLVED: { label: t("supportTab.status.RESOLVED"), variant: "outline" },
        ESCALATED: { label: t("dash.student.support.statusEscalated"), variant: "destructive" },
    };

    const validateImageFiles = (
        current: File[],
        adding: FileList | File[],
    ): { ok: true; next: File[] } | { ok: false; message: string } => {
        const toAdd = Array.from(adding);
        if (current.length + toAdd.length > MAX_ATTACHMENTS) {
            return { ok: false, message: t("dash.student.support.maxImages", { n: MAX_ATTACHMENTS }) };
        }
        for (const f of toAdd) {
            if (!ALLOWED_MIME.has(f.type.toLowerCase())) {
                return { ok: false, message: t("dash.student.support.invalidType") };
            }
            if (f.size > MAX_BYTES) {
                return { ok: false, message: t("dash.student.support.maxSize") };
            }
        }
        return { ok: true, next: [...current, ...toAdd] };
    };

    const resetForm = () => {
        setTicketType("TECHNICAL");
        setBody("");
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handlePickFiles = (list: FileList | null) => {
        if (!list?.length) return;
        const v = validateImageFiles(files, list);
        if (!v.ok) {
            toast({ title: t("dash.student.support.attachmentsToast"), description: v.message, variant: "destructive" });
            return;
        }
        setFiles(v.next);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!gradeId) {
            toast({
                title: t("dash.student.support.noGradeTitle"),
                description: t("dash.student.support.noGradeDesc"),
                variant: "destructive",
            });
            return;
        }
        if (!body.trim()) {
            toast({
                title: t("dash.student.support.missingFields"),
                description: t("dash.student.support.missingDesc"),
                variant: "destructive",
            });
            return;
        }
        createMutation.mutate(
            {
                authorUserId: userId,
                gradeId,
                ticketType,
                body,
                authorName: authorName ?? undefined,
                files: files.length ? files : undefined,
            },
            {
                onSuccess: () => {
                    toast({ title: t("dash.student.support.sentTitle"), description: t("dash.student.support.sentDesc") });
                    resetForm();
                },
                onError: (err: any) => {
                    toast({
                        title: t("dash.student.support.sendFail"),
                        description: err?.message || t("dash.student.support.tryAgain"),
                        variant: "destructive",
                    });
                },
            },
        );
    };

    return (
        <div className="space-y-6" dir={dir}>
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <LifeBuoy className="w-5 h-5 text-primary" />
                        <CardTitle>{t("dash.student.support.title")}</CardTitle>
                    </div>
                    {gradeName ? (
                        <CardDescription>{t("dash.student.support.gradePrefix", { name: gradeName })}</CardDescription>
                    ) : null}
                </CardHeader>
                <CardContent>
                    {!gradeId && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            {t("dash.student.support.noGradeWarning")}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <p className="text-destructive text-lg leading-none font-semibold">
                            <span aria-hidden>*</span>
                            <span className="sr-only">{t("dash.student.support.requiredHint")}</span>
                        </p>

                        <div className="space-y-2">
                            <label htmlFor="ticket-type" className="text-sm font-medium block">
                                {t("dash.student.support.typeLabel")} <span className="text-destructive">*</span>
                            </label>
                            <Select
                                value={ticketType}
                                onValueChange={(v) => setTicketType(v as SupportTicketTypeValue)}
                                disabled={!gradeId}
                            >
                                <SelectTrigger id="ticket-type" dir={dir} className={textAlign}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent dir={dir}>
                                    {SUPPORT_TICKET_TYPE_VALUES.map((value) => (
                                        <SelectItem key={value} value={value}>
                                            {getSupportTicketTypeLabel(value, language)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="ticket-body" className="text-sm font-medium block">
                                {t("dash.student.support.descLabel")} <span className="text-destructive">*</span>
                            </label>
                            <Textarea
                                id="ticket-body"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={6}
                                dir={dir}
                                className="resize-y min-h-[140px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <span className="text-sm font-medium block">{t("dash.student.support.attachments")}</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                                multiple
                                className="hidden"
                                onChange={(e) => handlePickFiles(e.target.files)}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!gradeId || files.length >= MAX_ATTACHMENTS}
                                className="w-full rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40 transition-colors p-8 flex flex-col items-center gap-2 text-muted-foreground disabled:opacity-50"
                            >
                                <ImagePlus className="w-8 h-8" />
                                <span className="text-sm font-medium text-foreground">{t("dash.student.support.addImages")}</span>
                                <span className="text-xs text-center leading-relaxed">{t("dash.student.support.fileHint")}</span>
                            </button>
                            <AttachmentPreviewGrid
                                files={files}
                                removeLabel={t("dash.student.support.removeImage")}
                                onRemove={(i) => {
                                    setFiles((prev) => prev.filter((_, j) => j !== i));
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                            />
                        </div>

                        <div className={cn("flex flex-wrap gap-3 pt-2", isRtl ? "justify-end" : "justify-start")}>
                            <Button
                                type="submit"
                                disabled={createMutation.isPending || !gradeId}
                                className="gap-2 min-w-[160px]"
                            >
                                {createMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                {t("dash.student.support.submit")}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetForm}
                                disabled={createMutation.isPending}
                            >
                                {t("common.cancel")}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t("dash.student.support.myTickets")}</CardTitle>
                    <CardDescription>{t("dash.student.support.myTicketsDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">{t("dash.student.support.loading")}</p>
                    ) : !tickets?.length ? (
                        <p className="text-sm text-muted-foreground">{t("dash.student.support.noTickets")}</p>
                    ) : (
                        <ul className="space-y-3">
                            {tickets.map((tk) => {
                                const sm = statusMeta[tk.status] || statusMeta.OPEN;
                                return (
                                    <li key={tk.id} className={cn("p-4 rounded-xl border bg-card space-y-2", textAlign)}>
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <h4 className="font-semibold text-base">
                                                {getSupportTicketTypeLabel(tk.ticketType, language) || tk.subject}
                                            </h4>
                                            <Badge variant={sm.variant}>{sm.label}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tk.body}</p>
                                        <TicketAttachmentUrls urls={tk.attachmentUrls || []} />
                                        <p className="text-xs text-muted-foreground">
                                            {tk.createdAt ? new Date(tk.createdAt).toLocaleString(locale) : ""}
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

export default StudentSupportTab;
