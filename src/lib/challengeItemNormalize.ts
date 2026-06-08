import type { ChallengeQuestion } from "@/data/challengeTypes";
import {
    parseMatchingPairsFromText,
    parseOrderItemsFromText,
    parsePairFromLine,
    parseTwoColumnListsFromText,
    splitMatchingQuestionTitle,
} from "@/lib/aiChallengeTextParsing";
import { normalizeWheelSegment, normalizeWheelSegments } from "@/lib/wheelSegments";

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
    if (typeof raw === "string") {
        return parsePairFromLine(raw);
    }

    if (Array.isArray(raw) && raw.length >= 2) {
        const left = cleanText(raw[0]);
        const right = cleanText(raw[1]);
        return left && right ? { left, right } : null;
    }

    if (!raw || typeof raw !== "object") return null;

    const r = raw as Record<string, unknown>;
    const left = cleanText(
        r.left ??
            r.source ??
            r.term ??
            r.item1 ??
            r.a ??
            r.key ??
            r.prompt ??
            r.question ??
            r.rightColumn ??
            r.columnA ??
            r.from
    );
    const right = cleanText(
        r.right ??
            r.target ??
            r.definition ??
            r.value ??
            r.answer ??
            r.item2 ??
            r.b ??
            r.leftColumn ??
            r.columnB ??
            r.to
    );

    if (left && right) return { left, right };

    const keys = Object.keys(r).filter((k) => !["id", "points", "type"].includes(k));
    if (keys.length === 1) {
        const key = keys[0];
        const value = cleanText(r[key]);
        if (key && value) return { left: key, right: value };
    }

    return null;
}

function toStringList(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw.map(cleanText).filter(Boolean);
    }
    if (typeof raw === "string" && raw.trim()) {
        return splitListText(raw);
    }
    return [];
}

function normalizeTwoColumnArrays(item: Record<string, unknown>): MatchingPair[] {
    const leftItems = toStringList(
        item.leftColumn ??
            item.left_column ??
            item.columnA ??
            item.column_a ??
            item.leftItems ??
            item.left_items ??
            item.terms ??
            item.sources ??
            item.leftList ??
            item.left
    );
    const rightItems = toStringList(
        item.rightColumn ??
            item.right_column ??
            item.columnB ??
            item.column_b ??
            item.rightItems ??
            item.right_items ??
            item.definitions ??
            item.targets ??
            item.rightList ??
            item.right
    );

    if (leftItems.length >= 2 && leftItems.length === rightItems.length) {
        return leftItems.map((left, i) => ({ left, right: rightItems[i] }));
    }

    return [];
}

export function normalizeMatchingPairs(raw: unknown): MatchingPair[] {
    if (!raw) return [];

    if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!trimmed) return [];

        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
            try {
                return normalizeMatchingPairs(JSON.parse(trimmed));
            } catch {
                // fall through to text parsing
            }
        }

        const fromText = parseMatchingPairsFromText(trimmed);
        if (fromText.length >= 2) return fromText;

        const single = parsePairFromLine(trimmed);
        return single ? [single] : [];
    }

    if (Array.isArray(raw)) {
        return raw
            .map((entry) => parsePairEntry(entry))
            .filter((p): p is MatchingPair => p !== null && Boolean(p.left) && Boolean(p.right));
    }

    if (typeof raw === "object") {
        const entries = Object.values(raw as object);
        const fromEntries = entries
            .map((entry) => parsePairEntry(entry))
            .filter((p): p is MatchingPair => p !== null && Boolean(p.left) && Boolean(p.right));
        if (fromEntries.length >= 2) return fromEntries;

        const single = parsePairEntry(raw);
        return single ? [single] : [];
    }

    return [];
}

function dedupeValidPairs(pairs: MatchingPair[]): MatchingPair[] {
    const seen = new Set<string>();
    const out: MatchingPair[] = [];

    for (const pair of pairs) {
        const left = cleanText(pair.left);
        const right = cleanText(pair.right);
        if (!left || !right) continue;
        const key = `${left}|||${right}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ left, right });
    }

    return out;
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
        const fromQuestion = parseOrderItemsFromText(question);
        if (fromQuestion.length >= 2) {
            items = fromQuestion;
        } else {
            const numbered = question
                .split(/(?=(?:^|\n)\s*(?:\d+[\.\):]|الخطوة\s*\d+|Step\s*\d+))/i)
                .map((p) => p.trim())
                .filter((p) => p.length > 2);
            if (numbered.length >= 2) {
                items = numbered.map((p) =>
                    p.replace(/^(?:\d+[\.\):]|الخطوة\s*\d+[:：]?\s*|Step\s*\d+[:：]?\s*)/i, "").trim()
                );
            }
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
        const answerLetters = correctAnswer.replace(/\s/g, "").split("");
        if (lettersOnly && !answerLetters.every((ch) => options.includes(ch))) {
            if (answerLetters.length >= 2) options = answerLetters;
        }
    }

    return {
        ...item,
        type: "puzzle",
        options: options.length >= 2 ? options : ["", "", "", ""],
        correctAnswer: correctAnswer || "",
    };
}

/** Valid matching pairs for editor display and student gameplay. */
export function getMatchingPairsForPlay(
    question: Pick<ChallengeQuestion, "type" | "pairs" | "question" | "options" | "explanation">
): MatchingPair[] {
    if (String(question.type || "").toLowerCase() !== "matching") return [];

    const normalized = normalizeAiMatchingItem(question as Record<string, unknown>);
    const pairs = Array.isArray(normalized.pairs) ? (normalized.pairs as MatchingPair[]) : [];
    return pairs.filter((p) => cleanText(p?.left) && cleanText(p?.right));
}

export function normalizeAiMatchingItem(item: Record<string, unknown>): Record<string, unknown> {
    const rawPairs =
        item.pairs ??
        item.matchingPairs ??
        item.match_pairs ??
        item.matching_pairs ??
        item.items ??
        item.matches ??
        item.data;

    let pairs = dedupeValidPairs(normalizeMatchingPairs(rawPairs));
    const question = cleanText(item.question);
    const explanation = cleanText(item.explanation);

    if (pairs.length < 2) {
        const fromColumns = normalizeTwoColumnArrays(item);
        if (fromColumns.length >= 2) pairs = fromColumns;
    }

    if (pairs.length < 2 && Array.isArray(item.options)) {
        const fromOptionStrings = item.options
            .map((raw) => parsePairEntry(raw))
            .filter((p): p is MatchingPair => p !== null);

        if (fromOptionStrings.length >= 2) {
            pairs = fromOptionStrings;
        } else if (item.options.length >= 4) {
            const opts = item.options.map(cleanText).filter(Boolean);
            const half = Math.floor(opts.length / 2);
            if (half >= 2) {
                pairs = Array.from({ length: half }, (_, i) => ({
                    left: opts[i],
                    right: opts[i + half],
                }));
            }
        }
    }

    if (pairs.length < 2 && question) {
        const fromQuestion = parseMatchingPairsFromText(question);
        if (fromQuestion.length >= 2) pairs = fromQuestion;
    }

    if (pairs.length < 2 && explanation) {
        const fromExplanation = parseMatchingPairsFromText(explanation);
        if (fromExplanation.length >= 2) pairs = fromExplanation;
    }

    pairs = dedupeValidPairs(pairs);
    const matchingQuestion = splitMatchingQuestionTitle(question, pairs.length >= 2);

    return {
        ...item,
        type: "matching",
        question: matchingQuestion || question || "طابق العناصر التالية",
        pairs: pairs.length >= 2 ? pairs.slice(0, 8) : [{ left: "", right: "" }, { left: "", right: "" }],
        options: undefined,
    };
}

export function normalizeAiOrderItem(item: Record<string, unknown>): Record<string, unknown> {
    const orderItems = normalizeOrderItems(item);
    const question = cleanText(item.question);
    let orderQuestion = question;

    if (orderItems.length >= 2 && question.length > 100) {
        const firstLine = question.split(/\n+/)[0]?.trim() || "";
        const looksLikeTitle =
            firstLine.length <= 120 &&
            !parseOrderItemsFromText(firstLine).length &&
            parseOrderItemsFromText(question).length >= 2;
        if (looksLikeTitle) {
            orderQuestion = firstLine.replace(/[:：]\s*$/, "");
        } else if (parseOrderItemsFromText(question).length >= 2) {
            orderQuestion = "رتّب العناصر بالترتيب الصحيح";
        }
    }

    return {
        ...item,
        type: "order_questions",
        question: orderQuestion || question || "رتّب العناصر بالترتيب الصحيح",
        orderItems: orderItems.length >= 2 ? orderItems.slice(0, 10) : ["", "", ""],
        options: undefined,
    };
}

const OPTION_LETTER_TO_INDEX: Record<string, number> = {
    a: 0, b: 1, c: 2, d: 3, e: 4, f: 5,
    أ: 0, ا: 0, إ: 0, آ: 0,
    ب: 1,
    ج: 2, ح: 2,
    د: 3,
    ه: 4, و: 4,
    ز: 5,
};

/** Resolve a correct-answer value to a zero-based option index. */
export function resolveIndexedCorrectAnswer(correctAnswer: unknown, options: string[]): number {
    const filledOptions = options.map(cleanText).filter(Boolean);
    if (filledOptions.length === 0) return 0;

    if (typeof correctAnswer === "number" && !Number.isNaN(correctAnswer)) {
        if (correctAnswer >= 0 && correctAnswer < filledOptions.length) return correctAnswer;
        if (correctAnswer >= 1 && correctAnswer <= filledOptions.length) return correctAnswer - 1;
        return 0;
    }

    if (typeof correctAnswer === "boolean") {
        return correctAnswer ? 0 : 1;
    }

    const text = cleanText(correctAnswer);
    if (!text) return 0;

    const asNum = Number(text);
    if (!Number.isNaN(asNum)) {
        if (asNum >= 0 && asNum < filledOptions.length) return asNum;
        if (asNum >= 1 && asNum <= filledOptions.length) return asNum - 1;
    }

    const letterKey = text.replace(/[\)\.\:：\-]/g, "").trim().toLowerCase();
    const letterIndex = OPTION_LETTER_TO_INDEX[letterKey] ?? OPTION_LETTER_TO_INDEX[letterKey.charAt(0)];
    if (letterIndex !== undefined && letterIndex < filledOptions.length) return letterIndex;

    const normalizedText = text.toLowerCase();
    const exactIndex = filledOptions.findIndex((option) => option.toLowerCase() === normalizedText);
    if (exactIndex >= 0) return exactIndex;

    const partialIndex = filledOptions.findIndex((option) => {
        const normalizedOption = option.toLowerCase();
        return normalizedOption.includes(normalizedText) || normalizedText.includes(normalizedOption);
    });
    if (partialIndex >= 0) return partialIndex;

    return 0;
}

export function normalizeChoiceQuestionItem(item: Record<string, unknown>): Record<string, unknown> {
    const options = Array.isArray(item.options)
        ? item.options.map((option) => String(option ?? ""))
        : [];
    const correctAnswer = resolveIndexedCorrectAnswer(
        item.correctAnswer ?? item.correct_answer ?? item.answer,
        options
    );

    return {
        ...item,
        options,
        correctAnswer,
    };
}

export function normalizeTrueFalseQuestionItem(
    item: Record<string, unknown>,
    labels?: { true: string; false: string }
): Record<string, unknown> {
    const trueLabel = labels?.true ?? "صح";
    const falseLabel = labels?.false ?? "خطأ";
    const options = Array.isArray(item.options)
        ? item.options.map(cleanText).filter(Boolean)
        : [];
    const rawAnswer = item.correctAnswer ?? item.correct_answer ?? item.answer;

    let normalizedAnswer = 0;
    if (typeof rawAnswer === "number") {
        normalizedAnswer = rawAnswer === 1 ? 1 : 0;
    } else if (typeof rawAnswer === "boolean") {
        normalizedAnswer = rawAnswer ? 0 : 1;
    } else if (typeof rawAnswer === "string") {
        const low = rawAnswer.trim().toLowerCase();
        const isFalse =
            low === "1" ||
            low === "false" ||
            low.includes("false") ||
            low.includes("incorrect") ||
            low.includes("wrong") ||
            low.includes("خطأ");
        normalizedAnswer = isFalse ? 1 : 0;
    }

    return {
        ...item,
        type: "true_false",
        options: options.length >= 2 ? options.slice(0, 2) : [trueLabel, falseLabel],
        correctAnswer: normalizedAnswer,
    };
}

export function normalizeOpenAnswerItem(
    item: Record<string, unknown>,
    fallbackAnswer = ""
): Record<string, unknown> {
    const question = cleanText(item.question);
    const explanation = cleanText(item.explanation);
    const rawAnswer = item.correctAnswer ?? item.correct_answer ?? item.answer;
    const answerAsText = typeof rawAnswer === "string" ? rawAnswer.trim() : cleanText(rawAnswer);

    return {
        ...item,
        correctAnswer: answerAsText || fallbackAnswer || explanation,
        explanation: explanation || item.explanation || null,
    };
}

export function normalizeWheelSpinQuestionItem(item: Record<string, unknown>): Record<string, unknown> {
    const segments = normalizeWheelSegments(item.wheelSegments ?? item.wheel_segments).map((segment) => {
        const normalized = normalizeWheelSegment(segment);
        return {
            ...normalized,
            correctAnswer: resolveIndexedCorrectAnswer(normalized.correctAnswer, normalized.options ?? []),
        };
    });

    return {
        ...item,
        type: "wheel_spin",
        wheelSegments: segments,
        options: undefined,
    };
}

/** Serialize the correct answer for DB storage after normalization. */
export function formatCorrectAnswerForDb(
    question: Pick<ChallengeQuestion, "type" | "correctAnswer" | "options" | "orderItems">
): string | null {
    const type = String(question.type || "").toLowerCase();

    if (type === "order_questions" || type === "matching" || type === "wheel_spin") {
        return null;
    }

    if (type === "multiple_choice" || type === "true_false" || type === "shooting") {
        return String(resolveIndexedCorrectAnswer(question.correctAnswer, question.options ?? []));
    }

    if (type === "puzzle") {
        const word = getPuzzleCorrectAnswer(question);
        return word || null;
    }

    const raw = question.correctAnswer;
    if (raw == null || raw === "") return null;
    return String(raw);
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
    } else if (type === "multiple_choice" || type === "shooting") {
        normalized = normalizeChoiceQuestionItem(normalized);
    } else if (type === "true_false") {
        normalized = normalizeTrueFalseQuestionItem(normalized);
    } else if (type === "wheel_spin") {
        normalized = normalizeWheelSpinQuestionItem(normalized);
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

/** order_questions where each item is a single letter/syllable tile (رتّب الحروف). */
export function isLetterArrangementOrderQuestion(
    question: Pick<ChallengeQuestion, "type" | "orderItems">
): boolean {
    if (question.type !== "order_questions") return false;
    const items = (question.orderItems ?? []).map(cleanText).filter((item) => item.trim());
    if (items.length < 2) return false;
    return items.every((item) => item.length <= 2);
}

export function isLetterArrangementQuestion(
    question: Pick<ChallengeQuestion, "type" | "orderItems" | "options">
): boolean {
    return question.type === "puzzle" || isLetterArrangementOrderQuestion(question);
}

export function getLetterArrangementTiles(question: ChallengeQuestion): string[] {
    if (question.type === "puzzle") {
        return shufflePuzzleOptions(question);
    }
    const items = (question.orderItems ?? []).map(cleanText).filter((item) => item.trim());
    return shuffleArray(items);
}

export function getLetterArrangementAnswer(question: ChallengeQuestion): string {
    if (question.type === "puzzle") {
        return getPuzzleCorrectAnswer(question);
    }
    return (question.orderItems ?? []).map(cleanText).join("");
}

/** Sentinel in puzzle click stack for a manually inserted space (multi-word answers). */
export const PUZZLE_SPACE_INDEX = -1;

export function puzzleUsedTileIndices(clickStack: number[]): number[] {
    return clickStack.filter((index) => index >= 0);
}

export function puzzleStackEntryLength(entry: number, tiles: string[]): number {
    return entry === PUZZLE_SPACE_INDEX ? 1 : (tiles[entry]?.length ?? 0);
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
