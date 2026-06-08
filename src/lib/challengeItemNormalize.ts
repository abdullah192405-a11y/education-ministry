import type { ChallengeQuestion } from "@/data/challengeTypes";

export type MatchingPair = { left: string; right: string };

export type OrderPiece = { id: string; text: string };

const LIST_SPLIT = /\n+|(?:^|\s)[•\-–]\s+|(?:،|,|;|؛)\s*/;

function cleanText(v: unknown): string {
    return String(v ?? "").trim();
}

function splitListText(text: string): string[] {
    return text
        .split(LIST_SPLIT)
        .map((p) => p.replace(/^\d+[\.\):、]\s*/, "").trim())
        .filter(Boolean);
}

function parsePairEntry(raw: unknown): MatchingPair | null {
    if (Array.isArray(raw) && raw.length >= 2) {
        const left = cleanText(raw[0]);
        const right = cleanText(raw[1]);
        return left && right ? { left, right } : null;
    }
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const left = cleanText(
        r.left ?? r.source ?? r.term ?? r.item1 ?? r.a ?? r.rightColumn ?? r.columnA ?? r.from
    );
    const right = cleanText(
        r.right ?? r.target ?? r.definition ?? r.item2 ?? r.b ?? r.leftColumn ?? r.columnB ?? r.to
    );
    return left && right ? { left, right } : null;
}

export function normalizeMatchingPairs(raw: unknown): MatchingPair[] {
    if (!raw) return [];
    const entries = Array.isArray(raw) ? raw : typeof raw === "object" ? Object.values(raw as object) : [];
    return entries.map(parsePairEntry).filter((p): p is MatchingPair => p !== null);
}

export function normalizeOrderItems(item: Record<string, unknown>): string[] {
    const direct =
        item.orderItems ??
        item.order_items ??
        item.correctOrder ??
        item.correct_order ??
        item.sequence ??
        item.items;

    let items: string[] = [];
    if (Array.isArray(direct)) {
        items = direct.map(cleanText).filter(Boolean);
    } else if (typeof direct === "string" && direct.trim()) {
        items = splitListText(direct);
    }

    if (items.length < 2 && Array.isArray(item.options)) {
        const fromOptions = item.options.map(cleanText).filter(Boolean);
        if (fromOptions.length >= 2) items = fromOptions;
    }

    const answerText = cleanText(item.correctAnswer ?? item.correct_answer);
    if (items.length < 2 && answerText) {
        const fromAnswer = splitListText(answerText);
        if (fromAnswer.length >= 2) items = fromAnswer;
    }

    const question = cleanText(item.question);
    if (items.length < 2 && question) {
        const numbered = question
            .split(/(?=(?:^|\n)\s*(?:\d+[\.\):]|الخطوة\s*\d+|Step\s*\d+))/i)
            .map((p) => p.trim())
            .filter((p) => p.length > 2);
        if (numbered.length >= 2) {
            items = numbered.map((p) => p.replace(/^(?:\d+[\.\):]|الخطوة\s*\d+[:：]?\s*|Step\s*\d+[:：]?\s*)/i, "").trim());
        }
    }

    return items.filter(Boolean);
}

function extractLettersFromQuestion(question: string): string[] {
    const paren = question.match(/[(\(（]([^)）]+)[)\)）]/);
    if (paren) {
        const letters = paren[1]
            .split(/[-–—,،\s]+/)
            .map(cleanText)
            .filter(Boolean);
        if (letters.length >= 2) return letters;
    }
    return [];
}

function extractWordFromQuestion(question: string): string {
    const wordInParens = question.match(/(?:كلمة|word)\s*[:\(（]\s*([^)）]+)[)\)）]/i);
    if (wordInParens) return cleanText(wordInParens[1]);

    const afterColon = question.match(/(?:كلمة|word)\s*[:：]\s*(\S+)/i);
    if (afterColon) return cleanText(afterColon[1]);

    return "";
}

/** Resolve puzzle target word whether stored as string or legacy index. */
export function getPuzzleCorrectAnswer(question: Pick<ChallengeQuestion, "correctAnswer" | "options">): string {
    const raw = question.correctAnswer;
    if (typeof raw === "string" && raw.trim() && Number.isNaN(Number(raw))) {
        return raw.trim();
    }
    if (typeof raw === "number" && !Number.isNaN(raw) && question.options?.length) {
        const picked = question.options[raw];
        if (picked?.trim()) return picked.trim();
    }
    const joined = (question.options ?? []).map(cleanText).filter(Boolean).join("");
    return joined;
}

export function normalizePuzzleItem(item: Record<string, unknown>): Record<string, unknown> {
    let options = Array.isArray(item.options)
        ? item.options.map(cleanText).filter(Boolean)
        : [];

    let correctAnswer = cleanText(item.correctAnswer ?? item.correct_answer ?? item.answer);

    const question = cleanText(item.question);

    if (!correctAnswer || !Number.isNaN(Number(correctAnswer))) {
        const fromQuestion = extractWordFromQuestion(question);
        if (fromQuestion) correctAnswer = fromQuestion;
    }

    if (typeof item.correctAnswer === "number" && options.length > 0) {
        const picked = options[item.correctAnswer as number];
        if (picked && picked.length > 1) correctAnswer = picked;
    }

    if (options.length === 0 || options.every((o) => o.length > 2)) {
        const letters = extractLettersFromQuestion(question);
        if (letters.length >= 2) options = letters;
    }

    if (options.length >= 2 && !correctAnswer) {
        correctAnswer = options.join("");
    }

    if (correctAnswer && options.length >= 2) {
        const lettersOnly = options.every((o) => o.length <= 2);
        if (lettersOnly && !correctAnswer.split("").every((ch) => options.includes(ch))) {
            const fromWord = correctAnswer.split("").filter(Boolean);
            if (fromWord.length >= 2) options = fromWord;
        }
    }

    return {
        ...item,
        type: "puzzle",
        options: options.length >= 2 ? options : ["", "", "", ""],
        correctAnswer: correctAnswer || "",
    };
}

export function normalizeAiMatchingItem(item: Record<string, unknown>): Record<string, unknown> {
    const rawPairs = item.pairs ?? item.matchingPairs ?? item.match_pairs ?? item.matching_pairs;
    let pairs = normalizeMatchingPairs(rawPairs);

    if (pairs.length < 2 && Array.isArray(item.options) && item.options.length >= 4) {
        const opts = item.options.map(cleanText).filter(Boolean);
        const half = Math.floor(opts.length / 2);
        if (half >= 2) {
            pairs = Array.from({ length: half }, (_, i) => ({
                left: opts[i],
                right: opts[i + half],
            }));
        }
    }

    return {
        ...item,
        type: "matching",
        pairs: pairs.length >= 2 ? pairs : [{ left: "", right: "" }, { left: "", right: "" }],
        options: undefined,
    };
}

export function normalizeAiOrderItem(item: Record<string, unknown>): Record<string, unknown> {
    const orderItems = normalizeOrderItems(item);
    return {
        ...item,
        type: "order_questions",
        orderItems: orderItems.length >= 2 ? orderItems : ["", "", ""],
        options: undefined,
    };
}

export function normalizeChallengeQuestionFields<T extends Record<string, unknown>>(q: T): T & ChallengeQuestion {
    const type = String(q.type || "").toLowerCase();
    let normalized: Record<string, unknown> = { ...q, type };

    if (type === "matching") {
        normalized = normalizeAiMatchingItem(normalized);
    } else if (type === "order_questions") {
        normalized = normalizeAiOrderItem(normalized);
    } else if (type === "puzzle") {
        normalized = normalizePuzzleItem(normalized);
    }

    return normalized as T & ChallengeQuestion;
}

export function shuffleArray<T>(items: T[]): T[] {
    return [...items].sort(() => Math.random() - 0.5);
}

export function shufflePuzzleOptions(question: Pick<ChallengeQuestion, "options">): string[] {
    const opts = (question.options ?? []).map(cleanText).filter(Boolean);
    return shuffleArray(opts);
}

export function shuffleOrderItems(question: Pick<ChallengeQuestion, "orderItems">): string[] {
    const items = (question.orderItems ?? []).map(cleanText).filter(Boolean);
    return shuffleArray(items);
}

export function createOrderPieces(texts: string[]): OrderPiece[] {
    return texts.map((text, i) => ({
        id: `order-${i}-${Math.random().toString(36).slice(2, 9)}`,
        text,
    }));
}

export function shuffleOrderPieces(question: Pick<ChallengeQuestion, "orderItems">): OrderPiece[] {
    return createOrderPieces(shuffleOrderItems(question));
}
