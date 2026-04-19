import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Plus, Edit, Trash2, Save, X, Upload, Video, Image, FileText,
    ChevronDown, ChevronUp, GripVertical, CheckCircle, XCircle,
    Play, Eye, Gamepad2, ListChecks, HelpCircle, FileType, Loader2,
    Headphones, Link2, Sparkles,
} from "lucide-react";
import type { ContentMedia, EducationalContent, ChallengeQuestion } from "@/data/challengeTypes";
import QuestionGameEditor from "./QuestionGameEditor";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useDatabase";
import { getYouTubeThumbnail, getYouTubeId } from "@/lib/utils";
import {
    generateImagePromptFromAnalyzedResources,
    generateImageBytesFromPrompt,
    type ImagePromptPreferences,
    type ImagePromptLanguageMode,
} from "@/lib/educationalImageGeneration";

function normalizeExternalUrl(raw: string): string {
    const t = raw.trim();
    if (!t) return "";
    if (/^https?:\/\//i.test(t)) return t;
    return `https://${t}`;
}

interface ContentEditorProps {
    content?: EducationalContent & { challengeItems?: ChallengeQuestion[] };
    onSave: (content: Partial<EducationalContent> & { challengeItems?: ChallengeQuestion[] }) => void | Promise<void>;
    onCancel: () => void;
}

const mediaTypes = [
    { type: "video" as const, label: "فيديو", icon: Video },
    { type: "image" as const, label: "صورة", icon: Image },
    { type: "text" as const, label: "نص", icon: FileText },
    { type: "pdf" as const, label: "PDF", icon: FileType },
    { type: "audio" as const, label: "صوت", icon: Headphones },
    { type: "link" as const, label: "رابط", icon: Link2 },
];

const targetAudienceOptions = [
    { value: "all", label: "للجميع" },
    { value: "children", label: "للأطفال" },
    { value: "adults", label: "للكبار" },
];

const ContentEditor = ({ content, onSave, onCancel }: ContentEditorProps) => {
    const { data: user } = useUser();
    const [activeTab, setActiveTab] = useState<"info" | "media" | "questions">("info");
    const { toast } = useToast();
    const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleImageUpload = async (file: File, onComplete: (url: string) => void, setIsUploading: (val: boolean) => void) => {
        if (!file || !user) {
            toast({ title: "خطأ", description: "لم يتم تسجيل الدخول", variant: "destructive" });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "حجم الملف كبير", description: "يجب ألا يتجاوز حجم الصورة 5 ميجابايت", variant: "destructive" });
            return;
        }
        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/content/${fileName}`;
            const { error } = await supabase.storage.from('teacher-content').upload(filePath, file);
            if (error) throw error;
            const { data } = supabase.storage.from('teacher-content').getPublicUrl(filePath);
            onComplete(data.publicUrl);
            toast({ title: "تم الرفع", description: "تم رفع الصورة بنجاح" });
        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                title: "خطأ في الرفع",
                description: error.message || "حدث خطأ أثناء الرفع. الرجاء التأكد من وجود bucket باسم teacher-content في Supabase.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Basic info
    const [title, setTitle] = useState(content?.title || "");
    const [description, setDescription] = useState(content?.description || "");
    const [thumbnail, setThumbnail] = useState(content?.thumbnail || "");
    const [targetAudience, setTargetAudience] = useState<"all" | "children" | "adults">(content?.targetAudience || "all");
    const [duration, setDuration] = useState(content?.duration || "");

    // Media
    const [mediaList, setMediaList] = useState<ContentMedia[]>(content?.media || []);
    const [editingMediaIndex, setEditingMediaIndex] = useState<number | null>(null);
    const [isProcessingPdf, setIsProcessingPdf] = useState(false);

    // Challenge Items (Questions & Games)
    const [challengeItems, setChallengeItems] = useState<ChallengeQuestion[]>(
        content?.challengeItems || []
    );
    const [showQuestionEditor, setShowQuestionEditor] = useState(false);

    // New media form
    const [newMedia, setNewMedia] = useState<ContentMedia>({ type: "video", url: "", caption: "" });
    const [showAddMedia, setShowAddMedia] = useState(false);
    const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
    const [isRenderingAiImage, setIsRenderingAiImage] = useState(false);
    const [aiImageProgress, setAiImageProgress] = useState("");
    const [showImagePromptDialog, setShowImagePromptDialog] = useState(false);
    const [editableImagePrompt, setEditableImagePrompt] = useState("");
    const [aiImageAudience, setAiImageAudience] = useState<ImagePromptPreferences["audience"]>("general");
    const [aiImageVisualTheme, setAiImageVisualTheme] =
        useState<ImagePromptPreferences["visualTheme"]>("infographic");
    const [aiImageTone, setAiImageTone] = useState<ImagePromptPreferences["tone"]>("friendly");
    const [aiImageColorMood, setAiImageColorMood] =
        useState<ImagePromptPreferences["colorMood"]>("bright");
    const [aiImageExtraNotes, setAiImageExtraNotes] = useState("");
    /** Language of the prompt text shown in the dialog and sent to the image model (after confirm). */
    const [aiImagePromptLanguage, setAiImagePromptLanguage] =
        useState<ImagePromptLanguageMode>("auto");
    /** Narrows what to read from PDF/images for the prompt (e.g. unit 1 of 7, topic). */
    const [aiImageContentFocus, setAiImageContentFocus] = useState("");

    // Handle PDF file upload - stores as base64 for later AI analysis
    // Handle PDF file upload - stores in Supabase Storage and optionally base64 for AI analysis
    const handlePdfUpload = async (file: File) => {
        if (!file || !user) {
            toast({ title: "خطأ", description: "لم يتم تسجيل الدخول", variant: "destructive" });
            return;
        }

        setIsProcessingPdf(true);

        try {
            // 1. Upload to Supabase Storage (Same as images)
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/content/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('teacher-content')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage
                .from('teacher-content')
                .getPublicUrl(filePath);

            const publicUrl = publicData.publicUrl;

            // 2. Also keep base64 for AI analysis if needed
            const arrayBuffer = await file.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ''
                )
            );

            setNewMedia({
                ...newMedia,
                url: publicUrl,
                fileName: file.name,
                pdfBase64: base64,  // Keep for AI analysis
            });

            toast({
                title: "تم رفع الملف بنجاح! ✓",
                description: `تم حفظ الملف في الخادم وسيتم استخدامه في الدرس`,
            });
        } catch (error: any) {
            console.error("Error processing PDF:", error);
            toast({
                title: "خطأ في رفع الملف",
                description: error.message || "حدث خطأ أثناء رفع ملف PDF. الرجاء التأكد من وجود bucket باسم teacher-content.",
                variant: "destructive",
            });
        } finally {
            setIsProcessingPdf(false);
        }
    };

    const handleAudioUpload = async (file: File) => {
        if (!file || !user) {
            toast({ title: "خطأ", description: "لم يتم تسجيل الدخول", variant: "destructive" });
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            toast({ title: "حجم الملف كبير", description: "يجب ألا يتجاوز حجم الملف الصوتي 25 ميجابايت", variant: "destructive" });
            return;
        }
        setIsUploadingMedia(true);
        try {
            const fileExt = file.name.split(".").pop() || "mp3";
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/content/${fileName}`;
            const { error } = await supabase.storage.from("teacher-content").upload(filePath, file);
            if (error) throw error;
            const { data } = supabase.storage.from("teacher-content").getPublicUrl(filePath);
            setNewMedia((prev) => ({
                ...prev,
                url: data.publicUrl,
                fileName: file.name,
            }));
            toast({ title: "تم الرفع", description: "تم رفع الملف الصوتي بنجاح" });
        } catch (error: any) {
            console.error("Audio upload error:", error);
            toast({
                title: "خطأ في الرفع",
                description: error.message || "حدث خطأ أثناء رفع الملف الصوتي.",
                variant: "destructive",
            });
        } finally {
            setIsUploadingMedia(false);
        }
    };

    const handlePrepareImagePromptFromResources = async () => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            toast({
                title: "مفتاح API غير مهيأ",
                description: "أضف VITE_GEMINI_API_KEY في ملف .env",
                variant: "destructive",
            });
            return;
        }
        if (!user) {
            toast({ title: "خطأ", description: "لم يتم تسجيل الدخول", variant: "destructive" });
            return;
        }
        setIsGeneratingAiImage(true);
        setAiImageProgress("");
        try {
            const preferences: ImagePromptPreferences = {
                audience: aiImageAudience,
                visualTheme: aiImageVisualTheme,
                tone: aiImageTone,
                colorMood: aiImageColorMood,
                notes: aiImageExtraNotes,
            };
            const prompt = await generateImagePromptFromAnalyzedResources(
                apiKey,
                mediaList,
                title,
                description,
                preferences,
                {
                    languageMode: aiImagePromptLanguage,
                    contentFocus: aiImageContentFocus.trim() || undefined,
                    onProgress: setAiImageProgress,
                }
            );
            setEditableImagePrompt(prompt);
            setShowImagePromptDialog(true);
        } catch (error: unknown) {
            console.error("AI image prompt:", error);
            toast({
                title: "فشل تحليل الموارد",
                description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
                variant: "destructive",
            });
        } finally {
            setIsGeneratingAiImage(false);
            setAiImageProgress("");
        }
    };

    const handleConfirmGenerateImageFromPrompt = async () => {
        const trimmed = editableImagePrompt.trim();
        if (!trimmed) {
            toast({
                title: "وصف فارغ",
                description: "أدخل أو احتفظ بوصف الصورة قبل التوليد.",
                variant: "destructive",
            });
            return;
        }
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey || !user) return;

        setIsRenderingAiImage(true);
        try {
            const { mimeType, base64 } = await generateImageBytesFromPrompt(apiKey, trimmed);
            const ext = mimeType.includes("png")
                ? "png"
                : mimeType.includes("jpeg") || mimeType.includes("jpg")
                    ? "jpg"
                    : "png";
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: mimeType });
            const file = new File([blob], `lesson-ai-image-${Date.now()}.${ext}`, { type: mimeType });

            await handleImageUpload(
                file,
                (url) => {
                    setNewMedia((prev) => ({
                        ...prev,
                        url,
                        imageBase64: base64,
                        caption: prev.caption?.trim()
                            ? prev.caption
                            : "صورة توضيحية مُولَّدة من تحليل موارد الدرس",
                    }));
                },
                () => {}
            );
            setShowImagePromptDialog(false);
            setEditableImagePrompt("");
        } catch (error: unknown) {
            console.error("AI image generation:", error);
            toast({
                title: "فشل توليد الصورة",
                description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
                variant: "destructive",
            });
        } finally {
            setIsRenderingAiImage(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                id: content?.id || Date.now(),
                title,
                description,
                thumbnail,
                targetAudience,
                duration,
                media: mediaList,
                quiz: [], // Legacy - keeping for compatibility
                views: content?.views || 0,
                createdAt: content?.createdAt || new Date().toISOString().split('T')[0],
                challengeItems // New comprehensive items
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Media handlers
    const saveMedia = () => {
        const normalizedLinkUrl =
            newMedia.type === "link" ? normalizeExternalUrl(newMedia.url || "") : "";
        const payload =
            newMedia.type === "link"
                ? { ...newMedia, url: normalizedLinkUrl }
                : newMedia;

        const isValid =
            payload.type === "text"
                ? payload.content?.trim()
                : payload.type === "pdf"
                    ? payload.file || payload.fileName
                    : payload.type === "link"
                        ? normalizedLinkUrl
                        : payload.type === "audio"
                            ? payload.url?.trim()
                            : payload.url?.trim();

        if (isValid) {
            if (editingMediaIndex !== null) {
                const newList = [...mediaList];
                newList[editingMediaIndex] = payload;
                setMediaList(newList);
                setEditingMediaIndex(null);
            } else {
                setMediaList([...mediaList, { ...payload }]);
            }
            setNewMedia({ type: "video", url: "", caption: "" });
            setShowAddMedia(false);
        }
    };

    const deleteMedia = (index: number) => {
        setMediaList(mediaList.filter((_, i) => i !== index));
    };

    const moveMedia = (index: number, direction: "up" | "down") => {
        if (direction === "up" && index > 0) {
            const newList = [...mediaList];
            [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
            setMediaList(newList);
        } else if (direction === "down" && index < mediaList.length - 1) {
            const newList = [...mediaList];
            [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
            setMediaList(newList);
        }
    };

    // Handle saving challenge items from QuestionGameEditor
    const handleSaveChallengeItems = (items: ChallengeQuestion[]) => {
        setChallengeItems(items);
        setShowQuestionEditor(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                    {content ? "تعديل المحتوى" : "إضافة محتوى جديد"}
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                        <X className="w-4 h-4 ml-2" />
                        إلغاء
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 ml-2" />
                        )}
                        {isSaving ? "جاري الحفظ..." : "حفظ"}
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
                {[
                    { id: "info", label: "المعلومات الأساسية", icon: FileText },
                    { id: "media", label: `الوسائط (${mediaList.length})`, icon: Video },
                    { id: "questions", label: `الأسئلة والألعاب (${challengeItems.length})`, icon: Gamepad2 },
                ].map(tab => (
                    <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className="gap-2"
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </Button>
                ))}
            </div>

            {/* Info Tab */}
            {activeTab === "info" && (
                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">عنوان المحتوى *</label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="أدخل عنوان المحتوى"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">الفئة المستهدفة</label>
                                <select
                                    value={targetAudience}
                                    onChange={(e) => setTargetAudience(e.target.value as typeof targetAudience)}
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    {targetAudienceOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">الوصف *</label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="وصف مختصر للمحتوى"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">الصورة المصغرة</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={thumbnail}
                                        onChange={(e) => setThumbnail(e.target.value)}
                                        placeholder="رابط الصورة المباشر"
                                        className="flex-1"
                                    />
                                    <div className="relative">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            accept="image/*"
                                            disabled={isUploadingThumbnail}
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    handleImageUpload(e.target.files[0], setThumbnail, setIsUploadingThumbnail);
                                                }
                                            }}
                                        />
                                        <Button type="button" variant="outline" disabled={isUploadingThumbnail}>
                                            {isUploadingThumbnail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                            رفع
                                        </Button>
                                    </div>
                                </div>
                                {thumbnail && (
                                    <img src={thumbnail} alt="Preview" className="mt-2 w-32 h-20 object-cover rounded-lg" />
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">المدة</label>
                                <Input
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    placeholder="مثال: 10 دقائق"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Media Tab */}
            {activeTab === "media" && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-muted-foreground">
                            أضف الوسائط التعليمية: فيديو، صورة، نص، PDF، صوت، رابط
                        </p>
                        <Button onClick={() => setShowAddMedia(true)} className="gap-2">
                            <Plus className="w-4 h-4" />
                            إضافة وسيط
                        </Button>
                    </div>

                    {/* Add Media Form */}
                    <AnimatePresence>
                        {showAddMedia && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <Card className="border-primary/50">
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex flex-wrap gap-2">
                                            {mediaTypes.map(m => (
                                                <Button
                                                    key={m.type}
                                                    variant={newMedia.type === m.type ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setNewMedia({
                                                        ...newMedia,
                                                        type: m.type,
                                                        url: "",
                                                        content: "",
                                                        file: undefined,
                                                        fileName: undefined,
                                                        pdfBase64: undefined,
                                                        imageBase64: undefined,
                                                    })}
                                                    className="gap-2"
                                                >
                                                    <m.icon className="w-4 h-4" />
                                                    {m.label}
                                                </Button>
                                            ))}
                                        </div>

                                        {newMedia.type === "text" ? (
                                            <Textarea
                                                value={newMedia.content || ""}
                                                onChange={(e) => setNewMedia({ ...newMedia, content: e.target.value })}
                                                placeholder="أدخل النص التعليمي (يدعم Markdown)"
                                                rows={6}
                                            />
                                        ) : newMedia.type === "pdf" ? (
                                            <div className="space-y-2">
                                                <Input
                                                    type="file"
                                                    accept=".pdf"
                                                    disabled={isProcessingPdf}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handlePdfUpload(file);
                                                        }
                                                    }}
                                                />
                                                {isProcessingPdf && (
                                                    <div className="text-sm text-blue-600 flex items-center gap-2">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        جاري رفع الملف...
                                                    </div>
                                                )}
                                                {!isProcessingPdf && newMedia.fileName && (
                                                    <div className="space-y-1">
                                                        <div className="text-sm text-green-600 flex items-center gap-2">
                                                            <CheckCircle className="w-4 h-4" />
                                                            {newMedia.fileName}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            ✓ سيتم تحليل الملف بالذكاء الاصطناعي عند توليد الأسئلة
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : newMedia.type === "video" ? (
                                            <div className="space-y-2">
                                                <Input
                                                    value={newMedia.url || ""}
                                                    onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                                                    placeholder="رابط فيديو يوتيوب (يتم التحويل تلقائياً)"
                                                />
                                                {newMedia.url && getYouTubeId(newMedia.url) && (
                                                    <div className="relative aspect-video w-40 rounded-lg overflow-hidden border">
                                                        <img
                                                            src={getYouTubeThumbnail(newMedia.url) || ""}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                if (target.src.includes('maxresdefault')) {
                                                                    target.src = target.src.replace('maxresdefault', 'hqdefault');
                                                                }
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                            <Play className="w-6 h-6 text-white fill-current" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                        ) : newMedia.type === "image" ? (
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={newMedia.url || ""}
                                                        onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                                                        placeholder="رابط الصورة"
                                                        className="flex-1"
                                                    />
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            accept="image/*"
                                                            disabled={isUploadingMedia || isGeneratingAiImage || isRenderingAiImage}
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    // 1. Convert to base64 for AI analysis
                                                                    const reader = new FileReader();
                                                                    reader.onloadend = () => {
                                                                        const base64 = reader.result?.toString().split(',')[1];
                                                                        if (base64) {
                                                                            setNewMedia(prev => ({ ...prev, imageBase64: base64 }));
                                                                        }
                                                                    };
                                                                    reader.readAsDataURL(file);

                                                                    // 2. Upload to Supabase
                                                                    handleImageUpload(file, (url) => {
                                                                        setNewMedia(prev => ({ ...prev, url }));
                                                                    }, setIsUploadingMedia);
                                                                }
                                                            }}
                                                        />
                                                        <Button type="button" variant="outline" disabled={isUploadingMedia || isGeneratingAiImage || isRenderingAiImage}>
                                                            {isUploadingMedia ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                                            رفع
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                                                    <p className="text-sm font-medium">خيارات الصورة (قبل التحليل)</p>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">
                                                            لغة وصف التوليد (يظهر في النافذة ثم يُرسَل لتوليد الصورة)
                                                        </Label>
                                                        <Select
                                                            value={aiImagePromptLanguage}
                                                            onValueChange={(v) =>
                                                                setAiImagePromptLanguage(
                                                                    v as ImagePromptLanguageMode
                                                                )
                                                            }
                                                            disabled={isGeneratingAiImage || isRenderingAiImage}
                                                        >
                                                            <SelectTrigger className="h-9 text-right">
                                                                <SelectValue placeholder="اختر" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="auto">
                                                                    تلقائي — عربي إن كانت المواد عربية
                                                                </SelectItem>
                                                                <SelectItem value="ar">عربي</SelectItem>
                                                                <SelectItem value="en">English</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">
                                                            نطاق المحتوى من الموارد (اختياري) — أي جزء يُحلَّل لصياغة الوصف
                                                        </Label>
                                                        <Textarea
                                                            value={aiImageContentFocus}
                                                            onChange={(e) => setAiImageContentFocus(e.target.value)}
                                                            placeholder="مثال: الملف فيه 7 وحدات — اعتمد الوحدة الأولى فقط. الموضوع: التركيب الضوئي…"
                                                            rows={3}
                                                            className="text-sm resize-y min-h-[72px]"
                                                            disabled={isGeneratingAiImage || isRenderingAiImage}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground">الجمهور المستهدف</Label>
                                                            <Select
                                                                value={aiImageAudience}
                                                                onValueChange={(v) =>
                                                                    setAiImageAudience(v as ImagePromptPreferences["audience"])
                                                                }
                                                                disabled={isGeneratingAiImage || isRenderingAiImage}
                                                            >
                                                                <SelectTrigger className="h-9 text-right">
                                                                    <SelectValue placeholder="اختر" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="kids">أطفال</SelectItem>
                                                                    <SelectItem value="teens">مراهقون / ثانوي</SelectItem>
                                                                    <SelectItem value="adults">بالغون</SelectItem>
                                                                    <SelectItem value="university">جامعة / دراسات عليا</SelectItem>
                                                                    <SelectItem value="general">عام / مختلط</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground">النمط البصري</Label>
                                                            <Select
                                                                value={aiImageVisualTheme}
                                                                onValueChange={(v) =>
                                                                    setAiImageVisualTheme(
                                                                        v as ImagePromptPreferences["visualTheme"]
                                                                    )
                                                                }
                                                                disabled={isGeneratingAiImage || isRenderingAiImage}
                                                            >
                                                                <SelectTrigger className="h-9 text-right">
                                                                    <SelectValue placeholder="اختر" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="infographic">إنفوجرافيك</SelectItem>
                                                                    <SelectItem value="poster">ملصق / بوستر</SelectItem>
                                                                    <SelectItem value="storybook">قصة مصورة</SelectItem>
                                                                    <SelectItem value="diagram">مخطط / رسم توضيحي</SelectItem>
                                                                    <SelectItem value="minimal">بسيط Minimal</SelectItem>
                                                                    <SelectItem value="textbook">أسلوب كتاب مدرسي</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground">النبرة</Label>
                                                            <Select
                                                                value={aiImageTone}
                                                                onValueChange={(v) =>
                                                                    setAiImageTone(v as ImagePromptPreferences["tone"])
                                                                }
                                                                disabled={isGeneratingAiImage || isRenderingAiImage}
                                                            >
                                                                <SelectTrigger className="h-9 text-right">
                                                                    <SelectValue placeholder="اختر" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="playful">مرح</SelectItem>
                                                                    <SelectItem value="friendly">ودّي</SelectItem>
                                                                    <SelectItem value="formal">رسمي</SelectItem>
                                                                    <SelectItem value="scientific">علمي</SelectItem>
                                                                    <SelectItem value="neutral">محايد</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground">الألوان / الجو</Label>
                                                            <Select
                                                                value={aiImageColorMood}
                                                                onValueChange={(v) =>
                                                                    setAiImageColorMood(
                                                                        v as ImagePromptPreferences["colorMood"]
                                                                    )
                                                                }
                                                                disabled={isGeneratingAiImage || isRenderingAiImage}
                                                            >
                                                                <SelectTrigger className="h-9 text-right">
                                                                    <SelectValue placeholder="اختر" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="bright">زاهية</SelectItem>
                                                                    <SelectItem value="pastel">باستيل</SelectItem>
                                                                    <SelectItem value="dark">داكن (نص فاتح)</SelectItem>
                                                                    <SelectItem value="high_contrast">تباين عالٍ</SelectItem>
                                                                    <SelectItem value="natural">طبيعي / أرضي</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">
                                                            ملاحظات إضافية (اختياري) — مثال: لغة معيّنة، تجنّب عناصر، شعار
                                                        </Label>
                                                        <Textarea
                                                            value={aiImageExtraNotes}
                                                            onChange={(e) => setAiImageExtraNotes(e.target.value)}
                                                            placeholder="مثال: استخدم مصطلحات بالعربية للعناوين الرئيسية فقط…"
                                                            rows={2}
                                                            className="text-sm resize-y min-h-[60px]"
                                                            disabled={isGeneratingAiImage || isRenderingAiImage}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-2">
                                                    <p className="text-xs text-muted-foreground">
                                                        الخطوة 1: تحليل الوسائط وعرض وصف مختصر يغطي الأفكار الرئيسية. الخطوة 2: بعد التأكيد يُرسل إلى نموذج الصور.
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        className="w-full sm:w-auto gap-2"
                                                        disabled={isUploadingMedia || isGeneratingAiImage || isRenderingAiImage}
                                                        onClick={handlePrepareImagePromptFromResources}
                                                    >
                                                        {isGeneratingAiImage ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Sparkles className="w-4 h-4" />
                                                        )}
                                                        تحليل الموارد وعرض وصف الصورة
                                                    </Button>
                                                    {aiImageProgress && (
                                                        <p className="text-xs text-primary flex items-center gap-2">
                                                            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                                                            {aiImageProgress}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : newMedia.type === "audio" ? (
                                            <div className="space-y-2">
                                                <Input
                                                    type="file"
                                                    accept="audio/*"
                                                    disabled={isUploadingMedia}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleAudioUpload(file);
                                                    }}
                                                />
                                                {isUploadingMedia && (
                                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        جاري رفع الملف الصوتي...
                                                    </div>
                                                )}
                                                {!isUploadingMedia && newMedia.fileName && (
                                                    <div className="text-sm text-green-600 flex items-center gap-2">
                                                        <CheckCircle className="w-4 h-4" />
                                                        {newMedia.fileName}
                                                    </div>
                                                )}
                                                {newMedia.url && (
                                                    <audio controls src={newMedia.url} className="w-full max-w-md rounded-lg" />
                                                )}
                                            </div>
                                        ) : newMedia.type === "link" ? (
                                            <Input
                                                value={newMedia.url || ""}
                                                onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                                                placeholder="https://example.com أو example.com"
                                                dir="ltr"
                                                className="text-left font-mono text-sm"
                                            />
                                        ) : null}

                                        <Input
                                            value={newMedia.caption || ""}
                                            onChange={(e) => setNewMedia({ ...newMedia, caption: e.target.value })}
                                            placeholder="وصف الوسيط (اختياري)"
                                        />

                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" onClick={() => {
                                                setShowAddMedia(false);
                                                setEditingMediaIndex(null);
                                                setNewMedia({ type: "video", url: "", caption: "" });
                                            }}>إلغاء</Button>
                                            <Button onClick={saveMedia}>
                                                {editingMediaIndex !== null ? "تحديث" : "إضافة"}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Media List */}
                    <div className="space-y-3">
                        {mediaList.map((media, index) => (
                            <Card key={index} className="overflow-hidden">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        <div className="flex flex-col gap-1">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveMedia(index, "up")} disabled={index === 0}>
                                                <ChevronUp className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveMedia(index, "down")} disabled={index === mediaList.length - 1}>
                                                <ChevronDown className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                            {media.type === "video" && <Video className="w-5 h-5 text-primary" />}
                                            {media.type === "image" && <Image className="w-5 h-5 text-secondary" />}
                                            {media.type === "text" && <FileText className="w-5 h-5 text-muted-foreground" />}
                                            {media.type === "pdf" && <FileType className="w-5 h-5 text-orange-500" />}
                                            {media.type === "audio" && <Headphones className="w-5 h-5 text-violet-500" />}
                                            {media.type === "link" && <Link2 className="w-5 h-5 text-sky-600" />}
                                        </div>

                                        <div className="flex-1">
                                            <div className="font-medium text-sm">
                                                {media.type === "video" ? "فيديو" : media.type === "image" ? "صورة" : media.type === "pdf" ? "PDF" : media.type === "audio" ? "صوت" : media.type === "link" ? "رابط" : "نص"}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate max-w-md">
                                                {media.type === "text" ? media.content?.substring(0, 100) + "..." :
                                                    media.type === "pdf" ? media.fileName :
                                                        media.type === "link" ? media.url :
                                                            media.type === "audio" ? (media.fileName || media.url) :
                                                                media.url}
                                            </div>
                                            {media.caption && <div className="text-xs text-primary mt-1">{media.caption}</div>}
                                        </div>

                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                                setEditingMediaIndex(index);
                                                setNewMedia(mediaList[index]);
                                                setShowAddMedia(true);
                                            }}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMedia(index)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {mediaList.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>لم تتم إضافة أي وسائط بعد</p>
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {/* Questions & Games Tab */}
            {
                activeTab === "questions" && (
                    <div className="space-y-4">
                        {showQuestionEditor ? (
                            <QuestionGameEditor
                                items={challengeItems}
                                onSave={handleSaveChallengeItems}
                                onCancel={() => setShowQuestionEditor(false)}
                                media={mediaList}
                            />
                        ) : (
                            <>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg">الأسئلة والألعاب التفاعلية</h3>
                                        <p className="text-sm text-muted-foreground">
                                            أضف أسئلة مختلفة وألعاب تفاعلية للتحديات
                                        </p>
                                    </div>
                                    <Button onClick={() => setShowQuestionEditor(true)} className="gap-2">
                                        <Plus className="w-4 h-4" />
                                        إدارة الأسئلة والألعاب
                                    </Button>
                                </div>

                                {/* Summary Cards */}
                                {challengeItems.length > 0 ? (
                                    <div className="space-y-4">
                                        {/* Stats */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <Card>
                                                <CardContent className="p-4 text-center">
                                                    <div className="text-3xl font-bold text-primary">{challengeItems.length}</div>
                                                    <div className="text-sm text-muted-foreground">إجمالي العناصر</div>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4 text-center">
                                                    <div className="text-3xl font-bold text-blue-500">
                                                        {challengeItems.filter(i => ["multiple_choice", "true_false", "qa", "know_dont_know", "order_questions"].includes(i.type)).length}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">أسئلة</div>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4 text-center">
                                                    <div className="text-3xl font-bold text-purple-500">
                                                        {challengeItems.filter(i => ["matching", "shooting", "wheel_spin", "puzzle"].includes(i.type)).length}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">ألعاب</div>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4 text-center">
                                                    <div className="text-3xl font-bold text-green-500">
                                                        {challengeItems.reduce((sum, i) => sum + (i.points || 0), 0)}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">إجمالي النقاط</div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Items Preview */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-base flex items-center justify-between">
                                                    <span>معاينة العناصر</span>
                                                    <Button variant="ghost" size="sm" onClick={() => setShowQuestionEditor(true)}>
                                                        تعديل الكل
                                                    </Button>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                                    {challengeItems.map((item, index) => (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                                                        >
                                                            <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold">
                                                                {index + 1}
                                                            </span>
                                                            <span className="text-xs px-2 py-0.5 rounded bg-secondary/20">
                                                                {getTypeLabel(item.type)}
                                                            </span>
                                                            <span className="flex-1 text-sm truncate">
                                                                {item.question || "(بدون عنوان)"}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {item.points} نقطة
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : (
                                    <Card className="p-12 text-center">
                                        <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                                        <h3 className="text-xl font-bold mb-2">لا توجد أسئلة أو ألعاب</h3>
                                        <p className="text-muted-foreground mb-4">
                                            أضف أسئلة متنوعة وألعاب تفاعلية لجعل التحدي ممتعاً
                                        </p>
                                        <div className="flex flex-wrap justify-center gap-2 mb-6 text-xs">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">اختيار متعدد</span>
                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded">صح وخطأ</span>
                                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">لعبة المطابقة</span>
                                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">دوران العجلة</span>
                                            <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded">لعبة التصويب</span>
                                        </div>
                                        <Button onClick={() => setShowQuestionEditor(true)} className="gap-2">
                                            <Plus className="w-4 h-4" />
                                            إضافة أسئلة وألعاب
                                        </Button>
                                    </Card>
                                )}
                            </>
                        )}
                    </div>
                )
            }

            <Dialog
                open={showImagePromptDialog}
                onOpenChange={(open) => {
                    if (!open && isRenderingAiImage) return;
                    setShowImagePromptDialog(open);
                    if (!open) setEditableImagePrompt("");
                }}
            >
                <DialogContent className="max-h-[90vh] max-w-2xl gap-4 overflow-y-auto sm:max-w-2xl" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>تأكيد وصف توليد الصورة</DialogTitle>
                        <DialogDescription className="text-right space-y-1">
                            <span className="block">
                                النص أدناه هو <strong>نفسه</strong> الذي يُرسل إلى نموذج توليد الصورة عند الضغط على «توليد الصورة»
                                (يمكنك تعديله قبل الإرسال).
                            </span>
                            <span className="block text-muted-foreground">
                                لفرض لغة الوصف: من «خيارات الصورة» قبل «تحليل الموارد» اختر تلقائي أو عربي أو English.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={editableImagePrompt}
                        onChange={(e) => setEditableImagePrompt(e.target.value)}
                        className="min-h-[min(40vh,320px)] text-sm leading-relaxed"
                        dir="auto"
                        disabled={isRenderingAiImage}
                        placeholder="يُولَّد بالعربية أو الإنجليزية حسب لغة الموارد — يمكنك التعديل هنا..."
                    />
                    <DialogFooter className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (!isRenderingAiImage) {
                                    setShowImagePromptDialog(false);
                                    setEditableImagePrompt("");
                                }
                            }}
                            disabled={isRenderingAiImage}
                        >
                            إلغاء
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmGenerateImageFromPrompt}
                            disabled={isRenderingAiImage || !editableImagePrompt.trim()}
                        >
                            {isRenderingAiImage ? (
                                <>
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                    جاري توليد الصورة...
                                </>
                            ) : (
                                "توليد الصورة"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
};

// Helper function to get type label
const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
        "multiple_choice": "اختيار متعدد",
        "true_false": "صح وخطأ",
        "qa": "سؤال وجواب",
        "know_dont_know": "أعرف/لا أعرف",
        "order_questions": "ترتيب",
        "matching": "مطابقة",
        "shooting": "تصويب",
        "wheel_spin": "عجلة",
        "puzzle": "ألغاز"
    };
    return labels[type] || type;
};

export default ContentEditor;

