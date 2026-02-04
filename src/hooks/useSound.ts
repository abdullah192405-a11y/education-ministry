import { useRef, useEffect, useCallback } from 'react';

export type SoundType =
    | 'correct'
    | 'wrong'
    | 'click'
    | 'countdown'
    | 'wheel_spin'
    | 'achievement'
    | 'background';

// Sound URLs - using free sound effects
const SOUNDS: Record<SoundType, string> = {
    correct: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    wrong: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
    click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    countdown: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    wheel_spin: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    achievement: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    background: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3'
};

export const useSound = (enabled: boolean = true) => {
    const audioRefs = useRef<Record<SoundType, HTMLAudioElement>>({} as Record<SoundType, HTMLAudioElement>);

    useEffect(() => {
        // Preload all sounds
        Object.entries(SOUNDS).forEach(([type, url]) => {
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
            // Cleanup
            Object.values(audioRefs.current).forEach(audio => {
                audio.pause();
                audio.src = '';
            });
        };
    }, []);

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
        const audio = audioRefs.current[type];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }, []);

    const setVolume = useCallback((type: SoundType, volume: number) => {
        const audio = audioRefs.current[type];
        if (audio) {
            audio.volume = Math.max(0, Math.min(1, volume));
        }
    }, []);

    return { play, stop, setVolume };
};
