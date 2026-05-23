/** Fixed matching-game SFX (Mixkit, free license). */

/** Successful pair connected — short lock-in click. */
export const DEFAULT_MATCH_PAIR_SOUND_URL =
    "https://assets.mixkit.co/active_storage/sfx/2857/2857-preview.mp3";

/** Wrong pair attempt — short negative tap (not full answer buzz). */
export const DEFAULT_MATCH_WRONG_SOUND_URL =
    "https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3";

/** Tap when selecting a left/right item before pairing. */
export const DEFAULT_MATCH_SELECT_SOUND_URL =
    "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3";

export function resolveMatchPairSoundUrl(url?: string | null): string {
    const trimmed = url?.trim() || "";
    return trimmed || DEFAULT_MATCH_PAIR_SOUND_URL;
}

export function resolveMatchWrongSoundUrl(url?: string | null): string {
    const trimmed = url?.trim() || "";
    return trimmed || DEFAULT_MATCH_WRONG_SOUND_URL;
}
