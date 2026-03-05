import { useState } from "react";
import { Link } from "react-router-dom";
import {
    School, BookOpen, GraduationCap, Plus,
    Search, Filter, MoreVertical, Edit, Trash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useCreateGrade, useUpdateGrade, useDeleteGrade } from "@/hooks/useDatabase";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const getLevelLabel = (level: string) => {
    switch (level) {
        case "PRIMARY": return "ابتدائي";
        case "MIDDLE": return "متوسط";
        case "SECONDARY": return "ثانوي";
        default: return level;
    }
};

const GradesTab = () => {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingGrade, setEditingGrade] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        level: "PRIMARY",
        description: "",
        cover_image: ""
    });

    const { data: gradesData, isLoading } = useGrades();
    const createGradeMutation = useCreateGrade();
    const updateGradeMutation = useUpdateGrade();
    const deleteGradeMutation = useDeleteGrade();

    const filteredGrades = (gradesData || []).filter((grade: any) =>
        grade.name.includes(searchTerm) ||
        getLevelLabel(grade.level).includes(searchTerm)
    );

    const handleOpenDialog = (grade?: any) => {
        if (grade) {
            setEditingGrade(grade);
            setFormData({
                name: grade.name,
                slug: grade.slug,
                level: grade.level,
                description: grade.description || "",
                cover_image: grade.cover_image || grade.coverImage || ""
            });
        } else {
            setEditingGrade(null);
            setFormData({
                name: "",
                slug: "",
                level: "PRIMARY",
                description: "",
                cover_image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=60"
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editingGrade) {
                await updateGradeMutation.mutateAsync({
                    id: editingGrade.id,
                    updates: formData
                });
                toast({ title: "تم التحديث", description: "تم تحديث بيانات الصف بنجاح." });
            } else {
                await createGradeMutation.mutateAsync(formData);
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

            {/* Grades Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-[280px] w-full rounded-xl" />
                    ))
                ) : filteredGrades.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-lg">لم يتم العثور على صفوف دراسية</p>
                    </div>
                ) : (
                    filteredGrades.map((grade: any) => (
                        <Card key={grade.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden border-t-4 border-t-blue-500">
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
                                        <Badge variant="secondary" className="text-xs">
                                            {getLevelLabel(grade.level)}
                                        </Badge>
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
                    ))
                )}
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="font-cairo" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>{editingGrade ? "تعديل الصف الدراسي" : "إضافة صف دراسي جديد"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">اسم الصف</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                                placeholder="مثلاً: الصف الأول الابتدائي"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="level">المرحلة الدراسية</Label>
                            <Select
                                value={formData.level}
                                onValueChange={(value) => setFormData({ ...formData, level: value })}
                            >
                                <SelectTrigger>
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
                            <Label htmlFor="description">الوصف</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="وصف مختصر للصف"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cover_image">رابط صورة الغلاف</Label>
                            <Input
                                id="cover_image"
                                value={formData.cover_image}
                                onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                                placeholder="URL للصورة"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                        <Button onClick={handleSave} disabled={createGradeMutation.isPending || updateGradeMutation.isPending}>
                            {createGradeMutation.isPending || updateGradeMutation.isPending ? "جاري الحفظ..." : "حفظ الصف"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GradesTab;
