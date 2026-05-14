import { generateGeminiContent } from "./geminiClient";
import type { ChallengeReportCsvOptions } from "./challengeReportDownload";

export type ChallengeRecommendationSection = {
    title: string;
    priority?: string;
    timeframe?: string;
    evidence?: string[];
    actions?: string[];
    successIndicators?: string[];
    points: string[];
};

export type ChallengeRecommendationReport = {
    headline: string;
    summary: string;
    keyFindings?: string[];
    sections: ChallengeRecommendationSection[];
};

type GeminiTextResponse = {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
};

const RECOMMENDATION_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
const RECOMMENDATION_RESPONSE_SCHEMA = {
    type: "OBJECT",
    properties: {
        headline: { type: "STRING" },
        summary: { type: "STRING" },
        keyFindings: {
            type: "ARRAY",
            items: { type: "STRING" },
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

function clampText(value: unknown, maxLength: number): string {
    return stripHtml(value).slice(0, maxLength);
}

function getParticipantName(row: any): string {
    return row?.user?.name || row?.name || row?.participant_display_name || row?.display_name || "طالب";
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

function average(values: number[]): number {
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function professionalizeFallbackSections(
    sections: ChallengeRecommendationSection[],
    evidence: string[]
): ChallengeRecommendationSection[] {
    return sections.map((section, index) => ({
        ...section,
        priority: index < 2 ? "عالية" : index < 5 ? "متوسطة" : "متابعة",
        timeframe: index < 4 ? "الحصة القادمة" : "هذا الأسبوع",
        evidence: index === 0 ? evidence : evidence.slice(0, 2),
        actions: section.points,
        successIndicators: [
            "تحسن دقة السؤال أو المهارة المستهدفة في القياس القصير التالي.",
            "انتقال عدد أكبر من الطلاب من شريحة الدعم المباشر إلى شريحة القريبين من الإتقان.",
        ],
    }));
}

function buildRecommendationInput(opts: ChallengeReportCsvOptions) {
    const results = [...(opts.results || [])]
        .sort((a, b) => getScorePercent(b) - getScorePercent(a))
        .slice(0, 80)
        .map((row) => ({
            name: clampText(getParticipantName(row), 60),
            percentage: getScorePercent(row),
            score: row?.score ?? null,
            correctAnswers: row?.correct_answers ?? row?.correctAnswers ?? null,
            wrongAnswers: row?.wrong_answers ?? row?.wrongAnswers ?? null,
            timeTakenSeconds: row?.time_taken ?? row?.timeTaken ?? null,
            participantType: row?.user?.id ? "مسجل" : "زائر",
        }));

    const questionRows = (opts.questionRows || []).slice(0, 50).map((row, index) => ({
        number: index + 1,
        question: clampText(row.questionText, 280),
        accuracy: row.accuracy,
        correctAnswers: row.correct,
        totalAnswers: row.total,
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
            note: opts.mergedSessionsNote,
        },
        analysisRows: opts.analysisRows || [],
        existingRecommendations: opts.recommendations || [],
        charts: opts.charts || {},
        participants: results,
        questions: questionRows,
    };
}

export function buildFallbackRecommendationReport(opts: ChallengeReportCsvOptions): ChallengeRecommendationReport {
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
    const lessonTitle = opts.lessonTitle || opts.topicTitle || "الدرس";
    const className = opts.className || "الصف";

    return {
        headline: `تقرير توصيات موسع لدرس ${lessonTitle}`,
        summary:
            `يعرض هذا التقرير توصيات عملية مبنية على ${participants.length} محاولة في ${className}. ` +
            `متوسط الأداء العام هو ${avgScore}%، مع ${lowParticipants.length} محاولة تحتاج إلى دعم مباشر، ` +
            `${nearMasteryParticipants.length} محاولة قريبة من الإتقان، و${highParticipants.length} محاولة متقدمة. ` +
            `تُستخدم هذه التوصيات كخطة عمل للحصة القادمة عندما يتعذر توليد تقرير Gemini الكامل أو كدعم إضافي له.`,
        keyFindings: [
            `متوسط الأداء العام: ${avgScore}%.`,
            `عدد المحاولات التي تحتاج دعماً مباشراً: ${lowParticipants.length}.`,
            weakestQuestion
                ? `أضعف سؤال في التقرير دقته ${weakestQuestion.accuracy}%.`
                : "لا توجد بيانات تفصيلية كافية للأسئلة.",
        ],
        sections: professionalizeFallbackSections([
            {
                title: "تشخيص الأداء العام",
                points: [
                    `ابدأ الحصة القادمة بعرض متوسط الأداء العام (${avgScore}%) للمعلم فقط، ثم اربطه بهدف تعلم واضح وقابل للقياس في نهاية الحصة.`,
                    `استخدم عدد المحاولات (${participants.length}) لتحديد مدى موثوقية الاستنتاجات؛ إذا كان العدد قليلاً فاجعل القرارات علاجية مؤقتة حتى تتوفر بيانات أكثر.`,
                    `قسّم الطلاب إلى ثلاث شرائح: دعم مباشر (${lowParticipants.length})، قريبون من الإتقان (${nearMasteryParticipants.length})، ومتقدمون (${highParticipants.length}).`,
                    weakestQuestion
                        ? `اعتبر السؤال الأضعف نقطة بدء للمراجعة: "${weakestQuestion.question}" بدقة ${weakestQuestion.accuracy}%.`
                        : "إذا لم تتوفر بيانات تفصيل الأسئلة، استخدم نقاشاً سريعاً مع الطلاب لتحديد أكثر خطوة سببت صعوبة أثناء الحل.",
                ],
            },
            {
                title: "تدخلات علاجية فورية",
                points: [
                    "خصص أول 8 إلى 10 دقائق لنشاط إعادة تدريس مصغر يشرح المفهوم الأساسي بخطوات قصيرة ومثال محلول أمام الطلاب.",
                    "اطلب من الطلاب حل سؤال مشابه للسؤال الأضعف بشكل فردي، ثم ناقش خطأً شائعاً واحداً فقط حتى لا تتشتت المراجعة.",
                    "قدّم بطاقة دعم صغيرة للطلاب الأقل من 60% تتضمن: القاعدة، مثالاً محلولاً، وسؤال تحقق سريع.",
                    "استخدم سؤال خروج في نهاية الحصة يقيس نفس الفجوة، وقارن نتيجته بنتيجة التحدي لمعرفة أثر التدخل.",
                ],
            },
            {
                title: "تفريد الدعم حسب مستوى الطلاب",
                points: [
                    "المتعلمون الأقل من 60% يحتاجون عملاً موجهاً مع المعلم أو زميل متمكن قبل تكليفهم بتمارين مستقلة.",
                    "المتعلمون بين 60% و84% يحتاجون تدريباً قصيراً على خطوة الخطأ فقط، ثم سؤالين متدرجين للتأكد من الثبات.",
                    "المتعلمون 85% فأعلى يمكن تكليفهم بسؤال إثرائي أو بدور قائد مجموعة يشرح استراتيجية الحل دون إعطاء الإجابة مباشرة.",
                    "لا تستخدم النشاط نفسه لكل الشرائح؛ اجعل الزمن، عدد الأسئلة، ومستوى التلميحات مختلفاً حسب نتيجة كل شريحة.",
                ],
            },
            {
                title: "خطة الحصة القادمة",
                points: [
                    `افتتح الحصة بسؤال تشخيصي مرتبط مباشرة بدرس ${lessonTitle}، ولا يتجاوز زمنه ثلاث دقائق.`,
                    "بعد السؤال التشخيصي، اعرض مثالاً محلولاً واحداً ثم مثالاً ناقص الخطوات ليكمله الطلاب جماعياً.",
                    "نفذ نشاط مجموعات قصير: مجموعة علاجية مع المعلم، مجموعة تدريب ذاتي، ومجموعة إثراء للطلاب المتقدمين.",
                    "اختم الحصة بقياس سريع من سؤالين: واحد يعالج أضعف مهارة، وآخر يقيس انتقال أثر التعلم إلى سياق جديد.",
                ],
            },
            {
                title: "أسئلة وأنشطة مقترحة",
                points: [
                    weakestQuestion
                        ? `حوّل السؤال الأقل دقة إلى ثلاثة أسئلة متدرجة: سؤال تذكّر، سؤال تطبيق مباشر، وسؤال تفسير سبب الإجابة.`
                        : "أنشئ ثلاثة أسئلة متدرجة حول أكثر مفهوم ظهر في الدرس: تعريف، تطبيق، وتفسير.",
                    "استخدم نشاط (اكتشف الخطأ) بعرض إجابة خاطئة قصيرة واطلب من الطلاب تحديد موضع الخطأ وتصحيحه.",
                    "اطلب من كل طالب كتابة قاعدة أو خطوة حل بلغة بسيطة، ثم تبادل الورقة مع زميل للتحقق.",
                    "للمتقدمين، أضف سؤالاً مفتوحاً يطلب إنشاء مثال جديد يحقق الشرط نفسه مع تبرير الحل.",
                ],
            },
            {
                title: "نقاط القوة وفرص الإثراء",
                points: [
                    strongQuestions.length
                        ? `استثمر الأسئلة ذات الدقة العالية (${strongQuestions.map((q) => `س${q.number}: ${q.accuracy}%`).join("، ")}) كنماذج لبناء الثقة قبل معالجة الفجوات.`
                        : "إذا لم تظهر أسئلة عالية الدقة، ابدأ بإعادة بناء المفهوم من مثال محسوس أو سياق قريب من الطلاب.",
                    "كلف الطلاب المتقدمين بشرح استراتيجية واحدة فقط لزملائهم، مع منعهم من إعطاء الإجابة النهائية مباشرة.",
                    "قدّم نشاط تحدي إضافي قصير للمتقدمين يتطلب تفسيراً أو مقارنة بين طريقتين للحل.",
                    "استخدم إجابات الطلاب الصحيحة كنماذج صفية، مع التركيز على سبب صحة الحل وليس النتيجة فقط.",
                ],
            },
            {
                title: "متابعة وقياس",
                points: [
                    "أعد تنفيذ تحدٍ قصير بعد التدخل العلاجي خلال 24 إلى 48 ساعة لقياس التحسن الحقيقي لا أثر التذكر المؤقت فقط.",
                    "راقب انتقال الطلاب من شريحة الدعم المباشر إلى شريحة القريبين من الإتقان، فهذا مؤشر أهم من ارتفاع المتوسط وحده.",
                    "احتفظ بسؤال ثابت من نفس المهارة في كل قياس قصير حتى يمكن مقارنة النتائج عبر الزمن.",
                    "إذا بقيت دقة السؤال الأضعف منخفضة بعد التدخل، غيّر طريقة الشرح واستخدم تمثيلاً بصرياً أو مثالاً حياتياً قبل إعادة الاختبار.",
                ],
            },
        ], [
            `متوسط الأداء العام: ${avgScore}%.`,
            `محاولات الدعم المباشر: ${lowParticipants.length}.`,
            weakestQuestion ? `أضعف سؤال: دقته ${weakestQuestion.accuracy}%.` : "لا توجد بيانات أسئلة تفصيلية كافية.",
        ]),
    };
}

function extractText(data: GeminiTextResponse): string {
    return data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim() || "";
}

function extractJsonCandidate(text: string): string {
    const cleaned = text
        .trim()
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/i, "")
        .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
}

function parseJsonObject(text: string): unknown | null {
    try {
        return JSON.parse(extractJsonCandidate(text));
    } catch {
        return null;
    }
}

function sanitizeStringList(value: unknown, maxItems: number, maxLength: number): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((item) => clampText(item, maxLength)).filter(Boolean).slice(0, maxItems);
}

function sanitizeRecommendationReport(value: unknown): ChallengeRecommendationReport {
    const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const sectionsRaw = Array.isArray(record.sections) ? record.sections : [];
    const sections = sectionsRaw
        .slice(0, 8)
        .map((section) => {
            const row = section && typeof section === "object" ? (section as Record<string, unknown>) : {};
            const points = sanitizeStringList(row.points, 8, 420);
            const actions = sanitizeStringList(row.actions, 7, 420);
            const evidence = sanitizeStringList(row.evidence, 4, 320);
            const successIndicators = sanitizeStringList(row.successIndicators, 4, 260);
            return {
                title: clampText(row.title, 90) || "توصية",
                priority: clampText(row.priority, 40),
                timeframe: clampText(row.timeframe, 60),
                evidence,
                actions,
                successIndicators,
                points: points.length ? points : actions,
            };
        })
        .filter(
            (section) =>
                section.points.length > 0 ||
                section.actions.length > 0 ||
                section.evidence.length > 0 ||
                section.successIndicators.length > 0
        );

    return {
        headline: clampText(record.headline, 120) || "تقرير توصيات تعليمية",
        summary: clampText(record.summary, 1200) || "تم إنشاء توصيات تعليمية بناءً على بيانات الأداء المتاحة.",
        keyFindings: sanitizeStringList(record.keyFindings, 6, 220),
        sections,
    };
}

function buildPrompt(input: unknown): string {
    return `
أنت مستشار تربوي وخبير تقويم تعليمي. أنشئ تقرير توصيات تعليمية كامل باللغة العربية بناءً على بيانات تحدي تعليمي.

المطلوب:
- اكتب تقريراً تفصيلياً وليس قائمة قصيرة. اجعل التقرير غنيّاً بما يكفي ليدعم قرار المعلم في الحصة القادمة.
- اكتب توصيات عملية قابلة للتنفيذ للمعلم، مع خطوات محددة داخل الصف.
- اربط التوصيات بالأرقام: متوسط الأداء، الأسئلة الأضعف، الزمن، التشتت، شرائح المتعلمين.
- اقترح علاجاً قصير المدى للحصة القادمة، وخطة متابعة أسبوعية، وأنشطة إثرائية وداعمة.
- صنّف الطلاب أو المحاولات إلى مجموعات دعم عند الإمكان: متقدمون، قريبون من الإتقان، يحتاجون دعماً.
- اذكر أمثلة لأنشطة صفية أو واجبات قصيرة أو أسئلة مراجعة يمكن تطبيقها مباشرة.
- اكتب من 7 إلى 9 أقسام، وفي كل قسم من 4 إلى 8 نقاط مفصلة.
- لا تكرر الجداول، ولا تكتب كلاماً عاماً. اجعل كل نقطة مرتبطة بسلوك تعليمي واضح.
- إذا كانت البيانات قليلة، اذكر حدود الاستنتاج بلغة مهنية.

أعد JSON فقط بهذا الشكل المهني، بدون Markdown وبدون شرح خارج JSON:
{
  "headline": "عنوان قصير للتقرير",
  "summary": "ملخص تنفيذي مفصل من 5 إلى 7 جمل",
  "keyFindings": [
    "مؤشر رئيسي مختصر مرتبط برقم من البيانات",
    "مؤشر رئيسي مختصر آخر"
  ],
  "sections": [
    {
      "title": "تشخيص الأداء",
      "priority": "عالية | متوسطة | منخفضة",
      "timeframe": "الحصة القادمة / هذا الأسبوع / متابعة لاحقة",
      "evidence": ["دليل رقمي من نتائج التقرير"],
      "actions": ["إجراء تدريسي واضح وقابل للتنفيذ"],
      "successIndicators": ["مؤشر قياس واضح لمعرفة نجاح التدخل"],
      "points": ["ملخص مختصر عند الحاجة"]
    }
  ]
}

قسّم التقرير إلى 6 أو 7 أقسام واضحة فقط حتى لا يصبح مزدحماً. اجعل كل قسم بهذه الهوية:
1) تشخيص الأداء والفجوات
2) أولويات التدخل العاجل
3) خطة الحصة القادمة
4) تفريد الدعم حسب شرائح المتعلمين
5) أنشطة وأسئلة مقترحة
6) إثراء للمتعلمين المتقدمين
7) متابعة وقياس أثر التدخل

بيانات التقرير:
${JSON.stringify(input, null, 2)}
`;
}

async function repairRecommendationJson(
    apiKey: string,
    brokenText: string
): Promise<unknown | null> {
    try {
        const data = (await generateGeminiContent(
            apiKey,
            {
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text:
                                    "حوّل النص التالي إلى JSON صالح مطابق للمخطط المطلوب فقط. " +
                                    "لا تضف Markdown ولا شرحاً. إذا كان النص ناقصاً فأكمله بأقصر صياغة مهنية ممكنة.\n\n" +
                                    extractJsonCandidate(brokenText).slice(0, 12000),
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.8,
                    maxOutputTokens: 4096,
                    responseMimeType: "application/json",
                    responseSchema: RECOMMENDATION_RESPONSE_SCHEMA,
                },
            },
            {
                models: RECOMMENDATION_MODELS,
                maxAttemptsPerModel: 1,
                initialDelayMs: 800,
                maxDelayMs: 3000,
            }
        )) as GeminiTextResponse;

        const repairedText = extractText(data);
        return repairedText ? parseJsonObject(repairedText) : null;
    } catch {
        return null;
    }
}

export async function generateChallengeRecommendationReport(
    apiKey: string,
    opts: ChallengeReportCsvOptions
): Promise<ChallengeRecommendationReport> {
    const input = buildRecommendationInput(opts);
    const data = (await generateGeminiContent(
        apiKey,
        {
            contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
            generationConfig: {
                temperature: 0.4,
                topP: 0.9,
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
                responseSchema: RECOMMENDATION_RESPONSE_SCHEMA,
            },
        },
        {
            models: RECOMMENDATION_MODELS,
            maxAttemptsPerModel: 2,
            initialDelayMs: 1200,
            maxDelayMs: 8000,
        }
    )) as GeminiTextResponse;

    const text = extractText(data);
    if (!text) {
        throw new Error("لم يرجع Gemini نص توصيات صالحاً.");
    }

    const parsed = parseJsonObject(text) || await repairRecommendationJson(apiKey, text);
    if (!parsed) {
        const finishReason = data.candidates?.[0]?.finishReason;
        throw new Error(
            finishReason
                ? `رجع Gemini توصيات غير مكتملة (${finishReason}).`
                : "رجع Gemini توصيات JSON غير صالحة."
        );
    }

    return sanitizeRecommendationReport(parsed);
}
