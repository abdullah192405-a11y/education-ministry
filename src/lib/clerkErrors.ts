import type { TFunction } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";

/** Map Clerk API error codes to existing i18n keys (never show English Clerk text). */
const CLERK_ERROR_KEYS: Record<string, TranslationKey> = {
    form_password_pwned: "register.errPasswordPwned",
    form_password_not_strong_enough: "register.errPasswordPwned",
    form_password_validation_failed: "register.errPasswordPwned",
    form_password_length_too_short: "register.errPasswordShort",
    form_password_size_in_bytes: "register.errPasswordShort",
    form_identifier_exists: "register.errEmailExists",
    form_identifier_not_found: "login.errInvalidCredentials",
    form_password_incorrect: "login.errInvalidCredentials",
    form_code_incorrect: "register.errInvalidCode",
    verification_expired: "verify.errExpired",
    verification_failed: "register.errInvalidCode",
    form_param_format_invalid: "register.errGeneric",
    form_param_nil: "register.errGeneric",
    too_many_requests: "register.errTooManyRequests",
    session_exists: "register.errSessionExists",
};

type ClerkLikeError = {
    errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
    message?: string;
};

function rawClerkText(err: unknown): string {
    const e = err as ClerkLikeError | null;
    return String(e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || e?.message || "");
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";

function randomInt(max: number): number {
    try {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0] % max;
    } catch {
        return Math.floor(Math.random() * max);
    }
}

function pick(chars: string): string {
    return chars[randomInt(chars.length)];
}

/** Random example that always includes upper, lower, digit, and symbol. */
export function randomPasswordExample(length = 10): string {
    const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
    const all = UPPER + LOWER + DIGITS + SYMBOLS;
    const rest = Array.from({ length: Math.max(0, length - required.length) }, () => pick(all));
    const chars = [...required, ...rest];
    for (let i = chars.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
}

/** Password to actually fill into a sign-up form (long enough to pass Clerk's strength check). */
export function generateStrongPassword(length = 14): string {
    return randomPasswordExample(Math.max(12, Math.min(length, 24)));
}

function translateKey(t: TFunction, key: TranslationKey): string {
    if (key === "register.errPasswordPwned") {
        return t(key, { example: randomPasswordExample() });
    }
    return t(key);
}

/**
 * Resolve a Clerk (or Clerk-shaped) error to a localized UI message.
 * Falls back to `fallback` — never returns English Clerk API strings.
 */
export function getClerkErrorMessage(
    err: unknown,
    t: TFunction,
    fallback: TranslationKey
): string {
    const e = err as ClerkLikeError | null;
    const code = e?.errors?.[0]?.code;
    if (code && CLERK_ERROR_KEYS[code]) {
        return translateKey(t, CLERK_ERROR_KEYS[code]);
    }

    const lower = rawClerkText(err).toLowerCase();
    if (
        lower.includes("data breach") ||
        lower.includes("pwned") ||
        lower.includes("compromised") ||
        lower.includes("not strong enough") ||
        lower.includes("found in an online")
    ) {
        return translateKey(t, "register.errPasswordPwned");
    }
    if (lower.includes("password") && (lower.includes("short") || lower.includes("at least") || lower.includes("too long"))) {
        return t("register.errPasswordShort");
    }
    if (
        (lower.includes("already") && (lower.includes("exists") || lower.includes("taken") || lower.includes("registered"))) ||
        lower.includes("identifier_exists")
    ) {
        return t("register.errEmailExists");
    }
    if (lower.includes("incorrect") && (lower.includes("code") || lower.includes("verification"))) {
        return t("register.errInvalidCode");
    }
    if (lower.includes("too many") || lower.includes("rate limit")) {
        return t("register.errTooManyRequests");
    }
    if (lower.includes("session already")) {
        return t("register.errSessionExists");
    }

    return t(fallback);
}
