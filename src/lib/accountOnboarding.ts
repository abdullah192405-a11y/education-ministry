export type EntityType = "SCHOOL" | "ORG";

export type OrgPackage = "INSTITUTION_ADMIN_STUDENT" | "INSTITUTION_FULL";

const PACKAGE_LABELS: Record<OrgPackage, string> = {
    INSTITUTION_ADMIN_STUDENT: "أدمن + طالب",
    INSTITUTION_FULL: "أدمن + معلم + طالب",
};

export function getPackageLabel(pkg: OrgPackage): string {
    return PACKAGE_LABELS[pkg];
}

export function getEntityTypeLabel(entityType: EntityType): string {
    return entityType === "SCHOOL" ? "مدرسة" : "مؤسسة";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
    return EMAIL_RE.test(email.trim().toLowerCase());
}

/** Reads phone stored in users.details as `واتساب: 9665…` */
export function parseWhatsAppFromDetails(details: string | null | undefined): string | null {
    if (!details) return null;
    const m = details.match(/واتساب:\s*(\d+)/);
    return m?.[1] ?? null;
}

export function formatPhoneHint(phone: string | null): string | null {
    if (!phone) return null;
    if (phone.startsWith("966") && phone.length >= 12) {
        return `0${phone.slice(3)}`;
    }
    return phone;
}

/** Generates a readable temporary password (no ambiguous chars). */
export function generateTemporaryPassword(length = 10): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const size = Math.max(8, Math.min(length, 16));
    try {
        const bytes = new Uint8Array(size);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => chars[b % chars.length]).join("");
    } catch {
        let out = "";
        for (let i = 0; i < size; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return out;
    }
}

/** Normalizes Saudi / international numbers for wa.me (digits only, 966…). */
export function normalizeWhatsAppPhone(input: string): string | null {
    const digits = input.replace(/\D/g, "");
    if (!digits) return null;
    if (digits.startsWith("966") && digits.length >= 12) return digits.slice(0, 15);
    if (digits.startsWith("0") && digits.length >= 10) return `966${digits.slice(1)}`;
    if (digits.length === 9 && digits.startsWith("5")) return `966${digits}`;
    if (digits.length >= 10 && digits.length <= 15) return digits;
    return null;
}

export function getAppLoginUrl(): string {
    if (typeof window !== "undefined" && window.location?.origin) {
        return `${window.location.origin}/login`;
    }
    return "/login";
}

export type OrgAdminWelcomeParams = {
    adminName: string;
    orgName: string;
    entityType: EntityType;
    email: string;
    password: string;
    packageLabel: string;
};

export function buildOrgAdminWelcomeMessage(p: OrgAdminWelcomeParams): string {
    const entity = getEntityTypeLabel(p.entityType);
    return [
        `مرحبًا ${p.adminName}،`,
        "",
        `تم تفعيل حسابكم كمدير ${entity} «${p.orgName}» على منصة Lab4.`,
        `الباقة: ${p.packageLabel}`,
        "",
        "بيانات الدخول:",
        `البريد: ${p.email}`,
        `كلمة المرور: ${p.password}`,
        "",
        `رابط تسجيل الدخول:\n${getAppLoginUrl()}`,
        "",
        "يُرجى تغيير كلمة المرور بعد أول دخول. للدعم تواصل مع فريق Lab4.",
    ].join("\n");
}

export function buildOrgAdminApprovedMessage(p: {
    adminName: string;
    orgName: string;
    email: string;
}): string {
    return [
        `مرحبًا ${p.adminName}،`,
        "",
        `تمت الموافقة على اشتراك «${p.orgName}» في منصة Lab4.`,
        "",
        "يمكنكم تسجيل الدخول بالبريد وكلمة المرور التي اخترتموها عند التسجيل:",
        `البريد: ${p.email}`,
        "",
        `رابط تسجيل الدخول:\n${getAppLoginUrl()}`,
    ].join("\n");
}

export function buildOrgAdminLoginReminderMessage(p: {
    adminName: string;
    orgName: string;
    email: string;
}): string {
    return [
        `مرحبًا ${p.adminName}،`,
        "",
        `تذكير ببيانات الدخول لمنصة Lab4 — ${p.orgName}:`,
        `البريد: ${p.email}`,
        "",
        `رابط تسجيل الدخول:\n${getAppLoginUrl()}`,
        "",
        "إذا نسيت كلمة المرور تواصل مع فريق الدعم لإعادة التعيين.",
    ].join("\n");
}

export function openWhatsAppShare(opts: { phone?: string | null; message: string }): void {
    const text = encodeURIComponent(opts.message);
    const url = opts.phone
        ? `https://wa.me/${opts.phone}?text=${text}`
        : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
