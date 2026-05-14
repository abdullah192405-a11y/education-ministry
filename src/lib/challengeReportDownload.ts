/** تصدير تقرير تحدي للمعلم كملف CSV (يعمل مع Excel، UTF-8 مع BOM للعربية) */

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

export type ChallengeReportCsvOptions = {
    topicTitle: string;
    lessonTitle?: string;
    className?: string;
    subjectName?: string;
    teacherName?: string;
    sessionDate?: string;
    sessionTime?: string;
    mergedSessionsNote?: string;
    analysisRows?: Array<{ label: string; value: string | number }>;
    recommendations?: string[];
    recommendationReport?: ChallengeRecommendationReport;
    charts?: ChallengeReportChartOptions;
    results: any[];
    questionRows?: ChallengeReportQuestionRow[];
};

export function downloadChallengeResultsCsv(opts: ChallengeReportCsvOptions): void {
    const lines: string[] = [];
    const join = (cells: unknown[]) => cells.map(escapeCsvCell).join(",");

    lines.push(join(["الحقل", "القيمة"]));
    lines.push(join(["عنوان الدرس / الموضوع", opts.topicTitle]));
    if (opts.lessonTitle) lines.push(join(["اسم الدرس", opts.lessonTitle]));
    if (opts.className) lines.push(join(["اسم الصف / الفصل", opts.className]));
    if (opts.subjectName) lines.push(join(["المادة", opts.subjectName]));
    if (opts.teacherName) lines.push(join(["اسم المعلم", opts.teacherName]));
    if (opts.sessionDate) lines.push(join(["التاريخ", opts.sessionDate]));
    if (opts.sessionTime) lines.push(join(["الوقت", opts.sessionTime]));
    if (opts.mergedSessionsNote) lines.push(join(["ملاحظة", opts.mergedSessionsNote]));

    lines.push("");
    lines.push(join(["المشاركون"]));
    lines.push(
        join([
            "الترتيب",
            "الاسم",
            "النسبة %",
            "النقاط",
            "صحيح",
            "خطأ",
            "الوقت (ث)",
            "النوع",
        ])
    );

    const sorted = [...(opts.results || [])].sort(
        (a, b) => (b.score || 0) - (a.score || 0)
    );

    sorted.forEach((r, i) => {
        const name =
            r.user?.name || r.name || r.participant_display_name || "";
        const type = r.user?.id ? "عضو مسجل" : "زائر";
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

    if (opts.questionRows && opts.questionRows.length > 0) {
        lines.push("");
        lines.push(join(["تحليل الأسئلة"]));
        lines.push(
            join(["نص السؤال (مختصر)", "الدقة %", "صحيح", "إجمالي الإجابات"])
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
