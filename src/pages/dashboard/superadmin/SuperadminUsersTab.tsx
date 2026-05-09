import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllUsers, useUpdateUser, useUser } from "@/hooks/useDatabase";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, ShieldAlert } from "lucide-react";

type RoleFilter = "ALL" | "STUDENT" | "TEACHER" | "ADMIN" | "SUPERADMIN";

function normalizeRole(r: string | null | undefined): string {
    return String(r || "").toUpperCase();
}

const SuperadminUsersTab = ({ organizations }: { organizations: { id: string; name: string }[] }) => {
    const { toast } = useToast();
    const { data: currentUser } = useUser();
    const { data: allUsers = [], isLoading } = useAllUsers();
    const updateUser = useUpdateUser();

    const [q, setQ] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
    const [orgFilter, setOrgFilter] = useState<string>("ALL");

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return (allUsers || []).filter((u: any) => {
            if (roleFilter !== "ALL" && normalizeRole(u.role) !== roleFilter) return false;
            if (orgFilter !== "ALL") {
                if (orgFilter === "__NONE__" && u.organization_id) return false;
                if (orgFilter !== "__NONE__" && u.organization_id !== orgFilter) return false;
            }
            if (!needle) return true;
            return (
                String(u.name || "").toLowerCase().includes(needle) ||
                String(u.email || "").toLowerCase().includes(needle)
            );
        });
    }, [allUsers, q, roleFilter, orgFilter]);

    return (
        <Card dir="rtl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    جميع مستخدمي المنصة
                </CardTitle>
                <CardDescription>
                    تعديل الدور، المؤسسة، وحالة التفعيل لأي حساب. كن حذرًا عند تغيير أدوار السوبر أدمن.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col xl:flex-row-reverse gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pr-10"
                            placeholder="بحث بالاسم أو البريد..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
                        <SelectTrigger className="w-full xl:w-[180px]">
                            <SelectValue placeholder="الدور" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">كل الأدوار</SelectItem>
                            <SelectItem value="STUDENT">طالب</SelectItem>
                            <SelectItem value="TEACHER">معلم</SelectItem>
                            <SelectItem value="ADMIN">أدمن مؤسسة</SelectItem>
                            <SelectItem value="SUPERADMIN">سوبر أدمن</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={orgFilter} onValueChange={setOrgFilter}>
                        <SelectTrigger className="w-full xl:w-[220px]">
                            <SelectValue placeholder="المؤسسة" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">كل المؤسسات</SelectItem>
                            <SelectItem value="__NONE__">بدون مؤسسة</SelectItem>
                            {organizations.map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                    {o.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {isLoading ? (
                    <Skeleton className="h-[420px] w-full rounded-xl" />
                ) : (
                    <ScrollArea className="h-[min(60vh,520px)] rounded-xl border" dir="rtl">
                        <div className="min-w-[720px] divide-y">
                            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/40 text-right" dir="rtl">
                                <span className="col-span-3">المستخدم</span>
                                <span className="col-span-2">الدور</span>
                                <span className="col-span-3">المؤسسة</span>
                                <span className="col-span-2">الحالة</span>
                                <span className="col-span-2 text-center">إجراءات</span>
                            </div>
                            {rows.length === 0 ? (
                                <p className="p-8 text-center text-sm text-muted-foreground">لا توجد نتائج.</p>
                            ) : (
                                rows.map((u: any) => {
                                    const isSelf = currentUser?.id === u.id;
                                    const r = normalizeRole(u.role);
                                    return (
                                        <div key={u.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm text-right" dir="rtl">
                                            <div className="col-span-3 min-w-0">
                                                <p className="font-medium truncate">{u.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono truncate" dir="ltr">
                                                    {u.email}
                                                </p>
                                            </div>
                                            <div className="col-span-2">
                                                <Select
                                                    value={r}
                                                    disabled={isSelf && r === "SUPERADMIN"}
                                                    onValueChange={async (next) => {
                                                        try {
                                                            await updateUser.mutateAsync({
                                                                userId: u.id,
                                                                updates: { role: next },
                                                            });
                                                            toast({ description: "تم تحديث الدور." });
                                                        } catch (e: any) {
                                                            toast({
                                                                variant: "destructive",
                                                                description: e?.message || "تعذّر تحديث الدور.",
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="STUDENT">طالب</SelectItem>
                                                        <SelectItem value="TEACHER">معلم</SelectItem>
                                                        <SelectItem value="ADMIN">أدمن مؤسسة</SelectItem>
                                                        <SelectItem value="SUPERADMIN">سوبر أدمن</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="col-span-3">
                                                <Select
                                                    value={u.organization_id ?? "__NONE__"}
                                                    onValueChange={async (oid) => {
                                                        const orgId = oid === "__NONE__" ? null : oid;
                                                        try {
                                                            await updateUser.mutateAsync({
                                                                userId: u.id,
                                                                updates: { organization_id: orgId },
                                                            });
                                                            toast({ description: "تم تحديث المؤسسة." });
                                                        } catch (e: any) {
                                                            toast({
                                                                variant: "destructive",
                                                                description: e?.message || "تعذّر ربط المؤسسة.",
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__NONE__">بدون مؤسسة</SelectItem>
                                                        {organizations.map((o) => (
                                                            <SelectItem key={o.id} value={o.id}>
                                                                {o.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="col-span-2 flex flex-wrap gap-1 items-center">
                                                <Badge variant={u.is_active === false ? "destructive" : "default"}>
                                                    {u.is_active === false ? "موقوف" : "نشط"}
                                                </Badge>
                                                {u.verified && (
                                                    <Badge variant="outline" className="text-[10px]">
                                                        موثّق
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="col-span-2 flex justify-center">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={isSelf}
                                                    onClick={async () => {
                                                        try {
                                                            await updateUser.mutateAsync({
                                                                userId: u.id,
                                                                updates: { is_active: u.is_active === false },
                                                            });
                                                            toast({
                                                                description:
                                                                    u.is_active === false ? "تم تفعيل الحساب." : "تم تعطيل الحساب.",
                                                            });
                                                        } catch (e: any) {
                                                            toast({
                                                                variant: "destructive",
                                                                description: e?.message || "فشل التحديث.",
                                                            });
                                                        }
                                                    }}
                                                >
                                                    {u.is_active === false ? "تفعيل" : "تعطيل"}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>
                )}

                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <p>
                        تغيير الدور قد يتطلب ملفات تعريف إضافية (معلم/طالب) يدويًا في قاعدة البيانات إن كان الحساب قديمًا.
                        لا يمكنك تعطيل حسابك الحالي من هنا.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default SuperadminUsersTab;
