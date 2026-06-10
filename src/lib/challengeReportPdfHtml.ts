type ChallengeReportQuestionRow = {
    questionText: string;
    accuracy: number;
    correct: number;
    total: number;
};

type ChallengeRecommendationReport = {
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

type ChallengeReportLessonRating = {
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

import {
    formatReportLabel,
    getChallengeReportLabels,
    type ChallengeReportLabels,
    type ReportLanguage,
} from "./challengeReportLabels";
import { getLessonRatingLabel } from "./lessonRatingLabels";

let L: ChallengeReportLabels = getChallengeReportLabels("ar");

type ChallengeReportOptions = {
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
    charts?: Record<string, Array<Record<string, unknown>> | undefined>;
    results?: any[];
    questionRows?: ChallengeReportQuestionRow[];
};

const PALETTE = ["#7c3aed", "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#0f766e"];

function getReportFontBaseUrl(): string {
    if (typeof window !== "undefined" && window.location?.origin) {
        return window.location.origin;
    }
    return "https://www.labforai.com";
}

function buildUrlReportFontFaces(baseUrl: string): string {
    const origin = baseUrl.replace(/\/$/, "");
    return `
        @font-face {
            font-family: "Cairo";
            font-style: normal;
            font-weight: 400;
            font-display: block;
            src: url("${origin}/fonts/cairo/cairo-400.ttf") format("truetype");
        }
        @font-face {
            font-family: "Cairo";
            font-style: normal;
            font-weight: 600;
            font-display: block;
            src: url("${origin}/fonts/cairo/cairo-600.ttf") format("truetype");
        }
        @font-face {
            font-family: "Cairo";
            font-style: normal;
            font-weight: 700;
            font-display: block;
            src: url("${origin}/fonts/cairo/cairo-700.ttf") format("truetype");
        }
    `;
}

function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function stripHtml(value: unknown): string {
    return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function numeric(value: unknown, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function getParticipantName(row: any): string {
    return (
        row?.user?.name ||
        row?.name ||
        row?.participant_display_name ||
        row?.display_name ||
        "—"
    );
}

function getScorePercent(row: any): number {
    const percentage = Number(row?.percentage);
    if (Number.isFinite(percentage)) return Math.max(0, Math.min(100, Math.round(percentage)));

    const score = Number(row?.score);
    const maxScore = Number(row?.max_score ?? row?.maxScore);
    if (Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0) {
        return Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));
    }

    return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
}

function computeSummary(results: any[]) {
    const count = results.length;
    const totalPercent = results.reduce((sum, row) => sum + getScorePercent(row), 0);
    const totalScore = results.reduce((sum, row) => sum + numeric(row?.score), 0);
    const members = results.filter((row) => Boolean(row?.user?.id)).length;
    const guests = count - members;

    return {
        count,
        averagePercent: count ? Math.round(totalPercent / count) : 0,
        averageScore: count ? Math.round(totalScore / count) : 0,
        maxScore: results.reduce((max, row) => Math.max(max, numeric(row?.score)), 0),
        members,
        guests,
    };
}

function renderMetricCards(summary: ReturnType<typeof computeSummary>): string {
    const metrics = [
        [L.metrics.totalAttempts, summary.count],
        [L.metrics.avgPercent, `${summary.averagePercent}%`],
        [L.metrics.avgPoints, summary.averageScore],
        [L.metrics.maxPoints, summary.maxScore],
        [L.metrics.registeredMembers, summary.members],
        [L.metrics.guests, summary.guests],
    ];

    return `
        <section class="metric-grid">
            ${metrics
                .map(
                    ([label, value]) => `
                        <div class="metric-card">
                            <span>${escapeHtml(label)}</span>
                            <strong>${escapeHtml(value)}</strong>
                        </div>
                    `
                )
                .join("")}
        </section>
    `;
}

function renderReportMeta(opts: ChallengeReportOptions, generatedAt: string): string {
    const rows = [
        [L.meta.lessonName, opts.lessonTitle],
        [L.meta.className, opts.className],
        [L.meta.subject, opts.subjectName],
        [L.meta.teacherName, opts.teacherName],
        [L.meta.date, opts.sessionDate],
        [L.meta.time, opts.sessionTime],
        [L.meta.generatedAt, generatedAt],
    ].filter(([, value]) => value);

    return rows
        .map(([label, value]) => `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`)
        .join("");
}

function renderLessonRatings(lessonRating?: ChallengeReportLessonRating): string {
    if (!lessonRating?.total) return "";

    const rows = lessonRating.distribution.filter((row) => row.count > 0);
  const maxCount = Math.max(...rows.map((row) => row.count), 1);

    return `
        <section class="section page-break-avoid">
            <h2>${escapeHtml(L.sections.lessonRating)}</h2>
            <p class="lesson-rating-summary">
                ${escapeHtml(
                    formatReportLabel(L.sections.lessonRatingSummaryLine, {
                        count: lessonRating.total,
                        avg: lessonRating.average.toFixed(1),
                    })
                )}
            </p>
            <div class="lesson-rating-bars">
                ${lessonRating.distribution
                    .map((row) => {
                        const width = row.count > 0 ? Math.max(8, Math.round((row.count / maxCount) * 100)) : 0;
                        return `
                            <div class="lesson-rating-row">
                                <div class="lesson-rating-label">
                                    <span class="lesson-rating-emoji">${row.emoji}</span>
                                    <span>${escapeHtml(getLessonRatingLabel(row.value, L.lang as ReportLanguage))}</span>
                                </div>
                                <div class="lesson-rating-track">
                                    <div class="lesson-rating-fill" style="width:${width}%"></div>
                                </div>
                                <div class="lesson-rating-meta">${row.count} (${row.percent}%)</div>
                            </div>
                        `;
                    })
                    .join("")}
            </div>
        </section>
    `;
}

function renderAnalysisRows(rows?: Array<{ label: string; value: string | number }>): string {
    if (!rows?.length) return "";

    return `
        <section class="section">
            <h2>${escapeHtml(L.sections.additionalAnalysis)}</h2>
            <div class="analysis-grid">
                ${rows
                    .map(
                        (row) => `
                            <div class="analysis-item">
                                <span>${escapeHtml(row.label)}</span>
                                <strong>${escapeHtml(row.value)}</strong>
                            </div>
                        `
                    )
                    .join("")}
            </div>
        </section>
    `;
}

function renderRecommendations(recommendations?: string[]): string {
    if (!recommendations?.length) return "";

    return `
        <section class="section">
            <h2>${escapeHtml(L.sections.educationalRecommendations)}</h2>
            <ul class="recommendations">
                ${recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
        </section>
    `;
}

function renderRecommendationListBlock(title: string, items?: string[], className = ""): string {
    if (!items?.length) return "";

    return `
        <div class="recommendation-block ${className}">
            <div class="recommendation-block-title">${escapeHtml(title)}</div>
            <ul>
                ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
        </div>
    `;
}

function renderRecommendationReport(report?: ChallengeRecommendationReport, recommendations?: string[]): string {
    if (!report?.sections?.length) return renderRecommendations(recommendations);

    return `
        <section class="section recommendation-report">
            <h2>${escapeHtml(L.sections.educationalRecommendations)}</h2>
            <div class="recommendation-summary">
                <div class="recommendation-kicker">${escapeHtml(L.sections.recommendationsKicker)}</div>
                <h3>${escapeHtml(report.headline)}</h3>
                <p>${escapeHtml(report.summary)}</p>
            </div>
            ${report.keyFindings?.length ? `
                <div class="key-findings">
                    ${report.keyFindings.map((finding) => `<div class="key-finding">${escapeHtml(finding)}</div>`).join("")}
                </div>
            ` : ""}
            <div class="recommendation-grid">
                ${report.sections
                    .map((section, index) => {
                        const actions = section.actions?.length ? section.actions : section.points;
                        return `
                            <article class="recommendation-section">
                                <div class="recommendation-section-head">
                                    <span class="recommendation-index">${index + 1}</span>
                                    <div>
                                        <h4>${escapeHtml(section.title)}</h4>
                                        <div class="recommendation-badges">
                                            ${section.priority ? `<span>${escapeHtml(L.recommendation.priority)}: ${escapeHtml(section.priority)}</span>` : ""}
                                            ${section.timeframe ? `<span>${escapeHtml(L.recommendation.timeframe)}: ${escapeHtml(section.timeframe)}</span>` : ""}
                                        </div>
                                    </div>
                                </div>
                                ${renderRecommendationListBlock(L.recommendation.dataEvidence, section.evidence, "evidence-block")}
                                ${renderRecommendationListBlock(L.recommendation.suggestedActions, actions, "actions-block")}
                                ${renderRecommendationListBlock(L.recommendation.successIndicators, section.successIndicators, "indicators-block")}
                            </article>
                        `;
                    })
                    .join("")}
            </div>
        </section>
    `;
}

function getLabel(row: Record<string, unknown>): string {
    return String(row.label ?? row.name ?? row.shortLabel ?? row.day ?? row.date ?? "—");
}

function getChartValue(row: Record<string, unknown>): number {
    return numeric(row.value ?? row.count ?? row.score ?? row.accuracy ?? row.avg ?? row.avgTime ?? row.attempts);
}

function getChartColor(row: Record<string, unknown>, index: number): string {
    return String(row.fill ?? row.color ?? PALETTE[index % PALETTE.length]);
}

function compactRows(rows: Array<Record<string, unknown>>, limit = 8): Array<Record<string, unknown>> {
    return rows.slice(0, limit);
}

function formatChartValue(value: number, suffix = ""): string {
    return `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
}

function renderBarChart(title: string, rows?: Array<Record<string, unknown>>, suffix = "", limit = 8): string {
    if (!rows?.length) return "";

    const visibleRows = compactRows(rows, limit);
    const values = visibleRows.map(getChartValue);
    const max = Math.max(...values, 1);
    const average = values.length
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        : 0;

    return `
        <div class="chart-card">
            <div class="chart-head">
                <h3>${escapeHtml(title)}</h3>
                <span>${escapeHtml(L.charts.average)} ${escapeHtml(formatChartValue(average, suffix))}</span>
            </div>
            <div class="bar-list">
                ${visibleRows
                    .map((row, index) => {
                        const value = getChartValue(row);
                        const width = Math.max(3, Math.round((value / max) * 100));
                        const color = getChartColor(row, index);
                        return `
                            <div class="bar-row">
                                <span class="bar-label" title="${escapeHtml(row.label ?? getLabel(row))}">${escapeHtml(getLabel(row))}</span>
                                <div class="bar-track">
                                    <div class="bar-fill" style="width:${width}%; background:${escapeHtml(color)}"></div>
                                </div>
                                <strong>${escapeHtml(formatChartValue(value, suffix))}</strong>
                            </div>
                        `;
                    })
                    .join("")}
            </div>
            ${rows.length > visibleRows.length ? `<p class="chart-note">${escapeHtml(formatReportLabel(L.charts.showsTopN, { shown: visibleRows.length, total: rows.length }))}</p>` : ""}
        </div>
    `;
}

function renderDonutChart(title: string, rows?: Array<Record<string, unknown>>): string {
    if (!rows?.length) return "";

    const visibleRows = compactRows(rows, 6);
    const total = visibleRows.reduce((sum, row) => sum + getChartValue(row), 0);
    if (total <= 0) return "";

    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    const segments = visibleRows
        .map((row, index) => {
            const value = getChartValue(row);
            const dash = (value / total) * circumference;
            const segment = `
                <circle
                    cx="72"
                    cy="72"
                    r="${radius}"
                    fill="none"
                    stroke="${escapeHtml(getChartColor(row, index))}"
                    stroke-width="22"
                    stroke-dasharray="${dash} ${circumference - dash}"
                    stroke-dashoffset="${-offset}"
                    transform="rotate(-90 72 72)"
                />`;
            offset += dash;
            return segment;
        })
        .join("");

    return `
        <div class="chart-card">
            <div class="chart-head">
                <h3>${escapeHtml(title)}</h3>
                <span>${escapeHtml(L.charts.total)} ${escapeHtml(total)}</span>
            </div>
            <div class="donut-wrap">
                <svg class="donut" viewBox="0 0 144 144" aria-hidden="true">
                    <circle cx="72" cy="72" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="22" />
                    ${segments}
                    <text x="72" y="68" text-anchor="middle" class="donut-total">${escapeHtml(total)}</text>
                    <text x="72" y="86" text-anchor="middle" class="donut-label">${escapeHtml(L.charts.total)}</text>
                </svg>
                <div class="legend">
                    ${visibleRows
                        .map((row, index) => {
                            const value = getChartValue(row);
                            const percent = Math.round((value / total) * 100);
                            return `
                                <div class="legend-item">
                                    <i style="background:${escapeHtml(getChartColor(row, index))}"></i>
                                    <span>${escapeHtml(getLabel(row))}</span>
                                    <strong>${escapeHtml(value)} (${percent}%)</strong>
                                </div>
                            `;
                        })
                        .join("")}
                </div>
            </div>
        </div>
    `;
}

function renderDailyTrendChart(rows?: Array<Record<string, unknown>>): string {
    if (!rows?.length) return "";

    const visibleRows = rows.slice(-7);
    const width = 520;
    const height = 210;
    const left = 34;
    const right = 18;
    const top = 20;
    const bottom = 42;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const maxAttempts = Math.max(...visibleRows.map((row) => numeric(row.attempts)), 1);
    const pointGap = visibleRows.length > 1 ? plotW / (visibleRows.length - 1) : plotW;

    const points = visibleRows.map((row, index) => {
        const x = left + pointGap * index;
        const avg = Math.max(0, Math.min(100, numeric(row.avg)));
        const y = top + plotH - (avg / 100) * plotH;
        return { x, y, avg };
    });

    const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

    return `
        <div class="chart-card chart-card-wide">
            <div class="chart-head">
                <h3>${escapeHtml(L.charts.weeklyTrend)}</h3>
                <span>${escapeHtml(L.charts.weeklyTrendSub)}</span>
            </div>
            <svg class="trend-chart" viewBox="0 0 ${width} ${height}" aria-hidden="true">
                ${[0, 25, 50, 75, 100]
                    .map((tick) => {
                        const y = top + plotH - (tick / 100) * plotH;
                        return `
                            <line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" class="grid-line" />
                            <text x="${left - 8}" y="${y + 4}" class="axis-label">${tick}%</text>
                        `;
                    })
                    .join("")}
                ${visibleRows
                    .map((row, index) => {
                        const x = left + pointGap * index;
                        const attempts = numeric(row.attempts);
                        const barH = Math.max(3, (attempts / maxAttempts) * plotH);
                        const y = top + plotH - barH;
                        return `
                            <rect x="${x - 12}" y="${y}" width="24" height="${barH}" rx="6" class="trend-bar" />
                            <text x="${x}" y="${height - 16}" class="x-label">${escapeHtml(row.day ?? row.date ?? index + 1)}</text>
                            <text x="${x}" y="${Math.max(y - 4, top + 9)}" class="bar-value">${escapeHtml(attempts)}</text>
                        `;
                    })
                    .join("")}
                <polyline points="${polyline}" fill="none" class="trend-line" />
                ${points
                    .map(
                        (point) => `
                            <circle cx="${point.x}" cy="${point.y}" r="5" class="trend-dot" />
                            <text x="${point.x}" y="${point.y - 10}" class="line-value">${escapeHtml(point.avg)}%</text>
                        `
                    )
                    .join("")}
            </svg>
        </div>
    `;
}

function renderScatterChart(rows?: Array<Record<string, unknown>>): string {
    if (!rows?.length) return "";

    const visibleRows = compactRows(rows, 45);
    const width = 520;
    const height = 220;
    const left = 42;
    const right = 18;
    const top = 22;
    const bottom = 44;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const maxTime = Math.max(...visibleRows.map((row) => numeric(row.time)), 1);

    return `
        <div class="chart-card chart-card-wide">
            <div class="chart-head">
                <h3>${escapeHtml(L.charts.timeVsScore)}</h3>
                <span>${escapeHtml(L.charts.timeVsScoreSub)}</span>
            </div>
            <svg class="scatter-chart" viewBox="0 0 ${width} ${height}" aria-hidden="true">
                ${[0, 25, 50, 75, 100]
                    .map((tick) => {
                        const y = top + plotH - (tick / 100) * plotH;
                        return `
                            <line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" class="grid-line" />
                            <text x="${left - 8}" y="${y + 4}" class="axis-label">${tick}%</text>
                        `;
                    })
                    .join("")}
                <line x1="${left}" y1="${top + plotH}" x2="${width - right}" y2="${top + plotH}" class="axis-line" />
                <line x1="${left}" y1="${top}" x2="${left}" y2="${top + plotH}" class="axis-line" />
                ${visibleRows
                    .map((row, index) => {
                        const time = Math.max(0, numeric(row.time));
                        const score = Math.max(0, Math.min(100, numeric(row.score)));
                        const x = left + (time / maxTime) * plotW;
                        const y = top + plotH - (score / 100) * plotH;
                        return `<circle cx="${x}" cy="${y}" r="5" fill="${escapeHtml(getChartColor(row, index))}" opacity="0.78" />`;
                    })
                    .join("")}
                <text x="${left}" y="${height - 14}" class="x-label">${escapeHtml(L.charts.lessTime)}</text>
                <text x="${width - right}" y="${height - 14}" class="x-label">${escapeHtml(L.charts.moreTime)}</text>
            </svg>
            ${rows.length > visibleRows.length ? `<p class="chart-note">${escapeHtml(formatReportLabel(L.charts.showsFirstN, { shown: visibleRows.length, total: rows.length }))}</p>` : ""}
        </div>
    `;
}

function renderCharts(charts?: ChallengeReportOptions["charts"]): string {
    if (!charts) return "";

    const chartSections = [
        renderDailyTrendChart(charts.dailyTrend),
        renderDonutChart(L.charts.participantType, charts.participantTypeData),
        renderDonutChart(L.charts.answerOutcomes, charts.answerOutcomeData),
        renderBarChart(L.charts.scoreDistribution, charts.scoreDistribution),
        renderBarChart(L.charts.topScores, charts.topScoreChartData, "%", 6),
        renderBarChart(L.charts.questionAccuracy, charts.questionAccuracyChartData, "%", 8),
        renderBarChart(L.charts.avgQuestionTime, charts.questionTimeChartData, L.charts.secSuffix, 8),
        renderBarChart(L.charts.scoreDistributionSummary, charts.scoreBoxData),
        renderScatterChart(charts.scoreTimeScatterData),
        renderBarChart(L.charts.learnerSegments, charts.learnerSegments),
        renderBarChart(L.charts.questionDifficulty, charts.questionDifficultyData),
    ].filter(Boolean);

    if (!chartSections.length) return "";

    return `
        <section class="section page-break-avoid">
            <h2>${escapeHtml(L.sections.chartsAndIndicators)}</h2>
            <div class="charts-grid">${chartSections.join("")}</div>
        </section>
    `;
}

function renderParticipants(results: any[]): string {
    const sorted = [...results].sort((a, b) => getScorePercent(b) - getScorePercent(a));

    return `
        <section class="section">
            <h2>${escapeHtml(L.sections.participantsLog)}</h2>
            <table>
                <thead>
                    <tr>
                        <th>${escapeHtml(L.participantsTable.rank)}</th>
                        <th>${escapeHtml(L.participantsTable.participant)}</th>
                        <th>${escapeHtml(L.participantsTable.percent)}</th>
                        <th>${escapeHtml(L.participantsTable.points)}</th>
                        <th>${escapeHtml(L.participantsTable.correct)}</th>
                        <th>${escapeHtml(L.participantsTable.wrong)}</th>
                        <th>${escapeHtml(L.participantsTable.time)}</th>
                        <th>${escapeHtml(L.participantsTable.type)}</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                        sorted.length
                            ? sorted
                                  .map(
                                      (row, index) => `
                                        <tr>
                                            <td>${index + 1}</td>
                                            <td>${escapeHtml(getParticipantName(row))}</td>
                                            <td>${getScorePercent(row)}%</td>
                                            <td>${escapeHtml(row?.score ?? "—")}</td>
                                            <td>${escapeHtml(row?.correct_answers ?? row?.correctAnswers ?? "—")}</td>
                                            <td>${escapeHtml(row?.wrong_answers ?? row?.wrongAnswers ?? "—")}</td>
                                            <td>${escapeHtml(row?.time_taken ?? row?.timeTaken ?? "—")}</td>
                                            <td>${row?.user?.id ? escapeHtml(L.participantsTable.registered) : escapeHtml(L.participantsTable.guest)}</td>
                                        </tr>
                                    `
                                  )
                                  .join("")
                            : `<tr><td colspan="8" class="empty">${escapeHtml(L.participantsTable.empty)}</td></tr>`
                    }
                </tbody>
            </table>
        </section>
    `;
}

function renderQuestionRows(rows?: ChallengeReportQuestionRow[]): string {
    if (!rows?.length) return "";

    return `
        <section class="section">
            <h2>${escapeHtml(L.sections.questionAnalysis)}</h2>
            <table>
                <thead>
                    <tr>
                        <th>${escapeHtml(L.questionsTable.question)}</th>
                        <th>${escapeHtml(L.questionsTable.accuracy)}</th>
                        <th>${escapeHtml(L.questionsTable.correct)}</th>
                        <th>${escapeHtml(L.questionsTable.total)}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows
                        .map(
                            (row, index) => `
                                <tr>
                                    <td>${escapeHtml(`${index + 1}. ${stripHtml(row.questionText)}`)}</td>
                                    <td>${escapeHtml(row.accuracy)}%</td>
                                    <td>${escapeHtml(row.correct)}</td>
                                    <td>${escapeHtml(row.total)}</td>
                                </tr>
                            `
                        )
                        .join("")}
                </tbody>
            </table>
        </section>
    `;
}

export function buildChallengeReportHtml(
    options: ChallengeReportOptions,
    fontFacesCss: string = buildUrlReportFontFaces(getReportFontBaseUrl())
): string {
    L = getChallengeReportLabels(options.language);
    const opts = options || { topicTitle: L.defaultTitle };
    const results = Array.isArray(opts.results) ? opts.results : [];
    const summary = computeSummary(results);
    const generatedAt = new Date().toLocaleString(L.locale, {
        dateStyle: "full",
        timeStyle: "short",
    });

    return `<!doctype html>
<html lang="${L.lang}" dir="${L.dir}">
<head>
    <meta charset="utf-8" />
    <title>${escapeHtml(opts.topicTitle || L.defaultTitle)}</title>
    <style>
        ${fontFacesCss}
        @page { size: A4; margin: 12mm 10mm; }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        html, body {
            min-height: 100%;
        }
        body {
            margin: 0;
            color: #0f172a;
            background: #ffffff;
            direction: ${L.dir};
            text-align: start;
            font-family: "Cairo", "Tahoma", "Arial Unicode MS", "Segoe UI", sans-serif;
            font-size: 12px;
            line-height: 1.75;
        }
        h1, h2, h3, h4, p, li, th, td, span, strong {
            text-align: inherit;
        }
        .chart-card,
        .chart-card-wide,
        .donut-wrap,
        .bar-list,
        .bar-row,
        .trend-chart,
        .scatter-chart,
        .legend,
        .legend-item {
            direction: ltr;
        }
        .header {
            margin-bottom: 18px;
            padding: 22px 24px;
            border-radius: 22px;
            color: #ffffff;
            background: linear-gradient(135deg, #7c3aed, #4338ca);
        }
        .eyebrow {
            margin: 0 0 6px;
            color: #ddd6fe;
            font-size: 11px;
            letter-spacing: 0.04em;
        }
        h1, h2, h3, p { margin-top: 0; }
        h1 {
            margin-bottom: 10px;
            font-size: 24px;
            line-height: 1.35;
        }
        .meta {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 14px;
        }
        .meta span, .note {
            border: 1px solid rgba(255, 255, 255, 0.28);
            border-radius: 999px;
            padding: 5px 11px;
            background: rgba(255, 255, 255, 0.12);
        }
        .note {
            display: block;
            margin-top: 12px;
            border-radius: 14px;
        }
        .metric-grid, .analysis-grid, .charts-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }
        .metric-card, .analysis-item, .chart-card {
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 12px;
            background: #f8fafc;
        }
        .metric-card span, .analysis-item span {
            display: block;
            color: #64748b;
            font-size: 11px;
        }
        .metric-card strong, .analysis-item strong {
            display: block;
            margin-top: 4px;
            color: #4c1d95;
            font-size: 19px;
        }
        .lesson-rating-summary {
            margin-bottom: 12px;
            color: #475569;
            font-size: 12px;
        }
        .lesson-rating-bars {
            display: grid;
            gap: 8px;
        }
        .lesson-rating-row {
            display: grid;
            grid-template-columns: 120px 1fr 72px;
            gap: 10px;
            align-items: center;
        }
        .lesson-rating-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 600;
        }
        .lesson-rating-emoji {
            font-size: 18px;
            line-height: 1;
        }
        .lesson-rating-track {
            height: 10px;
            border-radius: 999px;
            background: #e2e8f0;
            overflow: hidden;
        }
        .lesson-rating-fill {
            height: 100%;
            border-radius: 999px;
            background: linear-gradient(90deg, #a78bfa, #7c3aed);
        }
        .lesson-rating-meta {
            font-size: 10px;
            color: #64748b;
            text-align: end;
        }
        .section {
            margin-top: 18px;
            break-inside: avoid;
        }
        .section h2 {
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 2px solid #ddd6fe;
            color: #4c1d95;
            font-size: 17px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
        }
        thead { display: table-header-group; }
        tr { break-inside: avoid; }
        th {
            color: #4c1d95;
            background: #ede9fe;
            font-weight: 700;
        }
        th, td {
            padding: 8px 9px;
            border-bottom: 1px solid #e2e8f0;
            text-align: start;
            vertical-align: top;
        }
        tbody tr:nth-child(even) td { background: #f8fafc; }
        .empty {
            color: #64748b;
            text-align: center;
        }
        .recommendations {
            margin: 0;
            padding-block: 12px;
            padding-inline: 28px 12px;
            border: 1px solid #fde68a;
            border-radius: 16px;
            background: #fffbeb;
            list-style-position: outside;
        }
        .recommendations li { margin: 5px 0; }
        .recommendation-report {
            break-inside: auto;
        }
        .recommendation-summary {
            margin-bottom: 10px;
            padding: 16px 18px;
            border: 1px solid #c7d2fe;
            border-radius: 20px;
            background: linear-gradient(135deg, #eef2ff, #faf5ff);
        }
        .recommendation-kicker {
            margin-bottom: 5px;
            color: #6d28d9;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.02em;
        }
        .recommendation-summary h3 {
            margin-bottom: 6px;
            color: #4338ca;
            font-size: 16px;
        }
        .recommendation-summary p {
            margin: 0;
            color: #334155;
            font-size: 11.8px;
            line-height: 2;
        }
        .key-findings {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 12px;
        }
        .key-finding {
            padding: 10px 12px;
            border: 1px solid #ddd6fe;
            border-radius: 14px;
            color: #312e81;
            background: #f5f3ff;
            font-size: 10.5px;
            font-weight: 700;
            line-height: 1.7;
        }
        .recommendation-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
        }
        .recommendation-section {
            padding: 0;
            border: 1px solid #dbe4f0;
            border-radius: 18px;
            background: #ffffff;
            break-inside: avoid;
            overflow: hidden;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
        }
        .recommendation-section-head {
            display: grid;
            grid-template-columns: 34px 1fr;
            gap: 10px;
            align-items: start;
            padding: 12px 14px;
            border-bottom: 1px solid #e2e8f0;
            background: linear-gradient(90deg, #f8fafc, #ffffff);
        }
        .recommendation-index {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 10px;
            color: #ffffff;
            background: #7c3aed;
            font-size: 13px;
            font-weight: 900;
        }
        .recommendation-section h4 {
            margin: 0 0 5px;
            color: #4c1d95;
            font-size: 13.5px;
        }
        .recommendation-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .recommendation-badges span {
            padding: 2px 8px;
            border: 1px solid #ddd6fe;
            border-radius: 999px;
            color: #5b21b6;
            background: #f5f3ff;
            font-size: 9.5px;
            font-weight: 700;
        }
        .recommendation-block {
            padding: 10px 14px;
            border-bottom: 1px solid #edf2f7;
        }
        .recommendation-block:last-child {
            border-bottom: 0;
        }
        .recommendation-block-title {
            margin-bottom: 5px;
            color: #0f172a;
            font-size: 10.5px;
            font-weight: 900;
        }
        .evidence-block {
            background: #f8fafc;
        }
        .actions-block {
            background: #ffffff;
        }
        .indicators-block {
            background: #f0fdf4;
        }
        .recommendation-block ul {
            margin: 0;
            padding-inline-start: 18px;
            padding-inline-end: 0;
            list-style-position: outside;
        }
        .recommendation-block li {
            margin: 4px 0;
            color: #334155;
            font-size: 10.6px;
            line-height: 1.8;
        }
        .charts-grid { grid-template-columns: repeat(2, 1fr); align-items: stretch; }
        .chart-card {
            position: relative;
            overflow: hidden;
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
            break-inside: avoid;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
        }
        .chart-card-wide { grid-column: 1 / -1; }
        .chart-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
        }
        .chart-card h3 {
            margin: 0;
            color: #334155;
            font-size: 13px;
            line-height: 1.45;
        }
        .chart-head span {
            flex-shrink: 0;
            color: #64748b;
            font-size: 9.5px;
            text-align: end;
        }
        .bar-row {
            display: grid;
            grid-template-columns: minmax(100px, 1.1fr) 2fr 58px;
            align-items: center;
            gap: 8px;
            margin: 8px 0;
        }
        .bar-label {
            overflow: hidden;
            color: #334155;
            font-size: 10.5px;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
        .bar-track {
            height: 13px;
            overflow: hidden;
            border-radius: 999px;
            background: #e2e8f0;
            box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.08);
        }
        .bar-fill {
            height: 100%;
            border-radius: inherit;
        }
        .bar-row strong {
            color: #0f172a;
            font-size: 10.5px;
            text-align: end;
        }
        .chart-note {
            margin: 8px 0 0;
            color: #64748b;
            font-size: 9.5px;
        }
        .donut-wrap {
            display: grid;
            grid-template-columns: 132px 1fr;
            align-items: center;
            gap: 12px;
        }
        .donut {
            width: 132px;
            height: 132px;
        }
        .donut-total {
            fill: #0f172a;
            font-size: 22px;
            font-weight: 800;
        }
        .donut-label {
            fill: #64748b;
            font-size: 10px;
        }
        .legend {
            display: grid;
            gap: 7px;
        }
        .legend-item {
            display: grid;
            grid-template-columns: 10px minmax(0, 1fr) auto;
            align-items: center;
            gap: 7px;
            color: #334155;
            font-size: 10.5px;
        }
        .legend-item i {
            width: 10px;
            height: 10px;
            border-radius: 999px;
        }
        .legend-item span {
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
        .legend-item strong {
            color: #0f172a;
            font-size: 10px;
        }
        .trend-chart, .scatter-chart {
            width: 100%;
            height: auto;
        }
        html[dir="rtl"] .header,
        html[dir="rtl"] .section,
        html[dir="rtl"] .meta,
        html[dir="rtl"] .footer,
        html[dir="rtl"] table,
        html[dir="rtl"] .metric-grid,
        html[dir="rtl"] .metric-card,
        html[dir="rtl"] .analysis-grid,
        html[dir="rtl"] .analysis-item,
        html[dir="rtl"] .lesson-rating-summary,
        html[dir="rtl"] .lesson-rating-label,
        html[dir="rtl"] .lesson-rating-bars,
        html[dir="rtl"] .lesson-rating-row,
        html[dir="rtl"] .recommendation-report,
        html[dir="rtl"] .recommendation-summary,
        html[dir="rtl"] .recommendation-section,
        html[dir="rtl"] .recommendation-section-head,
        html[dir="rtl"] .recommendation-badges,
        html[dir="rtl"] .recommendation-block,
        html[dir="rtl"] .key-findings,
        html[dir="rtl"] .recommendations {
            direction: rtl;
            text-align: start;
        }
        html[dir="rtl"] .recommendation-block ul {
            padding-inline-start: 18px;
            padding-inline-end: 0;
        }
        html[dir="ltr"] .header,
        html[dir="ltr"] .section,
        html[dir="ltr"] .meta,
        html[dir="ltr"] .footer,
        html[dir="ltr"] table,
        html[dir="ltr"] .metric-grid,
        html[dir="ltr"] .metric-card,
        html[dir="ltr"] .analysis-grid,
        html[dir="ltr"] .analysis-item,
        html[dir="ltr"] .lesson-rating-summary,
        html[dir="ltr"] .lesson-rating-label,
        html[dir="ltr"] .lesson-rating-bars,
        html[dir="ltr"] .lesson-rating-row,
        html[dir="ltr"] .recommendation-report,
        html[dir="ltr"] .recommendation-summary,
        html[dir="ltr"] .recommendation-section,
        html[dir="ltr"] .recommendation-section-head,
        html[dir="ltr"] .recommendation-badges,
        html[dir="ltr"] .recommendation-block,
        html[dir="ltr"] .key-findings,
        html[dir="ltr"] .recommendations {
            direction: ltr;
            text-align: start;
        }
        html[dir="ltr"] .recommendation-block ul {
            padding-inline-start: 18px;
            padding-inline-end: 0;
        }
        html[dir="ltr"] .recommendation-section-head {
            grid-template-columns: 34px 1fr;
        }
        html[dir="ltr"] .donut-wrap {
            grid-template-columns: 132px 1fr;
        }
        html[dir="ltr"] .chart-head {
            flex-direction: row;
        }
        .grid-line {
            stroke: #e2e8f0;
            stroke-width: 1;
        }
        .axis-line {
            stroke: #94a3b8;
            stroke-width: 1.2;
        }
        .axis-label, .x-label, .bar-value, .line-value {
            fill: #64748b;
            font-family: "Cairo", "Arial", "Tahoma", sans-serif;
            font-size: 10px;
        }
        .axis-label { text-anchor: end; }
        .x-label { text-anchor: middle; }
        .bar-value, .line-value {
            fill: #334155;
            text-anchor: middle;
            font-weight: 700;
        }
        .trend-bar {
            fill: #ddd6fe;
            opacity: 0.95;
        }
        .trend-line {
            stroke: #7c3aed;
            stroke-width: 3.5;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
        .trend-dot {
            fill: #ffffff;
            stroke: #7c3aed;
            stroke-width: 3;
        }
        .footer {
            margin-top: 22px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 10px;
            text-align: center;
        }
        .page-break-avoid { break-inside: avoid; }
    </style>
</head>
<body dir="${L.dir}">
    <header class="header">
        <p class="eyebrow">${escapeHtml(L.eyebrow)}</p>
        <h1>${escapeHtml(opts.topicTitle || L.defaultTitle)}</h1>
        <div class="meta">
            ${renderReportMeta(opts, generatedAt)}
        </div>
        ${opts.mergedSessionsNote ? `<div class="note">${escapeHtml(opts.mergedSessionsNote)}</div>` : ""}
    </header>

    ${renderMetricCards(summary)}
    ${renderLessonRatings(opts.lessonRating)}
    ${renderAnalysisRows(opts.analysisRows)}
    ${renderCharts(opts.charts)}
    ${renderParticipants(results)}
    ${renderQuestionRows(opts.questionRows)}
    ${renderRecommendationReport(opts.recommendationReport, opts.recommendations)}

    <footer class="footer">
        ${escapeHtml(L.footerPlatform)}<br />
        ${escapeHtml(L.footerRegion)}
    </footer>
</body>
</html>`;
}
