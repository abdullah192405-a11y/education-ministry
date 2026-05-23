import { getYouTubeEmbedUrl, getYouTubeId } from "@/lib/utils";

interface QuestionAttachmentDisplayProps {
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    className?: string;
}

/** Renders optional image, video, and audio shown with a challenge or exam question. */
export const QuestionAttachmentDisplay = ({
    imageUrl,
    videoUrl,
    audioUrl,
    className = "mb-8",
}: QuestionAttachmentDisplayProps) => {
    if (!imageUrl && !videoUrl && !audioUrl) return null;

    return (
        <div className={`flex flex-col items-center gap-4 ${className}`}>
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt=""
                    className="max-h-60 max-w-full rounded-xl object-contain border shadow-sm"
                />
            ) : null}
            {videoUrl ? (
                <div className="w-full max-w-2xl">
                    {getYouTubeId(videoUrl) ? (
                        <div className="relative aspect-video rounded-xl overflow-hidden border shadow-sm bg-black">
                            <iframe
                                src={getYouTubeEmbedUrl(videoUrl).replace("autoplay=1", "autoplay=0")}
                                title=""
                                className="absolute inset-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    ) : (
                        <video
                            src={videoUrl}
                            controls
                            playsInline
                            className="w-full max-h-72 rounded-xl border shadow-sm bg-black"
                        />
                    )}
                </div>
            ) : null}
            {audioUrl ? (
                <audio src={audioUrl} controls className="w-full max-w-md" />
            ) : null}
        </div>
    );
};
