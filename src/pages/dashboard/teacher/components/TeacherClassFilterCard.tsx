import { GraduationCap, BookMarked } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useDashboardLocale } from "@/contexts/LanguageContext";

type GradeOption = { id: string; name: string; subjects?: { id: string; name: string }[] };

type TeacherClassFilterCardProps = {
    visibleGrades: GradeOption[];
    selectedGradeId: string;
    onGradeChange: (gradeId: string) => void;
    selectedSubjectId: string;
    onSubjectChange: (subjectId: string) => void;
    availableSubjects: { id: string; name: string }[];
    allowedSubjectIds: Set<string>;
    showGradeFilter: boolean;
    showSubjectFilter: boolean;
};

const TeacherClassFilterCard = ({
    visibleGrades,
    selectedGradeId,
    onGradeChange,
    selectedSubjectId,
    onSubjectChange,
    availableSubjects,
    allowedSubjectIds,
    showGradeFilter,
    showSubjectFilter,
}: TeacherClassFilterCardProps) => {
    const { t } = useDashboardLocale();

    if (!showGradeFilter && !showSubjectFilter) {
        return null;
    }

    return (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
            <CardContent className="p-4">
                <div className="flex flex-col gap-4">
                    {showGradeFilter && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary min-w-[120px]">
                                <GraduationCap className="w-5 h-5" />
                                <span>{t("dash.teacher.topics.gradeLabel")}</span>
                            </div>
                            <Select
                                value={selectedGradeId}
                                onValueChange={(val) => {
                                    onGradeChange(val);
                                    onSubjectChange("");
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-64 bg-background">
                                    <SelectValue placeholder={t("dash.teacher.topics.selectGrade")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {visibleGrades.map((grade) => (
                                        <SelectItem key={grade.id} value={grade.id}>
                                            {grade.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {showSubjectFilter && selectedGradeId && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary min-w-[120px]">
                                <BookMarked className="w-5 h-5" />
                                <span>{t("dash.teacher.topics.subjectLabel")}</span>
                            </div>
                            <Select
                                value={selectedSubjectId}
                                onValueChange={(val) => {
                                    if (allowedSubjectIds.has(val)) onSubjectChange(val);
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-64 bg-background">
                                    <SelectValue placeholder={t("dash.teacher.topics.selectSubject")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableSubjects.map((subject) => (
                                        <SelectItem key={subject.id} value={subject.id}>
                                            {subject.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default TeacherClassFilterCard;
