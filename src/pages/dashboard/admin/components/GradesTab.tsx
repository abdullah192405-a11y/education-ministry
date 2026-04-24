import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    BookOpen, GraduationCap, Plus,
    Search, Filter, MoreVertical, Edit, Trash, Upload,
    School, Sparkles, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useGrades } from "@/hooks/useDatabase";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCreateGrade, useUpdateGrade, useDeleteGrade, useUser } from "@/hooks/useDatabase";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizeGradeClassType } from "@/lib/gradeClassType";

const getLevelLabel = (level: string) => {
    switch (level) {
        case "PRIMARY": return "ابتدائي";
        case "MIDDLE": return "متوسط";
        case "SECONDARY": return "ثانوي";
        default: return level;
    }
};

/** Stored in DB (`class_type`); labels are for UI */
const CLASS_TYPE_OPTIONS = [
    { value: "تعليمي" as const, label: "تعليمي" },
    { value: "اثرائي" as const, label: "إثرائي" },
];

const getClassTypeLabel = (classType: unknown) => {
    const v = normalizeGradeClassType(classType);
    return CLASS_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v;
};

const isGradeHidden = (grade: { is_hidden?: boolean | null; isHidden?: boolean | null }) =>
    Boolean(grade.is_hidden ?? grade.isHidden);

const GradesTab = () => {
    const { toast } = useToast();
    const { data: user } = useUser();
    const coverFileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingGrade, setEditingGrade] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        level: "PRIMARY",
        description: "",
        cover_image: "",
        /** DB column `class_type`: تعليمي | اثرائي */
        class_type: "تعليمي",
        is_hidden: false,
    });

    const { data: gradesData, isLoading } = useGrades();
    const createGradeMutation = useCreateGrade();
    const updateGradeMutation = useUpdateGrade();
    const deleteGradeMutation = useDeleteGrade();

    const filteredGrades = (gradesData || []).filter((grade: any) =>
        grade.name.includes(searchTerm) ||
        getLevelLabel(grade.level).includes(searchTerm)
    );

    const teachingGrades = filteredGrades.filter((grade: any) => {
        if (isGradeHidden(grade)) return false;
        return normalizeGradeClassType(grade.class_type ?? grade.classType) === "تعليمي";
    });

    const enrichmentGrades = filteredGrades.filter((grade: any) => {
        if (isGradeHidden(grade)) return false;
        return normalizeGradeClassType(grade.class_type ?? grade.classType) === "اثرائي";
    });

    const hiddenGrades = filteredGrades.filter((grade: any) => isGradeHidden(grade));

    const handleOpenDialog = (grade?: any) => {
        if (grade) {
            setEditingGrade(grade);
            setFormData({
                name: grade.name,
                slug: grade.slug,
                level: grade.level,
                description: grade.description || "",
                cover_image: grade.cover_image || grade.coverImage || "",
                class_type: normalizeGradeClassType(grade.class_type ?? grade.classType),
                is_hidden: Boolean(grade.is_hidden ?? grade.isHidden),
            });
        } else {
            setEditingGrade(null);
            setFormData({
                name: "",
                slug: "",
                level: "PRIMARY",
                description: "",
                cover_image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=60",
                class_type: "تعليمي",
                is_hidden: false,
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        const payload = {
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            level: formData.level,
            description: formData.description.trim(),
            cover_image: formData.cover_image.trim() || null,
            class_type: formData.class_type,
            is_hidden: formData.is_hidden,
        };
        try {
            if (editingGrade) {
                await updateGradeMutation.mutateAsync({
                    id: editingGrade.id,
                    updates: payload,
                });
                toast({ title: "تم التحديث", description: "تم تحديث بيانات الصف بنجاح." });
            } else {
                await createGradeMutation.mutateAsync(payload);
                toast({ title: "تم الإضافة", description: "تم إضافة الصف الجديد بنجاح." });
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            console.error("[GradesTab] Error:", error);
            const errorMsg = error?.message || "حدث خطأ أثناء حفظ البيانات.";
            toast({ 
                variant: "destructive", 
                title: "خطأ", 
                description: errorMsg
            });
        }
    };

    const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!user?.id) {
            toast({ title: "تعذر الرفع", description: "يجب تسجيل الدخول لرفع الصور.", variant: "destructive" });
            return;
        }
        if (!file.type.startsWith("image/")) {
            toast({ title: "نوع غير مدعوم", description: "يرجى اختيار ملف صورة (PNG، JPEG، WebP، GIF).", variant: "destructive" });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "حجم الملف كبير", description: "يجب ألا يتجاوز حجم الصورة 5 ميجابايت.", variant: "destructive" });
            return;
        }
        setIsUploadingCover(true);
        try {
            const ext = file.name.split(".").pop() || "jpg";
            const fileName = `grade-cover-${crypto.randomUUID()}.${ext}`;
            const filePath = `${user.id}/grades/${fileName}`;
            const { error } = await supabase.storage.from("teacher-content").upload(filePath, file);
            if (error) throw error;
            const { data } = supabase.storage.from("teacher-content").getPublicUrl(filePath);
            setFormData((prev) => ({ ...prev, cover_image: data.publicUrl }));
            toast({ title: "تم الرفع", description: "تم تعيين صورة الغلاف من الملف المرفوع." });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "حدث خطأ أثناء الرفع.";
            console.error("[GradesTab] cover upload:", err);
            toast({ title: "خطأ في الرفع", description: msg, variant: "destructive" });
        } finally {
            setIsUploadingCover(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("هل أنت متأكد من حذف هذا الصف؟ سيؤدي هذا لحذف جميع المواد والمواضيع المرتبطة به.")) {
            try {
                await deleteGradeMutation.mutateAsync(id);
                toast({ title: "تم الحذف", description: "تم حذف الصف بنجاح." });
            } catch (error) {
                toast({ variant: "destructive", title: "خطأ", description: "تعذر حذف الصف." });
            }
        }
    };

    const renderGradeCard = (grade: any, borderClassName: string) => (
        <Card
            key={grade.id}
            className={`group hover:shadow-lg transition-all duration-300 overflow-hidden border-t-4 ${borderClassName}`}
        >
            <div className="h-32 overflow-hidden relative">
                <img
                    src={grade.cover_image || grade.coverImage}
                    alt={grade.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                <div className="absolute bottom-4 right-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-background shadow-sm flex items-center justify-center">
                        <GraduationCap className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-none mb-1">{grade.name}</h3>
                        <div className="flex flex-wrap gap-1.5">
                            <Badge variant="secondary" className="text-xs">
                                {getLevelLabel(grade.level)}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-primary/30">
                                {getClassTypeLabel(grade.class_type ?? grade.classType)}
                            </Badge>
                            {isGradeHidden(grade) ? (
                                <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-400">
                                    مخفي
                                </Badge>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            <CardContent className="p-4 pt-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-center">
                        <BookOpen className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-lg font-bold">{grade.subjects?.length || 0}</p>
                        <p className="text-xs text-muted-foreground">مواد دراسية</p>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 text-center">
                        <GraduationCap className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                        <p className="text-lg font-bold">{(grade.students_count || grade.studentsCount || 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">طالب مسجل</p>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                    {grade.description}
                </p>

                <div className="flex items-center gap-2">
                    <Button className="flex-1" variant="outline" asChild>
                        <Link to={`/grade/${grade.slug}`}>
                            عرض التفاصيل
                        </Link>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => handleOpenDialog(grade)}
                                className="gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleDelete(grade.id)}
                                className="gap-2 text-destructive"
                            >
                                <Trash className="w-4 h-4" />
                                حذف
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث عن صف دراسي..."
                        className="pr-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" />
                        تصفية
                    </Button>
                    <Button
                        onClick={() => handleOpenDialog()}
                        className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة صف جديد
                    </Button>
                </div>
            </div>

            {/* Grades by section */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-[280px] w-full rounded-xl" />
                    ))}
                </div>
            ) : filteredGrades.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed bg-muted/20">
                    <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-lg">لم يتم العثور على صفوف دراسية</p>
                </div>
            ) : (
                <div className="space-y-12">
                    <section className="space-y-4">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <School className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold tracking-tight">الصفوف التعليمية</h2>
                                    <p className="text-sm text-muted-foreground">
                                        الصفوف المعروضة للجمهور من نوع «تعليمي» ({teachingGrades.length})
                                    </p>
                                </div>
                            </div>
                        </div>
                        {teachingGrades.length === 0 ? (
                            <p className="text-sm text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center">
                                لا توجد صفوف تعليمية ضمن نتائج البحث.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {teachingGrades.map((g: any) => renderGradeCard(g, "border-t-blue-500"))}
                            </div>
                        )}
                    </section>

                    <section className="space-y-4">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold tracking-tight">القنوات الاثرائية</h2>
                                    <p className="text-sm text-muted-foreground">
                                        الصفوف المعروضة للجمهور من نوع «إثرائي» ({enrichmentGrades.length})
                                    </p>
                                </div>
                            </div>
                        </div>
                        {enrichmentGrades.length === 0 ? (
                            <p className="text-sm text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center">
                                لا توجد قنوات اثرائية ضمن نتائج البحث.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {enrichmentGrades.map((g: any) => renderGradeCard(g, "border-t-violet-500"))}
                            </div>
                        )}
                    </section>

                    <section className="space-y-4">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                    <EyeOff className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold tracking-tight">المحتوى المخفي عن الجمهور</h2>
                                    <p className="text-sm text-muted-foreground">
                                        الصفوف التي لن تظهر في القوائم العامة ({hiddenGrades.length})
                                    </p>
                                </div>
                            </div>
                        </div>
                        {hiddenGrades.length === 0 ? (
                            <p className="text-sm text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center">
                                لا يوجد محتوى مخفي ضمن نتائج البحث.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {hiddenGrades.map((g: any) => renderGradeCard(g, "border-t-amber-500"))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg font-cairo" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>{editingGrade ? "تعديل الصف الدراسي" : "إضافة صف دراسي جديد"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">اسم الصف</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                                placeholder="مثلاً: الصف الأول الابتدائي"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="level">المرحلة الدراسية</Label>
                                <Select
                                    value={formData.level}
                                    onValueChange={(value) => setFormData({ ...formData, level: value })}
                                >
                                    <SelectTrigger id="level">
                                        <SelectValue placeholder="اختر المرحلة" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PRIMARY">ابتدائي</SelectItem>
                                        <SelectItem value="MIDDLE">متوسط</SelectItem>
                                        <SelectItem value="SECONDARY">ثانوي</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="class_type">نوع الصف</Label>
                                <Select
                                    value={formData.class_type}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, class_type: value as "تعليمي" | "اثرائي" })
                                    }
                                >
                                    <SelectTrigger id="class_type">
                                        <SelectValue placeholder="اختر نوع الصف" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CLASS_TYPE_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">الوصف</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="وصف مختصر للصف"
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cover_image">صورة الغلاف</Label>
                            <p className="text-sm text-muted-foreground">
                                ارفع صورة من جهازك أو الصق رابطًا يبدأ بـ <span dir="ltr">https://</span>
                            </p>
                            <input
                                ref={coverFileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="sr-only"
                                tabIndex={-1}
                                onChange={handleCoverFile}
                            />
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-2 shrink-0"
                                    disabled={isUploadingCover}
                                    onClick={() => coverFileInputRef.current?.click()}
                                >
                                    <Upload className="w-4 h-4" />
                                    {isUploadingCover ? "جاري الرفع..." : "رفع صورة"}
                                </Button>
                                <Input
                                    id="cover_image"
                                    dir="ltr"
                                    className="font-mono text-sm"
                                    value={formData.cover_image}
                                    onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            {formData.cover_image.trim() ? (
                                <div className="relative mt-2 max-w-sm overflow-hidden rounded-lg border bg-muted/30">
                                    <img
                                        src={formData.cover_image.trim()}
                                        alt=""
                                        className="h-36 w-full object-cover"
                                        onError={(ev) => {
                                            (ev.target as HTMLImageElement).style.display = "none";
                                        }}
                                    />
                                </div>
                            ) : null}
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <Label htmlFor="is_hidden" className="text-base">
                                    إخفاء الصف
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    لن يظهر هذا الصف للطلاب والمعلمين
                                </p>
                            </div>
                            <Switch
                                id="is_hidden"
                                checked={formData.is_hidden}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_hidden: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                        <Button
                            onClick={handleSave}
                            disabled={
                                createGradeMutation.isPending ||
                                updateGradeMutation.isPending ||
                                isUploadingCover
                            }
                        >
                            {createGradeMutation.isPending || updateGradeMutation.isPending ? "جاري الحفظ..." : "حفظ الصف"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GradesTab;
