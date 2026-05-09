import { useEffect, useState } from "react";
import md5 from "js-md5";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useOrganizations, useOrgAdminUsers } from "@/hooks/useDatabase";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type OrgKind = "EDUCATIONAL" | "ENRICHMENT" | "BOTH";
type OrgPackage = "INSTITUTION_ADMIN_STUDENT" | "INSTITUTION_FULL";

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

const CreateOrgAdminSection = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data: organizations = [], isLoading: loadingOrgs } = useOrganizations({
        includeInactive: true,
    });
    const { data: existingAdmins = [], isLoading: loadingAdmins } = useOrgAdminUsers();

    const [orgMode, setOrgMode] = useState<"existing" | "new">(
        organizations.length === 0 ? "new" : "existing",
    );

    const [existingOrgId, setExistingOrgId] = useState<string>("");

    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgSlug, setNewOrgSlug] = useState("");
    const [newOrgKind, setNewOrgKind] = useState<OrgKind>("BOTH");
    const [newOrgPackage, setNewOrgPackage] = useState<OrgPackage>("INSTITUTION_FULL");
    const [newOrgEntityType, setNewOrgEntityType] = useState<"SCHOOL" | "ORG">("SCHOOL");
    const [newOrgImageUrl, setNewOrgImageUrl] = useState("");
    const [newOrgDescription, setNewOrgDescription] = useState("");

    const [adminName, setAdminName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (orgMode !== "existing" || organizations.length === 0) return;
        const list = organizations as { id: string; is_active?: boolean }[];
        const activeIds = list.filter((o) => o.is_active !== false);
        const pickFrom = activeIds.length ? activeIds : list;
        if (existingOrgId && pickFrom.some((o) => o.id === existingOrgId)) return;
        setExistingOrgId(pickFrom[0].id);
    }, [orgMode, organizations, existingOrgId]);

    async function resolveOrganizationId(): Promise<string> {
        if (orgMode === "existing") {
            const id = existingOrgId || (organizations[0] as { id?: string })?.id;
            if (!id) {
                throw new Error("لم يتم اختيار مؤسسة.");
            }
            return id;
        }

        const name = newOrgName.trim();
        if (!name) {
            throw new Error("أدخل اسم المؤسسة.");
        }

        let slug =
            slugifyAscii(newOrgSlug.trim()) ||
            slugifyAscii(newOrgName) ||
            randomOrgSlug();

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
                return data.id as string;
            }

            lastError = error;

            const code =
                typeof error === "object" &&
                error &&
                "code" in error &&
                (error as { code?: string }).code;
            const msg = typeof error?.message === "string" ? error.message : "";

            const isSlugConflict =
                code === "23505" || msg.includes("organizations_slug");

            if (isSlugConflict) {
                slug = randomOrgSlug();
                continue;
            }
            throw error;
        }

        throw lastError ?? new Error("فشل إنشاء المؤسسة.");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);

        const name = adminName.trim();
        const email = adminEmail.trim().toLowerCase();

        try {
            if (!name || !email) {
                toast({ variant: "destructive", description: "الاسم والبريد مطلوبان." });
                return;
            }
            if (password.length < 6) {
                toast({ variant: "destructive", description: "كلمة المرور ٦ أحرف على الأقل." });
                return;
            }
            if (password !== password2) {
                toast({ variant: "destructive", description: "تأكيد كلمة المرور غير متطابق." });
                return;
            }

            const organizationId = await resolveOrganizationId();
            const orgRow = organizations.find((o: { id: string }) => o.id === organizationId);

            const orgLabel =
                orgMode === "existing"
                    ? (orgRow?.name ?? "المؤسسة")
                    : newOrgName.trim();

            const now = new Date().toISOString();
            const { data: created, error: userErr } = await supabase
                .from("users")
                .insert({
                    email,
                    name,
                    role: "ADMIN",
                    verified: true,
                    is_active: true,
                    organization_id: organizationId,
                    details: `مدير مؤسسة: ${orgLabel}`,
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
                        description: "البريد مسجل مسبقًا. استخدم بريدًا آخرًا.",
                    });
                } else {
                    toast({
                        variant: "destructive",
                        description: userErr.message || "تعذّر إنشاء الحساب.",
                    });
                }
                return;
            }

            await queryClient.invalidateQueries({ queryKey: ["organizations"] });
            await queryClient.invalidateQueries({ queryKey: ["org_admin_users"] });
            await queryClient.invalidateQueries({ queryKey: ["all_users"] });

            toast({
                description:
                    created?.id != null
                        ? `تم إنشاء حساب مدير المؤسسة. يمكنه تسجيل الدخول عبر البريد وكلمة المرور.`
                        : "تم الإنشاء.",
            });

            setAdminName("");
            setAdminEmail("");
            setPassword("");
            setPassword2("");
            setNewOrgName("");
            setNewOrgSlug("");
            setNewOrgDescription("");
            if (orgMode === "new") {
                setOrgMode("existing");
                setExistingOrgId(organizationId);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
            toast({ variant: "destructive", description: msg });
        } finally {
            setSubmitting(false);
        }
    }

    const activeOrganizations = organizations.filter((o: { is_active?: boolean }) => o.is_active);

    return (
        <div className="space-y-6">
            <Card className="border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <UserPlus className="h-5 w-5" />
                        إنشاء مدير مؤسسة (أدمن)
                    </CardTitle>
                    <CardDescription>
                        ينشئ مستخدمًا بدور ADMIN مربوطًا بمدرسة أو مؤسسة. يُنشأ حساب بدور ADMIN مع كلمة مرور؛ يمكن تسجيل الدخول من صفحة تسجيل الدخول باستخدام
                        البريد وكلمة المرور، دون ضرورة لكليرك.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                            <Label>المؤسسة</Label>
                            <RadioGroup
                                dir="rtl"
                                value={orgMode}
                                onValueChange={(v) => setOrgMode(v as "existing" | "new")}
                                className="flex flex-col gap-2"
                            >
                                <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer">
                                    <RadioGroupItem value="existing" id="org-existing" />
                                    <span className="flex-1 text-sm font-medium leading-none">
                                        ربط بمؤسسة موجودة
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer">
                                    <RadioGroupItem value="new" id="org-new" />
                                    <span className="flex-1 text-sm font-medium leading-none">
                                        إنشاء مؤسسة جديدة ثم ربط المدير
                                    </span>
                                </label>
                            </RadioGroup>

                            {orgMode === "existing" ? (
                                <div className="space-y-2 pt-1">
                                    {loadingOrgs ? (
                                        <Skeleton className="h-10 w-full" />
                                    ) : activeOrganizations.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            لا توجد مؤسسات بعد. اختر «إنشاء مؤسسة جديدة».
                                        </p>
                                    ) : (
                                        <Select
                                            value={existingOrgId || (activeOrganizations[0] as { id: string }).id}
                                            onValueChange={setExistingOrgId}
                                            dir="rtl"
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="المؤسسة" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {activeOrganizations.map((o: { id: string; name: string }) => (
                                                    <SelectItem key={o.id} value={o.id}>
                                                        {o.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="super-org-name">اسم المؤسسة</Label>
                                        <Input
                                            id="super-org-name"
                                            value={newOrgName}
                                            onChange={(e) => setNewOrgName(e.target.value)}
                                            placeholder="مدرسة / مركز ..."
                                            dir="rtl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="super-org-slug">المعرف اللاتيني (slug) — اختياري</Label>
                                        <Input
                                            id="super-org-slug"
                                            value={newOrgSlug}
                                            onChange={(e) => setNewOrgSlug(e.target.value)}
                                            placeholder="my-school-name"
                                            dir="ltr"
                                            className="text-left font-mono text-sm"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            لو ترك فارغًا يُولَّد تلقائيًا كي لا يتكرر.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>نوع المؤسسة</Label>
                                        <Select
                                            value={newOrgKind}
                                            onValueChange={(v) => setNewOrgKind(v as OrgKind)}
                                            dir="rtl"
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="BOTH">تعليمية اثرائية</SelectItem>
                                                <SelectItem value="EDUCATIONAL">تعليمية</SelectItem>
                                                <SelectItem value="ENRICHMENT">إثرائية</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>باقة الاشتراك</Label>
                                        <Select
                                            value={newOrgPackage}
                                            onValueChange={(v) => setNewOrgPackage(v as OrgPackage)}
                                            dir="rtl"
                                        >
                                            <SelectTrigger>
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
                                    </div>
                                    <div className="space-y-2">
                                        <Label>نوع الكيان</Label>
                                        <Select
                                            value={newOrgEntityType}
                                            onValueChange={(v) => setNewOrgEntityType(v as "SCHOOL" | "ORG")}
                                            dir="rtl"
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SCHOOL">مدرسة</SelectItem>
                                                <SelectItem value="ORG">مؤسسة</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label>صورة المؤسسة/المدرسة (رابط)</Label>
                                        <Input
                                            value={newOrgImageUrl}
                                            onChange={(e) => setNewOrgImageUrl(e.target.value)}
                                            dir="ltr"
                                            className="text-left font-mono text-sm"
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label>وصف المؤسسة/المدرسة</Label>
                                        <Input
                                            value={newOrgDescription}
                                            onChange={(e) => setNewOrgDescription(e.target.value)}
                                            placeholder="نبذة قصيرة تظهر في صفحة الجهة"
                                            dir="rtl"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 border-t pt-6">
                            <div className="space-y-2">
                                <Label htmlFor="super-admin-name">اسم مدير المؤسسة</Label>
                                <Input
                                    id="super-admin-name"
                                    value={adminName}
                                    onChange={(e) => setAdminName(e.target.value)}
                                    dir="rtl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="super-admin-email">البريد</Label>
                                <Input
                                    id="super-admin-email"
                                    type="email"
                                    dir="ltr"
                                    className="text-left font-mono text-sm"
                                    value={adminEmail}
                                    onChange={(e) => setAdminEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="super-admin-pass">كلمة المرور</Label>
                                <Input
                                    id="super-admin-pass"
                                    type="password"
                                    dir="ltr"
                                    className="text-left"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="super-admin-pass2">تأكيد كلمة المرور</Label>
                                <Input
                                    id="super-admin-pass2"
                                    type="password"
                                    dir="ltr"
                                    className="text-left"
                                    autoComplete="new-password"
                                    value={password2}
                                    onChange={(e) => setPassword2(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button type="submit" disabled={submitting} className="gap-2">
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    جاري الإنشاء…
                                </>
                            ) : (
                                <>
                                    <Building2 className="h-4 w-4" />
                                    إنشاء أدمن المؤسسة
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">أدمنو المؤسسات الحاليون</CardTitle>
                    <CardDescription>حسابات ADMIN المرتبطة بمؤسسة أو غير مرتبطة بعد.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingAdmins ? (
                        <Skeleton className="h-32 w-full" />
                    ) : existingAdmins.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            لم يُنشأ أي أدمن بعد.
                        </p>
                    ) : (
                        <Table dir="rtl">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">الاسم</TableHead>
                                    <TableHead className="text-right">البريد</TableHead>
                                    <TableHead className="text-right">المؤسسة</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(existingAdmins as any[]).map((row: any) => {
                                    const on = Array.isArray(row.organizations)
                                        ? row.organizations[0]
                                        : row.organizations;
                                    return (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-medium">{row.name}</TableCell>
                                            <TableCell className="font-mono text-xs" dir="ltr">
                                                {row.email}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {on?.name ??
                                                    (row.organization_id ? "(غير متاح الاسم)" : "غير مربوط")}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default CreateOrgAdminSection;
