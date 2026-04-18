/** Stored in `grades.class_type` */
export type GradeClassTypeValue = "تعليمي" | "اثرائي";

/** Align DB values with canonical options (e.g. إثرائي vs اثرائي) */
export function normalizeGradeClassType(raw: unknown): GradeClassTypeValue {
    const s = String(raw ?? "").trim();
    if (s === "تعليمي") return "تعليمي";
    if (s === "اثرائي" || s === "إثرائي" || s === "إِثرائي") return "اثرائي";
    return "تعليمي";
}

/** Grades marked hidden should not appear on public listings */
export function isGradePublished(grade: {
    is_hidden?: boolean | null;
    isHidden?: boolean | null;
}): boolean {
    return !(grade.is_hidden ?? grade.isHidden);
}
