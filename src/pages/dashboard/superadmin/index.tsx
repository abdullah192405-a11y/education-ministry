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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
    Sparkles,
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
    useOrganizationSubscriptions,
    useUpsertOrganizationSubscription,
    usePendingAdminRegistrationRequestsForSuperadmin,
    useReviewRegistrationRequest,
} from "@/hooks/useDatabase";
import SettingsTab from "../admin/components/SettingsTab";
import AdminSupportTab from "../admin/components/AdminSupportTab";
import SuperadminUsersTab from "./SuperadminUsersTab";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import CreateOrgAdminSection from "./CreateOrgAdminSection";

const auditActionMeta: Record<string, { icon: LucideIcon; color: string }> = {
    CREATE: { icon: Plus, color: "text-emerald-600" },
    UPDATE: { icon: Edit, color: "text-blue-600" },
    DELETE: { icon: Trash2, color: "text-destructive" },
    LOGIN: { icon: UserCheck, color: "text-primary" },
    default: { icon: Activity, color: "text-muted-foreground" },
};

type SuperadminTabId =
    | "overview"
    | "users"
    | "orgs"
    | "admins"
    | "create"
    | "support"
    | "settings"
    | "plans";

type OrgKind = "EDUCATIONAL" | "ENRICHMENT" | "BOTH";
type OrgPlan = "INSTITUTION_ADMIN_STUDENT" | "INSTITUTION_FULL";
type SubscriptionStatus = "ACTIVE" | "TRIAL" | "PAST_DUE" | "CANCELED";
type BillingCycle = "MONTHLY" | "YEARLY";
const subscriptionStatusMeta: Record<SubscriptionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    ACTIVE: { label: "نشطة", variant: "default" },
    TRIAL: { label: "تجريبية", variant: "secondary" },
    PAST_DUE: { label: "متأخرة", variant: "destructive" },
    CANCELED: { label: "ملغاة", variant: "outline" },
};

function getOrgKindLabel(kind: OrgKind): string {
    if (kind === "EDUCATIONAL") return "تعليمية";
    if (kind === "ENRICHMENT") return "إثرائية";
    return "تعليمية + إثرائية";
}
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
    const { data: subscriptions = [], isLoading: isLoadingSubscriptions } = useOrganizationSubscriptions();
    const upsertOrganization = useUpsertOrganization();
    const upsertSubscription = useUpsertOrganizationSubscription();
    const deleteOrganization = useDeleteOrganization();
    const updateOrgAdmin = useUpdateOrgAdmin();
    const deleteOrgAdmin = useDeleteOrgAdmin();
    const { data: pendingAdminRequests = [], isLoading: isLoadingPendingAdminRequests } = usePendingAdminRegistrationRequestsForSuperadmin();
    const reviewRegistrationRequest = useReviewRegistrationRequest();

    const [activeTab, setActiveTab] = useState<SuperadminTabId>("overview");
    const [orgSearch, setOrgSearch] = useState("");
    const [adminSearch, setAdminSearch] = useState("");
    const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null);
    const [deleteAdminId, setDeleteAdminId] = useState<string | null>(null);

    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgSlug, setNewOrgSlug] = useState("");
    const [newOrgKind, setNewOrgKind] = useState<OrgKind>("BOTH");
    const [newOrgPlan, setNewOrgPlan] = useState<OrgPlan>("INSTITUTION_FULL");
    const [newOrgEntityType, setNewOrgEntityType] = useState<"SCHOOL" | "ORG">("SCHOOL");
    const [newOrgImageUrl, setNewOrgImageUrl] = useState("");
    const [newOrgDescription, setNewOrgDescription] = useState("");
    const [isCreateOrgDialogOpen, setIsCreateOrgDialogOpen] = useState(false);
    const [priceAdminStudent, setPriceAdminStudent] = useState<number>(199);
    const [priceFull, setPriceFull] = useState<number>(349);
    const [subscriptionDrafts, setSubscriptionDrafts] = useState<
        Record<
            string,
            {
                subscription_package: OrgPlan;
                billing_cycle: BillingCycle;
                status: SubscriptionStatus;
                price_amount: number;
                next_billing_at: string;
                auto_renew: boolean;
                notes: string;
            }
        >
    >({});
    const [subsSearch, setSubsSearch] = useState("");
    const [subsStatusFilter, setSubsStatusFilter] = useState<"ALL" | SubscriptionStatus>("ALL");

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
    const activePlanAdminStudent = activeOrgs.filter((o: any) => o.subscription_package === "INSTITUTION_ADMIN_STUDENT");
    const activePlanFull = activeOrgs.filter((o: any) => o.subscription_package === "INSTITUTION_FULL");
    const estimatedMonthlyIncome =
        activePlanAdminStudent.length * (Number(priceAdminStudent) || 0) +
        activePlanFull.length * (Number(priceFull) || 0);
    const subscriptionsByOrgId = useMemo(() => {
        const m = new Map<string, any>();
        (subscriptions || []).forEach((s: any) => m.set(s.organization_id, s));
        return m;
    }, [subscriptions]);
    const recurringMonthly = useMemo(
        () =>
            (subscriptions || [])
                .filter((s: any) => s.status === "ACTIVE" || s.status === "TRIAL")
                .reduce((sum: number, s: any) => {
                    const price = Number(s.price_amount || 0);
                    return sum + (s.billing_cycle === "YEARLY" ? price / 12 : price);
                }, 0),
        [subscriptions]
    );
    const pastDueCount = useMemo(
        () => (subscriptions || []).filter((s: any) => s.status === "PAST_DUE").length,
        [subscriptions]
    );
    const canceledCount = useMemo(
        () => (subscriptions || []).filter((s: any) => s.status === "CANCELED").length,
        [subscriptions]
    );
    const dueSoonCount = useMemo(
        () =>
            (subscriptions || []).filter((s: any) => {
                if (!s?.next_billing_at) return false;
                if (!(s.status === "ACTIVE" || s.status === "TRIAL")) return false;
                const d = new Date(s.next_billing_at).getTime();
                const now = Date.now();
                const days = (d - now) / (1000 * 60 * 60 * 24);
                return days >= 0 && days <= 7;
            }).length,
        [subscriptions]
    );
    const revenueAtRisk = useMemo(
        () =>
            (subscriptions || [])
                .filter((s: any) => s.status === "PAST_DUE")
                .reduce((sum: number, s: any) => sum + Number(s.price_amount || 0), 0),
        [subscriptions]
    );
    const autoRenewCount = useMemo(
        () => (subscriptions || []).filter((s: any) => s.auto_renew && s.status !== "CANCELED").length,
        [subscriptions]
    );

    useEffect(() => {
        const next: typeof subscriptionDrafts = {};
        (organizations || []).forEach((org: any) => {
            const s = subscriptionsByOrgId.get(org.id);
            next[org.id] = {
                subscription_package: (s?.subscription_package ?? org.subscription_package ?? "INSTITUTION_FULL") as OrgPlan,
                billing_cycle: (s?.billing_cycle ?? "MONTHLY") as BillingCycle,
                status: (s?.status ?? "ACTIVE") as SubscriptionStatus,
                price_amount: Number(s?.price_amount ?? (org.subscription_package === "INSTITUTION_ADMIN_STUDENT" ? 199 : 349)),
                next_billing_at: s?.next_billing_at ? String(s.next_billing_at).slice(0, 10) : "",
                auto_renew: s?.auto_renew ?? true,
                notes: s?.notes ?? "",
            };
        });
        setSubscriptionDrafts(next);
    }, [organizations, subscriptionsByOrgId]);

    const updateSubscriptionDraft = (
        orgId: string,
        patch: Partial<{
            subscription_package: OrgPlan;
            billing_cycle: BillingCycle;
            status: SubscriptionStatus;
            price_amount: number;
            next_billing_at: string;
            auto_renew: boolean;
            notes: string;
        }>
    ) => {
        setSubscriptionDrafts((prev) => ({ ...prev, [orgId]: { ...prev[orgId], ...patch } }));
    };

    const managedSubscriptionRows = useMemo(() => {
        const q = subsSearch.trim().toLowerCase();
        return (organizations || []).filter((org: any) => {
            const draft = subscriptionDrafts[org.id];
            if (!draft) return false;
            if (subsStatusFilter !== "ALL" && draft.status !== subsStatusFilter) return false;
            if (!q) return true;
            return (
                String(org.name || "").toLowerCase().includes(q) ||
                String(org.slug || "").toLowerCase().includes(q)
            );
        });
    }, [organizations, subscriptionDrafts, subsSearch, subsStatusFilter]);

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

    const handleCreateOrganization = async () => {
        const name = newOrgName.trim();
        if (!name) {
            toast({ variant: "destructive", description: "أدخل اسم المؤسسة." });
            return;
        }
        const slug = slugifyAscii(newOrgSlug) || slugifyAscii(name);
        if (!slug) {
            toast({ variant: "destructive", description: "أدخل معرفًا لاتينيًا صالحًا (slug)." });
            return;
        }
        try {
            await upsertOrganization.mutateAsync({
                name,
                slug,
                kind: newOrgKind,
                subscription_package: newOrgPlan,
                is_active: true,
                entity_type: newOrgEntityType,
                image_url: newOrgImageUrl.trim() || null,
                description: newOrgDescription.trim() || null,
            });
            setNewOrgName("");
            setNewOrgSlug("");
            setNewOrgKind("BOTH");
            setNewOrgPlan("INSTITUTION_FULL");
            setNewOrgEntityType("SCHOOL");
            setNewOrgImageUrl("");
            setNewOrgDescription("");
            setIsCreateOrgDialogOpen(false);
            toast({ description: "تم إنشاء المؤسسة بنجاح." });
        } catch (error: any) {
            toast({ variant: "destructive", description: error?.message || "تعذّر إنشاء المؤسسة." });
        }
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
                            <Button variant="ghost" size="icon" onClick={() => setActiveTab("support")} title="تذاكر الدعم">
                                <Bell className="w-5 h-5" />
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

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1"
                    >
                        <Card className="sticky top-24">
                            <CardContent className="p-4">
                                <div className="text-center mb-4 pb-4 border-b">
                                    <div className="w-16 h-16 rounded-xl mx-auto mb-3 bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                        <Crown className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="font-bold text-sm mb-1">{user.name}</h2>
                                    <p className="text-xs text-muted-foreground">منصة متعددة المؤسسات</p>
                                    <div className="flex justify-center mt-2">
                                        <Badge className="text-[10px]">SUPERADMIN</Badge>
                                    </div>
                                </div>

                                <nav className="space-y-1">
                                    {[
                                        { id: "overview" as const, icon: LayoutDashboard, label: "نظرة عامة" },
                                        { id: "users" as const, icon: Users, label: "كل المستخدمين" },
                                        { id: "orgs" as const, icon: Building2, label: "المؤسسات" },
                                        { id: "admins" as const, icon: UserCheck, label: "أدمن المؤسسات" },
                                        { id: "create" as const, icon: Sparkles, label: "ترحيب مؤسسة" },
                                        { id: "support" as const, icon: LifeBuoy, label: "تذاكر الدعم" },
                                        { id: "settings" as const, icon: Settings, label: "إعدادات المنصة" },
                                        { id: "plans" as const, icon: Package, label: "الباقات (مرجع)" },
                                    ].map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === item.id
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-muted"
                                                }`}
                                        >
                                            <item.icon className="w-4 h-4" />
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                </nav>

                                <div className="mt-4 pt-4 border-t">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start gap-2"
                                        type="button"
                                        onClick={() => setActiveTab("settings")}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        اختصار الإعدادات
                                    </Button>
                                </div>
                            </CardContent>
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
                                                        المؤسسات، إعدادات المنصة، وتذاكر الدعم.
                                                    </p>
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        <Button size="sm" variant="secondary" className="gap-2" onClick={() => setActiveTab("users")}>
                                                            <Users className="w-4 h-4" />
                                                            المستخدمون
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setActiveTab("orgs")}>
                                                            <Building2 className="w-4 h-4" />
                                                            المؤسسات
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setActiveTab("settings")}>
                                                            <Settings className="w-4 h-4" />
                                                            الإعدادات
                                                        </Button>
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
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <School className="h-5 w-5" />
                                                المؤسسات والمدارس
                                            </CardTitle>
                                            <CardDescription>
                                                إدارة المؤسسات المسجّلة في المنصة وحالة تفعيلها ونوع اشتراكها.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex flex-col md:flex-row gap-3">
                                                <Input
                                                    value={orgSearch}
                                                    onChange={(e) => setOrgSearch(e.target.value)}
                                                    placeholder="بحث بالاسم أو slug..."
                                                />
                                                <Button className="gap-2" onClick={() => setIsCreateOrgDialogOpen(true)}>
                                                    <Plus className="w-4 h-4" />
                                                    مؤسسة جديدة
                                                </Button>
                                            </div>
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
                                )}

                                {activeTab === "admins" && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <UserCheck className="h-5 w-5" />
                                                أدمن المؤسسات
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <Card className="border-primary/20 bg-primary/5">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-base">طلبات اشتراك المؤسسات من الصفحة الرئيسية</CardTitle>
                                                    <CardDescription>
                                                        هذه الطلبات أنشأها أدمن المؤسسة من الصفحة الرئيسية وتنتظر تأكيدك.
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-2">
                                                    {isLoadingPendingAdminRequests ? (
                                                        <Skeleton className="h-24 w-full" />
                                                    ) : pendingAdminRequests.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground">لا توجد طلبات معلّقة حاليًا.</p>
                                                    ) : (
                                                        pendingAdminRequests.map((req: any) => (
                                                            <div key={req.id} className="rounded-lg border bg-background p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                                <div>
                                                                    <p className="font-semibold">{req.organization?.name || "مؤسسة جديدة"}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {req.applicant?.name || "أدمن جديد"} · {req.applicant?.email}
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                        <Badge variant="outline">
                                                                            {req.requested_package === "INSTITUTION_ADMIN_STUDENT" ? "أدمن + طالب" : "أدمن + معلم + طالب"}
                                                                        </Badge>
                                                                        <Badge variant="secondary">
                                                                            {req.organization?.kind === "EDUCATIONAL"
                                                                                ? "تعليمية"
                                                                                : req.organization?.kind === "ENRICHMENT"
                                                                                    ? "إثرائية"
                                                                                    : "تعليمية + إثرائية"}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            reviewRegistrationRequest.mutate({
                                                                                requestId: req.id,
                                                                                reviewerUserId: user.id,
                                                                                decision: "APPROVED",
                                                                            })
                                                                        }
                                                                        disabled={reviewRegistrationRequest.isPending}
                                                                    >
                                                                        تأكيد الاشتراك
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() =>
                                                                            reviewRegistrationRequest.mutate({
                                                                                requestId: req.id,
                                                                                reviewerUserId: user.id,
                                                                                decision: "REJECTED",
                                                                            })
                                                                        }
                                                                        disabled={reviewRegistrationRequest.isPending}
                                                                    >
                                                                        رفض
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </CardContent>
                                            </Card>
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
                                )}

                                {activeTab === "create" && <CreateOrgAdminSection />}

                                {activeTab === "plans" && (
                                    <Card className="border-primary/20">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                <Package className="h-5 w-5" />
                                                باقات الاشتراك
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-6 text-sm leading-relaxed">
                                            <div className="rounded-xl border bg-card/50 p-4 space-y-2">
                                                <div className="font-semibold flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    ١ — الأفراد (مجاني)
                                                </div>
                                                <p className="text-muted-foreground pr-6">
                                                    مجاني، والمحتوى إثرائي فقط دون أدوات رقابة وتتبع. يُفعّل للمستخدمين خارج
                                                    المؤسسات عبر{" "}
                                                    <code className="text-xs bg-muted px-1 rounded">individual_tier = INDIVIDUAL_FREE</code>.
                                                </p>
                                            </div>
                                            <div className="rounded-xl border bg-card/50 p-4 space-y-2">
                                                <div className="font-semibold flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    ٢ — المؤسسات (تعليمي أو إثرائي)
                                                </div>
                                                <p className="text-muted-foreground pr-6">
                                                    متاح: حساب أدمن + حساب طالب. في قاعدة البيانات:{" "}
                                                    <code className="text-xs bg-muted px-1 rounded">INSTITUTION_ADMIN_STUDENT</code>.
                                                </p>
                                            </div>
                                            <div className="rounded-xl border bg-card/50 p-4 space-y-2">
                                                <div className="font-semibold flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    ٣ — المؤسسات (تعليمي أو إثرائي) الكاملة
                                                </div>
                                                <p className="text-muted-foreground pr-6">
                                                    متاح: حساب أدمن + حساب معلم + حساب طالب. في قاعدة البيانات:{" "}
                                                    <code className="text-xs bg-muted px-1 rounded">INSTITUTION_FULL</code>.
                                                </p>
                                            </div>

                                            <div className="rounded-xl border bg-card/50 p-4 space-y-3">
                                                <div className="font-semibold flex items-center gap-2">
                                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                                    إدارة الاشتراكات والدخل
                                                </div>
                                                <p className="text-muted-foreground">
                                                    عدّل الأسعار التقديرية لمتابعة الدخل، ثم استخدم تبويب «المؤسسات» لإدارة باقة كل مؤسسة.
                                                </p>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="space-y-2">
                                                        <Label>سعر باقة (أدمن + طالب) شهريًا</Label>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            value={priceAdminStudent}
                                                            onChange={(e) => setPriceAdminStudent(Number(e.target.value || 0))}
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            الاشتراكات النشطة: {activePlanAdminStudent.length}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>سعر باقة (أدمن + معلم + طالب) شهريًا</Label>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            value={priceFull}
                                                            onChange={(e) => setPriceFull(Number(e.target.value || 0))}
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            الاشتراكات النشطة: {activePlanFull.length}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="rounded-lg border p-3">
                                                        <p className="text-xs text-muted-foreground">الدخل الشهري التقديري</p>
                                                        <p className="text-xl font-bold">{estimatedMonthlyIncome.toLocaleString()} ر.س</p>
                                                    </div>
                                                    <div className="rounded-lg border p-3">
                                                        <p className="text-xs text-muted-foreground">الدخل السنوي التقديري</p>
                                                        <p className="text-xl font-bold">{(estimatedMonthlyIncome * 12).toLocaleString()} ر.س</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                    <div className="rounded-lg border p-3">
                                                        <p className="text-xs text-muted-foreground">MRR فعلي (من الاشتراكات)</p>
                                                        <p className="text-lg font-bold">{Math.round(recurringMonthly).toLocaleString()} ر.س</p>
                                                    </div>
                                                    <div className="rounded-lg border p-3">
                                                        <p className="text-xs text-muted-foreground">ARR فعلي</p>
                                                        <p className="text-lg font-bold">{Math.round(recurringMonthly * 12).toLocaleString()} ر.س</p>
                                                    </div>
                                                    <div className="rounded-lg border p-3">
                                                        <p className="text-xs text-muted-foreground">اشتراكات متأخرة</p>
                                                        <p className="text-lg font-bold">{pastDueCount}</p>
                                                    </div>
                                                    <div className="rounded-lg border p-3">
                                                        <p className="text-xs text-muted-foreground">اشتراكات ملغاة</p>
                                                        <p className="text-lg font-bold">{canceledCount}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="rounded-lg border p-3">
                                                        <p className="text-xs text-muted-foreground">تجديدات خلال 7 أيام</p>
                                                        <p className="text-lg font-bold">{dueSoonCount}</p>
                                                    </div>
                                                    <div className="rounded-lg border p-3">
                                                        <p className="text-xs text-muted-foreground">إيراد معرّض للخطر (Past Due)</p>
                                                        <p className="text-lg font-bold">{Math.round(revenueAtRisk).toLocaleString()} ر.س</p>
                                                    </div>
                                                </div>
                                                <div className="rounded-lg border p-3">
                                                    <p className="text-xs text-muted-foreground">اشتراكات بتجديد تلقائي</p>
                                                    <p className="text-lg font-bold">{autoRenewCount}</p>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => setActiveTab("orgs")}>
                                                        إدارة باقات المؤسسات
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => setActiveTab("admins")}>
                                                        إدارة أدمن المؤسسات
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="rounded-xl border bg-card/50 p-4 space-y-3">
                                                <div className="font-semibold flex items-center gap-2">
                                                    <Settings className="h-4 w-4 text-muted-foreground" />
                                                    Manage Subs — إدارة اشتراكات المؤسسات
                                                </div>
                                                <p className="text-muted-foreground text-xs">
                                                    التحكم الاحترافي: الباقة، حالة الاشتراك، دورة الفوترة، السعر، الفوترة القادمة، والتجديد التلقائي لكل مؤسسة.
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                    <Input
                                                        placeholder="بحث باسم المؤسسة أو slug..."
                                                        value={subsSearch}
                                                        onChange={(e) => setSubsSearch(e.target.value)}
                                                    />
                                                    <Select
                                                        value={subsStatusFilter}
                                                        onValueChange={(v: "ALL" | SubscriptionStatus) => setSubsStatusFilter(v)}
                                                    >
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="ALL">كل الحالات</SelectItem>
                                                            <SelectItem value="ACTIVE">نشطة</SelectItem>
                                                            <SelectItem value="TRIAL">تجريبية</SelectItem>
                                                            <SelectItem value="PAST_DUE">متأخرة</SelectItem>
                                                            <SelectItem value="CANCELED">ملغاة</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        variant="secondary"
                                                        onClick={async () => {
                                                            for (const org of managedSubscriptionRows) {
                                                                const draft = subscriptionDrafts[org.id];
                                                                if (!draft) continue;
                                                                await upsertSubscription.mutateAsync({
                                                                    organization_id: org.id,
                                                                    subscription_package: draft.subscription_package,
                                                                    billing_cycle: draft.billing_cycle,
                                                                    status: draft.status,
                                                                    price_amount: draft.price_amount,
                                                                    next_billing_at: draft.next_billing_at
                                                                        ? new Date(`${draft.next_billing_at}T00:00:00.000Z`).toISOString()
                                                                        : null,
                                                                    auto_renew: draft.auto_renew,
                                                                    notes: draft.notes?.trim() || null,
                                                                });
                                                            }
                                                            toast({ description: "تم حفظ جميع الاشتراكات الظاهرة." });
                                                        }}
                                                        disabled={upsertSubscription.isPending || managedSubscriptionRows.length === 0}
                                                    >
                                                        حفظ الكل
                                                    </Button>
                                                </div>
                                                {isLoadingOrgs || isLoadingSubscriptions ? (
                                                    <Skeleton className="h-40 w-full" />
                                                ) : managedSubscriptionRows.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground py-6 text-center">لا توجد مؤسسات مطابقة للبحث/الفلتر.</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {managedSubscriptionRows.map((org: any) => {
                                                            const draft = subscriptionDrafts[org.id];
                                                            if (!draft) return null;
                                                            return (
                                                                <div key={org.id} className="rounded-lg border p-3 grid grid-cols-1 lg:grid-cols-12 gap-2 items-end bg-muted/20 hover:bg-muted/30 transition-colors">
                                                                    <div className="lg:col-span-2">
                                                                        <p className="font-semibold text-sm">{org.name}</p>
                                                                        <p className="text-xs text-muted-foreground font-mono">{org.slug}</p>
                                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                                            <Badge variant="outline" className="text-[10px]">{getOrgKindLabel(org.kind as OrgKind)}</Badge>
                                                                            <Badge variant={subscriptionStatusMeta[draft.status].variant} className="text-[10px]">
                                                                                {subscriptionStatusMeta[draft.status].label}
                                                                            </Badge>
                                                                            {draft.next_billing_at ? (
                                                                                (() => {
                                                                                    const days = Math.ceil(
                                                                                        (new Date(`${draft.next_billing_at}T00:00:00`).getTime() - Date.now()) /
                                                                                            (1000 * 60 * 60 * 24)
                                                                                    );
                                                                                    if (days >= 0 && days <= 7) {
                                                                                        return <Badge className="text-[10px]">تجديد قريب ({days} يوم)</Badge>;
                                                                                    }
                                                                                    return null;
                                                                                })()
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                    <div className="lg:col-span-2">
                                                                        <Label className="text-xs">الباقة</Label>
                                                                        <Select
                                                                            value={draft.subscription_package}
                                                                            onValueChange={(v: OrgPlan) =>
                                                                                updateSubscriptionDraft(org.id, { subscription_package: v })
                                                                            }
                                                                        >
                                                                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="INSTITUTION_ADMIN_STUDENT">أدمن + طالب</SelectItem>
                                                                                <SelectItem value="INSTITUTION_FULL">أدمن + معلم + طالب</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="lg:col-span-2">
                                                                        <Label className="text-xs">الحالة</Label>
                                                                        <Select
                                                                            value={draft.status}
                                                                            onValueChange={(v: SubscriptionStatus) =>
                                                                                updateSubscriptionDraft(org.id, { status: v })
                                                                            }
                                                                        >
                                                                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="ACTIVE">نشطة</SelectItem>
                                                                                <SelectItem value="TRIAL">تجريبية</SelectItem>
                                                                                <SelectItem value="PAST_DUE">متأخرة</SelectItem>
                                                                                <SelectItem value="CANCELED">ملغاة</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="lg:col-span-1">
                                                                        <Label className="text-xs">الدورة</Label>
                                                                        <Select
                                                                            value={draft.billing_cycle}
                                                                            onValueChange={(v: BillingCycle) =>
                                                                                updateSubscriptionDraft(org.id, { billing_cycle: v })
                                                                            }
                                                                        >
                                                                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="MONTHLY">شهري</SelectItem>
                                                                                <SelectItem value="YEARLY">سنوي</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="lg:col-span-1">
                                                                        <Label className="text-xs">السعر</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min={0}
                                                                            className="h-8"
                                                                            value={draft.price_amount}
                                                                            onChange={(e) =>
                                                                                updateSubscriptionDraft(org.id, {
                                                                                    price_amount: Math.max(0, Number(e.target.value || 0)),
                                                                                })
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div className="lg:col-span-1">
                                                                        <Label className="text-xs">الفوترة القادمة</Label>
                                                                        <Input
                                                                            type="date"
                                                                            className="h-8"
                                                                            value={draft.next_billing_at}
                                                                            onChange={(e) => updateSubscriptionDraft(org.id, { next_billing_at: e.target.value })}
                                                                        />
                                                                    </div>
                                                                    <div className="lg:col-span-1">
                                                                        <Label className="text-xs">تجديد تلقائي</Label>
                                                                        <div className="h-8 flex items-center">
                                                                            <Switch
                                                                                checked={draft.auto_renew}
                                                                                onCheckedChange={(checked) =>
                                                                                    updateSubscriptionDraft(org.id, { auto_renew: checked })
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="lg:col-span-2">
                                                                        <Label className="text-xs">ملاحظات</Label>
                                                                        <Textarea
                                                                            className="min-h-[36px] py-1 text-xs"
                                                                            value={draft.notes}
                                                                            onChange={(e) => updateSubscriptionDraft(org.id, { notes: e.target.value })}
                                                                            placeholder="ملاحظة داخلية..."
                                                                        />
                                                                    </div>
                                                                    <div className="lg:col-span-2 flex items-center gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            className="h-8"
                                                                            disabled={upsertSubscription.isPending}
                                                                            onClick={async () => {
                                                                                try {
                                                                                    await upsertSubscription.mutateAsync({
                                                                                        organization_id: org.id,
                                                                                        subscription_package: draft.subscription_package,
                                                                                        billing_cycle: draft.billing_cycle,
                                                                                        status: draft.status,
                                                                                        price_amount: draft.price_amount,
                                                                                        next_billing_at: draft.next_billing_at
                                                                                            ? new Date(`${draft.next_billing_at}T00:00:00.000Z`).toISOString()
                                                                                            : null,
                                                                                        auto_renew: draft.auto_renew,
                                                                                        notes: draft.notes?.trim() || null,
                                                                                    });
                                                                                    toast({ description: "تم حفظ الاشتراك." });
                                                                                } catch (error: any) {
                                                                                    toast({
                                                                                        variant: "destructive",
                                                                                        description: error?.message || "تعذّر حفظ الاشتراك.",
                                                                                    });
                                                                                }
                                                                            }}
                                                                        >
                                                                            حفظ المؤسسة
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>

            <Dialog open={isCreateOrgDialogOpen} onOpenChange={setIsCreateOrgDialogOpen}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle>إنشاء مؤسسة جديدة</DialogTitle>
                        <DialogDescription>أنشئ المؤسسة ثم أضف أدمن لها من تبويب أدمن المؤسسات أو إضافة أدمن/مؤسسة.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>اسم المؤسسة</Label>
                            <Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>slug (اختياري)</Label>
                            <Input value={newOrgSlug} onChange={(e) => setNewOrgSlug(e.target.value)} dir="ltr" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>النوع</Label>
                                <Select value={newOrgKind} onValueChange={(v: OrgKind) => setNewOrgKind(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BOTH">تعليمية اثرائية</SelectItem>
                                        <SelectItem value="EDUCATIONAL">تعليمية</SelectItem>
                                        <SelectItem value="ENRICHMENT">اثرائية</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>الباقة</Label>
                                <Select value={newOrgPlan} onValueChange={(v: OrgPlan) => setNewOrgPlan(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INSTITUTION_ADMIN_STUDENT">أدمن + طالب</SelectItem>
                                        <SelectItem value="INSTITUTION_FULL">أدمن + معلم + طالب</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>نوع الكيان</Label>
                                <Select value={newOrgEntityType} onValueChange={(v: "SCHOOL" | "ORG") => setNewOrgEntityType(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SCHOOL">مدرسة</SelectItem>
                                        <SelectItem value="ORG">مؤسسة</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>صورة المؤسسة/المدرسة (رابط)</Label>
                            <Input
                                value={newOrgImageUrl}
                                onChange={(e) => setNewOrgImageUrl(e.target.value)}
                                dir="ltr"
                                placeholder="https://..."
                                className="font-mono text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>وصف المؤسسة/المدرسة</Label>
                            <Input
                                value={newOrgDescription}
                                onChange={(e) => setNewOrgDescription(e.target.value)}
                                placeholder="نبذة قصيرة تظهر في صفحة الجهة"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOrgDialogOpen(false)}>إلغاء</Button>
                        <Button onClick={handleCreateOrganization} disabled={busy}>إنشاء</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                <div className="space-y-2">
                                    <Label>صورة (رابط)</Label>
                                    <Input
                                        value={editingOrg.image_url ?? ""}
                                        onChange={(e) => setEditingOrg({ ...editingOrg, image_url: e.target.value })}
                                        dir="ltr"
                                        className="font-mono text-sm"
                                        placeholder="https://..."
                                    />
                                    {(editingOrg.image_url ?? "").trim() ? (
                                        <div className="pt-2">
                                            <img
                                                src={editingOrg.image_url ?? ""}
                                                alt={`صورة ${editingOrg.name}`}
                                                className="w-20 h-20 rounded-full object-cover border"
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                                }}
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            </div>
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
