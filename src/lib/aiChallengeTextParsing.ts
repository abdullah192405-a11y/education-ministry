/**
 * Parse bundled AI text into structured challenge fields (options, pairs, order items).
 * Used when models put multiple Q&A or game data in a single string field.
 */

export type ParsedMatchingPair = { left: string; right: string };

const AR_OPTION_MARKER =
    /(?:^|[\s,،])([أإابتثجحخدذرزسشصضطظعغفقكلمنهوي])(?:[\)\.\:：\-]|(?=\s))/g;
const EN_OPTION_MARKER = /(?:^|\n|\s)([A-D])(?:[\)\.\:]\s*|\s+)/gi;

const COLUMN_HEADER =
    /^(?:العمود\s*(?:الأول|الثاني|الأيسر|الأيمن)?|column\s*[ab12]?|left\s*column|right\s*column|اليسار|اليمين|left|right)\s*[:：]?\s*$/i;

const FIRST_COLUMN_HEADER =
    /(?:^|\n)\s*(?:العمود\s*(?:الأول|الأيسر)|column\s*a|left\s*(?:column)?|اليسار|left)\s*[:：]?\s*\n/i;

const SECOND_COLUMN_SPLIT =
    /\n\s*(?:العمود\s*(?:الثاني|الأيمن)|column\s*b|right\s*(?:column)?|اليمين|right)\s*[:：]?\s*\n/i;

const PAIR_LINE_SPLITTERS: RegExp[] = [
    /\s+[-–—]\s+/,
    /\s*[:：]\s*/,
    /\s*→\s*/,
    /\s*⟶\s*/,
    /\s*➔\s*/,
    /\s*=>\s*/,
    /\s*=\s+/,
    /\t+/,
];

export function splitTextIntoQuestionBlocks(text: string): string[] {
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

export function extractOptionsFromText(body: string): { question: string; options: string[] } {
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

function cleanLine(line: string): string {
    return line
        .replace(/^\d+[\.\):、]\s*/, "")
        .replace(/^[•\-–]\s*/, "")
        .replace(/^(?:[أإابتثجحخدذرزسشصضطظعغفقكلمنهويA-D])[\)\.\:：\-]\s*/i, "")
        .trim();
}

function splitPairParts(line: string): [string, string] | null {
    const trimmed = cleanLine(line);
    if (!trimmed) return null;

    for (const sep of PAIR_LINE_SPLITTERS) {
        const match = trimmed.match(sep);
        if (!match || match.index === undefined || match.index <= 0) continue;
        const left = trimmed.slice(0, match.index).trim();
        const right = trimmed.slice(match.index + match[0].length).trim();
        if (left && right) return [left, right];
    }

    const pipeParts = trimmed.split(/\s*\|\s*/);
    if (pipeParts.length === 2) {
        const left = pipeParts[0].trim();
        const right = pipeParts[1].trim();
        if (left && right) return [left, right];
    }

    return null;
}

export function parsePairFromLine(line: string): ParsedMatchingPair | null {
    const trimmed = cleanLine(line);
    if (!trimmed || COLUMN_HEADER.test(trimmed)) return null;

    const parts = splitPairParts(trimmed);
    if (!parts) return null;

    const [left, right] = parts;
    if (left.length > 200 || right.length > 200) return null;
    return { left, right };
}

function listLinesFromBlock(block: string): string[] {
    return block
        .split(/\n+/)
        .map((l) => cleanLine(l))
        .filter((l) => l.length > 0 && !COLUMN_HEADER.test(l));
}

/** Parse two separate column lists (common AI output for matching). */
export function parseTwoColumnListsFromText(text: string): ParsedMatchingPair[] {
    const normalized = text.replace(/\r\n/g, "\n").trim();
    if (!normalized) return [];

    const sections = normalized.split(SECOND_COLUMN_SPLIT);
    if (sections.length < 2) return [];

    const leftBlock = sections[0].replace(FIRST_COLUMN_HEADER, "").trim();
    const rightBlock = sections.slice(1).join("\n").trim();

    const leftItems = listLinesFromBlock(leftBlock);
    const rightItems = listLinesFromBlock(rightBlock);
    const count = Math.min(leftItems.length, rightItems.length);

    if (count < 2) return [];

    return Array.from({ length: count }, (_, i) => ({
        left: leftItems[i],
        right: rightItems[i],
    }));
}

export function parseMatchingPairsFromText(text: string): ParsedMatchingPair[] {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const fromColumns = parseTwoColumnListsFromText(trimmed);
    if (fromColumns.length >= 2) return fromColumns.slice(0, 8);

    const lines = trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const fromLines = lines
        .filter((l) => !COLUMN_HEADER.test(l))
        .map(parsePairFromLine)
        .filter((p): p is ParsedMatchingPair => p !== null);

    if (fromLines.length >= 2) return fromLines.slice(0, 8);

    const blocks = splitTextIntoQuestionBlocks(trimmed);
    if (blocks.length > 1) {
        const fromBlocks = blocks.map(parsePairFromLine).filter((p): p is ParsedMatchingPair => p !== null);
        if (fromBlocks.length >= 2) return fromBlocks.slice(0, 8);
    }

    const inlinePairs = trimmed
        .split(/(?:،|,|;|؛)\s*/)
        .map(parsePairFromLine)
        .filter((p): p is ParsedMatchingPair => p !== null);

    if (inlinePairs.length >= 2) return inlinePairs.slice(0, 8);

    return fromLines;
}

export function splitMatchingQuestionTitle(question: string, pairsFound: boolean): string {
    if (!question.trim()) {
        return pairsFound ? "طابق العناصر التالية" : "";
    }

    const lines = question.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const firstLine = lines[0] || "";

    if (pairsFound && lines.length > 1 && !parsePairFromLine(firstLine)) {
        return firstLine.replace(/[:：]\s*$/, "");
    }

    if (pairsFound && parsePairFromLine(firstLine) && question.length > 80) {
        return "طابق العناصر التالية";
    }

    if (pairsFound && question.length > 120) {
        const titleOnly = firstLine.replace(/[:：]\s*$/, "");
        if (!parsePairFromLine(titleOnly) && titleOnly.length <= 120) {
            return titleOnly;
        }
        return "طابق العناصر التالية";
    }

    return question.trim();
}

const ORDER_LINE_PREFIX = /^(?:\d+[\.\):、]|الخطوة\s*\d+[:：]?\s*|Step\s*\d+[:：]?\s*)/i;

export function parseOrderItemsFromText(text: string): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const numbered = trimmed
        .split(/(?=(?:^|\n)\s*(?:\d+[\.\):、]|الخطوة\s*\d+|Step\s*\d+))/i)
        .map((p) => p.trim().replace(ORDER_LINE_PREFIX, "").trim())
        .filter((p) => p.length > 1);

    if (numbered.length >= 2) return numbered;

    const lines = trimmed
        .split(/\n+/)
        .map((l) => l.replace(ORDER_LINE_PREFIX, "").trim())
        .filter((l) => l.length > 1 && !COLUMN_HEADER.test(l));

    if (lines.length >= 2) return lines;

    const arrowSplit = trimmed
        .split(/\s*(?:→|->|←|—>)\s*/)
        .map((p) => p.trim())
        .filter((p) => p.length > 1);

    if (arrowSplit.length >= 2) return arrowSplit;

    return [];
}
