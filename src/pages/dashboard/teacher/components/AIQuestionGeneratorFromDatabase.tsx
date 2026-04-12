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
    Loader2, X, Wand2, Database, Zap, Download
} from "lucide-react";
import type { ChallengeQuestion } from "@/data/challengeTypes";
import { useToast } from "@/components/ui/use-toast";
import {
    extractPdfFromSupabase,
    extractPdfFromSupabaseAsImages,
    getTeacherPdfs,
    pdfNeedsVisualPageImages,
} from "@/lib/pdfExtractor";
import { generateGeminiContent } from "@/lib/geminiClient";
import { parseAiGeneratedChallengeItems } from "@/lib/parseAiGeneratedQuestions";

interface AIQuestionGeneratorFromDatabaseProps {
    teacherId: string;
    onGenerate: (questions: ChallengeQuestion[]) => void;
    onCancel: () => void;
}

const AIQuestionGeneratorFromDatabase = ({
    teacherId,
    onGenerate,
    onCancel
}: AIQuestionGeneratorFromDatabaseProps) => {
    const [availablePdfs, setAvailablePdfs] = useState<Array<{
        name: string;
        size: number;
        uploadedAt: string;
    }>>([]);
    const [selectedPdfs, setSelectedPdfs] = useState<string[]>([]);
    const [prompt, setPrompt] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState("");
    const [processingPhase, setProcessingPhase] = useState<
        "idle" | "loading" | "extracting" | "analyzing" | "generating"
    >("idle");
    const [generateType, setGenerateType] = useState<"questions" | "games" | "both">("both");
    const [extractedContentPreview, setExtractedContentPreview] = useState<Map<string, string>>(new Map());
    const { toast } = useToast();

    // Load available PDFs from database
    useEffect(() => {
        const loadPdfs = async () => {
            try {
                setProcessingPhase("loading");
                const pdfs = await getTeacherPdfs(teacherId);
                setAvailablePdfs(pdfs);
                if (pdfs.length > 0) {
                    setSelectedPdfs([pdfs[0].name]); // Select first PDF by default
                }
            } catch (error) {
                console.error("Error loading PDFs:", error);
                toast({
                    title: "خطأ في تحميل الملفات",
                    description: "فشل تحميل ملفات PDF من التخزين",
                    variant: "destructive"
                });
            } finally {
                setProcessingPhase("idle");
            }
        };

        if (teacherId) {
            loadPdfs();
        }
    }, [teacherId, toast]);

    const togglePdfSelection = (fileName: string) => {
        setSelectedPdfs(prev =>
            prev.includes(fileName)
                ? prev.filter(name => name !== fileName)
                : [...prev, fileName]
        );
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
    };

    const handleGenerateFromDatabase = async () => {
        if (selectedPdfs.length === 0) {
            toast({
                title: "لم يتم اختيار ملفات",
                description: "يرجى اختيار ملف PDF واحد على الأقل",
                variant: "destructive"
            });
            return;
        }

        if (!prompt.trim()) {
            toast({
                title: "لم يتم إدخال التعليمات",
                description: "يرجى إدخال تعليمات واضحة لتوليد الأسئلة",
                variant: "destructive"
            });
            return;
        }

        setIsProcessing(true);

        try {
            setProcessingPhase("extracting");
            setProgress("جاري استخراج محتوى ملفات PDF من قاعدة البيانات...");

            // Extract content from all selected PDFs
            const pdfContents: string[] = [];
            const pdfImages: string[] = [];
            
            for (const pdfName of selectedPdfs) {
                try {
                    setProgress(`جاري جلب وتحليل ملف: ${pdfName}...`);
                    const content = await extractPdfFromSupabase(teacherId, pdfName);
                    
                    if (content.trim().length > 100) {
                        pdfContents.push(content);
                        setExtractedContentPreview(prev => new Map(prev).set(pdfName, content.substring(0, 500)));
                    }
                    
                    if (pdfNeedsVisualPageImages(content)) {
                        setProgress(`جاري تحويل ${pdfName} لصور للتحليل البصري...`);
                        const images = await extractPdfFromSupabaseAsImages(teacherId, pdfName, 10, 2);
                        pdfImages.push(...images);
                    }
                } catch (error) {
                    console.error(`Error extracting ${pdfName}:`, error);
                }
            }

            if (pdfContents.length === 0 && pdfImages.length === 0) {
                throw new Error("فشل استخراج محتوى أي ملف PDF");
            }

            const combinedText = pdfContents.join("\n\n---\n\n");

            setProcessingPhase("analyzing");
            setProgress("جاري تحليل محتوى PDF...");

            setProcessingPhase("generating");
            setProgress("جاري تحليل المحتوى وتوليد الأسئلة...");

            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("لم يتم تكوين مفتاح Gemini API");
            }

            const parts: any[] = [];
            
            // Add images if any
            pdfImages.forEach(img => {
                parts.push({
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: img
                    }
                });
            });

            const finalPrompt = `أنت مساعد ذكي متخصص في إنشاء أسئلة تعليمية وألعاب تفاعلية.
يجب عليك تحليل **كامل** المصادر المقدمة (سواء كانت نصوصاً مستخرجة أو صوراً لصفحات PDF).
قم بإجراء تحليل بصري (OCR) دقيق للصور المرفقة.

المحتوى النصي المستخرج:
${combinedText}

طلب المعلم:
${prompt}

متطلبات التوليد:
${generateType !== "games" ? "- توليد أسئلة تعليمية (اختيار متعدد، صح وخطأ، إلخ)" : ""}
${generateType !== "questions" ? "- توليد ألعاب تعليمية تفاعلية (مطابقة، ترتيب، إلخ)" : ""}
- التزم تماماً بمحتوى الملفات المرفقة ولا تخرج عنها.
- العودة بتنسيق JSON array من العناصر التعليمية.

مثال للتنسيق:
[
  {
    "type": "multiple_choice",
    "question": "سؤال...",
    "options": ["خيار 1", "خيار 2"],
    "correctAnswer": 0
  }
]
`;
            parts.push({ text: finalPrompt });

            const data = (await generateGeminiContent(apiKey, {
                contents: [{ parts }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json",
                },
            }, {
                onRetry: ({ attempt, delayMs, model, reason }) => {
                    const sec = Math.max(1, Math.round(delayMs / 1000));
                    setProgress(
                        `ازدحام مؤقت على الخادم — إعادة المحاولة ${attempt} بعد ~${sec}ث (${model})…`
                    );
                    console.warn("[Gemini retry]", { attempt, model, reason });
                },
            })) as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!responseText) {
                throw new Error("لم يتم الحصول على نتيجة من AI");
            }

            const items = parseAiGeneratedChallengeItems(responseText);
            const questions: ChallengeQuestion[] = items.map((item: any, index: number) => ({
                ...item,
                id: item.id || `db-${Date.now()}-${index}`,
                source: "pdf_extracted",
            }));

            setProcessingPhase("idle");
            toast({
                title: "تم التوليد بنجاح ✓",
                description: `تم توليد ${questions.length} أسئلة/ألعاب من محتوى PDF`
            });

            onGenerate(questions);
        } catch (error: any) {
            console.error("Error:", error);
            setProcessingPhase("idle");
            toast({
                title: "خطأ في التوليد",
                description: error.message || "حدث خطأ أثناء توليد الأسئلة والألعاب",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
        >
            <Card className="border-2 border-primary/20">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            <CardTitle>توليد من ملفات PDF المرفوعة</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onCancel}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    {/* Available PDFs */}
                    {availablePdfs.length > 0 ? (
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">اختر ملفات PDF:</Label>
                            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                                {availablePdfs.map((pdf) => (
                                    <div
                                        key={pdf.name}
                                        className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors"
                                    >
                                        <Checkbox
                                            checked={selectedPdfs.includes(pdf.name)}
                                            onCheckedChange={() => togglePdfSelection(pdf.name)}
                                        />
                                        <FileText className="w-4 h-4 text-orange-500" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate text-sm">{pdf.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatFileSize(pdf.size)} • {pdf.uploadedAt}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                            <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                            <p className="font-medium mb-1">لا توجد ملفات PDF</p>
                            <p className="text-sm text-muted-foreground">
                                يرجى تحميل ملفات PDF أولاً في قسم المحتوى
                            </p>
                        </div>
                    )}

                    {/* Generate Type Selection */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">نوع التوليد:</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: "questions", label: "أسئلة فقط", icon: "❓" },
                                { value: "games", label: "ألعاب فقط", icon: "🎮" },
                                { value: "both", label: "أسئلة و ألعاب", icon: "🎯" }
                            ].map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setGenerateType(option.value as any)}
                                    className={`p-3 rounded-lg border-2 transition-all ${generateType === option.value
                                        ? "border-primary bg-primary/5"
                                        : "border-gray-200 hover:border-primary/50"
                                        }`}
                                >
                                    <div className="text-2xl mb-1">{option.icon}</div>
                                    <p className="text-sm font-medium">{option.label}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-2">
                        <Label htmlFor="instructions" className="text-base font-semibold">
                            تعليمات التوليد:
                        </Label>
                        <Textarea
                            id="instructions"
                            placeholder="مثال: توليد 5 أسئلة اختيار من متعدد عن المحتوى الرئيسي، وإضافة ألعاب تطابق للمفاهيم الأساسية"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={isProcessing}
                            className="min-h-24 resize-none"
                        />
                    </div>

                    {/* Progress */}
                    {isProcessing && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-sm font-medium text-primary">{progress}</span>
                            </div>
                            <div className="flex gap-2">
                                {["extracting", "analyzing", "generating"].map(phase => (
                                    <div
                                        key={phase}
                                        className={`h-2 flex-1 rounded-full transition-colors ${processingPhase === phase
                                            ? "bg-primary animate-pulse"
                                            : processingPhase === "idle" ||
                                                ["extracting", "analyzing", "generating"].indexOf(processingPhase) >
                                                ["extracting", "analyzing", "generating"].indexOf(phase)
                                                ? "bg-primary/30"
                                                : "bg-gray-200"
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={handleGenerateFromDatabase}
                            disabled={isProcessing || selectedPdfs.length === 0 || !prompt.trim()}
                            className="flex-1 gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    جاري التوليد...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    توليد من PDF
                                </>
                            )}
                        </Button>
                        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
                            إلغاء
                        </Button>
                    </div>

                    {/* Info Badge */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                        <Zap className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800">
                            يتم استخراج محتوى PDF من قاعدة البيانات وتحليله بواسطة Gemini AI لتوليد أسئلة وألعاب تعليمية ذكية
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default AIQuestionGeneratorFromDatabase;
