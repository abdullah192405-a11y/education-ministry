import type { WahjProgramReportPayload } from "@/lib/wahjReadingReportData";
import {
    buildUrlReportFontFaces,
    escapeHtml,
    getReportFontBaseUrl,
    renderAiAnalysisSection,
    renderAnalysisGrid,
    renderBarChart,
    renderKeyFindings,
    renderMetaPills,
    renderMetricGrid,
    renderReportShell,
    renderReportStyles,
} from "@/lib/wahjReadingReportHtmlShared";

function readerPathArabic(path: string): string {
    if (path === "eager") return "القارئ النهم";
    if (path === "persistent") return "القارئ المثابر";
    return "القارئ المنطلق";
}

function readingStyleArabic(path: string): string {
    if (path === "engaged") return "المشتبك والمدوّن";
    if (path === "organizer") return "المنظم والحافظ";
    return "القارئ الصامت";
}

function renderParticipantsTable(payload: WahjProgramReportPayload): string {
    if (!payload.participants.length) {
        return `<p>لا يوجد مشاركون بعد.</p>`;
    }

    return `
        <section class="section">
            <h2>سجل المشاركين والترتيب</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>المشترك</th>
                        <th>الصفحات</th>
                        <th>الاقتباسات</th>
                        <th>الإنجاز</th>
                        <th>المحاولات</th>
                        <th>الأيام</th>
                        <th>نمط القراءة</th>
                        <th>المستوى</th>
                    </tr>
                </thead>
                <tbody>
                    ${payload.participants
                        .map(
                            (p) => `
                                <tr>
                                    <td>${p.rank}</td>
                                    <td>${escapeHtml(p.name)}</td>
                                    <td>${p.totalPages}</td>
                                    <td>${p.quotesCount}</td>
                                    <td>${p.completionPercent}%</td>
                                    <td>${p.attemptCount}</td>
                                    <td>${p.daysCount}</td>
                                    <td>${readingStyleArabic(p.readingStylePath)}</td>
                                    <td>${readerPathArabic(p.readerPath)}</td>
                                </tr>
                            `,
                        )
                        .join("")}
                </tbody>
            </table>
        </section>
    `;
}

function renderSegmentCharts(payload: WahjProgramReportPayload): string {
    const { segments } = payload;
    const readerChart = renderBarChart(
        "توزيع مستويات القراءة",
        [
            { label: "القارئ النهم", value: segments.eager, color: "#7c3aed" },
            { label: "القارئ المثابر", value: segments.persistent, color: "#2563eb" },
            { label: "القارئ المنطلق", value: segments.beginning, color: "#f59e0b" },
        ],
        " مشارك",
    );
    const styleChart = renderBarChart(
        "توزيع أنماط القراءة",
        [
            { label: "المشتبك والمدوّن", value: segments.engaged, color: "#16a34a" },
            { label: "المنظم والحافظ", value: segments.organizer, color: "#0f766e" },
            { label: "القارئ الصامت", value: segments.silent, color: "#64748b" },
        ],
        " مشارك",
    );
    const communityChart = renderBarChart(
        "المقارنة بالمجتمع",
        [
            { label: "نخبة الصدارة", value: segments.elite, color: "#dc2626" },
            { label: "المتميزون", value: segments.distinguished, color: "#8b5cf6" },
            { label: "شركاء المجتمع", value: segments.partner, color: "#94a3b8" },
        ],
        " مشارك",
    );
    const weeklyChart = payload.weeklyTrend.length
        ? renderBarChart(
            "النشاط الأسبوعي للبرنامج",
            payload.weeklyTrend.map((w) => ({
                label: w.label,
                value: w.pages,
                color: "#7c3aed",
            })),
            " صفحة",
            `${payload.weeklyTrend.reduce((s, w) => s + w.attempts, 0)} محاولة`,
        )
        : "";

    return `
        <section class="section page-break-avoid">
            <h2>الرسوم البيانية والمؤشرات</h2>
            <div class="charts-grid">
                ${readerChart}
                ${styleChart}
                ${communityChart}
                ${weeklyChart}
            </div>
        </section>
    `;
}

function renderTopPerformers(payload: WahjProgramReportPayload): string {
    const top = payload.participants.slice(0, 5);
    if (!top.length) return "";

    return `
        <section class="recommendation-summary page-break-avoid">
            <div class="recommendation-kicker">أبرز المنجزات</div>
            <h3>نخبة القرّاء هذا الموسم</h3>
            ${top
                .map(
                    (p, i) =>
                        `<p><strong>#${i + 1} ${escapeHtml(p.name)}</strong> — ${p.totalPages} صفحة، ${p.quotesCount} اقتباس، إنجاز ${p.completionPercent}%</p>`,
                )
                .join("")}
        </section>
    `;
}

export function buildWahjProgramReportHtml(payload: WahjProgramReportPayload): string {
    const styles = renderReportStyles(buildUrlReportFontFaces(getReportFontBaseUrl()));

    const metrics: Array<[string, string | number]> = [
        ["المشاركون", payload.participantCount],
        ["إجمالي الصفحات", payload.totalPages],
        ["إجمالي الاقتباسات", payload.totalQuotes],
        ["إجمالي المحاولات", payload.totalAttempts],
        ["متوسط الإنجاز", `${payload.avgCompletion}%`],
        ["ساعات التركيز", payload.totalFocusHours],
    ];

    const analysisRows: Array<[string, string | number]> = [
        ["متوسط الصفحات", payload.avgPages],
        ["الوسيط (صفحات)", payload.medianPages],
        ["أعلى رصيد صفحات", payload.maxPages],
        ["متوسط الاقتباسات", payload.avgQuotes],
        ["متوسط أيام الرحلة", payload.avgDays],
        ["دروس بها نشاط", payload.lessonsWithActivity],
        ["القارئ النهم", payload.segments.eager],
        ["المشتبك والمدوّن", payload.segments.engaged],
        ["نخبة الصدارة", payload.segments.elite],
        ["فجوة الصفحات (أعلى/أدنى)", payload.pagesGapTopBottom],
        ["نسبة النشاط المستمر", `${payload.activeRatePercent}%`],
    ];

    const body = `
        <header class="header">
            <p class="eyebrow">تقرير أداء البرنامج القرائي — شامل</p>
            <h1>تقرير قراء وهج — البرنامج الكامل</h1>
            <div class="meta">${renderMetaPills([
                ["البرنامج", payload.programName],
                ["الصف", payload.className],
                ["المادة", payload.subjectName],
                ["تاريخ الإنشاء", payload.generatedAt],
            ])}</div>
            <div class="note">تقرير تحليلي شامل لجميع مشاركي برنامج ${escapeHtml(payload.programName)} في مادة ${escapeHtml(payload.subjectName || "البرنامج")}</div>
        </header>

        ${renderMetricGrid(metrics)}
        ${renderKeyFindings(payload.keyFindings)}
        ${renderTopPerformers(payload)}
        ${renderAnalysisGrid(analysisRows, "مؤشرات البرنامج والتحليل")}
        ${renderSegmentCharts(payload)}
        ${renderAiAnalysisSection(payload.aiReport)}
        ${renderParticipantsTable(payload)}

        <footer class="footer">
            منصة Lab for AI — تقرير قراء وهج الشامل<br />
            تم إنشاء التقرير في ${escapeHtml(payload.generatedAt)}
        </footer>
    `;

    return renderReportShell(`تقرير قراء وهج — البرنامج الكامل`, styles, body);
}
