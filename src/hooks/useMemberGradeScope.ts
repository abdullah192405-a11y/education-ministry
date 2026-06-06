import { useMemo } from "react";
import {
    useGrades,
    useStudentProfile,
    useTeacherClassAccess,
    useTeacherProfile,
    useUser,
} from "@/hooks/useDatabase";
import { normalizeGradeClassType, type GradeClassTypeValue } from "@/lib/gradeClassType";

export type MemberGradeScope = {
    /** When true, catalog pages should show only assigned grade(s). */
    isScoped: boolean;
    gradeIds: Set<string> | null;
    /** Class types present among the member's assigned grades (for tab visibility). */
    memberClassTypes: Set<GradeClassTypeValue>;
    primaryGradeId: string | null;
    primaryGradeName: string | null;
    isLoading: boolean;
};

/**
 * Resolves grade scope for signed-in students and teachers.
 * Admins, superadmins, and visitors are not scoped (gradeIds = null).
 */
export function useMemberGradeScope(): MemberGradeScope {
    const { data: user, isLoading: loadingUser } = useUser();
    const { data: gradesData = [], isLoading: loadingGrades } = useGrades();

    const role = user?.role?.toUpperCase() ?? "";
    const isStudent = role === "STUDENT" || user?.role === "طالب";
    const isTeacher = role === "TEACHER" || user?.role === "معلم" || user?.role === "معلمة";

    const { data: studentProfile, isLoading: loadingStudent } = useStudentProfile(
        isStudent ? user?.id || "" : "",
    );
    const { data: teacherProfile, isLoading: loadingTeacher } = useTeacherProfile(
        isTeacher ? user?.id || "" : "",
    );
    const { data: classAccess, isLoading: loadingAccess } = useTeacherClassAccess(
        isTeacher ? teacherProfile?.id || "" : "",
    );

    const isLoading =
        loadingUser ||
        loadingGrades ||
        (isStudent && loadingStudent) ||
        (isTeacher && (loadingTeacher || loadingAccess));

    return useMemo(() => {
        const empty: MemberGradeScope = {
            isScoped: false,
            gradeIds: null,
            memberClassTypes: new Set(),
            primaryGradeId: null,
            primaryGradeName: null,
            isLoading,
        };

        if (!user || isLoading) return empty;
        if (!isStudent && !isTeacher) return empty;

        let ids: string[] = [];

        if (isStudent && studentProfile?.grade_id) {
            ids = [studentProfile.grade_id];
        } else if (isTeacher) {
            if (classAccess?.grades?.length) {
                ids = classAccess.grades.map((g) => g.gradeId);
            } else if (teacherProfile?.grade_id) {
                ids = [teacherProfile.grade_id];
            }
        }

        if (!ids.length) return empty;

        const gradeIds = new Set(ids);
        const memberClassTypes = new Set<GradeClassTypeValue>();
        const matchedGrades = (gradesData as { id: string; name?: string; class_type?: string; classType?: string }[]).filter(
            (g) => gradeIds.has(g.id),
        );

        for (const g of matchedGrades) {
            memberClassTypes.add(normalizeGradeClassType(g.class_type ?? g.classType));
        }

        const primaryGradeId = ids[0] ?? null;
        const primary =
            matchedGrades.find((g) => g.id === primaryGradeId) ??
            matchedGrades[0] ??
            null;

        return {
            isScoped: true,
            gradeIds,
            memberClassTypes,
            primaryGradeId,
            primaryGradeName: primary?.name ?? null,
            isLoading: false,
        };
    }, [
        user,
        isLoading,
        isStudent,
        isTeacher,
        studentProfile,
        teacherProfile,
        classAccess,
        gradesData,
    ]);
}
