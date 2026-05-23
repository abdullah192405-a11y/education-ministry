/** Keys stored in `support_tickets.ticket_type` */
export const SUPPORT_TICKET_TYPE_VALUES = [
    "TECHNICAL",
    "CONTENT",
    "ACCOUNT",
    "OTHER",
] as const;

export type SupportTicketTypeValue = (typeof SUPPORT_TICKET_TYPE_VALUES)[number];

const AR_LABELS: Record<string, string> = {
    TECHNICAL: "مشكلة تقنية",
    CONTENT: "محتوى أو درس",
    ACCOUNT: "حساب أو دخول",
    OTHER: "أخرى",
    TEACHER_ADMIN: "طلب معلم للإدارة",
};

const EN_LABELS: Record<string, string> = {
    TECHNICAL: "Technical issue",
    CONTENT: "Content or lesson",
    ACCOUNT: "Account or login",
    OTHER: "Other",
    TEACHER_ADMIN: "Teacher request to admin",
};

export const SUPPORT_TICKET_TYPES: { value: SupportTicketTypeValue; label: string }[] = [
    { value: "TECHNICAL", label: AR_LABELS.TECHNICAL },
    { value: "CONTENT", label: AR_LABELS.CONTENT },
    { value: "ACCOUNT", label: AR_LABELS.ACCOUNT },
    { value: "OTHER", label: AR_LABELS.OTHER },
];

export function getSupportTicketTypeLabel(
    type: string | null | undefined,
    language: "ar" | "en" = "ar",
): string {
    if (!type) return "—";
    const table = language === "en" ? EN_LABELS : AR_LABELS;
    return table[type] ?? type;
}
