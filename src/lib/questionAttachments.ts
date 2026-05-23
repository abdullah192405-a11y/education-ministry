/** At most one of image / video / audio per question (image wins if multiple are set). */
export function exclusiveQuestionAttachmentFields(q: {
    imageUrl?: string | null;
    videoUrl?: string | null;
    audioUrl?: string | null;
}): { image_url: string | null; video_url: string | null; audio_url: string | null } {
    if (q.imageUrl) {
        return { image_url: q.imageUrl, video_url: null, audio_url: null };
    }
    if (q.videoUrl) {
        return { image_url: null, video_url: q.videoUrl, audio_url: null };
    }
    if (q.audioUrl) {
        return { image_url: null, video_url: null, audio_url: q.audioUrl };
    }
    return { image_url: null, video_url: null, audio_url: null };
}
