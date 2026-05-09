import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Search, BookOpen, Video, FileQuestion,
    MoreVertical, ArrowUpRight, FolderOpen, School, Filter
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateSubject, useUpdateSubject, useDeleteSubject } from "@/hooks/useDatabase";
import { useToast } from "@/hooks/use-toast";
import { useOrgAdminTenant } from "@/hooks/useOrgAdminTenant";

const SubjectsTab = () => {
    const { toast } = useToast();
    const { scopedOrganizationId, allUsersOptions } = useOrgAdminTenant();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGradeId, setSelectedGradeId] = useState("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: "",
        grade_id: "",
        description: "",
        icon: "📚",
        color: "#6366f1"
    });

    const { data: gradesData, isLoading } = useGrades({
        organizationId: scopedOrganizationId,
        enabled: allUsersOptions.enabled,
    });
    const createSubjectMutation = useCreateSubject();
    const updateSubjectMutation = useUpdateSubject();
    const deleteSubjectMutation = useDeleteSubject();

    // Group subjects by grade
    const gradeGroups = (gradesData || [])
        .filter((grade: any) => selectedGradeId === "all" || grade.id === selectedGradeId)
        .map((grade: any) => ({
            gradeId: grade.id,
            gradeName: grade.name,
            gradeSlug: grade.slug,
            gradeLevel: grade.level,
            subjects: (grade.subjects || [])
                .filter((subject: any) =>
                    subject.name.includes(searchTerm) ||
                    grade.name.includes(searchTerm)
                )
                .map((subject: any) => ({
                    ...subject,
                    gradeName: grade.name,
                    gradeSlug: grade.slug,
                    gradeId: grade.id
                }))
        }))
        .filter((group: any) => group.subjects.length > 0 || (!searchTerm && selectedGradeId !== "all"));

    // Total subjects count
    const totalSubjects = gradeGroups.reduce((acc: number, g: any) => acc + g.subjects.length, 0);

    const handleOpenDialog = (subject?: any) => {
        if (subject) {
            setEditingSubject(subject);
            setFormData({
                name: subject.name,
                grade_id: subject.gradeId || subject.grade_id,
                description: subject.description || "",
                icon: subject.icon || "📚",
                color: subject.color || "#6366f1"
            });
        } else {
            setEditingSubject(null);
            setFormData({
                name: "",
                grade_id: selectedGradeId !== "all" ? selectedGradeId : (gradesData && gradesData.length > 0 ? gradesData[0].id : ""),
                description: "",
                icon: "📚",
                color: "#6366f1"
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editingSubject) {
                await updateSubjectMutation.mutateAsync({
                    id: editingSubject.id,
                    updates: formData
                });
                toast({ title: "تم التحديث", description: "تم تحديث بيانات المادة بنجاح." });
            } else {
                await createSubjectMutation.mutateAsync(formData);
                toast({ title: "تم الإضافة", description: "تم إضافة المادة الجديدة بنجاح." });
            }
            setIsDialogOpen(false);
        } catch (error) {
            toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء حفظ البيانات." });
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("هل أنت متأكد من حذف هذه المادة؟ سيؤدي هذا لحذف جميع المواضيع والأنشطة المرتبطة بها.")) {
            try {
                await deleteSubjectMutation.mutateAsync(id);
                toast({ title: "تم الحذف", description: "تم حذف المادة بنجاح." });
            } catch (error) {
                toast({ variant: "destructive", title: "خطأ", description: "تعذر حذف المادة." });
            }
        }
    };

    const getLevelBadgeColor = (level: string) => {
        switch (level) {
            case "PRIMARY": return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
            case "MIDDLE": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
            case "SECONDARY": return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
            default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
        }
    };

    const getLevelName = (level: string) => {
        switch (level) {
            case "PRIMARY": return "ابتدائي";
            case "MIDDLE": return "متوسط";
            case "SECONDARY": return "ثانوي";
            default: return level;
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Title */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">المواد الدراسية</h2>
                    <p className="text-sm text-muted-foreground">
                        {totalSubjects} مادة في {gradeGroups.length} صف دراسي
                    </p>
                </div>
            </div>

            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="بحث في المواد الدراسية..."
                            className="pr-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={selectedGradeId} onValueChange={setSelectedGradeId}>
                        <SelectTrigger className="w-full sm:w-52">
                            <Filter className="w-4 h-4 ml-2 text-muted-foreground" />
                            <SelectValue placeholder="جميع الصفوف" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">جميع الصفوف</SelectItem>
                            {(gradesData || []).map((grade: any) => (
                                <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    onClick={() => handleOpenDialog()}
                    className="gap-2 bg-purple-600 hover:bg-purple-700"
                >
                    <BookOpen className="w-4 h-4" />
                    إضافة مادة جديدة
                </Button>
            </div>

            {/* Subjects grouped by Grade */}
            {isLoading ? (
                <div className="space-y-6">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="space-y-4">
                            <Skeleton className="h-8 w-64" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Array.from({ length: 2 }).map((_, j) => (
                                    <Skeleton key={j} className="h-[220px] w-full rounded-xl" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : gradeGroups.length === 0 ? (
                <div className="text-center py-16">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-lg">لا توجد مواد دراسية</p>
                    <p className="text-sm text-muted-foreground mt-2">ابدأ بإضافة مواد جديدة للصفوف الدراسية</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {gradeGroups.map((group: any) => (
                        <div key={group.gradeId}>
                            {/* Grade Section Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                                        <School className="w-4 h-4 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold">
                                        المواد الدراسية - {group.gradeName}
                                    </h3>
                                    <Badge variant="outline" className={getLevelBadgeColor(group.gradeLevel)}>
                                        {getLevelName(group.gradeLevel)}
                                    </Badge>
                                    <Badge variant="secondary" className="font-normal">
                                        {group.subjects.length} مادة
                                    </Badge>
                                </div>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link to={`/grade/${group.gradeSlug}`}>
                                        عرض الصف
                                        <ArrowUpRight className="w-4 h-4 mr-1" />
                                    </Link>
                                </Button>
                            </div>

                            {/* Subjects for this grade */}
                            {group.subjects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {group.subjects.map((subject: any) => (
                                        <Card key={`${subject.gradeId}-${subject.id}`} className="hover:border-primary/50 transition-all">
                                            <CardContent className="p-4 flex gap-4">
                                                {/* Icon */}
                                                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-sm shrink-0" style={{ backgroundColor: `${subject.color || '#6366f1'}20` }}>
                                                    {subject.icon || '📚'}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className="font-bold text-lg">{subject.name}</h3>
                                                        </div>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="-mt-2 -ml-2">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleOpenDialog(subject)}>تعديل المادة</DropdownMenuItem>
                                                                <DropdownMenuItem asChild>
                                                                    <Link to={`/grade/${subject.gradeSlug}/subject/${subject.id}`}>إدارة المنهج</Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDelete(subject.id)}
                                                                    className="text-destructive"
                                                                >
                                                                    حذف المادة
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                        {subject.description}
                                                    </p>

                                                    {/* Stats */}
                                                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                                                        <div className="text-center p-2 rounded-lg bg-muted/50">
                                                            <FolderOpen className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                                                            <span className="text-xs font-bold">{subject.topics?.length || 0}</span>
                                                            <span className="text-[10px] text-muted-foreground block">وحدة/درس</span>
                                                        </div>
                                                        <div className="text-center p-2 rounded-lg bg-muted/50">
                                                            <Video className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                                                            <span className="text-xs font-bold">
                                                                {(subject.topics || []).reduce((acc: number, t: any) => acc + (t.media_items?.filter((m: any) => m.type === 'video').length || t.mediaItems?.filter((m: any) => m.type === 'video').length || 0), 0)}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground block">فيديو</span>
                                                        </div>
                                                        <div className="text-center p-2 rounded-lg bg-muted/50">
                                                            <FileQuestion className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                                                            <span className="text-xs font-bold">
                                                                {(subject.topics || []).reduce((acc: number, t: any) => acc + (t.quiz_questions?.length || t.quizQuestions?.length || 0), 0)}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground block">سؤال</span>
                                                        </div>
                                                    </div>

                                                    <Button size="sm" className="w-full mt-4 gap-2" variant="secondary" asChild>
                                                        <Link to={`/grade/${subject.gradeSlug}/subject/${subject.id}`}>
                                                            عرض المنهج
                                                            <ArrowUpRight className="w-4 h-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <Card className="border-dashed">
                                    <CardContent className="p-8 text-center text-muted-foreground">
                                        <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">لا توجد مواد لهذا الصف بعد</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-3 gap-2"
                                            onClick={() => {
                                                setSelectedGradeId(group.gradeId);
                                                handleOpenDialog();
                                            }}
                                        >
                                            <BookOpen className="w-4 h-4" />
                                            إضافة مادة
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="font-cairo" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>{editingSubject ? "تعديل المادة الدراسية" : "إضافة مادة دراسية جديدة"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">اسم المادة</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="مثلاً: الرياضيات"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="grade_id">الصف الدراسي</Label>
                            <Select
                                value={formData.grade_id}
                                onValueChange={(value) => setFormData({ ...formData, grade_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر الصف" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(gradesData || []).map((grade: any) => (
                                        <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">الوصف</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="وصف مختصر للمادة"
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="icon">الأيقونة (Emoji)</Label>
                                <Input
                                    id="icon"
                                    value={formData.icon}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    placeholder="📚"
                                />
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="color">اللون الأساسي</Label>
                                <Input
                                    id="color"
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                        <Button onClick={handleSave} disabled={createSubjectMutation.isPending || updateSubjectMutation.isPending}>
                            {createSubjectMutation.isPending || updateSubjectMutation.isPending ? "جاري الحفظ..." : "حفظ المادة"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SubjectsTab;
