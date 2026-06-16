import { resolveMixkitSoundUrl } from "@/lib/mixkitSoundUrls";

/** Stored in DB when the teacher disables a sound for this lesson. */
export const SOUND_DISABLED_SENTINEL = "__none__";

export function isSoundDisabled(url?: string | null): boolean {
    return url?.trim() === SOUND_DISABLED_SENTINEL;
}

/**
 * Background override for useSound: undefined = default preset, null = disabled, string = custom URL.
 */
export function resolveBackgroundSoundOverride(url?: string | null): string | null | undefined {
    if (isSoundDisabled(url)) return null;
    const trimmed = url?.trim() || "";
    if (!trimmed) return undefined;
    return resolveMixkitSoundUrl(trimmed);
}
