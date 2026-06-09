import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    FileText, Sparkles, AlertCircle,
    Loader2, X, Database, Zap
} from "lucide-react";
import type { ChallengeQuestion } from "@/data/challengeTypes";
import { useToast } from "@/components/ui/use-toast";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import {
    extractPdfFromSupabase,
    extractPdfFromSupabaseAsImages,
    getTeacherPdfs,
    pdfNeedsVisualPageImages,
} from "@/lib/pdfExtractor";
import { generateGeminiContent, QUESTION_GENERATION_MODELS } from "@/lib/geminiClient";
import { normalizeGeneratedChallengeItems, parseAiGeneratedChallengeItems } from "@/lib/parseAiGeneratedQuestions";
import { aiGenContext, buildDatabaseGenerationPrompt } from "@/lib/aiQuestionGenerationPrompts";

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
        createdAt: string;
    }>>([]);
    const [selectedPdfs, setSelectedPdfs] = useState<string[]>([]);
    const [prompt, setPrompt] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState("");
    const [processingPhase, setProcessingPhase] = useState<
        "idle" | "loading" | "extracting" | "analyzing" | "generating"
    >("idle");
    const [generateType, setGenerateType] = useState<"questions" | "games" | "both">("both");
    const { toast } = useToast();
    const { t, dir, locale, language } = useDashboardLocale();

    // Load available PDFs from database
    useEffect(() => {
        const loadPdfs = async () => {
            try {
                setProcessingPhase("loading");
                const pdfs = await getTeacherPdfs(teacherId);
                setAvailablePdfs(pdfs);
                if (pdfs.length > 0) {
                    setSelectedPdfs([pdfs[0].name]);
                }
            } catch (error) {
                console.error("Error loading PDFs:", error);
                toast({
                    title: t("dash.teacher.aiGen.database.toast.loadError"),
                    description: t("dash.teacher.aiGen.database.toast.loadErrorDesc"),
                    variant: "destructive"
                });
            } finally {
                setProcessingPhase("idle");
            }
        };

        if (teacherId) {
            loadPdfs();
        }
    }, [teacherId, toast, t]);

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

    const formatUploadedAt = (createdAt: string): string => {
        const date = new Date(createdAt);
        if (Number.isNaN(date.getTime())) return createdAt;
        return date.toLocaleString(locale);
    };

    const handleGenerateFromDatabase = async () => {
        if (selectedPdfs.length === 0) {
            toast({
                title: t("dash.teacher.aiGen.database.toast.noFiles"),
                description: t("dash.teacher.aiGen.database.toast.noFilesDesc"),
                variant: "destructive"
            });
            return;
        }

        if (!prompt.trim()) {
            toast({
                title: t("dash.teacher.aiGen.toast.noPrompt"),
                description: t("dash.teacher.aiGen.toast.noPromptDesc"),
                variant: "destructive"
            });
            return;
        }

        setIsProcessing(true);

        try {
            setProcessingPhase("extracting");
            setProgress(t("dash.teacher.aiGen.database.progress.extracting"));

            const pdfContents: string[] = [];
            const pdfImages: string[] = [];

            for (const pdfName of selectedPdfs) {
                try {
                    setProgress(t("dash.teacher.aiGen.database.progress.fetching", { fileName: pdfName }));
                    const content = await extractPdfFromSupabase(teacherId, pdfName);

                    if (content.trim().length > 100) {
                        pdfContents.push(content);
                    }

                    if (pdfNeedsVisualPageImages(content)) {
                        setProgress(t("dash.teacher.aiGen.database.progress.converting", { fileName: pdfName }));
                        const images = await extractPdfFromSupabaseAsImages(teacherId, pdfName, 10, 2);
                        pdfImages.push(...images);
                    }
                } catch (error) {
                    console.error(`Error extracting ${pdfName}:`, error);
                }
            }

            if (pdfContents.length === 0 && pdfImages.length === 0) {
                throw new Error(t("dash.teacher.aiGen.database.errors.extractFailed"));
            }

            const combinedText = pdfContents.join("\n\n---\n\n");

            setProcessingPhase("analyzing");
            setProgress(t("dash.teacher.aiGen.database.progress.analyzing"));

            setProcessingPhase("generating");
            setProgress(t("dash.teacher.aiGen.database.progress.generating"));

            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error(t("dash.teacher.aiGen.errors.noGeminiKey"));
            }

            const parts: any[] = [];

            pdfImages.forEach(img => {
                parts.push({
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: img
                    }
                });
            });

            const finalPrompt = buildDatabaseGenerationPrompt(
                language,
                combinedText,
                prompt,
                generateType
            );
            parts.push({ text: finalPrompt });

            const data = (await generateGeminiContent(apiKey, {
                contents: [{ parts }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json",
                },
            }, {
                models: [...QUESTION_GENERATION_MODELS],
                onRetry: ({ attempt, delayMs, model, reason }) => {
                    const sec = Math.max(1, Math.round(delayMs / 1000));
                    setProgress(
                        t("dash.teacher.aiGen.progress.retryBusyServer", { attempt, sec, model })
                    );
                    console.warn("[Gemini retry]", { attempt, model, reason });
                },
            })) as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!responseText) {
                throw new Error(t("dash.teacher.aiGen.database.errors.noAiResult"));
            }

            const items = parseAiGeneratedChallengeItems(responseText);
            const normalizedItems = normalizeGeneratedChallengeItems(items, {
                language,
                trueLabel: t("dash.teacher.topics.qe.trueLabel"),
                falseLabel: t("dash.teacher.topics.qe.falseLabel"),
                qaFallbackAnswer: (question) => aiGenContext.qaFallbackAnswer(language, question),
                qaFallbackExplanation: aiGenContext.qaFallbackExplanation(language),
            });
            const questions: ChallengeQuestion[] = normalizedItems.map((item: any, index: number) => ({
                ...item,
                id: item.id || `db-${Date.now()}-${index}`,
                source: "pdf_extracted",
            }));

            setProcessingPhase("idle");
            toast({
                title: t("dash.teacher.aiGen.database.toast.success"),
                description: t("dash.teacher.aiGen.database.toast.successDesc", { count: questions.length })
            });

            onGenerate(questions);
        } catch (error: any) {
            console.error("Error:", error);
            setProcessingPhase("idle");
            toast({
                title: t("dash.teacher.aiGen.toast.generateError"),
                description: error.message || t("dash.teacher.aiGen.database.toast.generateErrorDesc"),
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const generateTypeOptions = [
        { value: "questions" as const, label: t("dash.teacher.aiGen.database.typeQuestions"), icon: "❓" },
        { value: "games" as const, label: t("dash.teacher.aiGen.database.typeGames"), icon: "🎮" },
        { value: "both" as const, label: t("dash.teacher.aiGen.database.typeBoth"), icon: "🎯" },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            dir={dir}
        >
            <Card className="border-2 border-primary/20">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            <CardTitle>{t("dash.teacher.aiGen.database.title")}</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onCancel}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    {availablePdfs.length > 0 ? (
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">{t("dash.teacher.aiGen.database.selectPdfs")}</Label>
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
                                                {formatFileSize(pdf.size)} • {formatUploadedAt(pdf.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                            <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                            <p className="font-medium mb-1">{t("dash.teacher.aiGen.database.noPdfs")}</p>
                            <p className="text-sm text-muted-foreground">
                                {t("dash.teacher.aiGen.database.noPdfsHint")}
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <Label className="text-base font-semibold">{t("dash.teacher.aiGen.database.generateType")}</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {generateTypeOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setGenerateType(option.value)}
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

                    <div className="space-y-2">
                        <Label htmlFor="instructions" className="text-base font-semibold">
                            {t("dash.teacher.aiGen.database.instructions")}
                        </Label>
                        <Textarea
                            id="instructions"
                            placeholder={t("dash.teacher.aiGen.database.instructionsPlaceholder")}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={isProcessing}
                            className="min-h-24 resize-none"
                        />
                    </div>

                    {isProcessing && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-sm font-medium text-primary">{progress}</span>
                            </div>
                            <div className="flex gap-2">
                                {(["extracting", "analyzing", "generating"] as const).map(phase => (
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

                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={handleGenerateFromDatabase}
                            disabled={isProcessing || selectedPdfs.length === 0 || !prompt.trim()}
                            className="flex-1 gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t("dash.teacher.aiGen.btn.generating")}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    {t("dash.teacher.aiGen.database.btnGenerate")}
                                </>
                            )}
                        </Button>
                        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
                            {t("dash.common.cancel")}
                        </Button>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                        <Zap className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800">
                            {t("dash.teacher.aiGen.database.info")}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default AIQuestionGeneratorFromDatabase;
