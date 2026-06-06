import type { ChallengeQuestion } from "@/data/challengeTypes";

export type WheelSegment = NonNullable<ChallengeQuestion["wheelSegments"]>[number];

export type WheelSubQuestion = {
    id: number;
    question: string;
    correctAnswer: number;
    options: string[];
    points: number;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
};

const trimUrl = (v: unknown): string | undefined => {
    const s = typeof v === "string" ? v.trim() : "";
    return s || undefined;
};

/** Normalize wheel segment JSON from DB or editor (supports snake_case media fields). */
export function normalizeWheelSegment(raw: unknown): WheelSegment {
    const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const options = Array.isArray(s.options) ? s.options.map((o) => String(o ?? "")) : [];
    const correctRaw = s.correctAnswer ?? s.correct_answer;
    const correctAnswer =
        typeof correctRaw === "number" && !Number.isNaN(correctRaw)
            ? correctRaw
            : Number(correctRaw);

    return {
        label: String(s.label ?? "").trim(),
        points: typeof s.points === "number" && !Number.isNaN(s.points) ? s.points : Number(s.points) || 0,
        question: String(s.question ?? ""),
        options,
        correctAnswer: Number.isNaN(correctAnswer) ? 0 : correctAnswer,
        imageUrl: trimUrl(s.imageUrl ?? s.image_url),
        videoUrl: trimUrl(s.videoUrl ?? s.video_url),
        audioUrl: trimUrl(s.audioUrl ?? s.audio_url),
    };
}

export function normalizeWheelSegments(raw: unknown): WheelSegment[] {
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeWheelSegment);
}

/** Labels drawn on the wheel (never undefined). */
export function getWheelLabels(segments: WheelSegment[] | undefined, legacyOptions?: string[]): string[] {
    if (segments?.length) {
        return segments.map((segment, index) => segment.label?.trim() || `#${index + 1}`);
    }
    return (legacyOptions ?? []).map((option, index) => String(option ?? "").trim() || `#${index + 1}`);
}

/** Build the sub-question shown after the wheel lands on a segment. */
export function buildWheelSubQuestion(segment: WheelSegment): WheelSubQuestion {
    const filledOptions = (segment.options ?? []).filter((option) => option.trim() !== "");
    return {
        id: Date.now(),
        question: segment.question || "",
        correctAnswer: segment.correctAnswer ?? 0,
        options: filledOptions.length > 0 ? filledOptions : ["استمرار"],
        points: segment.points ?? 100,
        imageUrl: segment.imageUrl,
        videoUrl: segment.videoUrl,
        audioUrl: segment.audioUrl,
    };
}
