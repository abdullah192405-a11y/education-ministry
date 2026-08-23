import { resolveIndexedCorrectAnswer } from "@/lib/challengeItemNormalize";

/**
 * Shared exam logic: lifecycle window, attempt limits and grading.
 *
 * Kept free of React and Supabase so the student runner, the teacher dashboard
 * and the data hooks all derive the exact same status and the exact same score.
 */

// ============================================================================
// Timing / lifecycle
// ============================================================================

export type ExamLiveStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED";

export interface ExamTimingLike {
    status?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    duration_minutes?: number | null;
    max_attempts?: number | null;
}

const MS_PER_MINUTE = 60_000;

export const EXAM_DEFAULT_DURATION_MINUTES = 60;
export const EXAM_MIN_DURATION_MINUTES = 5;
export const EXAM_MAX_DURATION_MINUTES = 300;

/** Grace for a submission that is already in flight when the window closes. */
export const EXAM_SUBMIT_GRACE_MS = 10 * MS_PER_MINUTE;

export function parseExamDate(value?: string | Date | null): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function clampExamDuration(minutes: unknown): number {
    const n = Math.round(Number(minutes));
    if (!Number.isFinite(n)) return EXAM_DEFAULT_DURATION_MINUTES;
    return Math.min(EXAM_MAX_DURATION_MINUTES, Math.max(EXAM_MIN_DURATION_MINUTES, n));
}

export function getExamDurationMinutes(exam?: ExamTimingLike | null): number {
    return clampExamDuration(exam?.duration_minutes ?? EXAM_DEFAULT_DURATION_MINUTES);
}

export function getExamMaxAttempts(exam?: ExamTimingLike | null): number {
    const n = Math.round(Number(exam?.max_attempts));
    if (!Number.isFinite(n) || n < 1) return 1;
    return n;
}

/**
 * The single source of truth for "what state is this exam in right now".
 * The persisted `status` column only decides whether the exam is a draft —
 * everything else is derived from the time window so it can never go stale.
 */
export function getExamLiveStatus(exam?: ExamTimingLike | null, now: Date = new Date()): ExamLiveStatus {
    if (!exam) return "DRAFT";
    if (String(exam.status || "").toUpperCase() === "DRAFT") return "DRAFT";

    const start = parseExamDate(exam.start_time);
    const end = parseExamDate(exam.end_time);
    if (!start || !end) return "DRAFT";

    if (now.getTime() < start.getTime()) return "SCHEDULED";
    if (now.getTime() <= end.getTime()) return "ACTIVE";
    return "ENDED";
}

export function isExamOpen(exam?: ExamTimingLike | null, now: Date = new Date()): boolean {
    return getExamLiveStatus(exam, now) === "ACTIVE";
}

/**
 * When the current attempt must be handed in: the earlier of
 * "started + allowed duration" and the end of the exam window.
 * Returns an epoch in ms, or null when the exam has no usable window.
 */
export function getExamAttemptDeadline(exam: ExamTimingLike | null | undefined, startedAt: Date | number): number | null {
    const end = parseExamDate(exam?.end_time);
    if (!end) return null;
    const started = typeof startedAt === "number" ? startedAt : startedAt.getTime();
    const durationDeadline = started + getExamDurationMinutes(exam) * MS_PER_MINUTE;
    return Math.min(durationDeadline, end.getTime());
}

// ============================================================================
// Question eligibility
// ============================================================================

/**
 * Question types the exam runner can both render and auto-grade.
 * `matching`, `puzzle`, `wheel_spin` and `know_dont_know` are live-game types:
 * they have no exam UI and no objective score, so they are dropped rather than
 * silently counted as wrong answers.
 */
export const EXAM_QUESTION_TYPES = [
    "multiple_choice",
    "true_false",
    "shooting",
    "order_questions",
    "qa",
] as const;

export type ExamQuestionType = (typeof EXAM_QUESTION_TYPES)[number];

export interface ExamQuestionLike {
    id?: string;
    type?: string | null;
    question?: string | null;
    options?: string[] | null;
    correctAnswer?: unknown;
    orderItems?: string[] | null;
    points?: number | null;
}

export type ExamAnswer = number | string | string[] | null | undefined;

export function normalizeExamQuestionType(type: unknown): string {
    return String(type || "").trim().toLowerCase();
}

export function isChoiceExamQuestion(type: unknown): boolean {
    const t = normalizeExamQuestionType(type);
    return t === "multiple_choice" || t === "true_false" || t === "shooting";
}

function filledOptions(question: ExamQuestionLike): string[] {
    return (question.options || []).map((o) => String(o ?? "").trim()).filter(Boolean);
}

/**
 * Whether a question can be presented in an exam AND graded objectively.
 * Anything that fails this is excluded from the paper entirely, so a student is
 * never shown a question they cannot answer or scored on one they cannot pass.
 */
export function isGradableExamQuestion(question?: ExamQuestionLike | null): boolean {
    if (!question) return false;
    if (!String(question.question ?? "").trim()) return false;

    const type = normalizeExamQuestionType(question.type);

    if (isChoiceExamQuestion(type)) {
        return filledOptions(question).length >= 2;
    }
    if (type === "order_questions") {
        return (question.orderItems || []).filter((i) => String(i ?? "").trim()).length >= 2;
    }
    if (type === "qa") {
        return String(question.correctAnswer ?? "").trim().length > 0;
    }
    return false;
}

export function filterExamQuestions<T extends ExamQuestionLike>(questions?: T[] | null): T[] {
    return (questions || []).filter(isGradableExamQuestion);
}

export function getExamQuestionPoints(question?: ExamQuestionLike | null): number {
    const points = Math.round(Number(question?.points));
    return Number.isFinite(points) && points > 0 ? points : 100;
}

// ============================================================================
// Answer checking
// ============================================================================

/** Arabic-aware text normalization for free-text answers. */
function normalizeFreeText(value: unknown): string {
    return String(value ?? "")
        .replace(/[ً-ْـ]/g, "") // diacritics + tatweel
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/[.,،؛;:!؟?"'`]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

/** Has the student actually put something down for this question? */
export function isExamAnswerProvided(question: ExamQuestionLike, answer: ExamAnswer): boolean {
    const type = normalizeExamQuestionType(question.type);
    if (isChoiceExamQuestion(type)) return Number.isFinite(Number(answer));
    if (type === "order_questions") return Array.isArray(answer) && answer.length > 0;
    return String(answer ?? "").trim().length > 0;
}

export function isExamAnswerCorrect(question: ExamQuestionLike, answer: ExamAnswer): boolean {
    if (!isExamAnswerProvided(question, answer)) return false;

    const type = normalizeExamQuestionType(question.type);

    if (isChoiceExamQuestion(type)) {
        const correctIndex = resolveIndexedCorrectAnswer(question.correctAnswer, question.options || []);
        return Number(answer) === correctIndex;
    }

    if (type === "order_questions") {
        const expected = (question.orderItems || []).map((i) => String(i ?? "").trim()).filter(Boolean);
        const given = (answer as string[]).map((i) => String(i ?? "").trim());
        return given.length === expected.length && expected.every((item, i) => given[i] === item);
    }

    if (type === "qa") {
        const expected = normalizeFreeText(question.correctAnswer);
        const given = normalizeFreeText(answer);
        if (!expected) return false;
        // Accept a full-sentence answer that contains the expected answer, but
        // never the reverse — a one-letter answer must not match a long one.
        return given === expected || given.includes(expected);
    }

    return false;
}

// ============================================================================
// Grading
// ============================================================================

export interface ExamQuestionResult {
    questionId: string | null;
    questionText: string;
    type: string;
    correct: boolean;
    answered: boolean;
    timeTaken: number;
    points: number;
    pointsEarned: number;
    userAnswer: ExamAnswer;
}

export interface ExamGrade {
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    score: number;
    maxScore: number;
    percentage: number;
    questionResults: ExamQuestionResult[];
}

/**
 * Grade a whole paper. `answers` and `questionTimes` are keyed by the question's
 * index in `questions`, matching the order the student was shown.
 */
export function gradeExam(
    questions: ExamQuestionLike[],
    answers: Record<number, ExamAnswer>,
    questionTimes: Record<number, number> = {},
): ExamGrade {
    let correctAnswers = 0;
    let answeredQuestions = 0;
    let score = 0;
    let maxScore = 0;

    const questionResults: ExamQuestionResult[] = questions.map((question, index) => {
        const userAnswer = answers[index];
        const points = getExamQuestionPoints(question);
        const answered = isExamAnswerProvided(question, userAnswer);
        const correct = answered && isExamAnswerCorrect(question, userAnswer);

        maxScore += points;
        if (answered) answeredQuestions += 1;
        if (correct) {
            correctAnswers += 1;
            score += points;
        }

        return {
            questionId: question.id ?? null,
            questionText: String(question.question ?? ""),
            type: normalizeExamQuestionType(question.type),
            correct,
            answered,
            timeTaken: Math.max(0, Number(questionTimes[index]) || 0),
            points,
            pointsEarned: correct ? points : 0,
            userAnswer: userAnswer ?? null,
        };
    });

    // Percentage follows the points actually available, so weighted questions
    // never disagree with the score shown next to them.
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    return {
        totalQuestions: questions.length,
        answeredQuestions,
        correctAnswers,
        wrongAnswers: questions.length - correctAnswers,
        score,
        maxScore,
        percentage: Math.max(0, Math.min(100, percentage)),
        questionResults,
    };
}

// ============================================================================
// Deterministic shuffling
// ============================================================================

function hashSeed(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/**
 * Fisher-Yates driven by a seeded PRNG: every student gets their own order, but
 * the same student gets the same order again after a reload mid-exam.
 */
export function shuffleWithSeed<T>(items: T[], seed: string): T[] {
    const result = [...items];
    let state = hashSeed(seed) || 1;
    const next = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x100000000;
    };
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
