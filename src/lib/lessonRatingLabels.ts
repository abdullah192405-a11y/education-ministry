import type { ReportLanguage } from "./challengeReportLabels";
import type { TopicLessonRatingSummary } from "./topicRatingStats";

export const LESSON_RATING_VALUES = [1, 2, 3, 4, 5] as const;

const LESSON_RATING_LABELS: Record<ReportLanguage, Record<number, string>> = {
    ar: {
        1: "سيء جداً",
        2: "غير راضٍ",
        3: "محايد",
        4: "جيد",
        5: "ممتاز",
    },
    en: {
        1: "Very poor",
        2: "Dissatisfied",
        3: "Neutral",
        4: "Good",
        5: "Excellent",
    },
};

export function getLessonRatingLabel(value: number, language: ReportLanguage = "ar"): string {
    const lang = language === "en" ? "en" : "ar";
    return LESSON_RATING_LABELS[lang][value] ?? LESSON_RATING_LABELS.ar[value] ?? String(value);
}

export function getLessonRatingOptions(language: ReportLanguage = "ar") {
    const emojis: Record<number, string> = {
        1: "\u{1F620}",
        2: "\u{1F61E}",
        3: "\u{1F610}",
        4: "\u{1F604}",
        5: "\u{1F929}",
    };
    return LESSON_RATING_VALUES.map((value) => ({
        value,
        emoji: emojis[value],
        label: getLessonRatingLabel(value, language),
    }));
}

export function localizeLessonRatingSummary(
    summary: TopicLessonRatingSummary,
    language: ReportLanguage = "ar"
): TopicLessonRatingSummary {
    return {
        ...summary,
        distribution: summary.distribution.map((row) => ({
            ...row,
            label: getLessonRatingLabel(row.value, language),
        })),
    };
}
