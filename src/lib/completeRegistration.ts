import { supabase } from "@/lib/supabase";
import type { PendingRegistrationRow } from "@/lib/pendingRegistration";
import { markPendingUsed } from "@/lib/pendingRegistration";

/**
 * After Clerk email verification: create Supabase user + registration request.
 * Clerk account is already created/verified by the caller.
 */
export async function completeVerifiedRegistration(opts: {
    pending: PendingRegistrationRow;
    detailsStudent: string;
    detailsTeacher: string;
}): Promise<{ user: Record<string, unknown> }> {
    const { pending, detailsStudent, detailsTeacher } = opts;
    const email = pending.email.trim().toLowerCase();
    const name = pending.name.trim();
    const role = pending.role as "STUDENT" | "TEACHER";
    const now = new Date().toISOString();

    let dbUser: Record<string, unknown> | null = null;

    const { data: existing } = await supabase
        .from("users")
        .select("*")
        .ilike("email", email)
        .maybeSingle();

    if (existing) {
        await supabase
            .from("users")
            .update({
                verified: true,
                password_hash: pending.password_hash,
                name,
                organization_id: pending.organization_id,
                updated_at: now,
            })
            .eq("id", existing.id);
        dbUser = { ...existing, verified: true, name };
    } else {
        const { data: newUser, error: userError } = await supabase
            .from("users")
            .insert({
                email,
                name,
                role,
                verified: true,
                is_active: false,
                password_hash: pending.password_hash,
                organization_id: pending.organization_id,
                details: role === "STUDENT" ? detailsStudent : detailsTeacher,
                updated_at: now,
                individual_tier: null,
            })
            .select()
            .single();

        if (userError || !newUser) {
            console.error("[completeRegistration] user insert:", userError);
            throw new Error(userError?.message || "Failed to create user");
        }

        dbUser = newUser;

        if (role === "STUDENT") {
            await supabase.from("student_profiles").insert({
                user_id: newUser.id,
                grade_id: pending.grade_id || null,
                total_points: 0,
                total_challenges: 0,
                completed_topics: 0,
                average_score: 0,
                longest_streak: 0,
                current_streak: 0,
                total_study_hours: 0,
                updated_at: now,
            });
        } else {
            await supabase.from("teacher_profiles").insert({
                user_id: newUser.id,
                grade_id: null,
                total_students: 0,
                total_topics: 0,
                total_challenges: 0,
                average_score: 0,
                updated_at: now,
            });
        }
    }

    const requestRow: Record<string, unknown> = {
        applicant_user_id: dbUser.id,
        applicant_role: role,
        organization_id: pending.organization_id,
        grade_id: role === "STUDENT" ? pending.grade_id : null,
        status: "PENDING",
        created_at: now,
        updated_at: now,
        approver_role: role === "TEACHER" ? "ADMIN" : "TEACHER",
    };
    if (role === "STUDENT") {
        requestRow.teacher_user_id = null;
    }

    const { error: reqError } = await supabase
        .from("registration_requests")
        .upsert(requestRow, { onConflict: "applicant_user_id" });
    if (reqError) {
        console.warn("[completeRegistration] registration_requests:", reqError);
    }

    await markPendingUsed(pending.id);

    return { user: dbUser };
}
