import { LESSON_RATING_OPTIONS } from "@/components/LessonEmojiRating";

export type TopicLessonRatingSummary = {
    total: number;
    average: number;
    distribution: Array<{
        value: number;
        emoji: string;
        label: string;
        count: number;
        percent: number;
    }>;
};

export function aggregateTopicLessonRatings(
    ratings: Array<{ rating?: number | null }> | null | undefined
): TopicLessonRatingSummary {
    const list = (ratings || []).filter((r) => {
        const n = Number(r.rating);
        return Number.isFinite(n) && n >= 1 && n <= 5;
    });

    const total = list.length;
    const average =
        total > 0
            ? list.reduce((sum, r) => sum + Number(r.rating), 0) / total
            : 0;

    const distribution = LESSON_RATING_OPTIONS.map((option) => {
        const count = list.filter((r) => Number(r.rating) === option.value).length;
        return {
            value: option.value,
            emoji: option.emoji,
            label: option.label,
            count,
            percent: total > 0 ? Math.round((count / total) * 100) : 0,
        };
    });

    return { total, average, distribution };
}
