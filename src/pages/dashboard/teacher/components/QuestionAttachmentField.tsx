import { useEffect, useState } from "react";
import { Image as ImageIcon, Video, Headphones, Paperclip } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { QuestionMediaUrlField, type QuestionMediaKind } from "./QuestionMediaUrlField";

export type QuestionAttachmentType = "none" | QuestionMediaKind;

export type QuestionAttachmentValue = {
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
};

const inferAttachmentType = (value: QuestionAttachmentValue): QuestionAttachmentType => {
    if (value.imageUrl) return "image";
    if (value.videoUrl) return "video";
    if (value.audioUrl) return "audio";
    return "none";
};

const emptyAttachments = (): QuestionAttachmentValue => ({
    imageUrl: undefined,
    videoUrl: undefined,
    audioUrl: undefined,
});

const MEDIA_FIELD_PROPS: Record<
    QuestionMediaKind,
    {
        icon: typeof ImageIcon;
        titleKey: string;
        descKey: string;
        uploadKey: string;
        removeKey: string;
        pickFileKey: string;
        tooLargeKey: string;
        linkedToastKey: string;
        uploadFailedKey: string;
    }
> = {
    image: {
        icon: ImageIcon,
        titleKey: "dash.teacher.topics.qe.questionImageOptional",
        descKey: "dash.teacher.topics.qe.questionImageDesc",
        uploadKey: "dash.teacher.topics.qe.uploadImage",
        removeKey: "dash.teacher.topics.qe.removeImage",
        pickFileKey: "dash.teacher.topics.qe.toast.pickImage",
        tooLargeKey: "dash.teacher.topics.qe.toast.imageTooLarge",
        linkedToastKey: "dash.teacher.topics.qe.toast.imageLinked",
        uploadFailedKey: "dash.teacher.topics.qe.toast.uploadFailed",
    },
    video: {
        icon: Video,
        titleKey: "dash.teacher.topics.qe.questionVideoOptional",
        descKey: "dash.teacher.topics.qe.questionVideoDesc",
        uploadKey: "dash.teacher.topics.qe.uploadVideo",
        removeKey: "dash.teacher.topics.qe.removeVideo",
        pickFileKey: "dash.teacher.topics.qe.toast.pickVideo",
        tooLargeKey: "dash.teacher.topics.qe.toast.videoTooLarge",
        linkedToastKey: "dash.teacher.topics.qe.toast.videoLinked",
        uploadFailedKey: "dash.teacher.topics.qe.toast.videoUploadFailed",
    },
    audio: {
        icon: Headphones,
        titleKey: "dash.teacher.topics.qe.questionAudioOptional",
        descKey: "dash.teacher.topics.qe.questionAudioDesc",
        uploadKey: "dash.teacher.topics.qe.uploadAudio",
        removeKey: "dash.teacher.topics.qe.removeAudio",
        pickFileKey: "dash.teacher.topics.qe.toast.pickAudio",
        tooLargeKey: "dash.teacher.topics.editor.toast.fileTooLarge25mb",
        linkedToastKey: "dash.teacher.topics.qe.toast.audioLinked",
        uploadFailedKey: "dash.teacher.topics.qe.toast.audioUploadFailed",
    },
};

type QuestionAttachmentFieldProps = {
    value: QuestionAttachmentValue;
    onChange: (value: QuestionAttachmentValue) => void;
};

export const QuestionAttachmentField = ({ value, onChange }: QuestionAttachmentFieldProps) => {
    const { t } = useDashboardLocale();
    const inferred = inferAttachmentType(value);
    const [selectedType, setSelectedType] = useState<QuestionAttachmentType>(inferred);

    // Sync from saved URLs only (do not reset while user picked a type but has not uploaded yet)
    useEffect(() => {
        if (inferred !== "none") {
            setSelectedType(inferred);
        }
    }, [inferred]);

    const handleTypeChange = (next: QuestionAttachmentType) => {
        setSelectedType(next);
        onChange(emptyAttachments());
    };

    const handleUrlChange = (url: string | undefined) => {
        if (selectedType === "none") return;
        onChange({
            ...emptyAttachments(),
            ...(selectedType === "image" ? { imageUrl: url } : {}),
            ...(selectedType === "video" ? { videoUrl: url } : {}),
            ...(selectedType === "audio" ? { audioUrl: url } : {}),
        });
    };

    const currentUrl =
        selectedType === "image"
            ? value.imageUrl
            : selectedType === "video"
              ? value.videoUrl
              : selectedType === "audio"
                ? value.audioUrl
                : undefined;

    const mediaProps = selectedType !== "none" ? MEDIA_FIELD_PROPS[selectedType] : null;

    return (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start gap-2">
                <div className="mt-0.5 rounded-md bg-background p-1.5 border">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                    <div>
                        <label className="text-sm font-medium block">
                            {t("dash.teacher.topics.qe.questionAttachmentOptional")}
                        </label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {t("dash.teacher.topics.qe.questionAttachmentDesc")}
                        </p>
                    </div>
                    <Select
                        value={selectedType}
                        onValueChange={(v) => handleTypeChange(v as QuestionAttachmentType)}
                    >
                        <SelectTrigger className="w-full sm:max-w-xs bg-background">
                            <SelectValue placeholder={t("dash.teacher.topics.qe.attachmentTypePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">{t("dash.teacher.topics.qe.attachmentTypeNone")}</SelectItem>
                            <SelectItem value="image">{t("dash.teacher.topics.qe.attachmentTypeImage")}</SelectItem>
                            <SelectItem value="video">{t("dash.teacher.topics.qe.attachmentTypeVideo")}</SelectItem>
                            <SelectItem value="audio">{t("dash.teacher.topics.qe.attachmentTypeAudio")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {mediaProps ? (
                <QuestionMediaUrlField
                    kind={selectedType}
                    icon={mediaProps.icon}
                    url={currentUrl}
                    onUrlChange={handleUrlChange}
                    titleKey={mediaProps.titleKey}
                    descKey={mediaProps.descKey}
                    uploadKey={mediaProps.uploadKey}
                    removeKey={mediaProps.removeKey}
                    pickFileKey={mediaProps.pickFileKey}
                    tooLargeKey={mediaProps.tooLargeKey}
                    linkedToastKey={mediaProps.linkedToastKey}
                    uploadFailedKey={mediaProps.uploadFailedKey}
                    embedded
                />
            ) : null}
        </div>
    );
};
