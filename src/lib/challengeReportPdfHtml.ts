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

type ChallengeReportOptions = {
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
    charts?: Record<string, Array<Record<string, unknown>> | undefined>;
    results?: any[];
    questionRows?: ChallengeReportQuestionRow[];
};

const PALETTE = ["#7c3aed", "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#0f766e"];

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
        ["إجمالي المحاولات", summary.count],
        ["متوسط النسبة", `${summary.averagePercent}%`],
        ["متوسط النقاط", summary.averageScore],
        ["أعلى نقاط", summary.maxScore],
        ["أعضاء مسجلون", summary.members],
        ["زوار", summary.guests],
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
        ["اسم الدرس", opts.lessonTitle],
        ["اسم الصف / الفصل", opts.className],
        ["المادة", opts.subjectName],
        ["اسم المعلم", opts.teacherName],
        ["التاريخ", opts.sessionDate],
        ["الوقت", opts.sessionTime],
        ["تم الإنشاء", generatedAt],
    ].filter(([, value]) => value);

    return rows
        .map(([label, value]) => `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`)
        .join("");
}

function renderAnalysisRows(rows?: Array<{ label: string; value: string | number }>): string {
    if (!rows?.length) return "";

    return `
        <section class="section">
            <h2>تحليل إضافي</h2>
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
            <h2>توصيات تعليمية</h2>
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
            <h2>توصيات تعليمية</h2>
            <div class="recommendation-summary">
                <div class="recommendation-kicker">تقرير توصيات مهني مولّد من تحليل النتائج</div>
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
                                            ${section.priority ? `<span>الأولوية: ${escapeHtml(section.priority)}</span>` : ""}
                                            ${section.timeframe ? `<span>الزمن: ${escapeHtml(section.timeframe)}</span>` : ""}
                                        </div>
                                    </div>
                                </div>
                                ${renderRecommendationListBlock("الدليل من البيانات", section.evidence, "evidence-block")}
                                ${renderRecommendationListBlock("الإجراءات المقترحة", actions, "actions-block")}
                                ${renderRecommendationListBlock("مؤشرات النجاح", section.successIndicators, "indicators-block")}
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
                <span>المتوسط ${escapeHtml(formatChartValue(average, suffix))}</span>
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
            ${rows.length > visibleRows.length ? `<p class="chart-note">يعرض أعلى ${visibleRows.length} عناصر من أصل ${rows.length}.</p>` : ""}
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
                <span>الإجمالي ${escapeHtml(total)}</span>
            </div>
            <div class="donut-wrap">
                <svg class="donut" viewBox="0 0 144 144" aria-hidden="true">
                    <circle cx="72" cy="72" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="22" />
                    ${segments}
                    <text x="72" y="68" text-anchor="middle" class="donut-total">${escapeHtml(total)}</text>
                    <text x="72" y="86" text-anchor="middle" class="donut-label">إجمالي</text>
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
                <h3>اتجاه الأداء الأسبوعي</h3>
                <span>الأعمدة = المحاولات، الخط = متوسط الأداء</span>
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
                <h3>العلاقة بين الزمن والدرجة</h3>
                <span>كل نقطة تمثل محاولة واحدة</span>
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
                <text x="${left}" y="${height - 14}" class="x-label">زمن أقل</text>
                <text x="${width - right}" y="${height - 14}" class="x-label">زمن أكثر</text>
            </svg>
            ${rows.length > visibleRows.length ? `<p class="chart-note">يعرض أول ${visibleRows.length} محاولة من أصل ${rows.length}.</p>` : ""}
        </div>
    `;
}

function renderCharts(charts?: ChallengeReportOptions["charts"]): string {
    if (!charts) return "";

    const chartSections = [
        renderDailyTrendChart(charts.dailyTrend),
        renderDonutChart("نوع المشاركين", charts.participantTypeData),
        renderDonutChart("نتائج الإجابات", charts.answerOutcomeData),
        renderBarChart("توزيع الدرجات", charts.scoreDistribution),
        renderBarChart("أفضل النتائج", charts.topScoreChartData, "%", 6),
        renderBarChart("دقة الأسئلة", charts.questionAccuracyChartData, "%", 8),
        renderBarChart("متوسط زمن الأسئلة", charts.questionTimeChartData, "ث", 8),
        renderBarChart("ملخص توزيع الدرجات", charts.scoreBoxData),
        renderScatterChart(charts.scoreTimeScatterData),
        renderBarChart("شرائح المتعلمين", charts.learnerSegments),
        renderBarChart("صعوبة الأسئلة", charts.questionDifficultyData),
    ].filter(Boolean);

    if (!chartSections.length) return "";

    return `
        <section class="section page-break-avoid">
            <h2>الرسوم والمؤشرات</h2>
            <div class="charts-grid">${chartSections.join("")}</div>
        </section>
    `;
}

function renderParticipants(results: any[]): string {
    const sorted = [...results].sort((a, b) => getScorePercent(b) - getScorePercent(a));

    return `
        <section class="section">
            <h2>سجل المشاركين والنتائج</h2>
            <table>
                <thead>
                    <tr>
                        <th>الترتيب</th>
                        <th>المشارك</th>
                        <th>النسبة</th>
                        <th>النقاط</th>
                        <th>صحيح</th>
                        <th>خطأ</th>
                        <th>الوقت</th>
                        <th>النوع</th>
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
                                            <td>${row?.user?.id ? "مسجل" : "زائر"}</td>
                                        </tr>
                                    `
                                  )
                                  .join("")
                            : `<tr><td colspan="8" class="empty">لا توجد نتائج مسجلة.</td></tr>`
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
            <h2>تحليل الأسئلة</h2>
            <table>
                <thead>
                    <tr>
                        <th>السؤال</th>
                        <th>الدقة</th>
                        <th>إجابات صحيحة</th>
                        <th>إجمالي الإجابات</th>
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

export function buildChallengeReportHtml(options: ChallengeReportOptions): string {
    const opts = options || { topicTitle: "تقرير التحدي" };
    const results = Array.isArray(opts.results) ? opts.results : [];
    const summary = computeSummary(results);
    const generatedAt = new Date().toLocaleString("ar-SA", {
        dateStyle: "full",
        timeStyle: "short",
    });

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8" />
    <title>${escapeHtml(opts.topicTitle || "تقرير التحدي")}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <style>
        @page { size: A4; margin: 12mm 10mm; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            color: #0f172a;
            background: #ffffff;
            direction: rtl;
            font-family: "Cairo", "Arial", "Tahoma", sans-serif;
            font-size: 12px;
            line-height: 1.75;
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
            text-align: right;
            vertical-align: top;
        }
        tbody tr:nth-child(even) td { background: #f8fafc; }
        .empty {
            color: #64748b;
            text-align: center;
        }
        .recommendations {
            margin: 0;
            padding: 12px 28px 12px 12px;
            border: 1px solid #fde68a;
            border-radius: 16px;
            background: #fffbeb;
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
            padding: 0 18px 0 0;
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
            text-align: left;
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
            text-align: left;
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
            direction: ltr;
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
<body>
    <header class="header">
        <p class="eyebrow">تقرير أداء التحدي التعليمي</p>
        <h1>${escapeHtml(opts.topicTitle || "تقرير التحدي")}</h1>
        <div class="meta">
            ${renderReportMeta(opts, generatedAt)}
        </div>
        ${opts.mergedSessionsNote ? `<div class="note">${escapeHtml(opts.mergedSessionsNote)}</div>` : ""}
    </header>

    ${renderMetricCards(summary)}
    ${renderAnalysisRows(opts.analysisRows)}
    ${renderCharts(opts.charts)}
    ${renderParticipants(results)}
    ${renderQuestionRows(opts.questionRows)}
    ${renderRecommendationReport(opts.recommendationReport, opts.recommendations)}

    <footer class="footer">
        منصة lab4<br />
        المملكة العربية السعودية
    </footer>
</body>
</html>`;
}
