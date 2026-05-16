import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MessageCircle, Copy } from "lucide-react";
import {
    buildOrgAdminLoginReminderMessage,
    copyToClipboard,
    openWhatsAppShare,
    parseWhatsAppFromDetails,
} from "@/lib/accountOnboarding";
import { useToast } from "@/hooks/use-toast";

type AdminRow = {
    id: string;
    name: string;
    email: string;
    organization_id?: string | null;
    details?: string | null;
    organizations?: unknown;
};

export function OrgAdminsTable({
    admins,
    isLoading,
}: {
    admins: AdminRow[];
    isLoading: boolean;
}) {
    const { toast } = useToast();
    const [q, setQ] = useState("");

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return admins;
        return admins.filter((row) => {
            const org = Array.isArray(row.organizations)
                ? (row.organizations as { name?: string }[])[0]
                : (row.organizations as { name?: string } | null);
            return (
                row.name.toLowerCase().includes(needle) ||
                row.email.toLowerCase().includes(needle) ||
                String(org?.name || "").toLowerCase().includes(needle)
            );
        });
    }, [admins, q]);

    if (isLoading) {
        return <Skeleton className="h-32 w-full" />;
    }

    if (admins.length === 0) {
        return <p className="text-sm text-muted-foreground py-8 text-center">لم يُنشأ أي أدمن بعد.</p>;
    }

    return (
        <div className="space-y-3">
            <div className="relative max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    className="pr-10"
                    placeholder="بحث بالاسم أو البريد أو المؤسسة..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </div>
            {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">لا توجد نتائج.</p>
            ) : (
                <div className="rounded-xl border overflow-hidden">
                    <Table dir="rtl">
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead className="text-right">الاسم</TableHead>
                                <TableHead className="text-right">البريد</TableHead>
                                <TableHead className="text-right">المؤسسة</TableHead>
                                <TableHead className="text-center w-[100px]">إجراء</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => {
                                const org = Array.isArray(row.organizations)
                                    ? (row.organizations as { name?: string }[])[0]
                                    : (row.organizations as { name?: string } | null);
                                const phone = parseWhatsAppFromDetails(row.details);
                                const orgName = org?.name ?? "المؤسسة";
                                return (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">{row.name}</TableCell>
                                        <TableCell className="font-mono text-xs" dir="ltr">
                                            {row.email}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {org?.name ??
                                                (row.organization_id ? "(غير متاح الاسم)" : "غير مربوط")}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title="نسخ البريد"
                                                    onClick={async () => {
                                                        const ok = await copyToClipboard(row.email);
                                                        toast({
                                                            description: ok ? "تم نسخ البريد." : "تعذّر النسخ.",
                                                            variant: ok ? "default" : "destructive",
                                                        });
                                                    }}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-[#25D366]"
                                                    title="تذكير واتساب (بدون كلمة مرور)"
                                                    onClick={() => {
                                                        const msg = buildOrgAdminLoginReminderMessage({
                                                            adminName: row.name,
                                                            orgName,
                                                            email: row.email,
                                                        });
                                                        openWhatsAppShare({ phone, message: msg });
                                                    }}
                                                >
                                                    <MessageCircle className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
