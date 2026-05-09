/**
 * Roles:
 * - SUPERADMIN — من يدير اشتراك المؤسسات؛ لا يدار من لوحة الأدمن.
 * - ADMIN — مدير مدرسة أو مؤسسة. يمكن أن يوجد **عدد غير محدود** من صفوف users بدور ADMIN
 *   (عدة مدارس = عدة مؤسسات، ويمكن عدة مدراء لنفس المؤسسة إن ربطتهم بذات organization_id).
 *   عند تعيين organization_id تُقيَّد لوحة الأدمن على مستخدمي تلك المؤسسة فقط.
 *
 * Subscription model (باقات الاشتراك):
 * 1) أفراد — INDIVIDUAL_FREE: محتوى إثرائي، بدون أدوات رقابة وتتبع
 * 2) مؤسسات INSTITUTION_ADMIN_STUDENT — أدمن + طالب
 * 3) مؤسسات INSTITUTION_FULL — أدمن + معلم + طالب
 */

export type OrgSubscriptionPackage = "INSTITUTION_ADMIN_STUDENT" | "INSTITUTION_FULL";
export type IndividualTier = "INDIVIDUAL_FREE";
export type OrganizationKind = "EDUCATIONAL" | "ENRICHMENT" | "BOTH";

export type OrganizationRow = {
    id: string;
    name: string;
    slug: string;
    kind: OrganizationKind;
    subscription_package: OrgSubscriptionPackage;
    is_active?: boolean;
};

export type UserRow = {
    role?: string | null;
    organization_id?: string | null;
    individual_tier?: IndividualTier | null;
    organizations?: OrganizationRow | OrganizationRow[] | null;
};

export function normalizeOrganization(user: UserRow | null | undefined): OrganizationRow | null {
    if (!user?.organizations) return null;
    const o = user.organizations;
    return Array.isArray(o) ? o[0] ?? null : o;
}

export function isSuperadmin(user: UserRow | null | undefined): boolean {
    const r = user?.role?.toUpperCase();
    return r === "SUPERADMIN";
}

/** مدير مؤسسة/مدرسة (دور ADMIN). */
export function isOrgAdminRole(user: UserRow | null | undefined): boolean {
    const r = user?.role?.toUpperCase();
    return r === "ADMIN" || user?.role === "مسؤول";
}

/** عند وجود UUID: لوحة الأدمن تُقيِّد الطلاب/المعلمين بهذه المؤسسة؛ NULL = لا صلاحية بيانات مؤسسات حتى الربط. */
export function orgAdminScopedOrganizationId(user: UserRow | null | undefined): string | undefined {
    if (!isOrgAdminRole(user)) return undefined;
    const oid = user?.organization_id;
    return typeof oid === "string" && oid.length > 0 ? oid : undefined;
}

export function isOrgTenantAdmin(user: UserRow | null | undefined): boolean {
    return isOrgAdminRole(user) && !!user?.organization_id;
}

/** باقة الأفراد (مجاني، بدون رقابة/تتبع) */
export function isIndividualFreeTier(user: UserRow | null | undefined): boolean {
    return user?.individual_tier === "INDIVIDUAL_FREE";
}

/** أدوات الرقابة والتتبع (تقارير، تحليلات تفصيلية، إلخ) — معطّلة للأفراد في INDIVIDUAL_FREE */
export function hasMonitoringAndTracking(user: UserRow | null | undefined): boolean {
    if (isSuperadmin(user)) return true;
    if (isIndividualFreeTier(user)) return false;
    if (user?.organization_id && normalizeOrganization(user)?.subscription_package) return true;
    // ADMIN بدون مؤسسة لا يملك صلاحيات تتبع/رقابة حتى يتم ربطه بمؤسسة.
    return false;
}

/** هل يمكن لهذه المؤسسة امتلاك حسابات معلمين؟ (باقة ٣ فقط). بلا مؤسسة = سلوك المنصة العامة (كل الأدوار). */
export function orgAllowsTeachers(org: OrganizationRow | null | undefined): boolean {
    if (org == null) return true;
    return org.subscription_package === "INSTITUTION_FULL";
}

/** الأدوار المسموح إنشاؤها ضمن المؤسسة */
export function allowedRolesForOrganization(org: OrganizationRow | null | undefined): ("ADMIN" | "TEACHER" | "STUDENT")[] {
    if (!org?.subscription_package) return ["ADMIN", "TEACHER", "STUDENT"];
    if (org.subscription_package === "INSTITUTION_ADMIN_STUDENT") return ["ADMIN", "STUDENT"];
    return ["ADMIN", "TEACHER", "STUDENT"];
}
