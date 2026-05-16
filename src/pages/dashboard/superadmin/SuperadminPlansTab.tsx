import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Building2,
    GraduationCap,
    Users,
    User,
    Search,
    Save,
    TrendingUp,
    AlertTriangle,
    CalendarClock,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    useOrganizations,
    useOrganizationSubscriptions,
    useUpsertOrganizationSubscription,
} from "@/hooks/useDatabase";
import { useToast } from "@/hooks/use-toast";
import { getPackageLabel, type OrgPackage } from "@/lib/accountOnboarding";

type OrgKind = "EDUCATIONAL" | "ENRICHMENT" | "BOTH";
type OrgPlan = OrgPackage;
type SubscriptionStatus = "ACTIVE" | "TRIAL" | "PAST_DUE" | "CANCELED";
type BillingCycle = "MONTHLY" | "YEARLY";

type SubscriptionDraft = {
    subscription_package: OrgPlan;
    billing_cycle: BillingCycle;
    status: SubscriptionStatus;
    price_amount: number;
    next_billing_at: string;
    auto_renew: boolean;
    notes: string;
};

const STATUS_META: Record<
    SubscriptionStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
    ACTIVE: { label: "نشطة", variant: "default" },
    TRIAL: { label: "تجريبية", variant: "secondary" },
    PAST_DUE: { label: "متأخرة", variant: "destructive" },
    CANCELED: { label: "ملغاة", variant: "outline" },
};

const PACKAGE_CATALOG: {
    id: OrgPlan | "INDIVIDUAL_FREE";
    title: string;
    subtitle: string;
    price: string;
    features: string[];
    icon: typeof Users;
    accent: string;
}[] = [
    {
        id: "INDIVIDUAL_FREE",
        title: "أفراد — مجاني",
        subtitle: "خارج المؤسسات",
        price: "٠ ر.س",
        features: ["محتوى إثرائي فقط", "بدون رقابة مؤسسية", "للمستخدمين المستقلين"],
        icon: User,
        accent: "from-slate-500/10 to-slate-500/5 border-slate-500/20",
    },
    {
        id: "INSTITUTION_ADMIN_STUDENT",
        title: getPackageLabel("INSTITUTION_ADMIN_STUDENT"),
        subtitle: "مدرسة بدون معلمين",
        price: "من ١٩٩ ر.س/شهر",
        features: ["حساب أدمن", "حسابات طلاب", "تقارير أساسية"],
        icon: GraduationCap,
        accent: "from-violet-500/10 to-indigo-500/5 border-violet-500/25",
    },
    {
        id: "INSTITUTION_FULL",
        title: getPackageLabel("INSTITUTION_FULL"),
        subtitle: "فريق تعليمي كامل",
        price: "من ٣٤٩ ر.س/شهر",
        features: ["أدمن + معلمون + طلاب", "إدارة صفوف ومواد", "تتبع وتقييم"],
        icon: Users,
        accent: "from-emerald-500/10 to-teal-500/5 border-emerald-500/25",
    },
];

function getOrgKindLabel(kind: OrgKind): string {
    if (kind === "EDUCATIONAL") return "تعليمية";
    if (kind === "ENRICHMENT") return "إثرائية";
    return "تعليمية + إثرائية";
}

function monthlyAmount(price: number, cycle: BillingCycle): number {
    return cycle === "YEARLY" ? price / 12 : price;
}

function daysUntil(dateStr: string): number | null {
    if (!dateStr) return null;
    const d = new Date(`${dateStr}T00:00:00`).getTime();
    return Math.ceil((d - Date.now()) / (1000 * 60 * 60 * 24));
}

function defaultPriceForPackage(pkg: OrgPlan, refAdmin: number, refFull: number): number {
    return pkg === "INSTITUTION_ADMIN_STUDENT" ? refAdmin : refFull;
}

export function SuperadminPlansTab() {
    const { toast } = useToast();
    const { data: organizations = [], isLoading: loadingOrgs } = useOrganizations({ includeInactive: true });
    const { data: subscriptions = [], isLoading: loadingSubs } = useOrganizationSubscriptions();
    const upsertSubscription = useUpsertOrganizationSubscription();

    const [refPriceAdmin, setRefPriceAdmin] = useState(199);
    const [refPriceFull, setRefPriceFull] = useState(349);
    const [drafts, setDrafts] = useState<Record<string, SubscriptionDraft>>({});
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | SubscriptionStatus>("ALL");
    const [packageFilter, setPackageFilter] = useState<"ALL" | OrgPlan>("ALL");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const subscriptionsByOrgId = useMemo(() => {
        const m = new Map<string, (typeof subscriptions)[0]>();
        subscriptions.forEach((s: { organization_id: string }) => m.set(s.organization_id, s));
        return m;
    }, [subscriptions]);

    useEffect(() => {
        const next: Record<string, SubscriptionDraft> = {};
        organizations.forEach((org: {
            id: string;
            subscription_package?: string;
        }) => {
            const s = subscriptionsByOrgId.get(org.id);
            const pkg = (s?.subscription_package ?? org.subscription_package ?? "INSTITUTION_FULL") as OrgPlan;
            next[org.id] = {
                subscription_package: pkg,
                billing_cycle: (s?.billing_cycle ?? "MONTHLY") as BillingCycle,
                status: (s?.status ?? "ACTIVE") as SubscriptionStatus,
                price_amount: Number(
                    s?.price_amount ?? defaultPriceForPackage(pkg, refPriceAdmin, refPriceFull),
                ),
                next_billing_at: s?.next_billing_at ? String(s.next_billing_at).slice(0, 10) : "",
                auto_renew: s?.auto_renew ?? true,
                notes: s?.notes ?? "",
            };
        });
        setDrafts(next);
    }, [organizations, subscriptionsByOrgId, refPriceAdmin, refPriceFull]);

    const activeOrgs = useMemo(
        () => organizations.filter((o: { is_active?: boolean }) => o.is_active !== false),
        [organizations],
    );

    const stats = useMemo(() => {
        const activeSubs = subscriptions.filter(
            (s: { status?: string }) => s.status === "ACTIVE" || s.status === "TRIAL",
        );
        const mrr = activeSubs.reduce((sum: number, s: { price_amount?: number; billing_cycle?: string }) => {
            return sum + monthlyAmount(Number(s.price_amount || 0), (s.billing_cycle as BillingCycle) || "MONTHLY");
        }, 0);

        const byStatus = {
            ACTIVE: 0,
            TRIAL: 0,
            PAST_DUE: 0,
            CANCELED: 0,
        } as Record<SubscriptionStatus, number>;
        subscriptions.forEach((s: { status?: string }) => {
            const st = (s.status as SubscriptionStatus) || "ACTIVE";
            if (st in byStatus) byStatus[st]++;
        });

        const adminStudentOrgs = activeOrgs.filter(
            (o: { subscription_package?: string }) => o.subscription_package === "INSTITUTION_ADMIN_STUDENT",
        );
        const fullOrgs = activeOrgs.filter(
            (o: { subscription_package?: string }) => o.subscription_package === "INSTITUTION_FULL",
        );
        const estimatedMrr =
            adminStudentOrgs.length * refPriceAdmin + fullOrgs.length * refPriceFull;

        const dueSoon = subscriptions.filter((s: { next_billing_at?: string; status?: string }) => {
            if (!s.next_billing_at || !(s.status === "ACTIVE" || s.status === "TRIAL")) return false;
            const days = daysUntil(String(s.next_billing_at).slice(0, 10));
            return days != null && days >= 0 && days <= 7;
        }).length;

        const atRisk = subscriptions
            .filter((s: { status?: string }) => s.status === "PAST_DUE")
            .reduce((sum: number, s: { price_amount?: number }) => sum + Number(s.price_amount || 0), 0);

        const autoRenew = subscriptions.filter(
            (s: { auto_renew?: boolean; status?: string }) => s.auto_renew && s.status !== "CANCELED",
        ).length;

        return { mrr, arr: mrr * 12, estimatedMrr, byStatus, dueSoon, atRisk, autoRenew };
    }, [subscriptions, activeOrgs, refPriceAdmin, refPriceFull]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return organizations.filter((org: { id: string; name?: string; slug?: string }) => {
            const draft = drafts[org.id];
            if (!draft) return false;
            if (statusFilter !== "ALL" && draft.status !== statusFilter) return false;
            if (packageFilter !== "ALL" && draft.subscription_package !== packageFilter) return false;
            if (!q) return true;
            return (
                String(org.name || "").toLowerCase().includes(q) ||
                String(org.slug || "").toLowerCase().includes(q)
            );
        });
    }, [organizations, drafts, search, statusFilter, packageFilter]);

    const updateDraft = (orgId: string, patch: Partial<SubscriptionDraft>) => {
        setDrafts((prev) => ({ ...prev, [orgId]: { ...prev[orgId], ...patch } }));
    };

    const saveDraft = async (orgId: string) => {
        const draft = drafts[orgId];
        if (!draft) return;
        try {
            await upsertSubscription.mutateAsync({
                organization_id: orgId,
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
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "تعذّر حفظ الاشتراك.";
            toast({ variant: "destructive", description: msg });
        }
    };

    const saveAllVisible = async () => {
        try {
            for (const org of filteredRows) {
                const draft = drafts[org.id];
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
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "تعذّر حفظ بعض الاشتراكات.";
            toast({ variant: "destructive", description: msg });
        }
    };

    const isLoading = loadingOrgs || loadingSubs;
    const statusTotal = Math.max(1, subscriptions.length);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    {
                        label: "MRR فعلي",
                        value: `${Math.round(stats.mrr).toLocaleString()} ر.س`,
                        sub: "من الاشتراكات النشطة",
                        icon: TrendingUp,
                        tone: "text-emerald-600 bg-emerald-500/10",
                    },
                    {
                        label: "ARR فعلي",
                        value: `${Math.round(stats.arr).toLocaleString()} ر.س`,
                        sub: "تقدير سنوي",
                        icon: Building2,
                        tone: "text-blue-600 bg-blue-500/10",
                    },
                    {
                        label: "تجديد خلال ٧ أيام",
                        value: String(stats.dueSoon),
                        sub: "مؤسسات",
                        icon: CalendarClock,
                        tone: "text-amber-600 bg-amber-500/10",
                    },
                    {
                        label: "إيراد معرّض للخطر",
                        value: `${Math.round(stats.atRisk).toLocaleString()} ر.س`,
                        sub: `${stats.byStatus.PAST_DUE} متأخرة`,
                        icon: AlertTriangle,
                        tone: "text-destructive bg-destructive/10",
                    },
                ].map((kpi) => (
                    <Card key={kpi.label} className="overflow-hidden">
                        <CardContent className="p-4 flex items-start gap-3">
                            <div className={cn("p-2 rounded-lg shrink-0", kpi.tone)}>
                                <kpi.icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                                <p className="text-lg font-bold truncate">{kpi.value}</p>
                                <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Tabs defaultValue="overview" dir="rtl" className="space-y-4">
                <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-muted/50 p-1">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm">
                        الباقات والملخص
                    </TabsTrigger>
                    <TabsTrigger value="manage" className="text-xs sm:text-sm">
                        إدارة الاشتراكات
                        {subscriptions.length > 0 && (
                            <Badge variant="secondary" className="mr-1.5 h-5 text-[10px]">
                                {subscriptions.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-0">
                    <div className="grid md:grid-cols-3 gap-4">
                        {PACKAGE_CATALOG.map((pkg) => (
                            <Card
                                key={pkg.id}
                                className={cn("bg-gradient-to-br border", pkg.accent)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <pkg.icon className="w-8 h-8 text-primary/70" />
                                        {pkg.id !== "INDIVIDUAL_FREE" && (
                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                {pkg.id}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-base">{pkg.title}</CardTitle>
                                    <CardDescription>{pkg.subtitle}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-2xl font-bold">{pkg.price}</p>
                                    <ul className="text-sm text-muted-foreground space-y-1.5">
                                        {pkg.features.map((f) => (
                                            <li key={f} className="flex items-center gap-2">
                                                <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">توزيع حالات الاشتراك</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {(Object.keys(STATUS_META) as SubscriptionStatus[]).map((st) => (
                                    <div key={st} className="space-y-1.5">
                                        <div className="flex justify-between text-sm">
                                            <span>{STATUS_META[st].label}</span>
                                            <span className="font-medium">{stats.byStatus[st]}</span>
                                        </div>
                                        <Progress value={(stats.byStatus[st] / statusTotal) * 100} className="h-2" />
                                    </div>
                                ))}
                                <p className="text-xs text-muted-foreground pt-1">
                                    تجديد تلقائي مفعّل: {stats.autoRenew} اشتراك
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">أسعار مرجعية (تقدير الدخل)</CardTitle>
                                <CardDescription>
                                    للمقارنة مع MRR الفعلي — لا تُحفظ في قاعدة البيانات.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>أدمن + طالب / شهر</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={refPriceAdmin}
                                            onChange={(e) => setRefPriceAdmin(Number(e.target.value || 0))}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {activeOrgs.filter(
                                                (o: { subscription_package?: string }) =>
                                                    o.subscription_package === "INSTITUTION_ADMIN_STUDENT",
                                            ).length}{" "}
                                            مؤسسة نشطة
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>أدمن + معلم + طالب / شهر</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={refPriceFull}
                                            onChange={(e) => setRefPriceFull(Number(e.target.value || 0))}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {activeOrgs.filter(
                                                (o: { subscription_package?: string }) =>
                                                    o.subscription_package === "INSTITUTION_FULL",
                                            ).length}{" "}
                                            مؤسسة نشطة
                                        </p>
                                    </div>
                                </div>
                                <div className="rounded-lg border bg-muted/30 p-3 flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">دخل شهري تقديري</span>
                                    <span className="text-xl font-bold">
                                        {stats.estimatedMrr.toLocaleString()} ر.س
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="manage" className="space-y-4 mt-0">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">اشتراكات المؤسسات</CardTitle>
                            <CardDescription>
                                عدّل الباقة، الحالة، الفوترة، والسعر لكل مؤسسة ثم احفظ.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col lg:flex-row gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        className="pr-10"
                                        placeholder="بحث بالاسم أو slug..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <Select
                                    value={statusFilter}
                                    onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                                >
                                    <SelectTrigger className="w-full lg:w-[140px]">
                                        <SelectValue placeholder="الحالة" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">كل الحالات</SelectItem>
                                        {(Object.keys(STATUS_META) as SubscriptionStatus[]).map((st) => (
                                            <SelectItem key={st} value={st}>
                                                {STATUS_META[st].label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={packageFilter}
                                    onValueChange={(v) => setPackageFilter(v as typeof packageFilter)}
                                >
                                    <SelectTrigger className="w-full lg:w-[160px]">
                                        <SelectValue placeholder="الباقة" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">كل الباقات</SelectItem>
                                        <SelectItem value="INSTITUTION_ADMIN_STUDENT">
                                            {getPackageLabel("INSTITUTION_ADMIN_STUDENT")}
                                        </SelectItem>
                                        <SelectItem value="INSTITUTION_FULL">
                                            {getPackageLabel("INSTITUTION_FULL")}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="secondary"
                                    className="gap-2 shrink-0"
                                    disabled={upsertSubscription.isPending || filteredRows.length === 0}
                                    onClick={() => void saveAllVisible()}
                                >
                                    {upsertSubscription.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    حفظ الظاهر ({filteredRows.length})
                                </Button>
                            </div>

                            {isLoading ? (
                                <Skeleton className="h-48 w-full" />
                            ) : filteredRows.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-12">
                                    لا توجد مؤسسات مطابقة.
                                </p>
                            ) : (
                                <>
                                    <div className="hidden lg:block rounded-xl border overflow-hidden">
                                        <Table dir="rtl">
                                            <TableHeader>
                                                <TableRow className="bg-muted/40">
                                                    <TableHead className="text-right">المؤسسة</TableHead>
                                                    <TableHead className="text-right">الباقة</TableHead>
                                                    <TableHead className="text-right">الحالة</TableHead>
                                                    <TableHead className="text-right">الدورة</TableHead>
                                                    <TableHead className="text-right">السعر</TableHead>
                                                    <TableHead className="text-right">الفوترة</TableHead>
                                                    <TableHead className="text-center">تجديد</TableHead>
                                                    <TableHead className="text-center w-[90px]" />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredRows.map((org: {
                                                    id: string;
                                                    name: string;
                                                    slug: string;
                                                    kind: OrgKind;
                                                }) => {
                                                    const draft = drafts[org.id];
                                                    if (!draft) return null;
                                                    const days = daysUntil(draft.next_billing_at);
                                                    return (
                                                        <TableRow key={org.id}>
                                                            <TableCell>
                                                                <p className="font-medium text-sm">{org.name}</p>
                                                                <p className="text-[10px] text-muted-foreground font-mono">
                                                                    {org.slug}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Select
                                                                    value={draft.subscription_package}
                                                                    onValueChange={(v: OrgPlan) =>
                                                                        updateDraft(org.id, {
                                                                            subscription_package: v,
                                                                            price_amount: defaultPriceForPackage(
                                                                                v,
                                                                                refPriceAdmin,
                                                                                refPriceFull,
                                                                            ),
                                                                        })
                                                                    }
                                                                >
                                                                    <SelectTrigger className="h-8 text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="INSTITUTION_ADMIN_STUDENT">
                                                                            أدمن + طالب
                                                                        </SelectItem>
                                                                        <SelectItem value="INSTITUTION_FULL">
                                                                            أدمن + معلم + طالب
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Select
                                                                    value={draft.status}
                                                                    onValueChange={(v: SubscriptionStatus) =>
                                                                        updateDraft(org.id, { status: v })
                                                                    }
                                                                >
                                                                    <SelectTrigger className="h-8 text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {(Object.keys(STATUS_META) as SubscriptionStatus[]).map(
                                                                            (st) => (
                                                                                <SelectItem key={st} value={st}>
                                                                                    {STATUS_META[st].label}
                                                                                </SelectItem>
                                                                            ),
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Select
                                                                    value={draft.billing_cycle}
                                                                    onValueChange={(v: BillingCycle) =>
                                                                        updateDraft(org.id, { billing_cycle: v })
                                                                    }
                                                                >
                                                                    <SelectTrigger className="h-8 text-xs w-[88px]">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="MONTHLY">شهري</SelectItem>
                                                                        <SelectItem value="YEARLY">سنوي</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    className="h-8 w-20 text-xs"
                                                                    value={draft.price_amount}
                                                                    onChange={(e) =>
                                                                        updateDraft(org.id, {
                                                                            price_amount: Math.max(
                                                                                0,
                                                                                Number(e.target.value || 0),
                                                                            ),
                                                                        })
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="date"
                                                                    className="h-8 text-xs w-[130px]"
                                                                    value={draft.next_billing_at}
                                                                    onChange={(e) =>
                                                                        updateDraft(org.id, {
                                                                            next_billing_at: e.target.value,
                                                                        })
                                                                    }
                                                                />
                                                                {days != null && days >= 0 && days <= 7 && (
                                                                    <Badge className="mt-1 text-[9px]">
                                                                        {days} يوم
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Switch
                                                                    checked={draft.auto_renew}
                                                                    onCheckedChange={(c) =>
                                                                        updateDraft(org.id, { auto_renew: c })
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 w-8 p-0"
                                                                    disabled={upsertSubscription.isPending}
                                                                    onClick={() => void saveDraft(org.id)}
                                                                >
                                                                    <Save className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="lg:hidden space-y-2">
                                        {filteredRows.map((org: {
                                            id: string;
                                            name: string;
                                            slug: string;
                                            kind: OrgKind;
                                        }) => {
                                            const draft = drafts[org.id];
                                            if (!draft) return null;
                                            const open = expandedId === org.id;
                                            const days = daysUntil(draft.next_billing_at);
                                            return (
                                                <div
                                                    key={org.id}
                                                    className="rounded-xl border bg-card overflow-hidden"
                                                >
                                                    <button
                                                        type="button"
                                                        className="w-full text-right p-3 flex items-start justify-between gap-2 hover:bg-muted/40"
                                                        onClick={() => setExpandedId(open ? null : org.id)}
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-sm truncate">{org.name}</p>
                                                            <p className="text-[10px] text-muted-foreground font-mono">
                                                                {org.slug}
                                                            </p>
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                <Badge variant="outline" className="text-[10px]">
                                                                    {getOrgKindLabel(org.kind)}
                                                                </Badge>
                                                                <Badge
                                                                    variant={STATUS_META[draft.status].variant}
                                                                    className="text-[10px]"
                                                                >
                                                                    {STATUS_META[draft.status].label}
                                                                </Badge>
                                                                {days != null && days >= 0 && days <= 7 && (
                                                                    <Badge className="text-[10px]">
                                                                        تجديد {days} يوم
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                                                            {getPackageLabel(draft.subscription_package)}
                                                        </Badge>
                                                    </button>
                                                    {open && (
                                                        <div className="px-3 pb-3 pt-0 space-y-3 border-t">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="space-y-1">
                                                                    <Label className="text-xs">الباقة</Label>
                                                                    <Select
                                                                        value={draft.subscription_package}
                                                                        onValueChange={(v: OrgPlan) =>
                                                                            updateDraft(org.id, {
                                                                                subscription_package: v,
                                                                                price_amount: defaultPriceForPackage(
                                                                                    v,
                                                                                    refPriceAdmin,
                                                                                    refPriceFull,
                                                                                ),
                                                                            })
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="INSTITUTION_ADMIN_STUDENT">
                                                                                أدمن + طالب
                                                                            </SelectItem>
                                                                            <SelectItem value="INSTITUTION_FULL">
                                                                                كامل
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-xs">الحالة</Label>
                                                                    <Select
                                                                        value={draft.status}
                                                                        onValueChange={(v: SubscriptionStatus) =>
                                                                            updateDraft(org.id, { status: v })
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {(Object.keys(STATUS_META) as SubscriptionStatus[]).map(
                                                                                (st) => (
                                                                                    <SelectItem key={st} value={st}>
                                                                                        {STATUS_META[st].label}
                                                                                    </SelectItem>
                                                                                ),
                                                                            )}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-xs">الدورة</Label>
                                                                    <Select
                                                                        value={draft.billing_cycle}
                                                                        onValueChange={(v: BillingCycle) =>
                                                                            updateDraft(org.id, { billing_cycle: v })
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="MONTHLY">شهري</SelectItem>
                                                                            <SelectItem value="YEARLY">سنوي</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-xs">السعر (ر.س)</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        className="h-8"
                                                                        value={draft.price_amount}
                                                                        onChange={(e) =>
                                                                            updateDraft(org.id, {
                                                                                price_amount: Math.max(
                                                                                    0,
                                                                                    Number(e.target.value || 0),
                                                                                ),
                                                                            })
                                                                        }
                                                                    />
                                                                </div>
                                                                <div className="space-y-1 col-span-2">
                                                                    <Label className="text-xs">الفوترة القادمة</Label>
                                                                    <Input
                                                                        type="date"
                                                                        className="h-8"
                                                                        value={draft.next_billing_at}
                                                                        onChange={(e) =>
                                                                            updateDraft(org.id, {
                                                                                next_billing_at: e.target.value,
                                                                            })
                                                                        }
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <Label className="text-xs">تجديد تلقائي</Label>
                                                                <Switch
                                                                    checked={draft.auto_renew}
                                                                    onCheckedChange={(c) =>
                                                                        updateDraft(org.id, { auto_renew: c })
                                                                    }
                                                                />
                                                            </div>
                                                            <Textarea
                                                                className="min-h-[60px] text-xs"
                                                                placeholder="ملاحظة داخلية..."
                                                                value={draft.notes}
                                                                onChange={(e) =>
                                                                    updateDraft(org.id, { notes: e.target.value })
                                                                }
                                                            />
                                                            <Button
                                                                className="w-full gap-2"
                                                                size="sm"
                                                                disabled={upsertSubscription.isPending}
                                                                onClick={() => void saveDraft(org.id)}
                                                            >
                                                                <Save className="w-4 h-4" />
                                                                حفظ
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
