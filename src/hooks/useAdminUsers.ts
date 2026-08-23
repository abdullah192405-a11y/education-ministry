import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { md5 } from "js-md5";
import { supabase } from "@/lib/supabase";
import {
    buildAdminUserRow,
    buildStudentProfileRow,
    buildTeacherProfileRow,
    isAdminManagedRole,
    normalizeAdminEmail,
    type AdminManagedRole,
    type AdminUserInput,
} from "@/lib/adminUserManagement";

/**
 * Org-admin CRUD over the accounts in their organization.
 *
 * Every write is scoped by `organization_id` when the admin is tenant-linked, so
 * a bug here cannot reach another school's users, and restricted to the roles an
 * admin owns (students and teachers) so this panel can never mint an admin.
 */

type AdminUsersOptions = {
    organizationId?: string | null;
    enabled?: boolean;
};

export class AdminUserError extends Error {
    code: "emailTaken" | "notManaged" | "selfDelete" | "outOfScope";
    constructor(code: AdminUserError["code"], message: string) {
        super(message);
        this.name = "AdminUserError";
        this.code = code;
    }
}

const hashPassword = (password: string) => String(md5(password)).toLowerCase();

/** Users plus the profile that carries their class, for the admin tables. */
export const useAdminUsers = (options?: AdminUsersOptions) => {
    const orgId = options?.organizationId && String(options.organizationId).length
        ? options.organizationId
        : null;
    const enabled = options?.enabled ?? true;

    return useQuery({
        queryKey: ["admin_users", orgId ?? "all"],
        queryFn: async () => {
            let query = supabase
                .from("users")
                .select(`
                    *,
                    student_profile:student_profiles (
                        id, grade_id, total_points, total_challenges, average_score,
                        grade:grades (id, name)
                    ),
                    teacher_profile:teacher_profiles (
                        id, grade_id, subject_id, total_topics, total_students,
                        grade:grades (id, name),
                        subject:subjects (id, name)
                    )
                `)
                .order("created_at", { ascending: false });

            if (orgId) query = query.eq("organization_id", orgId);

            const { data, error } = await query;
            if (error) throw error;

            // PostgREST returns a one-to-one embed as an array on some schema
            // versions; flatten so callers always see an object or null.
            return (data || []).map((user: any) => ({
                ...user,
                student_profile: Array.isArray(user.student_profile)
                    ? user.student_profile[0] ?? null
                    : user.student_profile ?? null,
                teacher_profile: Array.isArray(user.teacher_profile)
                    ? user.teacher_profile[0] ?? null
                    : user.teacher_profile ?? null,
            }));
        },
        enabled,
    });
};

const invalidateUserQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    queryClient.invalidateQueries({ queryKey: ["all_users"] });
    queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
    queryClient.invalidateQueries({ queryKey: ["student_profile"] });
    queryClient.invalidateQueries({ queryKey: ["teacher_profile"] });
};

/** Make the user's profile rows match the role they now hold. */
const syncRoleProfile = async (
    userId: string,
    input: AdminUserInput,
    previousRole: string | null,
    now: string,
) => {
    const roleChanged = !!previousRole && previousRole !== input.role;

    if (input.role === "STUDENT") {
        const { data: existing } = await supabase
            .from("student_profiles")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from("student_profiles")
                .update({ grade_id: input.gradeId || null, updated_at: now })
                .eq("id", existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from("student_profiles")
                .insert(buildStudentProfileRow(userId, input.gradeId, now));
            if (error) throw error;
        }

        // Drop the profile the account no longer uses, otherwise the app would
        // still resolve them as a teacher.
        if (roleChanged) {
            await supabase.from("teacher_profiles").delete().eq("user_id", userId);
        }
        return;
    }

    const { data: existing } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

    if (existing) {
        const { error } = await supabase
            .from("teacher_profiles")
            .update({
                grade_id: input.gradeId || null,
                subject_id: input.subjectId || null,
                updated_at: now,
            })
            .eq("id", existing.id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from("teacher_profiles")
            .insert(buildTeacherProfileRow(userId, input.gradeId, input.subjectId, now));
        if (error) throw error;
    }

    if (roleChanged) {
        await supabase.from("student_profiles").delete().eq("user_id", userId);
    }
};

export type AdminSaveUserVariables = {
    input: AdminUserInput;
    organizationId?: string | null;
    /** The role the account held before this edit, used to clean up profiles. */
    previousRole?: string | null;
};

/** Create or update a student/teacher account together with its profile row. */
export const useAdminSaveUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ input, organizationId, previousRole }: AdminSaveUserVariables) => {
            if (!isAdminManagedRole(input.role)) {
                throw new AdminUserError("notManaged", "هذا الدور لا يُدار من لوحة المؤسسة");
            }

            const now = new Date().toISOString();
            const email = normalizeAdminEmail(input.email);
            const passwordHash = input.password ? hashPassword(input.password) : null;

            // The unique index on email would surface as a raw 23505; check up
            // front so the dialog can point at the right field.
            const { data: emailOwner } = await supabase
                .from("users")
                .select("id")
                .ilike("email", email)
                .maybeSingle();
            if (emailOwner && emailOwner.id !== input.id) {
                throw new AdminUserError("emailTaken", "هذا البريد مستخدم في حساب آخر");
            }

            const row = buildAdminUserRow(input, { organizationId, passwordHash, now });

            if (input.id) {
                let query = supabase.from("users").update(row).eq("id", input.id);
                // Never let an org admin's edit escape their tenant.
                if (organizationId) query = query.eq("organization_id", organizationId);

                const { data, error } = await query.select().maybeSingle();
                if (error) throw error;
                if (!data) {
                    throw new AdminUserError("outOfScope", "هذا الحساب لا ينتمي لمؤسستك");
                }

                await syncRoleProfile(input.id, input, previousRole ?? null, now);
                return data;
            }

            const { data, error } = await supabase
                .from("users")
                .insert({
                    ...row,
                    verified: true,
                    created_at: now,
                    individual_tier: null,
                })
                .select()
                .single();

            if (error) {
                if (error.code === "23505") {
                    throw new AdminUserError("emailTaken", "هذا البريد مستخدم في حساب آخر");
                }
                throw error;
            }

            await syncRoleProfile(data.id, input, null, now);
            return data;
        },
        onSuccess: () => invalidateUserQueries(queryClient),
    });
};

/**
 * Move a student to a different class.
 *
 * Split out from the full edit because it is the common repair — a student who
 * picked the wrong class at registration — and creates the profile row when a
 * student somehow has none.
 */
export const useAdminSetStudentGrade = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, gradeId }: { userId: string; gradeId: string | null }) => {
            const now = new Date().toISOString();

            const { data: existing, error: readError } = await supabase
                .from("student_profiles")
                .select("id")
                .eq("user_id", userId)
                .maybeSingle();
            if (readError) throw readError;

            if (existing) {
                const { error } = await supabase
                    .from("student_profiles")
                    .update({ grade_id: gradeId || null, updated_at: now })
                    .eq("id", existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("student_profiles")
                    .insert(buildStudentProfileRow(userId, gradeId, now));
                if (error) throw error;
            }

            return { userId, gradeId };
        },
        onSuccess: () => invalidateUserQueries(queryClient),
    });
};

/** Suspend or restore an account without deleting anything. */
export const useAdminSetUserActive = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId, isActive, organizationId,
        }: { userId: string; isActive: boolean; organizationId?: string | null }) => {
            let query = supabase
                .from("users")
                .update({ is_active: isActive, updated_at: new Date().toISOString() })
                .eq("id", userId);
            if (organizationId) query = query.eq("organization_id", organizationId);

            const { data, error } = await query.select("id, is_active").maybeSingle();
            if (error) throw error;
            if (!data) throw new AdminUserError("outOfScope", "هذا الحساب لا ينتمي لمؤسستك");
            return data;
        },
        onSuccess: () => invalidateUserQueries(queryClient),
    });
};

/**
 * Permanently delete a student/teacher account.
 *
 * The profile row, results, exam submissions and badges follow via ON DELETE
 * CASCADE; game history and audit entries are kept with the user detached.
 */
export const useAdminDeleteUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId, role, organizationId, currentUserId,
        }: {
            userId: string;
            role: AdminManagedRole | string;
            organizationId?: string | null;
            currentUserId?: string | null;
        }) => {
            if (currentUserId && currentUserId === userId) {
                throw new AdminUserError("selfDelete", "لا يمكنك حذف حسابك الخاص");
            }
            if (!isAdminManagedRole(role)) {
                throw new AdminUserError("notManaged", "هذا الحساب لا يُدار من لوحة المؤسسة");
            }

            let query = supabase
                .from("users")
                .delete()
                .eq("id", userId)
                // Belt and braces: the role guard above is on the caller's copy
                // of the row, this one is on the row actually being deleted.
                .in("role", ["STUDENT", "TEACHER"]);
            if (organizationId) query = query.eq("organization_id", organizationId);

            const { data, error } = await query.select("id").maybeSingle();
            if (error) throw error;
            if (!data) throw new AdminUserError("outOfScope", "تعذر حذف الحساب: خارج نطاق مؤسستك");
            return userId;
        },
        onSuccess: () => invalidateUserQueries(queryClient),
    });
};
