import {
    aggregateChallengeQuestionStats,
    stripQuestionHtml,
    type AggregatedQuestionStat,
} from "@/lib/challengeQuestionAnalytics";
import type {
    ChallengeReportChartOptions,
    ChallengeReportCsvOptions,
} from "@/lib/challengeReportDownload";
import { getExamDurationMinutes } from "@/lib/examLogic";

/**
 * Build the exam report payload consumed by the shared challenge report
 * exporters (CSV and PDF). Only the shaping lives here — rendering, the PDF
 * endpoint and the print fallback are reused as-is.
 */

/** Caller-supplied strings so this module stays free of the i18n runtime. */
export type ExamReportLabels = {
    participants: string;
    average: string;
    passRate: string;
    highest: string;
    lowest: string;
    avgTime: string;
    questionsCount: string;
    duration: string;
    category: string;
    window: string;
    minutesSuffix: string;
    secondsSuffix: string;
    correct: string;
    wrong: string;
    unanswered: string;
    bandExcellent: string;
    bandGood: string;
    bandPass: string;
    bandFail: string;
    questionShort: string;
};

export type ExamReportInput = {
    exam: any;
    labels: ExamReportLabels;
    language?: "ar" | "en";
    locale?: string;
    categoryLabel?: string;
    teacherName?: string;
};

const PASS_MARK = 50;

const round = (n: number) => Math.round(Number.isFinite(n) ? n : 0);

const percentOf = (row: any): number => {
    const pct = Number(row?.percentage);
    if (Number.isFinite(pct)) return pct;
    const score = Number(row?.score);
    const max = Number(row?.max_score);
    return Number.isFinite(score) && Number.isFinite(max) && max > 0 ? (score / max) * 100 : 0;
};

const formatDateTime = (value: unknown, locale: string): string => {
    if (!value) return "";
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(locale, {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
};

/** Participant rows in the shape the shared report renderer expects. */
const toReportResults = (results: any[]) =>
    results.map((row) => ({
        ...row,
        name: row.user?.name || row.student_name || "",
        percentage: round(percentOf(row)),
    }));

const buildScoreBands = (percentages: number[], labels: ExamReportLabels) => {
    const bands = [
        { label: labels.bandExcellent, min: 90, fill: "#10b981" },
        { label: labels.bandGood, min: 70, fill: "#3b82f6" },
        { label: labels.bandPass, min: PASS_MARK, fill: "#f59e0b" },
        { label: labels.bandFail, min: -1, fill: "#ef4444" },
    ];

    return bands.map((band, index) => {
        const upper = index === 0 ? Infinity : bands[index - 1].min;
        return {
            label: band.label,
            count: percentages.filter((p) => p >= band.min && p < upper).length,
            fill: band.fill,
        };
    });
};

const buildQuestionCharts = (
    stats: AggregatedQuestionStat[],
    labels: ExamReportLabels,
): Pick<ChallengeReportChartOptions, "questionAccuracyChartData" | "questionTimeChartData"> => {
    if (stats.length === 0) return {};

    const shortLabel = (index: number) => `${labels.questionShort}${index + 1}`;

    return {
        questionAccuracyChartData: stats.map((stat, index) => ({
            shortLabel: shortLabel(index),
            accuracy: stat.accuracy,
            label: stat.label,
        })),
        // Only meaningful once at least one question carries a recorded time.
        questionTimeChartData: stats.some((s) => s.avgTime > 0)
            ? stats.map((stat, index) => ({
                shortLabel: shortLabel(index),
                avgTime: stat.avgTime,
                label: stat.label,
            }))
            : undefined,
    };
};

export function buildExamReportOptions({
    exam,
    labels,
    language,
    locale = language === "en" ? "en-US" : "ar-SA",
    categoryLabel,
    teacherName,
}: ExamReportInput): ChallengeReportCsvOptions {
    const results: any[] = exam?.exam_results || [];
    const questions: any[] = exam?.challengeItems || [];

    const percentages = results.map(percentOf);
    const count = results.length;
    const average = count ? percentages.reduce((a, b) => a + b, 0) / count : 0;
    const passed = percentages.filter((p) => p >= PASS_MARK).length;
    const avgTime = count
        ? results.reduce((acc, r) => acc + (Number(r.time_taken) || 0), 0) / count
        : 0;

    const totalCorrect = results.reduce((acc, r) => acc + (Number(r.correct_answers) || 0), 0);
    const totalAnswered = results.reduce(
        (acc, r) => acc + (Number(r.correct_answers) || 0) + (Number(r.wrong_answers) || 0),
        0,
    );
    const totalQuestionsAsked = results.reduce(
        (acc, r) => acc + (Number(r.total_questions) || questions.length),
        0,
    );

    // The aggregator matches each attempt's question_results against a catalog,
    // and reads `challengeItems` off whatever it is given — the exam works as
    // that catalog exactly like a topic does.
    const questionStats = aggregateChallengeQuestionStats(results, exam);

    const charts: ChallengeReportChartOptions = {
        scoreDistribution: count ? buildScoreBands(percentages, labels) : undefined,
        answerOutcomeData: totalAnswered
            ? [
                { name: labels.correct, value: totalCorrect, color: "#10b981" },
                { name: labels.wrong, value: totalAnswered - totalCorrect, color: "#ef4444" },
                {
                    name: labels.unanswered,
                    value: Math.max(0, totalQuestionsAsked - totalAnswered),
                    color: "#94a3b8",
                },
            ].filter((slice) => slice.value > 0)
            : undefined,
        topScoreChartData: count
            ? toReportResults(results)
                .sort((a, b) => b.percentage - a.percentage)
                .slice(0, 6)
                .map((r) => ({ name: r.name, score: r.percentage }))
            : undefined,
        ...buildQuestionCharts(questionStats, labels),
    };

    const analysisRows: Array<{ label: string; value: string | number }> = [
        { label: labels.participants, value: count },
        { label: labels.questionsCount, value: questions.length },
        { label: labels.duration, value: `${getExamDurationMinutes(exam)} ${labels.minutesSuffix}` },
    ];

    if (categoryLabel) analysisRows.push({ label: labels.category, value: categoryLabel });

    const windowLabel = [formatDateTime(exam?.start_time, locale), formatDateTime(exam?.end_time, locale)]
        .filter(Boolean)
        .join(" — ");
    if (windowLabel) analysisRows.push({ label: labels.window, value: windowLabel });

    if (count > 0) {
        analysisRows.push(
            { label: labels.average, value: `${round(average)}%` },
            { label: labels.passRate, value: `${round((passed / count) * 100)}%` },
            { label: labels.highest, value: `${round(Math.max(...percentages))}%` },
            { label: labels.lowest, value: `${round(Math.min(...percentages))}%` },
            { label: labels.avgTime, value: `${round(avgTime)} ${labels.secondsSuffix}` },
        );
    }

    const questionRows = questionStats.length > 0
        ? questionStats.map((stat, index) => ({
            questionText: `${index + 1}. ${stripQuestionHtml(stat.label)}`,
            accuracy: stat.accuracy,
            correct: stat.correct,
            total: stat.attempts,
        }))
        // No attempts yet: still list the paper so the export is not empty.
        : questions.map((q: any, index: number) => ({
            questionText: `${index + 1}. ${stripQuestionHtml(q?.question)}`,
            accuracy: 0,
            correct: 0,
            total: 0,
        }));

    return {
        language,
        fileNamePrefix: "exam-report",
        topicTitle: exam?.title || "",
        lessonTitle: exam?.topic?.title || undefined,
        className: exam?.grade?.name || exam?.topic?.subject?.grade?.name || undefined,
        subjectName: exam?.topic?.subject?.name || undefined,
        teacherName: teacherName || exam?.host?.name || undefined,
        sessionDate: formatDateTime(exam?.start_time, locale) || undefined,
        sessionTime: undefined,
        analysisRows,
        charts,
        results: toReportResults(results),
        questionRows: questionRows.length > 0 ? questionRows : undefined,
    };
}
