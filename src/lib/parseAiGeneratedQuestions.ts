/**
 * Parse Gemini (and similar) outputs into a JSON array of challenge items.
 * Handles markdown fences, prose around JSON, balanced brackets, and minor JSON glitches.
 */

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
