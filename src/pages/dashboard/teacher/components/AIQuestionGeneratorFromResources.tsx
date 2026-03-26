import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    FileText, Sparkles, AlertCircle, CheckCircle2,
    Loader2, X, Wand2, Video, Image, FileType,
    Database, Brain, Zap
} from "lucide-react";
import type { ChallengeQuestion, ContentMedia } from "@/data/challengeTypes";
import { useToast } from "@/components/ui/use-toast";
import { extractPdfText } from "@/lib/pdfExtractor";
import { supabase } from "@/lib/supabase";

interface AIQuestionGeneratorFromResourcesProps {
    media: ContentMedia[];
    onGenerate: (questions: ChallengeQuestion[]) => void;
    onCancel: () => void;
}

const AIQuestionGeneratorFromResources = ({
    media,
    onGenerate,
    onCancel
}: AIQuestionGeneratorFromResourcesProps) => {
    const [selectedMedia, setSelectedMedia] = useState<number[]>([]);
    const [prompt, setPrompt] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState("");
    const [processingPhase, setProcessingPhase] = useState<"idle" | "extracting" | "analyzing" | "generating">("idle");
    const [generateType, setGenerateType] = useState<"questions" | "games" | "both">("both");
    const { toast } = useToast();

    // Auto-select all media by default
    useEffect(() => {
        if (media.length > 0) {
            setSelectedMedia(media.map((_, index) => index));
        }
    }, [media]);

    const toggleMediaSelection = (index: number) => {
        setSelectedMedia(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const getMediaIcon = (type: ContentMedia["type"]) => {
        switch (type) {
            case "video": return <Video className="w-4 h-4 text-red-500" />;
            case "image": return <Image className="w-4 h-4 text-blue-500" />;
            case "text": return <FileText className="w-4 h-4 text-green-500" />;
            case "pdf": return <FileType className="w-4 h-4 text-orange-500" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const getMediaLabel = (type: ContentMedia["type"]) => {
        switch (type) {
            case "video": return "فيديو";
            case "image": return "صورة";
            case "text": return "نص";
            case "pdf": return "PDF";
            default: return type;
        }
    };

    // Gather text-based content from resources
    const gatherTextContent = (): string => {
        const selectedResources = selectedMedia.map(index => media[index]);
        let contentParts: string[] = [];

        for (const resource of selectedResources) {
            switch (resource.type) {
                case "text":
                    if (resource.content) {
                        contentParts.push(`📝 [نص تعليمي]: ${resource.caption || 'بدون عنوان'}\n${resource.content}`);
                    }
                    break;

                case "video":
                    const videoInfo = resource.caption
                        ? `🎬 [فيديو]: ${resource.caption}\nرابط: ${resource.url}`
                        : `🎬 [فيديو]: ${resource.url || 'فيديو تعليمي'}`;
                    contentParts.push(videoInfo);
                    break;

                case "image":
                    const imageInfo = resource.caption
                        ? `🖼️ [صورة]: ${resource.caption}\nرابط: ${resource.url}`
                        : `🖼️ [صورة]: ${resource.url || 'صورة تعليمية'}`;
                    contentParts.push(imageInfo);
                    break;
            }
        }

        return contentParts.join('\n\n---\n\n');
    };

    // Get PDF resources with base64 data
    const getPdfParts = async (): Promise<{ fileName: string; base64: string }[]> => {
        const selectedResources = selectedMedia.map(index => media[index]);
        const pdfParts: { fileName: string; base64: string }[] = [];

        for (const resource of selectedResources) {
            if (resource.type === "pdf") {
                if (resource.pdfBase64) {
                    pdfParts.push({
                        fileName: resource.fileName || 'document.pdf',
                        base64: resource.pdfBase64
                    });
                } else if (resource.url) {
                    try {
                        const response = await fetch(resource.url);
                        const blob = await response.blob();
                        const base64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || "");
                            reader.readAsDataURL(blob);
                        });

                        if (base64) {
                            pdfParts.push({
                                fileName: resource.fileName || resource.url.split('/').pop() || 'document.pdf',
                                base64: base64
                            });
                        }
                    } catch (err) {
                        console.error("Error fetching PDF for AI:", err);
                    }
                }
            }
        }

        return pdfParts;
    };

    // Get Image resources with base64 data for visual analysis
    const getImageParts = async (): Promise<{ fileName: string; base64: string }[]> => {
        const selectedResources = selectedMedia.map(index => media[index]);
        const imageParts: { fileName: string; base64: string }[] = [];

        for (const resource of selectedResources) {
            if (resource.type === "image") {
                if (resource.imageBase64) {
                    imageParts.push({
                        fileName: resource.url?.split('/').pop() || 'image.jpg',
                        base64: resource.imageBase64
                    });
                } else if (resource.url) {
                    try {
                        // Fetch image and convert to base64 if not already present
                        const response = await fetch(resource.url);
                        const blob = await response.blob();
                        const base64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || "");
                            reader.readAsDataURL(blob);
                        });

                        if (base64) {
                            imageParts.push({
                                fileName: resource.url.split('/').pop() || 'image.jpg',
                                base64: base64
                            });
                        }
                    } catch (err) {
                        console.error("Error fetching image for AI:", err);
                    }
                }
            }
        }

        return imageParts;
    };

    const handleGenerate = async () => {
        if (selectedMedia.length === 0) {
            toast({
                title: "لم يتم اختيار أي موارد",
                description: "يرجى اختيار مورد واحد على الأقل للتحليل",
                variant: "destructive",
            });
            return;
        }

        if (!prompt.trim()) {
            toast({
                title: "لم يتم إدخال التعليمات",
                description: "يرجى إدخال تعليمات واضحة لتوليد الأسئلة",
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);
        setProcessingPhase("extracting");

        try {
            // Gather content
            setProgress("جاري تحضير المحتوى...");
            const textContent = gatherTextContent();

            setProgress("جاري جلب ملفات PDF المحددة...");
            const pdfParts = await getPdfParts();

            setProgress("جاري جلب الصور المحددة...");
            const imageParts = await getImageParts();

            console.log("Text content:", textContent);
            console.log("PDF parts count:", pdfParts.length);
            console.log("Image parts count:", imageParts.length);

            // Check if we have any content
            if (!textContent.trim() && pdfParts.length === 0 && imageParts.length === 0) {
                throw new Error("لم يتم العثور على محتوى قابل للتحليل. تأكد من أن الموارد تحتوي على محتوى (نص، صورة أو ملف PDF).");
            }

            setProcessingPhase("analyzing");
            setProgress("جاري تحليل المحتوى بالذكاء الاصطناعي...");

            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("لم يتم تكوين مفتاح Gemini API");
            }

            // Fetch metadata or transcripts for videos if any
            let videoResourceMetadata = "";
            const getYoutubeId = (url: string) => {
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                const match = url.match(regExp);
                return (match && match[2].length === 11) ? match[2] : null;
            };

            const videoResources = selectedMedia.map(idx => media[idx]).filter(m => m.type === "video");

            if (videoResources.length > 0) {
                setProgress("جاري استخراج نصوص الفيديوهات...");
                for (const video of videoResources) {
                    const videoId = getYoutubeId(video.url || "");
                    let transcriptText = "";

                    if (videoId) {
                        try {
                            const transcriptRes = await fetch(`https://subtitles-youtube.vercel.app/api/transcript?videoId=${videoId}`);
                            if (transcriptRes.ok) {
                                const transcriptData = await transcriptRes.json();
                                if (transcriptData && transcriptData.transcript) {
                                    transcriptText = transcriptData.transcript.map((t: any) => t.text).join(" ");
                                    videoResourceMetadata += `📄 نص الفيديو "${video.url}":\n${transcriptText}\n\n`;
                                }
                            }
                        } catch (e) {
                            console.warn("Failed transcript fetch for", videoId);
                        }
                    }

                    // Fallback to oEmbed if transcript failed or wasn't available
                    if (!transcriptText && (video.url?.includes("youtube.com") || video.url?.includes("youtu.be"))) {
                        try {
                            const res = await fetch(`https://www.youtube.com/oembed?url=${video.url}&format=json`);
                            if (res.ok) {
                                const data = await res.json();
                                videoResourceMetadata += `🎬 فيديو: "${data.title}" من قناة "${data.author_name}"\nالرابط: ${video.url}\n(يرجى تحليل محتوى هذا الفيديو بناءً على عنوانه)\n`;
                            }
                        } catch (e) {
                            console.warn("Failed fetch meta for", video.url);
                        }
                    }
                }
            }

            // Build request parts
            const parts: any[] = [];

            // Extract text from PDFs locally (Gemini 2.5 Flash doesn't support File API)
            if (pdfParts.length > 0) {
                setProgress("جاري استخراج النص من ملفات PDF...");

                for (const pdf of pdfParts) {
                    try {
                        // Convert base64 to ArrayBuffer
                        const binaryStr = atob(pdf.base64);
                        const bytes = new Uint8Array(binaryStr.length);
                        for (let i = 0; i < binaryStr.length; i++) {
                            bytes[i] = binaryStr.charCodeAt(i);
                        }

                        // Use the centralized extraction utility
                        const extractedText = await extractPdfText(new Blob([bytes], { type: 'application/pdf' }));

                        if (extractedText.trim()) {
                            // Add extracted text as text content
                            parts.push({
                                text: `📄 محتوى ملف PDF "${pdf.fileName}":\n${extractedText}`
                            });
                            console.log(`Extracted ${extractedText.length} chars from: ${pdf.fileName}`);
                        } else {
                            console.warn(`No text extracted from: ${pdf.fileName}`);
                            toast({
                                title: "تحذير",
                                description: `لم يتم استخراج نص من ملف ${pdf.fileName}. قد يكون الملف يحتوي على صور فقط.`,
                                variant: "destructive",
                            });
                        }
                    } catch (extractError) {
                        console.error("Error extracting PDF:", extractError);
                        toast({
                            title: "خطأ في استخراج PDF",
                            description: `فشل استخراج النص من ${pdf.fileName}`,
                            variant: "destructive",
                        });
                    }
                }
            }

            // Process Images for visual analysis
            imageParts.forEach(img => {
                parts.push({
                    inline_data: {
                        mime_type: "image/jpeg", // Fallback to jpeg
                        data: img.base64
                    }
                });
            });

            setProcessingPhase("generating");
            setProgress("جاري توليد الأسئلة والألعاب...");

            // Build comprehensive prompt
            const fullContent = `${textContent}\n\n${videoResourceMetadata}`;
            const promptText = buildPrompt(fullContent, prompt, pdfParts.length, imageParts.length, generateType);
            parts.push({ text: promptText });

            // Using gemini-2.5-flash as specifically requested by user
            const modelToUse = "gemini-2.5-flash";
            console.log(`Using model: ${modelToUse} (PDFs: ${pdfParts.length}, Images: ${imageParts.length})`);

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [{ parts }],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 8192,
                        }
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("API Error Response:", errorData);
                const errorMessage = errorData?.error?.message || response.statusText || "خطأ غير معروف";
                throw new Error(`خطأ في API: ${errorMessage}`);
            }

            const data = await response.json();
            const generatedText = data.candidates[0]?.content?.parts[0]?.text;

            if (!generatedText) {
                throw new Error("لم يتم توليد أي محتوى");
            }

            const questions = parseGeneratedQuestions(generatedText);

            if (questions.length === 0) {
                throw new Error("لم يتم توليد أي أسئلة صالحة");
            }

            setProgress("تم التوليد بنجاح! ✓");
            toast({
                title: "تم توليد الأسئلة بنجاح! 🎉",
                description: `تم توليد ${questions.length} سؤال ولعبة من ${selectedMedia.length} مورد`,
            });

            setTimeout(() => {
                onGenerate(questions);
            }, 1000);

        } catch (error) {
            console.error("Error generating questions:", error);
            toast({
                title: "خطأ في التوليد",
                description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
                variant: "destructive",
            });
            setProgress("");
            setProcessingPhase("idle");
            setIsProcessing(false);
        }
    };

    const buildPrompt = (textContent: string, userPrompt: string, pdfCount: number = 0, imageCount: number = 0, genType: "questions" | "games" | "both" = "both"): string => {
        const fileNote = (pdfCount > 0 || imageCount > 0)
            ? `\n\nتنبيه هام جداً: لقد تم تزويدك بـ ${pdfCount > 0 ? `${pdfCount} ملف PDF` : ''}${pdfCount > 0 && imageCount > 0 ? ' و ' : ''}${imageCount > 0 ? `${imageCount} صورة` : ''}. 
يجب أن تكون جميع الأسئلة والألعاب مستخرجة حصرياً من المعلومات الموجودة داخل هذه الملفات (الصور و/أو الـ PDF). لا تستخدم أي معلومات خارجية أو معرفة عامة غير موجودة في المرفقات.`
            : '';

        const contentSection = textContent.trim()
            ? `\nالمحتوى النصي المرجعي:\n${textContent}`
            : '';

        // Customize based on generation type
        let typeInstruction = "";
        let availableTypes = "";

        if (genType === "questions") {
            typeInstruction = "يرجى إنشاء أسئلة تعليمية فقط (بدون ألعاب)";
            availableTypes = `
أنواع الأسئلة المتاحة:
1. اختيار متعدد (multiple_choice) - سؤال مع 2-6 خيارات
2. صح وخطأ (true_false) - سؤال مع خيارين فقط
3. سؤال وجواب (qa) - سؤال مفتوح
4. أعرف/لا أعرف (know_dont_know) - تقييم ذاتي
5. ترتيب (order_questions) - ترتيب عناصر`;
        } else if (genType === "games") {
            typeInstruction = "يرجى إنشاء ألعاب تفاعلية فقط (بدون أسئلة تقليدية)";
            availableTypes = `
أنواع الألعاب المتاحة:
1. مطابقة (matching) - مطابقة عناصر مع بعضها
2. تصويب (shooting) - تصويب على الإجابات الصحيحة
3. عجلة الحظ (wheel_spin) - دوران عجلة تفاعلية
4. ألغاز (puzzle) - حل لغز`;
        } else {
            typeInstruction = "يرجى إنشاء مزيج من الأسئلة التعليمية والألعاب التفاعلية";
            availableTypes = `
أنواع الأسئلة المتاحة:
1. اختيار متعدد (multiple_choice) - سؤال مع 2-6 خيارات
2. صح وخطأ (true_false) - سؤال مع خيارين فقط
3. سؤال وجواب (qa) - سؤال مفتوح
4. أعرف/لا أعرف (know_dont_know) - تقييم ذاتي
5. ترتيب (order_questions) - ترتيب عناصر

أنواع الألعاب المتاحة:
1. مطابقة (matching) - مطابقة عناصر مع بعضها
2. تصويب (shooting) - تصويب على الإجابات الصحيحة
3. عجلة الحظ (wheel_spin) - دوران عجلة تفاعلية
4. ألغاز (puzzle) - حل لغز`;
        }

        return `أنت مساعد ذكي متخصص في إنشاء محتوى تعليمي تفاعلي باللغة العربية.
مهمتك: توليد محتوى مستنداً **حصرياً** على الموارد التي قام المعلم باختيارها من القائمة المرفقة أدناه.
في حال وجود روابط فيديو (يوتيوب)، استخدم العنوان والبيانات المتاحة للبحث في قاعدة بياناتك عن محتوى الفيديو وتحليله بدقة.
${fileNote}${contentSection}

طلب المعلم:
${userPrompt}

${typeInstruction} بناءً **فقط** على المعلومات المستخرجة من الصور أو ملفات PDF أو النصوص المختارة، مع الالتزام بالتنسيق التالي بدقة. لا تولد أي سؤال من خارج المحتوى المختار.
${availableTypes}

يجب أن يكون الرد بصيغة JSON array فقط، بدون أي نص إضافي:

مثال للتنسيق:
[
  {
    "type": "multiple_choice",
    "question": "ما هو...",
    "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
    "correctAnswer": 0,
    "explanation": "الشرح...",
    "points": 100,
    "timeLimit": 30
  },
  {
    "type": "matching",
    "question": "طابق بين...",
    "pairs": [
      {"left": "العنصر 1", "right": "المطابق 1"},
      {"left": "العنصر 2", "right": "المطابق 2"}
    ],
    "points": 150,
    "timeLimit": 45
  },
  {
    "type": "wheel_spin",
    "question": "أدر العجلة لتحديد سؤالك...",
    "points": 0,
    "timeLimit": 60,
    "wheelSegments": [
      {
        "label": "سؤال سهل",
        "points": 100,
        "question": "سؤال مستخرج من الصورة...",
        "options": ["خيار 1", "خيار 2", "خيار 3"],
        "correctAnswer": 0
      }
    ]
  },
  {
    "type": "shooting",
    "question": "أطلق النار على الإجابة الصحيحة: سؤال مستخرج من الصورة...",
    "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
    "correctAnswer": 0,
    "points": 150,
    "timeLimit": 15
  },
  {
    "type": "puzzle",
    "question": "ركب الكلمات لتكوين الجملة الصحيحة",
    "correctAnswer": "جملة من المحتوى المرفق",
    "options": ["الكلمة 1", "الكلمة 2", "الكلمة 3"],
    "points": 200,
    "timeLimit": 45
  }
]

ملاحظات مهمة:
- التزم بنسبة 100% بالمحتوى المرفق (الصور وPDF والنصوص). ممنوع تماماً توليد أسئلة من خارجها.
- استخدم اللغة العربية الفصحى
- اجعل المحتوى واضحاً ومفيداً ومستنداً إلى المحتوى المقدم
- بالنسبة لعجلة الحظ (wheel_spin): يجب أن تحتوي العجلة على 4-6 شرائح (segments) مع أسئلة كاملة
- بالنسبة للتصويب (shooting): ضع 4 خيارات، واحد فقط صحيح، والهدف هو إصابة الصحيح بسرعة
- بالنسبة للألغاز (puzzle): الهدف هو ترتيب الكلمات أو الأحرف (options) لتكوين الإجابة الصحيحة (correctAnswer)
- اجعل النقاط مناسبة للصعوبة (50-200 نقطة)
- الوقت المحدد يتراوح بين 15-60 ثانية
- تأكد من صحة JSON وعدم وجود أخطاء في التنسيق`;
    };

    const parseGeneratedQuestions = (text: string): ChallengeQuestion[] => {
        try {
            let jsonText = text.trim();
            if (jsonText.startsWith("```json")) {
                jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
            } else if (jsonText.startsWith("```")) {
                jsonText = jsonText.replace(/```\n?/g, "");
            }

            const parsed = JSON.parse(jsonText);
            return parsed.map((item: any, index: number) => ({
                ...item,
                id: item.id || Date.now() + index
            }));
        } catch (error) {
            console.error("Error parsing questions:", error);
            throw new Error("فشل في تحليل الأسئلة المولدة");
        }
    };

    const selectedResourcesCount = selectedMedia.length;
    const pdfCount = selectedMedia.filter(i => media[i].type === "pdf").length;
    const textCount = selectedMedia.filter(i => media[i].type === "text").length;
    const videoCount = selectedMedia.filter(i => media[i].type === "video").length;
    const imageCount = selectedMedia.filter(i => media[i].type === "image").length;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
        >
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Brain className="w-6 h-6 text-primary" />
                        توليد الأسئلة من موارد الدرس
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        اختر الموارد التي يجب على الذكاء الاصطناعي تحليلها لتوليد الأسئلة والألعاب
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Step 1: Select Resources */}
                    <div className="space-y-3">
                        <Label className="text-base font-bold flex items-center gap-2">
                            <Database className="w-5 h-5" />
                            الخطوة 1: اختر الموارد للتحليل
                        </Label>

                        {media.length === 0 ? (
                            <Card className="border-dashed border-2 p-8 text-center">
                                <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                                <p className="text-muted-foreground">
                                    لا توجد موارد متاحة. أضف موارد (PDFs، نصوص، فيديوهات) أولاً في تبويب الوسائط.
                                </p>
                            </Card>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto p-2 rounded-lg border bg-muted/20">
                                {media.map((item, index) => (
                                    <div
                                        key={index}
                                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selectedMedia.includes(index)
                                            ? "bg-primary/10 border border-primary/30"
                                            : "bg-background hover:bg-muted/50 border border-transparent"
                                            }`}
                                        onClick={() => toggleMediaSelection(index)}
                                    >
                                        <Checkbox
                                            checked={selectedMedia.includes(index)}
                                            onCheckedChange={() => toggleMediaSelection(index)}
                                        />
                                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                                            {getMediaIcon(item.type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">
                                                {item.caption || item.fileName || getMediaLabel(item.type)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {item.type === "text" && item.content &&
                                                    `${item.content.substring(0, 50)}...`}
                                                {item.type === "pdf" && item.fileName}
                                                {item.type === "video" && item.url?.substring(0, 40) + "..."}
                                                {item.type === "image" && item.url?.substring(0, 40) + "..."}
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {getMediaLabel(item.type)}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Selection Summary */}
                        {media.length > 0 && (
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className="text-muted-foreground">المختار:</span>
                                {pdfCount > 0 && (
                                    <Badge variant="outline" className="gap-1">
                                        <FileType className="w-3 h-3" />
                                        {pdfCount} PDF
                                    </Badge>
                                )}
                                {textCount > 0 && (
                                    <Badge variant="outline" className="gap-1">
                                        <FileText className="w-3 h-3" />
                                        {textCount} نص
                                    </Badge>
                                )}
                                {videoCount > 0 && (
                                    <Badge variant="outline" className="gap-1">
                                        <Video className="w-3 h-3" />
                                        {videoCount} فيديو
                                    </Badge>
                                )}
                                {imageCount > 0 && (
                                    <Badge variant="outline" className="gap-1">
                                        <Image className="w-3 h-3" />
                                        {imageCount} صورة
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Step 2: Enter Prompt */}
                    <div className="space-y-3">
                        <Label className="text-base font-bold flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            الخطوة 2: حدد ما تريد توليده
                        </Label>
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="مثال: أريد توليد 10 أسئلة متنوعة تغطي جميع المفاهيم الأساسية في الموارد المختارة"
                            rows={3}
                            disabled={isProcessing}
                            className="resize-none"
                        />

                        {/* Generation Type Selector */}
                        <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">نوع المحتوى المراد توليده:</Label>
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    type="button"
                                    variant={generateType === "questions" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setGenerateType("questions")}
                                    disabled={isProcessing}
                                    className="gap-2"
                                >
                                    <FileText className="w-4 h-4" />
                                    أسئلة فقط
                                </Button>
                                <Button
                                    type="button"
                                    variant={generateType === "games" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setGenerateType("games")}
                                    disabled={isProcessing}
                                    className="gap-2"
                                >
                                    <Zap className="w-4 h-4" />
                                    ألعاب فقط
                                </Button>
                                <Button
                                    type="button"
                                    variant={generateType === "both" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setGenerateType("both")}
                                    disabled={isProcessing}
                                    className="gap-2"
                                >
                                    <Wand2 className="w-4 h-4" />
                                    كلاهما
                                </Button>
                            </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                            💡 نصيحة: كن محدداً قدر الإمكان (مثلاً: "ركز على الفصل الأول"، "أسئلة سهلة للمبتدئين")
                        </div>
                    </div>

                    {/* Processing Status */}
                    {isProcessing && (
                        <Card className="border-blue-500/50 bg-blue-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                        {processingPhase === "extracting" && (
                                            <Database className="w-4 h-4 text-blue-500 absolute inset-0 m-auto" />
                                        )}
                                        {processingPhase === "analyzing" && (
                                            <Brain className="w-4 h-4 text-blue-500 absolute inset-0 m-auto" />
                                        )}
                                        {processingPhase === "generating" && (
                                            <Zap className="w-4 h-4 text-blue-500 absolute inset-0 m-auto" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-blue-700 dark:text-blue-300">
                                            {progress}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <div className={`h-1 flex-1 rounded-full ${processingPhase === "extracting" ? "bg-blue-500" : "bg-blue-200"}`} />
                                            <div className={`h-1 flex-1 rounded-full ${processingPhase === "analyzing" ? "bg-blue-500" : processingPhase === "generating" ? "bg-blue-500" : "bg-blue-200"}`} />
                                            <div className={`h-1 flex-1 rounded-full ${processingPhase === "generating" ? "bg-blue-500" : "bg-blue-200"}`} />
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                            <span>استخراج</span>
                                            <span>تحليل</span>
                                            <span>توليد</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Info Box */}
                    <Card className="border-amber-500/30 bg-amber-500/5">
                        <CardContent className="p-4">
                            <div className="flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="text-sm space-y-2">
                                    <p className="font-medium">كيف يعمل التوليد من الموارد:</p>
                                    <ul className="space-y-1 mr-4 list-disc text-muted-foreground">
                                        <li>سيقوم الذكاء الاصطناعي بقراءة وفهم محتوى ملفات PDF والنصوص</li>
                                        <li>سيقوم بتحليل الصور مباشرة لاستخراج الأسئلة منها (Visual Analysis)</li>
                                        <li>سيولد أسئلة وألعاب مبنية على المحتوى الفعلي للموارد</li>
                                        <li>يمكنك مراجعة وتعديل الأسئلة المولدة قبل الحفظ</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={onCancel}
                            disabled={isProcessing}
                        >
                            <X className="w-4 h-4 ml-2" />
                            إلغاء
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            disabled={!prompt.trim() || selectedMedia.length === 0 || isProcessing}
                            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    جاري التوليد...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="w-4 h-4" />
                                    توليد من {selectedResourcesCount} مورد
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default AIQuestionGeneratorFromResources;
