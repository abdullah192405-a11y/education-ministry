/**
 * Signup choices (role / organization / grade) made on the Register page before a
 * Google OAuth redirect. Clerk sends the browser away and back, so the selection is
 * parked in sessionStorage and read again by the SSO completion screen.
 */

const STORAGE_KEY = "edu_signup_intent";
const MAX_AGE_MS = 30 * 60 * 1000;

export type SignupIntent = {
    role: "STUDENT" | "TEACHER";
    organizationId: string | null;
    gradeId: string | null;
    createdAt: number;
};

export function saveSignupIntent(intent: Omit<SignupIntent, "createdAt">): void {
    try {
        sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...intent, createdAt: Date.now() } satisfies SignupIntent)
        );
    } catch {
        // Storage unavailable (private mode) — SSO falls back to a default student signup.
    }
}

export function readSignupIntent(): SignupIntent | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as Partial<SignupIntent>;
        if (parsed.role !== "STUDENT" && parsed.role !== "TEACHER") return null;
        if (!parsed.createdAt || Date.now() - parsed.createdAt > MAX_AGE_MS) {
            clearSignupIntent();
            return null;
        }

        return {
            role: parsed.role,
            organizationId: parsed.organizationId ?? null,
            gradeId: parsed.role === "STUDENT" ? parsed.gradeId ?? null : null,
            createdAt: parsed.createdAt,
        };
    } catch {
        return null;
    }
}

export function clearSignupIntent(): void {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore storage errors.
    }
}
