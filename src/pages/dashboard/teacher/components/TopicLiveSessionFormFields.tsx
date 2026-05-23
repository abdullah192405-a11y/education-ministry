import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import {
    LIVE_PROVIDER_PLACEHOLDERS,
    toDatetimeLocal,
    type LiveProvider,
    type PendingLiveSessionDraft,
} from "@/lib/topicLiveSession";

interface TopicLiveSessionFormFieldsProps {
    draft: PendingLiveSessionDraft;
    onDraftChange: (draft: PendingLiveSessionDraft) => void;
    lessonTitle?: string;
}

const TopicLiveSessionFormFields = ({
    draft,
    onDraftChange,
    lessonTitle = "",
}: TopicLiveSessionFormFieldsProps) => {
    const { t, dir } = useDashboardLocale();

    const patch = (partial: Partial<PendingLiveSessionDraft>) =>
        onDraftChange({ ...draft, ...partial });

    const setQuickDuration = (minutes: number) => {
        const start = new Date();
        const end = new Date(start.getTime() + minutes * 60 * 1000);
        patch({
            startsAt: toDatetimeLocal(start),
            endsAt: toDatetimeLocal(end),
        });
    };

    return (
        <div className="space-y-3" dir={dir}>
            <p className="text-xs text-muted-foreground">{t("dash.teacher.topics.editor.liveSavesWithLesson")}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <p className="text-xs font-bold text-muted-foreground">{t("dash.teacher.live.meetingPlatform")}</p>
                    <Select value={draft.provider} onValueChange={(value) => patch({ provider: value as LiveProvider })}>
                        <SelectTrigger>
                            <SelectValue placeholder={t("dash.teacher.live.platform")} />
                        </SelectTrigger>
                        <SelectContent dir={dir}>
                            <SelectItem value="GOOGLE_MEET">Google Meet</SelectItem>
                            <SelectItem value="ZOOM">Zoom</SelectItem>
                            <SelectItem value="CUSTOM">{t("dash.teacher.live.otherLink")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <p className="text-xs font-bold text-muted-foreground">{t("dash.teacher.live.meetingUrl")}</p>
                    <Input
                        dir="ltr"
                        className="text-left"
                        placeholder={LIVE_PROVIDER_PLACEHOLDERS[draft.provider]}
                        value={draft.meetingUrl}
                        onChange={(e) => patch({ meetingUrl: e.target.value })}
                    />
                </div>
            </div>
            <Input
                placeholder={
                    lessonTitle
                        ? t("dash.teacher.live.titleWithLesson", { title: lessonTitle })
                        : t("dash.teacher.live.titleOptional")
                }
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
            />
            <Textarea
                placeholder={t("dash.teacher.live.notesPlaceholder")}
                value={draft.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                rows={2}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground">{t("dash.teacher.live.startTime")}</p>
                    <Input
                        type="datetime-local"
                        value={draft.startsAt}
                        onChange={(e) => patch({ startsAt: e.target.value })}
                    />
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground">{t("dash.teacher.live.endTime")}</p>
                    <Input
                        type="datetime-local"
                        value={draft.endsAt}
                        onChange={(e) => patch({ endsAt: e.target.value })}
                    />
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setQuickDuration(45)}>
                    {t("dash.teacher.live.quick45")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setQuickDuration(60)}>
                    {t("dash.teacher.live.quick60")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setQuickDuration(90)}>
                    {t("dash.teacher.live.quick90")}
                </Button>
            </div>
        </div>
    );
};

export default TopicLiveSessionFormFields;
