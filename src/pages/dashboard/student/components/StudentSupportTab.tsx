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
    SUPPORT_TICKET_TYPES,
    getSupportTicketTypeLabel,
    type SupportTicketTypeValue,
} from "@/lib/supportTicketTypes";

const MAX_ATTACHMENTS = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png"]);

const requiredMark = <span className="text-destructive">*</span>;

const statusMeta: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    OPEN: { label: "مفتوحة", variant: "default" },
    IN_PROGRESS: { label: "قيد المعالجة", variant: "secondary" },
    RESOLVED: { label: "تم الحل", variant: "outline" },
    ESCALATED: { label: "أُرسلت للإدارة", variant: "destructive" },
};

function validateImageFiles(
    current: File[],
    adding: FileList | File[]
): { ok: true; next: File[] } | { ok: false; message: string } {
    const toAdd = Array.from(adding);
    if (current.length + toAdd.length > MAX_ATTACHMENTS) {
        return { ok: false, message: `يمكنك رفع ${MAX_ATTACHMENTS} صور كحد أقصى.` };
    }
    for (const f of toAdd) {
        if (!ALLOWED_MIME.has(f.type.toLowerCase())) {
            return { ok: false, message: "يُسمح فقط بملفات JPG أو JPEG أو PNG." };
        }
        if (f.size > MAX_BYTES) {
            return { ok: false, message: "حجم كل ملف يجب ألا يتجاوز 5 ميجابايت." };
        }
    }
    return { ok: true, next: [...current, ...toAdd] };
}

function AttachmentPreviewGrid({
    files,
    onRemove,
}: {
    files: File[];
    onRemove: (index: number) => void;
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
                        aria-label="إزالة الصورة"
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
    /** Stored on the ticket so teachers/admins see the name without querying `users` (RLS). */
    authorName?: string | null;
};

const StudentSupportTab = ({ userId, gradeId, gradeName, authorName }: Props) => {
    const { toast } = useToast();
    const { data: tickets, isLoading } = useMyStudentSupportTickets(userId);
    const createMutation = useCreateStudentSupportTicket();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [ticketType, setTicketType] = useState<SupportTicketTypeValue>("TECHNICAL");
    const [body, setBody] = useState("");
    const [files, setFiles] = useState<File[]>([]);

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
            toast({ title: "المرفقات", description: v.message, variant: "destructive" });
            return;
        }
        setFiles(v.next);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!gradeId) {
            toast({
                title: "لم يُحدد الصف",
                description: "حدّث ملفك الشخصي لاختيار صفك الدراسي قبل إنشاء تذكرة.",
                variant: "destructive",
            });
            return;
        }
        if (!body.trim()) {
            toast({
                title: "حقول ناقصة",
                description: "أدخل وصف المشكلة.",
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
                    toast({ title: "تم الإرسال", description: "ستصل تذكرتك إلى معلم صفك." });
                    resetForm();
                },
                onError: (err: any) => {
                    toast({
                        title: "تعذّر الإرسال",
                        description: err?.message || "حاول مرة أخرى.",
                        variant: "destructive",
                    });
                },
            }
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <LifeBuoy className="w-5 h-5 text-primary" />
                        <CardTitle>تذاكر الدعم</CardTitle>
                    </div>
                    {gradeName ? (
                        <CardDescription>الصف: {gradeName}</CardDescription>
                    ) : null}
                </CardHeader>
                <CardContent>
                    {!gradeId && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            لم يُربط حسابك بصف دراسي. افتح تبويب الإعدادات وحدّث الصف لاستخدام تذاكر الدعم.
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <p className="text-destructive text-lg leading-none font-semibold">
                            <span aria-hidden>*</span>
                            <span className="sr-only">يشير إلى حقول مطلوبة</span>
                        </p>

                        <div className="space-y-2">
                            <label htmlFor="ticket-type" className="text-sm font-medium block">
                                نوع التذكرة {requiredMark}
                            </label>
                            <Select
                                value={ticketType}
                                onValueChange={(v) => setTicketType(v as SupportTicketTypeValue)}
                                disabled={!gradeId}
                            >
                                <SelectTrigger id="ticket-type" dir="rtl" className="text-right">
                                    <SelectValue placeholder="مشكلة تقنية" />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                    {SUPPORT_TICKET_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="ticket-body" className="text-sm font-medium block">
                                الوصف {requiredMark}
                            </label>
                            <Textarea
                                id="ticket-body"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder=""
                                rows={6}
                                dir="rtl"
                                className="resize-y min-h-[140px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <span className="text-sm font-medium block">
                                المرفقات (5 صور كحد أقصى)
                            </span>
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
                                <span className="text-sm font-medium text-foreground">انقر لإضافة صور</span>
                                <span className="text-xs text-center leading-relaxed">
                                    JPG, JPEG, PNG حتى 5 ميجابايت لكل ملف
                                </span>
                            </button>
                            <AttachmentPreviewGrid
                                files={files}
                                onRemove={(i) => {
                                    setFiles((prev) => prev.filter((_, j) => j !== i));
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                            />
                        </div>

                        <div className="flex flex-wrap gap-3 justify-end pt-2">
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
                                إرسال التذكرة
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetForm}
                                disabled={createMutation.isPending}
                            >
                                إلغاء
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">تذاكري</CardTitle>
                    <CardDescription>آخر التذاكر المرسلة إلى معلم الصف</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
                    ) : !tickets?.length ? (
                        <p className="text-sm text-muted-foreground">لا توجد تذاكر بعد.</p>
                    ) : (
                        <ul className="space-y-3">
                            {tickets.map((t) => {
                                const sm = statusMeta[t.status] || statusMeta.OPEN;
                                return (
                                    <li
                                        key={t.id}
                                        className="p-4 rounded-xl border bg-card text-right space-y-2"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <h4 className="font-semibold text-base">
                                                {getSupportTicketTypeLabel(t.ticketType) || t.subject}
                                            </h4>
                                            <Badge variant={sm.variant}>{sm.label}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.body}</p>
                                        <TicketAttachmentUrls urls={t.attachmentUrls || []} />
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

export default StudentSupportTab;
