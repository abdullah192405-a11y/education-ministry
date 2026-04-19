/**
 * Build an educational illustration from lesson resources:
 * 1) Analyze PDFs, images, text, and video metadata (Gemini **text** models — not `gemini-2.5-flash`).
 * 2) Ask Gemini (text) for a single image-generation prompt string.
 * 3) Call **Nano Banana 2** (`gemini-3.1-flash-image-preview` only) and return inline image bytes — never `gemini-2.5-flash`.
 */
import type { ContentMedia } from "@/data/challengeTypes";
import { extractPdfText, extractPdfAsImages, pdfNeedsVisualPageImages } from "@/lib/pdfExtractor";
import { generateGeminiContent } from "@/lib/geminiClient";

type GeminiPart =
    | { text: string }
    | { inline_data: { mime_type: string; data: string } };

/**
 * **Nano Banana 2** — Gemini native image generation (`gemini-3.1-flash-image-preview`).
 * Image bytes are requested **only** from this model (no fallback to Pro / 2.5) so behavior matches Google’s Nano Banana 2 stack.
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */
export const NANO_BANANA_2_IMAGE_MODEL = "gemini-3.1-flash-image-preview" as const;

/** Single-model chain: Nano Banana 2 only — never `gemini-2.5-flash` for pixels. */
const IMAGE_MODELS: readonly string[] = [NANO_BANANA_2_IMAGE_MODEL];

/**
 * Text-only step: multimodal analysis → written image prompt. Do **not** use `gemini-2.5-flash` here
 * (per product requirement: image flow avoids 2.5 Flash; pixels are always Nano Banana 2).
 */
const PROMPT_MODELS = ["gemini-3-flash-preview", "gemini-2.5-pro"];

/** Medium-length prompts: one round usually enough; one extra round only if cut off. */
const PROMPT_MAX_OUTPUT_TOKENS_PER_ROUND = 4096;
const MAX_PROMPT_COMPLETION_ROUNDS = 2;

/** Upper bound for the teacher-approved prompt sent to the image model (rich briefs for university + narrow scope). */
const MAX_IMAGE_PROMPT_CHARS = 20_000;

type GeminiContentTurn = {
    role: "user" | "model";
    parts: GeminiPart[];
};

type GeminiGenerateContentResponse = {
    candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string }> };
    }>;
};

function getCandidateTextFromResponse(data: unknown): string {
    const parts = (data as GeminiGenerateContentResponse).candidates?.[0]?.content?.parts ?? [];
    return parts.map((p) => p.text ?? "").join("");
}

function getFinishReason(data: unknown): string | undefined {
    return (data as GeminiGenerateContentResponse).candidates?.[0]?.finishReason;
}

const CONTINUE_PROMPT_MESSAGE_EN = `Your reply was cut off. Continue in the SAME level of detail and structure (same audience-appropriate depth). Finish any incomplete sentence, list item, or subsection; complete sections 5–6 if they were cut mid-way. Do not repeat paragraphs you already wrote.`;

const CONTINUE_PROMPT_MESSAGE_AR = `توقّف النص عند الحدّ الأقصى للطول. تابع بنفس **عمق التفصيل** وبنفس **الهيكل** (حسب الجمهور المستهدف). أكمِل الجملة أو القائمة أو الفقرة غير المكتملة، وأكمل الأقسام الأخيرة إن قُطعت. لا تكرر ما كتبته سابقاً.`;


function userFacingImageGenError(err: unknown): Error {
    const raw = err instanceof Error ? err.message : String(err);
    const msg = raw.replace(/^API:\s*/i, "").trim();
    const low = msg.toLowerCase();
    const isQuota =
        low.includes("resource_exhausted") ||
        low.includes("resource exhausted") ||
        low.includes("quota") ||
        low.includes("free_tier") ||
        low.includes("rate limit") ||
        low.includes("too many requests") ||
        low.includes("billing");
    if (isQuota) {
        return new Error(
            "تعذّر توليد الصورة بسبب حصة الطلبات (الخطة المجانية أو حد النموذج). " +
                "انتظر بضع دقائق ثم أعد المحاولة، أو راجع الحدود في https://ai.google.dev/gemini-api/docs/rate-limits " +
                "وفعّل الفوترة في Google AI Studio إذا كان توليد الصور غير متاح على حسابك المجاني."
        );
    }
    return new Error(msg.length > 800 ? `${msg.slice(0, 800)}…` : msg);
}

function gatherTextFromMedia(media: ContentMedia[]): string {
    const chunks: string[] = [];
    for (const resource of media) {
        switch (resource.type) {
            case "text":
                if (resource.content?.trim()) {
                    chunks.push(
                        `📝 [نص]: ${resource.caption || "بدون عنوان"}\n${resource.content}`
                    );
                }
                break;
            case "video":
                chunks.push(
                    resource.caption
                        ? `🎬 [فيديو]: ${resource.caption}\n${resource.url || ""}`
                        : `🎬 [فيديو]: ${resource.url || ""}`
                );
                break;
            case "image":
                chunks.push(
                    resource.caption
                        ? `🖼️ [صورة مرجعية]: ${resource.caption}\n${resource.url || ""}`
                        : `🖼️ [صورة]: ${resource.url || ""}`
                );
                break;
            case "link":
                if (resource.url?.trim()) {
                    chunks.push(`🔗 [رابط]: ${resource.caption || ""}\n${resource.url}`);
                }
                break;
            case "audio":
                chunks.push(`🔊 [صوت]: ${resource.fileName || resource.caption || resource.url || ""}`);
                break;
            default:
                break;
        }
    }
    return chunks.join("\n\n---\n\n");
}

async function fetchPdfBase64List(media: ContentMedia[]): Promise<{ fileName: string; base64: string }[]> {
    const out: { fileName: string; base64: string }[] = [];
    for (const resource of media) {
        if (resource.type !== "pdf") continue;
        if (resource.pdfBase64) {
            out.push({
                fileName: resource.fileName || "document.pdf",
                base64: resource.pdfBase64,
            });
            continue;
        }
        if (!resource.url) continue;
        try {
            const response = await fetch(resource.url);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result?.toString().split(",")[1] || "");
                reader.readAsDataURL(blob);
            });
            if (base64) {
                out.push({
                    fileName: resource.fileName || resource.url.split("/").pop() || "document.pdf",
                    base64,
                });
            }
        } catch (e) {
            console.error("educationalImageGeneration: PDF fetch failed", e);
        }
    }
    return out;
}

async function fetchImageBase64List(media: ContentMedia[]): Promise<{ fileName: string; base64: string }[]> {
    const out: { fileName: string; base64: string }[] = [];
    for (const resource of media) {
        if (resource.type !== "image") continue;
        if (resource.imageBase64) {
            out.push({
                fileName: resource.url?.split("/").pop() || "image.jpg",
                base64: resource.imageBase64,
            });
            continue;
        }
        if (!resource.url) continue;
        try {
            const response = await fetch(resource.url);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result?.toString().split(",")[1] || "");
                reader.readAsDataURL(blob);
            });
            if (base64) {
                out.push({
                    fileName: resource.url.split("/").pop() || "image.jpg",
                    base64,
                });
            }
        } catch (e) {
            console.error("educationalImageGeneration: image fetch failed", e);
        }
    }
    return out;
}

function getYoutubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}

async function gatherVideoMetadata(media: ContentMedia[]): Promise<string> {
    const videos = media.filter((m) => m.type === "video");
    let block = "";
    for (const video of videos) {
        const url = video.url || "";
        const videoId = getYoutubeId(url);
        let transcriptText = "";
        if (videoId) {
            try {
                const transcriptRes = await fetch(
                    `https://subtitles-youtube.vercel.app/api/transcript?videoId=${videoId}`
                );
                if (transcriptRes.ok) {
                    const transcriptData = await transcriptRes.json();
                    if (transcriptData?.transcript) {
                        transcriptText = transcriptData.transcript.map((t: { text: string }) => t.text).join(" ");
                        block += `📄 نص الفيديو "${url}":\n${transcriptText}\n\n`;
                    }
                }
            } catch {
                /* ignore */
            }
        }
        if (!transcriptText && (url.includes("youtube.com") || url.includes("youtu.be"))) {
            try {
                const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
                if (res.ok) {
                    const data = await res.json();
                    block += `🎬 فيديو: "${data.title}" — ${data.author_name}\n${url}\n\n`;
                }
            } catch {
                /* ignore */
            }
        }
    }
    return block;
}

/**
 * Build multimodal parts (text + PDF page images + reference images) for Gemini text analysis.
 */
export async function buildResourcePartsForImagePrompt(
    media: ContentMedia[],
    onProgress?: (msg: string) => void
): Promise<{ parts: GeminiPart[]; textSummary: string }> {
    const parts: GeminiPart[] = [];
    const textSummary = gatherTextFromMedia(media);
    onProgress?.("جاري جلب بيانات الفيديو...");
    const videoMeta = await gatherVideoMetadata(media);

    const pdfList = await fetchPdfBase64List(media);
    for (const pdf of pdfList) {
        onProgress?.(`جاري تحليل PDF: ${pdf.fileName}...`);
        try {
            const binaryStr = atob(pdf.base64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
            const pdfBlob = new Blob([bytes], { type: "application/pdf" });
            const extractedText = await extractPdfText(pdfBlob);
            if (extractedText.trim().length > 80) {
                parts.push({
                    text: `📄 نص مستخرج من "${pdf.fileName}":\n${extractedText.slice(0, 120_000)}`,
                });
            }
            if (pdfNeedsVisualPageImages(extractedText)) {
                onProgress?.(`جاري تحويل صفحات ${pdf.fileName}...`);
                const images = await extractPdfAsImages(pdfBlob, 20, 2);
                for (const img of images) {
                    parts.push({
                        inline_data: { mime_type: "image/jpeg", data: img },
                    });
                }
            }
        } catch (e) {
            console.error("PDF processing for image prompt:", e);
        }
    }

    const imageList = await fetchImageBase64List(media);
    for (const img of imageList) {
        parts.push({
            inline_data: { mime_type: "image/jpeg", data: img.base64 },
        });
    }

    const combinedText = [textSummary, videoMeta].filter(Boolean).join("\n\n");
    return { parts, textSummary: combinedText };
}

function extractImagePromptText(raw: string): string {
    let t = raw.trim();
    // Strip optional markdown fences or a single wrapping pair of quotes only at the very start/end
    t = t.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "");
    t = t.replace(/^["'`]+|["'`]+$/g, "");
    // Drop a leading label line some models add
    t = t.replace(/^(image\s*generation\s*prompt|prompt)\s*:\s*/i, "");
    return t.trim();
}

/** Teacher choices before generating the image prompt (shown in the UI). */
export type ImagePromptPreferences = {
    /** Who the illustration is primarily for */
    audience: "kids" | "teens" | "adults" | "university" | "general";
    /** Overall visual format */
    visualTheme: "infographic" | "poster" | "storybook" | "diagram" | "minimal" | "textbook";
    /** Emotional / pedagogical tone */
    tone: "playful" | "friendly" | "formal" | "scientific" | "neutral";
    /** Color & atmosphere */
    colorMood: "bright" | "pastel" | "dark" | "high_contrast" | "natural";
    /** Free-form hints (language, branding, avoid X, etc.) */
    notes: string;
};

export const DEFAULT_IMAGE_PROMPT_PREFERENCES: ImagePromptPreferences = {
    audience: "general",
    visualTheme: "infographic",
    tone: "friendly",
    colorMood: "bright",
    notes: "",
};

/**
 * Heuristic: if lesson text + resource summary has more Arabic letters than Latin, treat as Arabic-primary.
 */
function countArabicVsLatin(s: string): { ar: number; lat: number } {
    let ar = 0;
    let lat = 0;
    for (const ch of s) {
        const cp = ch.codePointAt(0)!;
        if (
            (cp >= 0x0600 && cp <= 0x06ff) ||
            (cp >= 0x0750 && cp <= 0x077f) ||
            (cp >= 0x08a0 && cp <= 0x08ff) ||
            (cp >= 0xfb50 && cp <= 0xfdff) ||
            (cp >= 0xfe70 && cp <= 0xfeff)
        ) {
            ar++;
        } else if ((cp >= 0x0041 && cp <= 0x005a) || (cp >= 0x0061 && cp <= 0x007a)) {
            lat++;
        }
    }
    return { ar, lat };
}

export function isContentPrimarilyArabic(
    lessonTitle: string,
    lessonDescription: string,
    textSummary: string
): boolean {
    const combined = `${lessonTitle}\n${lessonDescription}\n${textSummary}`;
    const { ar, lat } = countArabicVsLatin(combined);
    const total = ar + lat;
    if (total < 6) return false;
    return ar >= lat;
}

/** True if the confirmed image prompt (dialog text) is mostly Arabic — used when calling the image model. */
export function isPromptPrimarilyArabic(text: string): boolean {
    const { ar, lat } = countArabicVsLatin(text);
    if (ar + lat < 3) return false;
    return ar >= lat;
}

/** How to choose Arabic vs English for the text that will be confirmed and then sent to the image API. */
export type ImagePromptLanguageMode = "auto" | "ar" | "en";

export function resolveOutputArabic(
    mode: ImagePromptLanguageMode,
    lessonTitle: string,
    lessonDescription: string,
    textSummary: string
): boolean {
    if (mode === "ar") return true;
    if (mode === "en") return false;
    return isContentPrimarilyArabic(lessonTitle, lessonDescription, textSummary);
}

export type GenerateImagePromptOptions = {
    languageMode?: ImagePromptLanguageMode;
    /**
     * Teacher instructions that narrow *what* to extract from resources (e.g. "only unit 1 of 7",
     * "topic: photosynthesis"). Passed to the text model with the PDF/images; not the same as visual style notes.
     */
    contentFocus?: string;
    onProgress?: (msg: string) => void;
};

const MAX_CONTENT_FOCUS_CHARS = 4000;

function formatPreferencesForInstruction(p: ImagePromptPreferences, arabic: boolean): string {
    if (arabic) {
        const audienceMap: Record<ImagePromptPreferences["audience"], string> = {
            kids: "أطفال — أشكال بسيطة وخط كبير مقروء",
            teens: "مراهقون وطلاب المرحلة الثانوية",
            adults: "متعلمون بالغون",
            university: "طلاب جامعيون ودراسات عليا (يمكن كثافة معلومات معقولة)",
            general: "جمهور مختلط أو غير محدد — وضوح للجميع",
        };
        const themeMap: Record<ImagePromptPreferences["visualTheme"], string> = {
            infographic: "إنفوجرافيك تعليمي حديث بأقسام واضحة",
            poster: "تخطيط ملصق صف أو فعالية",
            storybook: "مشهد قصصي مع طبقة تعليمية",
            diagram: "مخطط مفاهيمي أو تقني نظيف",
            minimal: "تصميم مسطح بسيط مع فراغ بصري",
            textbook: "رسم كتاب مدرسي مع تسميات وحوافز",
        };
        const toneMap: Record<ImagePromptPreferences["tone"], string> = {
            playful: "مرِح وجذاب",
            friendly: "دافئ وودّي",
            formal: "رسمي ومؤسسي",
            scientific: "دقيق وعلمي",
            neutral: "محايد ومتوازن",
        };
        const colorMap: Record<ImagePromptPreferences["colorMood"], string> = {
            bright: "ألوان زاهية ومركّزات مشبعة",
            pastel: "ألوان باستيل هادئة",
            dark: "خلفية داكنة ونص فاتح مع بقاء القراءة",
            high_contrast: "تباين عالٍ لسهولة القراءة",
            natural: "ألوان طبيعية / ترابية",
        };
        const lines = [
            `الجمهور المستهدف: ${audienceMap[p.audience]}`,
            `الشكل البصري: ${themeMap[p.visualTheme]}`,
            `النبرة: ${toneMap[p.tone]}`,
            `الألوان والجو: ${colorMap[p.colorMood]}`,
        ];
        if (p.notes.trim()) {
            lines.push(`ملاحظات المعلّم (يجب احترامها): ${p.notes.trim()}`);
        }
        return lines.join("\n");
    }

    const audienceMap: Record<ImagePromptPreferences["audience"], string> = {
        kids: "young children (elementary; simple shapes, large readable text)",
        teens: "teenagers / secondary students",
        adults: "adult learners",
        university: "university students / graduates (dense info OK)",
        general: "mixed or unspecified audience; keep universally clear",
    };
    const themeMap: Record<ImagePromptPreferences["visualTheme"], string> = {
        infographic: "modern educational infographic with clear sections",
        poster: "classroom or event poster layout",
        storybook: "storybook / illustrated scene with educational overlay",
        diagram: "clean technical or conceptual diagram",
        minimal: "minimal flat design with lots of whitespace",
        textbook: "textbook-style figure with labels and callouts",
    };
    const toneMap: Record<ImagePromptPreferences["tone"], string> = {
        playful: "playful and engaging",
        friendly: "warm and approachable",
        formal: "formal and institutional",
        scientific: "precise and scientific",
        neutral: "neutral and balanced",
    };
    const colorMap: Record<ImagePromptPreferences["colorMood"], string> = {
        bright: "bright, saturated accent colors",
        pastel: "soft pastel palette",
        dark: "dark background with light text (still readable)",
        high_contrast: "high contrast for accessibility",
        natural: "natural / earth tones",
    };
    const lines = [
        `Target audience: ${audienceMap[p.audience]}`,
        `Visual format: ${themeMap[p.visualTheme]}`,
        `Tone: ${toneMap[p.tone]}`,
        `Color mood: ${colorMap[p.colorMood]}`,
    ];
    if (p.notes.trim()) {
        lines.push(`Additional teacher notes (must respect): ${p.notes.trim()}`);
    }
    return lines.join("\n");
}

type ImagePromptInstructionContext = {
    /** Teacher narrowed which part of the PDF/slides matters — allow deeper treatment of that slice. */
    hasContentFocus: boolean;
    /** Teacher left style/content constraints — reflect them explicitly in layout and labels. */
    hasTeacherNotes: boolean;
};

function buildAudienceSmartDepthGuidance(
    audience: ImagePromptPreferences["audience"],
    ctx: ImagePromptInstructionContext,
    outputArabic: boolean
): string {
    const focusBoost = ctx.hasContentFocus
        ? outputArabic
            ? "\n- **نطاق المعلّم:** بما أنّ المعلّم حدّد نطاقاً محدّداً، **وسّع التفصيل داخل هذا النطاق فقط**: أهداف تعلّم فرعية، عناوين مقترحة لكل جزء، وعلاقات بين المفاهيم (دون الخروج للوحدات الأخرى)."
            : "\n- **Teacher scope is set:** Within that scope only, go **deeper**: sub-goals, subsection titles, relationships between ideas, and suggested diagram types—do **not** drift to out-of-scope material."
        : "";
    const notesBoost = ctx.hasTeacherNotes
        ? outputArabic
            ? "\n- **ملاحظات المعلّم:** اربط كل قيد أو طلب وارد في «ملاحظات المعلّم» بقسم محدّد في التخطيط أو بنص يظهر على الصورة (لا تذكرها سطراً واحداً فقط)."
            : "\n- **Teacher notes:** Map **each** constraint in the notes to a concrete part of the layout or on-image text (not a single vague line)."
        : "";

    if (outputArabic) {
        const byAudience: Record<ImagePromptPreferences["audience"], string> = {
            kids:
                "الجمهور **أطفال**: اكتب وصفاً **مفصلاً في التخطيط** (أين العنوان، كم عموداً، ألوان الأقسام) مع **لغة جمل قصيرة ومفردات بسيطة**؛ ركّز على أيقونات كبيرة ومشاهد واضحة؛ تجنّب الجداول المعقّدة والنصوص الكثيفة.",
            teens:
                "الجمهور **مراهقون**: توازن بين **الوضوح والتفصيل** — يمكن 4–7 كتل رئيسية، عناوين فرعية مختصرة، وربط سببي بسيط بين الأفكار.",
            adults:
                "الجمهور **بالغون**: يمكن **فقرات أوضح** للخطوات والمقارنات والمصطلحات المهنية عند الحاجة؛ اذكر التسلسل المنطقي بين الأفكار.",
            university:
                "الجمهور **جامعي / دراسات عليا**: يُسمح بوصف **طويل نسبياً (عدة فقرات إجمالاً)** — طبقات في الرسم، مصطلحات دقيقة، قوائم مختصرة للنقاط الحرجة، وتمييز بين التعريف والمثال والاستنتاج إن وُجد في المصدر.",
            general:
                "الجمهور **عام**: **غنّ التفصيل بما يتناسب مع غنى المصدر** — إن كان المصدر معقّداً، زِد التفصيل في الهيكل والعناوين دون نسخ الملف كاملاً.",
        };
        return `${byAudience[audience]}${focusBoost}${notesBoost}`;
    }

    const byAudience: Record<ImagePromptPreferences["audience"], string> = {
        kids:
            "**Kids:** Be **specific about layout** (where the title sits, how many panels, color zones) while using **short, simple sentences**; large icons and friendly scenes; avoid dense tables and tiny text.",
        teens:
            "**Teens:** Balance clarity and detail—typically **4–7 main blocks**, short subheadings, and light causal links between ideas.",
        adults:
            "**Adults:** You may use **richer paragraphs** for steps, comparisons, and professional terms when the materials warrant it; state logical flow between ideas.",
        university:
            "**University / grad:** Allow a **relatively long prompt (multiple paragraphs total)**—layered diagram structure, precise terminology, short bullet lists for critical points, and distinguish definition vs example vs takeaway when the source does.",
        general:
            "**General audience:** **Scale detail to source richness**—complex sources deserve a more elaborate layout description; still never paste the full PDF.",
    };
    return `${byAudience[audience]}${focusBoost}${notesBoost}`;
}

function buildImagePromptSystemInstruction(
    preferences: ImagePromptPreferences,
    outputArabic: boolean,
    ctx: ImagePromptInstructionContext
): string {
    const prefBlock = formatPreferencesForInstruction(preferences, outputArabic);
    const depthGuide = buildAudienceSmartDepthGuidance(preferences.audience, ctx, outputArabic);

    if (outputArabic) {
        return `أنت مصمم تعليمي خبير. اعتمد **فقط** على المواد التعليمية والسياق أدناه (بما في ذلك صور الصفحات والصور المرفقة إن وُجدت)، واكتب **وصفاً واحداً لتوليد صورة** لنموذج ذكاء اصطناعي ينشئ صوراً.

**اللغة (إلزامي):** اكتب **كامل الوصف** بلغة عربية فصحى مبسطة، واضحة للمصمّمين. يُسمح بالإنجليزية **فقط** للأسماء العلمية، أسماء المؤسسات، الاختصارات، الروابط، التواريخ بصيغة دولية، أو مصطلحات تُترك عادة بالإنجليزية.
إذا كان الملخص النصي قصيراً لكن **الصور** تُظهر العربية كلغة أساسية، فاكتب الوصف كاملاً بالعربية.

**الطول والعمق (ذكي — يتبع الجمهور ومدخلات المعلّم):**
- ليس سطراً واحداً وليس نسخاً حرفياً للمصدر بالكامل.
- **طوّل الوصف بما يلائم الجمهور المختار** — انظر التوجيه أدناه؛ للجامعيين والنطاق الضيق يُفضّل وصف **أغنى** (فقرات متعددة إجمالاً) يشرح التخطيط والنصوص المقترحة على الصورة.
- ركّز على: الموضوع، الأهداف التعليمية، هيكل الأقسام، أهم العناوين والأرقام والتحذيرات — ويمكنك **ذكر مجموعة أوضح من التسميات الممثّلة** عندما يخدم الجمهور أو نطاق المعلّم ذلك (دون إدراج كل جدول تفصيلي).

**توجيه العمق (حسب الجمهور والمدخلات):**
${depthGuide}

**الهيكل** (وسّع كل قسم بما يتناسب مع الجمهور؛ لا تُفرغ الأقسام في جملة واحدة إلا لجمهور الأطفال حيث يناسب):

1) **الموضوع والهدف التعليمي** — لمن الرسم، وماذا يجب أن يستوعبه المتعلم بعد النظر (عدد جمل يتناسب مع الجمهور: أطفال 2–4؛ مراهقون وأعلى 3–8 عند الحاجة).

2) **التكوين والتخطيط** — تدفّق بصري تفصيلي: شريط عنوان، عدد الكتل، ترتيب القراءة (يميناً إلى اليسار للعربية حيث يناسب)، ووظيفة كل كتلة أو مسار.

3) **النصوص والعناوين** — عنوان رئيسي وفرعي مقترَحان؛ أهم العناوين والنقاط التي يجب أن تظهر مقروءة؛ عند الحاجة **أمثلة تسميات** من المادة (مجمّعة لا منسوخة صفحة كاملة).

4) **المفاهيم والأيقونات** — رموز، أسهم، مخططات، أو استعارات تلائم الأفكار (مع تفصيل يزيد مع الجمهور الأكبر سناً).

5) **الألوان والأسلوب** — لوحة، تباين، وأسلوب فني يتماشى مع إعدادات المعلّم (أكثر من جملة واحدة إن لزم).

6) **الجمهور والوضوح** — كيف تضبط الكثافة والصياغة لهذا المستوى (فقرة قصيرة لا سطراً فقط عند الحاجة).

**قواعد:**
- التزم بمحتوى المواد؛ لا تخترع حقائق.
- إذا وُجد أسفل هذه الرسالة قسم «توجيه المعلّم لنطاق المحتوى»، فحلّل المواد واصغِ وصف الصورة **ضمن ذلك النطاق فقط** (مثلاً وحدة واحدة من عدة وحدات).
- طبّق إعدادات المعلّم التالية في التخطيط والأسلوب والصياغة.
- **المخرجات: الوصف العربي فقط** — بلا مقدمة تعريفية وبلا سياج markdown.

**إعدادات المعلّم (إلزامية — ادمجها في وصفك):**
${prefBlock}`;
    }

    return `You are an expert instructional designer. Using ONLY the educational materials and context below (including any attached page images and reference images), write ONE image generation prompt in English for an AI image model.

OUTPUT LANGUAGE — **English**: Write the **entire** prompt in **English**. If sources are bilingual, you may note short Arabic phrases where they must appear on the graphic.

LENGTH & DEPTH (smart — scales with audience + teacher input):
- **Not** a one-line brief, and **not** a full verbatim dump of the source PDF.
- **Scale length and richness** using the guidance below. For **university** audiences and/or a **narrow teacher scope**, prefer a **longer, more elaborate** prompt: multiple paragraphs total, explicit layout, hierarchy of headings, and representative on-image labels.
- Still prioritize faithful coverage of the materials: topic, learning goals, section structure, and the **most important** titles, numbers, dates, or warnings—expanding with **more representative labels** when useful (grouped, not every table cell).

**Depth guidance (audience + teacher inputs):**
${depthGuide}

Structure (expand each section to match the audience—do not collapse everything into one sentence unless the audience is young children):

1) **Subject & learning goal** — What the graphic is for and what the learner should take away (sentence count scales: kids ~2–4; teens+ often 3–8 when the material is rich).

2) **Composition & layout** — Detailed visual flow: title band, number and role of blocks, reading order, what each region communicates.

3) **Text & labels** — Main title/subtitle; key headings; when helpful, a **richer set of example labels** drawn from the materials (summarized, not a full transcript).

4) **Concepts & visuals** — Icons, arrows, diagrams, metaphors; more detail for older / academic audiences.

5) **Color & style** — Palette, contrast, art direction aligned with teacher settings (more than one phrase when needed).

6) **Audience & clarity** — How density and wording match the target (short paragraph, not only one line, when nuance matters).

Rules:
- Ground content in the materials; do not invent unrelated facts.
- If a **Teacher content scope** section appears below, analyze materials and write the image prompt **only for that scope** (e.g. one unit out of many).
- If sources mix languages, you may note bilingual key phrases where helpful.
- Apply the teacher's image settings below consistently (audience, theme, tone, colors, notes).
- Output ONLY the prompt. No preamble, no markdown fences.

Teacher-specified image settings (mandatory — weave into layout, style, and wording of your prompt):
${formatPreferencesForInstruction(preferences, false)}`;
}

/**
 * Step 1: From resources + lesson fields, produce the image prompt shown in the confirmation dialog
 * (same string is later sent to {@link generateImageBytesFromPrompt} when the user confirms).
 */
export async function generateImagePromptFromAnalyzedResources(
    apiKey: string,
    media: ContentMedia[],
    lessonTitle: string,
    lessonDescription: string,
    preferences: ImagePromptPreferences,
    options?: GenerateImagePromptOptions
): Promise<string> {
    const onProgress = options?.onProgress;
    const languageMode = options?.languageMode ?? "auto";

    const { parts, textSummary } = await buildResourcePartsForImagePrompt(media, onProgress);

    if (!textSummary.trim() && parts.length === 0) {
        if (!lessonTitle.trim() && !lessonDescription.trim()) {
            throw new Error(
                "لا توجد موارد أو عنوان/وصف للدرس. أضف وسائط أو املأ عنوان المحتوى والوصف ثم أعد المحاولة."
            );
        }
    }

    const outputArabic = resolveOutputArabic(languageMode, lessonTitle, lessonDescription, textSummary);

    const rawFocus = options?.contentFocus?.trim() ?? "";
    const contentFocus =
        rawFocus.length > MAX_CONTENT_FOCUS_CHARS
            ? rawFocus.slice(0, MAX_CONTENT_FOCUS_CHARS)
            : rawFocus;

    const instruction = buildImagePromptSystemInstruction(preferences, outputArabic, {
        hasContentFocus: contentFocus.length > 0,
        hasTeacherNotes: preferences.notes.trim().length > 0,
    });

    const lessonCtx = outputArabic
        ? (lessonTitle.trim() || lessonDescription.trim()
              ? `\n\nعنوان الدرس: ${lessonTitle}\nوصف الدرس: ${lessonDescription}`
              : "") + `\n\nملخص نصي من الموارد التعليمية:\n${textSummary || "(لا يوجد)"}`
        : (lessonTitle.trim() || lessonDescription.trim()
              ? `\n\nLesson title: ${lessonTitle}\nLesson description: ${lessonDescription}`
              : "") + `\n\nTextual / metadata summary from resources:\n${textSummary || "(none)"}`;

    const focusBlock =
        contentFocus.length > 0
            ? outputArabic
                ? `\n\n**توجيه المعلّم لنطاق المحتوى (إلزامي — التزم به عند التحليل وعند صياغة وصف الصورة فقط؛ تجاهل أجزاء المواد خارج هذا النطاق):**\n${contentFocus}`
                : `\n\n**Teacher content scope (mandatory — when analyzing materials and writing the image prompt, only cover what matches this; ignore other parts of the sources unless needed for context):**\n${contentFocus}`
            : "";

    const initialUserParts: GeminiPart[] = [...parts, { text: instruction + lessonCtx + focusBlock }];

    let contents: GeminiContentTurn[] = [{ role: "user", parts: initialUserParts }];
    let fullGenerated = "";

    for (let round = 0; round < MAX_PROMPT_COMPLETION_ROUNDS; round++) {
        onProgress?.(
            round === 0
                ? "جاري صياغة وصف الصورة (مفصّل حسب الجمهور والمواد)..."
                : "جاري إكمال نهاية الوصف..."
        );

        const data = await generateGeminiContent(
            apiKey,
            {
                contents,
                generationConfig: {
                    temperature: round === 0 ? 0.6 : 0.45,
                    maxOutputTokens: PROMPT_MAX_OUTPUT_TOKENS_PER_ROUND,
                },
            },
            { models: PROMPT_MODELS }
        );

        const chunk = getCandidateTextFromResponse(data);
        if (!chunk.trim()) {
            if (round === 0) {
                throw new Error("لم يتم إنتاج وصف صورة من التحليل. حاول مرة أخرى أو أضف المزيد من الموارد.");
            }
            break;
        }

        fullGenerated += chunk;

        const finish = getFinishReason(data);
        if (finish !== "MAX_TOKENS") {
            break;
        }

        contents = [
            ...contents,
            { role: "model", parts: [{ text: chunk }] },
            {
                role: "user",
                parts: [{ text: outputArabic ? CONTINUE_PROMPT_MESSAGE_AR : CONTINUE_PROMPT_MESSAGE_EN }],
            },
        ];
    }

    const prompt = extractImagePromptText(fullGenerated);
    if (!prompt) {
        throw new Error("لم يتم إنتاج وصف صورة من التحليل. حاول مرة أخرى أو أضف المزيد من الموارد.");
    }
    return prompt;
}

function extractInlineImageFromResponse(parsed: unknown): { mimeType: string; base64: string } | null {
    const root = parsed as {
        candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }>;
    };
    const rawParts = root.candidates?.[0]?.content?.parts;
    if (!rawParts) return null;
    for (const part of rawParts) {
        const inlineData = part.inlineData as { mimeType?: string; data?: string } | undefined;
        const inline_data = part.inline_data as { mime_type?: string; data?: string } | undefined;
        const data = inlineData?.data ?? inline_data?.data;
        if (data) {
            const mime =
                inlineData?.mimeType ?? inline_data?.mime_type ?? "image/png";
            return { mimeType: mime, base64: data };
        }
    }
    return null;
}

/**
 * Wrap the user-confirmed prompt for the image API (Arabic vs English task line).
 * The core content is still what they approved in «تأكيد وصف توليد الصورة».
 */
function buildUserMessageForImageModel(imagePrompt: string): string {
    let core = imagePrompt.trim();
    if (core.length > MAX_IMAGE_PROMPT_CHARS) {
        console.warn(
            `[educationalImageGeneration] Prompt truncated from ${core.length} to ${MAX_IMAGE_PROMPT_CHARS} chars for image model`
        );
        core = core.slice(0, MAX_IMAGE_PROMPT_CHARS);
    }
    if (isPromptPrimarilyArabic(core)) {
        return (
            "المطلوب: إنشاء صورة توضيحية تعليمية واحدة عالية الجودة (نموذج Nano Banana 2 / Gemini 3.1 Flash Image).\n" +
            "اتبع المواصفات التالية بدقة (التخطيط، النصوص الظاهرة على الصورة، الأيقونات، الألوان). " +
            "النص العربي يجب أن يكون واضحاً ومقروءاً وبخط متناسق، مع محاذاة من اليمين إلى اليسار حيث ينطبق. " +
            "تجنّب تشويه الحروف أو دمجها.\n\n" +
            "---\n\n" +
            core
        );
    }
    return (
        "Generate a single high-quality educational illustration using Nano Banana 2 / Gemini 3.1 Flash Image. " +
            "Follow the specifications below exactly (layout, on-image text, icons, colors).\n\n" +
            "---\n\n" +
            core
    );
}

/**
 * Step 2: Call Gemini native image generation (REST).
 * `imagePrompt` is the text from the confirmation dialog (possibly edited by the teacher).
 */
export async function generateImageBytesFromPrompt(
    apiKey: string,
    imagePrompt: string
): Promise<{ mimeType: string; base64: string }> {
    const trimmed = buildUserMessageForImageModel(imagePrompt);
    const arabicHeavy = isPromptPrimarilyArabic(imagePrompt.trim());
    try {
        const data = await generateGeminiContent(
            apiKey,
            {
                contents: [{ parts: [{ text: trimmed }] }],
                generationConfig: {
                    responseModalities: ["IMAGE", "TEXT"],
                    imageConfig: {
                        aspectRatio: "16:9",
                        // 2K helps legibility for Arabic / dense on-image text (Nano Banana 2 supports 1K/2K/4K)
                        imageSize: arabicHeavy ? "2K" : "1K",
                    },
                },
            },
            {
                models: IMAGE_MODELS,
                maxAttemptsPerModel: 4,
                initialDelayMs: 2500,
                onRetry: ({ attempt, delayMs, model, reason }) => {
                    console.warn("[Gemini image] retry", { attempt, delayMs, model, reason });
                },
            }
        );

        const img = extractInlineImageFromResponse(data);
        if (img) return img;

        const textFallback = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
            .candidates?.[0]?.content?.parts?.map((p) => p.text)
            .filter(Boolean)
            .join(" ");
        throw new Error(
            textFallback?.trim()
                ? `لم تُرجع النموذج صورة: ${textFallback.slice(0, 200)}`
                : "لم تُرجع الخدمة أي صورة. جرّب نموذجاً آخر أو صِغ الوصف بشكل أبسط."
        );
    } catch (e) {
        throw userFacingImageGenError(e);
    }
}

export async function createEducationalImageFromLessonResources(params: {
    apiKey: string;
    media: ContentMedia[];
    lessonTitle: string;
    lessonDescription: string;
    preferences?: ImagePromptPreferences;
    languageMode?: ImagePromptLanguageMode;
    contentFocus?: string;
    onProgress?: (msg: string) => void;
}): Promise<{ mimeType: string; base64: string; derivedPrompt: string }> {
    const { apiKey, media, lessonTitle, lessonDescription, onProgress } = params;
    const derivedPrompt = await generateImagePromptFromAnalyzedResources(
        apiKey,
        media,
        lessonTitle,
        lessonDescription,
        params.preferences ?? DEFAULT_IMAGE_PROMPT_PREFERENCES,
        { languageMode: params.languageMode, contentFocus: params.contentFocus, onProgress }
    );
    onProgress?.("جاري توليد الصورة...");
    const { mimeType, base64 } = await generateImageBytesFromPrompt(apiKey, derivedPrompt);
    return { mimeType, base64, derivedPrompt };
}
