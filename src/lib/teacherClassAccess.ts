/** Admin-assigned grade + optional subject scope for a teacher. */
export type TeacherGradeAccessEntry = {
    gradeId: string;
    /** When true, teacher sees every subject in this grade. */
    allSubjects: boolean;
    /** Used when allSubjects is false. */
    subjectIds: string[];
};

export type TeacherClassAccess = {
    grades: TeacherGradeAccessEntry[];
};

export function buildTeacherClassAccessFromRows(
    gradeRows: { grade_id: string }[],
    subjectRows: { grade_id: string; subject_id: string }[],
): TeacherClassAccess {
    const subjectIdsByGrade = new Map<string, string[]>();
    for (const row of subjectRows) {
        const list = subjectIdsByGrade.get(row.grade_id) ?? [];
        list.push(row.subject_id);
        subjectIdsByGrade.set(row.grade_id, list);
    }

    return {
        grades: gradeRows.map((g) => {
            const subjectIds = subjectIdsByGrade.get(g.grade_id) ?? [];
            return {
                gradeId: g.grade_id,
                allSubjects: subjectIds.length === 0,
                subjectIds,
            };
        }),
    };
}

/** Filter catalog grades/subjects to what the teacher is allowed to manage. */
export function applyTeacherClassAccessToGrades<T extends { id: string; subjects?: { id: string }[] }>(
    grades: T[] | undefined,
    access: TeacherClassAccess | null | undefined,
    legacyGradeId?: string | null,
): T[] {
    if (!grades?.length) return [];

    const entries: TeacherGradeAccessEntry[] = access?.grades?.length
        ? access.grades
        : legacyGradeId
          ? [{ gradeId: legacyGradeId, allSubjects: true, subjectIds: [] }]
          : [];

    if (!entries.length) return [];

    const allowedGradeIds = new Set(entries.map((e) => e.gradeId));

    return grades
        .filter((g) => allowedGradeIds.has(g.id))
        .map((g) => {
            const entry = entries.find((e) => e.gradeId === g.id);
            if (!entry) return g;
            const subjects = g.subjects ?? [];
            if (entry.allSubjects) return g;
            const allowed = new Set(entry.subjectIds);
            return {
                ...g,
                subjects: subjects.filter((s) => allowed.has(s.id)),
            } as T;
        })
        .filter((g) => (g.subjects?.length ?? 0) > 0 || entries.find((e) => e.gradeId === g.id)?.allSubjects);
}

/** Collect subject ids the teacher may manage (from filtered grade catalog). */
export function getAllowedSubjectIdsFromGrades(
    grades: { id: string; subjects?: { id: string }[] }[],
): Set<string> {
    const ids = new Set<string>();
    for (const grade of grades) {
        for (const subject of grade.subjects ?? []) {
            ids.add(subject.id);
        }
    }
    return ids;
}

/** Keep only topics linked to this teacher in _TeacherTopics. */
export function filterTopicsOwnedByTeacher<T extends { _TeacherTopics?: { A?: string }[] }>(
    topics: T[] | undefined,
    teacherProfileId: string,
): T[] {
    if (!teacherProfileId || !topics?.length) return [];
    return topics.filter((topic) =>
        (topic._TeacherTopics ?? []).some((link) => link.A === teacherProfileId),
    );
}

export function summarizeTeacherClassAccess(
    access: TeacherClassAccess | null | undefined,
    grades: { id: string; name: string; subjects?: { id: string; name: string }[] }[],
    t: (key: string, params?: Record<string, string | number>) => string,
): string {
    if (!access?.grades?.length) return t("dash.admin.teachers.accessNone");
    const parts = access.grades.map((entry) => {
        const grade = grades.find((g) => g.id === entry.gradeId);
        const gradeName = grade?.name ?? t("dash.admin.teachers.gradeUnknown");
        if (entry.allSubjects) {
            return t("dash.admin.teachers.accessGradeAllSubjects", { grade: gradeName });
        }
        const names = entry.subjectIds
            .map((id) => grade?.subjects?.find((s) => s.id === id)?.name)
            .filter(Boolean) as string[];
        if (!names.length) return gradeName;
        return t("dash.admin.teachers.accessGradeSubjects", {
            grade: gradeName,
            subjects: names.join("، "),
        });
    });
    return parts.join(" · ");
}
