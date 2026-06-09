import {
    Video, Image, FileText, FileType, Headphones, Link2, Play,
} from "lucide-react";
import type { ContentMedia } from "@/data/challengeTypes";
import type { TFunction } from "@/contexts/LanguageContext";
import { getYouTubeThumbnail } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const normalizeResourceUrl = (raw?: string): string => {
    const trimmed = (raw || "").trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
};

export const getImageResourceSrc = (resource: ContentMedia): string | null => {
    if (resource.type !== "image") return null;
    if (resource.url) return resource.url;
    if (resource.imageBase64) return `data:image/jpeg;base64,${resource.imageBase64}`;
    return null;
};

export const getVideoThumbnailSrc = (resource: ContentMedia): string | null => {
    if (resource.type !== "video" || !resource.url) return null;
    return getYouTubeThumbnail(resource.url);
};

export const getLinkHostname = (raw?: string): string => {
    const url = normalizeResourceUrl(raw);
    if (!url) return "";
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
};

const stopInteractiveBubble = (e: React.SyntheticEvent) => {
    e.stopPropagation();
};

interface ContentResourceThumbnailProps {
    item: ContentMedia;
    t: TFunction;
    interactive?: boolean;
    className?: string;
}

const ContentResourceThumbnail = ({
    item,
    t,
    interactive = false,
    className,
}: ContentResourceThumbnailProps) => {
    const bubble = interactive ? stopInteractiveBubble : undefined;

    const renderFallbackIcon = () => {
        switch (item.type) {
            case "video": return <Video className="w-5 h-5 text-red-500" />;
            case "image": return <Image className="w-5 h-5 text-blue-500" />;
            case "text": return <FileText className="w-5 h-5 text-green-500" />;
            case "pdf": return <FileType className="w-5 h-5 text-orange-500" />;
            case "audio": return <Headphones className="w-5 h-5 text-violet-500" />;
            case "link": return <Link2 className="w-5 h-5 text-sky-600" />;
            default: return <FileText className="w-5 h-5" />;
        }
    };

    const content = (() => {
        switch (item.type) {
            case "image": {
                const imageSrc = getImageResourceSrc(item);
                if (!imageSrc) {
                    return (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-blue-500/10 p-1.5">
                            <Image className="w-5 h-5 text-blue-500" />
                            <span className="text-[9px] text-muted-foreground line-clamp-2 text-center break-all px-1">
                                {item.url || t("dash.teacher.topics.editor.attachedImage")}
                            </span>
                        </div>
                    );
                }
                return (
                    <img
                        src={imageSrc}
                        alt={item.caption || item.fileName || t("dash.teacher.topics.editor.imagePreview")}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                );
            }
            case "video": {
                const videoThumb = getVideoThumbnailSrc(item);
                if (videoThumb) {
                    return (
                        <>
                            <img
                                src={videoThumb}
                                alt={item.caption || t("dash.teacher.topics.editor.videoPreview")}
                                className="h-full w-full object-cover"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                                <Play className="w-4 h-4 text-white fill-current" />
                            </div>
                        </>
                    );
                }
                if (item.url) {
                    return (
                        <div className="relative h-full w-full bg-black/80" onClick={bubble} onPointerDown={bubble}>
                            <video
                                src={item.url}
                                className="h-full w-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                                controls
                            />
                        </div>
                    );
                }
                return (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-red-500/10 p-1.5">
                        <Video className="w-5 h-5 text-red-500" />
                        <span className="text-[9px] text-muted-foreground">{t("dash.teacher.topics.editor.mediaType.video")}</span>
                    </div>
                );
            }
            case "pdf": {
                const pdfSrc = item.url
                    ? `${item.url}#page=1&view=FitH`
                    : item.pdfBase64
                        ? `data:application/pdf;base64,${item.pdfBase64}`
                        : null;
                if (pdfSrc) {
                    return (
                        <div className="relative h-full w-full bg-orange-500/5" onClick={bubble} onPointerDown={bubble}>
                            <embed
                                src={pdfSrc}
                                type="application/pdf"
                                className="h-full w-full pointer-events-none"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-orange-600/85 px-1 py-0.5 pointer-events-none">
                                <p className="text-[8px] text-white truncate text-center">
                                    {item.fileName || t("dash.teacher.topics.editor.pdfFile")}
                                </p>
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-orange-500/10 p-1.5">
                        <FileType className="w-5 h-5 text-orange-500" />
                        <span className="text-[9px] text-muted-foreground line-clamp-2 text-center break-all px-1">
                            {item.fileName || t("dash.teacher.topics.editor.pdfFile")}
                        </span>
                    </div>
                );
            }
            case "audio":
                if (item.url) {
                    return (
                        <div
                            className="flex h-full w-full flex-col items-center justify-center gap-1 bg-violet-500/10 p-1"
                            onClick={bubble}
                            onPointerDown={bubble}
                        >
                            <Headphones className="w-4 h-4 text-violet-500 shrink-0" />
                            <audio controls preload="none" src={item.url} className="h-8 w-full min-w-0" />
                        </div>
                    );
                }
                return (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-violet-500/10 p-1.5">
                        <Headphones className="w-5 h-5 text-violet-500" />
                        <span className="text-[9px] text-muted-foreground line-clamp-2 text-center break-all px-1">
                            {item.fileName || t("dash.teacher.topics.editor.audioFile")}
                        </span>
                    </div>
                );
            case "text":
                return (
                    <div className="h-full w-full overflow-hidden bg-green-500/10 p-1.5">
                        <p className="text-[9px] leading-tight text-foreground/80 line-clamp-4 whitespace-pre-wrap break-words">
                            {item.content?.trim() || t("dash.teacher.topics.editor.mediaType.text")}
                        </p>
                    </div>
                );
            case "link": {
                const host = getLinkHostname(item.url);
                return (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-sky-500/10 p-1.5 text-center">
                        <Link2 className="w-5 h-5 text-sky-600 shrink-0" />
                        <span className="text-[9px] font-medium text-sky-700 dark:text-sky-400 line-clamp-1 break-all px-1">
                            {host || t("dash.teacher.topics.editor.mediaType.link")}
                        </span>
                        {item.url && (
                            <span className="text-[8px] text-muted-foreground line-clamp-2 break-all px-1">
                                {item.url}
                            </span>
                        )}
                    </div>
                );
            }
            default:
                return (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                        {renderFallbackIcon()}
                    </div>
                );
        }
    })();

    return (
        <div className={cn("relative h-full w-full overflow-hidden bg-muted/30", className)}>
            {content}
        </div>
    );
};

export default ContentResourceThumbnail;
