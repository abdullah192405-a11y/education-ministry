import { Image as ImageIcon, Video, Headphones, Paperclip } from "lucide-react";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { QuestionMediaUrlField, type QuestionMediaKind } from "./QuestionMediaUrlField";

export type QuestionAttachmentValue = {
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
};

const MEDIA_SECTIONS: {
    kind: QuestionMediaKind;
    icon: typeof ImageIcon;
    urlKey: keyof QuestionAttachmentValue;
    titleKey: string;
    descKey: string;
    uploadKey: string;
    removeKey: string;
    pickFileKey: string;
    tooLargeKey: string;
    linkedToastKey: string;
    uploadFailedKey: string;
}[] = [
    {
        kind: "image",
        icon: ImageIcon,
        urlKey: "imageUrl",
        titleKey: "dash.teacher.topics.qe.questionImageOptional",
        descKey: "dash.teacher.topics.qe.questionImageDesc",
        uploadKey: "dash.teacher.topics.qe.uploadImage",
        removeKey: "dash.teacher.topics.qe.removeImage",
        pickFileKey: "dash.teacher.topics.qe.toast.pickImage",
        tooLargeKey: "dash.teacher.topics.qe.toast.imageTooLarge",
        linkedToastKey: "dash.teacher.topics.qe.toast.imageLinked",
        uploadFailedKey: "dash.teacher.topics.qe.toast.uploadFailed",
    },
    {
        kind: "video",
        icon: Video,
        urlKey: "videoUrl",
        titleKey: "dash.teacher.topics.qe.questionVideoOptional",
        descKey: "dash.teacher.topics.qe.questionVideoDesc",
        uploadKey: "dash.teacher.topics.qe.uploadVideo",
        removeKey: "dash.teacher.topics.qe.removeVideo",
        pickFileKey: "dash.teacher.topics.qe.toast.pickVideo",
        tooLargeKey: "dash.teacher.topics.qe.toast.videoTooLarge",
        linkedToastKey: "dash.teacher.topics.qe.toast.videoLinked",
        uploadFailedKey: "dash.teacher.topics.qe.toast.videoUploadFailed",
    },
    {
        kind: "audio",
        icon: Headphones,
        urlKey: "audioUrl",
        titleKey: "dash.teacher.topics.qe.questionAudioOptional",
        descKey: "dash.teacher.topics.qe.questionAudioDesc",
        uploadKey: "dash.teacher.topics.qe.uploadAudio",
        removeKey: "dash.teacher.topics.qe.removeAudio",
        pickFileKey: "dash.teacher.topics.qe.toast.pickAudio",
        tooLargeKey: "dash.teacher.topics.editor.toast.fileTooLarge25mb",
        linkedToastKey: "dash.teacher.topics.qe.toast.audioLinked",
        uploadFailedKey: "dash.teacher.topics.qe.toast.audioUploadFailed",
    },
];

type QuestionAttachmentFieldProps = {
    value: QuestionAttachmentValue;
    onChange: (value: QuestionAttachmentValue) => void;
};

export const QuestionAttachmentField = ({ value, onChange }: QuestionAttachmentFieldProps) => {
    const { t } = useDashboardLocale();

    const handleUrlChange = (urlKey: keyof QuestionAttachmentValue, url: string | undefined) => {
        onChange({ ...value, [urlKey]: url });
    };

    return (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <div className="flex items-start gap-2">
                <div className="mt-0.5 rounded-md bg-background p-1.5 border">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                    <label className="text-sm font-medium block">
                        {t("dash.teacher.topics.qe.questionAttachmentOptional")}
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {t("dash.teacher.topics.qe.questionAttachmentDesc")}
                    </p>
                </div>
            </div>
            <div className="space-y-3">
                {MEDIA_SECTIONS.map((section) => (
                    <QuestionMediaUrlField
                        key={section.kind}
                        kind={section.kind}
                        icon={section.icon}
                        url={value[section.urlKey]}
                        onUrlChange={(url) => handleUrlChange(section.urlKey, url)}
                        titleKey={section.titleKey}
                        descKey={section.descKey}
                        uploadKey={section.uploadKey}
                        removeKey={section.removeKey}
                        pickFileKey={section.pickFileKey}
                        tooLargeKey={section.tooLargeKey}
                        linkedToastKey={section.linkedToastKey}
                        uploadFailedKey={section.uploadFailedKey}
                    />
                ))}
            </div>
        </div>
    );
};
