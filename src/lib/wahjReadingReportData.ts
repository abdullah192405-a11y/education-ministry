import {
    getQuestionResultsFromAttempt,
    stripQuestionHtml,
} from "@/lib/challengeQuestionAnalytics";
import { getChallengeResultScorePercent } from "@/lib/challengeResultScore";
import { WAHJ_READING_PROGRAM } from "@/lib/wahjReadingReportConfig";

export type WahjReaderPath = "eager" | "persistent" | "beginning";
export type WahjReadingStylePath = "engaged" | "organizer" | "silent";
export type WahjCommunityPath = "elite" | "distinguished" | "partner";

export type WahjAttemptTrendPoint = {
    label: string;
    pages: number;
    quotes: number;
    score: number;
};

export type WahjProgramParticipantSummary = {
    key: string;
    name: string;
    rank: number;
    totalPages: number;
    quotesCount: number;
    daysCount: number;
    completionPercent: number;
    attemptCount: number;
    avgPagesPerAttempt: number;
    avgPagesPerDay: number;
    readerPath: WahjReaderPath;
    readingStylePath: WahjReadingStylePath;
    communityPath: WahjCommunityPath;
    beatPercent: number;
    compositeScore: number;
};

export type WahjReadingAnalytics = {
    rank: number;
    totalParticipants: number;
    beatPercent: number;
    avgPagesPerDay: number;
    avgPagesPerAttempt: number;
    avgQuotesPerAttempt: number;
    lessonsEngaged: number;
    programAvgPages: number;
    pagesDiffFromAvg: number;
    programAvgQuotes: number;
    quotesDiffFromAvg: number;
    avgChallengeScore: number;
    attemptTrend: WahjAttemptTrendPoint[];
    keyFindings: string[];
    engagementIndex: number;
    readingMomentum: number;
    consistencyScore: number;
    consistencyLabel: string;
    quoteEngagementLabel: string;
    readerLevelLabel: string;
    readingStyleLabel: string;
};

export type WahjReadingReportPayload = {
    participantName: string;
    programName: string;
    className?: string;
    subjectName?: string;
    daysCount: number;
    totalPages: number;
    completionPercent: number;
    focusHours: number;
    quotesCount: number;
    attemptCount: number;
    readerPath: WahjReaderPath;
    readingStylePath: WahjReadingStylePath;
    communityPath: WahjCommunityPath;
    communityPercentLabel: string;
    shareCode: string;
    discountValue: string;
    generatedAt: string;
    analytics: WahjReadingAnalytics;
    aiReport?: import("./wahjReadingReportRecommendations").WahjAiReport;
};

export type WahjProgramSegmentStats = {
    eager: number;
    persistent: number;
    beginning: number;
    engaged: number;
    organizer: number;
    silent: number;
    elite: number;
    distinguished: number;
    partner: number;
};

export type WahjProgramWeeklyTrend = {
    label: string;
    attempts: number;
    pages: number;
    participants: number;
};

export type WahjProgramReportPayload = {
    programName: string;
    className?: string;
    subjectName?: string;
    generatedAt: string;
    participantCount: number;
    totalAttempts: number;
    totalPages: number;
    totalQuotes: number;
    totalFocusHours: number;
    avgPages: number;
    medianPages: number;
    maxPages: number;
    avgQuotes: number;
    avgCompletion: number;
    avgDays: number;
    lessonsWithActivity: number;
    segments: WahjProgramSegmentStats;
    participants: WahjProgramParticipantSummary[];
    weeklyTrend: WahjProgramWeeklyTrend[];
    keyFindings: string[];
    pagesGapTopBottom: number;
    activeRatePercent: number;
    aiReport?: import("./wahjReadingReportRecommendations").WahjAiReport;
};

type TopicQuestionCatalog = Map<string, string>;

const toRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const getStringField = (row: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        const value = row[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
};

export function parseNumericAnswer(text: string): number {
    const normalized = String(text ?? "").replace(/,/g, "").trim();
    const match = normalized.match(/(\d+(?:\.\d+)?)/);
    if (!match) return 0;
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : 0;
}

export function classifyQuestion(text: string): "pages" | "quotes" | null {
    const clean = stripQuestionHtml(text);
    if (!clean) return null;
    if (WAHJ_READING_PROGRAM.pageQuestionKeywords.some((rx) => rx.test(clean))) return "pages";
    if (WAHJ_READING_PROGRAM.quoteQuestionKeywords.some((rx) => rx.test(clean))) return "quotes";
    return null;
}

function stableHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}

function getParticipantName(result: unknown, guestLabel = "ضيف"): string {
    const row = toRecord(result);
    const user = toRecord(row.user);
    return (
        getStringField(user, ["name"]) ||
        getStringField(row, ["participant_display_name", "name"]) ||
        guestLabel
    );
}

export function getParticipantKey(result: unknown): string {
    const row = toRecord(result);
    const userId = getStringField(row, ["user_id"]) || getStringField(toRecord(row.user), ["id"]);
    if (userId) return `user:${userId}`;
    const name = getParticipantName(result).replace(/\s+/g, " ").trim().toLowerCase();
    return `guest:${name}`;
}

function getTopicIdFromResult(result: unknown): string {
    const row = toRecord(result);
    const session = toRecord(row.session);
    const topic = toRecord(session.topic);
    return String(session.topic_id ?? topic.id ?? "");
}

function getResultTimestamp(result: unknown): number | null {
    const row = toRecord(result);
    const raw = getStringField(row, ["created_at", "joined_at", "updated_at"]);
    if (!raw) return null;
    const time = new Date(raw).getTime();
    return Number.isFinite(time) ? time : null;
}

function buildTopicQuestionCatalogs(
    topics: unknown[],
    subjectId: string,
): Map<string, TopicQuestionCatalog> {
    const catalogs = new Map<string, TopicQuestionCatalog>();

    for (const topic of topics) {
        const topicRow = toRecord(topic);
        const subject = toRecord(topicRow.subject);
        const topicSubjectId = String(subject.id ?? topicRow.subject_id ?? "");
        if (topicSubjectId !== subjectId) continue;

        const topicId = String(topicRow.id ?? "");
        if (!topicId) continue;

        const items = Array.isArray(topicRow.challengeItems)
            ? topicRow.challengeItems
            : Array.isArray(topicRow.challenge_questions)
                ? topicRow.challenge_questions
                : [];

        const catalog: TopicQuestionCatalog = new Map();
        items.forEach((item, index) => {
            const question = toRecord(item);
            const text = stripQuestionHtml(
                getStringField(question, ["question", "text", "title"]),
            );
            const id = String(question.id ?? index + 1);
            if (text) catalog.set(id, text);
        });
        catalogs.set(topicId, catalog);
    }

    return catalogs;
}

function getQuestionText(
    topicId: string,
    questionId: string,
    catalogs: Map<string, TopicQuestionCatalog>,
): string {
    const catalog = catalogs.get(topicId);
    if (!catalog) return "";
    return catalog.get(questionId) || "";
}

function extractMetricsFromAttempt(
    result: unknown,
    catalogs: Map<string, TopicQuestionCatalog>,
): { pages: number; quotes: number } {
    const topicId = getTopicIdFromResult(result);
    let pages = 0;
    let quotes = 0;

    for (const question of getQuestionResultsFromAttempt(result)) {
        const questionId = String(
            question.questionId ?? question.question_id ?? question.id ?? "",
        );
        const userAnswer = getStringField(question, ["userAnswer", "user_answer", "answer"]);
        if (!userAnswer) continue;

        const questionText = getQuestionText(topicId, questionId, catalogs);
        const kind = classifyQuestion(questionText);
        if (kind === "pages") pages += parseNumericAnswer(userAnswer);
        else if (kind === "quotes") quotes += 1;
    }

    return { pages, quotes };
}

function computeDaysCount(timestamps: number[]): number {
    if (timestamps.length === 0) return WAHJ_READING_PROGRAM.defaults.days;
    const first = Math.min(...timestamps);
    const last = Math.max(...timestamps);
    return Math.max(1, Math.ceil((last - first) / (24 * 60 * 60 * 1000)) + 1);
}

function defaultMetric(value: number, fallback: number): number {
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function distributeDefaultPages(attempts: AttemptRecord[], totalPages: number): AttemptRecord[] {
    if (!attempts.length) return attempts;
    const perAttempt = Math.floor(totalPages / attempts.length);
    const remainder = totalPages - perAttempt * attempts.length;
    return attempts.map((attempt, index) => ({
        ...attempt,
        pages: perAttempt + (index === attempts.length - 1 ? remainder : 0),
        quotes: defaultMetric(attempt.quotes, WAHJ_READING_PROGRAM.defaults.quotes),
        score: defaultMetric(attempt.score, WAHJ_READING_PROGRAM.defaults.challengeScore),
    }));
}

function normalizeParticipantAggregate(aggregate: ParticipantAggregate): ParticipantAggregate {
    const defaults = WAHJ_READING_PROGRAM.defaults;
    let totalPages = aggregate.totalPages;
    let quotesCount = aggregate.quotesCount;
    let attempts = aggregate.attempts.map((attempt) => ({
        ...attempt,
        quotes: defaultMetric(attempt.quotes, defaults.quotes),
        score: defaultMetric(attempt.score, defaults.challengeScore),
    }));
    const scores = aggregate.scores.map((score) =>
        defaultMetric(score, defaults.challengeScore),
    );

    if (totalPages <= 0) {
        totalPages = defaults.pages;
        attempts = distributeDefaultPages(attempts, defaults.pages);
    }

    quotesCount = defaultMetric(quotesCount, defaults.quotes);

    return {
        ...aggregate,
        totalPages,
        quotesCount,
        attempts,
        scores,
        attemptCount: aggregate.attemptCount > 0 ? aggregate.attemptCount : defaults.attempts,
    };
}

function computeCompletionPercent(totalPages: number): number {
    const target = WAHJ_READING_PROGRAM.targetPages;
    if (target <= 0) return 0;
    return Math.min(100, Math.round((totalPages / target) * 100));
}

function computeCompositeScore(totalPages: number, quotesCount: number, completionPercent: number): number {
    const w = WAHJ_READING_PROGRAM.compositeWeights;
    return totalPages * w.pages + quotesCount * w.quotes + completionPercent * w.completion;
}

function computeBeatPercent(rank: number, total: number): number {
    if (total <= 1) return 100;
    return Math.round(((total - rank) / (total - 1)) * 100);
}

function computeMedian(values: number[]): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

export function selectReaderPath(completionPercent: number): WahjReaderPath {
    if (completionPercent >= 90) return "eager";
    if (completionPercent >= 60) return "persistent";
    return "beginning";
}

export function selectReadingStylePath(quotesCount: number): WahjReadingStylePath {
    const { engaged, organizer } = WAHJ_READING_PROGRAM.quoteStyleThresholds;
    if (quotesCount >= engaged) return "engaged";
    if (quotesCount >= organizer) return "organizer";
    return "silent";
}

export function selectCommunityPath(beatPercent: number): WahjCommunityPath {
    if (beatPercent >= 90) return "elite";
    if (beatPercent >= 60) return "distinguished";
    return "partner";
}

function communityPercentLabel(path: WahjCommunityPath, beatPercent: number): string {
    if (path === "elite") return "10%";
    return `${Math.max(1, beatPercent)}%`;
}

function readerPathLabel(path: WahjReaderPath): string {
    if (path === "eager") return "القارئ النهم";
    if (path === "persistent") return "القارئ المثابر";
    return "القارئ المنطلق";
}

function readingStyleLabel(path: WahjReadingStylePath): string {
    if (path === "engaged") return "المشتبك والمدوّن";
    if (path === "organizer") return "المنظم والحافظ";
    return "القارئ الصامت";
}

function quoteEngagementLabel(avgQuotesPerAttempt: number): string {
    if (avgQuotesPerAttempt >= 2) return "تفاعل عالٍ مع النص";
    if (avgQuotesPerAttempt >= 1) return "تفاعل متوسط";
    return "تفاعل محدود";
}

function computeReadingMomentum(attempts: AttemptRecord[]): number {
    if (attempts.length < 2) return 0;
    const sorted = [...attempts].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    const mid = Math.ceil(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);
    const avgFirst = firstHalf.reduce((s, a) => s + a.pages, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, a) => s + a.pages, 0) / secondHalf.length;
    return round1(avgSecond - avgFirst);
}

function computeConsistency(attempts: AttemptRecord[]): { score: number; label: string } {
    if (attempts.length < 2) return { score: 100, label: "ثابت" };
    const pages = attempts.map((a) => a.pages);
    const mean = pages.reduce((s, v) => s + v, 0) / pages.length;
    const variance = pages.reduce((s, v) => s + (v - mean) ** 2, 0) / pages.length;
    const stdDev = Math.sqrt(variance);
    const score = Math.max(0, Math.min(100, Math.round(100 - stdDev * 8)));
    if (score >= 80) return { score, label: "ثابت جداً" };
    if (score >= 55) return { score, label: "متذبذب قليلاً" };
    return { score, label: "غير منتظم" };
}

function computeEngagementIndex(
    completionPercent: number,
    beatPercent: number,
    avgQuotesPerAttempt: number,
    lessonsEngaged: number,
    attemptCount: number,
): number {
    const quoteScore = Math.min(100, avgQuotesPerAttempt * 35);
    const lessonScore = Math.min(100, lessonsEngaged * 12);
    const attemptScore = Math.min(100, attemptCount * 10);
    const raw =
        completionPercent * 0.35 +
        beatPercent * 0.25 +
        quoteScore * 0.2 +
        lessonScore * 0.1 +
        attemptScore * 0.1;
    return Math.round(Math.max(0, Math.min(100, raw)));
}

export function filterSubjectResults(
    results: unknown[] | undefined,
    topics: unknown[] | undefined,
    subjectId: string,
): unknown[] {
    if (!results?.length || !subjectId) return [];

    const topicIdsInSubject = new Set<string>();
    for (const topic of topics || []) {
        const topicRow = toRecord(topic);
        const subject = toRecord(topicRow.subject);
        const topicSubjectId = String(subject.id ?? topicRow.subject_id ?? "");
        if (topicSubjectId === subjectId) {
            const topicId = String(topicRow.id ?? "");
            if (topicId) topicIdsInSubject.add(topicId);
        }
    }

    return results.filter((result) => topicIdsInSubject.has(getTopicIdFromResult(result)));
}

type AttemptRecord = {
    timestamp: number | null;
    pages: number;
    quotes: number;
    score: number;
    topicId: string;
};

type ParticipantAggregate = {
    key: string;
    name: string;
    totalPages: number;
    quotesCount: number;
    timestamps: number[];
    attemptCount: number;
    topicIds: Set<string>;
    attempts: AttemptRecord[];
    scores: number[];
};

function aggregateParticipants(
    results: unknown[],
    catalogs: Map<string, TopicQuestionCatalog>,
    guestLabel: string,
): ParticipantAggregate[] {
    const map = new Map<string, ParticipantAggregate>();

    for (const result of results) {
        const key = getParticipantKey(result);
        const name = getParticipantName(result, guestLabel);
        const { pages, quotes } = extractMetricsFromAttempt(result, catalogs);
        const timestamp = getResultTimestamp(result);
        const topicId = getTopicIdFromResult(result);
        const score = getChallengeResultScorePercent(result);

        const existing = map.get(key) || {
            key,
            name,
            totalPages: 0,
            quotesCount: 0,
            timestamps: [],
            attemptCount: 0,
            topicIds: new Set<string>(),
            attempts: [],
            scores: [],
        };

        existing.name = name;
        existing.totalPages += pages;
        existing.quotesCount += quotes;
        existing.attemptCount += 1;
        if (topicId) existing.topicIds.add(topicId);
        if (timestamp !== null) existing.timestamps.push(timestamp);
        existing.scores.push(score);
        existing.attempts.push({ timestamp, pages, quotes, score, topicId });
        map.set(key, existing);
    }

    return Array.from(map.values()).map(normalizeParticipantAggregate);
}

function buildAttemptTrend(attempts: AttemptRecord[]): WahjAttemptTrendPoint[] {
    const sorted = [...attempts].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    return sorted.map((attempt, index) => {
        const date = attempt.timestamp
            ? new Date(attempt.timestamp).toLocaleDateString("ar-SA", { day: "numeric", month: "short" })
            : `محاولة ${index + 1}`;
        return {
            label: date,
            pages: attempt.pages,
            quotes: attempt.quotes,
            score: attempt.score,
        };
    });
}

function buildWeeklyTrend(results: unknown[], catalogs: Map<string, TopicQuestionCatalog>): WahjProgramWeeklyTrend[] {
    const weekMap = new Map<string, { attempts: number; pages: number; participants: Set<string> }>();

    for (const result of results) {
        const ts = getResultTimestamp(result);
        if (ts === null) continue;
        const date = new Date(ts);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const label = weekStart.toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
        const { pages } = extractMetricsFromAttempt(result, catalogs);
        const key = getParticipantKey(result);

        const row = weekMap.get(label) || { attempts: 0, pages: 0, participants: new Set<string>() };
        row.attempts += 1;
        row.pages += pages;
        row.participants.add(key);
        weekMap.set(label, row);
    }

    return Array.from(weekMap.entries())
        .map(([label, row]) => ({
            label,
            attempts: row.attempts,
            pages: row.pages,
            participants: row.participants.size,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "ar"));
}

function buildRankedSummaries(
    aggregates: ParticipantAggregate[],
): WahjProgramParticipantSummary[] {
    const ranked = aggregates
        .map((p) => {
            const completionPercent = computeCompletionPercent(p.totalPages);
            return {
                aggregate: p,
                completionPercent,
                compositeScore: computeCompositeScore(p.totalPages, p.quotesCount, completionPercent),
            };
        })
        .sort((a, b) => b.compositeScore - a.compositeScore);

    return ranked.map((row, index) => {
        const p = row.aggregate;
        const daysCount = computeDaysCount(p.timestamps);
        const beatPercent = computeBeatPercent(index + 1, ranked.length);
        return {
            key: p.key,
            name: p.name,
            rank: index + 1,
            totalPages: p.totalPages,
            quotesCount: p.quotesCount,
            daysCount,
            completionPercent: row.completionPercent,
            attemptCount: p.attemptCount,
            avgPagesPerAttempt: round1(p.totalPages / Math.max(1, p.attemptCount)),
            avgPagesPerDay: round1(p.totalPages / Math.max(1, daysCount)),
            readerPath: selectReaderPath(row.completionPercent),
            readingStylePath: selectReadingStylePath(p.quotesCount),
            communityPath: selectCommunityPath(beatPercent),
            beatPercent,
            compositeScore: row.compositeScore,
        };
    });
}

function buildIndividualKeyFindings(
    summary: WahjProgramParticipantSummary,
    analytics: Omit<WahjReadingAnalytics, "keyFindings">,
): string[] {
    const findings: string[] = [
        `الترتيب ${summary.rank} من ${analytics.totalParticipants} مشارك في البرنامج`,
        `متوسط ${analytics.avgPagesPerDay} صفحة يومياً عبر ${summary.daysCount} يوماً`,
    ];

    if (analytics.pagesDiffFromAvg > 0) {
        findings.push(`أعلى من متوسط البرنامج بـ ${analytics.pagesDiffFromAvg} صفحة`);
    } else if (analytics.pagesDiffFromAvg < 0) {
        findings.push(`أقل من متوسط البرنامج بـ ${Math.abs(analytics.pagesDiffFromAvg)} صفحة`);
    }

    findings.push(`نمط القراءة: ${readingStyleLabel(summary.readingStylePath)}`);
    findings.push(`مستوى الإنجاز: ${readerPathLabel(summary.readerPath)} (${summary.completionPercent}%)`);

    if (analytics.avgChallengeScore > 0) {
        findings.push(`متوسط أداء التحديات: ${analytics.avgChallengeScore}%`);
    }

    if ("engagementIndex" in analytics) {
        findings.push(`مؤشر التفاعل: ${analytics.engagementIndex}/100`);
    }
    if ("readingMomentum" in analytics && analytics.readingMomentum !== 0) {
        findings.push(
            analytics.readingMomentum > 0
                ? `زخم إيجابي: +${analytics.readingMomentum} صفحة في المحاولات الأخيرة`
                : `يحتاج استعادة الإيقاع: ${analytics.readingMomentum} صفحة`,
        );
    }

    return findings.slice(0, 8);
}

function buildProgramKeyFindings(
    participants: WahjProgramParticipantSummary[],
    totalPages: number,
    totalAttempts: number,
    lessonsWithActivity: number,
): string[] {
    if (!participants.length) return ["لا توجد بيانات مشاركين بعد في هذا البرنامج."];

    const top = participants[0];
    const eagerCount = participants.filter((p) => p.readerPath === "eager").length;
    const engagedCount = participants.filter((p) => p.readingStylePath === "engaged").length;

    return [
        `${participants.length} مشاركاً نشطاً عبر ${lessonsWithActivity} درساً`,
        `إجمالي ${totalPages} صفحة مقروءة في ${totalAttempts} محاولة`,
        `المتصدر: ${top.name} بـ ${top.totalPages} صفحة و${top.quotesCount} اقتباس`,
        `${eagerCount} مشاركاً في مسار القارئ النهم (90%+ إنجاز)`,
        `${engagedCount} مشاركاً بنمط المدوّن والمشتبك مع النص`,
        `متوسط الإنجاز البرنامجي: ${Math.round(participants.reduce((s, p) => s + p.completionPercent, 0) / participants.length)}%`,
    ];
}

export function buildWahjProgramParticipants(
    results: unknown[] | undefined,
    topics: unknown[] | undefined,
    subjectId: string,
    guestLabel = "ضيف",
): WahjProgramParticipantSummary[] {
    const subjectResults = filterSubjectResults(results, topics, subjectId);
    const catalogs = buildTopicQuestionCatalogs(topics || [], subjectId);
    const aggregates = aggregateParticipants(subjectResults, catalogs, guestLabel);
    return buildRankedSummaries(aggregates);
}

export function buildWahjParticipantReport(
    participantKey: string,
    results: unknown[] | undefined,
    topics: unknown[] | undefined,
    subjectId: string,
    guestLabel = "ضيف",
): WahjReadingReportPayload | null {
    const subjectResults = filterSubjectResults(results, topics, subjectId);
    const catalogs = buildTopicQuestionCatalogs(topics || [], subjectId);
    const aggregates = aggregateParticipants(subjectResults, catalogs, guestLabel);
    const summaries = buildRankedSummaries(aggregates);

    const summary = summaries.find((p) => p.key === participantKey);
    const target = aggregates.find((p) => p.key === participantKey);
    if (!summary || !target) return null;

    const programAvgPages = summaries.length
        ? Math.round(summaries.reduce((s, p) => s + p.totalPages, 0) / summaries.length)
        : 0;
    const programAvgQuotes = summaries.length
        ? round1(summaries.reduce((s, p) => s + p.quotesCount, 0) / summaries.length)
        : 0;
    const avgChallengeScore = target.scores.length
        ? Math.round(target.scores.reduce((s, v) => s + v, 0) / target.scores.length)
        : 0;

    const avgQuotesPerAttempt = round1(summary.quotesCount / Math.max(1, summary.attemptCount));
    const consistency = computeConsistency(target.attempts);
    const analyticsBase = {
        rank: summary.rank,
        totalParticipants: summaries.length,
        beatPercent: summary.beatPercent,
        avgPagesPerDay: summary.avgPagesPerDay,
        avgPagesPerAttempt: summary.avgPagesPerAttempt,
        avgQuotesPerAttempt,
        lessonsEngaged: target.topicIds.size > 0 ? target.topicIds.size : WAHJ_READING_PROGRAM.defaults.lessonsEngaged,
        programAvgPages,
        pagesDiffFromAvg: summary.totalPages - programAvgPages,
        programAvgQuotes,
        quotesDiffFromAvg: round1(summary.quotesCount - programAvgQuotes),
        avgChallengeScore,
        attemptTrend: buildAttemptTrend(target.attempts),
        engagementIndex: computeEngagementIndex(
            summary.completionPercent,
            summary.beatPercent,
            avgQuotesPerAttempt,
            target.topicIds.size,
            summary.attemptCount,
        ),
        readingMomentum: computeReadingMomentum(target.attempts),
        consistencyScore: consistency.score,
        consistencyLabel: consistency.label,
        quoteEngagementLabel: quoteEngagementLabel(avgQuotesPerAttempt),
        readerLevelLabel: readerPathLabel(summary.readerPath),
        readingStyleLabel: readingStyleLabel(summary.readingStylePath),
    };

    const analytics: WahjReadingAnalytics = {
        ...analyticsBase,
        keyFindings: buildIndividualKeyFindings(summary, analyticsBase),
    };

    return {
        participantName: summary.name,
        programName: WAHJ_READING_PROGRAM.programName,
        daysCount: summary.daysCount,
        totalPages: summary.totalPages,
        completionPercent: summary.completionPercent,
        focusHours: round1((summary.totalPages * 2) / 60),
        quotesCount: summary.quotesCount,
        attemptCount: summary.attemptCount,
        readerPath: summary.readerPath,
        readingStylePath: summary.readingStylePath,
        communityPath: summary.communityPath,
        communityPercentLabel: communityPercentLabel(summary.communityPath, summary.beatPercent),
        shareCode: `WAHJ-${stableHash(participantKey)}`,
        discountValue: WAHJ_READING_PROGRAM.discountValue,
        generatedAt: new Date().toLocaleDateString("ar-SA", { dateStyle: "full" }),
        analytics,
    };
}

export function buildWahjProgramReport(
    results: unknown[] | undefined,
    topics: unknown[] | undefined,
    subjectId: string,
    guestLabel = "ضيف",
): WahjProgramReportPayload {
    const subjectResults = filterSubjectResults(results, topics, subjectId);
    const catalogs = buildTopicQuestionCatalogs(topics || [], subjectId);
    const aggregates = aggregateParticipants(subjectResults, catalogs, guestLabel);
    const participants = buildRankedSummaries(aggregates);

    const totalPages = participants.reduce((s, p) => s + p.totalPages, 0);
    const totalQuotes = participants.reduce((s, p) => s + p.quotesCount, 0);
    const totalAttempts = subjectResults.length;
    const lessonsWithActivity = new Set(subjectResults.map(getTopicIdFromResult)).size;

    const segments: WahjProgramSegmentStats = {
        eager: participants.filter((p) => p.readerPath === "eager").length,
        persistent: participants.filter((p) => p.readerPath === "persistent").length,
        beginning: participants.filter((p) => p.readerPath === "beginning").length,
        engaged: participants.filter((p) => p.readingStylePath === "engaged").length,
        organizer: participants.filter((p) => p.readingStylePath === "organizer").length,
        silent: participants.filter((p) => p.readingStylePath === "silent").length,
        elite: participants.filter((p) => p.communityPath === "elite").length,
        distinguished: participants.filter((p) => p.communityPath === "distinguished").length,
        partner: participants.filter((p) => p.communityPath === "partner").length,
    };

    const minPages = participants.length ? Math.min(...participants.map((p) => p.totalPages)) : 0;
    const maxPages = participants.length ? Math.max(...participants.map((p) => p.totalPages)) : 0;
    const activeParticipants = participants.filter((p) => p.attemptCount >= 2).length;

    return {
        programName: WAHJ_READING_PROGRAM.programName,
        generatedAt: new Date().toLocaleDateString("ar-SA", { dateStyle: "full" }),
        participantCount: participants.length,
        totalAttempts,
        totalPages,
        totalQuotes,
        totalFocusHours: round1((totalPages * 2) / 60),
        avgPages: participants.length ? Math.round(totalPages / participants.length) : 0,
        medianPages: computeMedian(participants.map((p) => p.totalPages)),
        maxPages,
        avgQuotes: participants.length ? round1(totalQuotes / participants.length) : 0,
        avgCompletion: participants.length
            ? Math.round(participants.reduce((s, p) => s + p.completionPercent, 0) / participants.length)
            : 0,
        avgDays: participants.length
            ? round1(participants.reduce((s, p) => s + p.daysCount, 0) / participants.length)
            : 0,
        lessonsWithActivity,
        segments,
        participants,
        weeklyTrend: buildWeeklyTrend(subjectResults, catalogs),
        keyFindings: buildProgramKeyFindings(participants, totalPages, totalAttempts, lessonsWithActivity),
        pagesGapTopBottom: maxPages - minPages,
        activeRatePercent: participants.length
            ? Math.round((activeParticipants / participants.length) * 100)
            : 0,
    };
}
