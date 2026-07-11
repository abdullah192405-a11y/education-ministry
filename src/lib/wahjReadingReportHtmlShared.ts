export function getReportFontBaseUrl(): string {
    if (typeof window !== "undefined" && window.location?.origin) {
        return window.location.origin;
    }
    return "https://www.labforai.com";
}

export function buildUrlReportFontFaces(baseUrl: string): string {
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

export function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const PALETTE = ["#7c3aed", "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#0f766e"];

const METRIC_CARD_THEMES = [
    { bg: "linear-gradient(135deg, #ede9fe, #ddd6fe)", border: "#c4b5fd", label: "#5b21b6", value: "#4c1d95" },
    { bg: "linear-gradient(135deg, #dbeafe, #bfdbfe)", border: "#93c5fd", label: "#1d4ed8", value: "#1e3a8a" },
    { bg: "linear-gradient(135deg, #dcfce7, #bbf7d0)", border: "#86efac", label: "#15803d", value: "#14532d" },
    { bg: "linear-gradient(135deg, #fef3c7, #fde68a)", border: "#fcd34d", label: "#b45309", value: "#92400e" },
    { bg: "linear-gradient(135deg, #fce7f3, #fbcfe8)", border: "#f9a8d4", label: "#be185d", value: "#9d174d" },
    { bg: "linear-gradient(135deg, #ccfbf1, #99f6e4)", border: "#5eead4", label: "#0f766e", value: "#134e4a" },
];

const ANALYSIS_THEMES = [
    { bg: "#f5f3ff", border: "#ddd6fe", label: "#6d28d9", value: "#4c1d95" },
    { bg: "#eff6ff", border: "#bfdbfe", label: "#2563eb", value: "#1e40af" },
    { bg: "#ecfdf5", border: "#a7f3d0", label: "#059669", value: "#065f46" },
    { bg: "#fffbeb", border: "#fde68a", label: "#d97706", value: "#92400e" },
    { bg: "#fdf2f8", border: "#fbcfe8", label: "#db2777", value: "#9d174d" },
    { bg: "#f0fdfa", border: "#99f6e4", label: "#0d9488", value: "#115e59" },
];

export function renderReportStyles(fontFacesCss: string): string {
    return `
        ${fontFacesCss}
        @page { size: A4; margin: 12mm 10mm; }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        html, body { min-height: 100%; }
        body {
            margin: 0;
            color: #0f172a;
            background: linear-gradient(180deg, #f5f3ff 0%, #eef2ff 35%, #faf5ff 100%);
            direction: rtl;
            text-align: start;
            font-family: "Cairo", "Tahoma", "Arial Unicode MS", "Segoe UI", sans-serif;
            font-size: 12px;
            line-height: 1.75;
        }
        .report-body {
            max-width: 100%;
            padding: 4px 0 18px;
        }
        h1, h2, h3, h4, p, li, th, td, span, strong { text-align: inherit; }
        .header {
            margin-bottom: 18px;
            padding: 22px 24px;
            border-radius: 22px;
            color: #ffffff;
            background: linear-gradient(135deg, #7c3aed 0%, #4338ca 45%, #2563eb 100%);
            box-shadow: 0 14px 34px rgba(76, 29, 149, 0.28);
        }
        .eyebrow {
            margin: 0 0 6px;
            color: #ddd6fe;
            font-size: 11px;
            letter-spacing: 0.04em;
        }
        h1, h2, h3, p { margin-top: 0; }
        h1 { margin-bottom: 10px; font-size: 24px; line-height: 1.35; }
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
            border-radius: 16px;
            padding: 12px;
            break-inside: avoid;
        }
        .metric-card {
            border: 1px solid #c4b5fd;
            box-shadow: 0 8px 20px rgba(76, 29, 149, 0.08);
        }
        .analysis-item {
            border: 1px solid #bfdbfe;
            box-shadow: 0 6px 16px rgba(37, 99, 235, 0.06);
        }
        .chart-card {
            border: 1px solid #ddd6fe;
            background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%);
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
        }
        .metric-card span, .analysis-item span {
            display: block;
            font-size: 11px;
            font-weight: 700;
        }
        .metric-card strong, .analysis-item strong {
            display: block;
            margin-top: 4px;
            font-size: 19px;
        }
        .analysis-item strong { font-size: 15px; }
        .section {
            margin-top: 18px;
            break-inside: avoid;
            padding: 14px 16px;
            border: 1px solid #e9d5ff;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.72);
            box-shadow: 0 10px 24px rgba(76, 29, 149, 0.06);
        }
        .section h2 {
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 2px solid #c4b5fd;
            color: #5b21b6;
            font-size: 17px;
        }
        .ai-section h2 {
            border-bottom-color: #93c5fd;
            color: #1d4ed8;
        }
        .recommendation-summary {
            margin-bottom: 12px;
            padding: 16px 18px;
            border: 1px solid #c7d2fe;
            border-radius: 20px;
            background: linear-gradient(135deg, #eef2ff, #faf5ff);
            box-shadow: 0 8px 20px rgba(99, 102, 241, 0.1);
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
            margin: 0 0 8px;
            color: #334155;
            font-size: 11.8px;
            line-height: 2;
        }
        .recommendation-summary p:last-child { margin-bottom: 0; }
        .key-findings {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 12px;
        }
        .key-finding {
            padding: 10px 12px;
            border-radius: 14px;
            font-size: 10.5px;
            font-weight: 700;
            line-height: 1.7;
        }
        .key-finding:nth-child(6n+1) { border: 1px solid #ddd6fe; color: #312e81; background: linear-gradient(135deg, #f5f3ff, #ede9fe); }
        .key-finding:nth-child(6n+2) { border: 1px solid #bfdbfe; color: #1e3a8a; background: linear-gradient(135deg, #eff6ff, #dbeafe); }
        .key-finding:nth-child(6n+3) { border: 1px solid #a7f3d0; color: #065f46; background: linear-gradient(135deg, #ecfdf5, #d1fae5); }
        .key-finding:nth-child(6n+4) { border: 1px solid #fde68a; color: #92400e; background: linear-gradient(135deg, #fffbeb, #fef3c7); }
        .key-finding:nth-child(6n+5) { border: 1px solid #fbcfe8; color: #9d174d; background: linear-gradient(135deg, #fdf2f8, #fce7f3); }
        .key-finding:nth-child(6n+6) { border: 1px solid #99f6e4; color: #115e59; background: linear-gradient(135deg, #f0fdfa, #ccfbf1); }
        .recommendation-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .recommendation-section {
            padding: 0;
            border-radius: 18px;
            break-inside: avoid;
            overflow: hidden;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
        }
        .recommendation-section:nth-child(6n+1) { border: 1px solid #ddd6fe; background: #ffffff; }
        .recommendation-section:nth-child(6n+2) { border: 1px solid #bfdbfe; background: #fafcff; }
        .recommendation-section:nth-child(6n+3) { border: 1px solid #a7f3d0; background: #f8fffb; }
        .recommendation-section:nth-child(6n+4) { border: 1px solid #fde68a; background: #fffdf5; }
        .recommendation-section:nth-child(6n+5) { border: 1px solid #fbcfe8; background: #fffafd; }
        .recommendation-section:nth-child(6n+6) { border: 1px solid #99f6e4; background: #f7fffd; }
        .recommendation-section-head {
            display: grid;
            grid-template-columns: 34px 1fr;
            gap: 10px;
            align-items: start;
            padding: 12px 14px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.35);
        }
        .recommendation-section:nth-child(6n+1) .recommendation-section-head { background: linear-gradient(90deg, #f5f3ff, #ffffff); }
        .recommendation-section:nth-child(6n+2) .recommendation-section-head { background: linear-gradient(90deg, #eff6ff, #ffffff); }
        .recommendation-section:nth-child(6n+3) .recommendation-section-head { background: linear-gradient(90deg, #ecfdf5, #ffffff); }
        .recommendation-section:nth-child(6n+4) .recommendation-section-head { background: linear-gradient(90deg, #fffbeb, #ffffff); }
        .recommendation-section:nth-child(6n+5) .recommendation-section-head { background: linear-gradient(90deg, #fdf2f8, #ffffff); }
        .recommendation-section:nth-child(6n+6) .recommendation-section-head { background: linear-gradient(90deg, #f0fdfa, #ffffff); }
        .recommendation-index {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 10px;
            color: #ffffff;
            font-size: 13px;
            font-weight: 900;
        }
        .recommendation-section:nth-child(6n+1) .recommendation-index { background: linear-gradient(135deg, #7c3aed, #6d28d9); }
        .recommendation-section:nth-child(6n+2) .recommendation-index { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
        .recommendation-section:nth-child(6n+3) .recommendation-index { background: linear-gradient(135deg, #16a34a, #15803d); }
        .recommendation-section:nth-child(6n+4) .recommendation-index { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .recommendation-section:nth-child(6n+5) .recommendation-index { background: linear-gradient(135deg, #db2777, #be185d); }
        .recommendation-section:nth-child(6n+6) .recommendation-index { background: linear-gradient(135deg, #0d9488, #0f766e); }
        .recommendation-section h4 {
            margin: 0 0 5px;
            color: #4c1d95;
            font-size: 13.5px;
        }
        .section-kicker {
            color: #6d28d9;
            font-size: 11px;
            font-weight: 800;
        }
        .recommendation-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 4px;
        }
        .recommendation-badges span {
            border-radius: 999px;
            padding: 3px 9px;
            font-size: 9.5px;
            font-weight: 800;
            color: #4338ca;
            background: #eef2ff;
            border: 1px solid #c7d2fe;
        }
        .recommendation-block-title {
            margin-bottom: 6px;
            color: #334155;
            font-size: 10.5px;
            font-weight: 900;
        }
        .recommendation-block ul {
            margin: 0;
            padding-inline-start: 18px;
        }
        .recommendation-block li {
            margin: 4px 0;
            color: #334155;
            font-size: 11px;
            line-height: 1.85;
        }
        .evidence-block { background: linear-gradient(180deg, #f8fafc, #f1f5f9); }
        .actions-block { background: linear-gradient(180deg, #f5f3ff, #ede9fe); }
        .indicators-block { background: linear-gradient(180deg, #ecfdf5, #d1fae5); }
        .ai-summary-card {
            margin-bottom: 12px;
            padding: 16px 18px;
            border: 2px solid #93c5fd;
            border-radius: 20px;
            background: linear-gradient(135deg, #eff6ff, #dbeafe);
            box-shadow: 0 10px 24px rgba(37, 99, 235, 0.12);
        }
        .ai-summary-card .recommendation-kicker { color: #1d4ed8; }
        .ai-summary-card h3 { color: #1e40af; }
        .recommendation-block {
            padding: 12px 14px;
            border-bottom: 1px solid #edf2f7;
        }
        .recommendation-block:last-child { border-bottom: 0; }
        .narrative-block p {
            margin: 0 0 10px;
            color: #334155;
            font-size: 11.6px;
            line-height: 2;
        }
        .narrative-block p:last-child { margin-bottom: 0; }
        .code-box {
            margin: 12px 0;
            padding: 14px 16px;
            border: 2px dashed #c4b5fd;
            border-radius: 16px;
            background: #f5f3ff;
            color: #5b21b6;
            font-size: 22px;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-align: center;
        }
        .share-section .recommendation-index { font-size: 16px; background: #f59e0b; }
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
            color: #ffffff;
            background: linear-gradient(135deg, #7c3aed, #4338ca);
            font-weight: 700;
        }
        th, td {
            padding: 8px 9px;
            border-bottom: 1px solid #e2e8f0;
            text-align: start;
            vertical-align: top;
            font-size: 11px;
        }
        tbody tr:nth-child(even) td { background: #f5f3ff; }
        tbody tr:nth-child(odd) td { background: #ffffff; }
        tbody tr:nth-child(1) td { background: linear-gradient(90deg, #fef3c7, #fffbeb); font-weight: 700; }
        tbody tr:nth-child(2) td { background: linear-gradient(90deg, #f1f5f9, #f8fafc); }
        tbody tr:nth-child(3) td { background: linear-gradient(90deg, #fff7ed, #ffedd5); }
        .charts-grid { grid-template-columns: repeat(2, 1fr); align-items: stretch; }
        .chart-card {
            position: relative;
            overflow: hidden;
            break-inside: avoid;
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
            grid-template-columns: minmax(90px, 1.1fr) 2fr 58px;
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
        .bar-fill { height: 100%; border-radius: inherit; }
        .bar-row strong {
            color: #0f172a;
            font-size: 10.5px;
            text-align: end;
        }
        .footer {
            margin-top: 22px;
            padding: 12px 14px;
            border: 1px solid #ddd6fe;
            border-radius: 16px;
            color: #5b21b6;
            background: linear-gradient(135deg, #faf5ff, #f5f3ff);
            font-size: 10px;
            text-align: center;
        }
        .page-break-avoid { break-inside: avoid; }
        html[dir="rtl"] .header,
        html[dir="rtl"] .section,
        html[dir="rtl"] .meta,
        html[dir="rtl"] .footer,
        html[dir="rtl"] .metric-grid,
        html[dir="rtl"] .metric-card,
        html[dir="rtl"] .analysis-grid,
        html[dir="rtl"] .analysis-item,
        html[dir="rtl"] .recommendation-summary,
        html[dir="rtl"] .recommendation-section,
        html[dir="rtl"] .recommendation-section-head,
        html[dir="rtl"] .recommendation-block,
        html[dir="rtl"] .key-findings,
        html[dir="rtl"] .charts-grid,
        html[dir="rtl"] .chart-card,
        html[dir="rtl"] table {
            direction: rtl;
            text-align: start;
        }
        html[dir="rtl"] .bar-track { direction: rtl; }
    `;
}

export type BarChartRow = { label: string; value: number; color?: string };

export function renderBarChart(title: string, rows: BarChartRow[], suffix = "", subtitle = ""): string {
    if (!rows.length) return "";
    const max = Math.max(...rows.map((r) => r.value), 1);
    const avg = Math.round(rows.reduce((s, r) => s + r.value, 0) / rows.length);

    return `
        <div class="chart-card">
            <div class="chart-head">
                <h3>${escapeHtml(title)}</h3>
                <span>${subtitle || `المتوسط ${avg}${suffix}`}</span>
            </div>
            <div class="bar-list">
                ${rows
                    .map((row, index) => {
                        const width = Math.max(3, Math.round((row.value / max) * 100));
                        const color = row.color || PALETTE[index % PALETTE.length];
                        return `
                            <div class="bar-row">
                                <span class="bar-label" title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</span>
                                <div class="bar-track">
                                    <div class="bar-fill" style="width:${width}%; background:${escapeHtml(color)}"></div>
                                </div>
                                <strong>${escapeHtml(row.value)}${escapeHtml(suffix)}</strong>
                            </div>
                        `;
                    })
                    .join("")}
            </div>
        </div>
    `;
}

export function renderMetaPills(rows: Array<[string, string | number | undefined]>): string {
    return rows
        .filter(([, value]) => value !== undefined && value !== "")
        .map(([label, value]) => `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`)
        .join("");
}

export function renderMetricGrid(metrics: Array<[string, string | number]>): string {
    return `
        <section class="metric-grid">
            ${metrics
                .map(([label, value], index) => {
                    const theme = METRIC_CARD_THEMES[index % METRIC_CARD_THEMES.length];
                    return `
                        <div class="metric-card" style="background:${theme.bg}; border-color:${theme.border};">
                            <span style="color:${theme.label};">${escapeHtml(label)}</span>
                            <strong style="color:${theme.value};">${escapeHtml(value)}</strong>
                        </div>
                    `;
                })
                .join("")}
        </section>
    `;
}

export function renderAnalysisGrid(rows: Array<[string, string | number]>, title = "تحليل إضافي"): string {
    if (!rows.length) return "";
    return `
        <section class="section page-break-avoid">
            <h2>${escapeHtml(title)}</h2>
            <div class="analysis-grid">
                ${rows
                    .map(([label, value], index) => {
                        const theme = ANALYSIS_THEMES[index % ANALYSIS_THEMES.length];
                        return `
                            <div class="analysis-item" style="background:${theme.bg}; border-color:${theme.border};">
                                <span style="color:${theme.label};">${escapeHtml(label)}</span>
                                <strong style="color:${theme.value};">${escapeHtml(value)}</strong>
                            </div>
                        `;
                    })
                    .join("")}
            </div>
        </section>
    `;
}

export function renderKeyFindings(findings: string[]): string {
    if (!findings.length) return "";
    return `
        <div class="key-findings">
            ${findings.map((f) => `<div class="key-finding">${escapeHtml(f)}</div>`).join("")}
        </div>
    `;
}

export function renderNarrativeSection(
    index: number | string,
    title: string,
    headline: string,
    paragraphs: string[],
): string {
    return `
        <article class="recommendation-section page-break-avoid">
            <div class="recommendation-section-head">
                <span class="recommendation-index">${escapeHtml(index)}</span>
                <div>
                    <h4>${escapeHtml(title)}</h4>
                    <div class="section-kicker">${escapeHtml(headline)}</div>
                </div>
            </div>
            <div class="recommendation-block narrative-block">
                ${paragraphs.map((text) => `<p>${text}</p>`).join("")}
            </div>
        </article>
    `;
}

export function renderReportShell(title: string, styles: string, body: string): string {
    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>${styles}</style>
</head>
<body dir="rtl"><div class="report-body">${body}</div></body>
</html>`;
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

export function renderAiAnalysisSection(
    report?: import("./wahjReadingReportRecommendations").WahjAiReport,
): string {
    if (!report?.sections?.length) return "";

    return `
        <section class="section ai-section page-break-avoid">
            <h2>التحليل الذكي بالذكاء الاصطناعي</h2>
            <div class="ai-summary-card">
                <div class="recommendation-kicker">تحليل مخصص مبني على بيانات البرنامج</div>
                <h3>${escapeHtml(report.headline)}</h3>
                <p>${escapeHtml(report.summary)}</p>
            </div>
            ${report.keyFindings?.length ? renderKeyFindings(report.keyFindings) : ""}
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
                                            ${section.timeframe ? `<span>الإطار الزمني: ${escapeHtml(section.timeframe)}</span>` : ""}
                                        </div>
                                    </div>
                                </div>
                                ${renderRecommendationListBlock("الأدلة من البيانات", section.evidence, "evidence-block")}
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
