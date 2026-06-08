/**
 * Parse Gemini (and similar) outputs into a JSON array of challenge items.
 * Handles markdown fences, prose around JSON, balanced brackets, and minor JSON glitches.
 */

import {
    extractOptionsFromText,
    splitTextIntoQuestionBlocks,
} from "@/lib/aiChallengeTextParsing";
import {
    normalizeAiMatchingItem,
    normalizeAiOrderItem,
    normalizeChallengeItemType,
    normalizeChoiceQuestionItem,
    normalizeOpenAnswerItem,
    normalizePuzzleItem,
    normalizeTrueFalseQuestionItem,
} from "@/lib/challengeItemNormalize";
import { normalizeWheelSegment, type WheelSegment } from "@/lib/wheelSegments";

const WHEEL_DEFAULT_LABELS = ["سهل", "متوسط", "صعب", "إضافي", "أسطوري", "تحدي"];
const WHEEL_DEFAULT_POINTS = [50, 100, 150, 200, 300, 500];

function parseWheelSegmentFromText(
    text: string
): Pick<WheelSegment, "question" | "options" | "correctAnswer"> & { label?: string } {
    const trimmed = text.trim();
    if (!trimmed) {
        return { question: "", options: ["", "", "", ""], correctAnswer: 0 };
    }

    let label: string | undefined;
    let body = trimmed;
    const labelMatch = body.match(/^([^:：?\n]{1,24})[:：\-]\s*(.+)$/s);
    if (labelMatch && labelMatch[2].trim().length > 5) {
        label = labelMatch[1].trim();
        body = labelMatch[2].trim();
    }

    const { question, options } = extractOptionsFromText(body);
    return {
        label,
        question: question || body,
        options: options.length >= 2 ? options : ["", "", "", ""],
        correctAnswer: 0,
    };
}

function rawToWheelSegment(raw: unknown, index: number): WheelSegment | null {
    if (typeof raw === "string") {
        const parsed = parseWheelSegmentFromText(raw);
        return normalizeWheelSegment({
            label: parsed.label || WHEEL_DEFAULT_LABELS[index % WHEEL_DEFAULT_LABELS.length],
            points: WHEEL_DEFAULT_POINTS[index % WHEEL_DEFAULT_POINTS.length],
            question: parsed.question,
            options: parsed.options,
            correctAnswer: parsed.correctAnswer,
        });
    }

    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const label = String(r.label ?? r.title ?? r.name ?? "").trim();
    const questionRaw = String(r.question ?? r.text ?? r.prompt ?? "").trim();
    const optionsRaw = r.options ?? r.choices ?? r.answers;
    let options: string[] = Array.isArray(optionsRaw)
        ? optionsRaw.map((o) => String(o ?? "").trim()).filter(Boolean)
        : [];

    let question = questionRaw;
    let correctAnswer =
        typeof r.correctAnswer === "number"
            ? r.correctAnswer
            : typeof r.correct_answer === "number"
              ? r.correct_answer
              : typeof r.answer === "number"
                ? r.answer
                : 0;

    if (options.length < 2 && question) {
        const parsed = parseWheelSegmentFromText(question);
        if (parsed.options.filter((o) => o.trim()).length >= 2) {
            question = parsed.question;
            options = parsed.options;
            correctAnswer = parsed.correctAnswer ?? 0;
        }
    }

    if (!question && label) question = label;

    return normalizeWheelSegment({
        label: label || WHEEL_DEFAULT_LABELS[index % WHEEL_DEFAULT_LABELS.length],
        points:
            typeof r.points === "number" && !Number.isNaN(r.points)
                ? r.points
                : WHEEL_DEFAULT_POINTS[index % WHEEL_DEFAULT_POINTS.length],
        question,
        options: options.length >= 2 ? options : ["", "", "", ""],
        correctAnswer,
    });
}

function expandBundledSegment(segment: WheelSegment, startIndex: number): WheelSegment[] {
    const blocks = splitTextIntoQuestionBlocks(segment.question);
    if (blocks.length <= 1) return [segment];

    return blocks.map((block, i) => {
        const parsed = parseWheelSegmentFromText(block);
        const idx = startIndex + i;
        return normalizeWheelSegment({
            label: segment.label
                ? blocks.length > 1
                    ? `${segment.label} ${i + 1}`
                    : segment.label
                : WHEEL_DEFAULT_LABELS[idx % WHEEL_DEFAULT_LABELS.length],
            points: segment.points || WHEEL_DEFAULT_POINTS[idx % WHEEL_DEFAULT_POINTS.length],
            question: parsed.question,
            options: parsed.options,
            correctAnswer: parsed.correctAnswer ?? 0,
        });
    });
}

/** Fix AI wheel_spin items that bundle many Q&A into one element or segment. */
export function normalizeAiWheelSpinItem(item: Record<string, unknown>): Record<string, unknown> {
    const rawTitle = String(item.question || "").trim();
    const rawSegments = item.wheelSegments ?? item.wheel_segments ?? item.segments ?? item.items;
    const topOptions = Array.isArray(item.options)
        ? item.options.map((v) => String(v ?? "").trim()).filter(Boolean)
        : [];

    let segments: WheelSegment[] = [];

    if (Array.isArray(rawSegments) && rawSegments.length > 0) {
        for (let i = 0; i < rawSegments.length; i++) {
            const seg = rawToWheelSegment(rawSegments[i], i);
            if (seg) segments.push(seg);
        }
    } else if (topOptions.length > 0) {
        segments = topOptions
            .map((opt, i) => rawToWheelSegment(opt, i))
            .filter((s): s is WheelSegment => s !== null);
    } else if (rawTitle) {
        segments = splitTextIntoQuestionBlocks(rawTitle)
            .map((block, i) => rawToWheelSegment(block, i))
            .filter((s): s is WheelSegment => s !== null);
    }

    const expanded: WheelSegment[] = [];
    let idx = 0;
    for (const seg of segments) {
        const parts = expandBundledSegment(seg, idx);
        expanded.push(...parts);
        idx += parts.length;
    }
    segments = expanded;

    if (segments.length <= 1 && rawTitle.length > 40) {
        const titleBlocks = splitTextIntoQuestionBlocks(rawTitle);
        if (titleBlocks.length > 1) {
            segments = titleBlocks
                .map((block, i) => rawToWheelSegment(block, i))
                .filter((s): s is WheelSegment => s !== null);
        }
    }

    segments = segments
        .map((seg, i) => {
            const opts = (seg.options ?? []).map((o) => String(o).trim()).filter(Boolean);
            const parsed =
                opts.length < 2 && seg.question ? parseWheelSegmentFromText(seg.question) : null;
            return normalizeWheelSegment({
                ...seg,
                label: seg.label?.trim() || WHEEL_DEFAULT_LABELS[i % WHEEL_DEFAULT_LABELS.length],
                points: seg.points || WHEEL_DEFAULT_POINTS[i % WHEEL_DEFAULT_POINTS.length],
                question: parsed?.question || seg.question,
                options:
                    parsed && parsed.options.filter((o) => o.trim()).length >= 2
                        ? parsed.options
                        : opts.length >= 2
                          ? opts
                          : ["", "", "", ""],
                correctAnswer: parsed?.correctAnswer ?? seg.correctAnswer ?? 0,
            });
        })
        .filter((s) => s.question.trim() || s.label.trim())
        .slice(0, 6);

    const wheelTitle =
        rawTitle.length > 120 && segments.length > 1
            ? "أدر العجلة لتحديد سؤالك!"
            : rawTitle || "أدر العجلة لتحديد سؤالك!";

    return {
        ...item,
        type: "wheel_spin",
        question: wheelTitle,
        wheelSegments: segments,
        options: undefined,
    };
}

function getChoiceOptionsFromItem(item: Record<string, unknown>): string[] {
    for (const key of ["options", "choices", "answers"] as const) {
        const raw = item[key];
        if (Array.isArray(raw) && raw.length > 0) {
            return raw.map((o) => String(o ?? "").trim()).filter(Boolean);
        }
    }
    return [];
}

function normalizeAiChoiceFromBundledText(item: Record<string, unknown>): Record<string, unknown> {
    const question = String(item.question || "").trim();
    let options = getChoiceOptionsFromItem(item);

    if (options.length < 2 && question) {
        const parsed = extractOptionsFromText(question);
        if (parsed.options.filter((o) => o.trim()).length >= 2) {
            return {
                ...item,
                question: parsed.question.trim() || question,
                options: parsed.options,
            };
        }
    }

    if (options.length >= 2) {
        return { ...item, options };
    }

    return item;
}

export function normalizeAiChallengeItem(item: Record<string, unknown>): Record<string, unknown> {
    const rawType = String(item.type || "").trim();
    const normalizedType = normalizeChallengeItemType(rawType);

    const withType = normalizedType ? { ...item, type: normalizedType } : item;

    if (normalizedType === "wheel_spin") return normalizeAiWheelSpinItem(withType);
    if (normalizedType === "matching") return normalizeAiMatchingItem(withType);
    if (normalizedType === "order_questions") return normalizeAiOrderItem(withType);
    if (normalizedType === "puzzle") return normalizePuzzleItem(withType);
    if (normalizedType === "multiple_choice" || normalizedType === "shooting") {
        return normalizeAiChoiceFromBundledText(withType);
    }
    return withType;
}

export type NormalizeGeneratedChallengeItemOptions = {
    language?: "ar" | "en";
    trueLabel?: string;
    falseLabel?: string;
    qaFallbackAnswer?: (question: string) => string;
    qaFallbackExplanation?: string;
};

/** Normalize AI-generated items so correct answers match what the editor and DB expect. */
export function normalizeGeneratedChallengeItems(
    items: Record<string, unknown>[],
    options: NormalizeGeneratedChallengeItemOptions = {}
): Record<string, unknown>[] {
    return items.map((item) => {
        const normalized = normalizeAiChallengeItem(item);
        const type = String(normalized.type || "").toLowerCase();
        const question = String(normalized.question || "").trim();
        const explanation = String(normalized.explanation || "").trim();
        const rawAnswer =
            normalized.correctAnswer ?? normalized.correct_answer ?? normalized.answer;
        const answerAsText = typeof rawAnswer === "string" ? rawAnswer.trim() : "";
        const itemOptions = Array.isArray(normalized.options)
            ? normalized.options.map((value) => String(value ?? "").trim()).filter(Boolean)
            : [];
        const orderItems = Array.isArray(normalized.orderItems)
            ? normalized.orderItems.map((value) => String(value ?? "").trim()).filter(Boolean)
            : [];

        if (type === "wheel_spin" || type === "matching" || type === "puzzle") {
            return normalized;
        }

        if (type === "qa" || type === "know_dont_know") {
            const fallbackAnswer = explanation || options.qaFallbackAnswer?.(question) || "";
            const open = normalizeOpenAnswerItem(normalized, fallbackAnswer);
            return {
                ...open,
                correctAnswer: answerAsText || open.correctAnswer,
                explanation: explanation || options.qaFallbackExplanation || open.explanation,
            };
        }

        if (type === "true_false") {
            return normalizeTrueFalseQuestionItem(normalized, {
                true: options.trueLabel,
                false: options.falseLabel,
            });
        }

        if (type === "order_questions") {
            const fromAnswerText = answerAsText
                ? answerAsText.split(/\n|،|,|>/).map((value) => value.trim()).filter(Boolean)
                : [];
            const normalizedOrder = orderItems.length > 1
                ? orderItems
                : itemOptions.length > 1
                    ? itemOptions
                    : fromAnswerText;
            return {
                ...normalized,
                orderItems: normalizedOrder,
            };
        }

        if (type === "shooting") {
            return normalizeChoiceQuestionItem(normalized, 4);
        }

        if (type === "multiple_choice") {
            return normalizeChoiceQuestionItem(normalized);
        }

        return normalized;
    });
}

function stripBom(s: string): string {
    return s.replace(/^\uFEFF/, "").trim();
}

function stripCodeFenceBlocks(text: string): string[] {
    const blocks: string[] = [];
    const re = /```(?:json)?\s*([\s\S]*?)```/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        const inner = m[1].trim();
        if (inner.length > 0) blocks.push(inner);
    }
    return blocks;
}

function extractBalanced(
    text: string,
    open: "[" | "{",
    close: "]" | "}"
): string | null {
    const start = text.indexOf(open);
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < text.length; i++) {
        const c = text[i];
        if (inString) {
            if (escape) {
                escape = false;
            } else if (c === "\\") {
                escape = true;
            } else if (c === '"') {
                inString = false;
            }
        } else {
            if (c === '"') {
                inString = true;
            } else if (c === open) {
                depth++;
            } else if (c === close) {
                depth--;
                if (depth === 0) {
                    return text.slice(start, i + 1);
                }
            }
        }
    }
    return null;
}

/** Remove trailing commas before } or ] (invalid JSON but common in model output). */
function relaxTrailingCommas(json: string): string {
    let s = json;
    let prev = "";
    while (s !== prev) {
        prev = s;
        s = s.replace(/,(\s*[}\]])/g, "$1");
    }
    return s;
}

function normalizeToArray(parsed: unknown): unknown[] {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
        const o = parsed as Record<string, unknown>;
        const nested = o.questions ?? o.games ?? o.items ?? o.data ?? o.results ?? o.challenges;
        if (Array.isArray(nested)) return nested;
        const numericKeys = Object.keys(o).filter((k) => /^\d+$/.test(k));
        if (numericKeys.length > 0) {
            return numericKeys
                .sort((a, b) => Number(a) - Number(b))
                .map((k) => o[k]);
        }
    }
    return [];
}

function uniqueCandidates(list: (string | null | undefined)[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of list) {
        if (!raw) continue;
        const t = raw.trim();
        if (t.length === 0 || seen.has(t)) continue;
        seen.add(t);
        out.push(t);
    }
    return out;
}

/**
 * @throws Error with Arabic message if no valid non-empty array could be parsed
 */
export function parseAiGeneratedChallengeItems(responseText: string): Record<string, unknown>[] {
    const trimmed = stripBom(responseText);
    if (!trimmed) {
        throw new Error("فشل في تحليل الأسئلة المولدة");
    }

    const fromFences = stripCodeFenceBlocks(trimmed);
    const balancedArray = extractBalanced(trimmed, "[", "]");
    const balancedObject = extractBalanced(trimmed, "{", "}");

    const candidates = uniqueCandidates([
        ...fromFences,
        balancedArray,
        balancedObject,
        trimmed,
    ]);

    const errors: string[] = [];

    for (let raw of candidates) {
        raw = relaxTrailingCommas(raw.trim());
        try {
            const parsed = JSON.parse(raw) as unknown;
            const items = normalizeToArray(parsed);
            if (items.length > 0) {
                return items as Record<string, unknown>[];
            }
        } catch (e) {
            errors.push(e instanceof Error ? e.message : String(e));
        }
    }

    console.error("[parseAiGeneratedChallengeItems] failed", { preview: trimmed.slice(0, 400), errors });
    throw new Error("فشل في تحليل الأسئلة المولدة");
}
