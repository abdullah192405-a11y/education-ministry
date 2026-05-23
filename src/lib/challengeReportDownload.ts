/** Export challenge report as CSV (UTF-8 with BOM for Excel) */

function escapeCsvCell(value: unknown): string {
    const s = String(value ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

export function stripHtml(text: string): string {
    return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export type ChallengeReportQuestionRow = {
    questionText: string;
    accuracy: number;
    correct: number;
    total: number;
};

export type ChallengeReportChartOptions = {
    scoreDistribution?: Array<{ label: string; count: number; fill?: string }>;
    dailyTrend?: Array<{
        day: string;
        date?: string;
        attempts: number;
        participants?: number;
        avg: number;
        passRate: number;
    }>;
    participantTypeData?: Array<{ name: string; value: number; color?: string }>;
    answerOutcomeData?: Array<{ name: string; value: number; color?: string }>;
    topScoreChartData?: Array<{ name: string; score: number }>;
    questionAccuracyChartData?: Array<{ shortLabel: string; accuracy: number; label?: string }>;
    questionTimeChartData?: Array<{ shortLabel: string; avgTime: number; label?: string }>;
    scoreBoxData?: Array<{ label: string; value: number; fill?: string }>;
    scoreTimeScatterData?: Array<{ name?: string; time: number; score: number }>;
    learnerSegments?: Array<{ name: string; count: number; fill?: string }>;
    questionDifficultyData?: Array<{ name: string; count: number; fill?: string }>;
};

export type ChallengeRecommendationReport = {
    headline: string;
    summary: string;
    keyFindings?: string[];
    sections: Array<{
        title: string;
        priority?: string;
        timeframe?: string;
        evidence?: string[];
        actions?: string[];
        successIndicators?: string[];
        points: string[];
    }>;
};

export type ChallengeReportLessonRating = {
    total: number;
    average: number;
    distribution: Array<{
        value: number;
        emoji: string;
        label: string;
        count: number;
        percent: number;
    }>;
};

import { getChallengeReportLabels, type ReportLanguage } from "./challengeReportLabels";
import { getLessonRatingLabel } from "./lessonRatingLabels";

export type ChallengeReportCsvOptions = {
    language?: ReportLanguage;
    topicTitle: string;
    lessonTitle?: string;
    className?: string;
    subjectName?: string;
    teacherName?: string;
    sessionDate?: string;
    sessionTime?: string;
    mergedSessionsNote?: string;
    analysisRows?: Array<{ label: string; value: string | number }>;
    lessonRating?: ChallengeReportLessonRating;
    recommendations?: string[];
    recommendationReport?: ChallengeRecommendationReport;
    charts?: ChallengeReportChartOptions;
    results: any[];
    questionRows?: ChallengeReportQuestionRow[];
};

export function downloadChallengeResultsCsv(opts: ChallengeReportCsvOptions): void {
    const L = getChallengeReportLabels(opts.language);
    const lines: string[] = [];
    const join = (cells: unknown[]) => cells.map(escapeCsvCell).join(",");

    lines.push(join([L.csv.field, L.csv.value]));
    lines.push(join([L.csv.topicTitle, opts.topicTitle]));
    if (opts.lessonTitle) lines.push(join([L.meta.lessonName, opts.lessonTitle]));
    if (opts.className) lines.push(join([L.meta.className, opts.className]));
    if (opts.subjectName) lines.push(join([L.meta.subject, opts.subjectName]));
    if (opts.teacherName) lines.push(join([L.meta.teacherName, opts.teacherName]));
    if (opts.sessionDate) lines.push(join([L.meta.date, opts.sessionDate]));
    if (opts.sessionTime) lines.push(join([L.meta.time, opts.sessionTime]));
    if (opts.mergedSessionsNote) lines.push(join([L.csv.note, opts.mergedSessionsNote]));

    lines.push("");
    lines.push(join([L.csv.participants]));
    lines.push(
        join([
            L.participantsTable.rank,
            L.participantsTable.participant,
            `${L.participantsTable.percent} %`,
            L.participantsTable.points,
            L.participantsTable.correct,
            L.participantsTable.wrong,
            `${L.participantsTable.time} (${L.charts.secSuffix})`,
            L.participantsTable.type,
        ])
    );

    const sorted = [...(opts.results || [])].sort(
        (a, b) => (b.score || 0) - (a.score || 0)
    );

    sorted.forEach((r, i) => {
        const name =
            r.user?.name || r.name || r.participant_display_name || "";
        const type = r.user?.id ? L.participantsTable.registered : L.participantsTable.guest;
        lines.push(
            join([
                i + 1,
                name,
                (r.percentage ?? "").toString(),
                (r.score ?? "").toString(),
                (r.correct_answers ?? "").toString(),
                (r.wrong_answers ?? "").toString(),
                (r.time_taken ?? "").toString(),
                type,
            ])
        );
    });

    if (opts.lessonRating && opts.lessonRating.total > 0) {
        lines.push("");
        lines.push(join([L.csv.lessonRating]));
        lines.push(
            join([
                L.csv.totalRatings,
                opts.lessonRating.total,
                L.csv.avgOutOf5,
                opts.lessonRating.average.toFixed(1),
            ])
        );
        lines.push(join([L.csv.emoji, L.csv.label, L.csv.count, L.csv.percent]));
        for (const row of opts.lessonRating.distribution) {
            if (row.count <= 0) continue;
            lines.push(
                join([
                    row.emoji,
                    getLessonRatingLabel(row.value, opts.language),
                    row.count,
                    row.percent,
                ])
            );
        }
    }

    if (opts.questionRows && opts.questionRows.length > 0) {
        lines.push("");
        lines.push(join([L.csv.questionAnalysis]));
        lines.push(
            join([L.csv.questionTextShort, L.csv.accuracyPct, L.participantsTable.correct, L.csv.totalAnswers])
        );
        for (const q of opts.questionRows) {
            lines.push(
                join([
                    stripHtml(q.questionText).slice(0, 2000),
                    q.accuracy,
                    q.correct,
                    q.total,
                ])
            );
        }
    }

    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `challenge-report-${new Date().toISOString().slice(0, 10)}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
