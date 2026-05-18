import { getLevelFromScore, type SinglePlayerResult } from "@/data/challengeTypes";

/** Emoji via \\u escapes so the bundle stays ASCII-safe and WhatsApp gets valid UTF-8. */
const E = {
    party: "\u{1F38A}",
    sparkles: "\u{2728}",
    books: "\u{1F4DA}",
    target: "\u{1F3AF}",
    trophy: "\u{1F3C6}",
    star: "\u{2B50}",
    muscle: "\u{1F4AA}",
    gem: "\u{1F48E}",
    check: "\u{2705}",
    glowStar: "\u{1F31F}",
    cross: "\u{274C}",
    timer: "\u{23F1}\u{FE0F}",
    fire: "\u{1F525}",
    medal: "\u{1F3C5}",
    rocket: "\u{1F680}",
    cool: "\u{1F60E}",
    pointDown: "\u{1F447}",
    link: "\u{1F517}",
} as const;

const LINE = "\u2501".repeat(16);

export type ChallengeShareMessageInput = {
    topicTitle?: string | null;
    /** Public challenge entry URL (not the in-game / results page). */
    challengeUrl?: string;
    results: Pick<
        SinglePlayerResult,
        | "percentage"
        | "score"
        | "maxScore"
        | "correctAnswers"
        | "wrongAnswers"
        | "totalQuestions"
        | "timeTaken"
        | "longestStreak"
        | "badges"
    >;
};

function scoreEmoji(percentage: number): string {
    if (percentage >= 90) return E.trophy;
    if (percentage >= 75) return E.star;
    return E.muscle;
}

/** Map badge slug to \\u escapes — avoids broken icons from DB encoding. */
function badgeIconForShare(badge: { id?: string }): string {
    const slugIcons: Record<string, string> = {
        perfect: E.trophy,
        expert: E.trophy,
        learner: E.books,
        lightning: "\u{26A1}",
        streak: E.fire,
        quick_learner: "\u{1F9E0}",
        first_try: E.glowStar,
        improver: "\u{1F4C8}",
        persistent: E.muscle,
    };
    return (badge.id && slugIcons[badge.id]) || E.medal;
}

export function buildSingleChallengeShareUrl(params: {
    gradeId: string;
    subjectId: string;
    topicId: string;
    category: string;
    origin?: string;
}): string {
    const origin =
        params.origin ??
        (typeof window !== "undefined" ? window.location.origin : "");
    const gradeSegment = encodeURIComponent(params.gradeId);
    return `${origin}/grade/${gradeSegment}/subject/${params.subjectId}/topic/${params.topicId}/challenge/single/${params.category}`;
}

export function buildChallengeShareMessage({
    topicTitle,
    challengeUrl,
    results,
}: ChallengeShareMessageInput): string {
    const level = getLevelFromScore(results.percentage);

    return [
        `${E.party}${E.sparkles} *تحدي Lab4 — نتيجتي الرائعة!* ${E.sparkles}${E.party}`,
        LINE,
        `${E.books} *الدرس:* ${topicTitle || "تحدي عام"}`,
        `${E.target} *النتيجة:* *${results.percentage}%* ${scoreEmoji(results.percentage)}`,
        `${level.emoji} *المستوى:* ${level.level}`,
        `${E.gem} *النقاط:* ${results.score} من ${results.maxScore}`,
        `${E.check}${E.glowStar} *صحيح:* ${results.correctAnswers} من ${results.totalQuestions}`,
        `${E.cross} *خاطئ:* ${results.wrongAnswers}`,
        `${E.timer} *الوقت:* ${Math.round(results.timeTaken)} ثانية`,
        results.longestStreak >= 2
            ? `${E.fire}${E.fire} *سلسلة نارية:* ${results.longestStreak} إجابات متتالية!`
            : null,
        results.badges.length > 0
            ? `${E.medal} *شارات:* ${results.badges
                  .map((b) => `${badgeIconForShare({ id: b.id })} ${b.name}`)
                  .join(" \u00B7 ")}`
            : null,
        LINE,
        `${E.rocket} هل تستطيع تحطيم رقمي؟ ${E.cool}${E.pointDown}`,
        challengeUrl ? `${E.link} *رابط التحدي:*` : null,
        challengeUrl ?? null,
    ]
        .filter(Boolean)
        .join("\n");
}

export function openWhatsAppShare(text: string): void {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
}
