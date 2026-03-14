import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import {
    Loader2, File, Image as ImageIcon, LinkIcon, Eye, Download,
    AlertTriangle, Search, Filter, Grid3x3
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser, useStudentProfile, useTeacherProfile } from "@/hooks/useDatabase";

interface ContentItem {
    id: string;
    name: string;
    type: "image" | "pdf" | "link";
    url: string;
    size?: number;
    uploadedAt: string;
}

const StudentContentView = ({ teacherId }: { teacherId: string }) => {
    const { toast } = useToast();
    const { data: user } = useUser();
    const { data: profile } = useStudentProfile(user?.id || "");
    const { data: teacherProfile } = useTeacherProfile(teacherId);

    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filteredItems, setFilteredItems] = useState<ContentItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"all" | "image" | "pdf" | "link">("all");

    const BUCKET_NAME = "teacher-content";

    // Load teacher's content
    useEffect(() => {
        loadContent();
    }, [teacherId]);

    // Filter content based on search and type
    useEffect(() => {
        let filtered = contentItems;

        if (filterType !== "all") {
            filtered = filtered.filter(item => item.type === filterType);
        }

        if (searchQuery.trim()) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredItems(filtered);
    }, [contentItems, filterType, searchQuery]);

    const loadContent = async () => {
        if (!teacherId) return;

        setIsLoading(true);
        try {
            // Get list of files in storage
            const { data: files, error } = await supabase.storage
                .from(BUCKET_NAME)
                .list(`${teacherId}/content`, {
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
                        .getPublicUrl(`${teacherId}/content/${file.name}`);

                    return {
                        id: file.id,
                        name: file.name,
                        type: file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image",
                        url: publicUrl.publicUrl,
                        size: file.metadata?.size,
                        uploadedAt: new Date(file.created_at).toLocaleString("ar-SA")
                    };
                });

                setContentItems(items);
            }
        } catch (error: any) {
            console.error("Error loading content:", error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "فشل تحميل محتوى المعلم"
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
                return <File className="w-6 h-6 text-red-500" />;
            case "image":
                return <ImageIcon className="w-6 h-6 text-blue-500" />;
            case "link":
                return <LinkIcon className="w-6 h-6 text-green-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>محتوى المعلم</CardTitle>
                    <CardDescription>
                        {teacherProfile?.full_name || "المعلم"} - {teacherProfile?.subject}
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Search and Filter */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="ابحث عن محتوى..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="flex gap-2">
                            {[
                                { value: "all", label: "الكل" },
                                { value: "image", label: "الصور" },
                                { value: "pdf", label: "PDFs" },
                                { value: "link", label: "الروابط" }
                            ].map(option => (
                                <Button
                                    key={option.value}
                                    variant={filterType === option.value ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFilterType(option.value as any)}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Content Display */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>المحتوى المتوفر</span>
                        <span className="text-sm font-normal text-gray-500">
                            {filteredItems.length} عنصر
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>لا يوجد محتوى متاح في الوقت الحالي</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {filteredItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white"
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-video bg-gray-100 flex items-center justify-center relative group overflow-hidden">
                                        {item.type === "image" ? (
                                            <img
                                                src={item.url}
                                                alt={item.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-2 w-full h-full bg-gradient-to-br from-gray-100 to-gray-200">
                                                {getFileIcon(item.type)}
                                                <span className="text-xs text-gray-500">
                                                    {item.type.toUpperCase()}
                                                </span>
                                            </div>
                                        )}

                                        {/* Action Buttons Overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                                                title="عرض"
                                            >
                                                <Eye className="w-5 h-5 text-gray-700" />
                                            </a>
                                            {item.type === "pdf" && (
                                                <a
                                                    href={item.url}
                                                    download
                                                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                                                    title="تحميل"
                                                >
                                                    <Download className="w-5 h-5 text-gray-700" />
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content Info */}
                                    <div className="p-4">
                                        <h3 className="font-medium text-sm line-clamp-2 mb-2">
                                            {item.name}
                                        </h3>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>{item.uploadedAt}</span>
                                            {item.size && (
                                                <span>{formatFileSize(item.size)}</span>
                                            )}
                                        </div>
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

export default StudentContentView;
