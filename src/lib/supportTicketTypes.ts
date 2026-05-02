/** Keys stored in `support_tickets.ticket_type` */
export const SUPPORT_TICKET_TYPE_VALUES = [
    "TECHNICAL",
    "CONTENT",
    "ACCOUNT",
    "OTHER",
] as const;

export type SupportTicketTypeValue = (typeof SUPPORT_TICKET_TYPE_VALUES)[number];

export const SUPPORT_TICKET_TYPES: { value: SupportTicketTypeValue; label: string }[] = [
    { value: "TECHNICAL", label: "مشكلة تقنية" },
    { value: "CONTENT", label: "محتوى أو درس" },
    { value: "ACCOUNT", label: "حساب أو دخول" },
    { value: "OTHER", label: "أخرى" },
];

const EXTRA_TYPE_LABELS: Record<string, string> = {
    TEACHER_ADMIN: "طلب معلم للإدارة",
};

export function getSupportTicketTypeLabel(type: string | null | undefined): string {
    if (!type) return "—";
    const row = SUPPORT_TICKET_TYPES.find((t) => t.value === type);
    if (row) return row.label;
    return EXTRA_TYPE_LABELS[type] ?? type;
}
