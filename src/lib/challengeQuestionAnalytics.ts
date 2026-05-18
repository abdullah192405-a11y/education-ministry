/** Aggregate per-question challenge stats against the topic's canonical question list. */

export type ChallengeQuestionCatalogItem = {
    id: string;
    text: string;
    index: number;
};

export type AggregatedQuestionStat = {
    questionId: string;
    label: string;
    attempts: number;
    correct: number;
    wrong: number;
    totalTime: number;
    points: number;
    accuracy: number;
    avgTime: number;
};

const toRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export const stripQuestionHtml = (value: unknown): string =>
    String(value ?? "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

/** Normalize Arabic/latin text so duplicate wording variants merge. */
export const normalizeQuestionTextKey = (value: unknown): string => {
    const text = stripQuestionHtml(value)
        .toLowerCase()
        .replace(/[‘’ʼ`´]/g, "'")
        .replace(/[""«»]/g, '"')
        .replace(/\u0640/g, "")
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return text;
};

const getStringField = (row: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        const value = row[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
};

const getNumberField = (row: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        const n = Number(row[key]);
        if (Number.isFinite(n)) return n;
    }
    return 0;
};

export const getQuestionResultsFromAttempt = (result: unknown): Record<string, unknown>[] => {
    const rows = toRecord(result).question_results;
    return Array.isArray(rows) ? rows.map((row) => toRecord(row)) : [];
};

export const buildChallengeQuestionCatalog = (topic: unknown): ChallengeQuestionCatalogItem[] => {
    const topicRow = toRecord(topic);
    const items = Array.isArray(topicRow.challengeItems)
        ? topicRow.challengeItems
        : Array.isArray(topicRow.challenge_questions)
            ? topicRow.challenge_questions
            : [];

    return items
        .map((item, index) => {
            const question = toRecord(item);
            const text = stripQuestionHtml(
                getStringField(question, ["question", "text", "title"])
            );
            if (!text) return null;
            return {
                id: String(question.id ?? index + 1),
                text,
                index,
            };
        })
        .filter((item): item is ChallengeQuestionCatalogItem => item !== null);
};

const isUuidLike = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const resolveCatalogIndex = (
    catalog: ChallengeQuestionCatalogItem[],
    question: Record<string, unknown>,
    attemptIndex: number
): number => {
    if (!catalog.length) return -1;

    const rawId = String(
        question.questionId ?? question.question_id ?? question.id ?? ""
    ).trim();
    const embeddedText = stripQuestionHtml(
        getStringField(question, ["questionText", "question_text", "question", "text", "title"])
    );

    if (rawId) {
        const byId = catalog.findIndex((item) => item.id === rawId);
        if (byId >= 0) return byId;

        if (/^\d+$/.test(rawId)) {
            const numericIndex = Number(rawId) - 1;
            if (numericIndex >= 0 && numericIndex < catalog.length) return numericIndex;
        }

        if (!isUuidLike(rawId)) {
            const textKey = normalizeQuestionTextKey(rawId);
            if (textKey) {
                const byText = catalog.findIndex(
                    (item) => normalizeQuestionTextKey(item.text) === textKey
                );
                if (byText >= 0) return byText;
            }
        }
    }

    if (embeddedText) {
        const textKey = normalizeQuestionTextKey(embeddedText);
        const byEmbedded = catalog.findIndex(
            (item) => normalizeQuestionTextKey(item.text) === textKey
        );
        if (byEmbedded >= 0) return byEmbedded;
    }

    if (attemptIndex >= 0 && attemptIndex < catalog.length) return attemptIndex;

    return -1;
};

export const aggregateChallengeQuestionStats = (
    results: unknown[],
    topic: unknown
): AggregatedQuestionStat[] => {
    const catalog = buildChallengeQuestionCatalog(topic);
    if (!catalog.length) return [];

    const buckets = catalog.map((item) => ({
        questionId: item.id,
        label: item.text,
        attempts: 0,
        correct: 0,
        wrong: 0,
        totalTime: 0,
        points: 0,
    }));

    results.forEach((result) => {
        getQuestionResultsFromAttempt(result).forEach((question, attemptIndex) => {
            const catalogIndex = resolveCatalogIndex(catalog, question, attemptIndex);
            if (catalogIndex < 0) return;

            const bucket = buckets[catalogIndex];
            const isCorrect = Boolean(
                question.correct ?? question.isCorrect ?? question.is_correct
            );

            bucket.attempts += 1;
            if (isCorrect) bucket.correct += 1;
            else bucket.wrong += 1;
            bucket.totalTime += getNumberField(question, ["timeTaken", "time_taken"]);
            bucket.points += getNumberField(question, ["pointsEarned", "points_earned"]);
        });
    });

    return buckets.map((bucket) => ({
        ...bucket,
        accuracy: bucket.attempts ? Math.round((bucket.correct / bucket.attempts) * 100) : 0,
        avgTime: bucket.attempts ? Math.round(bucket.totalTime / bucket.attempts) : 0,
    }));
};

export const buildQuestionTextById = (topic: unknown): Map<string, string> => {
    const map = new Map<string, string>();
    buildChallengeQuestionCatalog(topic).forEach((item) => {
        map.set(item.id, item.text);
        map.set(String(item.index + 1), item.text);
        const textKey = normalizeQuestionTextKey(item.text);
        if (textKey) map.set(textKey, item.text);
    });
    return map;
};

export const resolveQuestionLabel = (
    question: Record<string, unknown>,
    attemptIndex: number,
    topic: unknown
): string => {
    const catalog = buildChallengeQuestionCatalog(topic);
    const catalogIndex = resolveCatalogIndex(catalog, question, attemptIndex);
    if (catalogIndex >= 0) return catalog[catalogIndex].text;

    const embeddedText = stripQuestionHtml(
        getStringField(question, ["questionText", "question_text", "question", "text", "title"])
    );
    if (embeddedText) return embeddedText;

    const rawId = String(
        question.questionId ?? question.question_id ?? question.id ?? ""
    ).trim();
    if (rawId && !isUuidLike(rawId)) return rawId;

    return `سؤال ${attemptIndex + 1}`;
};
