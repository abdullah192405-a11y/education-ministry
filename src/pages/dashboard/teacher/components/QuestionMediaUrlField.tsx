import { useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Upload, Loader2, X, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@/hooks/useDatabase";
import { supabase } from "@/lib/supabase";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { getYouTubeEmbedUrl, getYouTubeId } from "@/lib/utils";

const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|m4a|aac|webm|flac|opus)$/i;

const isAudioFile = (file: File): boolean =>
    file.type.startsWith("audio/") || AUDIO_EXTENSIONS.test(file.name);

export type QuestionMediaKind = "image" | "video" | "audio";

type QuestionMediaUrlFieldProps = {
    kind: QuestionMediaKind;
    url?: string;
    onUrlChange: (url: string | undefined) => void;
    icon: LucideIcon;
    titleKey?: string;
    descKey: string;
    uploadKey: string;
    removeKey: string;
    pickFileKey: string;
    tooLargeKey: string;
    linkedToastKey: string;
    uploadFailedKey: string;
    /** When true, omit outer card (parent provides layout). */
    embedded?: boolean;
};

const KIND_CONFIG: Record<
    QuestionMediaKind,
    {
        accept: string;
        storageFolder: string;
        maxBytes: number;
        validate: (file: File) => boolean;
    }
> = {
    image: {
        accept: "image/*",
        storageFolder: "question-images",
        maxBytes: 5 * 1024 * 1024,
        validate: (file) => file.type.startsWith("image/"),
    },
    video: {
        accept: "video/*",
        storageFolder: "question-videos",
        maxBytes: 50 * 1024 * 1024,
        validate: (file) => file.type.startsWith("video/"),
    },
    audio: {
        accept: "audio/*",
        storageFolder: "question-audio",
        maxBytes: 25 * 1024 * 1024,
        validate: isAudioFile,
    },
};

export const QuestionMediaUrlField = ({
    kind,
    url,
    onUrlChange,
    icon: Icon,
    titleKey,
    descKey,
    uploadKey,
    removeKey,
    pickFileKey,
    tooLargeKey,
    linkedToastKey,
    uploadFailedKey,
    embedded = false,
}: QuestionMediaUrlFieldProps) => {
    const { data: user } = useUser();
    const { toast } = useToast();
    const { t } = useDashboardLocale();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const config = KIND_CONFIG[kind];

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!user?.id) {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.topics.qe.toast.notLoggedIn"), variant: "destructive" });
            return;
        }
        if (!config.validate(file)) {
            toast({ title: t("dash.teacher.topics.qe.toast.unsupportedType"), description: t(pickFileKey), variant: "destructive" });
            return;
        }
        if (file.size > config.maxBytes) {
            toast({ title: t("dash.teacher.topics.editor.toast.fileTooLarge5mb"), description: t(tooLargeKey), variant: "destructive" });
            return;
        }
        setIsUploading(true);
        try {
            const fileExt = file.name.split(".").pop() || (kind === "image" ? "png" : kind === "video" ? "mp4" : "mp3");
            const fileName = `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${fileExt}`;
            const filePath = `${user.id}/${config.storageFolder}/${fileName}`;
            const { error } = await supabase.storage.from("teacher-content").upload(filePath, file);
            if (error) throw error;
            const { data } = supabase.storage.from("teacher-content").getPublicUrl(filePath);
            onUrlChange(data.publicUrl);
            toast({ title: t("dash.teacher.topics.qe.toast.uploaded"), description: t(linkedToastKey) });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : t(uploadFailedKey);
            console.error(err);
            toast({
                title: t("dash.teacher.topics.editor.toast.uploadErr"),
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const renderPreview = () => {
        if (!url) return null;
        if (kind === "image") {
            return (
                <img
                    src={url}
                    alt=""
                    className="max-h-44 w-full rounded-md border object-contain bg-background"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                    }}
                />
            );
        }
        if (kind === "video") {
            if (getYouTubeId(url)) {
                return (
                    <div className="relative aspect-video w-full rounded-md overflow-hidden border bg-black">
                        <iframe
                            src={getYouTubeEmbedUrl(url).replace("autoplay=1", "autoplay=0")}
                            title=""
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                );
            }
            return <video src={url} controls playsInline className="max-h-44 w-full rounded-md border bg-black" />;
        }
        return <audio src={url} controls className="w-full" />;
    };

    const uploadControls = (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept={config.accept}
                className="hidden"
                onChange={handleFile}
            />
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative sm:flex-1">
                    <Link2 className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                        value={url || ""}
                        onChange={(e) => {
                            const v = e.target.value.trim();
                            onUrlChange(v ? v : undefined);
                        }}
                        placeholder="https://..."
                        dir="ltr"
                        className="ps-10 font-mono text-sm"
                    />
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    className="gap-2 shrink-0"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {t(url ? "dash.teacher.topics.qe.changeResource" : uploadKey)}
                </Button>
            </div>
        </>
    );

    const fields = (
        <div className="space-y-3">
            {!embedded && titleKey ? (
                <div className="flex items-start gap-2">
                    <div className="mt-0.5 rounded-md bg-background p-1.5 border">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                        <label className="text-sm font-medium block">{t(titleKey)}</label>
                        <p className="text-xs text-muted-foreground mt-0.5">{t(descKey)}</p>
                    </div>
                </div>
            ) : (
                <p className="text-xs text-muted-foreground">{t(descKey)}</p>
            )}

            {url ? (
                <div className="rounded-lg border bg-background p-3 space-y-3">
                    <div className="relative">
                        {renderPreview()}
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 end-2 h-7 w-7 shadow-sm"
                            onClick={() => onUrlChange(undefined)}
                            title={t(removeKey)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                            {t("dash.teacher.topics.qe.changeResource")}
                        </p>
                        {uploadControls}
                    </div>
                </div>
            ) : (
                uploadControls
            )}
        </div>
    );

    if (embedded) {
        return fields;
    }

    return (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            {fields}
        </div>
    );
};
