import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Inbox } from "lucide-react";
import { buildOrgAdminApprovedMessage, openWhatsAppShare } from "@/lib/accountOnboarding";

type PendingRequest = {
    id: string;
    requested_package?: string;
    organization?: { name?: string; kind?: string } | null;
    applicant?: { name?: string; email?: string } | null;
};

type PendingRequestsPanelProps = {
    requests: PendingRequest[];
    isLoading: boolean;
    isReviewing: boolean;
    onApprove: (requestId: string) => Promise<void>;
    onReject: (requestId: string) => void;
};

export function PendingRequestsPanel({
    requests,
    isLoading,
    isReviewing,
    onApprove,
    onReject,
}: PendingRequestsPanelProps) {
    return (
        <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <Inbox className="h-4 w-4 text-amber-600" />
                    طلبات اشتراك من الموقع
                    {requests.length > 0 && (
                        <Badge variant="destructive" className="text-[10px]">
                            {requests.length}
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription>
                    طلبات أنشأها أدمن المؤسسة من الصفحة الرئيسية — راجعها وفعّل الحساب ثم أرسل إشعار واتساب.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {isLoading ? (
                    <Skeleton className="h-24 w-full" />
                ) : requests.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">لا توجد طلبات معلّقة.</p>
                ) : (
                    requests.map((req) => (
                        <div
                            key={req.id}
                            className="rounded-lg border bg-background p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                        >
                            <div className="min-w-0">
                                <p className="font-semibold truncate">
                                    {req.organization?.name || "مؤسسة جديدة"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {req.applicant?.name || "أدمن"} · {req.applicant?.email}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    <Badge variant="outline" className="text-[10px]">
                                        {req.requested_package === "INSTITUTION_ADMIN_STUDENT"
                                            ? "أدمن + طالب"
                                            : "أدمن + معلم + طالب"}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px]">
                                        {req.organization?.kind === "EDUCATIONAL"
                                            ? "تعليمية"
                                            : req.organization?.kind === "ENRICHMENT"
                                              ? "إثرائية"
                                              : "تعليمية + إثرائية"}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap shrink-0">
                                <Button
                                    size="sm"
                                    className="gap-1"
                                    disabled={isReviewing}
                                    onClick={async () => {
                                        await onApprove(req.id);
                                        const msg = buildOrgAdminApprovedMessage({
                                            adminName: req.applicant?.name || "المدير",
                                            orgName: req.organization?.name || "المؤسسة",
                                            email: req.applicant?.email || "",
                                        });
                                        openWhatsAppShare({ message: msg });
                                    }}
                                >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    تأكيد وإرسال
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isReviewing}
                                    onClick={() => onReject(req.id)}
                                >
                                    رفض
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
