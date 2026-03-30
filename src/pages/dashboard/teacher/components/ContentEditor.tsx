import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus, Edit, Trash2, Save, X, Upload, Video, Image, FileText,
    ChevronDown, ChevronUp, GripVertical, CheckCircle, XCircle,
    Play, Eye, Gamepad2, ListChecks, HelpCircle, FileType, Loader2
} from "lucide-react";
import type { ContentMedia, EducationalContent, ChallengeQuestion } from "@/data/challengeTypes";
import QuestionGameEditor from "./QuestionGameEditor";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useDatabase";

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

    // Handle PDF file upload - stores as base64 for later AI analysis
    const handlePdfUpload = async (file: File) => {
        setIsProcessingPdf(true);

        try {
            // Convert file to base64 for storage
            const arrayBuffer = await file.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ''
                )
            );

            setNewMedia({
                ...newMedia,
                fileName: file.name,
                pdfBase64: base64,  // Store base64 for AI analysis
            });

            toast({
                title: "تم رفع الملف بنجاح! ✓",
                description: `سيتم تحليل الملف بواسطة الذكاء الاصطناعي عند توليد الأسئلة`,
            });
        } catch (error) {
            console.error("Error processing PDF:", error);
            toast({
                title: "خطأ في رفع الملف",
                description: "حدث خطأ أثناء رفع ملف PDF",
                variant: "destructive",
            });
        } finally {
            setIsProcessingPdf(false);
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
        // Validate based on media type
        const isValid =
            newMedia.type === "text" ? newMedia.content :
                newMedia.type === "pdf" ? newMedia.file || newMedia.fileName :
                    newMedia.url;

        if (isValid) {
            if (editingMediaIndex !== null) {
                const newList = [...mediaList];
                newList[editingMediaIndex] = newMedia;
                setMediaList(newList);
                setEditingMediaIndex(null);
            } else {
                setMediaList([...mediaList, { ...newMedia }]);
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
                        <p className="text-muted-foreground">أضف الوسائط التعليمية (فيديوهات، صور، نصوص)</p>
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
                                        <div className="flex gap-2">
                                            {mediaTypes.map(m => (
                                                <Button
                                                    key={m.type}
                                                    variant={newMedia.type === m.type ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setNewMedia({ ...newMedia, type: m.type, url: "", content: "" })}
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
                                            <Input
                                                value={newMedia.url || ""}
                                                onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                                                placeholder="رابط الفيديو (YouTube embed)"
                                            />
                                        ) : newMedia.type === "image" ? (
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
                                                        disabled={isUploadingMedia}
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
                                                    <Button type="button" variant="outline" disabled={isUploadingMedia}>
                                                        {isUploadingMedia ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                                        رفع
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Input
                                                value={newMedia.url || ""}
                                                onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                                                placeholder="الرابط"
                                            />
                                        )}

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
                                        </div>

                                        <div className="flex-1">
                                            <div className="font-medium text-sm">
                                                {media.type === "video" ? "فيديو" : media.type === "image" ? "صورة" : media.type === "pdf" ? "PDF" : "نص"}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate max-w-md">
                                                {media.type === "text" ? media.content?.substring(0, 100) + "..." :
                                                    media.type === "pdf" ? media.fileName : media.url}
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

