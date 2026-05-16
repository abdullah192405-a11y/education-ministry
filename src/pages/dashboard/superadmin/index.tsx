import { useMemo, useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    LayoutDashboard,
    Building2,
    Crown,
    LogOut,
    Package,
    Users,
    UserCheck,
    Layers,
    Bell,
    Settings,
    CheckCircle,
    School,
    Library,
    Pencil,
    Trash2,
    Plus,
    BookOpen,
    GraduationCap,
    Target,
    Gamepad2,
    BarChart3,
    Activity,
    FileText,
    ExternalLink,
    LifeBuoy,
    Edit,
    MessageCircle,
    Copy,
} from "lucide-react";
import {
    useUser,
    useOrganizations,
    useOrgAdminUsers,
    useAllUsers,
    useUpsertOrganization,
    useDeleteOrganization,
    useUpdateOrgAdmin,
    useDeleteOrgAdmin,
    useAdminStats,
    useRecentAuditLogs,
    usePendingAdminRegistrationRequestsForSuperadmin,
    useReviewRegistrationRequest,
} from "@/hooks/useDatabase";
import SettingsTab from "../admin/components/SettingsTab";
import AdminSupportTab from "../admin/components/AdminSupportTab";
import SuperadminUsersTab from "./SuperadminUsersTab";
import { SuperadminPlansTab } from "./SuperadminPlansTab";
import { OrgImageField } from "./OrgImageField";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import CreateOrgAdminSection from "./CreateOrgAdminSection";
import { SuperadminNav, type SuperadminTabId } from "./SuperadminNav";
import { SuperadminMobileTabs } from "./SuperadminMobileTabs";
import { SuperadminTabHeader } from "./SuperadminTabHeader";
import { SuperadminQuickActions } from "./SuperadminQuickActions";
import { PendingRequestsBanner } from "./PendingRequestsBanner";
import { PendingRequestsPanel } from "./PendingRequestsPanel";
import { useSuperadminTab } from "./useSuperadminTab";
import { SUPERADMIN_TAB_META } from "./superadminTabMeta";
import {
    buildOrgAdminLoginReminderMessage,
    copyToClipboard,
    openWhatsAppShare,
    parseWhatsAppFromDetails,
} from "@/lib/accountOnboarding";

const auditActionMeta: Record<string, { icon: LucideIcon; color: string }> = {
    CREATE: { icon: Plus, color: "text-emerald-600" },
    UPDATE: { icon: Edit, color: "text-blue-600" },
    DELETE: { icon: Trash2, color: "text-destructive" },
    LOGIN: { icon: UserCheck, color: "text-primary" },
    default: { icon: Activity, color: "text-muted-foreground" },
};

type OrgKind = "EDUCATIONAL" | "ENRICHMENT" | "BOTH";
type OrgPlan = "INSTITUTION_ADMIN_STUDENT" | "INSTITUTION_FULL";
type OrgEdit = {
    id: string;
    name: string;
    slug: string;
    kind: OrgKind;
    subscription_package: OrgPlan;
    is_active: boolean;
    entity_type?: "SCHOOL" | "ORG";
    image_url?: string | null;
    description?: string | null;
};

function slugifyAscii(input: string): string {
    const s = input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return s.length ? s.slice(0, 64) : "";
}

const SuperadminDashboard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { signOut: clerkSignOut } = useAuth();
    const { data: user, isLoading } = useUser();
    const { data: organizations = [], isLoading: isLoadingOrgs } = useOrganizations({ includeInactive: true });
    const { data: orgAdmins = [], isLoading: isLoadingAdmins } = useOrgAdminUsers();
    const { data: allUsers = [], isLoading: isLoadingUsers } = useAllUsers();
    const { data: platformStats, isLoading: isLoadingPlatformStats } = useAdminStats();
    const { data: auditLogs = [], isLoading: isLoadingAudit } = useRecentAuditLogs(10);
    const upsertOrganization = useUpsertOrganization();
    const deleteOrganization = useDeleteOrganization();
    const updateOrgAdmin = useUpdateOrgAdmin();
    const deleteOrgAdmin = useDeleteOrgAdmin();
    const { data: pendingAdminRequests = [], isLoading: isLoadingPendingAdminRequests } = usePendingAdminRegistrationRequestsForSuperadmin();
    const reviewRegistrationRequest = useReviewRegistrationRequest();

    const { activeTab, setActiveTab } = useSuperadminTab();
    const [orgSearch, setOrgSearch] = useState("");
    const [adminSearch, setAdminSearch] = useState("");
    const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null);
    const [deleteAdminId, setDeleteAdminId] = useState<string | null>(null);

    const [editingOrg, setEditingOrg] = useState<OrgEdit | null>(null);

    useEffect(() => {
        if (!isLoading && user?.role) {
            const r = user.role.toUpperCase();
            if (r === "STUDENT" || r === "طالب") navigate("/dashboard/student", { replace: true });
            else if (r === "TEACHER" || r === "معلم" || r === "معلمة") navigate("/dashboard/teacher", { replace: true });
            else if (r === "ADMIN" || r === "مسؤول") navigate("/dashboard/admin", { replace: true });
        }
    }, [user, isLoading, navigate]);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            await clerkSignOut();
            localStorage.removeItem("edu_user");
            queryClient.clear();
            navigate("/");
        } catch {
            navigate("/");
        }
    };

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">جاري التحميل…</p>
            </div>
        );
    }

    if (user.role?.toUpperCase() !== "SUPERADMIN") {
        return null;
    }

    const educationalOrgs = organizations.filter((o: any) => o.kind === "EDUCATIONAL" || o.kind === "BOTH");
    const enrichmentOrgs = organizations.filter((o: any) => o.kind === "ENRICHMENT" || o.kind === "BOTH");
    const activeOrgs = organizations.filter((o: any) => o.is_active !== false);
    const planAdminStudent = organizations.filter((o: any) => o.subscription_package === "INSTITUTION_ADMIN_STUDENT");
    const planFull = organizations.filter((o: any) => o.subscription_package === "INSTITUTION_FULL");
    const tenantUsers = useMemo(
        () => (allUsers || []).filter((u: any) => !!u.organization_id),
        [allUsers],
    );

    const dashboardStats = {
        orgs: organizations.length,
        activeOrgs: activeOrgs.length,
        admins: orgAdmins.length,
        usersInTenants: tenantUsers.length,
    };

    const isDataLoading = isLoadingOrgs || isLoadingAdmins || isLoadingUsers || isLoadingPlatformStats;

    const recentActivities = (auditLogs || []).map((log: any) => {
        const meta = auditActionMeta[log.action] || auditActionMeta.default;
        return {
            type: log.action,
            message: log.details || `${log.action} على ${log.entity_type || "كيان"}`,
            time: log.created_at ? new Date(log.created_at).toLocaleString("ar-SA") : "",
            icon: meta.icon,
            color: meta.color,
            user: log.user?.name || "",
        };
    });
    const busy = upsertOrganization.isPending || deleteOrganization.isPending || updateOrgAdmin.isPending || deleteOrgAdmin.isPending;

    const filteredOrganizations = organizations.filter((o: any) => {
        const q = orgSearch.trim().toLowerCase();
        if (!q) return true;
        return String(o.name || "").toLowerCase().includes(q) || String(o.slug || "").toLowerCase().includes(q);
    });

    const filteredOrgAdmins = orgAdmins.filter((a: any) => {
        const q = adminSearch.trim().toLowerCase();
        if (!q) return true;
        const org = Array.isArray(a.organizations) ? a.organizations[0] : a.organizations;
        return (
            String(a.name || "").toLowerCase().includes(q) ||
            String(a.email || "").toLowerCase().includes(q) ||
            String(org?.name || "").toLowerCase().includes(q)
        );
    });

    const handleReviewRequest = async (requestId: string, decision: "APPROVED" | "REJECTED") => {
        await reviewRegistrationRequest.mutateAsync({
            requestId,
            reviewerUserId: user.id,
            decision,
        });
        toast({
            description: decision === "APPROVED" ? "تم تأكيد الاشتراك وتفعيل المؤسسة." : "تم رفض الطلب.",
        });
    };

    const handleSaveEditOrganization = async () => {
        if (!editingOrg) return;
        try {
            await upsertOrganization.mutateAsync(editingOrg);
            toast({ description: "تم تحديث المؤسسة." });
            setEditingOrg(null);
        } catch (error: any) {
            toast({ variant: "destructive", description: error?.message || "فشل تحديث المؤسسة." });
        }
    };

    const handleDeleteOrganization = async () => {
        if (!deleteOrgId) return;
        try {
            await deleteOrganization.mutateAsync(deleteOrgId);
            toast({ description: "تم حذف المؤسسة." });
            setDeleteOrgId(null);
        } catch (error: any) {
            toast({ variant: "destructive", description: error?.message || "تعذّر حذف المؤسسة." });
        }
    };

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="container mx-auto px-4">
                    <div className="h-16 md:h-20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/" className="flex items-center gap-3">
                                <img src="/logo.png" alt="Lab4" className="w-10 h-10 rounded-xl object-contain bg-background" />
                                <span className="text-xl font-bold hidden md:block">Lab4</span>
                            </Link>
                            <div className="h-8 w-px bg-border" />
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                    <Crown className="w-5 h-5 text-white" />
                                </div>
                                <div className="hidden md:block">
                                    <span className="font-medium text-sm">لوحة السوبر أدمن</span>
                                    <p className="text-xs text-muted-foreground">
                                        تحكم كامل في المنصة: المستخدمون، المؤسسات، المحتوى، الإعدادات، والدعم
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative"
                                title={
                                    pendingAdminRequests.length > 0
                                        ? "طلبات اشتراك معلّقة"
                                        : "تذاكر الدعم"
                                }
                                onClick={() =>
                                    setActiveTab(pendingAdminRequests.length > 0 ? "admins" : "support")
                                }
                            >
                                <Bell className="w-5 h-5" />
                                {pendingAdminRequests.length > 0 && (
                                    <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                                        {pendingAdminRequests.length > 9 ? "9+" : pendingAdminRequests.length}
                                    </span>
                                )}
                            </Button>
                            <div className="hidden sm:flex items-center gap-2 rounded-xl border px-3 py-1.5 bg-card/40">
                                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                                    <Crown className="w-4 h-4 text-primary" />
                                </div>
                                <div className="leading-tight">
                                    <p className="text-sm font-medium">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">SUPERADMIN</p>
                                </div>
                            </div>
                            <Button variant="outline" onClick={handleLogout} className="gap-2">
                                <LogOut className="h-4 w-4" />
                                تسجيل الخروج
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <SuperadminMobileTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                pendingRequestsCount={pendingAdminRequests.length}
            />

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="hidden lg:block lg:col-span-1"
                    >
                        <Card className="sticky top-24 overflow-hidden">
                            <SuperadminNav
                                userName={user.name}
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                                pendingRequestsCount={pendingAdminRequests.length}
                            />
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-4 space-y-6"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <PendingRequestsBanner
                                    count={pendingAdminRequests.length}
                                    currentTab={activeTab}
                                    onGoToAdmins={() => setActiveTab("admins")}
                                />

                                {activeTab === "overview" && (
                                    <>
                                        <Card className="overflow-hidden border-primary/20">
                                            <div className="relative p-6 md:p-8 bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700">
                                                <div className="relative z-10 space-y-3 max-w-3xl">
                                                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                                                        مركز تحكم مالك المنصة
                                                    </h1>
                                                    <p className="text-white/85 text-sm md:text-base leading-relaxed">
                                                        من هنا تدير المؤسسات والباقات، المستخدمين على مستوى المنصة، صلاحيات أدمن
                                                        المؤسسات، إعدادات المنصة، وتذاكر الدعم. استخدم الاختصارات أدناه أو القائمة الجانبية.
                                                    </p>
                                                    <div className="pt-1">
                                                        <Button asChild size="sm" variant="outline" className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20">
                                                            <Link to="/grades" target="_blank" rel="noreferrer">
                                                                <ExternalLink className="w-4 h-4" />
                                                                عرض الموقع العام
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="absolute left-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                                            </div>
                                        </Card>

                                        <SuperadminQuickActions
                                            pendingCount={pendingAdminRequests.length}
                                            onNavigate={setActiveTab}
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                            {[
                                                { label: "إجمالي المؤسسات", value: dashboardStats.orgs, icon: Building2, tone: "text-blue-600 bg-blue-100" },
                                                { label: "المؤسسات النشطة", value: dashboardStats.activeOrgs, icon: CheckCircle, tone: "text-emerald-600 bg-emerald-100" },
                                                { label: "أدمن المؤسسات", value: dashboardStats.admins, icon: UserCheck, tone: "text-violet-600 bg-violet-100" },
                                                { label: "مستخدمو المؤسسات", value: dashboardStats.usersInTenants, icon: Users, tone: "text-orange-600 bg-orange-100" },
                                            ].map((kpi) => (
                                                <Card key={kpi.label}>
                                                    <CardContent className="p-4 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">{kpi.label}</p>
                                                            <p className="text-2xl font-bold">
                                                                {isDataLoading ? <Skeleton className="h-8 w-14" /> : kpi.value.toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className={`p-3 rounded-full ${kpi.tone}`}>
                                                            <kpi.icon className="w-5 h-5" />
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { label: "صفوف", value: platformStats?.totalGrades ?? 0, icon: School },
                                                { label: "مواد", value: platformStats?.totalSubjects ?? 0, icon: BookOpen },
                                                { label: "دروس", value: platformStats?.totalTopics ?? 0, icon: Target },
                                                { label: "تحديات", value: platformStats?.totalChallenges ?? 0, icon: Gamepad2 },
                                            ].map((kpi) => (
                                                <Card key={kpi.label} className="p-4 border-dashed">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                                                            {isLoadingPlatformStats ? <Skeleton className="h-7 w-12" /> : (
                                                                <p className="text-xl font-bold">{Number(kpi.value).toLocaleString()}</p>
                                                            )}
                                                        </div>
                                                        <kpi.icon className="w-8 h-8 text-primary/40" />
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {[
                                                { label: "طلاب (المنصة)", value: platformStats?.totalStudents ?? 0, icon: GraduationCap },
                                                { label: "معلمون", value: platformStats?.totalTeachers ?? 0, icon: UserCheck },
                                                { label: "مستخدمون", value: platformStats?.totalUsers ?? 0, icon: BarChart3 },
                                            ].map((kpi) => (
                                                <Card key={kpi.label} className="p-4">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                                                            {isLoadingPlatformStats ? (
                                                                <Skeleton className="h-7 w-12" />
                                                            ) : (
                                                                <p className="text-xl font-bold">{Number(kpi.value).toLocaleString()}</p>
                                                            )}
                                                        </div>
                                                        <kpi.icon className="w-8 h-8 text-muted-foreground/50" />
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        <Library className="h-4 w-4" />
                                                        توزيع نوع المؤسسات
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm">تعليمية</span>
                                                        <span className="text-sm font-semibold">{educationalOrgs.length}</span>
                                                    </div>
                                                    <Progress value={organizations.length ? (educationalOrgs.length / organizations.length) * 100 : 0} />

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm">اثرائية</span>
                                                        <span className="text-sm font-semibold">{enrichmentOrgs.length}</span>
                                                    </div>
                                                    <Progress value={organizations.length ? (enrichmentOrgs.length / organizations.length) * 100 : 0} />
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        <Layers className="h-4 w-4" />
                                                        توزيع الباقات
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="rounded-lg border p-3 flex items-center justify-between">
                                                        <span className="text-sm">أدمن + طالب</span>
                                                        <Badge variant="secondary">{planAdminStudent.length}</Badge>
                                                    </div>
                                                    <div className="rounded-lg border p-3 flex items-center justify-between">
                                                        <span className="text-sm">أدمن + معلم + طالب</span>
                                                        <Badge>{planFull.length}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        يمكن تعديل باقة أي مؤسسة من تبويب «المؤسسات».
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <FileText className="h-4 w-4" />
                                                    آخر نشاط على المنصة
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {isLoadingAudit ? (
                                                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
                                                ) : recentActivities.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground text-center py-6">لا يوجد سجل نشاط حديث.</p>
                                                ) : (
                                                    recentActivities.slice(0, 8).map((act, idx) => {
                                                        const Icon = act.icon;
                                                        return (
                                                            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                                                                <div className={`mt-0.5 ${act.color}`}>
                                                                    <Icon className="w-4 h-4" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium leading-snug">{act.message}</p>
                                                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                                        <span>{act.time}</span>
                                                                        {act.user && <Badge variant="outline" className="text-[10px]">{act.user}</Badge>}
                                                                        <Badge variant="secondary" className="text-[10px]">{act.type}</Badge>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </CardContent>
                                        </Card>
                                    </>
                                )}

                                {activeTab === "users" && (
                                    <SuperadminUsersTab organizations={organizations.map((o: any) => ({ id: o.id, name: o.name }))} />
                                )}

                                {activeTab === "support" && <AdminSupportTab />}

                                {activeTab === "settings" && (
                                    <div dir="rtl" className="text-right">
                                        <SettingsTab />
                                    </div>
                                )}

                                {activeTab === "orgs" && (
                                    <>
                                        <SuperadminTabHeader
                                            title={SUPERADMIN_TAB_META.orgs.title}
                                            description={SUPERADMIN_TAB_META.orgs.description}
                                        />
                                    <Card>
                                        <CardContent className="space-y-3 pt-6">
                                            <Input
                                                value={orgSearch}
                                                onChange={(e) => setOrgSearch(e.target.value)}
                                                placeholder="بحث بالاسم أو slug..."
                                            />
                                            {isLoadingOrgs ? (
                                                <Skeleton className="h-44 w-full" />
                                            ) : filteredOrganizations.length === 0 ? (
                                                <p className="text-sm text-muted-foreground py-8 text-center">لا توجد مؤسسات بعد.</p>
                                            ) : (
                                                filteredOrganizations.map((org: any) => (
                                                    <div key={org.id} className="rounded-xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                        <div>
                                                            <p className="font-semibold">{org.name}</p>
                                                            <p className="text-xs text-muted-foreground font-mono">{org.slug}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge variant={org.kind === "ENRICHMENT" ? "secondary" : "default"}>
                                                                {org.kind === "EDUCATIONAL"
                                                                    ? "تعليمية"
                                                                    : org.kind === "ENRICHMENT"
                                                                        ? "اثرائية"
                                                                        : "تعليمية اثرائية"}
                                                            </Badge>
                                                            <Select
                                                                value={org.subscription_package}
                                                                onValueChange={async (v: OrgPlan) => {
                                                                    try {
                                                                        await upsertOrganization.mutateAsync({
                                                                            id: org.id,
                                                                            name: org.name,
                                                                            slug: org.slug,
                                                                            kind: org.kind,
                                                                            subscription_package: v,
                                                                            is_active: org.is_active !== false,
                                                                            entity_type: org.entity_type ?? "SCHOOL",
                                                                            image_url: org.image_url ?? null,
                                                                            description: org.description ?? null,
                                                                        });
                                                                        toast({ description: "تم تحديث الباقة." });
                                                                    } catch (error: any) {
                                                                        toast({ variant: "destructive", description: error?.message || "تعذّر تحديث الباقة." });
                                                                    }
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-8 w-[170px]">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="INSTITUTION_ADMIN_STUDENT">أدمن + طالب</SelectItem>
                                                                    <SelectItem value="INSTITUTION_FULL">أدمن + معلم + طالب</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <Badge variant={org.is_active === false ? "destructive" : "default"}>
                                                                {org.is_active === false ? "غير نشطة" : "نشطة"}
                                                            </Badge>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    setEditingOrg({
                                                                        id: org.id,
                                                                        name: org.name,
                                                                        slug: org.slug,
                                                                        kind: org.kind,
                                                                        subscription_package: org.subscription_package,
                                                                        is_active: org.is_active !== false,
                                                                        entity_type: org.entity_type ?? "SCHOOL",
                                                                        image_url: org.image_url ?? "",
                                                                        description: org.description ?? "",
                                                                    })
                                                                }
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={async () => {
                                                                    try {
                                                                        await upsertOrganization.mutateAsync({
                                                                            id: org.id,
                                                                            name: org.name,
                                                                            slug: org.slug,
                                                                            kind: org.kind,
                                                                            subscription_package: org.subscription_package,
                                                                            is_active: org.is_active === false,
                                                                            entity_type: org.entity_type ?? "SCHOOL",
                                                                            image_url: org.image_url ?? null,
                                                                            description: org.description ?? null,
                                                                        });
                                                                        toast({ description: org.is_active === false ? "تم تفعيل المؤسسة." : "تم تعطيل المؤسسة." });
                                                                    } catch (error: any) {
                                                                        toast({ variant: "destructive", description: error?.message || "فشل تحديث الحالة." });
                                                                    }
                                                                }}
                                                            >
                                                                {org.is_active === false ? "تفعيل" : "تعطيل"}
                                                            </Button>
                                                            <Button size="sm" variant="destructive" onClick={() => setDeleteOrgId(org.id)}>
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </CardContent>
                                    </Card>
                                    </>
                                )}

                                {activeTab === "admins" && (
                                    <>
                                        <SuperadminTabHeader
                                            title={SUPERADMIN_TAB_META.admins.title}
                                            description={SUPERADMIN_TAB_META.admins.description}
                                        />
                                    <Card>
                                        <CardContent className="space-y-3 pt-6">
                                            <PendingRequestsPanel
                                                requests={pendingAdminRequests}
                                                isLoading={isLoadingPendingAdminRequests}
                                                isReviewing={reviewRegistrationRequest.isPending}
                                                onApprove={(id) => handleReviewRequest(id, "APPROVED")}
                                                onReject={(id) => void handleReviewRequest(id, "REJECTED")}
                                            />
                                            <Input
                                                value={adminSearch}
                                                onChange={(e) => setAdminSearch(e.target.value)}
                                                placeholder="بحث باسم الأدمن أو البريد أو المؤسسة..."
                                            />
                                            {isLoadingAdmins ? (
                                                <Skeleton className="h-44 w-full" />
                                            ) : filteredOrgAdmins.length === 0 ? (
                                                <p className="text-sm text-muted-foreground py-8 text-center">لا يوجد أدمن مؤسسات بعد.</p>
                                            ) : (
                                                filteredOrgAdmins.map((a: any) => {
                                                    const org = Array.isArray(a.organizations) ? a.organizations[0] : a.organizations;
                                                    const phone = parseWhatsAppFromDetails(a.details);
                                                    const orgName = org?.name ?? "المؤسسة";
                                                    return (
                                                        <div key={a.id} className="rounded-xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                            <div>
                                                                <p className="font-semibold">{a.name}</p>
                                                                <p className="text-xs text-muted-foreground font-mono">{a.email}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <Select
                                                                    value={a.organization_id || "__NONE__"}
                                                                    onValueChange={async (orgId) => {
                                                                        try {
                                                                            await updateOrgAdmin.mutateAsync({
                                                                                id: a.id,
                                                                                organization_id: orgId === "__NONE__" ? null : orgId,
                                                                            });
                                                                            toast({ description: "تم تحديث مؤسسة الأدمن." });
                                                                        } catch (error: any) {
                                                                            toast({ variant: "destructive", description: error?.message || "تعذّر تحديث المؤسسة." });
                                                                        }
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="h-8 w-[190px]">
                                                                        <SelectValue placeholder="اختيار مؤسسة" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="__NONE__">بدون مؤسسة</SelectItem>
                                                                        {organizations.map((o: any) => (
                                                                            <SelectItem key={o.id} value={o.id}>
                                                                                {o.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <Badge variant="outline">{org?.name ?? "غير مربوط بمؤسسة"}</Badge>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    title="نسخ البريد"
                                                                    onClick={async () => {
                                                                        const ok = await copyToClipboard(a.email);
                                                                        toast({
                                                                            description: ok ? "تم نسخ البريد." : "تعذّر النسخ.",
                                                                            variant: ok ? "default" : "destructive",
                                                                        });
                                                                    }}
                                                                >
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-[#25D366]"
                                                                    title="تذكير واتساب"
                                                                    onClick={() => {
                                                                        const msg = buildOrgAdminLoginReminderMessage({
                                                                            adminName: a.name,
                                                                            orgName,
                                                                            email: a.email,
                                                                        });
                                                                        openWhatsAppShare({ phone, message: msg });
                                                                    }}
                                                                >
                                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={async () => {
                                                                        try {
                                                                            await updateOrgAdmin.mutateAsync({
                                                                                id: a.id,
                                                                                is_active: a.is_active === false,
                                                                            });
                                                                            toast({ description: a.is_active === false ? "تم تفعيل الأدمن." : "تم تعطيل الأدمن." });
                                                                        } catch (error: any) {
                                                                            toast({ variant: "destructive", description: error?.message || "فشل تحديث حالة الأدمن." });
                                                                        }
                                                                    }}
                                                                >
                                                                    {a.is_active === false ? "تفعيل" : "تعطيل"}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => setDeleteAdminId(a.id)}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </CardContent>
                                    </Card>
                                    </>
                                )}

                                {activeTab === "plans" && (
                                    <>
                                        <SuperadminTabHeader
                                            title={SUPERADMIN_TAB_META.plans.title}
                                            description={SUPERADMIN_TAB_META.plans.description}
                                        />
                                        <SuperadminPlansTab />
                                    </>
                                )}

                                {activeTab === "create" && <CreateOrgAdminSection />}

                                                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>

            <Dialog open={!!editingOrg} onOpenChange={(open) => !open && setEditingOrg(null)}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle>تعديل المؤسسة</DialogTitle>
                    </DialogHeader>
                    {editingOrg && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>الاسم</Label>
                                <Input
                                    value={editingOrg.name}
                                    onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>slug</Label>
                                <Input
                                    value={editingOrg.slug}
                                    dir="ltr"
                                    onChange={(e) => setEditingOrg({ ...editingOrg, slug: slugifyAscii(e.target.value) })}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Select value={editingOrg.kind} onValueChange={(v: OrgKind) => setEditingOrg({ ...editingOrg, kind: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BOTH">تعليمية اثرائية</SelectItem>
                                        <SelectItem value="EDUCATIONAL">تعليمية</SelectItem>
                                        <SelectItem value="ENRICHMENT">اثرائية</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={editingOrg.subscription_package}
                                    onValueChange={(v: OrgPlan) => setEditingOrg({ ...editingOrg, subscription_package: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INSTITUTION_ADMIN_STUDENT">أدمن + طالب</SelectItem>
                                        <SelectItem value="INSTITUTION_FULL">أدمن + معلم + طالب</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Select
                                    value={editingOrg.entity_type ?? "SCHOOL"}
                                    onValueChange={(v: "SCHOOL" | "ORG") => setEditingOrg({ ...editingOrg, entity_type: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SCHOOL">مدرسة</SelectItem>
                                        <SelectItem value="ORG">مؤسسة</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <OrgImageField
                                value={editingOrg.image_url ?? ""}
                                onChange={(url) => setEditingOrg({ ...editingOrg, image_url: url })}
                                previewRounded="full"
                            />
                            <div className="space-y-2">
                                <Label>الوصف</Label>
                                <Input
                                    value={editingOrg.description ?? ""}
                                    onChange={(e) => setEditingOrg({ ...editingOrg, description: e.target.value })}
                                    placeholder="نبذة قصيرة تظهر في صفحة الجهة"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingOrg(null)}>إلغاء</Button>
                        <Button onClick={handleSaveEditOrganization} disabled={busy}>حفظ</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteOrgId} onOpenChange={(open) => !open && setDeleteOrgId(null)}>
                <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>حذف المؤسسة؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            سيؤدي هذا إلى حذف المؤسسة من المنصة. لا يمكن التراجع عن العملية.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteOrganization} className="bg-destructive hover:bg-destructive/90">
                            حذف المؤسسة
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!deleteAdminId} onOpenChange={(open) => !open && setDeleteAdminId(null)}>
                <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>حذف حساب الأدمن؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            سيُحذف حساب مدير المؤسسة نهائيًا.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (!deleteAdminId) return;
                                try {
                                    await deleteOrgAdmin.mutateAsync(deleteAdminId);
                                    toast({ description: "تم حذف حساب الأدمن." });
                                    setDeleteAdminId(null);
                                } catch (error: any) {
                                    toast({ variant: "destructive", description: error?.message || "تعذّر حذف الأدمن." });
                                }
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            حذف الحساب
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default SuperadminDashboard;
