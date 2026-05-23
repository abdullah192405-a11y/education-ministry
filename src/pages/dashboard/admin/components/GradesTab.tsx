import { useEffect, useRef, useState } from "react";
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
import { useOrgAdminTenant } from "@/hooks/useOrgAdminTenant";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const isGradeHidden = (grade: { is_hidden?: boolean | null; isHidden?: boolean | null }) =>
    Boolean(grade.is_hidden ?? grade.isHidden);

type GradesTabProps = {
    externalCreateSignal?: number;
};

const GradesTab = ({ externalCreateSignal }: GradesTabProps) => {
    const { toast } = useToast();
    const { t, dir, isRtl } = useDashboardLocale();
    const { data: user } = useUser();

    const getLevelLabel = (level: string) => {
        switch (level) {
            case "PRIMARY": return t("dash.admin.grades.levelPrimary");
            case "MIDDLE": return t("dash.admin.grades.levelMiddle");
            case "SECONDARY": return t("dash.admin.grades.levelSecondary");
            default: return level;
        }
    };

    const classTypeOptions = [
        { value: "تعليمي" as const, label: t("dash.admin.grades.classTeaching") },
        { value: "اثرائي" as const, label: t("dash.admin.grades.classEnrichment") },
    ];

    const getClassTypeLabel = (classType: unknown) => {
        const v = normalizeGradeClassType(classType);
        return classTypeOptions.find((o) => o.value === v)?.label ?? v;
    };
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
    const { scopedOrganizationId, allUsersOptions } = useOrgAdminTenant();

    const { data: gradesData, isLoading } = useGrades({
        organizationId: scopedOrganizationId,
        enabled: allUsersOptions.enabled,
    });
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

    useEffect(() => {
        if (!externalCreateSignal) return;
        handleOpenDialog();
    }, [externalCreateSignal]);

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
            organization_id: scopedOrganizationId || null,
        };
        try {
            if (editingGrade) {
                await updateGradeMutation.mutateAsync({
                    id: editingGrade.id,
                    updates: payload,
                });
                toast({ title: t("dash.admin.grades.toast.updated"), description: t("dash.admin.grades.toast.updatedDesc") });
            } else {
                await createGradeMutation.mutateAsync(payload);
                toast({ title: t("dash.admin.grades.toast.added"), description: t("dash.admin.grades.toast.addedDesc") });
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            console.error("[GradesTab] Error:", error);
            const errorMsg = error?.message || t("dash.admin.grades.toast.saveErr");
            toast({
                variant: "destructive",
                title: t("dash.common.error"),
                description: errorMsg
            });
        }
    };

    const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!user?.id) {
            toast({ title: t("dash.admin.grades.toast.uploadErrTitle"), description: t("dash.admin.grades.toast.uploadLogin"), variant: "destructive" });
            return;
        }
        if (!file.type.startsWith("image/")) {
            toast({ title: t("dash.admin.grades.toast.uploadUnsupported"), description: t("dash.admin.grades.toast.uploadType"), variant: "destructive" });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: t("dash.admin.grades.toast.uploadLarge"), description: t("dash.admin.grades.toast.uploadSize"), variant: "destructive" });
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
            toast({ title: t("dash.admin.grades.toast.coverUploaded"), description: t("dash.admin.grades.toast.coverSet") });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t("dash.admin.grades.toast.saveErr");
            console.error("[GradesTab] cover upload:", err);
            toast({ title: t("dash.admin.grades.toast.uploadErrTitle"), description: msg, variant: "destructive" });
        } finally {
            setIsUploadingCover(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm(t("dash.admin.grades.toast.deleteConfirm"))) {
            try {
                await deleteGradeMutation.mutateAsync(id);
                toast({ title: t("dash.admin.grades.toast.deleted"), description: t("dash.admin.grades.toast.deletedDesc") });
            } catch (error) {
                toast({ variant: "destructive", title: t("dash.common.error"), description: t("dash.admin.grades.toast.deleteErr") });
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
                                    {t("dash.admin.grades.hiddenBadge")}
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
                        <p className="text-xs text-muted-foreground">{t("dash.admin.grades.subjectsCount")}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 text-center">
                        <GraduationCap className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                        <p className="text-lg font-bold">{(grade.students_count || grade.studentsCount || 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{t("dash.admin.grades.studentsCount")}</p>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                    {grade.description}
                </p>

                <div className="flex items-center gap-2">
                    <Button className="flex-1" variant="outline" asChild>
                        <Link to={`/grade/${grade.slug}`}>
                            {t("dash.common.viewDetails")}
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
                                {t("dash.common.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleDelete(grade.id)}
                                className="gap-2 text-destructive"
                            >
                                <Trash className="w-4 h-4" />
                                {t("dash.common.delete")}
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
                    <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                    <Input
                        placeholder={t("dash.admin.grades.searchPlaceholder")}
                        className={isRtl ? "pr-9" : "pl-9"}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" />
                        {t("dash.admin.grades.filter")}
                    </Button>
                    <Button
                        onClick={() => handleOpenDialog()}
                        className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
                    >
                        <Plus className="w-4 h-4" />
                        {t("dash.admin.grades.addNew")}
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
                    <p className="text-muted-foreground text-lg">{t("dash.admin.grades.empty")}</p>
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
                                    <h2 className="text-lg font-semibold tracking-tight">{t("dash.admin.grades.sectionTeaching")}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {t("dash.admin.grades.sectionTeachingDesc", { n: String(teachingGrades.length) })}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {teachingGrades.length === 0 ? (
                            <p className="text-sm text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center">
                                {t("dash.admin.grades.sectionTeachingEmpty")}
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
                                    <h2 className="text-lg font-semibold tracking-tight">{t("dash.admin.grades.sectionEnrichment")}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {t("dash.admin.grades.sectionEnrichmentDesc", { n: String(enrichmentGrades.length) })}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {enrichmentGrades.length === 0 ? (
                            <p className="text-sm text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center">
                                {t("dash.admin.grades.sectionEnrichmentEmpty")}
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
                                    <h2 className="text-lg font-semibold tracking-tight">{t("dash.admin.grades.sectionHidden")}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {t("dash.admin.grades.sectionHiddenDesc", { n: String(hiddenGrades.length) })}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {hiddenGrades.length === 0 ? (
                            <p className="text-sm text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center">
                                {t("dash.admin.grades.sectionHiddenEmpty")}
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
                <DialogContent className="max-w-lg font-cairo" dir={dir}>
                    <DialogHeader>
                        <DialogTitle>{editingGrade ? t("dash.admin.grades.dialogEdit") : t("dash.admin.grades.dialogAdd")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t("dash.admin.grades.fieldName")}</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                                placeholder={t("dash.admin.grades.namePlaceholder")}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="level">{t("dash.admin.grades.fieldLevel")}</Label>
                                <Select
                                    value={formData.level}
                                    onValueChange={(value) => setFormData({ ...formData, level: value })}
                                >
                                    <SelectTrigger id="level">
                                        <SelectValue placeholder={t("dash.admin.grades.levelPlaceholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PRIMARY">{t("dash.admin.grades.levelPrimary")}</SelectItem>
                                        <SelectItem value="MIDDLE">{t("dash.admin.grades.levelMiddle")}</SelectItem>
                                        <SelectItem value="SECONDARY">{t("dash.admin.grades.levelSecondary")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="class_type">{t("dash.admin.grades.fieldClassType")}</Label>
                                <Select
                                    value={formData.class_type}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, class_type: value as "تعليمي" | "اثرائي" })
                                    }
                                >
                                    <SelectTrigger id="class_type">
                                        <SelectValue placeholder={t("dash.admin.grades.classTypePlaceholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classTypeOptions.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t("dash.admin.grades.fieldDesc")}</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t("dash.admin.grades.descPlaceholder")}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cover_image">{t("dash.admin.grades.coverLabel")}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t("dash.admin.grades.coverHint")} <span dir="ltr">https://</span>
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
                                    {isUploadingCover ? t("dash.admin.grades.uploadingCover") : t("dash.admin.grades.uploadCover")}
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
                                    {t("dash.admin.grades.hideGrade")}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {t("dash.admin.grades.hideGradeDesc")}
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
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t("dash.common.cancel")}</Button>
                        <Button
                            onClick={handleSave}
                            disabled={
                                createGradeMutation.isPending ||
                                updateGradeMutation.isPending ||
                                isUploadingCover
                            }
                        >
                            {createGradeMutation.isPending || updateGradeMutation.isPending ? t("dash.common.saving") : t("dash.admin.grades.saveGrade")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GradesTab;
