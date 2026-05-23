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
import { useDashboardLocale } from "@/contexts/LanguageContext";
import type { TFunction } from "@/contexts/LanguageContext";
import type { OrgPackage } from "@/lib/accountOnboarding";

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

function formatSar(amount: number, locale: string, language: string): string {
    const n = Math.round(amount).toLocaleString(locale);
    return language === "ar" ? `${n} ر.س` : `SAR ${n}`;
}

function packageLabel(t: TFunction, pkg: OrgPlan): string {
    return pkg === "INSTITUTION_ADMIN_STUDENT"
        ? t("dash.super.planDistribution.adminStudent")
        : t("dash.super.planDistribution.full");
}

function orgKindLabel(t: TFunction, kind: OrgKind): string {
    if (kind === "EDUCATIONAL") return t("dash.super.create.kindEducational");
    if (kind === "ENRICHMENT") return t("dash.super.create.kindEnrichment");
    return t("dash.super.create.kindBoth");
}

function statusMeta(t: TFunction): Record<
    SubscriptionStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> {
    return {
        ACTIVE: { label: t("dash.super.plans.status.active"), variant: "default" },
        TRIAL: { label: t("dash.super.plans.status.trial"), variant: "secondary" },
        PAST_DUE: { label: t("dash.super.plans.status.pastDue"), variant: "destructive" },
        CANCELED: { label: t("dash.super.plans.status.canceled"), variant: "outline" },
    };
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
    const { t, dir, isRtl, locale, language } = useDashboardLocale();
    const { data: organizations = [], isLoading: loadingOrgs } = useOrganizations({ includeInactive: true });
    const { data: subscriptions = [], isLoading: loadingSubs } = useOrganizationSubscriptions();
    const upsertSubscription = useUpsertOrganizationSubscription();

    const STATUS_META = useMemo(() => statusMeta(t), [t]);

    const PACKAGE_CATALOG = useMemo(
        () => [
            {
                id: "INDIVIDUAL_FREE" as const,
                title: t("dash.super.plans.catalog.individualTitle"),
                subtitle: t("dash.super.plans.catalog.individualSubtitle"),
                price: t("dash.super.plans.catalog.individualPrice"),
                features: [
                    t("dash.super.plans.catalog.individualFeature1"),
                    t("dash.super.plans.catalog.individualFeature2"),
                    t("dash.super.plans.catalog.individualFeature3"),
                ],
                icon: User,
                accent: "from-slate-500/10 to-slate-500/5 border-slate-500/20",
            },
            {
                id: "INSTITUTION_ADMIN_STUDENT" as const,
                title: t("dash.super.planDistribution.adminStudent"),
                subtitle: t("dash.super.plans.catalog.adminStudentSubtitle"),
                price: t("dash.super.plans.catalog.adminStudentPrice"),
                features: [
                    t("dash.super.plans.catalog.adminStudentFeature1"),
                    t("dash.super.plans.catalog.adminStudentFeature2"),
                    t("dash.super.plans.catalog.adminStudentFeature3"),
                ],
                icon: GraduationCap,
                accent: "from-violet-500/10 to-indigo-500/5 border-violet-500/25",
            },
            {
                id: "INSTITUTION_FULL" as const,
                title: t("dash.super.planDistribution.full"),
                subtitle: t("dash.super.plans.catalog.fullSubtitle"),
                price: t("dash.super.plans.catalog.fullPrice"),
                features: [
                    t("dash.super.plans.catalog.fullFeature1"),
                    t("dash.super.plans.catalog.fullFeature2"),
                    t("dash.super.plans.catalog.fullFeature3"),
                ],
                icon: Users,
                accent: "from-emerald-500/10 to-teal-500/5 border-emerald-500/25",
            },
        ],
        [t],
    );

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
            toast({ description: t("dash.super.plans.toast.saved") });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : t("dash.super.plans.toast.saveFailed");
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
            toast({ description: t("dash.super.plans.toast.savedAll") });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : t("dash.super.plans.toast.saveAllFailed");
            toast({ variant: "destructive", description: msg });
        }
    };

    const isLoading = loadingOrgs || loadingSubs;
    const statusTotal = Math.max(1, subscriptions.length);

    const kpiCards = useMemo(
        () => [
            {
                label: t("dash.super.plans.kpi.mrrActual"),
                value: formatSar(stats.mrr, locale, language),
                sub: t("dash.super.plans.kpi.mrrSub"),
                icon: TrendingUp,
                tone: "text-emerald-600 bg-emerald-500/10",
            },
            {
                label: t("dash.super.plans.kpi.arrActual"),
                value: formatSar(stats.arr, locale, language),
                sub: t("dash.super.plans.kpi.arrSub"),
                icon: Building2,
                tone: "text-blue-600 bg-blue-500/10",
            },
            {
                label: t("dash.super.plans.kpi.renewalSoon"),
                value: String(stats.dueSoon),
                sub: t("dash.super.plans.kpi.renewalSoonSub"),
                icon: CalendarClock,
                tone: "text-amber-600 bg-amber-500/10",
            },
            {
                label: t("dash.super.plans.kpi.revenueAtRisk"),
                value: formatSar(stats.atRisk, locale, language),
                sub: t("dash.super.plans.kpi.pastDueCount", { count: stats.byStatus.PAST_DUE }),
                icon: AlertTriangle,
                tone: "text-destructive bg-destructive/10",
            },
        ],
        [t, stats, locale, language],
    );

    const searchIconClass = isRtl ? "right-3" : "left-3";
    const searchInputClass = isRtl ? "pr-10" : "pl-10";

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {kpiCards.map((kpi) => (
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

            <Tabs defaultValue="overview" dir={dir} className="space-y-4">
                <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-muted/50 p-1">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm">
                        {t("dash.super.plans.tab.overview")}
                    </TabsTrigger>
                    <TabsTrigger value="manage" className="text-xs sm:text-sm">
                        {t("dash.super.plans.tab.manage")}
                        {subscriptions.length > 0 && (
                            <Badge variant="secondary" className="ms-1.5 h-5 text-[10px]">
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
                                <CardTitle className="text-base">{t("dash.super.plans.statusDistribution")}</CardTitle>
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
                                    {t("dash.super.plans.autoRenewCount", { count: stats.autoRenew })}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">{t("dash.super.plans.refPricingTitle")}</CardTitle>
                                <CardDescription>{t("dash.super.plans.refPricingDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>{t("dash.super.plans.refAdminLabel")}</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={refPriceAdmin}
                                            onChange={(e) => setRefPriceAdmin(Number(e.target.value || 0))}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t("dash.super.plans.activeOrgsCount", {
                                                count: activeOrgs.filter(
                                                    (o: { subscription_package?: string }) =>
                                                        o.subscription_package === "INSTITUTION_ADMIN_STUDENT",
                                                ).length,
                                            })}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("dash.super.plans.refFullLabel")}</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={refPriceFull}
                                            onChange={(e) => setRefPriceFull(Number(e.target.value || 0))}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t("dash.super.plans.activeOrgsCount", {
                                                count: activeOrgs.filter(
                                                    (o: { subscription_package?: string }) =>
                                                        o.subscription_package === "INSTITUTION_FULL",
                                                ).length,
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="rounded-lg border bg-muted/30 p-3 flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">
                                        {t("dash.super.plans.estimatedMonthly")}
                                    </span>
                                    <span className="text-xl font-bold">
                                        {formatSar(stats.estimatedMrr, locale, language)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="manage" className="space-y-4 mt-0">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">{t("dash.super.plans.manageTitle")}</CardTitle>
                            <CardDescription>{t("dash.super.plans.manageDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col lg:flex-row gap-2">
                                <div className="relative flex-1">
                                    <Search
                                        className={cn(
                                            "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
                                            searchIconClass,
                                        )}
                                    />
                                    <Input
                                        className={searchInputClass}
                                        placeholder={t("dash.super.plans.searchPlaceholder")}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <Select
                                    value={statusFilter}
                                    onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                                    dir={dir}
                                >
                                    <SelectTrigger className="w-full lg:w-[140px]">
                                        <SelectValue placeholder={t("dash.super.plans.filterStatus")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">{t("dash.super.plans.filterAllStatuses")}</SelectItem>
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
                                    dir={dir}
                                >
                                    <SelectTrigger className="w-full lg:w-[160px]">
                                        <SelectValue placeholder={t("dash.super.plans.filterPackage")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">{t("dash.super.plans.filterAllPackages")}</SelectItem>
                                        <SelectItem value="INSTITUTION_ADMIN_STUDENT">
                                            {packageLabel(t, "INSTITUTION_ADMIN_STUDENT")}
                                        </SelectItem>
                                        <SelectItem value="INSTITUTION_FULL">
                                            {packageLabel(t, "INSTITUTION_FULL")}
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
                                    {t("dash.super.plans.saveVisible", { count: filteredRows.length })}
                                </Button>
                            </div>

                            {isLoading ? (
                                <Skeleton className="h-48 w-full" />
                            ) : filteredRows.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-12">
                                    {t("dash.super.plans.noMatches")}
                                </p>
                            ) : (
                                <>
                                    <div className="hidden lg:block rounded-xl border overflow-hidden">
                                        <Table dir={dir}>
                                            <TableHeader>
                                                <TableRow className="bg-muted/40">
                                                    <TableHead className={isRtl ? "text-right" : "text-left"}>
                                                        {t("dash.super.plans.colOrg")}
                                                    </TableHead>
                                                    <TableHead className={isRtl ? "text-right" : "text-left"}>
                                                        {t("dash.super.plans.colPackage")}
                                                    </TableHead>
                                                    <TableHead className={isRtl ? "text-right" : "text-left"}>
                                                        {t("dash.super.plans.colStatus")}
                                                    </TableHead>
                                                    <TableHead className={isRtl ? "text-right" : "text-left"}>
                                                        {t("dash.super.plans.colCycle")}
                                                    </TableHead>
                                                    <TableHead className={isRtl ? "text-right" : "text-left"}>
                                                        {t("dash.super.plans.colPrice")}
                                                    </TableHead>
                                                    <TableHead className={isRtl ? "text-right" : "text-left"}>
                                                        {t("dash.super.plans.colBilling")}
                                                    </TableHead>
                                                    <TableHead className="text-center">
                                                        {t("dash.super.plans.colRenew")}
                                                    </TableHead>
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
                                                                    dir={dir}
                                                                >
                                                                    <SelectTrigger className="h-8 text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="INSTITUTION_ADMIN_STUDENT">
                                                                            {packageLabel(t, "INSTITUTION_ADMIN_STUDENT")}
                                                                        </SelectItem>
                                                                        <SelectItem value="INSTITUTION_FULL">
                                                                            {packageLabel(t, "INSTITUTION_FULL")}
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
                                                                    dir={dir}
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
                                                                    dir={dir}
                                                                >
                                                                    <SelectTrigger className="h-8 text-xs w-[88px]">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="MONTHLY">
                                                                            {t("dash.super.plans.cycle.monthly")}
                                                                        </SelectItem>
                                                                        <SelectItem value="YEARLY">
                                                                            {t("dash.super.plans.cycle.yearly")}
                                                                        </SelectItem>
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
                                                                        {t("dash.super.plans.daysBadge", { days })}
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
                                                                    title={t("dash.super.plans.save")}
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
                                                        className={cn(
                                                            "w-full p-3 flex items-start justify-between gap-2 hover:bg-muted/40",
                                                            isRtl ? "text-right" : "text-left",
                                                        )}
                                                        onClick={() => setExpandedId(open ? null : org.id)}
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-sm truncate">{org.name}</p>
                                                            <p className="text-[10px] text-muted-foreground font-mono">
                                                                {org.slug}
                                                            </p>
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                <Badge variant="outline" className="text-[10px]">
                                                                    {orgKindLabel(t, org.kind)}
                                                                </Badge>
                                                                <Badge
                                                                    variant={STATUS_META[draft.status].variant}
                                                                    className="text-[10px]"
                                                                >
                                                                    {STATUS_META[draft.status].label}
                                                                </Badge>
                                                                {days != null && days >= 0 && days <= 7 && (
                                                                    <Badge className="text-[10px]">
                                                                        {t("dash.super.plans.renewalInDays", { days })}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                                                            {packageLabel(t, draft.subscription_package)}
                                                        </Badge>
                                                    </button>
                                                    {open && (
                                                        <div className="px-3 pb-3 pt-0 space-y-3 border-t">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="space-y-1">
                                                                    <Label className="text-xs">
                                                                        {t("dash.super.plans.colPackage")}
                                                                    </Label>
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
                                                                        dir={dir}
                                                                    >
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="INSTITUTION_ADMIN_STUDENT">
                                                                                {packageLabel(t, "INSTITUTION_ADMIN_STUDENT")}
                                                                            </SelectItem>
                                                                            <SelectItem value="INSTITUTION_FULL">
                                                                                {t("dash.super.plans.packageFullShort")}
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-xs">
                                                                        {t("dash.super.plans.colStatus")}
                                                                    </Label>
                                                                    <Select
                                                                        value={draft.status}
                                                                        onValueChange={(v: SubscriptionStatus) =>
                                                                            updateDraft(org.id, { status: v })
                                                                        }
                                                                        dir={dir}
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
                                                                    <Label className="text-xs">
                                                                        {t("dash.super.plans.colCycle")}
                                                                    </Label>
                                                                    <Select
                                                                        value={draft.billing_cycle}
                                                                        onValueChange={(v: BillingCycle) =>
                                                                            updateDraft(org.id, { billing_cycle: v })
                                                                        }
                                                                        dir={dir}
                                                                    >
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="MONTHLY">
                                                                                {t("dash.super.plans.cycle.monthly")}
                                                                            </SelectItem>
                                                                            <SelectItem value="YEARLY">
                                                                                {t("dash.super.plans.cycle.yearly")}
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-xs">
                                                                        {t("dash.super.plans.priceLabel")}
                                                                    </Label>
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
                                                                    <Label className="text-xs">
                                                                        {t("dash.super.plans.nextBillingLabel")}
                                                                    </Label>
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
                                                                <Label className="text-xs">
                                                                    {t("dash.super.plans.autoRenewLabel")}
                                                                </Label>
                                                                <Switch
                                                                    checked={draft.auto_renew}
                                                                    onCheckedChange={(c) =>
                                                                        updateDraft(org.id, { auto_renew: c })
                                                                    }
                                                                />
                                                            </div>
                                                            <Textarea
                                                                className="min-h-[60px] text-xs"
                                                                placeholder={t("dash.super.plans.notesPlaceholder")}
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
                                                                {t("dash.super.plans.save")}
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
