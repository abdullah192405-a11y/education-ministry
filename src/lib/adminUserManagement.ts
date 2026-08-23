/**
 * Pure helpers for the org admin's user management.
 *
 * Validation and row shaping live here so the rules are testable and identical
 * whether a user is being created, edited, or having only their class changed.
 */

export type AdminManagedRole = "STUDENT" | "TEACHER";

/**
 * Roles an org admin may assign. ADMIN and SUPERADMIN are deliberately absent:
 * promoting an account to administrator is a privilege escalation and stays
 * with the superadmin panel.
 */
export const ADMIN_MANAGED_ROLES: AdminManagedRole[] = ["STUDENT", "TEACHER"];

export const MIN_ADMIN_SET_PASSWORD_LENGTH = 6;

export function isAdminManagedRole(role: unknown): role is AdminManagedRole {
    return ADMIN_MANAGED_ROLES.includes(String(role || "").toUpperCase() as AdminManagedRole);
}

export function normalizeAdminEmail(email: unknown): string {
    return String(email ?? "").trim().toLowerCase();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type AdminUserInput = {
    /** Present when editing an existing account. */
    id?: string;
    name: string;
    email: string;
    role: AdminManagedRole;
    /** The student's class, or the teacher's primary class. */
    gradeId: string | null;
    /** Teacher only. */
    subjectId: string | null;
    isActive: boolean;
    /** Required on create; on edit, a non-empty value resets the password. */
    password?: string;
};

export type AdminUserValidationError = {
    field: "name" | "email" | "role" | "gradeId" | "password";
    code:
        | "nameRequired"
        | "emailRequired"
        | "emailInvalid"
        | "roleInvalid"
        | "gradeRequired"
        | "passwordRequired"
        | "passwordTooShort";
};

/**
 * `gradeRequired` applies to students only: a student without a class sees no
 * content, no exams and no challenges, which is the exact breakage this panel
 * exists to fix. Teachers may legitimately have no primary class.
 */
export function validateAdminUserInput(
    input: AdminUserInput,
    options: { isCreate: boolean },
): AdminUserValidationError | null {
    if (!String(input.name ?? "").trim()) {
        return { field: "name", code: "nameRequired" };
    }

    const email = normalizeAdminEmail(input.email);
    if (!email) return { field: "email", code: "emailRequired" };
    if (!EMAIL_PATTERN.test(email)) return { field: "email", code: "emailInvalid" };

    if (!isAdminManagedRole(input.role)) {
        return { field: "role", code: "roleInvalid" };
    }

    if (input.role === "STUDENT" && !input.gradeId) {
        return { field: "gradeId", code: "gradeRequired" };
    }

    const password = String(input.password ?? "");
    if (options.isCreate && !password) {
        return { field: "password", code: "passwordRequired" };
    }
    if (password && password.length < MIN_ADMIN_SET_PASSWORD_LENGTH) {
        return { field: "password", code: "passwordTooShort" };
    }

    return null;
}

/** The `users` row columns an admin edit may touch. */
export function buildAdminUserRow(
    input: AdminUserInput,
    context: { organizationId?: string | null; passwordHash?: string | null; now: string },
): Record<string, unknown> {
    const row: Record<string, unknown> = {
        name: String(input.name).trim(),
        email: normalizeAdminEmail(input.email),
        role: input.role,
        is_active: input.isActive,
        updated_at: context.now,
    };

    if (context.organizationId) row.organization_id = context.organizationId;
    if (context.passwordHash) row.password_hash = context.passwordHash;

    return row;
}

export function buildStudentProfileRow(
    userId: string,
    gradeId: string | null,
    now: string,
): Record<string, unknown> {
    return {
        user_id: userId,
        grade_id: gradeId || null,
        total_points: 0,
        total_challenges: 0,
        completed_topics: 0,
        average_score: 0,
        longest_streak: 0,
        current_streak: 0,
        total_study_hours: 0,
        updated_at: now,
    };
}

export function buildTeacherProfileRow(
    userId: string,
    gradeId: string | null,
    subjectId: string | null,
    now: string,
): Record<string, unknown> {
    return {
        user_id: userId,
        grade_id: gradeId || null,
        subject_id: subjectId || null,
        total_students: 0,
        total_topics: 0,
        total_challenges: 0,
        average_score: 0,
        updated_at: now,
    };
}

/** A user row joined with whichever profile matches its role. */
export function getUserGradeId(user: any): string | null {
    const profile = user?.role === "TEACHER" ? user?.teacher_profile : user?.student_profile;
    return profile?.grade_id ?? null;
}

export function getUserGradeName(user: any): string | null {
    const profile = user?.role === "TEACHER" ? user?.teacher_profile : user?.student_profile;
    return profile?.grade?.name ?? null;
}
