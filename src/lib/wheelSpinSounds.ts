/** Fixed wheel-spin SFX (Mixkit, free license). No uploads — pick from presets only. */

/** Wheel animation + sound length (seconds). Keep in sync everywhere. */
export const WHEEL_SPIN_DURATION_MS = 4000;
export const WHEEL_SPIN_DURATION_SEC = WHEEL_SPIN_DURATION_MS / 1000;

/** Easing matched to decelerating wheel stop. */
export const WHEEL_SPIN_EASE = [0.2, 0.8, 0.2, 1] as const;

/** Tick-tick prize wheel (long clip; playback stops at WHEEL_SPIN_DURATION_MS). */
export const DEFAULT_WHEEL_SPIN_SOUND_URL =
    "https://assets.mixkit.co/active_storage/sfx/2642/2642-preview.mp3";

export const WHEEL_SPIN_SOUND_PRESETS = [
    {
        id: "rattle",
        labelKey: "dash.teacher.topics.editor.sound.wheelRattle",
        url: DEFAULT_WHEEL_SPIN_SOUND_URL,
    },
    {
        id: "electric",
        labelKey: "dash.teacher.topics.editor.sound.wheelElectric",
        url: "https://assets.mixkit.co/active_storage/sfx/2646/2646-preview.mp3",
    },
    {
        id: "game-machine",
        labelKey: "dash.teacher.topics.editor.sound.wheelGameMachine",
        url: "https://assets.mixkit.co/active_storage/sfx/2645/2645-preview.mp3",
    },
    {
        id: "fast-spin",
        labelKey: "dash.teacher.topics.editor.sound.wheelFast",
        url: "https://assets.mixkit.co/active_storage/sfx/1614/1614-preview.mp3",
    },
    {
        id: "bike",
        labelKey: "dash.teacher.topics.editor.sound.wheelBike",
        url: "https://assets.mixkit.co/active_storage/sfx/1613/1613-preview.mp3",
    },
] as const;

export const LEGACY_BROKEN_WHEEL_SOUND_URL =
    "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3";

/** Previous default before rattle tick sound. */
export const LEGACY_WHEEL_SPIN_SOUND_URL =
    "https://assets.mixkit.co/active_storage/sfx/2645/2645-preview.mp3";

/** Normalize stored URL (empty, legacy URLs → default preset). */
export function resolveWheelSpinSoundUrl(url?: string | null): string {
    const trimmed = url?.trim() || "";
    if (
        !trimmed ||
        trimmed === LEGACY_BROKEN_WHEEL_SOUND_URL ||
        trimmed === LEGACY_WHEEL_SPIN_SOUND_URL
    ) {
        return DEFAULT_WHEEL_SPIN_SOUND_URL;
    }
    return trimmed;
}
