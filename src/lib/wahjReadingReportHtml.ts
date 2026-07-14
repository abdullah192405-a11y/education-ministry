import type { WahjReadingReportPayload } from "@/lib/wahjReadingReportData";
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
    renderNarrativeSection,
    renderReportShell,
    renderReportStyles,
} from "@/lib/wahjReadingReportHtmlShared";

function readerContent(payload: WahjReadingReportPayload): { headline: string; paragraphs: string[] } {
    const pages = `<strong>${escapeHtml(payload.totalPages)}</strong>`;

    if (payload.readerPath === "eager") {
        return {
            headline: "منجز استثنائي وعظيم! 🚀",
            paragraphs: [
                `إجمالي الصفحات المقروءة وصل إلى: ${pages} صفحة`,
                "رقم ملهم، يثبت مدى الاتساع والعمق المعرفي الذي تشكّل طوال الرحلة",
            ],
        };
    }
    if (payload.readerPath === "persistent") {
        return {
            headline: "مشوار مميز وإنجاز يلوح في الأفق! 🎯",
            paragraphs: [
                `إجمالي الصفحات المقروءة وصل إلى ${pages} صفحة`,
                "خطوات ثابتة وثمار يانعة تعكس قوة الشغف بالتعلم والتطوير الذاتي المستمر.",
            ],
        };
    }
    return {
        headline: "أول الغيث قطرة.. 💧",
        paragraphs: [`رصيد الصفحات المقروءة وصل إلى: ${pages}`],
    };
}

function readingStyleContent(payload: WahjReadingReportPayload): { headline: string; paragraphs: string[] } {
    if (payload.readingStylePath === "engaged") {
        return {
            headline: "المشتبك مع النص! ✏️",
            paragraphs: [
                "السطور العظيمة ما تمر مرور الكرام..",
                "قرابة 51% من القراء في العالم العربي يشاركونك نفس السلوك، وما يكتفون بالقراءة الصامتة، بل يحاورون النص بالتدوين وإبراز النقاط المهمة.",
            ],
        };
    }
    if (payload.readingStylePath === "organizer") {
        return {
            headline: "مقتفي أثر النور! 💡",
            paragraphs: [
                "حفظ مواضع الكنوز الفكرية هو فن بحد ذاته..",
                "52% من أصدقاء المعرفة يفضلون ترك علاماتهم خلفهم عبر استخدام المؤشرات المرجعية أو طي زوايا الصفحات للعودة إليها لاحقاً.",
            ],
        };
    }
    return {
        headline: "بحثاً عن خلوة معرفية هادئة.. 🤫",
        paragraphs: [
            "خلف كل كتاب يُفتح، ثمة سعي دائم نحو السكينة..",
            "74% من القراء يفضلون دائماً الانعزال التام والقراءة بصمت في بيئة هادئة.",
        ],
    };
}

function communityContent(payload: WahjReadingReportPayload): { headline: string; paragraphs: string[] } {
    const pct = `<strong>${escapeHtml(payload.communityPercentLabel)}</strong>`;
    const { analytics } = payload;

    if (payload.communityPath === "elite") {
        return {
            headline: "مكانك الصدارة! 🏆",
            paragraphs: [
                `الحضور المعرفي والتفاعل المستمر هالموسم لفت الأنظار، ومعدل إنجازك وتدوينك للأثر حطّك ضمن أعلى ${pct} من أصدقاء مجتمعنا القرائي`,
                `ترتيبك الحالي: <strong>#${analytics.rank}</strong> من <strong>${analytics.totalParticipants}</strong> مشارك`,
            ],
        };
    }
    if (payload.communityPath === "distinguished") {
        return {
            headline: "بين نخبة المتميزين! ✨",
            paragraphs: [
                `الخطى الثابتة والمواظبة طوال الأسابيع الماضية خلت حضورك لافتاً ومؤثراً، ومعدل قراءتك وتفاعلك هالموسم تجاوز ${pct} من المشاركين معنا`,
                `ترتيبك الحالي: <strong>#${analytics.rank}</strong> من <strong>${analytics.totalParticipants}</strong> مشارك`,
            ],
        };
    }
    return {
        headline: "شريك المجتمع الفاعل! 🤝",
        paragraphs: [
            `الانضمام لهذه الرحلة الفكرية والبدء في تدوين فوائدك هو الانتصار الحقيقي، وكنت ضمن ${pct} من المشاركين هذا الموسم`,
            `ترتيبك الحالي: <strong>#${analytics.rank}</strong> من <strong>${analytics.totalParticipants}</strong> مشارك`,
        ],
    };
}

function renderWelcomeSummary(payload: WahjReadingReportPayload): string {
    const name = escapeHtml(payload.participantName);
    const program = escapeHtml(payload.programName);
    const { analytics } = payload;

    return `
        <section class="recommendation-summary page-break-avoid">
            <div class="recommendation-kicker">ملخص الرحلة المعرفية</div>
            <h3>أهلاً بصديق القراءة ${name} 📖</h3>
            <p>مستعد تعرف ملخص رحلتك المعرفية معنا في برنامج <strong>${program}</strong>؟</p>
            <p>مشوارنا المعرفي سوا صار له <strong>${escapeHtml(payload.daysCount)}</strong> يوماً ملهماً خطيناها خطوة بخطوة، وممتنين لكل دقيقة قضيتها في رحاب برامجنا.</p>
            <p>أنجزت <strong>${escapeHtml(payload.totalPages)}</strong> صفحة عبر <strong>${escapeHtml(payload.attemptCount)}</strong> محاولة في <strong>${escapeHtml(analytics.lessonsEngaged)}</strong> درساً — بمعدل <strong>${escapeHtml(analytics.avgPagesPerDay)}</strong> صفحة يومياً.</p>
        </section>
    `;
}

function renderReferenceIdSection(payload: WahjReadingReportPayload): string {
    if (!payload.referenceId) return "";

    const referenceId = escapeHtml(payload.referenceId);
    return `
        <article class="recommendation-section page-break-avoid share-section">
            <div class="recommendation-section-head">
                <span class="recommendation-index">🔖</span>
                <div>
                    <h4>رقم مشاركتك في قراء وهج</h4>
                    <div class="section-kicker">احتفظ به للمشاركة القادمة</div>
                </div>
            </div>
            <div class="recommendation-block narrative-block">
                <p>للمشاركة مرة أخرى، استخدم هذا الرقم حتى تُربط محاولاتك معاً:</p>
                <div class="code-box">${referenceId}</div>
            </div>
        </article>
    `;
}

function renderShareCodeSection(payload: WahjReadingReportPayload): string {
    const discount = escapeHtml(payload.discountValue);
    const shareCode = escapeHtml(payload.shareCode);

    return `
        <article class="recommendation-section page-break-avoid share-section">
            <div class="recommendation-section-head">
                <span class="recommendation-index">🎁</span>
                <div>
                    <h4>كود للمشاركة</h4>
                    <div class="section-kicker">قبل لا تروح..</div>
                </div>
            </div>
            <div class="recommendation-block narrative-block">
                <p>احتفاءً بمنجزك طوال الرحلة، وتقديراً لكل صفحة وفائدة عشتها معنا، حابين نهديك هالكود الحصري مخصص لك لتهديه شخص يعز عليك، ويمنحه <strong>${discount}</strong> وأولوية المقعد المتاح في الموسم القادم:</p>
                <div class="code-box">${shareCode}</div>
                <p>انسخ الكود، وشارك لقطة الشاشة مع الأصدقاء، وساهم في بناء بيئة تجعل القراءة عادة قريبة وممكنة في حياة من تحب.</p>
            </div>
        </article>
    `;
}

function renderAttemptCharts(payload: WahjReadingReportPayload): string {
    const trend = payload.analytics.attemptTrend;
    if (!trend.length) return "";

    const pagesChart = renderBarChart(
        "الصفحات عبر المحاولات",
        trend.map((row) => ({ label: row.label, value: row.pages, color: "#7c3aed" })),
        "",
        `${trend.length} محاولات`,
    );
    const quotesChart = renderBarChart(
        "الاقتباسات عبر المحاولات",
        trend.map((row) => ({ label: row.label, value: row.quotes, color: "#2563eb" })),
    );

    return `
        <section class="section page-break-avoid">
            <h2>تحليل المحاولات</h2>
            <div class="charts-grid">${pagesChart}${quotesChart}</div>
        </section>
    `;
}

export function buildWahjReadingReportHtml(payload: WahjReadingReportPayload): string {
    const styles = renderReportStyles(buildUrlReportFontFaces(getReportFontBaseUrl()));
    const reader = readerContent(payload);
    const style = readingStyleContent(payload);
    const community = communityContent(payload);
    const { analytics } = payload;

    const metrics: Array<[string, string | number]> = [
        ["أيام الرحلة", payload.daysCount],
        ["الصفحات المقروءة", payload.totalPages],
        ["الفوائد والاقتباسات", payload.quotesCount],
        ["نسبة الإنجاز", `${payload.completionPercent}%`],
        ["ساعات التركيز", payload.focusHours],
        ["الترتيب", `#${analytics.rank} / ${analytics.totalParticipants}`],
    ];

    const analysisRows: Array<[string, string | number]> = [
        ["متوسط الصفحات يومياً", analytics.avgPagesPerDay],
        ["متوسط الصفحات لكل محاولة", analytics.avgPagesPerAttempt],
        ["متوسط الاقتباسات لكل محاولة", analytics.avgQuotesPerAttempt],
        ["عدد الدروس المشارَك فيها", analytics.lessonsEngaged],
        ["متوسط البرنامج (صفحات)", analytics.programAvgPages],
        ["الفرق عن متوسط البرنامج", `${analytics.pagesDiffFromAvg >= 0 ? "+" : ""}${analytics.pagesDiffFromAvg}`],
        ["متوسط البرنامج (اقتباسات)", analytics.programAvgQuotes],
        ["تجاوز المشاركين", `${analytics.beatPercent}%`],
        ["مؤشر التفاعل", `${analytics.engagementIndex}/100`],
        ["زخم القراءة", analytics.readingMomentum >= 0 ? `+${analytics.readingMomentum}` : analytics.readingMomentum],
        ["ثبات الإيقاع", `${analytics.consistencyScore}% — ${analytics.consistencyLabel}`],
        ["نمط التفاعل مع النص", analytics.quoteEngagementLabel],
        ["مستوى القارئ", analytics.readerLevelLabel],
        ["نمط القراءة", analytics.readingStyleLabel],
    ];
    if (analytics.avgChallengeScore > 0) {
        analysisRows.push(["متوسط أداء التحديات", `${analytics.avgChallengeScore}%`]);
    }

    const sections = [
        renderNarrativeSection(1, "استعراض الصفحات", reader.headline, reader.paragraphs),
        renderNarrativeSection(2, "مقارنة المنجزات", "تخيل حجم الأثر؟ 🧠", [
            `هالصفحات تعادل قضاء قرابة <strong>${escapeHtml(payload.focusHours)}</strong> ساعة من الانقطاع التام عن ضجيج العالم، والعيش في مساحة من التركيز المعرفي الصافي.`,
        ]),
        renderNarrativeSection(3, "الفوائد والاقتباسات", "أثر الكلمة لا يضيع ✨", [
            "القراءة ليست مجرد عبور صفحات، القراءة الحقيقية هي فكرة تستوقف العقل، وتتحول لنور يمتد ويحرك النقاش.",
            `طوال رحلتنا المعرفية معنا شاركتمونا <strong>${escapeHtml(payload.quotesCount)}</strong> فائدة واقتباس`,
        ]),
        renderNarrativeSection(4, "نمطك القرائي", style.headline, style.paragraphs),
        renderNarrativeSection(5, "المقارنة بالمجتمع", community.headline, community.paragraphs),
        renderNarrativeSection(6, "التشويق للبرامج التالية", "جايين بشي يثلج الصدر 🌟", [
            "الرحلة المعرفية ما تنتهي عند غلاف كتاب، والأثر اللي تشكّل اليوم هو مجرد شرارة الانطلاقة.",
            "مواسمنا الجاية بالطريق، وقاعدين نجهّز مساحات تفاعلية أعمق، ومبادرات تلامس اهتماماتكم وتفتح أبواب جديدة لتجربة قراءة ميسرة وقريبة منك.",
        ]),
    ].join("");

    const body = `
        <header class="header">
            <p class="eyebrow">تقرير أداء البرنامج القرائي — فردي</p>
            <h1>تقرير قراء وهج</h1>
            <div class="meta">${renderMetaPills([
                ["المشترك", payload.participantName],
                ["البرنامج", payload.programName],
                ["الصف", payload.className],
                ["المادة", payload.subjectName],
                ["تاريخ الإنشاء", payload.generatedAt],
            ])}</div>
            <div class="note">تقرير تحليلي شخصي يجمع كل محاولات المشترك في مادة ${escapeHtml(payload.subjectName || "البرنامج")}</div>
        </header>

        ${renderMetricGrid(metrics)}
        ${renderKeyFindings(analytics.keyFindings)}
        ${renderWelcomeSummary(payload)}
        ${renderAnalysisGrid(analysisRows, "مؤشرات الأداء والتحليل")}
        ${renderAttemptCharts(payload)}
        ${renderAiAnalysisSection(payload.aiReport)}

        <section class="section page-break-avoid">
            <h2>تفاصيل الرحلة القرائية</h2>
            <div class="recommendation-grid">${sections}</div>
        </section>

        ${renderShareCodeSection(payload)}
        ${renderReferenceIdSection(payload)}

        <footer class="footer">
            منصة Lab for AI — تقرير قراء وهج الفردي<br />
            تم إنشاء التقرير في ${escapeHtml(payload.generatedAt)}
        </footer>
    `;

    return renderReportShell(`تقرير قراء وهج — ${payload.participantName}`, styles, body);
}
