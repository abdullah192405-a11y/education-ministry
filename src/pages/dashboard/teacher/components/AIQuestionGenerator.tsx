import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Upload, FileText, Sparkles, AlertCircle,
    Loader2, X, FileUp, Wand2, Image as ImageIcon, Video, Link2, Headphones, FileType
} from "lucide-react";
import type { ChallengeQuestion } from "@/data/challengeTypes";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { extractPdfText, extractPdfAsImages, pdfNeedsVisualPageImages } from "@/lib/pdfExtractor";
import { generateGeminiContent } from "@/lib/geminiClient";
import { normalizeGeneratedChallengeItems, parseAiGeneratedChallengeItems } from "@/lib/parseAiGeneratedQuestions";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { aiGenContext, buildUploadGenerationPrompt, buildAudioTranscriptionPrompt } from "@/lib/aiQuestionGenerationPrompts";
import { cn } from "@/lib/utils";

const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|m4a|aac|webm|flac|opus)$/i;

const guessAudioMimeType = (fileName: string, fallback = "audio/mpeg"): string => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".wav")) return "audio/wav";
    if (lower.endsWith(".ogg")) return "audio/ogg";
    if (lower.endsWith(".m4a")) return "audio/mp4";
    if (lower.endsWith(".aac")) return "audio/aac";
    if (lower.endsWith(".webm")) return "audio/webm";
    if (lower.endsWith(".flac")) return "audio/flac";
    if (lower.endsWith(".opus")) return "audio/ogg";
    return fallback;
};

const isAudioFile = (file: File): boolean =>
    file.type.startsWith("audio/") || AUDIO_EXTENSIONS.test(file.name);

type UploadSourceType = "pdf" | "image" | "audio" | "video";

interface AIQuestionGeneratorProps {
    onGenerate: (questions: ChallengeQuestion[]) => void;
    onCancel: () => void;
}

const AIQuestionGenerator = ({ onGenerate, onCancel }: AIQuestionGeneratorProps) => {
    const [inputType, setInputType] = useState<UploadSourceType>("pdf");
    const [videoUrl, setVideoUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<"pdf" | "image" | "audio" | null>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const [prompt, setPrompt] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState("");
    const { toast } = useToast();
    const { t, dir, language, isRtl, textAlign } = useDashboardLocale();

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

    const clearSelectedFile = () => {
        setFile(null);
        setFileType(null);
    };

    const handleSourceTabChange = (value: string) => {
        const next = value as UploadSourceType;
        setInputType(next);
        if (next === "video" || (fileType && fileType !== next)) {
            clearSelectedFile();
        }
    };

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        expectedType: "pdf" | "image" | "audio"
    ) => {
        const selectedFile = e.target.files?.[0];
        e.target.value = "";
        if (!selectedFile) return;

        const isValid =
            expectedType === "pdf"
                ? selectedFile.type === "application/pdf"
                : expectedType === "image"
                    ? selectedFile.type.startsWith("image/")
                    : isAudioFile(selectedFile);

        if (!isValid) {
            toast({
                title: t("dash.teacher.aiGen.upload.toast.invalidFileType"),
                description:
                    expectedType === "pdf"
                        ? t("dash.teacher.aiGen.upload.toast.invalidPdfDesc")
                        : expectedType === "image"
                            ? t("dash.teacher.aiGen.upload.toast.invalidImageDesc")
                            : t("dash.teacher.aiGen.upload.toast.invalidAudioDesc"),
                variant: "destructive",
            });
            return;
        }

        setFile(selectedFile);
        setFileType(expectedType);
        toast({
            title:
                expectedType === "pdf"
                    ? t("dash.teacher.aiGen.upload.toast.pdfSelected")
                    : expectedType === "image"
                        ? t("dash.teacher.aiGen.upload.toast.imageSelected")
                        : t("dash.teacher.aiGen.upload.toast.audioSelected"),
            description: selectedFile.name,
        });
    };

    const renderFileSelection = () => {
        if (!file) return null;
        const Icon =
            fileType === "pdf" ? FileText : fileType === "audio" ? Headphones : ImageIcon;
        return (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate" title={file.name}>{file.name}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={clearSelectedFile}
                    disabled={isProcessing}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        );
    };

    const renderFileUploadTab = (
        kind: "pdf" | "image" | "audio",
        inputRef: React.RefObject<HTMLInputElement | null>,
        accept: string,
        hintKey: "dash.teacher.aiGen.upload.pdfHint" | "dash.teacher.aiGen.upload.imageHint" | "dash.teacher.aiGen.upload.audioHint",
        Icon: typeof FileText
    ) => (
        <TabsContent value={kind} className="space-y-3 mt-4">
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => handleFileChange(e, kind)}
                disabled={isProcessing}
            />
            <Button
                type="button"
                variant="outline"
                className="w-full gap-2 h-11"
                onClick={() => inputRef.current?.click()}
                disabled={isProcessing}
            >
                <Upload className="w-4 h-4 shrink-0" />
                {t("dash.teacher.aiGen.upload.chooseFile")}
            </Button>
            {renderFileSelection()}
            {!file && (
                <p className={cn("text-xs text-muted-foreground flex items-start gap-2", textAlign)}>
                    <Icon className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground/70" />
                    {t(hintKey)}
                </p>
            )}
        </TabsContent>
    );

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast({
                title: t("dash.teacher.aiGen.toast.noPrompt"),
                description: t("dash.teacher.aiGen.toast.noPromptDesc"),
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);

        try {
            let extractedText = "";
            let imagePart: any = null;

            if (inputType !== "video" && file) {
                setProgress(t("dash.teacher.aiGen.upload.progress.analyzingFile"));
                if (file.type.includes("image")) {
                    const base64Data = await fileToBase64(file);
                    imagePart = {
                        inline_data: {
                            mime_type: file.type,
                            data: base64Data
                        }
                    };
                    extractedText = aiGenContext.imageForAnalysis(language);
                } else if (file.type === "application/pdf") {
                    setProgress(t("dash.teacher.aiGen.upload.progress.analyzingPdf"));
                    // Try text extraction first
                    extractedText = await extractPdfText(file);

                    // Printed / scanned PDFs have no text layer — send page images for vision (Gemini reads them)
                    if (pdfNeedsVisualPageImages(extractedText)) {
                        setProgress(t("dash.teacher.aiGen.upload.progress.convertingPdf"));
                        const pdfImages = await extractPdfAsImages(file, 10, 2);
                        if (pdfImages.length === 0) {
                            throw new Error(t("dash.teacher.aiGen.upload.errors.pdfConvertFailed"));
                        }
                        (window as any)._pendingPdfImages = pdfImages;
                    }
                } else if (fileType === "audio" || isAudioFile(file)) {
                    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                    if (!apiKey) {
                        throw new Error(t("dash.teacher.aiGen.errors.noGeminiKey"));
                    }
                    setProgress(t("dash.teacher.aiGen.resources.progress.transcribingFile", { fileName: file.name }));
                    const base64Data = await fileToBase64(file);
                    const mimeType = file.type || guessAudioMimeType(file.name);
                    const transcription = (await generateGeminiContent(apiKey, {
                        contents: [{
                            parts: [
                                {
                                    inline_data: {
                                        mime_type: mimeType,
                                        data: base64Data,
                                    },
                                },
                                { text: buildAudioTranscriptionPrompt(language) },
                            ],
                        }],
                        generationConfig: {
                            temperature: 0.1,
                            topK: 20,
                            topP: 0.9,
                            maxOutputTokens: 8192,
                        },
                    }, {
                        models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"],
                    })) as {
                        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                    };
                    const transcriptText = transcription.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
                    if (!transcriptText) {
                        throw new Error(t("dash.teacher.aiGen.upload.errors.audioTranscribeFailed"));
                    }
                    extractedText = aiGenContext.audioTranscriptChunk(language, file.name, transcriptText);
                }
            } else if (inputType === "video" && videoUrl) {
                setProgress(t("dash.teacher.aiGen.upload.progress.extractingVideo"));

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
                                extractedText =
                                    aiGenContext.youtubeTranscriptPrefix(language) +
                                    transcriptData.transcript.map((t: any) => t.text).join(" ");
                                setProgress(t("dash.teacher.aiGen.upload.progress.videoExtracted"));
                            }
                        }
                    } catch (e) {
                        console.warn("Transcript API error", e);
                    }
                }

                if (!extractedText) {
                    // Fallback to oEmbed if transcript failed - now with more specific extraction
                    try {
                        setProgress(t("dash.teacher.aiGen.upload.progress.gatheringVideoInfo"));
                        const oEmbedRes = await fetch(`https://www.youtube.com/oembed?url=${videoUrl}&format=json`);
                        if (oEmbedRes.ok) {
                            const data = await oEmbedRes.json();
                            extractedText = aiGenContext.youtubeMetadataBlock(
                                language,
                                data.title,
                                data.author_name,
                                videoUrl
                            );
                        }
                    } catch (e) {
                        extractedText = aiGenContext.youtubeLinkOnly(language, videoUrl);
                    }
                }
            }
            else {
                setProgress(t("dash.teacher.aiGen.upload.progress.preparing"));
                extractedText = aiGenContext.noFileOrLink(language);
            }

            // Step 2: Call Gemini API
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error(t("dash.teacher.aiGen.errors.noGeminiKey"));
            }

            const parts: any[] = [];

            if (imagePart) {
                parts.push(imagePart);
            }

            // Add PDF images if any were generated
            let hadPdfPageImages = false;
            if ((window as any)._pendingPdfImages) {
                hadPdfPageImages = (window as any)._pendingPdfImages.length > 0;
                (window as any)._pendingPdfImages.forEach((img: string) => {
                    parts.push({
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: img
                        }
                    });
                });
                delete (window as any)._pendingPdfImages;
            }

            const sourceContextForPrompt =
                inputType === "pdf" &&
                    file?.type === "application/pdf" &&
                    hadPdfPageImages &&
                    !extractedText.trim()
                    ? aiGenContext.scannedPdfNoText(language)
                    : extractedText;

            parts.push({ text: buildUploadGenerationPrompt(language, sourceContextForPrompt, prompt) });

            setProgress(t("dash.teacher.aiGen.upload.progress.generating"));
            const data = (await generateGeminiContent(apiKey, {
                contents: [{ parts }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json",
                },
            }, {
                onRetry: ({ attempt, delayMs, model, reason }) => {
                    const sec = Math.max(1, Math.round(delayMs / 1000));
                    setProgress(
                        t("dash.teacher.aiGen.progress.retryBusy", { attempt, sec, model })
                    );
                    console.warn("[Gemini retry]", { attempt, model, reason });
                },
            })) as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };

            setProgress(t("dash.teacher.aiGen.upload.progress.processing"));
            const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!generatedText) {
                throw new Error(t("dash.teacher.aiGen.errors.noContentGenerated"));
            }

            const items = parseAiGeneratedChallengeItems(generatedText);
            const normalizedItems = normalizeGeneratedChallengeItems(items, {
                language,
                trueLabel: t("dash.teacher.topics.qe.trueLabel"),
                falseLabel: t("dash.teacher.topics.qe.falseLabel"),
                qaFallbackAnswer: (question) => aiGenContext.qaFallbackAnswer(language, question),
                qaFallbackExplanation: aiGenContext.qaFallbackExplanation(language),
            });
            const questions = normalizedItems.map((item: any, index: number) => ({
                ...item,
                id: item.id || Date.now() + index,
            })) as ChallengeQuestion[];

            if (questions.length === 0) {
                throw new Error(t("dash.teacher.aiGen.errors.noValidQuestions"));
            }

            setProgress(t("dash.teacher.aiGen.upload.progress.success"));
            toast({
                title: t("dash.teacher.aiGen.toast.generateSuccess"),
                description: t("dash.teacher.aiGen.toast.generateSuccessCount", { count: questions.length }),
            });

            // Delay to show success message
            setTimeout(() => {
                onGenerate(questions);
            }, 1000);

        } catch (error) {
            console.error("Error generating questions:", error);
            toast({
                title: t("dash.teacher.aiGen.toast.generateError"),
                description: error instanceof Error ? error.message : t("dash.teacher.aiGen.toast.unexpectedError"),
                variant: "destructive",
            });
            setProgress("");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
            dir={dir}
        >
            <Card dir={dir} className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Wand2 className="w-6 h-6 text-primary shrink-0" />
                        {t("dash.teacher.aiGen.upload.title")}
                    </CardTitle>
                    <p className={cn("text-sm text-muted-foreground mt-2", textAlign)}>
                        {t("dash.teacher.aiGen.upload.subtitle")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Step 1: Content Source */}
                    <div className="space-y-4">
                        <Label className="text-base font-bold flex items-center gap-2">
                            <FileUp className="w-5 h-5 shrink-0" />
                            {t("dash.teacher.aiGen.upload.step1")}
                        </Label>

                        <Tabs value={inputType} onValueChange={handleSourceTabChange} dir={dir} className="w-full">
                            <TabsList
                                dir={dir}
                                className="flex w-full h-auto gap-1 p-1 flex-wrap sm:flex-nowrap"
                            >
                                <TabsTrigger
                                    value="pdf"
                                    className="flex-1 gap-1.5 text-xs sm:text-sm py-2 min-w-[calc(50%-0.25rem)] sm:min-w-0"
                                >
                                    <FileType className="w-4 h-4 shrink-0" />
                                    {t("dash.teacher.topics.editor.mediaType.pdf")}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="image"
                                    className="flex-1 gap-1.5 text-xs sm:text-sm py-2 min-w-[calc(50%-0.25rem)] sm:min-w-0"
                                >
                                    <ImageIcon className="w-4 h-4 shrink-0" />
                                    {t("dash.teacher.topics.editor.mediaType.image")}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="audio"
                                    className="flex-1 gap-1.5 text-xs sm:text-sm py-2 min-w-[calc(50%-0.25rem)] sm:min-w-0"
                                >
                                    <Headphones className="w-4 h-4 shrink-0" />
                                    {t("dash.teacher.topics.editor.mediaType.audio")}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="video"
                                    className="flex-1 gap-1.5 text-xs sm:text-sm py-2 min-w-[calc(50%-0.25rem)] sm:min-w-0"
                                >
                                    <Video className="w-4 h-4 shrink-0" />
                                    {t("dash.teacher.aiGen.upload.tabVideo")}
                                </TabsTrigger>
                            </TabsList>

                            {renderFileUploadTab(
                                "pdf",
                                pdfInputRef,
                                ".pdf,application/pdf",
                                "dash.teacher.aiGen.upload.pdfHint",
                                FileType
                            )}
                            {renderFileUploadTab(
                                "image",
                                imageInputRef,
                                "image/*",
                                "dash.teacher.aiGen.upload.imageHint",
                                ImageIcon
                            )}
                            {renderFileUploadTab(
                                "audio",
                                audioInputRef,
                                "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm,.flac,.opus",
                                "dash.teacher.aiGen.upload.audioHint",
                                Headphones
                            )}

                            <TabsContent value="video" className="space-y-3 mt-4">
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Link2 className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                        <Input
                                            type="url"
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            value={videoUrl}
                                            onChange={(e) => setVideoUrl(e.target.value)}
                                            className="ps-10 font-mono text-sm"
                                            dir="ltr"
                                            disabled={isProcessing}
                                        />
                                    </div>
                                    <p className={cn("text-xs text-muted-foreground", textAlign)}>
                                        {t("dash.teacher.aiGen.upload.videoHint")}
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Step 2: Enter Prompt */}
                    <div className="space-y-3">
                        <Label className="text-base font-bold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 shrink-0" />
                            {t("dash.teacher.aiGen.step2Title")}
                        </Label>
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={t("dash.teacher.aiGen.promptPlaceholder")}
                            rows={4}
                            disabled={isProcessing}
                            dir={dir}
                            className={cn("resize-none", textAlign)}
                        />
                        <div className={cn("text-xs text-muted-foreground", textAlign)}>
                            {t("dash.teacher.aiGen.promptTip")}
                        </div>
                    </div>

                    {/* Processing Status */}
                    {isProcessing && (
                        <Card className="border-blue-500/50 bg-blue-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                                    <div className={cn("flex-1", textAlign)}>
                                        <p className="font-medium text-blue-700 dark:text-blue-300">
                                            {progress}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {t("dash.teacher.aiGen.progress.mayTakeSeconds")}
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
                                <div className={cn("text-sm space-y-2 flex-1", textAlign)}>
                                    <p className="font-medium">{t("dash.teacher.aiGen.upload.notesTitle")}</p>
                                    <ul className="space-y-1 list-disc text-muted-foreground ps-4">
                                        <li>{t("dash.teacher.aiGen.upload.notes1")}</li>
                                        <li>{t("dash.teacher.aiGen.upload.notes2")}</li>
                                        <li>{t("dash.teacher.aiGen.upload.notes3")}</li>
                                        <li>{t("dash.teacher.aiGen.upload.notes4")}</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className={cn("flex gap-3 pt-4 border-t", isRtl ? "justify-start" : "justify-end")}>
                        {isRtl ? (
                            <>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={!prompt.trim() || isProcessing || (inputType === "video" && !videoUrl.trim())}
                                    className={cn(
                                        "gap-2 bg-gradient-to-l from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                    )}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {t("dash.teacher.aiGen.btn.generating")}
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-4 h-4" />
                                            {t("dash.teacher.aiGen.btn.generate")}
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={onCancel}
                                    disabled={isProcessing}
                                    className="gap-2"
                                >
                                    <X className="w-4 h-4 shrink-0" />
                                    {t("dash.common.cancel")}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={onCancel}
                                    disabled={isProcessing}
                                    className="gap-2"
                                >
                                    <X className="w-4 h-4 shrink-0" />
                                    {t("dash.common.cancel")}
                                </Button>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={!prompt.trim() || isProcessing || (inputType === "video" && !videoUrl.trim())}
                                    className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {t("dash.teacher.aiGen.btn.generating")}
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-4 h-4" />
                                            {t("dash.teacher.aiGen.btn.generate")}
                                        </>
                                    )}
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default AIQuestionGenerator;
