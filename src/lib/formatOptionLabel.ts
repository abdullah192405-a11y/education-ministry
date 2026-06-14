import type { Language } from "@/lib/i18n/translations";

/** Format a zero-based option index as a 1-based display label (locale-aware numerals). */
export function formatOptionLabel(index: number, language: Language = "ar"): string {
    const value = index + 1;
    return language === "ar" ? value.toLocaleString("ar-EG") : String(value);
}
