/** Maps question attachment URLs to DB columns (image, video, and audio may all be set). */
export function questionAttachmentFields(q: {
    imageUrl?: string | null;
    videoUrl?: string | null;
    audioUrl?: string | null;
}): { image_url: string | null; video_url: string | null; audio_url: string | null } {
    const trim = (v?: string | null) => {
        const s = v?.trim();
        return s ? s : null;
    };
    return {
        image_url: trim(q.imageUrl),
        video_url: trim(q.videoUrl),
        audio_url: trim(q.audioUrl),
    };
}

/** @deprecated Alias for questionAttachmentFields */
export const exclusiveQuestionAttachmentFields = questionAttachmentFields;
