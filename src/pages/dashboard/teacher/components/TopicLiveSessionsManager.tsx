import { useState } from "react";
import { Clock, Edit, ExternalLink, Radio, StopCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import {
    useDeleteTopicLiveSession,
    useTopicLiveSessionsForEditor,
    useUpdateTopicLiveSession,
} from "@/hooks/useDatabase";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import TopicLiveSessionFormFields from "./TopicLiveSessionFormFields";
import {
    getLiveSessionStatus,
    liveSessionDraftToPayload,
    nowIso,
    sessionRowToDraft,
    validateLiveSessionDraft,
    type LiveProvider,
    type LiveSessionDraftValidationKey,
    type LiveSessionStatus,
    type PendingLiveSessionDraft,
    type TopicLiveSessionRow,
} from "@/lib/topicLiveSession";

interface TopicLiveSessionsManagerProps {
    topicId: string;
    teacherProfileId?: string;
    lessonTitle?: string;
}

const validationMessages = (
    key: LiveSessionDraftValidationKey,
    t: (key: string, params?: Record<string, string>) => string
) => {
    if (key === "missingUrl") {
        return { title: t("dash.teacher.live.toast.missingData"), description: t("dash.teacher.topics.editor.liveMissingUrl") };
    }
    if (key === "invalidMeet") {
        return { title: t("dash.teacher.live.toast.invalidUrl"), description: t("dash.teacher.live.toast.invalidMeet") };
    }
    if (key === "invalidZoom") {
        return { title: t("dash.teacher.live.toast.invalidUrl"), description: t("dash.teacher.live.toast.invalidZoom") };
    }
    if (key === "invalidHttps") {
        return { title: t("dash.teacher.live.toast.invalidUrl"), description: t("dash.teacher.live.toast.invalidHttps") };
    }
    return { title: t("dash.teacher.live.toast.invalidTime"), description: t("dash.teacher.live.toast.invalidTimeDesc") };
};

const TopicLiveSessionsManager = ({
    topicId,
    teacherProfileId,
    lessonTitle = "",
}: TopicLiveSessionsManagerProps) => {
    const { toast } = useToast();
    const { t, locale, dir } = useDashboardLocale();
    const { data: sessions = [], isLoading } = useTopicLiveSessionsForEditor(topicId);
    const updateLiveSession = useUpdateTopicLiveSession();
    const deleteLiveSession = useDeleteTopicLiveSession();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<PendingLiveSessionDraft | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<TopicLiveSessionRow | null>(null);

    const formatDateTime = (value?: string | null) => {
        const date = new Date(value || "");
        if (Number.isNaN(date.getTime())) return "—";
        return date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
    };

    const getStatusConfig = (status: LiveSessionStatus) => {
        if (status === "live") {
            return { label: t("dash.teacher.live.statusLive"), badgeClass: "bg-red-600 hover:bg-red-600 text-white" };
        }
        if (status === "upcoming") {
            return { label: t("dash.teacher.live.statusScheduled"), badgeClass: "bg-blue-600 hover:bg-blue-600 text-white" };
        }
        return { label: t("dash.teacher.live.statusEnded"), badgeClass: "" };
    };

    const rows = sessions as TopicLiveSessionRow[];

    const startEdit = (session: TopicLiveSessionRow) => {
        setEditingId(session.id);
        setEditDraft(sessionRowToDraft(session));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDraft(null);
    };

    const handleSaveEdit = async () => {
        if (!editDraft || !editingId) return;
        const validation = validateLiveSessionDraft(editDraft);
        if (validation) {
            const err = validationMessages(validation, t);
            toast({ title: err.title, description: err.description, variant: "destructive" });
            return;
        }
        const payload = liveSessionDraftToPayload(
            editDraft,
            lessonTitle.trim() ? t("dash.teacher.live.sessionTitle", { title: lessonTitle.trim() }) : null
        );
        try {
            await updateLiveSession.mutateAsync({
                id: editingId,
                topicId,
                teacherId: teacherProfileId,
                updates: {
                    provider: payload.provider,
                    meeting_url: payload.meetingUrl,
                    title: payload.title,
                    starts_at: payload.startsAt,
                    ends_at: payload.endsAt,
                    notes: payload.notes,
                    is_active: true,
                },
            });
            toast({ title: t("dash.teacher.topics.editor.liveUpdated"), description: t("dash.teacher.topics.editor.liveUpdatedDesc") });
            cancelEdit();
        } catch {
            toast({
                title: t("dash.common.error"),
                description: t("dash.teacher.topics.editor.liveUpdateFailed"),
                variant: "destructive",
            });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteLiveSession.mutateAsync({
                id: deleteTarget.id,
                topicId,
                teacherId: teacherProfileId,
            });
            toast({ title: t("dash.teacher.topics.editor.liveDeleted"), description: t("dash.teacher.topics.editor.liveDeletedDesc") });
            if (editingId === deleteTarget.id) cancelEdit();
        } catch {
            toast({
                title: t("dash.common.error"),
                description: t("dash.teacher.topics.editor.liveDeleteFailed"),
                variant: "destructive",
            });
        } finally {
            setDeleteTarget(null);
        }
    };

    const handleStop = async (session: TopicLiveSessionRow) => {
        try {
            await updateLiveSession.mutateAsync({
                id: session.id,
                topicId,
                teacherId: teacherProfileId,
                updates: { is_active: false, ends_at: nowIso() },
            });
            toast({ title: t("dash.teacher.live.toast.stopped"), description: t("dash.teacher.live.toast.stoppedDesc") });
        } catch {
            toast({
                title: t("dash.teacher.live.toast.stopFailed"),
                description: t("dash.teacher.live.toast.retry"),
                variant: "destructive",
            });
        }
    };

    if (isLoading) {
        return <p className="text-sm text-muted-foreground">{t("dash.common.loading")}</p>;
    }

    return (
        <div className="space-y-3" dir={dir}>
            <p className="text-sm font-semibold">{t("dash.teacher.topics.editor.liveSessionsForLesson")}</p>

            {rows.length === 0 && !isLoading && (
                <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                    {t("dash.teacher.topics.editor.liveEmptyDesc")}
                </div>
            )}

            {rows.map((session) => {
                const status = getLiveSessionStatus(session);
                const statusConfig = getStatusConfig(status);
                const isEditing = editingId === session.id && editDraft;

                return (
                    <Card key={session.id} className="border-primary/15 overflow-hidden">
                        <CardContent className="p-0">
                            {isEditing ? (
                                <div className="p-4 space-y-3 border-b border-primary/20 bg-muted/20">
                                    <p className="text-sm font-medium">{t("dash.teacher.topics.editor.liveEditSession")}</p>
                                    <TopicLiveSessionFormFields
                                        draft={editDraft}
                                        onDraftChange={setEditDraft}
                                        lessonTitle={lessonTitle}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                                            {t("dash.common.cancel")}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => void handleSaveEdit()}
                                            disabled={updateLiveSession.isPending}
                                        >
                                            {t("dash.teacher.topics.editor.updateBtn")}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <Radio className="w-4 h-4 text-primary shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm truncate">
                                                {session.title || lessonTitle || t("dash.teacher.live.sessionFallback")}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate" dir="ltr">
                                                {session.meeting_url}
                                            </p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3 shrink-0" />
                                                {t("dash.teacher.live.startLabel", { date: formatDateTime(session.starts_at) })}
                                                {" · "}
                                                {t("dash.teacher.live.endLabel", { date: formatDateTime(session.ends_at) })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <Badge
                                            className={statusConfig.badgeClass}
                                            variant={status === "ended" ? "secondary" : "default"}
                                        >
                                            {statusConfig.label}
                                        </Badge>
                                        <Button size="sm" variant="outline" asChild>
                                            <a href={session.meeting_url || "#"} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => startEdit(session)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setDeleteTarget(session)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        {status !== "ended" && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => void handleStop(session)}
                                                disabled={updateLiveSession.isPending}
                                                title={status === "live" ? t("dash.teacher.live.endNow") : t("dash.teacher.live.cancelSchedule")}
                                            >
                                                <StopCircle className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent dir={dir}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("dash.teacher.topics.editor.liveDeleteConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("dash.teacher.topics.editor.liveDeleteConfirmDesc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("dash.common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void handleDelete()}
                        >
                            {t("dash.common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default TopicLiveSessionsManager;
