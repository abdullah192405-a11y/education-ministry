import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import {
    Upload, Link as LinkIcon, File, Image as ImageIcon, Loader2,
    X, Check, AlertTriangle, Eye, Download, Trash2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser, useTeacherProfile } from "@/hooks/useDatabase";

interface ContentItem {
    id: string;
    name: string;
    type: "image" | "pdf" | "link";
    url: string;
    size?: number;
    uploadedAt: string;
    isPublic: boolean;
}

const ContentUploadTab = () => {
    const { toast } = useToast();
    const { data: user } = useUser();
    const { data: profile } = useTeacherProfile(user?.id || "");

    const [uploadMethod, setUploadMethod] = useState<"upload" | "link">("upload");
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkTitle, setLinkTitle] = useState("");
    const [fileInput, setFileInput] = useState<File | null>(null);

    const BUCKET_NAME = "teacher-content";
    const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const ALLOWED_PDF_TYPE = "application/pdf";
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    // Load existing content items
    const loadContent = async () => {
        if (!user?.id || !profile?.id) return;

        setIsLoadingContent(true);
        try {
            // Get list of files in storage
            const { data: files, error } = await supabase.storage
                .from(BUCKET_NAME)
                .list(`${user.id}/content`, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: "created_at", order: "desc" }
                });

            if (error && error.message !== "not found") {
                throw error;
            }

            if (files && files.length > 0) {
                const items: ContentItem[] = files.map(file => {
                    const { data: publicUrl } = supabase.storage
                        .from(BUCKET_NAME)
                        .getPublicUrl(`${user.id}/content/${file.name}`);

                    return {
                        id: file.id,
                        name: file.name,
                        type: file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image",
                        url: publicUrl.publicUrl,
                        size: file.metadata?.size,
                        uploadedAt: new Date(file.created_at).toLocaleString("ar-SA"),
                        isPublic: true
                    };
                });

                setContentItems(items);
            }
        } catch (error: any) {
            console.error("Error loading content:", error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "فشل تحميل المحتوى"
            });
        } finally {
            setIsLoadingContent(false);
        }
    };

    // Handle file upload
    const handleFileUpload = async (file: File) => {
        if (!user?.id) {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "يجب تسجيل الدخول أولاً"
            });
            return;
        }

        // Validate file
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
        const isPdf = file.type === ALLOWED_PDF_TYPE;

        if (!isImage && !isPdf) {
            toast({
                variant: "destructive",
                title: "نوع ملف غير مدعوم",
                description: "الرجاء تحميل صور (JPG, PNG, GIF, WebP) أو ملفات PDF فقط"
            });
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            toast({
                variant: "destructive",
                title: "الملف كبير جداً",
                description: `الحد الأقصى للحجم هو 50MB (حجم الملف: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
            });
            return;
        }

        setIsLoading(true);
        try {
            // Create bucket if it doesn't exist (optional - may fail if user lacks permissions)
            try {
                await supabase.storage.createBucket(BUCKET_NAME, { public: true });
            } catch (e: any) {
                // Bucket might already exist
            }

            const timestamp = Date.now();
            const filename = `${timestamp}-${file.name}`;
            const filepath = `${user.id}/content/${filename}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filepath, file, {
                    cacheControl: "3600",
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: publicUrl } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(filepath);

            const newItem: ContentItem = {
                id: uploadData?.path || timestamp.toString(),
                name: file.name,
                type: isPdf ? "pdf" : "image",
                url: publicUrl.publicUrl,
                size: file.size,
                uploadedAt: new Date().toLocaleString("ar-SA"),
                isPublic: true
            };

            setContentItems([newItem, ...contentItems]);
            setFileInput(null);

            toast({
                title: "نجح التحميل",
                description: `تم تحميل "${file.name}" بنجاح`
            });
        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                variant: "destructive",
                title: "خطأ في التحميل",
                description: error.message || "فشل تحميل الملف"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle adding link
    const handleAddLink = async () => {
        if (!linkUrl.trim() || !linkTitle.trim()) {
            toast({
                variant: "destructive",
                title: "معلومات ناقصة",
                description: "الرجاء إدخال العنوان والرابط"
            });
            return;
        }

        // Validate URL
        try {
            new URL(linkUrl);
        } catch {
            toast({
                variant: "destructive",
                title: "رابط غير صحيح",
                description: "الرجاء إدخال رابط صحيح (يبدأ بـ http:// أو https://)"
            });
            return;
        }

        const newItem: ContentItem = {
            id: Date.now().toString(),
            name: linkTitle,
            type: "link",
            url: linkUrl,
            uploadedAt: new Date().toLocaleString("ar-SA"),
            isPublic: true
        };

        setContentItems([newItem, ...contentItems]);
        setLinkUrl("");
        setLinkTitle("");

        toast({
            title: "تم الإضافة",
            description: `تم إضافة الرابط "${linkTitle}" بنجاح`
        });
    };

    // Delete content
    const handleDeleteContent = async (item: ContentItem) => {
        if (!user?.id) return;

        setIsLoading(true);
        try {
            if (item.type !== "link") {
                // Delete from storage
                const filename = item.name;
                const filepath = `${user.id}/content/${filename}`;

                const { error: deleteError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .remove([filepath]);

                if (deleteError) throw deleteError;
            }

            setContentItems(contentItems.filter(c => c.id !== item.id));

            toast({
                title: "تم الحذف",
                description: `تم حذف "${item.name}" بنجاح`
            });
        } catch (error: any) {
            console.error("Delete error:", error);
            toast({
                variant: "destructive",
                title: "خطأ في الحذف",
                description: error.message || "فشل حذف المحتوى"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
    };

    const getFileIcon = (type: "image" | "pdf" | "link") => {
        switch (type) {
            case "pdf":
                return <File className="w-4 h-4 text-red-500" />;
            case "image":
                return <ImageIcon className="w-4 h-4 text-blue-500" />;
            case "link":
                return <LinkIcon className="w-4 h-4 text-green-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        إضافة محتوى تعليمي
                    </CardTitle>
                    <CardDescription>
                        حمّل الصور وملفات PDF أو أضف روابط للمحتوى التعليمي
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as "upload" | "link")}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="upload" className="flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                تحميل الملفات
                            </TabsTrigger>
                            <TabsTrigger value="link" className="flex items-center gap-2">
                                <LinkIcon className="w-4 h-4" />
                                إضافة رابط
                            </TabsTrigger>
                        </TabsList>

                        {/* Upload Tab */}
                        <TabsContent value="upload" className="space-y-4 mt-4">
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    الأنواع المدعومة: صور (JPG, PNG, GIF, WebP) وملفات PDF. الحد الأقصى: 50MB
                                </AlertDescription>
                            </Alert>

                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            setFileInput(e.target.files[0]);
                                        }
                                    }}
                                    disabled={isLoading}
                                />

                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <div className="flex flex-col items-center gap-3">
                                        <Upload className="w-8 h-8 text-gray-400" />
                                        <div>
                                            <p className="font-medium">
                                                اسحب الملف هنا أو انقر للاختيار
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                صور أو ملفات PDF حتى 50MB
                                            </p>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {fileInput && (
                                <div className="border rounded-lg p-4 bg-blue-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {fileInput.type.startsWith("image") ? (
                                                <ImageIcon className="w-5 h-5 text-blue-500" />
                                            ) : (
                                                <File className="w-5 h-5 text-red-500" />
                                            )}
                                            <div>
                                                <p className="font-medium">{fileInput.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {formatFileSize(fileInput.size)}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setFileInput(null)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <Button
                                onClick={() => fileInput && handleFileUpload(fileInput)}
                                disabled={!fileInput || isLoading}
                                className="w-full"
                                size="lg"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        جاري التحميل...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        تحميل الملف
                                    </>
                                )}
                            </Button>
                        </TabsContent>

                        {/* Link Tab */}
                        <TabsContent value="link" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="link-title">عنوان المحتوى</Label>
                                <Input
                                    id="link-title"
                                    placeholder="مثال: شرح الدرس الأول"
                                    value={linkTitle}
                                    onChange={(e) => setLinkTitle(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="link-url">الرابط</Label>
                                <Input
                                    id="link-url"
                                    placeholder="https://example.com"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    type="url"
                                />
                            </div>

                            <Button
                                onClick={handleAddLink}
                                disabled={isLoading || !linkTitle.trim() || !linkUrl.trim()}
                                className="w-full"
                                size="lg"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        جاري الإضافة...
                                    </>
                                ) : (
                                    <>
                                        <LinkIcon className="w-4 h-4 mr-2" />
                                        إضافة الرابط
                                    </>
                                )}
                            </Button>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Content Items Display */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>المحتوى المرفوع</span>
                        <span className="text-sm font-normal text-gray-500">
                            {contentItems.length} عنصر
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingContent ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : contentItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>لم يتم تحميل أي محتوى بعد</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {contentItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="flex-shrink-0">
                                            {getFileIcon(item.type)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium truncate">{item.name}</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <span>{item.uploadedAt}</span>
                                                {item.size && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{formatFileSize(item.size)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                            title="عرض"
                                        >
                                            {item.type === "pdf" ? (
                                                <Download className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </a>
                                        <button
                                            onClick={() => handleDeleteContent(item)}
                                            disabled={isLoading}
                                            className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600 hover:text-red-700"
                                            title="حذف"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ContentUploadTab;
