import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Upload, FileText, Sparkles, AlertCircle, CheckCircle2,
    Loader2, X, FileUp, Wand2, Image as ImageIcon
} from "lucide-react";
import type { ChallengeQuestion } from "@/data/challengeTypes";
import { useToast } from "@/components/ui/use-toast";

interface AIQuestionGeneratorProps {
    onGenerate: (questions: ChallengeQuestion[]) => void;
    onCancel: () => void;
}

const AIQuestionGenerator = ({ onGenerate, onCancel }: AIQuestionGeneratorProps) => {
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
            let imagePart = null;

            // Step 1: Read File Content
            if (file) {
                if (fileType === "pdf") {
                    setProgress("جاري قراءة ملف PDF...");
                    extractedText = await extractPdfText(file);
                } else if (fileType === "image") {
                    setProgress("جاري معالجة الصورة...");
                    const base64Data = await fileToBase64(file);
                    imagePart = {
                        inline_data: {
                            mime_type: file.type,
                            data: base64Data
                        }
                    };
                    extractedText = "[تم رفع صورة للتحليل]";
                }
            } else {
                setProgress("جاري التحضير...");
                extractedText = "لم يتم رفع ملف. سيعتمد التوليد على التعليمات المقدمة فقط.";
            }

            setProgress("جاري التواصل مع Gemini AI...");

            // Step 2: Call Gemini API
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("لم يتم تكوين مفتاح Gemini API");
            }

            const modelName = "gemini-2.5-flash"; // Reverted to 2.5-flash as requested by user

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
مهمتك الأساسية هي توليد محتوى مستنداً **حصرياً** على الملف المرفق (صورة أو PDF).

المحتوى التعليمي من الملف المرفق:
${fileContent}

طلب المعلم:
${userPrompt}

يرجى إنشاء أسئلة وألعاب تفاعلية بناءً **فقط** على المعلومات الموجودة في الملف المرفق، مع الالتزام بالتنسيق التالي بدقة. لا تستخدم أي معلومات خارجية أو معرفة عامة.

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
                    {/* Step 1: Upload File */}
                    <div className="space-y-3">
                        <Label className="text-base font-bold flex items-center gap-2">
                            <FileUp className="w-5 h-5" />
                            الخطوة 1: رفع ملف (PDF أو صورة)
                        </Label>
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
                                        <li>الذكاء الاصطناعي سيحلل محتوى الـ PDF أو الصور ويستخدمها كمرجع</li>
                                        <li>سيتم توليد أسئلة وألعاب متنوعة حسب طلبك</li>
                                        <li>يمكنك مراجعة وتعديل النتائج قبل الحفظ</li>
                                        <li>تأكد من وجود مفتاح Gemini API في ملف .env</li>
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
                            disabled={!prompt.trim() || isProcessing}
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
