import { generateGeminiContent } from "./geminiClient";
import type { WahjProgramReportPayload, WahjReadingReportPayload } from "./wahjReadingReportData";

export type WahjAiReportSection = {
    title: string;
    priority?: string;
    timeframe?: string;
    evidence?: string[];
    actions?: string[];
    successIndicators?: string[];
    points: string[];
};

export type WahjAiReport = {
    headline: string;
    summary: string;
    keyFindings?: string[];
    sections: WahjAiReportSection[];
};

const MODELS = ["gemini-2.5-flash"];

const RESPONSE_SCHEMA = {
    type: "OBJECT",
    properties: {
        headline: { type: "STRING" },
        summary: { type: "STRING" },
        keyFindings: { type: "ARRAY", items: { type: "STRING" } },
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
                    points: { type: "ARRAY", items: { type: "STRING" } },
                },
                required: ["title", "actions"],
            },
        },
    },
    required: ["headline", "summary", "sections"],
};

function stripHtml(value: unknown): string {
    return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function clamp(value: unknown, max: number): string {
    return stripHtml(value).slice(0, max);
}

function sanitizeList(value: unknown, maxItems: number, maxLen: number): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => clamp(item, maxLen))
        .filter(Boolean)
        .slice(0, maxItems);
}

function sanitizeReport(raw: unknown): WahjAiReport {
    const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const sections = Array.isArray(record.sections)
        ? record.sections.map((section) => {
            const row = section && typeof section === "object" ? (section as Record<string, unknown>) : {};
            const actions = sanitizeList(row.actions, 8, 280);
            const points = sanitizeList(row.points, 8, 280);
            return {
                title: clamp(row.title, 120) || "تحليل",
                priority: clamp(row.priority, 40) || undefined,
                timeframe: clamp(row.timeframe, 60) || undefined,
                evidence: sanitizeList(row.evidence, 6, 220),
                actions: actions.length ? actions : points,
                successIndicators: sanitizeList(row.successIndicators, 5, 220),
                points: points.length ? points : actions,
            };
        })
        : [];

    return {
        headline: clamp(record.headline, 120) || "تحليل ذكي لرحلة القراءة",
        summary: clamp(record.summary, 1400) || "تم إنشاء تحليل مبني على بيانات البرنامج المتاحة.",
        keyFindings: sanitizeList(record.keyFindings, 8, 220),
        sections: sections.filter((s) => s.actions.length > 0 || s.points.length > 0),
    };
}

function extractText(data: unknown): string {
    const response = data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return response.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
}

async function callGemini(apiKey: string, prompt: string): Promise<WahjAiReport> {
    const data = await generateGeminiContent(
        apiKey,
        {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.45,
                topP: 0.9,
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
                responseSchema: RESPONSE_SCHEMA,
            },
        },
        { models: MODELS, maxAttemptsPerModel: 2, initialDelayMs: 1200, maxDelayMs: 8000 },
    );

    const text = extractText(data);
    if (!text) throw new Error("empty ai response");
    const parsed = JSON.parse(text);
    return sanitizeReport(parsed);
}

export function buildFallbackIndividualAiReport(payload: WahjReadingReportPayload): WahjAiReport {
    const { analytics } = payload;
    const momentum =
        analytics.readingMomentum > 0
            ? `زخم إيجابي: آخر محاولاتك أعلى بمعدل ${analytics.readingMomentum} صفحة عن البداية`
            : analytics.readingMomentum < 0
                ? `يُنصح باستعادة الإيقاع؛ آخر المحاولات أقل بمعدل ${Math.abs(analytics.readingMomentum)} صفحة`
                : "إيقاع قراءة ثابت عبر المحاولات";

    return {
        headline: `تحليل ذكي لرحلة ${payload.participantName}`,
        summary:
            `يُظهر التحليل أن ${payload.participantName} أنجز ${payload.totalPages} صفحة بنسبة إنجاز ${payload.completionPercent}% ` +
            `وترتيب #${analytics.rank} من ${analytics.totalParticipants}. معدل ${analytics.avgPagesPerDay} صفحة يومياً ` +
            `ومعدل ${analytics.avgQuotesPerAttempt} اقتباس لكل محاولة يعكس نمطاً قرائياً ${analytics.quoteEngagementLabel}.`,
        keyFindings: [
            ...analytics.keyFindings.slice(0, 4),
            momentum,
            `مؤشر التفاعل: ${analytics.engagementIndex}/100`,
        ].slice(0, 6),
        sections: [
            {
                title: "تشخيص الأداء القرائي",
                priority: "عالية",
                timeframe: "الآن",
                evidence: [
                    `${payload.totalPages} صفحة مقروءة عبر ${payload.attemptCount} محاولة`,
                    `الفرق عن متوسط البرنامج: ${analytics.pagesDiffFromAvg >= 0 ? "+" : ""}${analytics.pagesDiffFromAvg} صفحة`,
                ],
                actions: [
                    "حافظ على معدل القراءة اليومي الحالي مع تثبيت موعد قراءة ثابت.",
                    "دوّن فائدة واحدة على الأقل بعد كل جلسة قراءة لتعزيز التفاعل المعرفي.",
                ],
                successIndicators: ["زيادة عدد الاقتباسات في المحاولة القادمة", "الحفاظ على نسبة الإنجاز أو رفعها"],
                points: [],
            },
            {
                title: "خطة التطوير القادمة",
                priority: "متوسطة",
                timeframe: "الأسبوع القادم",
                evidence: [`نمط القراءة: ${analytics.readingStyleLabel}`, `مستوى الإنجاز: ${analytics.readerLevelLabel}`],
                actions: [
                    "اختر نصاً أطول قليلاً في الدرس القادم لرفع رصيد الصفحات بثبات.",
                    "شارك اقتباساً أو فائدة في ساحة النقاش لدعم نمطك التفاعلي.",
                    "راجع الدروس السابقة التي لم تُكتمل بعد لرفع عدد الدروس المشارَك فيها.",
                ],
                successIndicators: ["رفع متوسط الصفحات لكل محاولة", "تحسن الترتيب داخل المجتمع"],
                points: [],
            },
            {
                title: "توصيات المشاركة المجتمعية",
                priority: "متابعة",
                timeframe: "هذا الموسم",
                evidence: [`تجاوز ${analytics.beatPercent}% من المشاركين`, `كود المشاركة: ${payload.shareCode}`],
                actions: [
                    "استخدم كود المشاركة لدعوة قارئ جديد والمساهمة في نمو المجتمع.",
                    "شارك لقطة من تقريرك لتحفيز الآخرين على المواظبة.",
                ],
                successIndicators: ["مشاركة الكود مع قارئ جديد", "استمرار الحضور في الدروس القادمة"],
                points: [],
            },
        ],
    };
}

export function buildFallbackProgramAiReport(payload: WahjProgramReportPayload): WahjAiReport {
    const top = payload.participants[0];
    return {
        headline: "تحليل ذكي شامل لبرنامج قراء وهج",
        summary:
            `يشارك ${payload.participantCount} قارئاً في البرنامج بإجمالي ${payload.totalPages} صفحة و${payload.totalQuotes} اقتباس ` +
            `عبر ${payload.totalAttempts} محاولة. متوسط الإنجاز ${payload.avgCompletion}% مع ${payload.segments.eager} مشارك في مسار القارئ النهم.`,
        keyFindings: payload.keyFindings.slice(0, 6),
        sections: [
            {
                title: "تشخيص المجتمع القرائي",
                priority: "عالية",
                timeframe: "الآن",
                evidence: [
                    `متوسط الصفحات: ${payload.avgPages} | الوسيط: ${payload.medianPages}`,
                    `${payload.segments.engaged} مشارك بنمط المدوّن والمشتبك`,
                ],
                actions: [
                    "ركّز على دعم المشاركين في مسار القارئ المنطلق برسائل تحفيزية أسبوعية.",
                    "خصص نشاطاً جماعياً لمشاركة أفضل الاقتباسات أسبوعياً.",
                ],
                successIndicators: ["ارتفاع متوسط الصفحات الشامل", "زيادة عدد الاقتباسات"],
                points: [],
            },
            {
                title: "أولويات التدخل",
                priority: "عالية",
                timeframe: "هذا الأسبوع",
                evidence: [
                    `${payload.segments.beginning} مشاركاً تحت 60% إنجاز`,
                    top ? `المتصدر: ${top.name} بـ ${top.totalPages} صفحة` : "لا يوجد متصدر بعد",
                ],
                actions: [
                    "تواصل مع المشاركين ذوي المحاولات القليلة لتشجيعهم على العودة.",
                    "أطلق تحدي قراءة قصير لمدة 7 أيام لرفع معدل النشاط الأسبوعي.",
                ],
                successIndicators: ["انخفاض فجوة الصفحات بين الأعلى والأدنى", "زيادة المحاولات الأسبوعية"],
                points: [],
            },
            {
                title: "خطة الموسم القادم",
                priority: "متوسطة",
                timeframe: "الموسم القادم",
                evidence: [`${payload.lessonsWithActivity} درساً بها نشاط فعلي`],
                actions: [
                    "صمّم دروساً بأسئلة نصية واضحة لقياس الصفحات والاقتباسات.",
                    "كافئ أفضل 10% بشارات أو أكواد مشاركة حصرية.",
                ],
                successIndicators: ["زيادة عدد المشاركين النشطين", "رفع متوسط الإنجاز فوق 70%"],
                points: [],
            },
        ],
    };
}

export async function generateWahjIndividualAiReport(
    apiKey: string,
    payload: WahjReadingReportPayload,
): Promise<WahjAiReport> {
    const prompt = `
أنت مستشار قراءة وخبير تحليل بيانات تعليمية. أنشئ تقرير تحليل ذكي بالعربية لمشترك واحد في برنامج قراءة.

المطلوب:
- تحليل عميق لرحلة القراءة: الصفحات، الاقتباسات، الإيقاع، الترتيب، نمط القراءة.
- 5 إلى 7 أقسام مع evidence وactions وsuccessIndicators.
- اربط كل توصية برقم من البيانات.
- أعد JSON فقط.

عناوين الأقسام المقترحة:
1) تشخيص الأداء القرائي
2) نقاط القوة والفرص
3) مخاطر التراجع أو الفجوات
4) خطة التطوير للأسبوع القادم
5) تعزيز التفاعل والاقتباسات
6) توصيات المشاركة المجتمعية

البيانات:
${JSON.stringify({ payload, analytics: payload.analytics }, null, 2)}
`;
    try {
        return await callGemini(apiKey, prompt);
    } catch {
        return buildFallbackIndividualAiReport(payload);
    }
}

export async function generateWahjProgramAiReport(
    apiKey: string,
    payload: WahjProgramReportPayload,
): Promise<WahjAiReport> {
    const prompt = `
أنت مستشار قراءة وخبير تحليل بيانات. أنشئ تقرير تحليل ذكي شامل بالعربية لبرنامج قراءة يضم عدة مشاركين.

المطلوب:
- تحليل المجتمع القرائي: التوزيعات، المتصدرون، الفجوات، النشاط الأسبوعي.
- 6 إلى 8 أقسام مع evidence وactions وsuccessIndicators للمعلم/المنظم.
- اربط التوصيات بالأرقام.
- أعد JSON فقط.

عناوين الأقسام:
1) تشخيص المجتمع القرائي
2) أولويات التدخل العاجلة
3) شرائح المشاركين وحاجاتهم
4) تحليل النشاط والزخم
5) فرص رفع الاقتباسات والتفاعل
6) خطة الموسم القادم
7) مؤشرات متابعة الأثر

البيانات:
${JSON.stringify(payload, null, 2)}
`;
    try {
        return await callGemini(apiKey, prompt);
    } catch {
        return buildFallbackProgramAiReport(payload);
    }
}
