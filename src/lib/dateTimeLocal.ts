const pad = (n: number) => String(n).padStart(2, "0");

/** Serialize a Date to the `datetime-local` shape (`YYYY-MM-DDTHH:mm`) in local time. */
export function toDateTimeLocalValue(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse a `datetime-local` string as local time (never UTC, unlike `new Date("...")` on some inputs). */
export function parseDateTimeLocalValue(value?: string | null): Date | null {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value);
    if (match) {
        const parsed = new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
            Number(match[4]),
            Number(match[5]),
        );
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/** Round up to the next `step` minutes so "now" never lands in the past by the time it is saved. */
export function roundUpToMinuteStep(date: Date, step: number): Date {
    const rounded = new Date(date);
    rounded.setSeconds(0, 0);
    const remainder = rounded.getMinutes() % step;
    if (remainder !== 0) rounded.setMinutes(rounded.getMinutes() + (step - remainder));
    return rounded;
}
