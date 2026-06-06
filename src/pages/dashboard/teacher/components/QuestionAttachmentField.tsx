import { useState } from "react";
import { Check, Image as ImageIcon, Video, Headphones, Paperclip } from "lucide-react";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
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
    tabKey: string;
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
        tabKey: "dash.teacher.topics.qe.attachmentTypeImage",
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
        tabKey: "dash.teacher.topics.qe.attachmentTypeVideo",
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
        tabKey: "dash.teacher.topics.qe.attachmentTypeAudio",
        descKey: "dash.teacher.topics.qe.questionAudioDesc",
        uploadKey: "dash.teacher.topics.qe.uploadAudio",
        removeKey: "dash.teacher.topics.qe.removeAudio",
        pickFileKey: "dash.teacher.topics.qe.toast.pickAudio",
        tooLargeKey: "dash.teacher.topics.editor.toast.fileTooLarge25mb",
        linkedToastKey: "dash.teacher.topics.qe.toast.audioLinked",
        uploadFailedKey: "dash.teacher.topics.qe.toast.audioUploadFailed",
    },
];

const resolveDefaultTab = (value: QuestionAttachmentValue): QuestionMediaKind => {
    if (value.imageUrl) return "image";
    if (value.videoUrl) return "video";
    if (value.audioUrl) return "audio";
    return "image";
};

type QuestionAttachmentFieldProps = {
    value: QuestionAttachmentValue;
    onChange: (value: QuestionAttachmentValue) => void;
};

export const QuestionAttachmentField = ({ value, onChange }: QuestionAttachmentFieldProps) => {
    const { t, dir } = useDashboardLocale();
    const [activeTab, setActiveTab] = useState<QuestionMediaKind>(() => resolveDefaultTab(value));

    const handleUrlChange = (urlKey: keyof QuestionAttachmentValue, url: string | undefined) => {
        onChange({ ...value, [urlKey]: url });
    };

    const attachedCount = MEDIA_SECTIONS.filter((section) => Boolean(value[section.urlKey])).length;

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

            {attachedCount > 0 && (
                <div className="flex flex-wrap gap-2">
                    {MEDIA_SECTIONS.filter((section) => value[section.urlKey]).map((section) => {
                        const Icon = section.icon;
                        const isActive = activeTab === section.kind;
                        return (
                            <button
                                key={section.kind}
                                type="button"
                                onClick={() => setActiveTab(section.kind)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                                    isActive
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/40"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                {t(section.tabKey)}
                                <Check className="w-3 h-3 shrink-0" />
                            </button>
                        );
                    })}
                </div>
            )}

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as QuestionMediaKind)} dir={dir}>
                <TabsList className="grid w-full grid-cols-3 h-auto p-1">
                    {MEDIA_SECTIONS.map((section) => {
                        const Icon = section.icon;
                        const hasAttachment = Boolean(value[section.urlKey]);
                        return (
                            <TabsTrigger
                                key={section.kind}
                                value={section.kind}
                                className="gap-1.5 text-xs sm:text-sm py-2 relative"
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span className="truncate">{t(section.tabKey)}</span>
                                {hasAttachment && (
                                    <span className="absolute top-1 end-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                )}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {MEDIA_SECTIONS.map((section) => (
                    <TabsContent key={section.kind} value={section.kind} className="mt-3">
                        <QuestionMediaUrlField
                            kind={section.kind}
                            icon={section.icon}
                            url={value[section.urlKey]}
                            onUrlChange={(url) => handleUrlChange(section.urlKey, url)}
                            descKey={section.descKey}
                            uploadKey={section.uploadKey}
                            removeKey={section.removeKey}
                            pickFileKey={section.pickFileKey}
                            tooLargeKey={section.tooLargeKey}
                            linkedToastKey={section.linkedToastKey}
                            uploadFailedKey={section.uploadFailedKey}
                            embedded
                        />
                    </TabsContent>
                ))}
            </Tabs>

            {attachedCount > 0 && attachedCount < MEDIA_SECTIONS.length && (
                <p className="text-xs text-muted-foreground">
                    {t("dash.teacher.topics.qe.addAnotherAttachment")}
                </p>
            )}
        </div>
    );
};
