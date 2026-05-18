var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// scripts/challenge-report-pdf-entry.ts
var challenge_report_pdf_entry_exports = {};
__export(challenge_report_pdf_entry_exports, {
  config: () => config,
  default: () => handler
});
module.exports = __toCommonJS(challenge_report_pdf_entry_exports);

// server/challengeReportPdfHandler.ts
var import_node_fs = require("node:fs");
var import_node_path = __toESM(require("node:path"), 1);

// src/lib/challengeReportPdfHtml.ts
var PALETTE = ["#7c3aed", "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#0f766e"];
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function numeric(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function getParticipantName(row) {
  return row?.user?.name || row?.name || row?.participant_display_name || row?.display_name || "\u2014";
}
function getScorePercent(row) {
  const percentage = Number(row?.percentage);
  if (Number.isFinite(percentage)) return Math.max(0, Math.min(100, Math.round(percentage)));
  const score = Number(row?.score);
  const maxScore = Number(row?.max_score ?? row?.maxScore);
  if (Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0) {
    return Math.max(0, Math.min(100, Math.round(score / maxScore * 100)));
  }
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
}
function computeSummary(results) {
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
    guests
  };
}
function renderMetricCards(summary) {
  const metrics = [
    ["\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0627\u062A", summary.count],
    ["\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0646\u0633\u0628\u0629", `${summary.averagePercent}%`],
    ["\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0646\u0642\u0627\u0637", summary.averageScore],
    ["\u0623\u0639\u0644\u0649 \u0646\u0642\u0627\u0637", summary.maxScore],
    ["\u0623\u0639\u0636\u0627\u0621 \u0645\u0633\u062C\u0644\u0648\u0646", summary.members],
    ["\u0632\u0648\u0627\u0631", summary.guests]
  ];
  return `
        <section class="metric-grid">
            ${metrics.map(
    ([label, value]) => `
                        <div class="metric-card">
                            <span>${escapeHtml(label)}</span>
                            <strong>${escapeHtml(value)}</strong>
                        </div>
                    `
  ).join("")}
        </section>
    `;
}
function renderReportMeta(opts, generatedAt) {
  const rows = [
    ["\u0627\u0633\u0645 \u0627\u0644\u062F\u0631\u0633", opts.lessonTitle],
    ["\u0627\u0633\u0645 \u0627\u0644\u0635\u0641 / \u0627\u0644\u0641\u0635\u0644", opts.className],
    ["\u0627\u0644\u0645\u0627\u062F\u0629", opts.subjectName],
    ["\u0627\u0633\u0645 \u0627\u0644\u0645\u0639\u0644\u0645", opts.teacherName],
    ["\u0627\u0644\u062A\u0627\u0631\u064A\u062E", opts.sessionDate],
    ["\u0627\u0644\u0648\u0642\u062A", opts.sessionTime],
    ["\u062A\u0645 \u0627\u0644\u0625\u0646\u0634\u0627\u0621", generatedAt]
  ].filter(([, value]) => value);
  return rows.map(([label, value]) => `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`).join("");
}
function renderAnalysisRows(rows) {
  if (!rows?.length) return "";
  return `
        <section class="section">
            <h2>\u062A\u062D\u0644\u064A\u0644 \u0625\u0636\u0627\u0641\u064A</h2>
            <div class="analysis-grid">
                ${rows.map(
    (row) => `
                            <div class="analysis-item">
                                <span>${escapeHtml(row.label)}</span>
                                <strong>${escapeHtml(row.value)}</strong>
                            </div>
                        `
  ).join("")}
            </div>
        </section>
    `;
}
function renderRecommendations(recommendations) {
  if (!recommendations?.length) return "";
  return `
        <section class="section">
            <h2>\u062A\u0648\u0635\u064A\u0627\u062A \u062A\u0639\u0644\u064A\u0645\u064A\u0629</h2>
            <ul class="recommendations">
                ${recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
        </section>
    `;
}
function renderRecommendationListBlock(title, items, className = "") {
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
function renderRecommendationReport(report, recommendations) {
  if (!report?.sections?.length) return renderRecommendations(recommendations);
  return `
        <section class="section recommendation-report">
            <h2>\u062A\u0648\u0635\u064A\u0627\u062A \u062A\u0639\u0644\u064A\u0645\u064A\u0629</h2>
            <div class="recommendation-summary">
                <div class="recommendation-kicker">\u062A\u0642\u0631\u064A\u0631 \u062A\u0648\u0635\u064A\u0627\u062A \u0645\u0647\u0646\u064A \u0645\u0648\u0644\u0651\u062F \u0645\u0646 \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0646\u062A\u0627\u0626\u062C</div>
                <h3>${escapeHtml(report.headline)}</h3>
                <p>${escapeHtml(report.summary)}</p>
            </div>
            ${report.keyFindings?.length ? `
                <div class="key-findings">
                    ${report.keyFindings.map((finding) => `<div class="key-finding">${escapeHtml(finding)}</div>`).join("")}
                </div>
            ` : ""}
            <div class="recommendation-grid">
                ${report.sections.map((section, index) => {
    const actions = section.actions?.length ? section.actions : section.points;
    return `
                            <article class="recommendation-section">
                                <div class="recommendation-section-head">
                                    <span class="recommendation-index">${index + 1}</span>
                                    <div>
                                        <h4>${escapeHtml(section.title)}</h4>
                                        <div class="recommendation-badges">
                                            ${section.priority ? `<span>\u0627\u0644\u0623\u0648\u0644\u0648\u064A\u0629: ${escapeHtml(section.priority)}</span>` : ""}
                                            ${section.timeframe ? `<span>\u0627\u0644\u0632\u0645\u0646: ${escapeHtml(section.timeframe)}</span>` : ""}
                                        </div>
                                    </div>
                                </div>
                                ${renderRecommendationListBlock("\u0627\u0644\u062F\u0644\u064A\u0644 \u0645\u0646 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A", section.evidence, "evidence-block")}
                                ${renderRecommendationListBlock("\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u0645\u0642\u062A\u0631\u062D\u0629", actions, "actions-block")}
                                ${renderRecommendationListBlock("\u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0646\u062C\u0627\u062D", section.successIndicators, "indicators-block")}
                            </article>
                        `;
  }).join("")}
            </div>
        </section>
    `;
}
function getLabel(row) {
  return String(row.label ?? row.name ?? row.shortLabel ?? row.day ?? row.date ?? "\u2014");
}
function getChartValue(row) {
  return numeric(row.value ?? row.count ?? row.score ?? row.accuracy ?? row.avg ?? row.avgTime ?? row.attempts);
}
function getChartColor(row, index) {
  return String(row.fill ?? row.color ?? PALETTE[index % PALETTE.length]);
}
function compactRows(rows, limit = 8) {
  return rows.slice(0, limit);
}
function formatChartValue(value, suffix = "") {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
}
function renderBarChart(title, rows, suffix = "", limit = 8) {
  if (!rows?.length) return "";
  const visibleRows = compactRows(rows, limit);
  const values = visibleRows.map(getChartValue);
  const max = Math.max(...values, 1);
  const average2 = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  return `
        <div class="chart-card">
            <div class="chart-head">
                <h3>${escapeHtml(title)}</h3>
                <span>\u0627\u0644\u0645\u062A\u0648\u0633\u0637 ${escapeHtml(formatChartValue(average2, suffix))}</span>
            </div>
            <div class="bar-list">
                ${visibleRows.map((row, index) => {
    const value = getChartValue(row);
    const width = Math.max(3, Math.round(value / max * 100));
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
  }).join("")}
            </div>
            ${rows.length > visibleRows.length ? `<p class="chart-note">\u064A\u0639\u0631\u0636 \u0623\u0639\u0644\u0649 ${visibleRows.length} \u0639\u0646\u0627\u0635\u0631 \u0645\u0646 \u0623\u0635\u0644 ${rows.length}.</p>` : ""}
        </div>
    `;
}
function renderDonutChart(title, rows) {
  if (!rows?.length) return "";
  const visibleRows = compactRows(rows, 6);
  const total = visibleRows.reduce((sum, row) => sum + getChartValue(row), 0);
  if (total <= 0) return "";
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = visibleRows.map((row, index) => {
    const value = getChartValue(row);
    const dash = value / total * circumference;
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
  }).join("");
  return `
        <div class="chart-card">
            <div class="chart-head">
                <h3>${escapeHtml(title)}</h3>
                <span>\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A ${escapeHtml(total)}</span>
            </div>
            <div class="donut-wrap">
                <svg class="donut" viewBox="0 0 144 144" aria-hidden="true">
                    <circle cx="72" cy="72" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="22" />
                    ${segments}
                    <text x="72" y="68" text-anchor="middle" class="donut-total">${escapeHtml(total)}</text>
                    <text x="72" y="86" text-anchor="middle" class="donut-label">\u0625\u062C\u0645\u0627\u0644\u064A</text>
                </svg>
                <div class="legend">
                    ${visibleRows.map((row, index) => {
    const value = getChartValue(row);
    const percent = Math.round(value / total * 100);
    return `
                                <div class="legend-item">
                                    <i style="background:${escapeHtml(getChartColor(row, index))}"></i>
                                    <span>${escapeHtml(getLabel(row))}</span>
                                    <strong>${escapeHtml(value)} (${percent}%)</strong>
                                </div>
                            `;
  }).join("")}
                </div>
            </div>
        </div>
    `;
}
function renderDailyTrendChart(rows) {
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
    const y = top + plotH - avg / 100 * plotH;
    return { x, y, avg };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  return `
        <div class="chart-card chart-card-wide">
            <div class="chart-head">
                <h3>\u0627\u062A\u062C\u0627\u0647 \u0627\u0644\u0623\u062F\u0627\u0621 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064A</h3>
                <span>\u0627\u0644\u0623\u0639\u0645\u062F\u0629 = \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0627\u062A\u060C \u0627\u0644\u062E\u0637 = \u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0623\u062F\u0627\u0621</span>
            </div>
            <svg class="trend-chart" viewBox="0 0 ${width} ${height}" aria-hidden="true">
                ${[0, 25, 50, 75, 100].map((tick) => {
    const y = top + plotH - tick / 100 * plotH;
    return `
                            <line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" class="grid-line" />
                            <text x="${left - 8}" y="${y + 4}" class="axis-label">${tick}%</text>
                        `;
  }).join("")}
                ${visibleRows.map((row, index) => {
    const x = left + pointGap * index;
    const attempts = numeric(row.attempts);
    const barH = Math.max(3, attempts / maxAttempts * plotH);
    const y = top + plotH - barH;
    return `
                            <rect x="${x - 12}" y="${y}" width="24" height="${barH}" rx="6" class="trend-bar" />
                            <text x="${x}" y="${height - 16}" class="x-label">${escapeHtml(row.day ?? row.date ?? index + 1)}</text>
                            <text x="${x}" y="${Math.max(y - 4, top + 9)}" class="bar-value">${escapeHtml(attempts)}</text>
                        `;
  }).join("")}
                <polyline points="${polyline}" fill="none" class="trend-line" />
                ${points.map(
    (point) => `
                            <circle cx="${point.x}" cy="${point.y}" r="5" class="trend-dot" />
                            <text x="${point.x}" y="${point.y - 10}" class="line-value">${escapeHtml(point.avg)}%</text>
                        `
  ).join("")}
            </svg>
        </div>
    `;
}
function renderScatterChart(rows) {
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
                <h3>\u0627\u0644\u0639\u0644\u0627\u0642\u0629 \u0628\u064A\u0646 \u0627\u0644\u0632\u0645\u0646 \u0648\u0627\u0644\u062F\u0631\u062C\u0629</h3>
                <span>\u0643\u0644 \u0646\u0642\u0637\u0629 \u062A\u0645\u062B\u0644 \u0645\u062D\u0627\u0648\u0644\u0629 \u0648\u0627\u062D\u062F\u0629</span>
            </div>
            <svg class="scatter-chart" viewBox="0 0 ${width} ${height}" aria-hidden="true">
                ${[0, 25, 50, 75, 100].map((tick) => {
    const y = top + plotH - tick / 100 * plotH;
    return `
                            <line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" class="grid-line" />
                            <text x="${left - 8}" y="${y + 4}" class="axis-label">${tick}%</text>
                        `;
  }).join("")}
                <line x1="${left}" y1="${top + plotH}" x2="${width - right}" y2="${top + plotH}" class="axis-line" />
                <line x1="${left}" y1="${top}" x2="${left}" y2="${top + plotH}" class="axis-line" />
                ${visibleRows.map((row, index) => {
    const time = Math.max(0, numeric(row.time));
    const score = Math.max(0, Math.min(100, numeric(row.score)));
    const x = left + time / maxTime * plotW;
    const y = top + plotH - score / 100 * plotH;
    return `<circle cx="${x}" cy="${y}" r="5" fill="${escapeHtml(getChartColor(row, index))}" opacity="0.78" />`;
  }).join("")}
                <text x="${left}" y="${height - 14}" class="x-label">\u0632\u0645\u0646 \u0623\u0642\u0644</text>
                <text x="${width - right}" y="${height - 14}" class="x-label">\u0632\u0645\u0646 \u0623\u0643\u062B\u0631</text>
            </svg>
            ${rows.length > visibleRows.length ? `<p class="chart-note">\u064A\u0639\u0631\u0636 \u0623\u0648\u0644 ${visibleRows.length} \u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0646 \u0623\u0635\u0644 ${rows.length}.</p>` : ""}
        </div>
    `;
}
function renderCharts(charts) {
  if (!charts) return "";
  const chartSections = [
    renderDailyTrendChart(charts.dailyTrend),
    renderDonutChart("\u0646\u0648\u0639 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u064A\u0646", charts.participantTypeData),
    renderDonutChart("\u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A", charts.answerOutcomeData),
    renderBarChart("\u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u062F\u0631\u062C\u0627\u062A", charts.scoreDistribution),
    renderBarChart("\u0623\u0641\u0636\u0644 \u0627\u0644\u0646\u062A\u0627\u0626\u062C", charts.topScoreChartData, "%", 6),
    renderBarChart("\u062F\u0642\u0629 \u0627\u0644\u0623\u0633\u0626\u0644\u0629", charts.questionAccuracyChartData, "%", 8),
    renderBarChart("\u0645\u062A\u0648\u0633\u0637 \u0632\u0645\u0646 \u0627\u0644\u0623\u0633\u0626\u0644\u0629", charts.questionTimeChartData, "\u062B", 8),
    renderBarChart("\u0645\u0644\u062E\u0635 \u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u062F\u0631\u062C\u0627\u062A", charts.scoreBoxData),
    renderScatterChart(charts.scoreTimeScatterData),
    renderBarChart("\u0634\u0631\u0627\u0626\u062D \u0627\u0644\u0645\u062A\u0639\u0644\u0645\u064A\u0646", charts.learnerSegments),
    renderBarChart("\u0635\u0639\u0648\u0628\u0629 \u0627\u0644\u0623\u0633\u0626\u0644\u0629", charts.questionDifficultyData)
  ].filter(Boolean);
  if (!chartSections.length) return "";
  return `
        <section class="section page-break-avoid">
            <h2>\u0627\u0644\u0631\u0633\u0648\u0645 \u0648\u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062A</h2>
            <div class="charts-grid">${chartSections.join("")}</div>
        </section>
    `;
}
function renderParticipants(results) {
  const sorted = [...results].sort((a, b) => getScorePercent(b) - getScorePercent(a));
  return `
        <section class="section">
            <h2>\u0633\u062C\u0644 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u064A\u0646 \u0648\u0627\u0644\u0646\u062A\u0627\u0626\u062C</h2>
            <table>
                <thead>
                    <tr>
                        <th>\u0627\u0644\u062A\u0631\u062A\u064A\u0628</th>
                        <th>\u0627\u0644\u0645\u0634\u0627\u0631\u0643</th>
                        <th>\u0627\u0644\u0646\u0633\u0628\u0629</th>
                        <th>\u0627\u0644\u0646\u0642\u0627\u0637</th>
                        <th>\u0635\u062D\u064A\u062D</th>
                        <th>\u062E\u0637\u0623</th>
                        <th>\u0627\u0644\u0648\u0642\u062A</th>
                        <th>\u0627\u0644\u0646\u0648\u0639</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.length ? sorted.map(
    (row, index) => `
                                        <tr>
                                            <td>${index + 1}</td>
                                            <td>${escapeHtml(getParticipantName(row))}</td>
                                            <td>${getScorePercent(row)}%</td>
                                            <td>${escapeHtml(row?.score ?? "\u2014")}</td>
                                            <td>${escapeHtml(row?.correct_answers ?? row?.correctAnswers ?? "\u2014")}</td>
                                            <td>${escapeHtml(row?.wrong_answers ?? row?.wrongAnswers ?? "\u2014")}</td>
                                            <td>${escapeHtml(row?.time_taken ?? row?.timeTaken ?? "\u2014")}</td>
                                            <td>${row?.user?.id ? "\u0645\u0633\u062C\u0644" : "\u0632\u0627\u0626\u0631"}</td>
                                        </tr>
                                    `
  ).join("") : `<tr><td colspan="8" class="empty">\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C \u0645\u0633\u062C\u0644\u0629.</td></tr>`}
                </tbody>
            </table>
        </section>
    `;
}
function renderQuestionRows(rows) {
  if (!rows?.length) return "";
  return `
        <section class="section">
            <h2>\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0623\u0633\u0626\u0644\u0629</h2>
            <table>
                <thead>
                    <tr>
                        <th>\u0627\u0644\u0633\u0624\u0627\u0644</th>
                        <th>\u0627\u0644\u062F\u0642\u0629</th>
                        <th>\u0625\u062C\u0627\u0628\u0627\u062A \u0635\u062D\u064A\u062D\u0629</th>
                        <th>\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(
    (row, index) => `
                                <tr>
                                    <td>${escapeHtml(`${index + 1}. ${stripHtml(row.questionText)}`)}</td>
                                    <td>${escapeHtml(row.accuracy)}%</td>
                                    <td>${escapeHtml(row.correct)}</td>
                                    <td>${escapeHtml(row.total)}</td>
                                </tr>
                            `
  ).join("")}
                </tbody>
            </table>
        </section>
    `;
}
function buildChallengeReportHtml(options) {
  const opts = options || { topicTitle: "\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u062A\u062D\u062F\u064A" };
  const results = Array.isArray(opts.results) ? opts.results : [];
  const summary = computeSummary(results);
  const generatedAt = (/* @__PURE__ */ new Date()).toLocaleString("ar-SA", {
    dateStyle: "full",
    timeStyle: "short"
  });
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8" />
    <title>${escapeHtml(opts.topicTitle || "\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u062A\u062D\u062F\u064A")}</title>
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
        <p class="eyebrow">\u062A\u0642\u0631\u064A\u0631 \u0623\u062F\u0627\u0621 \u0627\u0644\u062A\u062D\u062F\u064A \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A</p>
        <h1>${escapeHtml(opts.topicTitle || "\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u062A\u062D\u062F\u064A")}</h1>
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
        \u0645\u0646\u0635\u0629 lab4<br />
        \u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629
    </footer>
</body>
</html>`;
}

// src/lib/geminiClient.ts
var DEFAULT_MODEL_CHAIN = ["gemini-2.5-flash"];
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function withJitter(ms) {
  const cap = Math.min(2500, Math.floor(ms * 0.25));
  return ms + Math.floor(Math.random() * (cap + 1));
}
function readApiError(body, httpStatus, statusText) {
  if (body && typeof body === "object" && "error" in body) {
    const err = body.error;
    const code = typeof err?.code === "number" ? err.code : httpStatus;
    const message = (err?.message || err?.status || statusText || `HTTP ${httpStatus}`).trim();
    return { code, message };
  }
  return { code: httpStatus, message: statusText || `HTTP ${httpStatus}` };
}
function isRetryableHttp(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}
function isRetryableMessage(message) {
  const m = message.toLowerCase();
  return m.includes("high demand") || m.includes("resource exhausted") || m.includes("try again") || m.includes("overloaded") || m.includes("unavailable") || m.includes("deadline exceeded") || m.includes("capacity") || m.includes("rate limit") || m.includes("too many requests") || m.includes("internal error") || m.includes("temporar");
}
function isModelNotFound(httpStatus, message) {
  if (httpStatus === 404) return true;
  const m = message.toLowerCase();
  return (m.includes("not found") || m.includes("does not exist")) && (m.includes("model") || m.includes("models/"));
}
function shouldRetry(httpStatus, apiCode, message) {
  if ([400, 401, 403].includes(httpStatus)) return false;
  if (httpStatus === 404) return false;
  return isRetryableHttp(httpStatus) || isRetryableHttp(apiCode) || isRetryableMessage(message);
}
function parseRetryAfterMsFromMessage(message) {
  const m = message.match(/retry in ([\d.]+)\s*s/i);
  if (!m) return null;
  const sec = parseFloat(m[1]);
  if (Number.isNaN(sec) || sec < 0) return null;
  return Math.ceil(sec * 1e3);
}
function getPreferred429WaitMs(res, message, fallbackMs) {
  const header = res.headers.get("retry-after");
  if (header) {
    const sec = parseFloat(header);
    if (!Number.isNaN(sec) && sec >= 0) {
      return Math.min(Math.ceil(sec * 1e3), 12e4);
    }
  }
  const fromMsg = parseRetryAfterMsFromMessage(message);
  if (fromMsg !== null) {
    return Math.min(fromMsg + 400, 12e4);
  }
  return fallbackMs;
}
async function generateGeminiContent(apiKey, body, options) {
  const models = options?.models?.length ? options.models : DEFAULT_MODEL_CHAIN;
  const maxAttempts = options?.maxAttemptsPerModel ?? 5;
  const initialDelay = options?.initialDelayMs ?? 2e3;
  const maxDelay = options?.maxDelayMs ?? 45e3;
  let lastMessage = "";
  for (const model of models) {
    let delay = initialDelay;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      let parsed = null;
      try {
        parsed = await res.json();
      } catch {
        parsed = null;
      }
      if (res.ok) {
        return parsed;
      }
      const { code: apiCode, message } = readApiError(parsed, res.status, res.statusText);
      lastMessage = message;
      if (isModelNotFound(res.status, message)) {
        console.warn(`[Gemini] model ${model} not available, trying fallback`, message);
        break;
      }
      const retry = shouldRetry(res.status, apiCode, message);
      if (!retry) {
        throw new Error(message.startsWith("API:") ? message : `API: ${message}`);
      }
      if (attempt >= maxAttempts) {
        break;
      }
      const baseWait = withJitter(Math.min(delay, maxDelay));
      const waitMs = res.status === 429 ? getPreferred429WaitMs(res, message, baseWait) : baseWait;
      options?.onRetry?.({
        model,
        attempt,
        delayMs: waitMs,
        reason: message.slice(0, 200)
      });
      await sleep(waitMs);
      delay = Math.min(delay * 2, maxDelay);
    }
  }
  throw new Error(
    lastMessage ? `API: ${lastMessage}` : "API: \u0641\u0634\u0644 \u0627\u0644\u062A\u0648\u0644\u064A\u062F \u0628\u0639\u062F \u0639\u062F\u0629 \u0645\u062D\u0627\u0648\u0644\u0627\u062A. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B."
  );
}

// src/lib/challengeReportRecommendations.ts
var RECOMMENDATION_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
var RECOMMENDATION_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    summary: { type: "STRING" },
    keyFindings: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    sections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          priority: { type: "STRING" },
          timeframe: { type: "STRING" },
          evidence: { type: "ARRAY", items: { type: "STRING" } },
          actions: { type: "ARRAY", items: { type: "STRING" } },
          successIndicators: { type: "ARRAY", items: { type: "STRING" } },
          points: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["title", "actions"]
      }
    }
  },
  required: ["headline", "summary", "sections"]
};
function stripHtml2(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function clampText(value, maxLength) {
  return stripHtml2(value).slice(0, maxLength);
}
function getParticipantName2(row) {
  return row?.user?.name || row?.name || row?.participant_display_name || row?.display_name || "\u0637\u0627\u0644\u0628";
}
function getScorePercent2(row) {
  const percentage = Number(row?.percentage);
  if (Number.isFinite(percentage)) return Math.max(0, Math.min(100, Math.round(percentage)));
  const score = Number(row?.score);
  const maxScore = Number(row?.max_score ?? row?.maxScore);
  if (Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0) {
    return Math.max(0, Math.min(100, Math.round(score / maxScore * 100)));
  }
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
}
function average(values) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}
function professionalizeFallbackSections(sections, evidence) {
  return sections.map((section, index) => ({
    ...section,
    priority: index < 2 ? "\u0639\u0627\u0644\u064A\u0629" : index < 5 ? "\u0645\u062A\u0648\u0633\u0637\u0629" : "\u0645\u062A\u0627\u0628\u0639\u0629",
    timeframe: index < 4 ? "\u0627\u0644\u062D\u0635\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629" : "\u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639",
    evidence: index === 0 ? evidence : evidence.slice(0, 2),
    actions: section.points,
    successIndicators: [
      "\u062A\u062D\u0633\u0646 \u062F\u0642\u0629 \u0627\u0644\u0633\u0624\u0627\u0644 \u0623\u0648 \u0627\u0644\u0645\u0647\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641\u0629 \u0641\u064A \u0627\u0644\u0642\u064A\u0627\u0633 \u0627\u0644\u0642\u0635\u064A\u0631 \u0627\u0644\u062A\u0627\u0644\u064A.",
      "\u0627\u0646\u062A\u0642\u0627\u0644 \u0639\u062F\u062F \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0637\u0644\u0627\u0628 \u0645\u0646 \u0634\u0631\u064A\u062D\u0629 \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0625\u0644\u0649 \u0634\u0631\u064A\u062D\u0629 \u0627\u0644\u0642\u0631\u064A\u0628\u064A\u0646 \u0645\u0646 \u0627\u0644\u0625\u062A\u0642\u0627\u0646."
    ]
  }));
}
function buildRecommendationInput(opts) {
  const results = [...opts.results || []].sort((a, b) => getScorePercent2(b) - getScorePercent2(a)).slice(0, 80).map((row) => ({
    name: clampText(getParticipantName2(row), 60),
    percentage: getScorePercent2(row),
    score: row?.score ?? null,
    correctAnswers: row?.correct_answers ?? row?.correctAnswers ?? null,
    wrongAnswers: row?.wrong_answers ?? row?.wrongAnswers ?? null,
    timeTakenSeconds: row?.time_taken ?? row?.timeTaken ?? null,
    participantType: row?.user?.id ? "\u0645\u0633\u062C\u0644" : "\u0632\u0627\u0626\u0631"
  }));
  const questionRows = (opts.questionRows || []).slice(0, 50).map((row, index) => ({
    number: index + 1,
    question: clampText(row.questionText, 280),
    accuracy: row.accuracy,
    correctAnswers: row.correct,
    totalAnswers: row.total
  }));
  return {
    reportMeta: {
      title: opts.topicTitle,
      lessonTitle: opts.lessonTitle,
      className: opts.className,
      subjectName: opts.subjectName,
      teacherName: opts.teacherName,
      date: opts.sessionDate,
      time: opts.sessionTime,
      note: opts.mergedSessionsNote
    },
    analysisRows: opts.analysisRows || [],
    existingRecommendations: opts.recommendations || [],
    charts: opts.charts || {},
    participants: results,
    questions: questionRows
  };
}
function buildFallbackRecommendationReport(opts) {
  const input = buildRecommendationInput(opts);
  const participants = input.participants;
  const questions = input.questions;
  const scores = participants.map((participant) => participant.percentage);
  const avgScore = average(scores);
  const lowParticipants = participants.filter((participant) => participant.percentage < 60);
  const nearMasteryParticipants = participants.filter((participant) => participant.percentage >= 60 && participant.percentage < 85);
  const highParticipants = participants.filter((participant) => participant.percentage >= 85);
  const weakQuestions = [...questions].sort((a, b) => a.accuracy - b.accuracy).slice(0, 4);
  const strongQuestions = questions.filter((question) => question.accuracy >= 80).slice(0, 4);
  const weakestQuestion = weakQuestions[0];
  const lessonTitle = opts.lessonTitle || opts.topicTitle || "\u0627\u0644\u062F\u0631\u0633";
  const className = opts.className || "\u0627\u0644\u0635\u0641";
  return {
    headline: `\u062A\u0642\u0631\u064A\u0631 \u062A\u0648\u0635\u064A\u0627\u062A \u0645\u0648\u0633\u0639 \u0644\u062F\u0631\u0633 ${lessonTitle}`,
    summary: `\u064A\u0639\u0631\u0636 \u0647\u0630\u0627 \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u062A\u0648\u0635\u064A\u0627\u062A \u0639\u0645\u0644\u064A\u0629 \u0645\u0628\u0646\u064A\u0629 \u0639\u0644\u0649 ${participants.length} \u0645\u062D\u0627\u0648\u0644\u0629 \u0641\u064A ${className}. \u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0623\u062F\u0627\u0621 \u0627\u0644\u0639\u0627\u0645 \u0647\u0648 ${avgScore}%\u060C \u0645\u0639 ${lowParticipants.length} \u0645\u062D\u0627\u0648\u0644\u0629 \u062A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u062F\u0639\u0645 \u0645\u0628\u0627\u0634\u0631\u060C ${nearMasteryParticipants.length} \u0645\u062D\u0627\u0648\u0644\u0629 \u0642\u0631\u064A\u0628\u0629 \u0645\u0646 \u0627\u0644\u0625\u062A\u0642\u0627\u0646\u060C \u0648${highParticipants.length} \u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u062A\u0642\u062F\u0645\u0629. \u062A\u064F\u0633\u062A\u062E\u062F\u0645 \u0647\u0630\u0647 \u0627\u0644\u062A\u0648\u0635\u064A\u0627\u062A \u0643\u062E\u0637\u0629 \u0639\u0645\u0644 \u0644\u0644\u062D\u0635\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629 \u0639\u0646\u062F\u0645\u0627 \u064A\u062A\u0639\u0630\u0631 \u062A\u0648\u0644\u064A\u062F \u062A\u0642\u0631\u064A\u0631 Gemini \u0627\u0644\u0643\u0627\u0645\u0644 \u0623\u0648 \u0643\u062F\u0639\u0645 \u0625\u0636\u0627\u0641\u064A \u0644\u0647.`,
    keyFindings: [
      `\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0623\u062F\u0627\u0621 \u0627\u0644\u0639\u0627\u0645: ${avgScore}%.`,
      `\u0639\u062F\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u062D\u062A\u0627\u062C \u062F\u0639\u0645\u0627\u064B \u0645\u0628\u0627\u0634\u0631\u0627\u064B: ${lowParticipants.length}.`,
      weakestQuestion ? `\u0623\u0636\u0639\u0641 \u0633\u0624\u0627\u0644 \u0641\u064A \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u062F\u0642\u062A\u0647 ${weakestQuestion.accuracy}%.` : "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u062A\u0641\u0635\u064A\u0644\u064A\u0629 \u0643\u0627\u0641\u064A\u0629 \u0644\u0644\u0623\u0633\u0626\u0644\u0629."
    ],
    sections: professionalizeFallbackSections([
      {
        title: "\u062A\u0634\u062E\u064A\u0635 \u0627\u0644\u0623\u062F\u0627\u0621 \u0627\u0644\u0639\u0627\u0645",
        points: [
          `\u0627\u0628\u062F\u0623 \u0627\u0644\u062D\u0635\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629 \u0628\u0639\u0631\u0636 \u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0623\u062F\u0627\u0621 \u0627\u0644\u0639\u0627\u0645 (${avgScore}%) \u0644\u0644\u0645\u0639\u0644\u0645 \u0641\u0642\u0637\u060C \u062B\u0645 \u0627\u0631\u0628\u0637\u0647 \u0628\u0647\u062F\u0641 \u062A\u0639\u0644\u0645 \u0648\u0627\u0636\u062D \u0648\u0642\u0627\u0628\u0644 \u0644\u0644\u0642\u064A\u0627\u0633 \u0641\u064A \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u062D\u0635\u0629.`,
          `\u0627\u0633\u062A\u062E\u062F\u0645 \u0639\u062F\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0627\u062A (${participants.length}) \u0644\u062A\u062D\u062F\u064A\u062F \u0645\u062F\u0649 \u0645\u0648\u062B\u0648\u0642\u064A\u0629 \u0627\u0644\u0627\u0633\u062A\u0646\u062A\u0627\u062C\u0627\u062A\u061B \u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0639\u062F\u062F \u0642\u0644\u064A\u0644\u0627\u064B \u0641\u0627\u062C\u0639\u0644 \u0627\u0644\u0642\u0631\u0627\u0631\u0627\u062A \u0639\u0644\u0627\u062C\u064A\u0629 \u0645\u0624\u0642\u062A\u0629 \u062D\u062A\u0649 \u062A\u062A\u0648\u0641\u0631 \u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0643\u062B\u0631.`,
          `\u0642\u0633\u0651\u0645 \u0627\u0644\u0637\u0644\u0627\u0628 \u0625\u0644\u0649 \u062B\u0644\u0627\u062B \u0634\u0631\u0627\u0626\u062D: \u062F\u0639\u0645 \u0645\u0628\u0627\u0634\u0631 (${lowParticipants.length})\u060C \u0642\u0631\u064A\u0628\u0648\u0646 \u0645\u0646 \u0627\u0644\u0625\u062A\u0642\u0627\u0646 (${nearMasteryParticipants.length})\u060C \u0648\u0645\u062A\u0642\u062F\u0645\u0648\u0646 (${highParticipants.length}).`,
          weakestQuestion ? `\u0627\u0639\u062A\u0628\u0631 \u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u0623\u0636\u0639\u0641 \u0646\u0642\u0637\u0629 \u0628\u062F\u0621 \u0644\u0644\u0645\u0631\u0627\u062C\u0639\u0629: "${weakestQuestion.question}" \u0628\u062F\u0642\u0629 ${weakestQuestion.accuracy}%.` : "\u0625\u0630\u0627 \u0644\u0645 \u062A\u062A\u0648\u0641\u0631 \u0628\u064A\u0627\u0646\u0627\u062A \u062A\u0641\u0635\u064A\u0644 \u0627\u0644\u0623\u0633\u0626\u0644\u0629\u060C \u0627\u0633\u062A\u062E\u062F\u0645 \u0646\u0642\u0627\u0634\u0627\u064B \u0633\u0631\u064A\u0639\u0627\u064B \u0645\u0639 \u0627\u0644\u0637\u0644\u0627\u0628 \u0644\u062A\u062D\u062F\u064A\u062F \u0623\u0643\u062B\u0631 \u062E\u0637\u0648\u0629 \u0633\u0628\u0628\u062A \u0635\u0639\u0648\u0628\u0629 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062D\u0644."
        ]
      },
      {
        title: "\u062A\u062F\u062E\u0644\u0627\u062A \u0639\u0644\u0627\u062C\u064A\u0629 \u0641\u0648\u0631\u064A\u0629",
        points: [
          "\u062E\u0635\u0635 \u0623\u0648\u0644 8 \u0625\u0644\u0649 10 \u062F\u0642\u0627\u0626\u0642 \u0644\u0646\u0634\u0627\u0637 \u0625\u0639\u0627\u062F\u0629 \u062A\u062F\u0631\u064A\u0633 \u0645\u0635\u063A\u0631 \u064A\u0634\u0631\u062D \u0627\u0644\u0645\u0641\u0647\u0648\u0645 \u0627\u0644\u0623\u0633\u0627\u0633\u064A \u0628\u062E\u0637\u0648\u0627\u062A \u0642\u0635\u064A\u0631\u0629 \u0648\u0645\u062B\u0627\u0644 \u0645\u062D\u0644\u0648\u0644 \u0623\u0645\u0627\u0645 \u0627\u0644\u0637\u0644\u0627\u0628.",
          "\u0627\u0637\u0644\u0628 \u0645\u0646 \u0627\u0644\u0637\u0644\u0627\u0628 \u062D\u0644 \u0633\u0624\u0627\u0644 \u0645\u0634\u0627\u0628\u0647 \u0644\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u0623\u0636\u0639\u0641 \u0628\u0634\u0643\u0644 \u0641\u0631\u062F\u064A\u060C \u062B\u0645 \u0646\u0627\u0642\u0634 \u062E\u0637\u0623\u064B \u0634\u0627\u0626\u0639\u0627\u064B \u0648\u0627\u062D\u062F\u0627\u064B \u0641\u0642\u0637 \u062D\u062A\u0649 \u0644\u0627 \u062A\u062A\u0634\u062A\u062A \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629.",
          "\u0642\u062F\u0651\u0645 \u0628\u0637\u0627\u0642\u0629 \u062F\u0639\u0645 \u0635\u063A\u064A\u0631\u0629 \u0644\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0623\u0642\u0644 \u0645\u0646 60% \u062A\u062A\u0636\u0645\u0646: \u0627\u0644\u0642\u0627\u0639\u062F\u0629\u060C \u0645\u062B\u0627\u0644\u0627\u064B \u0645\u062D\u0644\u0648\u0644\u0627\u064B\u060C \u0648\u0633\u0624\u0627\u0644 \u062A\u062D\u0642\u0642 \u0633\u0631\u064A\u0639.",
          "\u0627\u0633\u062A\u062E\u062F\u0645 \u0633\u0624\u0627\u0644 \u062E\u0631\u0648\u062C \u0641\u064A \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u062D\u0635\u0629 \u064A\u0642\u064A\u0633 \u0646\u0641\u0633 \u0627\u0644\u0641\u062C\u0648\u0629\u060C \u0648\u0642\u0627\u0631\u0646 \u0646\u062A\u064A\u062C\u062A\u0647 \u0628\u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u062A\u062D\u062F\u064A \u0644\u0645\u0639\u0631\u0641\u0629 \u0623\u062B\u0631 \u0627\u0644\u062A\u062F\u062E\u0644."
        ]
      },
      {
        title: "\u062A\u0641\u0631\u064A\u062F \u0627\u0644\u062F\u0639\u0645 \u062D\u0633\u0628 \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0637\u0644\u0627\u0628",
        points: [
          "\u0627\u0644\u0645\u062A\u0639\u0644\u0645\u0648\u0646 \u0627\u0644\u0623\u0642\u0644 \u0645\u0646 60% \u064A\u062D\u062A\u0627\u062C\u0648\u0646 \u0639\u0645\u0644\u0627\u064B \u0645\u0648\u062C\u0647\u0627\u064B \u0645\u0639 \u0627\u0644\u0645\u0639\u0644\u0645 \u0623\u0648 \u0632\u0645\u064A\u0644 \u0645\u062A\u0645\u0643\u0646 \u0642\u0628\u0644 \u062A\u0643\u0644\u064A\u0641\u0647\u0645 \u0628\u062A\u0645\u0627\u0631\u064A\u0646 \u0645\u0633\u062A\u0642\u0644\u0629.",
          "\u0627\u0644\u0645\u062A\u0639\u0644\u0645\u0648\u0646 \u0628\u064A\u0646 60% \u064884% \u064A\u062D\u062A\u0627\u062C\u0648\u0646 \u062A\u062F\u0631\u064A\u0628\u0627\u064B \u0642\u0635\u064A\u0631\u0627\u064B \u0639\u0644\u0649 \u062E\u0637\u0648\u0629 \u0627\u0644\u062E\u0637\u0623 \u0641\u0642\u0637\u060C \u062B\u0645 \u0633\u0624\u0627\u0644\u064A\u0646 \u0645\u062A\u062F\u0631\u062C\u064A\u0646 \u0644\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0627\u0644\u062B\u0628\u0627\u062A.",
          "\u0627\u0644\u0645\u062A\u0639\u0644\u0645\u0648\u0646 85% \u0641\u0623\u0639\u0644\u0649 \u064A\u0645\u0643\u0646 \u062A\u0643\u0644\u064A\u0641\u0647\u0645 \u0628\u0633\u0624\u0627\u0644 \u0625\u062B\u0631\u0627\u0626\u064A \u0623\u0648 \u0628\u062F\u0648\u0631 \u0642\u0627\u0626\u062F \u0645\u062C\u0645\u0648\u0639\u0629 \u064A\u0634\u0631\u062D \u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A\u0629 \u0627\u0644\u062D\u0644 \u062F\u0648\u0646 \u0625\u0639\u0637\u0627\u0621 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0645\u0628\u0627\u0634\u0631\u0629.",
          "\u0644\u0627 \u062A\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0646\u0634\u0627\u0637 \u0646\u0641\u0633\u0647 \u0644\u0643\u0644 \u0627\u0644\u0634\u0631\u0627\u0626\u062D\u061B \u0627\u062C\u0639\u0644 \u0627\u0644\u0632\u0645\u0646\u060C \u0639\u062F\u062F \u0627\u0644\u0623\u0633\u0626\u0644\u0629\u060C \u0648\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062A\u0644\u0645\u064A\u062D\u0627\u062A \u0645\u062E\u062A\u0644\u0641\u0627\u064B \u062D\u0633\u0628 \u0646\u062A\u064A\u062C\u0629 \u0643\u0644 \u0634\u0631\u064A\u062D\u0629."
        ]
      },
      {
        title: "\u062E\u0637\u0629 \u0627\u0644\u062D\u0635\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629",
        points: [
          `\u0627\u0641\u062A\u062A\u062D \u0627\u0644\u062D\u0635\u0629 \u0628\u0633\u0624\u0627\u0644 \u062A\u0634\u062E\u064A\u0635\u064A \u0645\u0631\u062A\u0628\u0637 \u0645\u0628\u0627\u0634\u0631\u0629 \u0628\u062F\u0631\u0633 ${lessonTitle}\u060C \u0648\u0644\u0627 \u064A\u062A\u062C\u0627\u0648\u0632 \u0632\u0645\u0646\u0647 \u062B\u0644\u0627\u062B \u062F\u0642\u0627\u0626\u0642.`,
          "\u0628\u0639\u062F \u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u062A\u0634\u062E\u064A\u0635\u064A\u060C \u0627\u0639\u0631\u0636 \u0645\u062B\u0627\u0644\u0627\u064B \u0645\u062D\u0644\u0648\u0644\u0627\u064B \u0648\u0627\u062D\u062F\u0627\u064B \u062B\u0645 \u0645\u062B\u0627\u0644\u0627\u064B \u0646\u0627\u0642\u0635 \u0627\u0644\u062E\u0637\u0648\u0627\u062A \u0644\u064A\u0643\u0645\u0644\u0647 \u0627\u0644\u0637\u0644\u0627\u0628 \u062C\u0645\u0627\u0639\u064A\u0627\u064B.",
          "\u0646\u0641\u0630 \u0646\u0634\u0627\u0637 \u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0642\u0635\u064A\u0631: \u0645\u062C\u0645\u0648\u0639\u0629 \u0639\u0644\u0627\u062C\u064A\u0629 \u0645\u0639 \u0627\u0644\u0645\u0639\u0644\u0645\u060C \u0645\u062C\u0645\u0648\u0639\u0629 \u062A\u062F\u0631\u064A\u0628 \u0630\u0627\u062A\u064A\u060C \u0648\u0645\u062C\u0645\u0648\u0639\u0629 \u0625\u062B\u0631\u0627\u0621 \u0644\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0645\u062A\u0642\u062F\u0645\u064A\u0646.",
          "\u0627\u062E\u062A\u0645 \u0627\u0644\u062D\u0635\u0629 \u0628\u0642\u064A\u0627\u0633 \u0633\u0631\u064A\u0639 \u0645\u0646 \u0633\u0624\u0627\u0644\u064A\u0646: \u0648\u0627\u062D\u062F \u064A\u0639\u0627\u0644\u062C \u0623\u0636\u0639\u0641 \u0645\u0647\u0627\u0631\u0629\u060C \u0648\u0622\u062E\u0631 \u064A\u0642\u064A\u0633 \u0627\u0646\u062A\u0642\u0627\u0644 \u0623\u062B\u0631 \u0627\u0644\u062A\u0639\u0644\u0645 \u0625\u0644\u0649 \u0633\u064A\u0627\u0642 \u062C\u062F\u064A\u062F."
        ]
      },
      {
        title: "\u0623\u0633\u0626\u0644\u0629 \u0648\u0623\u0646\u0634\u0637\u0629 \u0645\u0642\u062A\u0631\u062D\u0629",
        points: [
          weakestQuestion ? `\u062D\u0648\u0651\u0644 \u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u0623\u0642\u0644 \u062F\u0642\u0629 \u0625\u0644\u0649 \u062B\u0644\u0627\u062B\u0629 \u0623\u0633\u0626\u0644\u0629 \u0645\u062A\u062F\u0631\u062C\u0629: \u0633\u0624\u0627\u0644 \u062A\u0630\u0643\u0651\u0631\u060C \u0633\u0624\u0627\u0644 \u062A\u0637\u0628\u064A\u0642 \u0645\u0628\u0627\u0634\u0631\u060C \u0648\u0633\u0624\u0627\u0644 \u062A\u0641\u0633\u064A\u0631 \u0633\u0628\u0628 \u0627\u0644\u0625\u062C\u0627\u0628\u0629.` : "\u0623\u0646\u0634\u0626 \u062B\u0644\u0627\u062B\u0629 \u0623\u0633\u0626\u0644\u0629 \u0645\u062A\u062F\u0631\u062C\u0629 \u062D\u0648\u0644 \u0623\u0643\u062B\u0631 \u0645\u0641\u0647\u0648\u0645 \u0638\u0647\u0631 \u0641\u064A \u0627\u0644\u062F\u0631\u0633: \u062A\u0639\u0631\u064A\u0641\u060C \u062A\u0637\u0628\u064A\u0642\u060C \u0648\u062A\u0641\u0633\u064A\u0631.",
          "\u0627\u0633\u062A\u062E\u062F\u0645 \u0646\u0634\u0627\u0637 (\u0627\u0643\u062A\u0634\u0641 \u0627\u0644\u062E\u0637\u0623) \u0628\u0639\u0631\u0636 \u0625\u062C\u0627\u0628\u0629 \u062E\u0627\u0637\u0626\u0629 \u0642\u0635\u064A\u0631\u0629 \u0648\u0627\u0637\u0644\u0628 \u0645\u0646 \u0627\u0644\u0637\u0644\u0627\u0628 \u062A\u062D\u062F\u064A\u062F \u0645\u0648\u0636\u0639 \u0627\u0644\u062E\u0637\u0623 \u0648\u062A\u0635\u062D\u064A\u062D\u0647.",
          "\u0627\u0637\u0644\u0628 \u0645\u0646 \u0643\u0644 \u0637\u0627\u0644\u0628 \u0643\u062A\u0627\u0628\u0629 \u0642\u0627\u0639\u062F\u0629 \u0623\u0648 \u062E\u0637\u0648\u0629 \u062D\u0644 \u0628\u0644\u063A\u0629 \u0628\u0633\u064A\u0637\u0629\u060C \u062B\u0645 \u062A\u0628\u0627\u062F\u0644 \u0627\u0644\u0648\u0631\u0642\u0629 \u0645\u0639 \u0632\u0645\u064A\u0644 \u0644\u0644\u062A\u062D\u0642\u0642.",
          "\u0644\u0644\u0645\u062A\u0642\u062F\u0645\u064A\u0646\u060C \u0623\u0636\u0641 \u0633\u0624\u0627\u0644\u0627\u064B \u0645\u0641\u062A\u0648\u062D\u0627\u064B \u064A\u0637\u0644\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u062B\u0627\u0644 \u062C\u062F\u064A\u062F \u064A\u062D\u0642\u0642 \u0627\u0644\u0634\u0631\u0637 \u0646\u0641\u0633\u0647 \u0645\u0639 \u062A\u0628\u0631\u064A\u0631 \u0627\u0644\u062D\u0644."
        ]
      },
      {
        title: "\u0646\u0642\u0627\u0637 \u0627\u0644\u0642\u0648\u0629 \u0648\u0641\u0631\u0635 \u0627\u0644\u0625\u062B\u0631\u0627\u0621",
        points: [
          strongQuestions.length ? `\u0627\u0633\u062A\u062B\u0645\u0631 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0630\u0627\u062A \u0627\u0644\u062F\u0642\u0629 \u0627\u0644\u0639\u0627\u0644\u064A\u0629 (${strongQuestions.map((q) => `\u0633${q.number}: ${q.accuracy}%`).join("\u060C ")}) \u0643\u0646\u0645\u0627\u0630\u062C \u0644\u0628\u0646\u0627\u0621 \u0627\u0644\u062B\u0642\u0629 \u0642\u0628\u0644 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0641\u062C\u0648\u0627\u062A.` : "\u0625\u0630\u0627 \u0644\u0645 \u062A\u0638\u0647\u0631 \u0623\u0633\u0626\u0644\u0629 \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u062F\u0642\u0629\u060C \u0627\u0628\u062F\u0623 \u0628\u0625\u0639\u0627\u062F\u0629 \u0628\u0646\u0627\u0621 \u0627\u0644\u0645\u0641\u0647\u0648\u0645 \u0645\u0646 \u0645\u062B\u0627\u0644 \u0645\u062D\u0633\u0648\u0633 \u0623\u0648 \u0633\u064A\u0627\u0642 \u0642\u0631\u064A\u0628 \u0645\u0646 \u0627\u0644\u0637\u0644\u0627\u0628.",
          "\u0643\u0644\u0641 \u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0645\u062A\u0642\u062F\u0645\u064A\u0646 \u0628\u0634\u0631\u062D \u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A\u0629 \u0648\u0627\u062D\u062F\u0629 \u0641\u0642\u0637 \u0644\u0632\u0645\u0644\u0627\u0626\u0647\u0645\u060C \u0645\u0639 \u0645\u0646\u0639\u0647\u0645 \u0645\u0646 \u0625\u0639\u0637\u0627\u0621 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629 \u0645\u0628\u0627\u0634\u0631\u0629.",
          "\u0642\u062F\u0651\u0645 \u0646\u0634\u0627\u0637 \u062A\u062D\u062F\u064A \u0625\u0636\u0627\u0641\u064A \u0642\u0635\u064A\u0631 \u0644\u0644\u0645\u062A\u0642\u062F\u0645\u064A\u0646 \u064A\u062A\u0637\u0644\u0628 \u062A\u0641\u0633\u064A\u0631\u0627\u064B \u0623\u0648 \u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u064A\u0646 \u0637\u0631\u064A\u0642\u062A\u064A\u0646 \u0644\u0644\u062D\u0644.",
          "\u0627\u0633\u062A\u062E\u062F\u0645 \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0635\u062D\u064A\u062D\u0629 \u0643\u0646\u0645\u0627\u0630\u062C \u0635\u0641\u064A\u0629\u060C \u0645\u0639 \u0627\u0644\u062A\u0631\u0643\u064A\u0632 \u0639\u0644\u0649 \u0633\u0628\u0628 \u0635\u062D\u0629 \u0627\u0644\u062D\u0644 \u0648\u0644\u064A\u0633 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0641\u0642\u0637."
        ]
      },
      {
        title: "\u0645\u062A\u0627\u0628\u0639\u0629 \u0648\u0642\u064A\u0627\u0633",
        points: [
          "\u0623\u0639\u062F \u062A\u0646\u0641\u064A\u0630 \u062A\u062D\u062F\u064D \u0642\u0635\u064A\u0631 \u0628\u0639\u062F \u0627\u0644\u062A\u062F\u062E\u0644 \u0627\u0644\u0639\u0644\u0627\u062C\u064A \u062E\u0644\u0627\u0644 24 \u0625\u0644\u0649 48 \u0633\u0627\u0639\u0629 \u0644\u0642\u064A\u0627\u0633 \u0627\u0644\u062A\u062D\u0633\u0646 \u0627\u0644\u062D\u0642\u064A\u0642\u064A \u0644\u0627 \u0623\u062B\u0631 \u0627\u0644\u062A\u0630\u0643\u0631 \u0627\u0644\u0645\u0624\u0642\u062A \u0641\u0642\u0637.",
          "\u0631\u0627\u0642\u0628 \u0627\u0646\u062A\u0642\u0627\u0644 \u0627\u0644\u0637\u0644\u0627\u0628 \u0645\u0646 \u0634\u0631\u064A\u062D\u0629 \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0625\u0644\u0649 \u0634\u0631\u064A\u062D\u0629 \u0627\u0644\u0642\u0631\u064A\u0628\u064A\u0646 \u0645\u0646 \u0627\u0644\u0625\u062A\u0642\u0627\u0646\u060C \u0641\u0647\u0630\u0627 \u0645\u0624\u0634\u0631 \u0623\u0647\u0645 \u0645\u0646 \u0627\u0631\u062A\u0641\u0627\u0639 \u0627\u0644\u0645\u062A\u0648\u0633\u0637 \u0648\u062D\u062F\u0647.",
          "\u0627\u062D\u062A\u0641\u0638 \u0628\u0633\u0624\u0627\u0644 \u062B\u0627\u0628\u062A \u0645\u0646 \u0646\u0641\u0633 \u0627\u0644\u0645\u0647\u0627\u0631\u0629 \u0641\u064A \u0643\u0644 \u0642\u064A\u0627\u0633 \u0642\u0635\u064A\u0631 \u062D\u062A\u0649 \u064A\u0645\u0643\u0646 \u0645\u0642\u0627\u0631\u0646\u0629 \u0627\u0644\u0646\u062A\u0627\u0626\u062C \u0639\u0628\u0631 \u0627\u0644\u0632\u0645\u0646.",
          "\u0625\u0630\u0627 \u0628\u0642\u064A\u062A \u062F\u0642\u0629 \u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u0623\u0636\u0639\u0641 \u0645\u0646\u062E\u0641\u0636\u0629 \u0628\u0639\u062F \u0627\u0644\u062A\u062F\u062E\u0644\u060C \u063A\u064A\u0651\u0631 \u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u0634\u0631\u062D \u0648\u0627\u0633\u062A\u062E\u062F\u0645 \u062A\u0645\u062B\u064A\u0644\u0627\u064B \u0628\u0635\u0631\u064A\u0627\u064B \u0623\u0648 \u0645\u062B\u0627\u0644\u0627\u064B \u062D\u064A\u0627\u062A\u064A\u0627\u064B \u0642\u0628\u0644 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631."
        ]
      }
    ], [
      `\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0623\u062F\u0627\u0621 \u0627\u0644\u0639\u0627\u0645: ${avgScore}%.`,
      `\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0645\u0628\u0627\u0634\u0631: ${lowParticipants.length}.`,
      weakestQuestion ? `\u0623\u0636\u0639\u0641 \u0633\u0624\u0627\u0644: \u062F\u0642\u062A\u0647 ${weakestQuestion.accuracy}%.` : "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0633\u0626\u0644\u0629 \u062A\u0641\u0635\u064A\u0644\u064A\u0629 \u0643\u0627\u0641\u064A\u0629."
    ])
  };
}
function extractText(data) {
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim() || "";
}
function extractJsonCandidate(text) {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
}
function parseJsonObject(text) {
  try {
    return JSON.parse(extractJsonCandidate(text));
  } catch {
    return null;
  }
}
function sanitizeStringList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => clampText(item, maxLength)).filter(Boolean).slice(0, maxItems);
}
function sanitizeRecommendationReport(value) {
  const record = value && typeof value === "object" ? value : {};
  const sectionsRaw = Array.isArray(record.sections) ? record.sections : [];
  const sections = sectionsRaw.slice(0, 8).map((section) => {
    const row = section && typeof section === "object" ? section : {};
    const points = sanitizeStringList(row.points, 8, 420);
    const actions = sanitizeStringList(row.actions, 7, 420);
    const evidence = sanitizeStringList(row.evidence, 4, 320);
    const successIndicators = sanitizeStringList(row.successIndicators, 4, 260);
    return {
      title: clampText(row.title, 90) || "\u062A\u0648\u0635\u064A\u0629",
      priority: clampText(row.priority, 40),
      timeframe: clampText(row.timeframe, 60),
      evidence,
      actions,
      successIndicators,
      points: points.length ? points : actions
    };
  }).filter(
    (section) => section.points.length > 0 || section.actions.length > 0 || section.evidence.length > 0 || section.successIndicators.length > 0
  );
  return {
    headline: clampText(record.headline, 120) || "\u062A\u0642\u0631\u064A\u0631 \u062A\u0648\u0635\u064A\u0627\u062A \u062A\u0639\u0644\u064A\u0645\u064A\u0629",
    summary: clampText(record.summary, 1200) || "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062A\u0648\u0635\u064A\u0627\u062A \u062A\u0639\u0644\u064A\u0645\u064A\u0629 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0623\u062F\u0627\u0621 \u0627\u0644\u0645\u062A\u0627\u062D\u0629.",
    keyFindings: sanitizeStringList(record.keyFindings, 6, 220),
    sections
  };
}
function buildPrompt(input) {
  return `
\u0623\u0646\u062A \u0645\u0633\u062A\u0634\u0627\u0631 \u062A\u0631\u0628\u0648\u064A \u0648\u062E\u0628\u064A\u0631 \u062A\u0642\u0648\u064A\u0645 \u062A\u0639\u0644\u064A\u0645\u064A. \u0623\u0646\u0634\u0626 \u062A\u0642\u0631\u064A\u0631 \u062A\u0648\u0635\u064A\u0627\u062A \u062A\u0639\u0644\u064A\u0645\u064A\u0629 \u0643\u0627\u0645\u0644 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A \u062A\u0639\u0644\u064A\u0645\u064A.

\u0627\u0644\u0645\u0637\u0644\u0648\u0628:
- \u0627\u0643\u062A\u0628 \u062A\u0642\u0631\u064A\u0631\u0627\u064B \u062A\u0641\u0635\u064A\u0644\u064A\u0627\u064B \u0648\u0644\u064A\u0633 \u0642\u0627\u0626\u0645\u0629 \u0642\u0635\u064A\u0631\u0629. \u0627\u062C\u0639\u0644 \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u063A\u0646\u064A\u0651\u0627\u064B \u0628\u0645\u0627 \u064A\u0643\u0641\u064A \u0644\u064A\u062F\u0639\u0645 \u0642\u0631\u0627\u0631 \u0627\u0644\u0645\u0639\u0644\u0645 \u0641\u064A \u0627\u0644\u062D\u0635\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629.
- \u0627\u0643\u062A\u0628 \u062A\u0648\u0635\u064A\u0627\u062A \u0639\u0645\u0644\u064A\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u0646\u0641\u064A\u0630 \u0644\u0644\u0645\u0639\u0644\u0645\u060C \u0645\u0639 \u062E\u0637\u0648\u0627\u062A \u0645\u062D\u062F\u062F\u0629 \u062F\u0627\u062E\u0644 \u0627\u0644\u0635\u0641.
- \u0627\u0631\u0628\u0637 \u0627\u0644\u062A\u0648\u0635\u064A\u0627\u062A \u0628\u0627\u0644\u0623\u0631\u0642\u0627\u0645: \u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0623\u062F\u0627\u0621\u060C \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0623\u0636\u0639\u0641\u060C \u0627\u0644\u0632\u0645\u0646\u060C \u0627\u0644\u062A\u0634\u062A\u062A\u060C \u0634\u0631\u0627\u0626\u062D \u0627\u0644\u0645\u062A\u0639\u0644\u0645\u064A\u0646.
- \u0627\u0642\u062A\u0631\u062D \u0639\u0644\u0627\u062C\u0627\u064B \u0642\u0635\u064A\u0631 \u0627\u0644\u0645\u062F\u0649 \u0644\u0644\u062D\u0635\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629\u060C \u0648\u062E\u0637\u0629 \u0645\u062A\u0627\u0628\u0639\u0629 \u0623\u0633\u0628\u0648\u0639\u064A\u0629\u060C \u0648\u0623\u0646\u0634\u0637\u0629 \u0625\u062B\u0631\u0627\u0626\u064A\u0629 \u0648\u062F\u0627\u0639\u0645\u0629.
- \u0635\u0646\u0651\u0641 \u0627\u0644\u0637\u0644\u0627\u0628 \u0623\u0648 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0625\u0644\u0649 \u0645\u062C\u0645\u0648\u0639\u0627\u062A \u062F\u0639\u0645 \u0639\u0646\u062F \u0627\u0644\u0625\u0645\u0643\u0627\u0646: \u0645\u062A\u0642\u062F\u0645\u0648\u0646\u060C \u0642\u0631\u064A\u0628\u0648\u0646 \u0645\u0646 \u0627\u0644\u0625\u062A\u0642\u0627\u0646\u060C \u064A\u062D\u062A\u0627\u062C\u0648\u0646 \u062F\u0639\u0645\u0627\u064B.
- \u0627\u0630\u0643\u0631 \u0623\u0645\u062B\u0644\u0629 \u0644\u0623\u0646\u0634\u0637\u0629 \u0635\u0641\u064A\u0629 \u0623\u0648 \u0648\u0627\u062C\u0628\u0627\u062A \u0642\u0635\u064A\u0631\u0629 \u0623\u0648 \u0623\u0633\u0626\u0644\u0629 \u0645\u0631\u0627\u062C\u0639\u0629 \u064A\u0645\u0643\u0646 \u062A\u0637\u0628\u064A\u0642\u0647\u0627 \u0645\u0628\u0627\u0634\u0631\u0629.
- \u0627\u0643\u062A\u0628 \u0645\u0646 7 \u0625\u0644\u0649 9 \u0623\u0642\u0633\u0627\u0645\u060C \u0648\u0641\u064A \u0643\u0644 \u0642\u0633\u0645 \u0645\u0646 4 \u0625\u0644\u0649 8 \u0646\u0642\u0627\u0637 \u0645\u0641\u0635\u0644\u0629.
- \u0644\u0627 \u062A\u0643\u0631\u0631 \u0627\u0644\u062C\u062F\u0627\u0648\u0644\u060C \u0648\u0644\u0627 \u062A\u0643\u062A\u0628 \u0643\u0644\u0627\u0645\u0627\u064B \u0639\u0627\u0645\u0627\u064B. \u0627\u062C\u0639\u0644 \u0643\u0644 \u0646\u0642\u0637\u0629 \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0633\u0644\u0648\u0643 \u062A\u0639\u0644\u064A\u0645\u064A \u0648\u0627\u0636\u062D.
- \u0625\u0630\u0627 \u0643\u0627\u0646\u062A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0642\u0644\u064A\u0644\u0629\u060C \u0627\u0630\u0643\u0631 \u062D\u062F\u0648\u062F \u0627\u0644\u0627\u0633\u062A\u0646\u062A\u0627\u062C \u0628\u0644\u063A\u0629 \u0645\u0647\u0646\u064A\u0629.

\u0623\u0639\u062F JSON \u0641\u0642\u0637 \u0628\u0647\u0630\u0627 \u0627\u0644\u0634\u0643\u0644 \u0627\u0644\u0645\u0647\u0646\u064A\u060C \u0628\u062F\u0648\u0646 Markdown \u0648\u0628\u062F\u0648\u0646 \u0634\u0631\u062D \u062E\u0627\u0631\u062C JSON:
{
  "headline": "\u0639\u0646\u0648\u0627\u0646 \u0642\u0635\u064A\u0631 \u0644\u0644\u062A\u0642\u0631\u064A\u0631",
  "summary": "\u0645\u0644\u062E\u0635 \u062A\u0646\u0641\u064A\u0630\u064A \u0645\u0641\u0635\u0644 \u0645\u0646 5 \u0625\u0644\u0649 7 \u062C\u0645\u0644",
  "keyFindings": [
    "\u0645\u0624\u0634\u0631 \u0631\u0626\u064A\u0633\u064A \u0645\u062E\u062A\u0635\u0631 \u0645\u0631\u062A\u0628\u0637 \u0628\u0631\u0642\u0645 \u0645\u0646 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
    "\u0645\u0624\u0634\u0631 \u0631\u0626\u064A\u0633\u064A \u0645\u062E\u062A\u0635\u0631 \u0622\u062E\u0631"
  ],
  "sections": [
    {
      "title": "\u062A\u0634\u062E\u064A\u0635 \u0627\u0644\u0623\u062F\u0627\u0621",
      "priority": "\u0639\u0627\u0644\u064A\u0629 | \u0645\u062A\u0648\u0633\u0637\u0629 | \u0645\u0646\u062E\u0641\u0636\u0629",
      "timeframe": "\u0627\u0644\u062D\u0635\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629 / \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639 / \u0645\u062A\u0627\u0628\u0639\u0629 \u0644\u0627\u062D\u0642\u0629",
      "evidence": ["\u062F\u0644\u064A\u0644 \u0631\u0642\u0645\u064A \u0645\u0646 \u0646\u062A\u0627\u0626\u062C \u0627\u0644\u062A\u0642\u0631\u064A\u0631"],
      "actions": ["\u0625\u062C\u0631\u0627\u0621 \u062A\u062F\u0631\u064A\u0633\u064A \u0648\u0627\u0636\u062D \u0648\u0642\u0627\u0628\u0644 \u0644\u0644\u062A\u0646\u0641\u064A\u0630"],
      "successIndicators": ["\u0645\u0624\u0634\u0631 \u0642\u064A\u0627\u0633 \u0648\u0627\u0636\u062D \u0644\u0645\u0639\u0631\u0641\u0629 \u0646\u062C\u0627\u062D \u0627\u0644\u062A\u062F\u062E\u0644"],
      "points": ["\u0645\u0644\u062E\u0635 \u0645\u062E\u062A\u0635\u0631 \u0639\u0646\u062F \u0627\u0644\u062D\u0627\u062C\u0629"]
    }
  ]
}

\u0642\u0633\u0651\u0645 \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0625\u0644\u0649 6 \u0623\u0648 7 \u0623\u0642\u0633\u0627\u0645 \u0648\u0627\u0636\u062D\u0629 \u0641\u0642\u0637 \u062D\u062A\u0649 \u0644\u0627 \u064A\u0635\u0628\u062D \u0645\u0632\u062F\u062D\u0645\u0627\u064B. \u0627\u062C\u0639\u0644 \u0643\u0644 \u0642\u0633\u0645 \u0628\u0647\u0630\u0647 \u0627\u0644\u0647\u0648\u064A\u0629:
1) \u062A\u0634\u062E\u064A\u0635 \u0627\u0644\u0623\u062F\u0627\u0621 \u0648\u0627\u0644\u0641\u062C\u0648\u0627\u062A
2) \u0623\u0648\u0644\u0648\u064A\u0627\u062A \u0627\u0644\u062A\u062F\u062E\u0644 \u0627\u0644\u0639\u0627\u062C\u0644
3) \u062E\u0637\u0629 \u0627\u0644\u062D\u0635\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629
4) \u062A\u0641\u0631\u064A\u062F \u0627\u0644\u062F\u0639\u0645 \u062D\u0633\u0628 \u0634\u0631\u0627\u0626\u062D \u0627\u0644\u0645\u062A\u0639\u0644\u0645\u064A\u0646
5) \u0623\u0646\u0634\u0637\u0629 \u0648\u0623\u0633\u0626\u0644\u0629 \u0645\u0642\u062A\u0631\u062D\u0629
6) \u0625\u062B\u0631\u0627\u0621 \u0644\u0644\u0645\u062A\u0639\u0644\u0645\u064A\u0646 \u0627\u0644\u0645\u062A\u0642\u062F\u0645\u064A\u0646
7) \u0645\u062A\u0627\u0628\u0639\u0629 \u0648\u0642\u064A\u0627\u0633 \u0623\u062B\u0631 \u0627\u0644\u062A\u062F\u062E\u0644

\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0642\u0631\u064A\u0631:
${JSON.stringify(input, null, 2)}
`;
}
async function repairRecommendationJson(apiKey, brokenText) {
  try {
    const data = await generateGeminiContent(
      apiKey,
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "\u062D\u0648\u0651\u0644 \u0627\u0644\u0646\u0635 \u0627\u0644\u062A\u0627\u0644\u064A \u0625\u0644\u0649 JSON \u0635\u0627\u0644\u062D \u0645\u0637\u0627\u0628\u0642 \u0644\u0644\u0645\u062E\u0637\u0637 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0641\u0642\u0637. \u0644\u0627 \u062A\u0636\u0641 Markdown \u0648\u0644\u0627 \u0634\u0631\u062D\u0627\u064B. \u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0646\u0635 \u0646\u0627\u0642\u0635\u0627\u064B \u0641\u0623\u0643\u0645\u0644\u0647 \u0628\u0623\u0642\u0635\u0631 \u0635\u064A\u0627\u063A\u0629 \u0645\u0647\u0646\u064A\u0629 \u0645\u0645\u0643\u0646\u0629.\n\n" + extractJsonCandidate(brokenText).slice(0, 12e3)
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: RECOMMENDATION_RESPONSE_SCHEMA
        }
      },
      {
        models: RECOMMENDATION_MODELS,
        maxAttemptsPerModel: 1,
        initialDelayMs: 800,
        maxDelayMs: 3e3
      }
    );
    const repairedText = extractText(data);
    return repairedText ? parseJsonObject(repairedText) : null;
  } catch {
    return null;
  }
}
async function generateChallengeRecommendationReport(apiKey, opts) {
  const input = buildRecommendationInput(opts);
  const data = await generateGeminiContent(
    apiKey,
    {
      contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: RECOMMENDATION_RESPONSE_SCHEMA
      }
    },
    {
      models: RECOMMENDATION_MODELS,
      maxAttemptsPerModel: 2,
      initialDelayMs: 1200,
      maxDelayMs: 8e3
    }
  );
  const text = extractText(data);
  if (!text) {
    throw new Error("\u0644\u0645 \u064A\u0631\u062C\u0639 Gemini \u0646\u0635 \u062A\u0648\u0635\u064A\u0627\u062A \u0635\u0627\u0644\u062D\u0627\u064B.");
  }
  const parsed = parseJsonObject(text) || await repairRecommendationJson(apiKey, text);
  if (!parsed) {
    const finishReason = data.candidates?.[0]?.finishReason;
    throw new Error(
      finishReason ? `\u0631\u062C\u0639 Gemini \u062A\u0648\u0635\u064A\u0627\u062A \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629 (${finishReason}).` : "\u0631\u062C\u0639 Gemini \u062A\u0648\u0635\u064A\u0627\u062A JSON \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629."
    );
  }
  return sanitizeRecommendationReport(parsed);
}

// server/challengeReportPdfHandler.ts
var MAX_REPORT_BODY_BYTES = 10 * 1024 * 1024;
var LOCAL_PUPPETEER_CACHE = import_node_path.default.resolve(process.cwd(), ".cache/puppeteer");
var CHROME_EXECUTABLE_NAMES = /* @__PURE__ */ new Set([
  "Google Chrome for Testing",
  "Google Chrome",
  "Chromium",
  "chrome",
  "chromium",
  "chrome.exe"
]);
function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV
  );
}
async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > MAX_REPORT_BODY_BYTES) {
      throw new Error("\u062D\u062C\u0645 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D.");
    }
    chunks.push(buffer);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : {};
}
function findChromeExecutableInDirectory(directory, depth = 0) {
  if (depth > 8 || !(0, import_node_fs.existsSync)(directory)) return void 0;
  try {
    const entries = (0, import_node_fs.readdirSync)(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = import_node_path.default.join(directory, entry.name);
      if (entry.isFile() && CHROME_EXECUTABLE_NAMES.has(entry.name)) {
        return fullPath;
      }
      if (entry.isDirectory()) {
        const found = findChromeExecutableInDirectory(fullPath, depth + 1);
        if (found) return found;
      }
    }
  } catch {
    return void 0;
  }
  return void 0;
}
function resolveLocalChromeExecutablePath(puppeteerExecutablePath) {
  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (configuredPath && (0, import_node_fs.existsSync)(configuredPath)) return configuredPath;
  if (puppeteerExecutablePath && (0, import_node_fs.existsSync)(puppeteerExecutablePath)) {
    return puppeteerExecutablePath;
  }
  const systemCandidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  ];
  const systemPath = systemCandidates.find((candidate) => (0, import_node_fs.existsSync)(candidate));
  if (systemPath) return systemPath;
  return findChromeExecutableInDirectory(LOCAL_PUPPETEER_CACHE);
}
async function launchReportBrowser() {
  if (isServerlessRuntime()) {
    const [chromium, puppeteer2] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core")
    ]);
    chromium.default.setGraphicsMode = false;
    const viewport = {
      width: 1240,
      height: 1754,
      deviceScaleFactor: 1
    };
    return puppeteer2.default.launch({
      args: puppeteer2.default.defaultArgs({ args: chromium.default.args, headless: "shell" }),
      defaultViewport: viewport,
      executablePath: await chromium.default.executablePath(),
      headless: "shell"
    });
  }
  const puppeteer = await import("puppeteer");
  const executablePath = resolveLocalChromeExecutablePath(puppeteer.default.executablePath());
  return puppeteer.default.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });
}
async function renderChallengeReportPdf(payload) {
  const browser = await launchReportBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
    await page.setContent(buildChallengeReportHtml(payload), {
      waitUntil: "domcontentloaded",
      timeout: 45e3
    });
    await page.evaluate(() => document.fonts.ready).catch(() => void 0);
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true
    });
  } finally {
    await browser.close();
  }
}
function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
async function enrichReportWithAiRecommendations(payload, geminiApiKey) {
  if (!isPlainObject(payload) || payload.recommendationReport) {
    return payload;
  }
  if (!geminiApiKey) {
    return {
      ...payload,
      recommendationReport: buildFallbackRecommendationReport(payload)
    };
  }
  try {
    const recommendationReport = await generateChallengeRecommendationReport(geminiApiKey, payload);
    return {
      ...payload,
      recommendationReport
    };
  } catch (error) {
    console.warn(
      "Gemini recommendation report generation failed; using fallback recommendations.",
      error instanceof Error ? error.message : String(error)
    );
    return {
      ...payload,
      recommendationReport: buildFallbackRecommendationReport(payload)
    };
  }
}
async function handleChallengeReportPdfRequest(req, res, geminiApiKey) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Method Not Allowed");
    return;
  }
  try {
    const payload = await readJsonBody(req);
    const enrichedPayload = await enrichReportWithAiRecommendations(payload, geminiApiKey);
    const pdf = await renderChallengeReportPdf(enrichedPayload);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="challenge-report.pdf"');
    res.end(Buffer.from(pdf));
  } catch (error) {
    console.error("Failed to render challenge report PDF:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(error instanceof Error ? error.message : "\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u0641 PDF \u0644\u0644\u062A\u0642\u0631\u064A\u0631.");
  }
}

// scripts/challenge-report-pdf-entry.ts
var config = {
  api: {
    bodyParser: false
  },
  maxDuration: 60
};
async function handler(req, res) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    await handleChallengeReportPdfRequest(req, res, geminiApiKey);
  } catch (error) {
    console.error("challenge-report-pdf handler failed:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(error instanceof Error ? error.message : "\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u0641 PDF \u0644\u0644\u062A\u0642\u0631\u064A\u0631.");
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  config
});
//# sourceMappingURL=challenge-report-pdf.js.map
