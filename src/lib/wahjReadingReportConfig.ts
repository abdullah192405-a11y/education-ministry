/** Configuration for the Wahj reading program personalized report. */

export const WAHJ_READING_PROGRAM = {
    gradeName: "جمعية وهج الثقافية",
    subjectName: "فن التواصل",
    programName: "قراء وهج",
    targetPages: 500,
    discountValue: "20%",
    pageQuestionKeywords: [/صفح/i, /قرأت/i, /عدد الصفحات/i, /pages/i],
    quoteQuestionKeywords: [/اقتباس/i, /فائدة/i, /فكرة/i, /شارك/i],
    quoteStyleThresholds: { engaged: 8, organizer: 3 },
    compositeWeights: { pages: 1, quotes: 5, completion: 2 },
    /** Used when answers cannot be parsed or are missing from challenge data. */
    defaults: {
        pages: 36,
        quotes: 0,
        days: 0,
        attempts: 0,
        lessonsEngaged: 0,
        challengeScore: 0,
        focusHours: 0,
        engagementIndex: 0,
        readingMomentum: 0,
        consistencyScore: 0,
    },
} as const;

const normalizeLabel = (value?: string) =>
    String(value ?? "")
        .replace(/\u0640/g, "")
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

export function isWahjReadingProgram(className?: string, subjectName?: string): boolean {
    return (
        normalizeLabel(className) === normalizeLabel(WAHJ_READING_PROGRAM.gradeName) &&
        normalizeLabel(subjectName) === normalizeLabel(WAHJ_READING_PROGRAM.subjectName)
    );
}
