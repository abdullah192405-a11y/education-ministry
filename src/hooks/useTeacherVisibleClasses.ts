import { useEffect, useMemo, useState } from "react";
import { orgAdminScopedOrganizationId } from "@/lib/accountCapabilities";
import { filterGradesForPublicCatalog } from "@/lib/contentVisibility";
import {
    applyTeacherClassAccessToGrades,
    getAllowedSubjectIdsFromGrades,
} from "@/lib/teacherClassAccess";
import { useGrades, useTeacherClassAccess, useUser, useVisitorGradeClassMode } from "@/hooks/useDatabase";

type GradeWithSubjects = {
    id: string;
    name: string;
    subjects?: { id: string; name: string }[];
};

/** Grades/subjects a teacher may access, plus grade+subject picker state. */
export function useTeacherVisibleClasses(
    teacherProfileId: string,
    legacyGradeId?: string | null,
) {
    const { data: user } = useUser();
    const organizationId = orgAdminScopedOrganizationId(user ?? undefined);
    const { data: grades } = useGrades({
        organizationId: organizationId ?? undefined,
    });
    const { data: classAccess, isLoading: isLoadingAccess } = useTeacherClassAccess(teacherProfileId);
    const { mode: visitorGradeMode } = useVisitorGradeClassMode();

    const visibleGrades = useMemo(() => {
        const catalog = filterGradesForPublicCatalog(grades as GradeWithSubjects[] | undefined, visitorGradeMode);
        return applyTeacherClassAccessToGrades(catalog, classAccess, legacyGradeId) as GradeWithSubjects[];
    }, [grades, visitorGradeMode, classAccess, legacyGradeId]);

    const allowedSubjectIds = useMemo(
        () => getAllowedSubjectIdsFromGrades(visibleGrades),
        [visibleGrades],
    );

    const [selectedGradeId, setSelectedGradeId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");

    useEffect(() => {
        if (!visibleGrades.length) return;
        const valid = visibleGrades.some((g) => g.id === selectedGradeId);
        if (!selectedGradeId || !valid) {
            setSelectedGradeId(visibleGrades[0].id);
        }
    }, [visibleGrades, selectedGradeId]);

    const currentGrade = visibleGrades.find((g) => g.id === selectedGradeId);
    const availableSubjects = currentGrade?.subjects ?? [];

    useEffect(() => {
        if (availableSubjects.length > 0) {
            const isValid =
                availableSubjects.some((s) => s.id === selectedSubjectId) &&
                allowedSubjectIds.has(selectedSubjectId);
            if (!isValid) {
                setSelectedSubjectId(availableSubjects[0].id);
            }
        } else {
            setSelectedSubjectId("");
        }
    }, [selectedGradeId, availableSubjects, allowedSubjectIds, selectedSubjectId]);

    const showGradeFilter = visibleGrades.length > 1;
    const showSubjectFilter = availableSubjects.length > 1;
    const showClassFilters = showGradeFilter || showSubjectFilter;

    const effectiveGradeId = selectedGradeId || visibleGrades[0]?.id || legacyGradeId || "";
    const effectiveSubjectId =
        selectedSubjectId ||
        availableSubjects[0]?.id ||
        "";

    return {
        visibleGrades,
        allowedSubjectIds,
        classAccess,
        isLoadingAccess,
        selectedGradeId: effectiveGradeId,
        setSelectedGradeId,
        selectedSubjectId: effectiveSubjectId,
        setSelectedSubjectId,
        currentGrade,
        availableSubjects,
        showGradeFilter,
        showSubjectFilter,
        showClassFilters,
    };
}
