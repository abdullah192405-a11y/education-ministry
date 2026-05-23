import { useRef, useEffect, useCallback } from 'react';
import {
    DEFAULT_MATCH_PAIR_SOUND_URL,
    DEFAULT_MATCH_WRONG_SOUND_URL,
} from '@/lib/matchingSounds';
import { DEFAULT_WHEEL_SPIN_SOUND_URL, WHEEL_SPIN_DURATION_MS } from '@/lib/wheelSpinSounds';

export type SoundType =
    | 'correct'
    | 'wrong'
    | 'click'
    | 'countdown'
    | 'wheel_spin'
    | 'match_pair'
    | 'match_wrong'
    | 'achievement'
    | 'background';

// Sound URLs - using free sound effects
const SOUNDS: Record<SoundType, string> = {
    correct: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    wrong: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
    click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    countdown: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    wheel_spin: DEFAULT_WHEEL_SPIN_SOUND_URL,
    match_pair: DEFAULT_MATCH_PAIR_SOUND_URL,
    match_wrong: DEFAULT_MATCH_WRONG_SOUND_URL,
    achievement: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    background: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3'
};

type SoundOverrides = Partial<Record<SoundType, string>>;

/** Apply only non-empty override URLs so defaults are not replaced with undefined. */
export function mergeSoundOverrides(base: Record<SoundType, string>, overrides: SoundOverrides): Record<SoundType, string> {
    const merged = { ...base };
    for (const [key, url] of Object.entries(overrides) as [SoundType, string | undefined][]) {
        const trimmed = typeof url === "string" ? url.trim() : "";
        if (trimmed) merged[key] = trimmed;
    }
    return merged;
}

export const useSound = (enabled: boolean = true, overrides: SoundOverrides = {}) => {
    const audioRefs = useRef<Record<SoundType, HTMLAudioElement>>({} as Record<SoundType, HTMLAudioElement>);
    const wheelSpinStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const overrideKey = JSON.stringify(overrides);

    useEffect(() => {
        const mergedSounds = mergeSoundOverrides(SOUNDS, overrides);

        // Preload all sounds
        Object.entries(mergedSounds).forEach(([type, url]) => {
            const audio = new Audio(url);
            audio.preload = 'auto';
            if (type === 'background') {
                audio.loop = true;
                audio.volume = 0.3;
            } else {
                audio.volume = 0.5;
            }
            audioRefs.current[type as SoundType] = audio;
        });

        return () => {
            if (wheelSpinStopTimerRef.current) {
                clearTimeout(wheelSpinStopTimerRef.current);
            }
            // Cleanup
            Object.values(audioRefs.current).forEach(audio => {
                audio.pause();
                audio.src = '';
            });
        };
    }, [overrideKey]);

    const play = useCallback((type: SoundType) => {
        if (!enabled) return;

        const audio = audioRefs.current[type];
        if (audio) {
            // Reset and play
            audio.currentTime = 0;
            audio.play().catch(err => {
                // Ignore play errors (browser autoplay policy)
                console.debug('Sound play prevented:', err);
            });
        }
    }, [enabled]);

    const stop = useCallback((type: SoundType) => {
        if (type === 'wheel_spin' && wheelSpinStopTimerRef.current) {
            clearTimeout(wheelSpinStopTimerRef.current);
            wheelSpinStopTimerRef.current = null;
        }
        const audio = audioRefs.current[type];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }, []);

    /** Play wheel SFX for exactly the wheel spin animation duration. */
    const playWheelSpin = useCallback(() => {
        if (!enabled) return;

        const audio = audioRefs.current.wheel_spin;
        if (!audio) return;

        if (wheelSpinStopTimerRef.current) {
            clearTimeout(wheelSpinStopTimerRef.current);
        }

        audio.currentTime = 0;
        audio.play().catch(err => {
            console.debug('Sound play prevented:', err);
        });

        wheelSpinStopTimerRef.current = setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
            wheelSpinStopTimerRef.current = null;
        }, WHEEL_SPIN_DURATION_MS);
    }, [enabled]);

    const setVolume = useCallback((type: SoundType, volume: number) => {
        const audio = audioRefs.current[type];
        if (audio) {
            audio.volume = Math.max(0, Math.min(1, volume));
        }
    }, []);

    return { play, playWheelSpin, stop, setVolume };
};
