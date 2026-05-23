import { useEffect, useMemo, useState } from "react";
import md5 from "js-md5";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
    UserPlus,
    Building2,
    Loader2,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Phone,
    Eye,
    EyeOff,
    GraduationCap,
    Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingStepIndicator } from "./OnboardingStepIndicator";
import { CredentialsDeliveryPanel } from "./CredentialsDeliveryPanel";
import { OrgImageField } from "./OrgImageField";
import { supabase } from "@/lib/supabase";
import { useOrganizations } from "@/hooks/useDatabase";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import type { TFunction } from "@/contexts/LanguageContext";
import {
    generateTemporaryPassword,
    normalizeWhatsAppPhone,
    isValidEmail,
    getAppLoginUrl,
    type EntityType,
    type OrgPackage,
} from "@/lib/accountOnboarding";

type OrgKind = "EDUCATIONAL" | "ENRICHMENT" | "BOTH";

type WizardStep = 1 | 2 | 3;

type CreatedCredentials = {
    adminName: string;
    email: string;
    password: string;
    orgName: string;
    entityType: EntityType;
    packageLabel: string;
    phone: string | null;
};

function slugifyAscii(input: string): string {
    const s = input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return s.length ? s.slice(0, 64) : "";
}

function randomOrgSlug(): string {
    try {
        return `org-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    } catch {
        return `org-${Date.now().toString(36)}`;
    }
}

function entityLabel(t: TFunction, entityType: EntityType): string {
    return entityType === "SCHOOL" ? t("dash.super.orgs.entitySchool") : t("dash.super.orgs.entityOrg");
}

function packageLabel(t: TFunction, pkg: OrgPackage): string {
    return pkg === "INSTITUTION_ADMIN_STUDENT"
        ? t("dash.super.create.packageAdminStudentTitle")
        : t("dash.super.create.packageFullTitle");
}

function buildWelcomeMessage(creds: CreatedCredentials, t: TFunction): string {
    const entity = entityLabel(t, creds.entityType);
    return [
        t("dash.super.create.welcome.greeting", { name: creds.adminName }),
        "",
        t("dash.super.create.welcome.activated", { entity, orgName: creds.orgName }),
        t("dash.super.create.welcome.package", { package: creds.packageLabel }),
        "",
        t("dash.super.create.welcome.credentialsHeader"),
        t("dash.super.create.welcome.email", { email: creds.email }),
        t("dash.super.create.welcome.password", { password: creds.password }),
        "",
        `${t("dash.super.create.welcome.loginUrl")}\n${getAppLoginUrl()}`,
        "",
        t("dash.super.create.welcome.changePassword"),
    ].join("\n");
}

function PackageCards({
    value,
    onChange,
    t,
}: {
    value: OrgPackage;
    onChange: (v: OrgPackage) => void;
    t: TFunction;
}) {
    const options: { id: OrgPackage; titleKey: "dash.super.create.packageAdminStudentTitle" | "dash.super.create.packageFullTitle"; descKey: "dash.super.create.packageAdminStudentDesc" | "dash.super.create.packageFullDesc"; icon: typeof Users }[] = [
        {
            id: "INSTITUTION_ADMIN_STUDENT",
            titleKey: "dash.super.create.packageAdminStudentTitle",
            descKey: "dash.super.create.packageAdminStudentDesc",
            icon: GraduationCap,
        },
        {
            id: "INSTITUTION_FULL",
            titleKey: "dash.super.create.packageFullTitle",
            descKey: "dash.super.create.packageFullDesc",
            icon: Users,
        },
    ];
    return (
        <div className="grid sm:grid-cols-2 gap-2 sm:col-span-2">
            {options.map((o) => {
                const selected = value === o.id;
                return (
                    <button
                        key={o.id}
                        type="button"
                        onClick={() => onChange(o.id)}
                        className={cn(
                            "text-right rounded-xl border p-3 transition-all",
                            selected
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                : "hover:bg-muted/50 border-border",
                        )}
                    >
                        <div className="flex items-start gap-2">
                            <o.icon
                                className={cn(
                                    "w-5 h-5 shrink-0 mt-0.5",
                                    selected ? "text-primary" : "text-muted-foreground",
                                )}
                            />
                            <div>
                                <p className="font-medium text-sm">{t(o.titleKey)}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{t(o.descKey)}</p>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

const CreateOrgAdminSection = () => {
    const { toast } = useToast();
    const { t, dir, isRtl } = useDashboardLocale();
    const queryClient = useQueryClient();
    const { data: organizations = [], isLoading: loadingOrgs } = useOrganizations({
        includeInactive: true,
    });
    const [step, setStep] = useState<WizardStep>(1);
    const [orgMode, setOrgMode] = useState<"existing" | "new">(
        organizations.length === 0 ? "new" : "existing",
    );

    const wizardSteps = useMemo(
        () => [
            { id: 1, label: t("dash.super.create.step.org") },
            { id: 2, label: t("dash.super.create.step.admin") },
            { id: 3, label: t("dash.super.create.step.delivery") },
        ],
        [t],
    );

    const [existingOrgId, setExistingOrgId] = useState<string>("");

    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgSlug, setNewOrgSlug] = useState("");
    const [newOrgKind, setNewOrgKind] = useState<OrgKind>("BOTH");
    const [newOrgPackage, setNewOrgPackage] = useState<OrgPackage>("INSTITUTION_FULL");
    const [newOrgEntityType, setNewOrgEntityType] = useState<EntityType>("SCHOOL");
    const [newOrgImageUrl, setNewOrgImageUrl] = useState("");
    const [newOrgDescription, setNewOrgDescription] = useState("");

    const [adminName, setAdminName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPhone, setAdminPhone] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [showPassword, setShowPassword] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [created, setCreated] = useState<CreatedCredentials | null>(null);

    useEffect(() => {
        if (organizations.length === 0) {
            setOrgMode("new");
            return;
        }
        if (orgMode !== "existing") return;
        const list = organizations as { id: string; is_active?: boolean }[];
        const activeIds = list.filter((o) => o.is_active !== false);
        const pickFrom = activeIds.length ? activeIds : list;
        if (existingOrgId && pickFrom.some((o) => o.id === existingOrgId)) return;
        setExistingOrgId(pickFrom[0].id);
    }, [orgMode, organizations, existingOrgId]);

    const activeOrganizations = organizations.filter((o: { is_active?: boolean }) => o.is_active !== false);

    const resolvedOrgPreview = useMemo(() => {
        if (orgMode === "existing") {
            const row = organizations.find((o: { id: string }) => o.id === existingOrgId);
            return {
                name: row?.name ?? t("dash.super.create.orgFallback"),
                package: (row?.subscription_package as OrgPackage) ?? newOrgPackage,
                entityType: (row?.entity_type as EntityType) ?? "SCHOOL",
            };
        }
        return {
            name: newOrgName.trim() || t("dash.super.create.newOrgFallback"),
            package: newOrgPackage,
            entityType: newOrgEntityType,
        };
    }, [orgMode, organizations, existingOrgId, newOrgName, newOrgPackage, newOrgEntityType, t]);

    const suggestedSlug = useMemo(() => {
        const fromSlug = slugifyAscii(newOrgSlug.trim());
        if (fromSlug) return fromSlug;
        const fromName = slugifyAscii(newOrgName);
        return fromName || t("dash.super.create.slugAuto");
    }, [newOrgSlug, newOrgName, t]);

    function handleGeneratePassword() {
        const p = generateTemporaryPassword(10);
        setPassword(p);
        setPassword2(p);
    }

    useEffect(() => {
        if (!password && step === 2) handleGeneratePassword();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    async function resolveOrganizationId(): Promise<{
        id: string;
        name: string;
        package: OrgPackage;
        entityType: EntityType;
        isNew: boolean;
    }> {
        if (orgMode === "existing") {
            const id = existingOrgId || (organizations[0] as { id?: string })?.id;
            if (!id) throw new Error(t("dash.super.create.errNoOrgSelected"));
            const row = organizations.find((o: { id: string }) => o.id === id);
            return {
                id,
                name: row?.name ?? t("dash.super.create.orgFallback"),
                package: (row?.subscription_package as OrgPackage) ?? "INSTITUTION_FULL",
                entityType: (row?.entity_type as EntityType) ?? "SCHOOL",
                isNew: false,
            };
        }

        const name = newOrgName.trim();
        if (!name) throw new Error(t("dash.super.create.errOrgNameRequired"));

        let slug =
            slugifyAscii(newOrgSlug.trim()) || slugifyAscii(newOrgName) || randomOrgSlug();

        const now = new Date().toISOString();
        let lastError: unknown = null;

        for (let attempt = 0; attempt < 8; attempt++) {
            const trySlug = attempt === 0 ? slug : `${slug}-${attempt}`;
            const { data, error } = await supabase
                .from("organizations")
                .insert({
                    name,
                    slug: trySlug.slice(0, 80),
                    kind: newOrgKind,
                    subscription_package: newOrgPackage,
                    entity_type: newOrgEntityType,
                    image_url: newOrgImageUrl.trim() || null,
                    description: newOrgDescription.trim() || null,
                    is_active: true,
                    created_at: now,
                    updated_at: now,
                })
                .select("id")
                .single();

            if (!error && data?.id) {
                const orgId = data.id as string;
                const nextBilling = new Date();
                nextBilling.setMonth(nextBilling.getMonth() + 1);
                await supabase.from("organization_subscriptions").upsert(
                    {
                        organization_id: orgId,
                        subscription_package: newOrgPackage,
                        billing_cycle: "MONTHLY",
                        status: "ACTIVE",
                        price_amount: newOrgPackage === "INSTITUTION_ADMIN_STUDENT" ? 199 : 349,
                        currency_code: "SAR",
                        starts_at: now,
                        next_billing_at: nextBilling.toISOString(),
                        auto_renew: true,
                        notes: t("dash.super.create.subscriptionNote"),
                        updated_at: now,
                    },
                    { onConflict: "organization_id" },
                );

                return {
                    id: orgId,
                    name,
                    package: newOrgPackage,
                    entityType: newOrgEntityType,
                    isNew: true,
                };
            }

            lastError = error;
            const code =
                typeof error === "object" && error && "code" in error
                    ? (error as { code?: string }).code
                    : undefined;
            const msg = typeof error?.message === "string" ? error.message : "";
            if (code === "23505" || msg.includes("organizations_slug")) {
                slug = randomOrgSlug();
                continue;
            }
            throw error;
        }

        throw lastError ?? new Error(t("dash.super.create.errOrgCreateFailed"));
    }

    function validateStep1(): boolean {
        if (orgMode === "existing") {
            if (activeOrganizations.length === 0) {
                toast({ variant: "destructive", description: t("dash.super.create.toastNoOrgs") });
                return false;
            }
            return true;
        }
        if (!newOrgName.trim()) {
            toast({ variant: "destructive", description: t("dash.super.create.toastOrgNameRequired") });
            return false;
        }
        return true;
    }

    function validateStep2(): boolean {
        const name = adminName.trim();
        const email = adminEmail.trim().toLowerCase();
        if (!name || !email) {
            toast({ variant: "destructive", description: t("dash.super.create.toastNameEmailRequired") });
            return false;
        }
        if (password.length < 6) {
            toast({ variant: "destructive", description: t("dash.super.create.toastPasswordMin") });
            return false;
        }
        if (password !== password2) {
            toast({ variant: "destructive", description: t("dash.super.create.toastPasswordMismatch") });
            return false;
        }
        if (!isValidEmail(email)) {
            toast({ variant: "destructive", description: t("dash.super.create.toastInvalidEmail") });
            return false;
        }
        if (adminPhone.trim() && !normalizeWhatsAppPhone(adminPhone)) {
            toast({ variant: "destructive", description: t("dash.super.create.toastInvalidWhatsApp") });
            return false;
        }
        return true;
    }

    async function handleCreateAccount() {
        if (!validateStep2()) return;
        setSubmitting(true);

        const name = adminName.trim();
        const email = adminEmail.trim().toLowerCase();
        const phoneNormalized = normalizeWhatsAppPhone(adminPhone);

        try {
            const org = await resolveOrganizationId();
            const now = new Date().toISOString();
            const detailsParts = [
                t("dash.super.create.detailsManager", {
                    entity: entityLabel(t, org.entityType),
                    orgName: org.name,
                }),
                phoneNormalized ? `واتساب: ${phoneNormalized}` : null,
            ].filter(Boolean);

            const { data: createdUser, error: userErr } = await supabase
                .from("users")
                .insert({
                    email,
                    name,
                    role: "ADMIN",
                    verified: true,
                    is_active: true,
                    organization_id: org.id,
                    details: detailsParts.join(" | "),
                    password_hash: String(md5(password)).toLowerCase(),
                    individual_tier: null,
                    updated_at: now,
                    created_at: now,
                })
                .select("id")
                .single();

            if (userErr) {
                if (
                    userErr.message?.includes("duplicate") ||
                    userErr.message?.includes("unique") ||
                    (userErr as { code?: string }).code === "23505"
                ) {
                    toast({
                        variant: "destructive",
                        description: t("dash.super.create.toastEmailExists"),
                    });
                } else {
                    toast({
                        variant: "destructive",
                        description: userErr.message || t("dash.super.create.toastCreateFailed"),
                    });
                }
                return;
            }

            await queryClient.invalidateQueries({ queryKey: ["organizations"] });
            await queryClient.invalidateQueries({ queryKey: ["org_admin_users"] });
            await queryClient.invalidateQueries({ queryKey: ["all_users"] });
            await queryClient.invalidateQueries({ queryKey: ["organization_subscriptions"] });

            const creds: CreatedCredentials = {
                adminName: name,
                email,
                password,
                orgName: org.name,
                entityType: org.entityType,
                packageLabel: packageLabel(t, org.package),
                phone: phoneNormalized,
            };
            setCreated(creds);
            setStep(3);

            toast({
                description:
                    createdUser?.id != null
                        ? t("dash.super.create.toastSuccess", {
                              entity: entityLabel(t, org.entityType),
                              orgName: org.name,
                          })
                        : t("dash.super.create.toastSuccessGeneric"),
            });

            if (org.isNew) {
                setOrgMode("existing");
                setExistingOrgId(org.id);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t("dash.super.create.toastUnexpected");
            toast({ variant: "destructive", description: msg });
        } finally {
            setSubmitting(false);
        }
    }

    function resetWizard() {
        setStep(1);
        setCreated(null);
        setAdminName("");
        setAdminEmail("");
        setAdminPhone("");
        setPassword("");
        setPassword2("");
        setNewOrgName("");
        setNewOrgSlug("");
        setNewOrgDescription("");
        setNewOrgImageUrl("");
    }

    const newEntityLabel = entityLabel(t, newOrgEntityType);

    return (
        <div className="space-y-6">
            <Card className="border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <UserPlus className="h-5 w-5" />
                        {t("dash.super.create.title")}
                    </CardTitle>
                    <CardDescription>{t("dash.super.create.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <OnboardingStepIndicator steps={wizardSteps} current={step} dir={dir} className="mb-2" />

                    {step === 1 && (
                        <div className="space-y-4">
                            <Label>{t("dash.super.create.orgSectionLabel")}</Label>
                            <RadioGroup
                                dir={dir}
                                value={orgMode}
                                onValueChange={(v) => setOrgMode(v as "existing" | "new")}
                                className="flex flex-col gap-2"
                            >
                                <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
                                    <RadioGroupItem value="existing" id="org-existing" />
                                    <span className="flex-1 text-sm font-medium">{t("dash.super.create.linkExisting")}</span>
                                </label>
                                <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
                                    <RadioGroupItem value="new" id="org-new" />
                                    <span className="flex-1 text-sm font-medium">
                                        {t("dash.super.create.createNew", { entity: newEntityLabel })}
                                    </span>
                                </label>
                            </RadioGroup>

                            {orgMode === "existing" ? (
                                loadingOrgs ? (
                                    <Skeleton className="h-10 w-full" />
                                ) : activeOrganizations.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {t("dash.super.create.noActiveOrgs")}
                                    </p>
                                ) : (
                                    <Select
                                        value={existingOrgId || (activeOrganizations[0] as { id: string }).id}
                                        onValueChange={setExistingOrgId}
                                        dir={dir}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("dash.super.create.orgPlaceholder")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {activeOrganizations.map((o: { id: string; name: string }) => (
                                                <SelectItem key={o.id} value={o.id}>
                                                    {o.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label>{t("dash.super.create.entityTypeLabel")}</Label>
                                        <Select
                                            value={newOrgEntityType}
                                            onValueChange={(v) => setNewOrgEntityType(v as EntityType)}
                                            dir={dir}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SCHOOL">{t("dash.super.orgs.entitySchool")}</SelectItem>
                                                <SelectItem value="ORG">{t("dash.super.orgs.entityOrg")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="super-org-name">
                                            {t("dash.super.create.nameLabel", { entity: newEntityLabel })}
                                        </Label>
                                        <Input
                                            id="super-org-name"
                                            value={newOrgName}
                                            onChange={(e) => setNewOrgName(e.target.value)}
                                            placeholder={
                                                newOrgEntityType === "SCHOOL"
                                                    ? t("dash.super.create.placeholderSchool")
                                                    : t("dash.super.create.placeholderOrg")
                                            }
                                            dir={dir}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="super-org-slug">{t("dash.super.create.slugLabel")}</Label>
                                        <Input
                                            id="super-org-slug"
                                            value={newOrgSlug}
                                            onChange={(e) => setNewOrgSlug(e.target.value)}
                                            placeholder={t("dash.super.create.slugPlaceholder")}
                                            dir="ltr"
                                            className="text-left font-mono text-sm"
                                        />
                                    </div>
                                    <PackageCards value={newOrgPackage} onChange={setNewOrgPackage} t={t} />
                                    <p className="text-[11px] text-muted-foreground sm:col-span-2" dir="ltr">
                                        {t("dash.super.create.slugPreview")}{" "}
                                        <span className="font-mono">{suggestedSlug}</span>
                                    </p>
                                    <div className="space-y-2">
                                        <Label>{t("dash.super.create.contentKindLabel")}</Label>
                                        <Select
                                            value={newOrgKind}
                                            onValueChange={(v) => setNewOrgKind(v as OrgKind)}
                                            dir={dir}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="BOTH">{t("dash.super.create.kindBoth")}</SelectItem>
                                                <SelectItem value="EDUCATIONAL">{t("dash.super.create.kindEducational")}</SelectItem>
                                                <SelectItem value="ENRICHMENT">{t("dash.super.create.kindEnrichment")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <OrgImageField
                                        value={newOrgImageUrl}
                                        onChange={setNewOrgImageUrl}
                                    />
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label>{t("dash.super.create.descriptionLabel")}</Label>
                                        <Input
                                            value={newOrgDescription}
                                            onChange={(e) => setNewOrgDescription(e.target.value)}
                                            dir={dir}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground sm:col-span-2">
                                        {t("dash.super.create.autoActivateNote")}
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    className="gap-2"
                                    onClick={() => {
                                        if (validateStep1()) setStep(2);
                                    }}
                                >
                                    {t("dash.super.create.next")}
                                    {isRtl ? (
                                        <ChevronLeft className="w-4 h-4" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <form
                            className="space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                void handleCreateAccount();
                            }}
                        >
                            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                                <span className="text-muted-foreground">{t("dash.super.create.entityPreview")} </span>
                                <span className="font-medium">{resolvedOrgPreview.name}</span>
                                <Badge variant="outline" className="ms-2 text-[10px]">
                                    {packageLabel(t, resolvedOrgPreview.package)}
                                </Badge>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="super-admin-name">{t("dash.super.create.adminNameLabel")}</Label>
                                    <Input
                                        id="super-admin-name"
                                        value={adminName}
                                        onChange={(e) => setAdminName(e.target.value)}
                                        dir={dir}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="super-admin-email">{t("dash.super.create.emailLabel")}</Label>
                                    <Input
                                        id="super-admin-email"
                                        type="email"
                                        dir="ltr"
                                        className="text-left font-mono text-sm"
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="super-admin-phone" className="flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5" />
                                        {t("dash.super.create.whatsappLabel")}
                                    </Label>
                                    <Input
                                        id="super-admin-phone"
                                        type="tel"
                                        dir="ltr"
                                        className="text-left font-mono"
                                        placeholder={t("dash.super.create.phonePlaceholder")}
                                        value={adminPhone}
                                        onChange={(e) => setAdminPhone(e.target.value)}
                                    />
                                    {adminPhone.trim() && !normalizeWhatsAppPhone(adminPhone) && (
                                        <p className="text-xs text-amber-600">{t("dash.super.create.phoneInvalid")}</p>
                                    )}
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="super-admin-pass">{t("dash.super.create.passwordLabel")}</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="super-admin-pass"
                                            type={showPassword ? "text" : "password"}
                                            dir="ltr"
                                            className="text-left font-mono flex-1"
                                            autoComplete="new-password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            title={showPassword ? t("dash.super.create.hidePassword") : t("dash.super.create.showPassword")}
                                            onClick={() => setShowPassword((v) => !v)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            title={t("dash.super.create.generatePassword")}
                                            onClick={handleGeneratePassword}
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="super-admin-pass2">{t("dash.super.create.passwordConfirmLabel")}</Label>
                                    <Input
                                        id="super-admin-pass2"
                                        type={showPassword ? "text" : "password"}
                                        dir="ltr"
                                        className="text-left font-mono"
                                        value={password2}
                                        onChange={(e) => setPassword2(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-between gap-2 pt-2">
                                <Button type="button" variant="outline" className="gap-2" onClick={() => setStep(1)}>
                                    {isRtl ? (
                                        <ChevronRight className="w-4 h-4" />
                                    ) : (
                                        <ChevronLeft className="w-4 h-4" />
                                    )}
                                    {t("dash.super.create.prev")}
                                </Button>
                                <Button type="submit" disabled={submitting} className="gap-2">
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {t("dash.super.create.submitting")}
                                        </>
                                    ) : (
                                        <>
                                            <Building2 className="h-4 w-4" />
                                            {t("dash.super.create.submit")}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}

                    {step === 3 && created && (
                        <CredentialsDeliveryPanel
                            creds={created}
                            message={buildWelcomeMessage(created, t)}
                            onReset={resetWizard}
                            toast={toast}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};


export default CreateOrgAdminSection;
