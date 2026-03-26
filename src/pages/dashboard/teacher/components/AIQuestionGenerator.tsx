import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Upload, FileText, Sparkles, AlertCircle, CheckCircle2,
    Loader2, X, FileUp, Wand2, Image as ImageIcon, Video, Link2
} from "lucide-react";
import type { ChallengeQuestion } from "@/data/challengeTypes";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface AIQuestionGeneratorProps {
    onGenerate: (questions: ChallengeQuestion[]) => void;
    onCancel: () => void;
}

const AIQuestionGenerator = ({ onGenerate, onCancel }: AIQuestionGeneratorProps) => {
    const [inputType, setInputType] = useState<"file" | "video">("file");
    const [videoUrl, setVideoUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<"pdf" | "image" | null>(null);
    const [prompt, setPrompt] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState("");
    const { toast } = useToast();

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type === "application/pdf") {
                setFile(selectedFile);
                setFileType("pdf");
                toast({
                    title: "تم اختيار ملف PDF ✓",
                    description: selectedFile.name,
                });
            } else if (selectedFile.type.startsWith("image/")) {
                setFile(selectedFile);
                setFileType("image");
                toast({
                    title: "تم اختيار صورة ✓",
                    description: selectedFile.name,
                });
            } else {
                toast({
                    title: "خطأ في نوع الملف",
                    description: "يرجى اختيار ملف PDF أو صورة فقط",
                    variant: "destructive",
                });
            }
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast({
                title: "لم يتم إدخال التعليمات",
                description: "يرجى إدخال تعليمات واضحة لتوليد الأسئلة",
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);

        try {
            let extractedText = "";
            let imagePart: any = null;

            if (inputType === "file" && file) {
                setProgress("جاري تحليل الملف...");
                if (file.type.includes("image")) {
                    const base64Data = await fileToBase64(file);
                    imagePart = {
                        inline_data: {
                            mime_type: file.type,
                            data: base64Data
                        }
                    };
                    extractedText = "تم توفير صورة للتحليل. يرجى تحليل محتواها العلمي بدقة.";
                } else if (file.type === "application/pdf") {
                    extractedText = await extractPdfText(file);
                }
            } else if (inputType === "video" && videoUrl) {
                setProgress("جاري استخراج محتوى الفيديو...");

                // Helper to get YouTube ID
                const getYoutubeId = (url: string) => {
                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                    const match = url.match(regExp);
                    return (match && match[2].length === 11) ? match[2] : null;
                };

                const videoId = getYoutubeId(videoUrl);
                if (videoId) {
                    try {
                        // Attempt to fetch transcript via public API to mimic NotebookLM behavior
                        const transcriptRes = await fetch(`https://subtitles-youtube.vercel.app/api/transcript?videoId=${videoId}`);
                        if (transcriptRes.ok) {
                            const transcriptData = await transcriptRes.json();
                            if (transcriptData && transcriptData.transcript) {
                                extractedText = `[نص الفيديو الكامل من اليوتيوب - NotebookLM Mode]:\n${transcriptData.transcript.map((t: any) => t.text).join(" ")}`;
                                setProgress("تم استخراج نص الفيديو وتحليله بنجاح ✓");
                            }
                        }
                    } catch (e) {
                        console.warn("Transcript API error", e);
                    }
                }

                if (!extractedText) {
                    // Fallback to oEmbed if transcript failed - now with more specific extraction
                    try {
                        setProgress("جاري استجماع معلومات الفيديو البديلة...");
                        const oEmbedRes = await fetch(`https://www.youtube.com/oembed?url=${videoUrl}&format=json`);
                        if (oEmbedRes.ok) {
                            const data = await oEmbedRes.json();
                            extractedText = `[بيانات الفيديو للتحليل]:\nالعنوان: ${data.title}\nالمؤلف: ${data.author_name}\nالرابط: ${videoUrl}\n\nيرجى محاكاة NotebookLM واستخدام معرفتك الداخلية بهذا الفيديو أو موضوعه (Grounded Knowledge) لإنتاج أسئلة دقيقة جداً.`;
                        }
                    } catch (e) {
                        extractedText = `[رابط فيديو للتحليل]: ${videoUrl}`;
                    }
                }
            }
            else {
                setProgress("جاري التحضير...");
                extractedText = "لم يتم توفير ملف أو رابط. سيعتمد التوليد على التعليمات المقدمة فقط.";
            }

            // Step 2: Call Gemini API
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("لم يتم تكوين مفتاح Gemini API");
            }

            const modelName = "gemini-2.5-flash"; // Reverted to 2.5-flash as specifically requested

            const parts: any[] = [];

            if (imagePart) {
                parts.push(imagePart);
            }

            parts.push({ text: buildPrompt(extractedText, prompt) });

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts
                            }
                        ],
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
                throw new Error(`خطأ في API: ${response.statusText}`);
            }

            setProgress("جاري معالجة النتائج...");
            const data = await response.json();

            // Extract and parse the generated questions
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
                description: `تم توليد ${questions.length} سؤال ولعبة`,
            });

            // Delay to show success message
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
            setIsProcessing(false);
        }
    };

    const extractPdfText = async (file: File): Promise<string> => {
        try {
            console.log("Starting PDF extraction for:", file.name);

            // Try to use pdfjs-dist
            try {
                const pdfjsLib = await import('pdfjs-dist');
                console.log("pdfjs-dist loaded successfully");

                // Use the actual library version instead of hardcoded version
                const pdfjsVersion = pdfjsLib.version || '4.0.379';
                console.log("pdfjs version:", pdfjsVersion);

                // Set worker with matching version
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.mjs`;

                console.log("Worker path set:", pdfjsLib.GlobalWorkerOptions.workerSrc);

                // Read file
                const arrayBuffer = await file.arrayBuffer();
                console.log("File read as ArrayBuffer, size:", arrayBuffer.byteLength);

                // Load PDF
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                console.log("PDF loaded, pages:", pdf.numPages);

                let fullText = '';

                // Extract text from each page
                for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 50); pageNum++) {
                    try {
                        const page = await pdf.getPage(pageNum);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items
                            .map((item: any) => item.str || '')
                            .filter(Boolean)
                            .join(' ');

                        if (pageText.trim()) {
                            fullText += pageText + '\n\n';
                        }

                        console.log(`Page ${pageNum} extracted, length:`, pageText.length);
                    } catch (pageError) {
                        console.warn(`Error on page ${pageNum}:`, pageError);
                        // Continue with next page
                    }
                }

                if (!fullText.trim()) {
                    throw new Error("لم يتم استخراج أي نص من PDF");
                }

                // Limit text length
                if (fullText.length > 30000) {
                    fullText = fullText.substring(0, 30000) + '\n\n[... تم اقتصاص المحتوى الزائد]';
                }

                console.log("Total extracted text length:", fullText.length);
                return fullText;

            } catch (pdfjsError) {
                console.error("pdfjs-dist error:", pdfjsError);

                // Fallback: Use simple file reading
                console.log("Falling back to simple text extraction");
                return await fallbackExtractText(file);
            }

        } catch (error) {
            console.error("PDF extraction failed completely:", error);
            throw new Error("فشل في قراءة ملف PDF. جرب ملف آخر أو استخدم نص مباشر في التعليمات.");
        }
    };

    // Fallback method: Just read file name and let user provide context
    const fallbackExtractText = async (file: File): Promise<string> => {
        return `\n[ملف: ${file.name}]\n\nملاحظة: تعذر قراءة محتوى الملف برمجياً. سيعتمد الذكاء الاصطناعي على التحليل البصري أو التعليمات المقدمة فقط.\n`;
    };

    const buildPrompt = (fileContent: string, userPrompt: string): string => {
        return `أنت مساعد ذكي متخصص في إنشاء أسئلة تعليمية وألعاب تفاعلية باللغة العربية.
مهمتك الأساسية هي توليد محتوى مستنداً **حصرياً** على المصدر المقدم (صورة، PDF، أو رابط فيديو).

المحتوى التعليمي من المصدر:
${fileContent}

طلب المعلم:
${userPrompt}

يرجى إنشاء أسئلة وألعاب تفاعلية بناءً على المعلومات المتوفرة في المصدر المقدم، مع الالتزام بالتنسيق التالي بدقة. 
**في حال كان المصدر رابط فيديو (يوتيوب):**
1. استخدم العنوان والبيانات المتاحة لفهم الموضوع الأساسي.
2. قم بتحليله بناءً على معرفتك الواسعة بمحتوى الفيديو التعليمي (Grounded Knowledge) إذا كان الفيديو مشهوراً أو متاحاً في قاعدة بياناتك.
3. التزم تماماً بمحتوى الفيديو ولا تخرج عن سياقه العلمي.
4. إذا لم تتمكن من "مشاهدة" الفيديو مباشرة، اعتمد على العنوان والتعليمات المقدمة من المعلم لإنشاء أسئلة دقيقة جداً.

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
4. ألغاز (puzzle) - حل لغز

يجب أن يكون الرد بصيغة JSON array فقط، بدون أي نص إضافي:

مثال للتنسيق:
[
  {
    "type": "multiple_choice",
    "question": "سؤال مستخرج من الملف المرفق...",
    "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
    "correctAnswer": 0,
    "explanation": "الشرح...",
    "points": 100,
    "timeLimit": 30
  },
  {
    "type": "matching",
    "question": "طابق بين مفاهيم من الملف...",
    "pairs": [
      {"left": "العنصر 1", "right": "المطابق 1"},
      {"left": "العنصر 2", "right": "المطابق 2"}
    ],
    "points": 150,
    "timeLimit": 45
  },
  {
      "type": "wheel_spin",
      "question": "أدر العجلة: سؤال من الملف المرفق...",
      "points": 0,
      "timeLimit": 60,
      "wheelSegments": [
        {
          "label": "سؤال 1",
          "points": 100,
          "question": "...",
          "options": ["خيار 1", "خيار 2"],
          "correctAnswer": 0
        }
      ]
  }
]

ملاحظات مهمة:
- التزم بنسبة 100% بالمحتوى المرفق (الصورة أو PDF). ممنوع تماماً توليد أسئلة من خارجها.
- استخدم اللغة العربية الفصحى
- اجعل الأسئلة واضحة ومفيدة ومستخلصة بدقة
- نوّع بين الأسئلة والألعاب
- اجعل النقاط مناسبة للصعوبة (50-200 نقطة)
- الوقت المحدد يتراوح بين 15-60 ثانية
- تأكد من صحة JSON تماماً`;
    };

    const parseGeneratedQuestions = (text: string): ChallengeQuestion[] => {
        try {
            // Remove markdown code blocks if present
            let jsonText = text.trim();
            if (jsonText.startsWith("```json")) {
                jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
            } else if (jsonText.startsWith("```")) {
                jsonText = jsonText.replace(/```\n?/g, "");
            }

            const parsed = JSON.parse(jsonText);

            // Add IDs if not present
            return parsed.map((item: any, index: number) => ({
                ...item,
                id: item.id || Date.now() + index
            }));
        } catch (error) {
            console.error("Error parsing questions:", error);
            throw new Error("فشل في تحليل الأسئلة المولدة");
        }
    };

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
                        <Wand2 className="w-6 h-6 text-primary" />
                        توليد الأسئلة والألعاب بالذكاء الاصطناعي
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        استخدم Gemini AI لتوليد أسئلة وألعاب تفاعلية من ملف PDF أو صورة
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Step 1: Content Source */}
                    <div className="space-y-4">
                        <Label className="text-base font-bold flex items-center gap-2">
                            <FileUp className="w-5 h-5" />
                            الخطوة 1: مصدر المحتوى
                        </Label>

                        <Tabs value={inputType} onValueChange={(v) => setInputType(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="file" className="gap-2">
                                    <FileText className="w-4 h-4" />
                                    ملف (PDF/صورة)
                                </TabsTrigger>
                                <TabsTrigger value="video" className="gap-2">
                                    <Video className="w-4 h-4" />
                                    رابط فيديو (YouTube)
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="file" className="space-y-3 mt-4">
                                <div className="flex items-center gap-3">
                                    <Input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={handleFileChange}
                                        className="flex-1"
                                        disabled={isProcessing}
                                    />
                                    {file && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setFile(null);
                                                setFileType(null);
                                            }}
                                            disabled={isProcessing}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                                {file && (
                                    <div className="flex items-center gap-2 text-sm text-success">
                                        {fileType === "pdf" ? (
                                            <FileText className="w-4 h-4" />
                                        ) : (
                                            <ImageIcon className="w-4 h-4" />
                                        )}
                                        <span>{file.name}</span>
                                        <span className="text-muted-foreground">
                                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                        </span>
                                    </div>
                                )}
                                {!file && (
                                    <p className="text-xs text-muted-foreground">
                                        💡 ارفع ملف PDF لخطط الدروس أو صوراً لتمارين وكتب مدرسية
                                    </p>
                                )}
                            </TabsContent>

                            <TabsContent value="video" className="space-y-3 mt-4">
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            type="url"
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            value={videoUrl}
                                            onChange={(e) => setVideoUrl(e.target.value)}
                                            className="pl-10"
                                            disabled={isProcessing}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        💡 ضع رابط فيديو يوتيوب تعليمي ليقوم الذكاء الاصطناعي بتحليله
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
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
                            placeholder="مثال: أريد توليد 10 أسئلة متنوعة وألعاب تفاعلية عن الوحدة الأولى: الخلية ومكوناتها"
                            rows={4}
                            disabled={isProcessing}
                            className="resize-none"
                        />
                        <div className="text-xs text-muted-foreground">
                            💡 نصيحة: كن محدداً قدر الإمكان (مثلاً: "الوحدة 1"، "الصفحات 10-20"، "موضوع محدد")
                        </div>
                    </div>

                    {/* Processing Status */}
                    {isProcessing && (
                        <Card className="border-blue-500/50 bg-blue-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                    <div className="flex-1">
                                        <p className="font-medium text-blue-700 dark:text-blue-300">
                                            {progress}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            قد يستغرق هذا بضع ثوانٍ...
                                        </p>
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
                                    <p className="font-medium">ملاحظات هامة:</p>
                                    <ul className="space-y-1 mr-4 list-disc text-muted-foreground">
                                        <li>الذكاء الاصطناعي سيحلل محتوى ملفات PDF، الصور، أو روابط الفيديو</li>
                                        <li>بالنسبة للفيديوهات، سيقوم النموذج بتحليل الرابط لاستنتاج المحتوى</li>
                                        <li>سيتم توليد أسئلة وألعاب متنوعة حسب طلبك</li>
                                        <li>يمكنك مراجعة وتعديل النتائج قبل الحفظ</li>
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
                            disabled={!prompt.trim() || isProcessing || (inputType === 'video' && !videoUrl.trim()) || (inputType === 'file' && !file && !prompt.trim())}
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
                                    توليد بالذكاء الاصطناعي
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default AIQuestionGenerator;
