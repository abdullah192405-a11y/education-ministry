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
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type RoleFilter = "ALL" | "STUDENT" | "TEACHER" | "ADMIN" | "SUPERADMIN";

function normalizeRole(r: string | null | undefined): string {
    return String(r || "").toUpperCase();
}

const SuperadminUsersTab = ({ organizations }: { organizations: { id: string; name: string }[] }) => {
    const { toast } = useToast();
    const { t, dir, isRtl, textAlign } = useDashboardLocale();
    const { data: currentUser } = useUser();
    const { data: allUsers = [], isLoading } = useAllUsers();
    const updateUser = useUpdateUser();

    const [q, setQ] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
    const [orgFilter, setOrgFilter] = useState<string>("ALL");

    const searchIconClass = isRtl ? "right-3" : "left-3";
    const searchInputClass = isRtl ? "pr-10" : "pl-10";

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

    const roleLabels: Record<string, string> = {
        STUDENT: t("dash.super.usersTab.roleStudent"),
        TEACHER: t("dash.super.usersTab.roleTeacher"),
        ADMIN: t("dash.super.usersTab.roleAdmin"),
        SUPERADMIN: t("dash.super.usersTab.roleSuperadmin"),
    };

    return (
        <Card dir={dir}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t("dash.super.usersTab.title")}
                </CardTitle>
                <CardDescription>{t("dash.super.usersTab.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className={cn("flex flex-col xl:flex-row gap-3 flex-wrap", isRtl && "xl:flex-row-reverse")}>
                    <div className="relative flex-1 min-w-[200px]">
                        <Search
                            className={cn(
                                "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
                                searchIconClass,
                            )}
                        />
                        <Input
                            className={searchInputClass}
                            placeholder={t("dash.super.usersTab.search")}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
                        <SelectTrigger className="w-full xl:w-[180px]">
                            <SelectValue placeholder={t("dash.super.usersTab.rolePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{t("dash.super.usersTab.allRoles")}</SelectItem>
                            <SelectItem value="STUDENT">{t("dash.super.usersTab.roleStudent")}</SelectItem>
                            <SelectItem value="TEACHER">{t("dash.super.usersTab.roleTeacher")}</SelectItem>
                            <SelectItem value="ADMIN">{t("dash.super.usersTab.roleAdmin")}</SelectItem>
                            <SelectItem value="SUPERADMIN">{t("dash.super.usersTab.roleSuperadmin")}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={orgFilter} onValueChange={setOrgFilter}>
                        <SelectTrigger className="w-full xl:w-[220px]">
                            <SelectValue placeholder={t("dash.super.usersTab.orgPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{t("dash.super.usersTab.allOrgs")}</SelectItem>
                            <SelectItem value="__NONE__">{t("dash.super.admins.noOrg")}</SelectItem>
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
                    <ScrollArea className="h-[min(60vh,520px)] rounded-xl border" dir={dir}>
                        <div className="min-w-[720px] divide-y">
                            <div
                                className={cn(
                                    "grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/40",
                                    textAlign,
                                )}
                            >
                                <span className="col-span-3">{t("dash.super.usersTab.colUser")}</span>
                                <span className="col-span-2">{t("dash.super.usersTab.colRole")}</span>
                                <span className="col-span-3">{t("dash.super.usersTab.colOrg")}</span>
                                <span className="col-span-2">{t("dash.super.usersTab.colStatus")}</span>
                                <span className="col-span-2 text-center">{t("dash.super.usersTab.colActions")}</span>
                            </div>
                            {rows.length === 0 ? (
                                <p className="p-8 text-center text-sm text-muted-foreground">
                                    {t("dash.super.usersTab.noResults")}
                                </p>
                            ) : (
                                rows.map((u: any) => {
                                    const isSelf = currentUser?.id === u.id;
                                    const r = normalizeRole(u.role);
                                    return (
                                        <div
                                            key={u.id}
                                            className={cn(
                                                "grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm",
                                                textAlign,
                                            )}
                                        >
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
                                                            toast({ description: t("dash.super.usersTab.toast.roleUpdated") });
                                                        } catch (e: any) {
                                                            toast({
                                                                variant: "destructive",
                                                                description: e?.message || t("dash.super.usersTab.toast.roleFail"),
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="STUDENT">{roleLabels.STUDENT}</SelectItem>
                                                        <SelectItem value="TEACHER">{roleLabels.TEACHER}</SelectItem>
                                                        <SelectItem value="ADMIN">{roleLabels.ADMIN}</SelectItem>
                                                        <SelectItem value="SUPERADMIN">{roleLabels.SUPERADMIN}</SelectItem>
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
                                                            toast({ description: t("dash.super.usersTab.toast.orgUpdated") });
                                                        } catch (e: any) {
                                                            toast({
                                                                variant: "destructive",
                                                                description: e?.message || t("dash.super.usersTab.toast.orgFail"),
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__NONE__">{t("dash.super.admins.noOrg")}</SelectItem>
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
                                                    {u.is_active === false
                                                        ? t("dash.super.usersTab.suspended")
                                                        : t("dash.super.usersTab.active")}
                                                </Badge>
                                                {u.verified && (
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {t("dash.super.usersTab.verified")}
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
                                                                    u.is_active === false
                                                                        ? t("dash.super.usersTab.toast.accountActivated")
                                                                        : t("dash.super.usersTab.toast.accountDeactivated"),
                                                            });
                                                        } catch (e: any) {
                                                            toast({
                                                                variant: "destructive",
                                                                description: e?.message || t("dash.super.usersTab.toast.accountFail"),
                                                            });
                                                        }
                                                    }}
                                                >
                                                    {u.is_active === false
                                                        ? t("dash.super.usersTab.activate")
                                                        : t("dash.super.usersTab.deactivate")}
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
                    <p>{t("dash.super.usersTab.warning")}</p>
                </div>
            </CardContent>
        </Card>
    );
};

export default SuperadminUsersTab;
