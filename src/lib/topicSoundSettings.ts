import { resolveMixkitSoundUrl } from "@/lib/mixkitSoundUrls";

/** Stored in DB when the teacher disables a sound for this lesson. */
export const SOUND_DISABLED_SENTINEL = "__none__";

export function isSoundDisabled(url?: string | null): boolean {
    return url?.trim() === SOUND_DISABLED_SENTINEL;
}

/** Editor/storage value for background sound: disabled sentinel or chosen URL. */
export function normalizeBackgroundSoundSelection(url?: string | null): string {
    if (isSoundDisabled(url)) return SOUND_DISABLED_SENTINEL;
    const trimmed = url?.trim() || "";
    return trimmed || SOUND_DISABLED_SENTINEL;
}

/**
 * Background override for useSound: null = disabled, string = custom URL.
 * Blank legacy values are treated as disabled so new lessons start without sound.
 */
export function resolveBackgroundSoundOverride(url?: string | null): string | null {
    const normalized = normalizeBackgroundSoundSelection(url);
    if (isSoundDisabled(normalized)) return null;
    return resolveMixkitSoundUrl(normalized);
}
