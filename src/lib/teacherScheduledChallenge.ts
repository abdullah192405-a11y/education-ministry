/**
 * تحدٍ أُنشئ كـ «مجدول» (له موعد في قاعدة البيانات).
 * يُعرَض تحت «تحديات مجدولة» وليس «التحديات النشطة» حتى تُنهى الجلسة.
 */
export function isScheduledTeacherChallenge(c: {
    scheduledStartTime?: string | null;
    scheduledEndTime?: string | null;
    scheduled_start_time?: string | null;
    scheduled_end_time?: string | null;
}): boolean {
    const start = c.scheduledStartTime ?? c.scheduled_start_time;
    const end = c.scheduledEndTime ?? c.scheduled_end_time;
    return !!(String(start ?? "").trim() || String(end ?? "").trim());
}

/** جلسة تحدي مجدول من صف challenge_sessions (يدعم snake_case و camelCase من PostgREST) */
export function sessionHasScheduledFields(session: unknown): boolean {
    if (!session || typeof session !== "object") return false;
    const o = session as Record<string, unknown>;
    const start = o.scheduled_start_time ?? o.scheduledStartTime;
    const end = o.scheduled_end_time ?? o.scheduledEndTime;
    return !!(String(start ?? "").trim() || String(end ?? "").trim());
}
