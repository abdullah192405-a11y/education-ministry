/**
 * Parse Gemini (and similar) outputs into a JSON array of challenge items.
 * Handles markdown fences, prose around JSON, balanced brackets, and minor JSON glitches.
 */

import {
    normalizeAiMatchingItem,
    normalizeAiOrderItem,
    normalizePuzzleItem,
} from "@/lib/challengeItemNormalize";
import { normalizeWheelSegment, type WheelSegment } from "@/lib/wheelSegments";

const WHEEL_DEFAULT_LABELS = ["سهل", "متوسط", "صعب", "إضافي", "أسطوري", "تحدي"];
const WHEEL_DEFAULT_POINTS = [50, 100, 150, 200, 300, 500];

const AR_OPTION_MARKER =
    /(?:^|[\s,،])([أإابتثجحخدذرزسشصضطظعغفقكلمنهوي])(?:[\)\.\:：\-]|(?=\s))/g;
const EN_OPTION_MARKER = /(?:^|\n|\s)([A-D])(?:[\)\.\:]\s*|\s+)/gi;

function splitTextIntoQuestionBlocks(text: string): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const numbered = trimmed
        .split(/(?=(?:^|\n)\s*(?:\d+[\.\):、]|سؤال\s*\d*[:：]?|Question\s*\d*[:：]?))/i)
        .map((p) => p.trim())
        .filter((p) => p.length > 8);

    if (numbered.length > 1) return numbered;

    const byDoubleNewline = trimmed
        .split(/\n\s*\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 8);

    const hasOptionMarkers = (p: string) =>
        p.includes("؟") ||
        /(?:^|[\s,،])[أإابتثجحخدذرزسشصضطظعغفقكلمنهوي][\)\.\:：\-]/.test(p) ||
        /(?:^|\n|\s)[A-D][\)\.\:]/.test(p);

    if (byDoubleNewline.length > 1 && byDoubleNewline.filter(hasOptionMarkers).length >= 2) {
        return byDoubleNewline;
    }

    return [trimmed];
}

function extractOptionsFromText(body: string): { question: string; options: string[] } {
    const arMatches = [...body.matchAll(AR_OPTION_MARKER)];
    AR_OPTION_MARKER.lastIndex = 0;

    if (arMatches.length >= 2) {
        const question = body.slice(0, arMatches[0].index).trim().replace(/[:：]\s*$/, "");
        const options: string[] = [];
        for (let i = 0; i < arMatches.length; i++) {
            const start = (arMatches[i].index ?? 0) + arMatches[i][0].length;
            const end = i + 1 < arMatches.length ? arMatches[i + 1].index! : body.length;
            options.push(body.slice(start, end).trim().replace(/^[,،]\s*/, ""));
        }
        return { question, options };
    }

    const enMatches = [...body.matchAll(EN_OPTION_MARKER)];
    EN_OPTION_MARKER.lastIndex = 0;

    if (enMatches.length >= 2) {
        const question = body.slice(0, enMatches[0].index).trim();
        const options: string[] = [];
        for (let i = 0; i < enMatches.length; i++) {
            const start = (enMatches[i].index ?? 0) + enMatches[i][0].length;
            const end = i + 1 < enMatches.length ? enMatches[i + 1].index! : body.length;
            options.push(body.slice(start, end).trim());
        }
        return { question, options };
    }

    const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 3) {
        const question = lines[0].replace(/^(?:سؤال\s*\d*[:：]?\s*|Question\s*\d*[:：]?\s*)/i, "");
        const options = lines
            .slice(1)
            .map((l) => l.replace(/^(?:[أإابتثجحخدذرزسشصضطظعغفقكلمنهويA-D\d]+[\)\.\:：\-]\s*)/i, "").trim())
            .filter(Boolean);
        if (options.length >= 2) return { question, options };
    }

    return { question: body, options: [] };
}

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

export function normalizeAiChallengeItem(item: Record<string, unknown>): Record<string, unknown> {
    const type = String(item.type || "");
    if (type === "wheel_spin") return normalizeAiWheelSpinItem(item);
    if (type === "matching") return normalizeAiMatchingItem(item);
    if (type === "order_questions") return normalizeAiOrderItem(item);
    if (type === "puzzle") return normalizePuzzleItem(item);
    return item;
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
