import md5 from "js-md5";
import { supabase } from "@/lib/supabase";
import { sendVerificationCode } from "@/lib/email";

export type PendingRole = "STUDENT" | "TEACHER";

export type PendingRegistrationPayload = {
    email: string;
    name: string;
    role: PendingRole;
    password: string;
    organizationId: string | null;
    gradeId: string | null;
};

export type PendingRegistrationRow = {
    id: string;
    email: string;
    name: string;
    role: string;
    organization_id: string | null;
    grade_id: string | null;
    password_hash: string;
    password_temp: string;
    pin: string;
    token: string;
    expires_at: string;
    used_at: string | null;
};

function randomPin(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function randomToken(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    }
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

/** Create a pending signup, email PIN + activation link, return token for navigation. */
export async function createPendingRegistrationAndSendEmail(
    payload: PendingRegistrationPayload,
    appUrl: string = typeof window !== "undefined" ? window.location.origin : ""
): Promise<{ email: string; token: string; pin: string }> {
    const email = payload.email.trim().toLowerCase();
    const name = payload.name.trim();
    const pin = randomPin();
    const token = randomToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Replace any previous unused pending row for this email
    await supabase
        .from("pending_registrations")
        .delete()
        .ilike("email", email)
        .is("used_at", null);

    const { error } = await supabase.from("pending_registrations").insert({
        email,
        name,
        role: payload.role,
        organization_id: payload.organizationId,
        grade_id: payload.role === "STUDENT" ? payload.gradeId : null,
        password_hash: String(md5(payload.password)).toLowerCase(),
        password_temp: payload.password,
        pin,
        token,
        expires_at: expiresAt,
    });

    if (error) {
        console.error("[pendingRegistration] insert error:", error);
        throw new Error(error.message || "Failed to create pending registration");
    }

    try {
        await sendVerificationCode({
            email,
            name,
            code: pin,
            token,
            appUrl,
        });
    } catch (sendErr) {
        await supabase.from("pending_registrations").delete().eq("token", token);
        throw sendErr;
    }

    return { email, token, pin };
}

export async function findPendingByToken(token: string): Promise<PendingRegistrationRow | null> {
    const { data, error } = await supabase
        .from("pending_registrations")
        .select("*")
        .eq("token", token)
        .is("used_at", null)
        .maybeSingle();

    if (error) {
        console.error("[pendingRegistration] findByToken:", error);
        return null;
    }
    return data as PendingRegistrationRow | null;
}

export async function findPendingByEmailAndPin(
    email: string,
    pin: string
): Promise<PendingRegistrationRow | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase
        .from("pending_registrations")
        .select("*")
        .ilike("email", normalizedEmail)
        .eq("pin", pin.trim())
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("[pendingRegistration] findByEmailAndPin:", error);
        return null;
    }
    return data as PendingRegistrationRow | null;
}

export function isPendingExpired(row: PendingRegistrationRow): boolean {
    return new Date(row.expires_at).getTime() < Date.now();
}

export async function markPendingUsed(id: string): Promise<void> {
    await supabase
        .from("pending_registrations")
        .update({ used_at: new Date().toISOString(), password_temp: "" })
        .eq("id", id);
}
