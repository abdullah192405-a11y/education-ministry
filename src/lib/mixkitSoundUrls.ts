/** Mixkit CDN preview URLs used for lesson sound presets. */

export function mixkitSfxPreviewUrl(id: number): string {
    return `https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`;
}

export const DEFAULT_CORRECT_SOUND_URL = mixkitSfxPreviewUrl(2000);
export const DEFAULT_WRONG_SOUND_URL = mixkitSfxPreviewUrl(2955);
export const DEFAULT_ACHIEVEMENT_SOUND_URL = mixkitSfxPreviewUrl(1440);
export const DEFAULT_BACKGROUND_SOUND_URL = mixkitSfxPreviewUrl(130);

/** Preset #3 was 1435 — that asset now returns 403 on Mixkit. */
export const CORRECT_SOUND_PRESET_3_URL = mixkitSfxPreviewUrl(1440);

export const BACKGROUND_SOUND_PRESET_URLS = [
    mixkitSfxPreviewUrl(130),
    mixkitSfxPreviewUrl(466),
    mixkitSfxPreviewUrl(32),
    mixkitSfxPreviewUrl(213),
    mixkitSfxPreviewUrl(689),
    mixkitSfxPreviewUrl(120),
    mixkitSfxPreviewUrl(442),
] as const;

const LEGACY_MUSIC_PREVIEW_RE =
    /^https:\/\/assets\.mixkit\.co\/music\/preview\/mixkit-.+-(\d+)\.mp3$/;

/** Old music/preview paths and retired SFX IDs → working active_storage URLs. */
const LEGACY_SOUND_URL_MIGRATIONS: Record<string, string> = {
    "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3": mixkitSfxPreviewUrl(130),
    "https://assets.mixkit.co/music/preview/mixkit-games-worldbeat-466.mp3": mixkitSfxPreviewUrl(466),
    "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3": mixkitSfxPreviewUrl(32),
    "https://assets.mixkit.co/music/preview/mixkit-arcade-retro-game-over-213.mp3": mixkitSfxPreviewUrl(213),
    "https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3": mixkitSfxPreviewUrl(689),
    "https://assets.mixkit.co/music/preview/mixkit-valley-sunset-127.mp3": mixkitSfxPreviewUrl(120),
    "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3": mixkitSfxPreviewUrl(442),
    "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3": CORRECT_SOUND_PRESET_3_URL,
    [mixkitSfxPreviewUrl(127)]: mixkitSfxPreviewUrl(120),
    [mixkitSfxPreviewUrl(443)]: mixkitSfxPreviewUrl(442),
};

/** Map a stored or preset URL to a working Mixkit playback URL. */
export function resolveMixkitSoundUrl(url?: string | null): string {
    const trimmed = url?.trim() || "";
    if (!trimmed) return "";

    const explicit = LEGACY_SOUND_URL_MIGRATIONS[trimmed];
    if (explicit) return explicit;

    const musicMatch = trimmed.match(LEGACY_MUSIC_PREVIEW_RE);
    if (musicMatch) {
        const id = Number(musicMatch[1]);
        if (id === 127) return mixkitSfxPreviewUrl(120);
        if (id === 443) return mixkitSfxPreviewUrl(442);
        return mixkitSfxPreviewUrl(id);
    }

    return trimmed;
}
