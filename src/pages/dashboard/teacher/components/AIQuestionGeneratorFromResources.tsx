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
    Database, Brain, Zap, Headphones, Link2
} from "lucide-react";
import type { ChallengeQuestion, ContentMedia } from "@/data/challengeTypes";
import { useToast } from "@/components/ui/use-toast";
import { extractPdfText, extractPdfAsImages, pdfNeedsVisualPageImages } from "@/lib/pdfExtractor";
import { generateGeminiContent } from "@/lib/geminiClient";
import { normalizeChallengeItemType } from "@/lib/challengeItemNormalize";
import { normalizeGeneratedChallengeItems, parseAiGeneratedChallengeItems } from "@/lib/parseAiGeneratedQuestions";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n/translations";
import {
    aiGenContext,
    buildAudioTranscriptionPrompt,
    buildQuestionGenRepairPrompt,
    buildResourcesGenerationPrompt,
} from "@/lib/aiQuestionGenerationPrompts";

interface AIQuestionGeneratorFromResourcesProps {
    media: ContentMedia[];
    onGenerate: (questions: ChallengeQuestion[]) => void;
    onCancel: () => void;
}

type GenerateMode = "questions" | "games" | "both";
type QuestionType = "multiple_choice" | "true_false" | "qa" | "know_dont_know" | "order_questions";
type GameType = "matching" | "shooting" | "wheel_spin" | "puzzle";
type ChallengeType = QuestionType | GameType;

const QUESTION_TYPES: QuestionType[] = [
    "multiple_choice",
    "true_false",
    "qa",
    "know_dont_know",
    "order_questions",
];

const GAME_TYPES: GameType[] = [
    "matching",
    "shooting",
    "wheel_spin",
    "puzzle",
];

const ALL_CHALLENGE_TYPES: ChallengeType[] = [...QUESTION_TYPES, ...GAME_TYPES];

const CHALLENGE_TYPE_KEYS: Record<ChallengeType, TranslationKey> = {
    multiple_choice: "dash.teacher.topics.qe.multipleChoice",
    true_false: "dash.teacher.topics.qe.trueFalse",
    qa: "dash.teacher.topics.qe.qa",
    know_dont_know: "dash.teacher.topics.qe.knowDontKnow",
    order_questions: "dash.teacher.topics.qe.orderQuestions",
    matching: "dash.teacher.topics.editor.type.matching",
    shooting: "dash.teacher.topics.qe.shooting",
    wheel_spin: "dash.teacher.topics.qe.wheelSpin",
    puzzle: "dash.teacher.topics.qe.puzzle",
};

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
    const [generateType, setGenerateType] = useState<GenerateMode>("both");
    const [targetCount, setTargetCount] = useState(0);
    const [selectedChallengeTypes, setSelectedChallengeTypes] = useState<ChallengeType[]>([]);
    const { toast } = useToast();
    const { t, dir, language, isRtl, textAlign } = useDashboardLocale();

    const getChallengeTypeLabel = (type: ChallengeType) => t(CHALLENGE_TYPE_KEYS[type]);

    const getGeminiApiKey = (): string => {
        const key = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
        const looksLikePlaceholder =
            !key ||
            key === "your_gemini_api_key_here" ||
            key.toLowerCase().includes("replace_me");
        if (looksLikePlaceholder) {
            throw new Error(t("dash.teacher.aiGen.resources.errors.geminiKeyInvalid"));
        }
        return key;
    };

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

    const toggleChallengeType = (type: ChallengeType) => {
        setSelectedChallengeTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );
    };

    const getAllowedTypesForMode = (
        mode: GenerateMode,
        selectedTypes: ChallengeType[]
    ): ChallengeType[] => {
        if (mode === "questions") return selectedTypes.filter((type) => QUESTION_TYPES.includes(type as QuestionType));
        if (mode === "games") return selectedTypes.filter((type) => GAME_TYPES.includes(type as GameType));
        return selectedTypes;
    };

    const getVisibleTypesForMode = (mode: GenerateMode): ChallengeType[] => {
        if (mode === "questions") return QUESTION_TYPES;
        if (mode === "games") return GAME_TYPES;
        return ALL_CHALLENGE_TYPES;
    };

    const getMediaIcon = (type: ContentMedia["type"]) => {
        switch (type) {
            case "video": return <Video className="w-4 h-4 text-red-500" />;
            case "image": return <Image className="w-4 h-4 text-blue-500" />;
            case "text": return <FileText className="w-4 h-4 text-green-500" />;
            case "pdf": return <FileType className="w-4 h-4 text-orange-500" />;
            case "audio": return <Headphones className="w-4 h-4 text-violet-500" />;
            case "link": return <Link2 className="w-4 h-4 text-sky-600" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const getMediaLabel = (type: ContentMedia["type"]) => {
        switch (type) {
            case "video": return t("dash.teacher.aiGen.resources.media.video");
            case "image": return t("dash.teacher.aiGen.resources.media.image");
            case "text": return t("dash.teacher.aiGen.resources.media.text");
            case "pdf": return t("dash.teacher.aiGen.resources.media.pdf");
            case "audio": return t("dash.teacher.aiGen.resources.media.audio");
            case "link": return t("dash.teacher.aiGen.resources.media.link");
            default: return type;
        }
    };

    const normalizeExternalUrl = (raw?: string): string => {
        const t = (raw || "").trim();
        if (!t) return "";
        if (/^https?:\/\//i.test(t)) return t;
        return `https://${t}`;
    };

    const guessMimeTypeFromUrl = (url: string): string => {
        const lower = url.toLowerCase();
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".m4a")) return "audio/mp4";
        if (lower.endsWith(".aac")) return "audio/aac";
        return "audio/mpeg";
    };

    const toBase64 = (blob: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result?.toString() || "";
                const base64 = result.split(",")[1] || "";
                if (!base64) reject(new Error(t("dash.teacher.aiGen.resources.errors.base64Failed")));
                else resolve(base64);
            };
            reader.onerror = () => reject(new Error(t("dash.teacher.aiGen.resources.errors.readFailed")));
            reader.readAsDataURL(blob);
        });

    // Gather text-based content from resources
    const gatherTextContent = (): string => {
        const selectedResources = selectedMedia.map(index => media[index]);
        let contentParts: string[] = [];

        for (const resource of selectedResources) {
            switch (resource.type) {
                case "text":
                    if (resource.content) {
                        contentParts.push(
                            aiGenContext.resourceText(language, resource.caption || "", resource.content)
                        );
                    }
                    break;

                case "video":
                    contentParts.push(
                        aiGenContext.resourceVideo(language, resource.caption, resource.url || "")
                    );
                    break;

                case "image":
                    contentParts.push(
                        aiGenContext.resourceImage(language, resource.caption, resource.url || "")
                    );
                    break;
                case "audio":
                    contentParts.push(
                        aiGenContext.resourceAudio(
                            language,
                            resource.caption,
                            resource.fileName,
                            resource.url || ""
                        )
                    );
                    break;
                case "link":
                    contentParts.push(
                        aiGenContext.resourceLink(
                            language,
                            resource.caption || aiGenContext.externalLinkDefaultCaption(language),
                            normalizeExternalUrl(resource.url)
                        )
                    );
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
    const getImageParts = async (): Promise<{ fileName: string; base64: string; mimeType: string }[]> => {
        const selectedResources = selectedMedia.map(index => media[index]);
        const imageParts: { fileName: string; base64: string; mimeType: string }[] = [];

        for (const resource of selectedResources) {
            if (resource.type === "image") {
                if (resource.imageBase64) {
                    imageParts.push({
                        fileName: resource.url?.split('/').pop() || 'image.jpg',
                        base64: resource.imageBase64,
                        mimeType: "image/jpeg"
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
                                base64: base64,
                                mimeType: blob.type || "image/jpeg"
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

    const getAudioParts = async (): Promise<{ fileName: string; base64: string; mimeType: string }[]> => {
        const selectedResources = selectedMedia.map(index => media[index]);
        const audioParts: { fileName: string; base64: string; mimeType: string }[] = [];

        for (const resource of selectedResources) {
            if (resource.type !== "audio" || !resource.url) continue;
            try {
                const audioUrl = normalizeExternalUrl(resource.url);
                const response = await fetch(audioUrl);
                if (!response.ok) continue;
                const blob = await response.blob();
                const base64 = await toBase64(blob);
                audioParts.push({
                    fileName: resource.fileName || audioUrl.split("/").pop() || "audio-file",
                    base64,
                    mimeType: blob.type || guessMimeTypeFromUrl(audioUrl),
                });
            } catch (err) {
                console.warn("Error fetching audio for AI:", err);
            }
        }

        return audioParts;
    };

    const getExternalLinksContext = async (): Promise<string> => {
        const selectedResources = selectedMedia.map(index => media[index]);
        const links = selectedResources.filter((m) => m.type === "link" && m.url?.trim());
        if (links.length === 0) return "";

        const chunks: string[] = [];
        for (const link of links) {
            const normalizedUrl = normalizeExternalUrl(link.url);
            const caption = link.caption?.trim() || aiGenContext.externalLinkDefaultCaption(language);
            let extractedText = "";
            try {
                const proxyUrl = `https://r.jina.ai/http://${normalizedUrl.replace(/^https?:\/\//i, "")}`;
                const res = await fetch(proxyUrl);
                if (res.ok) {
                    const rawText = await res.text();
                    extractedText = rawText.replace(/\s+/g, " ").trim().slice(0, 6000);
                }
            } catch (err) {
                console.warn("Failed to extract external link content:", normalizedUrl, err);
            }

            if (extractedText) {
                chunks.push(aiGenContext.externalLinkExtracted(language, caption, normalizedUrl, extractedText));
            } else {
                chunks.push(aiGenContext.externalLinkFallback(language, caption, normalizedUrl));
            }
        }

        return chunks.join("\n\n---\n\n");
    };

    const parseItemsWithRepair = async (
        generatedText: string,
        apiKey: string,
        generateType: GenerateMode
    ) => {
        try {
            return parseAiGeneratedChallengeItems(generatedText);
        } catch (firstErr) {
            console.warn("Initial parse failed, trying JSON repair", firstErr);
            setProgress(t("dash.teacher.aiGen.resources.progress.repairing"));

            const repairPrompt = buildQuestionGenRepairPrompt(language, generateType, generatedText);

            const repaired = (await generateGeminiContent(apiKey, {
                contents: [{ parts: [{ text: repairPrompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    topK: 20,
                    topP: 0.9,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json",
                },
            }, {
                models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"],
            })) as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };

            const repairedText = repaired.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!repairedText) {
                throw new Error(t("dash.teacher.aiGen.resources.errors.repairFailed"));
            }

            return parseAiGeneratedChallengeItems(repairedText);
        }
    };

    const normalizeGeneratedItems = (items: Record<string, unknown>[]): Record<string, unknown>[] =>
        normalizeGeneratedChallengeItems(items, {
            language,
            trueLabel: t("dash.teacher.topics.qe.trueLabel"),
            falseLabel: t("dash.teacher.topics.qe.falseLabel"),
            qaFallbackAnswer: (question) => aiGenContext.qaFallbackAnswer(language, question),
            qaFallbackExplanation: aiGenContext.qaFallbackExplanation(language),
        });

    const transcribeAudioParts = async (
        audioParts: { fileName: string; base64: string; mimeType: string }[],
        apiKey: string
    ): Promise<string> => {
        if (audioParts.length === 0) return "";

        const transcripts: string[] = [];
        for (const audio of audioParts) {
            try {
                setProgress(t("dash.teacher.aiGen.resources.progress.transcribingFile", { fileName: audio.fileName }));
                const transcription = (await generateGeminiContent(apiKey, {
                    contents: [{
                        parts: [
                            {
                                inline_data: {
                                    mime_type: audio.mimeType,
                                    data: audio.base64,
                                }
                            },
                            { text: buildAudioTranscriptionPrompt(language) }
                        ]
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
                if (transcriptText) {
                    transcripts.push(aiGenContext.audioTranscriptChunk(language, audio.fileName, transcriptText));
                }
            } catch (err) {
                console.warn("Audio transcription failed for:", audio.fileName, err);
            }
        }

        return transcripts.join("\n\n---\n\n");
    };

    const handleGenerate = async () => {
        if (selectedMedia.length === 0) {
            toast({
                title: t("dash.teacher.aiGen.resources.toast.noResources"),
                description: t("dash.teacher.aiGen.resources.toast.noResourcesDesc"),
                variant: "destructive",
            });
            return;
        }

        if (!prompt.trim()) {
            toast({
                title: t("dash.teacher.aiGen.toast.noPrompt"),
                description: t("dash.teacher.aiGen.toast.noPromptDesc"),
                variant: "destructive",
            });
            return;
        }

        if (targetCount < 1) {
            toast({
                title: t("dash.teacher.aiGen.toast.noTargetCount"),
                description: t("dash.teacher.aiGen.toast.noTargetCountDesc"),
                variant: "destructive",
            });
            return;
        }

        const allowedTypes = getAllowedTypesForMode(generateType, selectedChallengeTypes);
        if (allowedTypes.length === 0) {
            toast({
                title: t("dash.teacher.aiGen.resources.toast.selectType"),
                description: t("dash.teacher.aiGen.resources.toast.selectTypeDesc"),
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);
        setProcessingPhase("extracting");

        try {
            // Gather content
            setProgress(t("dash.teacher.aiGen.resources.progress.preparing"));
            const textContent = gatherTextContent();

            setProgress(t("dash.teacher.aiGen.resources.progress.fetchingPdfs"));
            const pdfParts = await getPdfParts();

            setProgress(t("dash.teacher.aiGen.resources.progress.fetchingImages"));
            const imageParts = await getImageParts();

            setProgress(t("dash.teacher.aiGen.resources.progress.fetchingAudio"));
            const audioParts = await getAudioParts();

            setProgress(t("dash.teacher.aiGen.resources.progress.fetchingLinks"));
            const externalLinksContext = await getExternalLinksContext();

            console.log("Text content:", textContent);
            console.log("PDF parts count:", pdfParts.length);
            console.log("Image parts count:", imageParts.length);
            console.log("Audio parts count:", audioParts.length);

            // Check if we have any content
            if (!textContent.trim() && !externalLinksContext.trim() && pdfParts.length === 0 && imageParts.length === 0 && audioParts.length === 0) {
                throw new Error(t("dash.teacher.aiGen.resources.errors.noAnalyzableContent"));
            }

            setProcessingPhase("analyzing");
            setProgress(t("dash.teacher.aiGen.resources.progress.analyzing"));

            const apiKey = getGeminiApiKey();

            setProgress(t("dash.teacher.aiGen.resources.progress.transcribing"));
            const audioTranscriptContext = await transcribeAudioParts(audioParts, apiKey);

            // Fetch metadata or transcripts for videos if any
            let videoResourceMetadata = "";
            const getYoutubeId = (url: string) => {
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                const match = url.match(regExp);
                return (match && match[2].length === 11) ? match[2] : null;
            };

            const videoResources = selectedMedia.map(idx => media[idx]).filter(m => m.type === "video");

            if (videoResources.length > 0) {
                setProgress(t("dash.teacher.aiGen.resources.progress.extractingVideos"));
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
                                    videoResourceMetadata += aiGenContext.videoTranscriptBlock(
                                        language,
                                        video.url || "",
                                        transcriptText
                                    );
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
                                videoResourceMetadata += aiGenContext.videoOEmbedBlock(
                                    language,
                                    data.title,
                                    data.author_name,
                                    video.url || ""
                                );
                            }
                        } catch (e) {
                            console.warn("Failed fetch meta for", video.url);
                        }
                    }
                }
            }

            // Build request parts
            const parts: any[] = [];

            // Extract text from PDFs locally (latest Gemini models support visual analysis of page images if text extraction is insufficient)
            if (pdfParts.length > 0) {
                for (const pdf of pdfParts) {
                    try {
                        setProgress(t("dash.teacher.aiGen.resources.progress.analyzingPdf", { fileName: pdf.fileName }));

                        // Convert base64 to ArrayBuffer
                        const binaryStr = atob(pdf.base64);
                        const bytes = new Uint8Array(binaryStr.length);
                        for (let i = 0; i < binaryStr.length; i++) {
                            bytes[i] = binaryStr.charCodeAt(i);
                        }

                        const pdfBlob = new Blob([bytes], { type: 'application/pdf' });

                        // Attempt 1: Text Extraction
                        const extractedText = await extractPdfText(pdfBlob);

                        // If we have meaningful text, add it
                        if (extractedText.trim().length > 100) {
                            parts.push({
                                text: aiGenContext.pdfTextBlock(language, pdf.fileName, extractedText),
                            });
                            console.log(`Extracted ${extractedText.length} chars from: ${pdf.fileName}`);
                        }

                        // Printed / scanned PDFs: render pages so the vision model can read them
                        if (pdfNeedsVisualPageImages(extractedText)) {
                            setProgress(t("dash.teacher.aiGen.resources.progress.convertingPdf", { fileName: pdf.fileName }));
                            const images = await extractPdfAsImages(pdfBlob, 15, 2);
                            if (images.length === 0) {
                                throw new Error(t("dash.teacher.aiGen.resources.errors.pdfConvertFailed", { fileName: pdf.fileName }));
                            }
                            images.forEach((img) => {
                                parts.push({
                                    inline_data: {
                                        mime_type: "image/jpeg",
                                        data: img
                                    }
                                });
                            });
                            console.log(`Converted ${images.length} pages of ${pdf.fileName} to images`);
                        }
                    } catch (extractError) {
                        console.error("Error extracting PDF:", extractError);
                        toast({
                            title: t("dash.teacher.aiGen.resources.toast.pdfWarning"),
                            description: t("dash.teacher.aiGen.resources.toast.pdfWarningDesc", { fileName: pdf.fileName }),
                            variant: "default",
                        });
                    }
                }
            }

            // Process Images for visual analysis
            imageParts.forEach(img => {
                parts.push({
                    inline_data: {
                        mime_type: img.mimeType || "image/jpeg",
                        data: img.base64
                    }
                });
            });

            // We intentionally do not attach raw audio in the final generation call.
            // Using transcript text is more stable and reduces malformed responses.

            setProcessingPhase("generating");
            setProgress(t("dash.teacher.aiGen.resources.progress.generating"));

            // Build comprehensive prompt
            const fullContent = `${textContent}\n\n${videoResourceMetadata}\n\n${externalLinksContext}\n\n${audioTranscriptContext}`;
            console.log(`Gemini generateContent (PDFs: ${pdfParts.length}, Images: ${imageParts.length}, Audio: ${audioParts.length})`);

            const uniqueAllowedTypes = Array.from(new Set(allowedTypes));
            const questions: ChallengeQuestion[] = [];
            const batchSize = targetCount >= 40 ? 10 : 15;
            const maxCycles = Math.max(8, Math.ceil(targetCount / batchSize) * 6);
            let emptyCycles = 0;

            for (let batch = 1; batch <= maxCycles && questions.length < targetCount; batch++) {
                const remaining = targetCount - questions.length;
                const currentBatchCount = Math.min(batchSize, remaining);
                setProgress(t("dash.teacher.aiGen.resources.progress.batch", { batch, count: currentBatchCount }));

                const batchParts = [...parts];
                const promptText = buildResourcesGenerationPrompt({
                    language,
                    textContent: fullContent,
                    userPrompt: prompt,
                    pdfCount: pdfParts.length,
                    imageCount: imageParts.length,
                    audioCount: audioParts.length,
                    genType: generateType,
                    allowedTypes: uniqueAllowedTypes,
                    allowedTypeLabels: uniqueAllowedTypes.map((type) => getChallengeTypeLabel(type)),
                    batchCount: currentBatchCount,
                    totalRequestedCount: targetCount,
                });
                batchParts.push({ text: promptText });

                const data = (await generateGeminiContent(apiKey, {
                    contents: [{ parts: batchParts }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 8192,
                        responseMimeType: "application/json",
                    },
                }, {
                    models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"],
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

                const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!generatedText) {
                    emptyCycles += 1;
                    if (emptyCycles >= 5) break;
                    continue;
                }

                const parsedItems = normalizeGeneratedItems(
                    await parseItemsWithRepair(generatedText, apiKey, generateType)
                );
                const filteredItems = parsedItems.filter((item) => {
                    const type = normalizeChallengeItemType(String(item.type || "")) as ChallengeType;
                    if (!uniqueAllowedTypes.includes(type)) return false;
                    if (generateType === "questions" && !QUESTION_TYPES.includes(type as QuestionType)) return false;
                    if (generateType === "games" && !GAME_TYPES.includes(type as GameType)) return false;
                    return true;
                });
                if (filteredItems.length === 0) {
                    emptyCycles += 1;
                    if (emptyCycles >= 5) break;
                    continue;
                }
                emptyCycles = 0;

                for (const item of filteredItems) {
                    if (questions.length >= targetCount) break;
                    questions.push({
                        ...(item as Record<string, unknown>),
                        id: (item as { id?: number | string }).id || Date.now() + questions.length,
                    } as ChallengeQuestion);
                }
            }

            if (questions.length === 0) {
                throw new Error(t("dash.teacher.aiGen.resources.errors.noValidItems"));
            }

            if (questions.length < targetCount) {
                throw new Error(t("dash.teacher.aiGen.resources.errors.partialCount", {
                    generated: questions.length,
                    target: targetCount,
                }));
            }

            setProgress(t("dash.teacher.aiGen.resources.progress.success"));
            toast({
                title: t("dash.teacher.aiGen.toast.generateSuccess"),
                description: t("dash.teacher.aiGen.resources.toast.successDesc", {
                    count: questions.length,
                    resources: selectedMedia.length,
                }),
            });

            setTimeout(() => {
                onGenerate(questions);
            }, 1000);

        } catch (error) {
            console.error("Error generating questions:", error);
            const errorMessage = error instanceof Error ? error.message : t("dash.teacher.aiGen.toast.unexpectedError");
            const normalizedErrorMessage = errorMessage.toLowerCase();
            const apiKeyError =
                normalizedErrorMessage.includes("api key") ||
                normalizedErrorMessage.includes("api_key") ||
                normalizedErrorMessage.includes("unauthorized") ||
                normalizedErrorMessage.includes("permission denied") ||
                normalizedErrorMessage.includes("invalid key");
            toast({
                title: t("dash.teacher.aiGen.toast.generateError"),
                description: apiKeyError
                    ? t("dash.teacher.aiGen.resources.toast.invalidApiKey")
                    : errorMessage,
                variant: "destructive",
            });
            setProgress("");
            setProcessingPhase("idle");
        } finally {
            setIsProcessing(false);
        }
    };

    const selectedResourcesCount = selectedMedia.length;
    const pdfCount = selectedMedia.filter(i => media[i].type === "pdf").length;
    const textCount = selectedMedia.filter(i => media[i].type === "text").length;
    const videoCount = selectedMedia.filter(i => media[i].type === "video").length;
    const imageCount = selectedMedia.filter(i => media[i].type === "image").length;
    const audioCount = selectedMedia.filter(i => media[i].type === "audio").length;
    const linkCount = selectedMedia.filter(i => media[i].type === "link").length;

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
                        <Brain className="w-6 h-6 text-primary shrink-0" />
                        {t("dash.teacher.aiGen.resources.title")}
                    </CardTitle>
                    <p className={cn("text-sm text-muted-foreground mt-2", textAlign)}>
                        {t("dash.teacher.aiGen.resources.subtitle")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Label className="text-base font-bold flex items-center gap-2">
                            <Database className="w-5 h-5 shrink-0" />
                            {t("dash.teacher.aiGen.resources.step1")}
                        </Label>

                        {media.length === 0 ? (
                            <Card className="border-dashed border-2 p-8 text-center">
                                <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                                <p className="text-muted-foreground">
                                    {t("dash.teacher.aiGen.resources.noResources")}
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
                                        <div className={cn("flex-1 min-w-0", textAlign)}>
                                            <div className="font-medium text-sm">
                                                {item.caption || item.fileName || getMediaLabel(item.type)}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
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
                                <span className="text-muted-foreground">{t("dash.teacher.aiGen.resources.selected")}</span>
                                {pdfCount > 0 && (
                                    <Badge variant="outline" className="gap-1">
                                        <FileType className="w-3 h-3" />
                                        {t("dash.teacher.aiGen.resources.countPdf", { n: pdfCount })}
                                    </Badge>
                                )}
                                {textCount > 0 && (
                                    <Badge variant="outline" className="gap-1">
                                        <FileText className="w-3 h-3" />
                                        {t("dash.teacher.aiGen.resources.countText", { n: textCount })}
                                    </Badge>
                                )}
                                {videoCount > 0 && (
                                    <Badge variant="outline" className="gap-1">
                                        <Video className="w-3 h-3" />
                                        {t("dash.teacher.aiGen.resources.countVideo", { n: videoCount })}
                                    </Badge>
                                )}
                                {imageCount > 0 && (
                                    <Badge variant="outline" className="gap-1">
                                        <Image className="w-3 h-3" />
                                        {t("dash.teacher.aiGen.resources.countImage", { n: imageCount })}
                                    </Badge>
                                )}
                                {audioCount > 0 && (
                                    <Badge variant="outline" className="gap-1">
                                        <Headphones className="w-3 h-3" />
                                        {t("dash.teacher.aiGen.resources.countAudio", { n: audioCount })}
                                    </Badge>
                                )}
                                {linkCount > 0 && (
                                    <Badge variant="outline" className="gap-1">
                                        <Link2 className="w-3 h-3" />
                                        {t("dash.teacher.aiGen.resources.countLink", { n: linkCount })}
                                    </Badge>
                                )}
                            </div>
                        )}
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
                            placeholder={t("dash.teacher.aiGen.resources.promptPlaceholder")}
                            rows={3}
                            disabled={isProcessing}
                            dir={dir}
                            className={cn("resize-none", textAlign)}
                        />

                        <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">{t("dash.teacher.aiGen.resources.targetCount")}</Label>
                            <Input
                                type="number"
                                min={0}
                                max={80}
                                value={targetCount}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === "") {
                                        setTargetCount(0);
                                        return;
                                    }
                                    const value = Number(raw);
                                    if (!Number.isFinite(value)) return;
                                    setTargetCount(Math.max(0, Math.min(80, Math.floor(value))));
                                }}
                                disabled={isProcessing}
                            />
                            <p className={cn("text-xs text-muted-foreground", textAlign)}>
                                {t("dash.teacher.aiGen.resources.targetCountHint")}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">{t("dash.teacher.aiGen.resources.generateType")}</Label>
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
                                    {t("dash.teacher.aiGen.resources.typeQuestions")}
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
                                    {t("dash.teacher.aiGen.resources.typeGames")}
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
                                    {t("dash.teacher.aiGen.resources.typeBoth")}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">{t("dash.teacher.aiGen.resources.allowedTypes")}</Label>
                            <div className="flex gap-2 flex-wrap">
                                {getVisibleTypesForMode(generateType).map((type) => (
                                    <Button
                                        key={type}
                                        type="button"
                                        variant={selectedChallengeTypes.includes(type) ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => toggleChallengeType(type)}
                                        disabled={isProcessing}
                                        className="gap-1"
                                    >
                                        {getChallengeTypeLabel(type)}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className={cn("text-xs text-muted-foreground", textAlign)}>
                            {t("dash.teacher.aiGen.resources.tip")}
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
                                    <div className={cn("flex-1", textAlign)}>
                                        <p className="font-medium text-blue-700 dark:text-blue-300">
                                            {progress}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <div className={`h-1 flex-1 rounded-full ${processingPhase === "extracting" ? "bg-blue-500" : "bg-blue-200"}`} />
                                            <div className={`h-1 flex-1 rounded-full ${processingPhase === "analyzing" ? "bg-blue-500" : processingPhase === "generating" ? "bg-blue-500" : "bg-blue-200"}`} />
                                            <div className={`h-1 flex-1 rounded-full ${processingPhase === "generating" ? "bg-blue-500" : "bg-blue-200"}`} />
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                            <span>{t("dash.teacher.aiGen.resources.phaseExtract")}</span>
                                            <span>{t("dash.teacher.aiGen.resources.phaseAnalyze")}</span>
                                            <span>{t("dash.teacher.aiGen.resources.phaseGenerate")}</span>
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
                                <div className={cn("text-sm space-y-2 flex-1", textAlign)}>
                                    <p className="font-medium">{t("dash.teacher.aiGen.resources.infoTitle")}</p>
                                    <ul className="space-y-1 ps-4 list-disc text-muted-foreground">
                                        <li>{t("dash.teacher.aiGen.resources.info1")}</li>
                                        <li>{t("dash.teacher.aiGen.resources.info2")}</li>
                                        <li>{t("dash.teacher.aiGen.resources.info3")}</li>
                                        <li>{t("dash.teacher.aiGen.resources.info4")}</li>
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
                                    disabled={!prompt.trim() || targetCount < 1 || selectedMedia.length === 0 || isProcessing}
                                    className="gap-2 bg-gradient-to-l from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {t("dash.teacher.aiGen.btn.generating")}
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-4 h-4" />
                                            {t("dash.teacher.aiGen.resources.btnGenerate", { count: selectedResourcesCount })}
                                        </>
                                    )}
                                </Button>
                                <Button variant="outline" onClick={onCancel} disabled={isProcessing} className="gap-2">
                                    <X className="w-4 h-4 shrink-0" />
                                    {t("dash.common.cancel")}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" onClick={onCancel} disabled={isProcessing} className="gap-2">
                                    <X className="w-4 h-4 shrink-0" />
                                    {t("dash.common.cancel")}
                                </Button>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={!prompt.trim() || targetCount < 1 || selectedMedia.length === 0 || isProcessing}
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
                                            {t("dash.teacher.aiGen.resources.btnGenerate", { count: selectedResourcesCount })}
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

export default AIQuestionGeneratorFromResources;
