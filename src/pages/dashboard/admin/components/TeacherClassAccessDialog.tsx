import { useEffect, useMemo, useState } from "react";
import { GraduationCap, BookOpen } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
    useGrades,
    useTeacherClassAccess,
    useTeacherProfile,
    useSaveTeacherClassAccess,
} from "@/hooks/useDatabase";
import { useOrgAdminTenant } from "@/hooks/useOrgAdminTenant";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import type { TeacherGradeAccessEntry } from "@/lib/teacherClassAccess";
import { cn } from "@/lib/utils";

type GradeDraft = {
    enabled: boolean;
    allSubjects: boolean;
    subjectIds: Set<string>;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teacherUserId: string | null;
    teacherName?: string;
};

const TeacherClassAccessDialog = ({ open, onOpenChange, teacherUserId, teacherName }: Props) => {
    const { t, dir } = useDashboardLocale();
    const { toast } = useToast();
    const { scopedOrganizationId } = useOrgAdminTenant();
    const { data: teacherProfile, isLoading: loadingProfile } = useTeacherProfile(teacherUserId || "");
    const teacherProfileId = teacherProfile?.id || "";
    const { data: savedAccess, isLoading: loadingAccess } = useTeacherClassAccess(teacherProfileId);
    const { data: grades = [], isLoading: loadingGrades } = useGrades({
        organizationId: scopedOrganizationId,
        enabled: open && !!scopedOrganizationId,
    });
    const saveMutation = useSaveTeacherClassAccess();

    const [draft, setDraft] = useState<Record<string, GradeDraft>>({});

    useEffect(() => {
        if (!open || loadingAccess || loadingGrades) return;

        const next: Record<string, GradeDraft> = {};
        for (const grade of grades) {
            const entry = savedAccess?.grades.find((g) => g.gradeId === grade.id);
            next[grade.id] = {
                enabled: !!entry,
                allSubjects: entry ? entry.allSubjects : true,
                subjectIds: new Set(entry && !entry.allSubjects ? entry.subjectIds : []),
            };
        }
        setDraft(next);
    }, [open, savedAccess, grades, loadingAccess, loadingGrades]);

    const enabledGrades = useMemo(
        () => grades.filter((g: any) => draft[g.id]?.enabled),
        [grades, draft],
    );

    const toggleGrade = (gradeId: string, enabled: boolean) => {
        setDraft((prev) => {
            const current = prev[gradeId] ?? { enabled: false, allSubjects: true, subjectIds: new Set<string>() };
            return {
                ...prev,
                [gradeId]: {
                    ...current,
                    enabled,
                    allSubjects: enabled ? current.allSubjects : true,
                    subjectIds: enabled ? current.subjectIds : new Set(),
                },
            };
        });
    };

    const toggleAllSubjects = (gradeId: string, allSubjects: boolean) => {
        setDraft((prev) => {
            const current = prev[gradeId];
            if (!current) return prev;
            return {
                ...prev,
                [gradeId]: {
                    ...current,
                    allSubjects,
                    subjectIds: allSubjects ? new Set() : current.subjectIds,
                },
            };
        });
    };

    const toggleSubject = (gradeId: string, subjectId: string, checked: boolean) => {
        setDraft((prev) => {
            const current = prev[gradeId];
            if (!current) return prev;
            const subjectIds = new Set(current.subjectIds);
            if (checked) subjectIds.add(subjectId);
            else subjectIds.delete(subjectId);
            return {
                ...prev,
                [gradeId]: {
                    ...current,
                    allSubjects: false,
                    subjectIds,
                },
            };
        });
    };

    const handleSave = async () => {
        if (!teacherProfileId) return;

        const entries: TeacherGradeAccessEntry[] = enabledGrades.map((g: any) => {
            const state = draft[g.id]!;
            return {
                gradeId: g.id,
                allSubjects: state.allSubjects,
                subjectIds: state.allSubjects ? [] : Array.from(state.subjectIds),
            };
        });

        const invalid = entries.find((e) => !e.allSubjects && e.subjectIds.length === 0);
        if (invalid) {
            toast({
                title: t("dash.common.error"),
                description: t("dash.admin.teachers.accessPickSubjectOrAll"),
                variant: "destructive",
            });
            return;
        }

        try {
            await saveMutation.mutateAsync({
                teacherProfileId,
                teacherUserId: teacherUserId || undefined,
                entries,
            });
            toast({
                title: t("dash.admin.teachers.accessSavedTitle"),
                description: t("dash.admin.teachers.accessSavedDesc", { name: teacherName || "" }),
            });
            onOpenChange(false);
        } catch (err: any) {
            toast({
                title: t("dash.common.error"),
                description: err?.message || t("dash.admin.teachers.accessSaveFailed"),
                variant: "destructive",
            });
        }
    };

    const isLoading = loadingProfile || loadingAccess || loadingGrades;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir={dir}>
                <DialogHeader>
                    <DialogTitle>{t("dash.admin.teachers.accessTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("dash.admin.teachers.accessDesc", { name: teacherName || t("dash.admin.teachers.newTeacher") })}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="space-y-3 py-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : !grades.length ? (
                    <p className="text-sm text-muted-foreground py-4">{t("dash.admin.teachers.accessNoGrades")}</p>
                ) : (
                    <div className="space-y-4 py-2">
                        {grades.map((grade: any) => {
                            const state = draft[grade.id];
                            const subjects = grade.subjects || [];
                            if (!state) return null;

                            return (
                                <div
                                    key={grade.id}
                                    className={cn(
                                        "rounded-xl border p-3 space-y-3 transition-colors",
                                        state.enabled ? "border-primary/30 bg-primary/5" : "border-border",
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id={`grade-${grade.id}`}
                                            checked={state.enabled}
                                            onCheckedChange={(v) => toggleGrade(grade.id, v === true)}
                                        />
                                        <Label
                                            htmlFor={`grade-${grade.id}`}
                                            className="flex items-center gap-2 font-semibold cursor-pointer flex-1"
                                        >
                                            <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                                            {grade.name}
                                        </Label>
                                    </div>

                                    {state.enabled && subjects.length > 0 && (
                                        <div className="mr-7 space-y-2 border-r-2 border-primary/20 pr-3">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`all-subjects-${grade.id}`}
                                                    checked={state.allSubjects}
                                                    onCheckedChange={(v) => toggleAllSubjects(grade.id, v === true)}
                                                />
                                                <Label
                                                    htmlFor={`all-subjects-${grade.id}`}
                                                    className="text-sm font-medium cursor-pointer"
                                                >
                                                    {t("dash.admin.teachers.accessAllSubjects")}
                                                </Label>
                                            </div>

                                            {!state.allSubjects && (
                                                <div className="space-y-1.5 pt-1">
                                                    <p className="text-xs text-muted-foreground">
                                                        {t("dash.admin.teachers.accessPickSubjects")}
                                                    </p>
                                                    {subjects.map((subject: any) => (
                                                        <div key={subject.id} className="flex items-center gap-2">
                                                            <Checkbox
                                                                id={`subject-${subject.id}`}
                                                                checked={state.subjectIds.has(subject.id)}
                                                                onCheckedChange={(v) =>
                                                                    toggleSubject(grade.id, subject.id, v === true)
                                                                }
                                                            />
                                                            <Label
                                                                htmlFor={`subject-${subject.id}`}
                                                                className="text-sm cursor-pointer flex items-center gap-1.5"
                                                            >
                                                                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                                                                {subject.name}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("dash.common.cancel")}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!teacherProfileId || saveMutation.isPending || enabledGrades.length === 0}
                    >
                        {t("dash.common.save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default TeacherClassAccessDialog;
