import { useRef, useState, useMemo, useEffect, useCallback, useLayoutEffect } from "react";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import type { TFunction } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Plus, Edit, Trash2, Save, X, Upload, Video, Image, FileText,
    ChevronDown, ChevronUp, GripVertical, CheckCircle, XCircle,
    Play, Square, Eye, Gamepad2, ListChecks, HelpCircle, FileType, Loader2,
    Headphones, Link2, Sparkles, Radio, Youtube,
} from "lucide-react";
import type { ContentMedia, EducationalContent, ChallengeQuestion } from "@/data/challengeTypes";
import {
    getTopicChallengePreset,
    presetToSelectValue,
    STUDENT_CHALLENGE_PRESET_OPTIONS,
    type StudentChallengePresetValue,
} from "@/lib/topicChallengePreset";
import QuestionGameEditor, { type QuestionGameEditorHandle } from "./QuestionGameEditor";
import UnsavedQuestionsDialog from "./UnsavedQuestionsDialog";
import TopicLiveSessionFormFields from "./TopicLiveSessionFormFields";
import TopicLiveSessionsManager from "./TopicLiveSessionsManager";
import {
    createDefaultLiveSessionDraft,
    liveSessionDraftToPayload,
    validateLiveSessionDraft,
    type LiveSessionDraftValidationKey,
    type PendingLiveSessionDraft,
} from "@/lib/topicLiveSession";
import {
    DEFAULT_WHEEL_SPIN_SOUND_URL,
    SOUND_DISABLED_SENTINEL,
    WHEEL_SPIN_SOUND_PRESETS,
    isSoundDisabled,
    normalizeWheelSpinSoundSelection,
    resolveWheelSpinSoundUrl,
} from "@/lib/wheelSpinSounds";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import {
    useCreateTeacherUploadedSound,
    useCreateTopicLiveSession,
    useTeacherUploadedSounds,
    useUpdateTopicLiveSession,
    useUser,
} from "@/hooks/useDatabase";
import {
    mergeSoundOptionLists,
    optionFromTopicUrl,
    teacherSoundsToOptions,
    type SoundOption,
    type TeacherSoundCategory,
} from "@/lib/teacherUploadedSounds";
import { cn, getYouTubeThumbnail, getYouTubeId } from "@/lib/utils";
import { getChallengeTypeStyle, ALL_CHALLENGE_ITEM_TYPES } from "@/lib/challengeTypeStyles";
import ContentResourceThumbnail from "./ContentResourceThumbnail";
import {
    generateImagePromptFromAnalyzedResources,
    generateImageBytesFromPrompt,
    type ImagePromptPreferences,
    type ImagePromptLanguageMode,
} from "@/lib/educationalImageGeneration";

function normalizeExternalUrl(raw: string): string {
    const t = raw.trim();
    if (!t) return "";
    if (/^https?:\/\//i.test(t)) return t;
    return `https://${t}`;
}

export type TopicEditorSavePayload = Partial<EducationalContent> & {
    challengeItems?: ChallengeQuestion[];
    pendingLiveSessions?: PendingLiveSessionDraft[];
    /** When false on edit, existing topic_media rows are left unchanged. */
    mediaDirty?: boolean;
};

type EditorMediaType = ContentMedia["type"] | "live";
type EditorNewMedia = Omit<ContentMedia, "type"> & { type: EditorMediaType };

type ContentEditorTab = "info" | "media" | "questions";

type PendingEditorExit =
    | { type: "content-tab"; tabId: ContentEditorTab }
    | { type: "dashboard-nav"; proceed: () => void };

interface ContentEditorProps {
    content?: EducationalContent & { challengeItems?: ChallengeQuestion[] };
    onSave: (content: TopicEditorSavePayload) => void | Promise<void>;
    onCancel: () => void;
    teacherProfileId?: string;
    lessonPagePath?: string;
    /** Fired when the question editor has unsaved local changes. */
    onUnsavedQuestionsChange?: (dirty: boolean) => void;
    /** Dashboard sidebar calls this before leaving the topics tab. */
    registerNavigationGuard?: (tryNavigate: (onProceed: () => void) => void) => void;
}

const getMediaTypes = (t: TFunction) => [
    { type: "video" as const, label: t("dash.teacher.topics.editor.mediaType.video"), icon: Youtube },
    { type: "image" as const, label: t("dash.teacher.topics.editor.mediaType.image"), icon: Image },
    { type: "text" as const, label: t("dash.teacher.topics.editor.mediaType.text"), icon: FileText },
    { type: "pdf" as const, label: t("dash.teacher.topics.editor.mediaType.pdf"), icon: FileType },
    { type: "audio" as const, label: t("dash.teacher.topics.editor.mediaType.audio"), icon: Headphones },
    { type: "link" as const, label: t("dash.teacher.topics.editor.mediaType.link"), icon: Link2 },
    { type: "live" as const, label: t("dash.teacher.topics.editor.mediaType.live"), icon: Radio },
];

const getTargetAudienceOptions = (t: TFunction) => [
    { value: "all", label: t("dash.teacher.topics.editor.audienceAll") },
    { value: "children", label: t("dash.teacher.topics.editor.audienceChildren") },
    { value: "adults", label: t("dash.teacher.topics.editor.audienceAdults") },
];

const getCorrectSoundPresets = (t: TFunction): SoundOption[] => [
    { label: t("dash.teacher.topics.editor.sound.successN", { n: 1 }), url: "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.successN", { n: 2 }), url: "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.successN", { n: 3 }), url: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.successN", { n: 4 }), url: "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.successN", { n: 5 }), url: "https://assets.mixkit.co/active_storage/sfx/218/218-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.successN", { n: 6 }), url: "https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.successN", { n: 7 }), url: "https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3" },
];

const getWrongSoundPresets = (t: TFunction): SoundOption[] => [
    { label: t("dash.teacher.topics.editor.sound.wrongN", { n: 1 }), url: "https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.wrongN", { n: 2 }), url: "https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.wrongN", { n: 3 }), url: "https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.wrongN", { n: 4 }), url: "https://assets.mixkit.co/active_storage/sfx/1118/1118-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.wrongN", { n: 5 }), url: "https://assets.mixkit.co/active_storage/sfx/1018/1018-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.wrongN", { n: 6 }), url: "https://assets.mixkit.co/active_storage/sfx/2876/2876-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.wrongN", { n: 7 }), url: "https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3" },
];

const getWheelSoundPresets = (t: TFunction): SoundOption[] =>
    WHEEL_SPIN_SOUND_PRESETS.map((preset) => ({
        label: t(preset.labelKey as Parameters<TFunction>[0]),
        url: preset.url,
    }));

const getBackgroundSoundPresets = (t: TFunction): SoundOption[] => [
    { label: t("dash.teacher.topics.editor.sound.bgN", { n: 1 }), url: "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3" },
    { label: t("dash.teacher.topics.editor.sound.bgN", { n: 2 }), url: "https://assets.mixkit.co/music/preview/mixkit-games-worldbeat-466.mp3" },
    { label: t("dash.teacher.topics.editor.sound.bgN", { n: 3 }), url: "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3" },
    { label: t("dash.teacher.topics.editor.sound.bgN", { n: 4 }), url: "https://assets.mixkit.co/music/preview/mixkit-arcade-retro-game-over-213.mp3" },
    { label: t("dash.teacher.topics.editor.sound.bgN", { n: 5 }), url: "https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3" },
    { label: t("dash.teacher.topics.editor.sound.bgN", { n: 6 }), url: "https://assets.mixkit.co/music/preview/mixkit-valley-sunset-127.mp3" },
    { label: t("dash.teacher.topics.editor.sound.bgN", { n: 7 }), url: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3" },
];

const PRESET_LABEL_KEYS: Record<string, string> = {
    free: "dash.teacher.topics.editor.preset.free",
    "single:activities": "dash.teacher.topics.editor.preset.singleActivities",
    "single:games": "dash.teacher.topics.editor.preset.singleGames",
    "single:mixed": "dash.teacher.topics.editor.preset.singleMixed",
    "group:activities": "dash.teacher.topics.editor.preset.groupActivities",
    "group:games": "dash.teacher.topics.editor.preset.groupGames",
    "group:mixed": "dash.teacher.topics.editor.preset.groupMixed",
};

const isYouTubeUrl = (url?: string): boolean => Boolean(url && getYouTubeId(url));

const getMediaTypeLabel = (type: EditorMediaType, t: TFunction): string => {
    if (type === "video") return t("dash.teacher.topics.editor.mediaType.video");
    if (type === "image") return t("dash.teacher.topics.editor.mediaType.image");
    if (type === "text") return t("dash.teacher.topics.editor.mediaType.text");
    if (type === "pdf") return t("dash.teacher.topics.editor.mediaType.pdf");
    if (type === "audio") return t("dash.teacher.topics.editor.mediaType.audio");
    if (type === "link") return t("dash.teacher.topics.editor.mediaType.link");
    return t("dash.teacher.topics.editor.mediaType.live");
};

type DraggableMediaResourceCardProps = {
    media: ContentMedia;
    index: number;
    cardTitle: string;
    typeLabel: string;
    isDragging: boolean;
    t: TFunction;
    onDragStart: (index: number) => void;
    onDragEnter: (index: number) => void;
    onDragEnd: () => void;
    onEdit: () => void;
    onDelete: () => void;
};

const stopMediaCardButtonDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
};

const DraggableMediaResourceCard = ({
    media,
    index,
    cardTitle,
    typeLabel,
    isDragging,
    t,
    onDragStart,
    onDragEnter,
    onDragEnd,
    onEdit,
    onDelete,
}: DraggableMediaResourceCardProps) => {
    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(index));
                onDragStart(index);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => {
                e.preventDefault();
                onDragEnter(index);
            }}
            onDragEnd={onDragEnd}
            className={cn(
                "cursor-grab active:cursor-grabbing touch-manipulation",
                isDragging && "opacity-50 ring-2 ring-primary scale-[0.98]"
            )}
            aria-label={t("dash.teacher.topics.editor.dragResource")}
        >
            <Card className="overflow-hidden h-full select-none">
                <div className="relative h-20 w-full border-b pointer-events-none">
                    <GripVertical className="absolute top-1.5 end-1.5 z-10 w-3.5 h-3.5 text-muted-foreground/50" />
                    <ContentResourceThumbnail item={media} t={t} />
                </div>
                <CardContent className="p-2 space-y-1.5">
                    <div className="pointer-events-none">
                        <p className="text-xs font-medium leading-tight line-clamp-2" title={cardTitle}>
                            {cardTitle}
                        </p>
                        <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0 h-4">
                            {typeLabel}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-end gap-0.5 border-t pt-1.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 cursor-pointer"
                            draggable={false}
                            onClick={onEdit}
                            onDragStart={stopMediaCardButtonDrag}
                        >
                            <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive cursor-pointer"
                            draggable={false}
                            onClick={onDelete}
                            onDragStart={stopMediaCardButtonDrag}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const getMediaOptionLabel = (media: ContentMedia, index: number, t: TFunction): string => {
    const raw =
        media.caption?.trim() ||
        media.fileName?.trim() ||
        (media.type === "text" ? media.content?.trim() : media.url?.trim()) ||
        t("dash.teacher.topics.editor.mediaTypeN", { type: getMediaTypeLabel(media.type, t), n: index + 1 });
    const short = raw.length > 48 ? `${raw.slice(0, 48)}…` : raw;
    return t("dash.teacher.topics.editor.mediaLabel", { type: getMediaTypeLabel(media.type, t), short });
};

const liveDraftValidationToast = (key: LiveSessionDraftValidationKey, t: TFunction) => {
    if (key === "missingUrl") {
        return {
            title: t("dash.teacher.live.toast.missingData"),
            description: t("dash.teacher.topics.editor.liveMissingUrl"),
        };
    }
    if (key === "invalidMeet") {
        return {
            title: t("dash.teacher.live.toast.invalidUrl"),
            description: t("dash.teacher.live.toast.invalidMeet"),
        };
    }
    if (key === "invalidZoom") {
        return {
            title: t("dash.teacher.live.toast.invalidUrl"),
            description: t("dash.teacher.live.toast.invalidZoom"),
        };
    }
    if (key === "invalidTeams") {
        return {
            title: t("dash.teacher.live.toast.invalidUrl"),
            description: t("dash.teacher.live.toast.invalidTeams"),
        };
    }
    if (key === "invalidHttps") {
        return {
            title: t("dash.teacher.live.toast.invalidUrl"),
            description: t("dash.teacher.live.toast.invalidHttps"),
        };
    }
    return {
        title: t("dash.teacher.live.toast.invalidTime"),
        description: t("dash.teacher.live.toast.invalidTimeDesc"),
    };
};

const ContentEditor = ({
    content,
    onSave,
    onCancel,
    teacherProfileId,
    lessonPagePath,
    onUnsavedQuestionsChange,
    registerNavigationGuard,
}: ContentEditorProps) => {
    const { t, dir } = useDashboardLocale();
    const { data: user } = useUser();
    const { data: teacherUploadedSounds = [] } = useTeacherUploadedSounds(teacherProfileId);
    const createTeacherSoundMutation = useCreateTeacherUploadedSound();
    const mediaTypes = useMemo(() => getMediaTypes(t), [t]);
    const targetAudienceOptions = useMemo(() => getTargetAudienceOptions(t), [t]);
    const correctSoundPresets = useMemo(() => getCorrectSoundPresets(t), [t]);
    const wrongSoundPresets = useMemo(() => getWrongSoundPresets(t), [t]);
    const backgroundSoundPresets = useMemo(() => getBackgroundSoundPresets(t), [t]);
    const wheelSoundPresets = useMemo(() => getWheelSoundPresets(t), [t]);
    const getTypeLabel = (type: string) => {
        const keys: Record<string, string> = {
            multiple_choice: "dash.teacher.topics.editor.type.multipleChoice",
            true_false: "dash.teacher.topics.editor.type.trueFalse",
            qa: "dash.teacher.topics.editor.type.qa",
            know_dont_know: "dash.teacher.topics.editor.type.knowDontKnow",
            order_questions: "dash.teacher.topics.editor.type.order",
            matching: "dash.teacher.topics.editor.type.matching",
            shooting: "dash.teacher.topics.editor.type.shooting",
            wheel_spin: "dash.teacher.topics.editor.type.wheel",
            puzzle: "dash.teacher.topics.editor.type.puzzle",
        };
        const key = keys[type];
        return key ? t(key as any) : type;
    };
    const [activeTab, setActiveTab] = useState<"info" | "media" | "questions">("info");
    const [pendingLiveSessions, setPendingLiveSessions] = useState<PendingLiveSessionDraft[]>([]);
    const [newLiveDraft, setNewLiveDraft] = useState<PendingLiveSessionDraft>(createDefaultLiveSessionDraft);
    const [editingLivePendingIndex, setEditingLivePendingIndex] = useState<number | null>(null);
    const [editingExistingLiveId, setEditingExistingLiveId] = useState<string | null>(null);
    const createLiveSessionMutation = useCreateTopicLiveSession();
    const updateLiveSessionMutation = useUpdateTopicLiveSession();
    const { toast } = useToast();
    const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const correctUploadInputRef = useRef<HTMLInputElement | null>(null);
    const wrongUploadInputRef = useRef<HTMLInputElement | null>(null);
    const backgroundUploadInputRef = useRef<HTMLInputElement | null>(null);

    const handleImageUpload = async (file: File, onComplete: (url: string) => void, setIsUploading: (val: boolean) => void) => {
        if (!file || !user) {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.topics.qe.toast.notLoggedIn"), variant: "destructive" });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: t("dash.teacher.topics.editor.toast.fileTooLarge5mb"), description: t("dash.teacher.topics.qe.toast.imageTooLarge"), variant: "destructive" });
            return;
        }
        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/content/${fileName}`;
            const { error } = await supabase.storage.from('teacher-content').upload(filePath, file);
            if (error) throw error;
            const { data } = supabase.storage.from('teacher-content').getPublicUrl(filePath);
            onComplete(data.publicUrl);
            toast({ title: t("dash.teacher.topics.qe.toast.uploaded"), description: t("dash.teacher.topics.editor.toast.imageUploaded") });
        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                title: t("dash.teacher.topics.editor.toast.uploadErr"),
                description: error.message || t("dash.teacher.topics.editor.toast.uploadErr"),
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Basic info
    const [title, setTitle] = useState(content?.title || "");
    const [description, setDescription] = useState(content?.description || "");
    const [thumbnail, setThumbnail] = useState(content?.thumbnail || "");
    const [targetAudience, setTargetAudience] = useState<"all" | "children" | "adults">(content?.targetAudience || "all");
    const [duration, setDuration] = useState(content?.duration || "");
    const [correctSoundUrl, setCorrectSoundUrl] = useState(content?.correctSoundUrl || "");
    const [wrongSoundUrl, setWrongSoundUrl] = useState(content?.wrongSoundUrl || "");
    const [answeringBackgroundSoundUrl, setAnsweringBackgroundSoundUrl] = useState(content?.answeringBackgroundSoundUrl || "");
    const [wheelSpinSoundUrl, setWheelSpinSoundUrl] = useState(
        normalizeWheelSpinSoundSelection(content?.wheelSpinSoundUrl)
    );
    const [discussionsEnabled, setDiscussionsEnabled] = useState(content?.discussionsEnabled ?? true);
    const [collectSingleChallengeParticipantData, setCollectSingleChallengeParticipantData] = useState(
        content?.collectSingleChallengeParticipantData ?? false
    );
    const [studentChallengePreset, setStudentChallengePreset] = useState<StudentChallengePresetValue>(
        presetToSelectValue(
            getTopicChallengePreset({
                student_challenge_mode: content?.studentChallengeMode,
                student_challenge_category: content?.studentChallengeCategory,
            })
        )
    );
    const [customCorrectSoundOptions, setCustomCorrectSoundOptions] = useState<SoundOption[]>([]);
    const [customWrongSoundOptions, setCustomWrongSoundOptions] = useState<SoundOption[]>([]);
    const [customBackgroundSoundOptions, setCustomBackgroundSoundOptions] = useState<SoundOption[]>([]);

    const teacherSoundsByCategory = useMemo(() => {
        const correct = teacherUploadedSounds.filter((r) => r.sound_category === "correct");
        const wrong = teacherUploadedSounds.filter((r) => r.sound_category === "wrong");
        const background = teacherUploadedSounds.filter((r) => r.sound_category === "background");
        return { correct, wrong, background };
    }, [teacherUploadedSounds]);

    useEffect(() => {
        const savedLabel = t("dash.teacher.topics.editor.customSaved");
        setCustomCorrectSoundOptions(
            mergeSoundOptionLists(
                teacherSoundsToOptions(teacherSoundsByCategory.correct, savedLabel),
                optionFromTopicUrl(content?.correctSoundUrl, savedLabel)
            )
        );
        setCustomWrongSoundOptions(
            mergeSoundOptionLists(
                teacherSoundsToOptions(teacherSoundsByCategory.wrong, savedLabel),
                optionFromTopicUrl(content?.wrongSoundUrl, savedLabel)
            )
        );
        setCustomBackgroundSoundOptions(
            mergeSoundOptionLists(
                teacherSoundsToOptions(teacherSoundsByCategory.background, savedLabel),
                optionFromTopicUrl(
                    isSoundDisabled(content?.answeringBackgroundSoundUrl)
                        ? null
                        : content?.answeringBackgroundSoundUrl,
                    savedLabel
                )
            )
        );
    }, [
        teacherSoundsByCategory,
        content?.id,
        content?.correctSoundUrl,
        content?.wrongSoundUrl,
        content?.answeringBackgroundSoundUrl,
        t,
    ]);
    // Media
    const initialMediaSnapshotRef = useRef(JSON.stringify(content?.media || []));
    const [mediaList, setMediaList] = useState<ContentMedia[]>(content?.media || []);
    const mediaKeysRef = useRef<string[]>([]);
    const dragMediaIndexRef = useRef<number | null>(null);
    const [dragMediaIndex, setDragMediaIndex] = useState<number | null>(null);

    useEffect(() => {
        while (mediaKeysRef.current.length < mediaList.length) {
            mediaKeysRef.current.push(`media-${crypto.randomUUID()}`);
        }
        if (mediaKeysRef.current.length > mediaList.length) {
            mediaKeysRef.current.splice(mediaList.length);
        }
    }, [mediaList.length]);
    const [mediaDirty, setMediaDirty] = useState(false);
    const [editingMediaIndex, setEditingMediaIndex] = useState<number | null>(null);

    useEffect(() => {
        const snapshot = content?.media || [];
        initialMediaSnapshotRef.current = JSON.stringify(snapshot);
        setMediaList(snapshot);
        setMediaDirty(false);
        setPendingLiveSessions([]);
        setEditingLivePendingIndex(null);
        setEditingExistingLiveId(null);
        setNewLiveDraft(createDefaultLiveSessionDraft());
        setCorrectSoundUrl(content?.correctSoundUrl || "");
        setWrongSoundUrl(content?.wrongSoundUrl || "");
        setAnsweringBackgroundSoundUrl(content?.answeringBackgroundSoundUrl || "");
        setWheelSpinSoundUrl(normalizeWheelSpinSoundSelection(content?.wheelSpinSoundUrl));
    }, [content?.id]);

    useEffect(() => {
        setMediaDirty(JSON.stringify(mediaList) !== initialMediaSnapshotRef.current);
    }, [mediaList]);
    const [isProcessingPdf, setIsProcessingPdf] = useState(false);

    // Challenge Items (Questions & Games)
    const [challengeItems, setChallengeItems] = useState<ChallengeQuestion[]>(
        content?.challengeItems || []
    );
    const [showQuestionEditor, setShowQuestionEditor] = useState(false);

    // New media form
    const [newMedia, setNewMedia] = useState<EditorNewMedia>({ type: "video", url: "", caption: "" });
    const [showAddMedia, setShowAddMedia] = useState(false);
    const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
    const [isRenderingAiImage, setIsRenderingAiImage] = useState(false);
    const [aiImageProgress, setAiImageProgress] = useState("");
    const [showImagePromptDialog, setShowImagePromptDialog] = useState(false);
    const [editableImagePrompt, setEditableImagePrompt] = useState("");
    const [aiImageAudience, setAiImageAudience] = useState<ImagePromptPreferences["audience"]>("general");
    const [aiImageVisualTheme, setAiImageVisualTheme] =
        useState<ImagePromptPreferences["visualTheme"]>("infographic");
    const [aiImageTone, setAiImageTone] = useState<ImagePromptPreferences["tone"]>("friendly");
    const [aiImageColorMood, setAiImageColorMood] =
        useState<ImagePromptPreferences["colorMood"]>("bright");
    const [aiImageExtraNotes, setAiImageExtraNotes] = useState("");
    /** Language of the prompt text shown in the dialog and sent to the image model (after confirm). */
    const [aiImagePromptLanguage, setAiImagePromptLanguage] =
        useState<ImagePromptLanguageMode>("auto");
    /** Narrows what to read from PDF/images for the prompt (e.g. unit 1 of 7, topic). */
    const [aiImageContentFocus, setAiImageContentFocus] = useState("");
    /** Selected source media indices for analysis (multi-select). */
    const [aiImageSourceSelections, setAiImageSourceSelections] = useState<string[]>(
        () => (content?.media || []).map((_, index) => String(index))
    );

    const audioMediaOptions = mediaList.filter((m) => m.type === "audio" && m.url?.trim());
    const uploadedAudioOptions: SoundOption[] = audioMediaOptions.map((media, idx) => ({
        label: t("dash.teacher.topics.editor.uploadedAudio", { name: media.caption || media.fileName || t("dash.teacher.topics.editor.audioFileN", { n: idx + 1 }) }),
        url: media.url as string,
    }));

    const getMergedSoundOptions = (preset: SoundOption[], custom: SoundOption[]) => {
        const seen = new Set<string>();
        const merged = [...preset, ...uploadedAudioOptions, ...custom];
        return merged.filter((option) => {
            if (!option.url || seen.has(option.url)) return false;
            seen.add(option.url);
            return true;
        });
    };

    const stopPreview = useCallback(() => {
        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current.currentTime = 0;
            previewAudioRef.current = null;
        }
        setIsPreviewPlaying(false);
    }, []);

    useEffect(() => () => stopPreview(), [stopPreview]);

    const playPreview = (url?: string, options?: { fallbackUrl?: string; loop?: boolean }) => {
        if (isSoundDisabled(url)) return;

        const resolved = url?.trim() || options?.fallbackUrl?.trim() || "";
        if (!resolved) {
            toast({ title: t("dash.common.alert"), description: t("dash.teacher.topics.editor.toast.pickSoundFirst") });
            return;
        }
        try {
            stopPreview();
            const audio = new Audio(resolved);
            previewAudioRef.current = audio;
            audio.volume = 0.6;
            audio.loop = options?.loop ?? false;
            audio.onended = () => {
                if (!audio.loop) setIsPreviewPlaying(false);
            };
            void audio.play().then(() => setIsPreviewPlaying(true)).catch((error) => {
                console.error("Preview play error:", error);
                stopPreview();
                toast({ title: t("dash.common.error"), description: t("dash.teacher.topics.editor.toast.previewErr"), variant: "destructive" });
            });
        } catch (error) {
            console.error("Preview play error:", error);
            toast({ title: t("dash.common.error"), description: t("dash.teacher.topics.editor.toast.previewErr"), variant: "destructive" });
        }
    };

    const renderSoundPreviewButtons = (onPlay: () => void, playDisabled = false) => (
        <>
            <Button type="button" variant="outline" size="icon" disabled={playDisabled} onClick={onPlay}>
                <Play className="w-4 h-4" />
            </Button>
            <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!isPreviewPlaying}
                onClick={stopPreview}
                title={t("dash.teacher.topics.editor.stopPreview")}
            >
                <Square className="w-4 h-4" />
            </Button>
        </>
    );

    const uploadSoundOption = async (
        type: TeacherSoundCategory,
        file: File
    ) => {
        if (!file || !user) {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.topics.qe.toast.notLoggedIn"), variant: "destructive" });
            return;
        }
        if (!teacherProfileId) {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.topics.qe.toast.notLoggedIn"), variant: "destructive" });
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            toast({ title: t("dash.teacher.topics.editor.toast.fileTooLarge5mb"), description: t("dash.teacher.topics.editor.toast.fileTooLarge25mb"), variant: "destructive" });
            return;
        }

        setIsUploadingMedia(true);
        try {
            const fileExt = file.name.split(".").pop() || "mp3";
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
            const filePath = `${user.id}/sounds/${type}/${fileName}`;
            const { error } = await supabase.storage.from("teacher-content").upload(filePath, file);
            if (error) throw error;
            const { data } = supabase.storage.from("teacher-content").getPublicUrl(filePath);
            const label = t("dash.teacher.topics.editor.directUpload", { name: file.name });
            const option: SoundOption = { label, url: data.publicUrl };

            await createTeacherSoundMutation.mutateAsync({
                teacherId: teacherProfileId,
                soundCategory: type,
                url: data.publicUrl,
                label: file.name,
                storagePath: filePath,
            });

            if (type === "correct") {
                setCustomCorrectSoundOptions((prev) => mergeSoundOptionLists(prev, [option]));
                setCorrectSoundUrl(option.url);
            } else if (type === "wrong") {
                setCustomWrongSoundOptions((prev) => mergeSoundOptionLists(prev, [option]));
                setWrongSoundUrl(option.url);
            } else {
                setCustomBackgroundSoundOptions((prev) => mergeSoundOptionLists(prev, [option]));
                setAnsweringBackgroundSoundUrl(option.url);
            }

            toast({ title: t("dash.teacher.topics.qe.toast.uploaded"), description: t("dash.teacher.topics.editor.toast.audioAddedList") });
        } catch (error: any) {
            console.error("Custom sound upload error:", error);
            toast({
                title: t("dash.teacher.topics.editor.toast.uploadErr"),
                description: error.message || t("dash.teacher.topics.editor.toast.audioUploadErr"),
                variant: "destructive",
            });
        } finally {
            setIsUploadingMedia(false);
        }
    };

    // Handle PDF file upload - stores as base64 for later AI analysis
    // Handle PDF file upload - stores in Supabase Storage and optionally base64 for AI analysis
    const handlePdfUpload = async (file: File) => {
        if (!file || !user) {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.topics.qe.toast.notLoggedIn"), variant: "destructive" });
            return;
        }

        setIsProcessingPdf(true);

        try {
            // 1. Upload to Supabase Storage (Same as images)
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/content/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('teacher-content')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage
                .from('teacher-content')
                .getPublicUrl(filePath);

            const publicUrl = publicData.publicUrl;

            // 2. Also keep base64 for AI analysis if needed
            const arrayBuffer = await file.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ''
                )
            );

            setNewMedia({
                ...newMedia,
                url: publicUrl,
                fileName: file.name,
                pdfBase64: base64,  // Keep for AI analysis
            });

            toast({
                title: t("dash.teacher.topics.editor.toast.fileUploaded"),
                description: t("dash.teacher.topics.editor.toast.fileSavedServer"),
            });
        } catch (error: any) {
            console.error("Error processing PDF:", error);
            toast({
                title: t("dash.teacher.topics.editor.toast.fileUploadErrTitle"),
                description: error.message || t("dash.teacher.topics.editor.toast.pdfUploadErr"),
                variant: "destructive",
            });
        } finally {
            setIsProcessingPdf(false);
        }
    };

    const handleAudioUpload = async (file: File) => {
        if (!file || !user) {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.topics.qe.toast.notLoggedIn"), variant: "destructive" });
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            toast({ title: t("dash.teacher.topics.editor.toast.fileTooLarge5mb"), description: t("dash.teacher.topics.editor.toast.fileTooLarge25mb"), variant: "destructive" });
            return;
        }
        setIsUploadingMedia(true);
        try {
            const fileExt = file.name.split(".").pop() || "mp3";
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/content/${fileName}`;
            const { error } = await supabase.storage.from("teacher-content").upload(filePath, file);
            if (error) throw error;
            const { data } = supabase.storage.from("teacher-content").getPublicUrl(filePath);
            setNewMedia((prev) => ({
                ...prev,
                url: data.publicUrl,
                fileName: file.name,
            }));
            toast({ title: t("dash.teacher.topics.qe.toast.uploaded"), description: t("dash.teacher.topics.editor.toast.audioUploaded") });
        } catch (error: any) {
            console.error("Audio upload error:", error);
            toast({
                title: t("dash.teacher.topics.editor.toast.uploadErr"),
                description: error.message || t("dash.teacher.topics.editor.toast.audioUploadErr"),
                variant: "destructive",
            });
        } finally {
            setIsUploadingMedia(false);
        }
    };

    const handlePrepareImagePromptFromResources = async () => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            toast({
                title: t("dash.teacher.topics.editor.toast.apiKeyMissing"),
                description: t("dash.teacher.topics.editor.toast.addGeminiKey"),
                variant: "destructive",
            });
            return;
        }
        if (!user) {
            toast({ title: t("dash.common.error"), description: t("dash.teacher.topics.qe.toast.notLoggedIn"), variant: "destructive" });
            return;
        }
        if (aiImageSourceSelections.length === 0) {
            toast({
                title: t("dash.teacher.topics.editor.toast.pickResourceFirst"),
                description: t("dash.teacher.topics.editor.toast.pickOneResource"),
                variant: "destructive",
            });
            return;
        }
        setIsGeneratingAiImage(true);
        setAiImageProgress("");
        try {
            const selectedResources =
                aiImageSourceSelections.map((index) => mediaList[Number(index)]).filter(
                    (item): item is ContentMedia => Boolean(item)
                );
            if (selectedResources.length === 0) {
                toast({
                    title: t("dash.teacher.topics.editor.toast.resourcesUnavailable"),
                    description: t("dash.teacher.topics.editor.toast.reselectResources"),
                    variant: "destructive",
                });
                return;
            }
            const preferences: ImagePromptPreferences = {
                audience: aiImageAudience,
                visualTheme: aiImageVisualTheme,
                tone: aiImageTone,
                colorMood: aiImageColorMood,
                notes: aiImageExtraNotes,
            };
            const prompt = await generateImagePromptFromAnalyzedResources(
                apiKey,
                selectedResources,
                title,
                description,
                preferences,
                {
                    languageMode: aiImagePromptLanguage,
                    contentFocus: aiImageContentFocus.trim() || undefined,
                    onProgress: setAiImageProgress,
                }
            );
            setEditableImagePrompt(prompt);
            setShowImagePromptDialog(true);
        } catch (error: unknown) {
            console.error("AI image prompt:", error);
            toast({
                title: t("dash.teacher.topics.editor.toast.analyzeFailed"),
                description: error instanceof Error ? error.message : t("dash.teacher.topics.editor.toast.unexpected"),
                variant: "destructive",
            });
        } finally {
            setIsGeneratingAiImage(false);
            setAiImageProgress("");
        }
    };

    const handleConfirmGenerateImageFromPrompt = async () => {
        const trimmed = editableImagePrompt.trim();
        if (!trimmed) {
            toast({
                title: t("dash.teacher.topics.editor.toast.emptyPrompt"),
                description: t("dash.teacher.topics.editor.toast.enterPrompt"),
                variant: "destructive",
            });
            return;
        }
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey || !user) return;

        setIsRenderingAiImage(true);
        try {
            const { mimeType, base64 } = await generateImageBytesFromPrompt(apiKey, trimmed);
            const ext = mimeType.includes("png")
                ? "png"
                : mimeType.includes("jpeg") || mimeType.includes("jpg")
                    ? "jpg"
                    : "png";
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: mimeType });
            const file = new File([blob], `lesson-ai-image-${Date.now()}.${ext}`, { type: mimeType });

            await handleImageUpload(
                file,
                (url) => {
                    setNewMedia((prev) => ({
                        ...prev,
                        url,
                        imageBase64: base64,
                        caption: prev.caption?.trim()
                            ? prev.caption
                            : t("dash.teacher.topics.editor.aiCaptionDefault"),
                    }));
                },
                () => { }
            );
            setShowImagePromptDialog(false);
            setEditableImagePrompt("");
        } catch (error: unknown) {
            console.error("AI image generation:", error);
            toast({
                title: t("dash.teacher.topics.editor.toast.generateFailed"),
                description: error instanceof Error ? error.message : t("dash.teacher.topics.editor.toast.unexpected"),
                variant: "destructive",
            });
        } finally {
            setIsRenderingAiImage(false);
        }
    };

    // Media handlers
    const saveMedia = async () => {
        if (newMedia.type === "live") {
            const liveValidation = validateLiveSessionDraft(newLiveDraft);
            if (liveValidation) {
                const err = liveDraftValidationToast(liveValidation, t);
                toast({ title: err.title, description: err.description, variant: "destructive" });
                return;
            }

            const defaultTitle = title.trim()
                ? t("dash.teacher.live.sessionTitle", { title: title.trim() })
                : null;
            const livePayload = liveSessionDraftToPayload(newLiveDraft, defaultTitle);

            if (editingExistingLiveId && content?.id && teacherProfileId) {
                try {
                    await updateLiveSessionMutation.mutateAsync({
                        id: editingExistingLiveId,
                        topicId: String(content.id),
                        teacherId: teacherProfileId,
                        updates: {
                            provider: livePayload.provider,
                            meeting_url: livePayload.meetingUrl,
                            title: livePayload.title,
                            starts_at: livePayload.startsAt,
                            ends_at: livePayload.endsAt,
                            notes: livePayload.notes,
                            is_active: true,
                        },
                    });
                    toast({ title: t("dash.teacher.topics.editor.liveUpdated"), description: t("dash.teacher.topics.editor.liveUpdatedDesc") });
                } catch {
                    toast({ title: t("dash.common.error"), description: t("dash.teacher.topics.editor.liveUpdateFailed"), variant: "destructive" });
                    return;
                }
            } else if (content?.id && teacherProfileId && editingLivePendingIndex === null) {
                try {
                    await createLiveSessionMutation.mutateAsync({
                        topicId: String(content.id),
                        teacherId: teacherProfileId,
                        provider: livePayload.provider,
                        meetingUrl: livePayload.meetingUrl,
                        title: livePayload.title,
                        startsAt: livePayload.startsAt,
                        endsAt: livePayload.endsAt,
                        notes: livePayload.notes,
                    });
                    toast({ title: t("dash.teacher.live.toast.published"), description: t("dash.teacher.live.toast.publishedDesc") });
                } catch {
                    toast({ title: t("dash.common.error"), description: t("dash.teacher.live.toast.createFailedDesc"), variant: "destructive" });
                    return;
                }
            } else if (editingLivePendingIndex !== null) {
                const next = [...pendingLiveSessions];
                next[editingLivePendingIndex] = { ...newLiveDraft };
                setPendingLiveSessions(next);
                setEditingLivePendingIndex(null);
            } else {
                setPendingLiveSessions([...pendingLiveSessions, { ...newLiveDraft }]);
            }

            setEditingExistingLiveId(null);
            setNewMedia({ type: "video", url: "", caption: "" });
            setNewLiveDraft(createDefaultLiveSessionDraft());
            setShowAddMedia(false);
            return;
        }

        const normalizedLinkUrl =
            newMedia.type === "link" ? normalizeExternalUrl(newMedia.url || "") : "";
        const payload: ContentMedia =
            newMedia.type === "link"
                ? { ...newMedia, type: newMedia.type, url: normalizedLinkUrl }
                : { ...newMedia, type: newMedia.type as ContentMedia["type"] };

        const isValid =
            payload.type === "text"
                ? payload.content?.trim()
                : payload.type === "pdf"
                    ? payload.file || payload.fileName
                    : payload.type === "link"
                        ? normalizedLinkUrl
                        : payload.type === "audio"
                            ? payload.url?.trim()
                            : payload.url?.trim();

        if (isValid) {
            if (editingMediaIndex !== null) {
                const newList = [...mediaList];
                newList[editingMediaIndex] = payload;
                setMediaList(newList);
                setEditingMediaIndex(null);
            } else {
                setMediaList([...mediaList, { ...payload }]);
            }
            setNewMedia({ type: "video", url: "", caption: "" });
            setShowAddMedia(false);
        }
    };

    const deleteLivePending = (index: number) => {
        setPendingLiveSessions(pendingLiveSessions.filter((_, i) => i !== index));
    };

    const editLivePending = (index: number) => {
        setEditingLivePendingIndex(index);
        setEditingMediaIndex(null);
        setNewLiveDraft({ ...pendingLiveSessions[index] });
        setNewMedia({ type: "live", url: "", caption: "" });
        setShowAddMedia(true);
    };

    const deleteMedia = (index: number) => {
        setMediaList(mediaList.filter((_, i) => i !== index));
    };

    const handleMediaReorder = (newList: ContentMedia[], fromIndex?: number, toIndex?: number) => {
        const indexMap = new Map<number, number>();
        mediaList.forEach((item, oldIndex) => {
            const newIndex = newList.indexOf(item);
            if (newIndex !== -1) indexMap.set(oldIndex, newIndex);
        });

        if (
            fromIndex !== undefined &&
            toIndex !== undefined &&
            fromIndex !== toIndex &&
            mediaKeysRef.current[fromIndex] !== undefined
        ) {
            const newKeys = [...mediaKeysRef.current];
            const [key] = newKeys.splice(fromIndex, 1);
            newKeys.splice(toIndex, 0, key);
            mediaKeysRef.current = newKeys;
        }

        if (editingMediaIndex !== null) {
            const newIndex = indexMap.get(editingMediaIndex);
            if (newIndex !== undefined && newIndex !== editingMediaIndex) {
                setEditingMediaIndex(newIndex);
            }
        }

        setAiImageSourceSelections((prev) =>
            prev
                .map((value) => {
                    const newIndex = indexMap.get(Number(value));
                    return newIndex !== undefined ? String(newIndex) : null;
                })
                .filter((value): value is string => value !== null)
        );

        setMediaList(newList);
    };

    const handleMediaDragStart = (index: number) => {
        dragMediaIndexRef.current = index;
        setDragMediaIndex(index);
    };

    const handleMediaDragEnter = (overIndex: number) => {
        const fromIndex = dragMediaIndexRef.current;
        if (fromIndex === null || fromIndex === overIndex) return;
        const newList = [...mediaList];
        const [moved] = newList.splice(fromIndex, 1);
        newList.splice(overIndex, 0, moved);
        handleMediaReorder(newList, fromIndex, overIndex);
        dragMediaIndexRef.current = overIndex;
        setDragMediaIndex(overIndex);
    };

    const handleMediaDragEnd = () => {
        dragMediaIndexRef.current = null;
        setDragMediaIndex(null);
    };

    const questionEditorRef = useRef<QuestionGameEditorHandle>(null);
    const questionEditorCloseGuardRef = useRef<(onProceed: () => void) => void>((onProceed) => onProceed());
    const [questionsEditorDirty, setQuestionsEditorDirty] = useState(false);
    const [unsavedExitDialogOpen, setUnsavedExitDialogOpen] = useState(false);
    const pendingExitRef = useRef<PendingEditorExit | null>(null);

    const handleQuestionsDirtyChange = useCallback(
        (dirty: boolean) => {
            setQuestionsEditorDirty(dirty);
            onUnsavedQuestionsChange?.(dirty);
        },
        [onUnsavedQuestionsChange]
    );

    const handleSaveChallengeItems = (items: ChallengeQuestion[]) => {
        setChallengeItems(items);
        setShowQuestionEditor(false);
        handleQuestionsDirtyChange(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const latestChallengeItems =
                showQuestionEditor && questionEditorRef.current
                    ? questionEditorRef.current.getItems()
                    : challengeItems;

            if (showQuestionEditor && questionEditorRef.current) {
                setChallengeItems(latestChallengeItems);
                questionEditorRef.current.resetDirtyBaseline();
                handleQuestionsDirtyChange(false);
            }

            await onSave({
                id: content?.id || Date.now(),
                title,
                description,
                thumbnail,
                targetAudience,
                duration,
                correctSoundUrl: correctSoundUrl || null,
                wrongSoundUrl: wrongSoundUrl || null,
                answeringBackgroundSoundUrl: isSoundDisabled(answeringBackgroundSoundUrl)
                    ? SOUND_DISABLED_SENTINEL
                    : answeringBackgroundSoundUrl || null,
                wheelSpinSoundUrl: isSoundDisabled(wheelSpinSoundUrl)
                    ? SOUND_DISABLED_SENTINEL
                    : resolveWheelSpinSoundUrl(wheelSpinSoundUrl),
                discussionsEnabled,
                collectSingleChallengeParticipantData,
                studentChallengePreset,
                media: mediaList,
                quiz: [], // Legacy - keeping for compatibility
                views: content?.views || 0,
                createdAt: content?.createdAt || new Date().toISOString().split('T')[0],
                challengeItems: latestChallengeItems,
                pendingLiveSessions,
                mediaDirty,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const registerQuestionEditorCloseGuard = useCallback(
        (tryClose: (onProceed: () => void, intent?: "cancel" | "external") => void) => {
            questionEditorCloseGuardRef.current = (onProceed) => tryClose(onProceed, "external");
        },
        []
    );

    const openUnsavedExitDialog = useCallback((pending: PendingEditorExit) => {
        pendingExitRef.current = pending;
        setUnsavedExitDialogOpen(true);
    }, []);

    const requestBlockedExit = useCallback(
        (onProceed: () => void) => {
            if (showQuestionEditor && questionsEditorDirty) {
                openUnsavedExitDialog({ type: "dashboard-nav", proceed: onProceed });
                return;
            }
            onProceed();
        },
        [showQuestionEditor, questionsEditorDirty, openUnsavedExitDialog]
    );

    useLayoutEffect(() => {
        registerNavigationGuard?.(requestBlockedExit);
    }, [registerNavigationGuard, requestBlockedExit]);

    const completePendingExit = (pending: PendingEditorExit) => {
        setShowQuestionEditor(false);
        setQuestionsEditorDirty(false);
        onUnsavedQuestionsChange?.(false);
        if (pending.type === "content-tab") {
            setActiveTab(pending.tabId);
        } else {
            pending.proceed();
        }
    };

    const guardedSetActiveTab = (tabId: ContentEditorTab) => {
        if (tabId === activeTab) return;

        if (showQuestionEditor) {
            if (questionsEditorDirty) {
                openUnsavedExitDialog({ type: "content-tab", tabId });
                return;
            }
            setShowQuestionEditor(false);
            setActiveTab(tabId);
            return;
        }

        setActiveTab(tabId);
    };

    const handleUnsavedExitSave = () => {
        const pending = pendingExitRef.current;
        if (!pending) return;
        const items = questionEditorRef.current?.getItems() ?? challengeItems;
        handleSaveChallengeItems(items);
        setUnsavedExitDialogOpen(false);
        pendingExitRef.current = null;
        if (pending.type === "content-tab") {
            setActiveTab(pending.tabId);
        } else {
            pending.proceed();
        }
    };

    const handleUnsavedExitDiscard = () => {
        const pending = pendingExitRef.current;
        if (!pending) return;
        setUnsavedExitDialogOpen(false);
        pendingExitRef.current = null;
        completePendingExit(pending);
    };

    const handleUnsavedExitStay = () => {
        setUnsavedExitDialogOpen(false);
        pendingExitRef.current = null;
    };

    const guardedContentCancel = () => {
        if (showQuestionEditor) {
            questionEditorCloseGuardRef.current(() => {
                setShowQuestionEditor(false);
                onCancel();
            });
            return;
        }
        onCancel();
    };

    return (
        <div className="space-y-6" dir={dir}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                    {content ? t("dash.teacher.topics.editor.editContent") : t("dash.teacher.topics.editor.addContent")}
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={guardedContentCancel} disabled={isSaving}>
                        <X className="w-4 h-4 ml-2" />
                        {t("dash.common.cancel")}
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 ml-2" />
                        )}
                        {isSaving ? t("dash.common.saving") : t("dash.common.save")}
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
                {[
                    { id: "info", label: t("dash.teacher.topics.editor.tabInfo"), icon: FileText },
                    { id: "media", label: t("dash.teacher.topics.editor.tabMedia", { n: mediaList.length + pendingLiveSessions.length }), icon: Video },
                    { id: "questions", label: t("dash.teacher.topics.editor.tabQuestions", { n: challengeItems.length }), icon: Gamepad2 },
                ].map(tab => {
                    const isCurrentTab = activeTab === tab.id;
                    const tabLockedByUnsaved =
                        showQuestionEditor && questionsEditorDirty && !isCurrentTab;

                    return (
                        <Button
                            key={tab.id}
                            variant={isCurrentTab ? "default" : "ghost"}
                            size="sm"
                            onClick={() => guardedSetActiveTab(tab.id as typeof activeTab)}
                            className={cn(
                                "gap-2",
                                tabLockedByUnsaved && "opacity-60"
                            )}
                            title={
                                tabLockedByUnsaved
                                    ? t("dash.teacher.topics.qe.unsavedDialogTitle")
                                    : undefined
                            }
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </Button>
                    );
                })}
            </div>

            <UnsavedQuestionsDialog
                open={unsavedExitDialogOpen}
                onSave={handleUnsavedExitSave}
                onDiscard={handleUnsavedExitDiscard}
                onStay={handleUnsavedExitStay}
            />

            {/* Info Tab */}
            {activeTab === "info" && (
                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">{t("dash.teacher.topics.editor.contentTitle")}</label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={t("dash.teacher.topics.editor.contentTitlePlaceholder")}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">{t("dash.teacher.topics.editor.targetAudience")}</label>
                                <select
                                    value={targetAudience}
                                    onChange={(e) => setTargetAudience(e.target.value as typeof targetAudience)}
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    {targetAudienceOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">{t("dash.teacher.topics.editor.description")}</label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t("dash.teacher.topics.editor.descriptionPlaceholder")}
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">{t("dash.teacher.topics.editor.thumbnail")}</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={thumbnail}
                                        onChange={(e) => setThumbnail(e.target.value)}
                                        placeholder={t("dash.teacher.topics.editor.thumbnailUrl")}
                                        className="flex-1"
                                    />
                                    <div className="relative">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            accept="image/*"
                                            disabled={isUploadingThumbnail}
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    handleImageUpload(e.target.files[0], setThumbnail, setIsUploadingThumbnail);
                                                }
                                            }}
                                        />
                                        <Button type="button" variant="outline" disabled={isUploadingThumbnail}>
                                            {isUploadingThumbnail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                            {t("dash.teacher.topics.editor.upload")}
                                        </Button>
                                    </div>
                                </div>
                                {thumbnail && (
                                    <img src={thumbnail} alt="Preview" className="mt-2 w-32 h-20 object-cover rounded-lg" />
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">{t("dash.teacher.topics.editor.duration")}</label>
                                <Input
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    placeholder={t("dash.teacher.topics.editor.durationPlaceholder")}
                                />
                            </div>
                        </div>

                        <div className="rounded-lg border p-4 space-y-4">
                            <h3 className="text-sm font-semibold">{t("dash.teacher.topics.editor.soundSettings")}</h3>
                            <p className="text-xs text-muted-foreground">
                                {t("dash.teacher.topics.editor.soundSettingsDesc")}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium block">{t("dash.teacher.topics.editor.correctSound")}</label>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={correctSoundUrl || "__default__"}
                                            onChange={(e) => setCorrectSoundUrl(e.target.value === "__default__" ? "" : e.target.value)}
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        >
                                            <option value="__default__">{t("dash.teacher.topics.editor.defaultOption")}</option>
                                            {getMergedSoundOptions(correctSoundPresets, customCorrectSoundOptions).map((preset) => (
                                                <option key={`correct-preset-${preset.url}`} value={preset.url}>
                                                    {preset.label || t("dash.teacher.topics.editor.customSaved")}
                                                </option>
                                            ))}
                                        </select>
                                        {renderSoundPreviewButtons(() =>
                                            playPreview(correctSoundUrl, { fallbackUrl: correctSoundPresets[0]?.url })
                                        )}
                                        <input
                                            ref={correctUploadInputRef}
                                            type="file"
                                            accept="audio/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) void uploadSoundOption("correct", file);
                                                e.currentTarget.value = "";
                                            }}
                                        />
                                        <Button type="button" variant="outline" size="icon" disabled={isUploadingMedia} onClick={() => correctUploadInputRef.current?.click()}>
                                            {isUploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium block">{t("dash.teacher.topics.editor.wrongSound")}</label>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={wrongSoundUrl || "__default__"}
                                            onChange={(e) => setWrongSoundUrl(e.target.value === "__default__" ? "" : e.target.value)}
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        >
                                            <option value="__default__">{t("dash.teacher.topics.editor.defaultOption")}</option>
                                            {getMergedSoundOptions(wrongSoundPresets, customWrongSoundOptions).map((preset) => (
                                                <option key={`wrong-preset-${preset.url}`} value={preset.url}>
                                                    {preset.label || t("dash.teacher.topics.editor.customSaved")}
                                                </option>
                                            ))}
                                        </select>
                                        {renderSoundPreviewButtons(() =>
                                            playPreview(wrongSoundUrl, { fallbackUrl: wrongSoundPresets[0]?.url })
                                        )}
                                        <input
                                            ref={wrongUploadInputRef}
                                            type="file"
                                            accept="audio/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) void uploadSoundOption("wrong", file);
                                                e.currentTarget.value = "";
                                            }}
                                        />
                                        <Button type="button" variant="outline" size="icon" disabled={isUploadingMedia} onClick={() => wrongUploadInputRef.current?.click()}>
                                            {isUploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium block">{t("dash.teacher.topics.editor.backgroundSound")}</label>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={
                                                isSoundDisabled(answeringBackgroundSoundUrl)
                                                    ? SOUND_DISABLED_SENTINEL
                                                    : answeringBackgroundSoundUrl || "__default__"
                                            }
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === "__default__") {
                                                    setAnsweringBackgroundSoundUrl("");
                                                } else if (value === SOUND_DISABLED_SENTINEL) {
                                                    setAnsweringBackgroundSoundUrl(SOUND_DISABLED_SENTINEL);
                                                } else {
                                                    setAnsweringBackgroundSoundUrl(value);
                                                }
                                            }}
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        >
                                            <option value="__default__">{t("dash.teacher.topics.editor.defaultOption")}</option>
                                            <option value={SOUND_DISABLED_SENTINEL}>{t("dash.teacher.topics.editor.sound.disabled")}</option>
                                            {getMergedSoundOptions(backgroundSoundPresets, customBackgroundSoundOptions).map((preset) => (
                                                <option key={`bg-preset-${preset.url}`} value={preset.url}>
                                                    {preset.label || t("dash.teacher.topics.editor.customSaved")}
                                                </option>
                                            ))}
                                        </select>
                                        {renderSoundPreviewButtons(
                                            () => playPreview(answeringBackgroundSoundUrl, {
                                                fallbackUrl: backgroundSoundPresets[0]?.url,
                                                loop: true,
                                            }),
                                            isSoundDisabled(answeringBackgroundSoundUrl)
                                        )}
                                        <input
                                            ref={backgroundUploadInputRef}
                                            type="file"
                                            accept="audio/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) void uploadSoundOption("background", file);
                                                e.currentTarget.value = "";
                                            }}
                                        />
                                        <Button type="button" variant="outline" size="icon" disabled={isUploadingMedia} onClick={() => backgroundUploadInputRef.current?.click()}>
                                            {isUploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium block">{t("dash.teacher.topics.editor.wheelSound")}</label>
                                    <p className="text-xs text-muted-foreground">{t("dash.teacher.topics.editor.wheelSoundDesc")}</p>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={wheelSpinSoundUrl}
                                            onChange={(e) => setWheelSpinSoundUrl(e.target.value)}
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        >
                                            {wheelSoundPresets.map((preset) => (
                                                <option key={`wheel-preset-${preset.url}`} value={preset.url}>
                                                    {preset.label}
                                                </option>
                                            ))}
                                        </select>
                                        {renderSoundPreviewButtons(
                                            () => playPreview(wheelSpinSoundUrl, { fallbackUrl: DEFAULT_WHEEL_SPIN_SOUND_URL }),
                                            isSoundDisabled(wheelSpinSoundUrl)
                                        )}
                                    </div>
                                </div>
                            </div>

                            {audioMediaOptions.length === 0 && (
                                <p className="text-xs text-amber-600">
                                    {t("dash.teacher.topics.editor.noAudioFiles")}
                                </p>
                            )}
                        </div>

                        <div className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-semibold">{t("dash.teacher.topics.editor.discussionsTitle")}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        {t("dash.teacher.topics.editor.discussionsDesc")}
                                    </p>
                                </div>
                                <Switch checked={discussionsEnabled} onCheckedChange={setDiscussionsEnabled} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t("dash.teacher.topics.editor.defaultNewLesson")} <span className="font-semibold">{t("dash.teacher.topics.editor.enabled")}</span>
                            </p>
                        </div>

                        <div className="rounded-lg border p-4 space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="student-challenge-preset">{t("dash.teacher.topics.editor.challengePath")}</Label>
                                <Select
                                    value={studentChallengePreset}
                                    onValueChange={(v) => setStudentChallengePreset(v as StudentChallengePresetValue)}
                                >
                                    <SelectTrigger id="student-challenge-preset">
                                        <SelectValue placeholder={t("dash.teacher.topics.editor.challengePath")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STUDENT_CHALLENGE_PRESET_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {t(PRESET_LABEL_KEYS[option.value] as any)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {t("dash.teacher.topics.editor.challengePathDesc")}

                                </p>
                            </div>
                        </div>

                        <div className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="collect-single-participants"
                                    checked={collectSingleChallengeParticipantData}
                                    onCheckedChange={(v) => setCollectSingleChallengeParticipantData(v === true)}
                                    className="mt-1"
                                />
                                <div className="space-y-1 flex-1">
                                    <label htmlFor="collect-single-participants" className="text-sm font-semibold cursor-pointer">{t("dash.teacher.topics.editor.collectParticipantData")}</label>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {t("dash.teacher.topics.editor.collectParticipantDataDesc")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Media Tab */}
            {activeTab === "media" && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center gap-3">
                        <p className="text-muted-foreground text-sm">
                            {t("dash.teacher.topics.editor.mediaDesc")}
                        </p>
                        <Button
                            onClick={() => {
                                setEditingMediaIndex(null);
                                setEditingLivePendingIndex(null);
                                setNewMedia({ type: "video", url: "", caption: "" });
                                setNewLiveDraft(createDefaultLiveSessionDraft());
                                setShowAddMedia(true);
                            }}
                            className="gap-2 shrink-0"
                        >
                            <Plus className="w-4 h-4" />{t("dash.teacher.topics.editor.addMedia")}</Button>
                    </div>

                    {/* Add Media Form */}
                    <AnimatePresence>
                        {showAddMedia && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <Card className="border-primary/50">
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex flex-wrap gap-2">
                                            {mediaTypes.map(m => (
                                                <Button
                                                    key={m.type}
                                                    variant={newMedia.type === m.type ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => {
                                                        if (m.type === "live") {
                                                            setNewMedia({ type: "live", url: "", caption: "" });
                                                            if (editingLivePendingIndex === null) {
                                                                setNewLiveDraft(createDefaultLiveSessionDraft());
                                                            }
                                                        } else {
                                                            setNewMedia({
                                                                ...newMedia,
                                                                type: m.type,
                                                                url: "",
                                                                content: "",
                                                                file: undefined,
                                                                fileName: undefined,
                                                                pdfBase64: undefined,
                                                                imageBase64: undefined,
                                                            });
                                                        }
                                                    }}
                                                    className="gap-2"
                                                >
                                                    <m.icon className="w-4 h-4" />
                                                    {m.label}
                                                </Button>
                                            ))}
                                        </div>

                                        {newMedia.type === "text" ? (
                                            <Textarea
                                                value={newMedia.content || ""}
                                                onChange={(e) => setNewMedia({ ...newMedia, content: e.target.value })}
                                                placeholder={t("dash.teacher.topics.editor.textContent")}
                                                rows={6}
                                            />
                                        ) : newMedia.type === "pdf" ? (
                                            <div className="space-y-2">
                                                <Input
                                                    type="file"
                                                    accept=".pdf"
                                                    disabled={isProcessingPdf}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handlePdfUpload(file);
                                                        }
                                                    }}
                                                />
                                                {isProcessingPdf && (
                                                    <div className="text-sm text-blue-600 flex items-center gap-2">
                                                        <Loader2 className="w-4 h-4 animate-spin" />{t("dash.teacher.topics.editor.uploadingFile")}</div>
                                                )}
                                                {!isProcessingPdf && newMedia.fileName && (
                                                    <div className="space-y-1">
                                                        <div className="text-sm text-green-600 flex items-center gap-2">
                                                            <CheckCircle className="w-4 h-4" />
                                                            {newMedia.fileName}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {t("dash.teacher.topics.editor.aiPdfHint")}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : newMedia.type === "video" ? (
                                            <div className="space-y-2">
                                                <Input
                                                    value={newMedia.url || ""}
                                                    onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                                                    placeholder={t("dash.teacher.topics.editor.youtubeUrl")}
                                                />
                                                {newMedia.url && getYouTubeId(newMedia.url) && (
                                                    <div className="relative aspect-video w-40 rounded-lg overflow-hidden border">
                                                        <img
                                                            src={getYouTubeThumbnail(newMedia.url) || ""}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                if (target.src.includes('maxresdefault')) {
                                                                    target.src = target.src.replace('maxresdefault', 'hqdefault');
                                                                }
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                            <Play className="w-6 h-6 text-white fill-current" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                        ) : newMedia.type === "image" ? (
                                            <div className="space-y-3 text-start" dir={dir}>
                                                <div className="rounded-md border border-primary/20 bg-primary/5 p-2">
                                                    <p className="text-xs text-muted-foreground">
                                                        {t("dash.teacher.topics.editor.aiImageIntro")}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium">{t("dash.teacher.topics.editor.aiImageStep1")}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t("dash.teacher.topics.editor.aiImagePasteOrUpload")}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={newMedia.url || ""}
                                                        onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                                                        placeholder={t("dash.teacher.topics.editor.imageUrl")}
                                                        className="flex-1 text-right"
                                                    />
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            accept="image/*"
                                                            disabled={isUploadingMedia || isGeneratingAiImage || isRenderingAiImage}
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    // 1. Convert to base64 for AI analysis
                                                                    const reader = new FileReader();
                                                                    reader.onloadend = () => {
                                                                        const base64 = reader.result?.toString().split(',')[1];
                                                                        if (base64) {
                                                                            setNewMedia(prev => ({ ...prev, imageBase64: base64 }));
                                                                        }
                                                                    };
                                                                    reader.readAsDataURL(file);

                                                                    // 2. Upload to Supabase
                                                                    handleImageUpload(file, (url) => {
                                                                        setNewMedia(prev => ({ ...prev, url }));
                                                                    }, setIsUploadingMedia);
                                                                }
                                                            }}
                                                        />
                                                        <Button type="button" variant="outline" disabled={isUploadingMedia || isGeneratingAiImage || isRenderingAiImage}>
                                                            {isUploadingMedia ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                                            {t("dash.teacher.topics.editor.upload")}
                                                        </Button>
                                                    </div>
                                                </div>
                                                {newMedia.url && (
                                                    <div className="rounded-md border bg-background p-2 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs font-medium">{t("dash.teacher.topics.editor.imagePreview")}</p>
                                                            {newMedia.imageBase64 && (
                                                                <span className="text-[11px] text-primary">
                                                                    {t("dash.teacher.topics.editor.aiGenerated")}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <img
                                                            src={newMedia.url}
                                                            alt={t("dash.teacher.topics.editor.imagePreview")}
                                                            className="w-full max-h-64 rounded-md object-contain bg-muted/30"
                                                        />
                                                    </div>
                                                )}
                                                <div className="relative py-1">
                                                    <div className="border-t" />
                                                    <span className="absolute right-1/2 top-1/2 -translate-y-1/2 translate-x-1/2 bg-background px-2 text-[11px] text-muted-foreground">{t("dash.teacher.topics.editor.or")}</span>
                                                </div>
                                                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium">{t("dash.teacher.topics.editor.aiImageStep2")}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t("dash.teacher.topics.editor.aiImageSetup")}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm font-medium">{t("dash.teacher.topics.editor.aiImageOptions")}</p>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">
                                                            {t("dash.teacher.topics.editor.promptLanguage")}
                                                        </Label>
                                                        <Select
                                                            value={aiImagePromptLanguage}
                                                            onValueChange={(v) =>
                                                                setAiImagePromptLanguage(
                                                                    v as ImagePromptLanguageMode
                                                                )
                                                            }
                                                            disabled={isGeneratingAiImage || isRenderingAiImage}
                                                        >
                                                            <SelectTrigger className="h-9 text-right flex-row-reverse">
                                                                <SelectValue placeholder={t("dash.teacher.topics.editor.orderLabel")} />
                                                            </SelectTrigger>
                                                            <SelectContent dir={dir} className="text-right">
                                                                <SelectItem value="auto">
                                                                    {t("dash.teacher.topics.editor.langAuto")}
                                                                </SelectItem>
                                                                <SelectItem value="ar">{t("dash.teacher.topics.editor.langAr")}</SelectItem>
                                                                <SelectItem value="en">{t("dash.teacher.topics.editor.langEn")}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">
                                                            {t("dash.teacher.topics.editor.aiImageSourceLabel")}
                                                        </Label>
                                                        <div className="rounded-md border bg-background p-2 space-y-2">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-xs text-muted-foreground">
                                                                    {t("dash.teacher.topics.editor.resourcesSelected", { selected: aiImageSourceSelections.length, total: mediaList.length })}
                                                                </p>
                                                                <div className="flex items-center gap-1">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 px-2 text-xs"
                                                                        disabled={
                                                                            mediaList.length === 0 ||
                                                                            isGeneratingAiImage ||
                                                                            isRenderingAiImage
                                                                        }
                                                                        onClick={() =>
                                                                            setAiImageSourceSelections(
                                                                                mediaList.map((_, index) => String(index))
                                                                            )
                                                                        }
                                                                    >{t("dash.teacher.topics.editor.selectAll")}</Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 px-2 text-xs"
                                                                        disabled={
                                                                            aiImageSourceSelections.length === 0 ||
                                                                            isGeneratingAiImage ||
                                                                            isRenderingAiImage
                                                                        }
                                                                        onClick={() => setAiImageSourceSelections([])}
                                                                    >{t("dash.teacher.topics.editor.deselectAll")}</Button>
                                                                </div>
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {t("dash.teacher.topics.editor.aiImageSourceHint")}
                                                            </p>
                                                            <label className="flex items-center justify-between gap-2 text-sm">
                                                                <span>{t("dash.teacher.topics.editor.allResources")}</span>
                                                                <Checkbox
                                                                    checked={
                                                                        mediaList.length > 0 &&
                                                                        aiImageSourceSelections.length === mediaList.length
                                                                    }
                                                                    disabled={
                                                                        mediaList.length === 0 ||
                                                                        isGeneratingAiImage ||
                                                                        isRenderingAiImage
                                                                    }
                                                                    onCheckedChange={(checked) => {
                                                                        if (checked === true) {
                                                                            setAiImageSourceSelections(
                                                                                mediaList.map((_, index) => String(index))
                                                                            );
                                                                        } else {
                                                                            setAiImageSourceSelections([]);
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                            <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                                                                {mediaList.map((media, index) => {
                                                                    const value = String(index);
                                                                    const checked = aiImageSourceSelections.includes(value);
                                                                    return (
                                                                        <label
                                                                            key={media.id ? `${media.id}-${index}` : `media-${index}`}
                                                                            className="flex items-center justify-between gap-2 text-sm"
                                                                        >
                                                                            <span className="truncate">
                                                                                {getMediaOptionLabel(media, index, t)}
                                                                            </span>
                                                                            <Checkbox
                                                                                checked={checked}
                                                                                disabled={isGeneratingAiImage || isRenderingAiImage}
                                                                                onCheckedChange={(nextChecked) => {
                                                                                    setAiImageSourceSelections((prev) => {
                                                                                        if (nextChecked === true) {
                                                                                            if (prev.includes(value)) return prev;
                                                                                            return [...prev, value];
                                                                                        }
                                                                                        return prev.filter((item) => item !== value);
                                                                                    });
                                                                                }}
                                                                            />
                                                                        </label>
                                                                    );
                                                                })}
                                                                {mediaList.length === 0 && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {t("dash.teacher.topics.editor.noResourcesAdded")}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">
                                                            {t("dash.teacher.topics.editor.contentFocus")}
                                                        </Label>
                                                        <Textarea
                                                            value={aiImageContentFocus}
                                                            onChange={(e) => setAiImageContentFocus(e.target.value)}
                                                            placeholder={t("dash.teacher.topics.editor.contentFocus")}
                                                            rows={3}
                                                            className="text-sm text-right resize-y min-h-[72px]"
                                                            disabled={isGeneratingAiImage || isRenderingAiImage}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground">{t("dash.teacher.topics.editor.audienceLabel")}</Label>
                                                            <Select
                                                                value={aiImageAudience}
                                                                onValueChange={(v) =>
                                                                    setAiImageAudience(v as ImagePromptPreferences["audience"])
                                                                }
                                                                disabled={isGeneratingAiImage || isRenderingAiImage}
                                                            >
                                                                <SelectTrigger className="h-9 text-right flex-row-reverse">
                                                                    <SelectValue placeholder={t("dash.teacher.topics.editor.orderLabel")} />
                                                                </SelectTrigger>
                                                                <SelectContent dir={dir} className="text-right">
                                                                    <SelectItem value="kids">{t("dash.teacher.topics.editor.audience.children")}</SelectItem>
                                                                    <SelectItem value="teens">{t("dash.teacher.topics.editor.audience.teens")}</SelectItem>
                                                                    <SelectItem value="adults">{t("dash.teacher.topics.editor.audience.adults")}</SelectItem>
                                                                    <SelectItem value="university">{t("dash.teacher.topics.editor.audience.university")}</SelectItem>
                                                                    <SelectItem value="general">{t("dash.teacher.topics.editor.audience.general")}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground">{t("dash.teacher.topics.editor.visualTheme")}</Label>
                                                            <Select
                                                                value={aiImageVisualTheme}
                                                                onValueChange={(v) =>
                                                                    setAiImageVisualTheme(
                                                                        v as ImagePromptPreferences["visualTheme"]
                                                                    )
                                                                }
                                                                disabled={isGeneratingAiImage || isRenderingAiImage}
                                                            >
                                                                <SelectTrigger className="h-9 text-right flex-row-reverse">
                                                                    <SelectValue placeholder={t("dash.teacher.topics.editor.orderLabel")} />
                                                                </SelectTrigger>
                                                                <SelectContent dir={dir} className="text-right">
                                                                    <SelectItem value="infographic">{t("dash.teacher.topics.editor.theme.infographic")}</SelectItem>
                                                                    <SelectItem value="poster">{t("dash.teacher.topics.editor.theme.poster")}</SelectItem>
                                                                    <SelectItem value="storybook">{t("dash.teacher.topics.editor.theme.comic")}</SelectItem>
                                                                    <SelectItem value="diagram">{t("dash.teacher.topics.editor.theme.diagram")}</SelectItem>
                                                                    <SelectItem value="minimal">{t("dash.teacher.topics.editor.theme.minimal")}</SelectItem>
                                                                    <SelectItem value="textbook">{t("dash.teacher.topics.editor.theme.textbook")}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground">{t("dash.teacher.topics.editor.tone")}</Label>
                                                            <Select
                                                                value={aiImageTone}
                                                                onValueChange={(v) =>
                                                                    setAiImageTone(v as ImagePromptPreferences["tone"])
                                                                }
                                                                disabled={isGeneratingAiImage || isRenderingAiImage}
                                                            >
                                                                <SelectTrigger className="h-9 text-right flex-row-reverse">
                                                                    <SelectValue placeholder={t("dash.teacher.topics.editor.orderLabel")} />
                                                                </SelectTrigger>
                                                                <SelectContent dir={dir} className="text-right">
                                                                    <SelectItem value="playful">{t("dash.teacher.topics.editor.tone.playful")}</SelectItem>
                                                                    <SelectItem value="friendly">{t("dash.teacher.topics.editor.tone.friendly")}</SelectItem>
                                                                    <SelectItem value="formal">{t("dash.teacher.topics.editor.tone.formal")}</SelectItem>
                                                                    <SelectItem value="scientific">{t("dash.teacher.topics.editor.tone.serious")}</SelectItem>
                                                                    <SelectItem value="neutral">{t("dash.teacher.topics.editor.tone.neutral")}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground">{t("dash.teacher.topics.editor.colorMood")}</Label>
                                                            <Select
                                                                value={aiImageColorMood}
                                                                onValueChange={(v) =>
                                                                    setAiImageColorMood(
                                                                        v as ImagePromptPreferences["colorMood"]
                                                                    )
                                                                }
                                                                disabled={isGeneratingAiImage || isRenderingAiImage}
                                                            >
                                                                <SelectTrigger className="h-9 text-right flex-row-reverse">
                                                                    <SelectValue placeholder={t("dash.teacher.topics.editor.orderLabel")} />
                                                                </SelectTrigger>
                                                                <SelectContent dir={dir} className="text-right">
                                                                    <SelectItem value="bright">{t("dash.teacher.topics.editor.color.bright")}</SelectItem>
                                                                    <SelectItem value="pastel">{t("dash.teacher.topics.editor.color.pastel")}</SelectItem>
                                                                    <SelectItem value="dark">{t("dash.teacher.topics.editor.color.dark")}</SelectItem>
                                                                    <SelectItem value="high_contrast">{t("dash.teacher.topics.editor.color.highContrast")}</SelectItem>
                                                                    <SelectItem value="natural">{t("dash.teacher.topics.editor.color.natural")}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">
                                                            {t("dash.teacher.topics.editor.extraNotes")}
                                                        </Label>
                                                        <Textarea
                                                            value={aiImageExtraNotes}
                                                            onChange={(e) => setAiImageExtraNotes(e.target.value)}
                                                            placeholder={t("dash.teacher.topics.editor.extraNotes")}
                                                            rows={2}
                                                            className="text-sm text-right resize-y min-h-[60px]"
                                                            disabled={isGeneratingAiImage || isRenderingAiImage}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-2">
                                                    <p className="text-xs text-muted-foreground">
                                                        {t("dash.teacher.topics.editor.aiImageSteps")}
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        className="w-full sm:w-auto gap-2"
                                                        disabled={isUploadingMedia || isGeneratingAiImage || isRenderingAiImage}
                                                        onClick={handlePrepareImagePromptFromResources}
                                                    >
                                                        {isGeneratingAiImage ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Sparkles className="w-4 h-4" />
                                                        )}
                                                        {t("dash.teacher.topics.editor.analyzeResources")}
                                                    </Button>
                                                    {aiImageProgress && (
                                                        <p className="text-xs text-primary flex items-center gap-2">
                                                            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                                                            {aiImageProgress}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : newMedia.type === "audio" ? (
                                            <div className="space-y-2">
                                                <Input
                                                    type="file"
                                                    accept="audio/*"
                                                    disabled={isUploadingMedia}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleAudioUpload(file);
                                                    }}
                                                />
                                                {isUploadingMedia && (
                                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <Loader2 className="w-4 h-4 animate-spin" />{t("dash.teacher.topics.editor.uploadingAudio")}</div>
                                                )}
                                                {!isUploadingMedia && newMedia.fileName && (
                                                    <div className="text-sm text-green-600 flex items-center gap-2">
                                                        <CheckCircle className="w-4 h-4" />
                                                        {newMedia.fileName}
                                                    </div>
                                                )}
                                                {newMedia.url && (
                                                    <audio controls src={newMedia.url} className="w-full max-w-md rounded-lg" />
                                                )}
                                            </div>
                                        ) : newMedia.type === "link" ? (
                                            <Input
                                                value={newMedia.url || ""}
                                                onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                                                placeholder={t("dash.teacher.topics.editor.linkUrlPlaceholder")}
                                                dir="ltr"
                                                className="text-left font-mono text-sm"
                                            />
                                        ) : newMedia.type === "live" ? (
                                            <TopicLiveSessionFormFields
                                                draft={newLiveDraft}
                                                onDraftChange={setNewLiveDraft}
                                                lessonTitle={title}
                                            />
                                        ) : null}

                                        {newMedia.type !== "live" && (
                                            <Input
                                                value={newMedia.caption || ""}
                                                onChange={(e) => setNewMedia({ ...newMedia, caption: e.target.value })}
                                                placeholder={t("dash.teacher.topics.editor.captionOptional")}
                                            />
                                        )}

                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" onClick={() => {
                                                setShowAddMedia(false);
                                                setEditingMediaIndex(null);
                                                setEditingLivePendingIndex(null);
                                                setEditingExistingLiveId(null);
                                                setNewMedia({ type: "video", url: "", caption: "" });
                                                setNewLiveDraft(createDefaultLiveSessionDraft());
                                            }}>{t("dash.common.cancel")}</Button>
                                            <Button onClick={() => void saveMedia()}>
                                                {editingMediaIndex !== null || editingLivePendingIndex !== null || editingExistingLiveId
                                                    ? t("dash.teacher.topics.editor.updateBtn")
                                                    : t("dash.teacher.topics.editor.addBtn")}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Media List */}
                    <div className="space-y-3">
                        {pendingLiveSessions.map((live, index) => (
                            <Card key={`live-pending-${index}`} className="overflow-hidden border-primary/20">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                            <Radio className="w-5 h-5 text-red-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm">
                                                {getMediaTypeLabel("live", t)}
                                                <Badge variant="secondary" className="ms-2 text-[10px]">
                                                    {t("dash.teacher.topics.editor.livePendingBadge")}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 truncate" dir="ltr">
                                                {live.meetingUrl}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {live.title || (title ? t("dash.teacher.live.sessionTitle", { title }) : t("dash.teacher.live.titleOptional"))}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editLivePending(index)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteLivePending(index)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {mediaList.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">
                                    {t("dash.teacher.topics.editor.mediaDragHint")}
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {mediaList.map((media, index) => {
                                        const cardTitle =
                                            media.caption?.trim() ||
                                            media.fileName?.trim() ||
                                            getMediaTypeLabel(media.type, t);
                                        return (
                                            <DraggableMediaResourceCard
                                                key={mediaKeysRef.current[index] || `media-${index}`}
                                                media={media}
                                                index={index}
                                                cardTitle={cardTitle}
                                                typeLabel={getMediaTypeLabel(media.type, t)}
                                                isDragging={dragMediaIndex === index}
                                                t={t}
                                                onDragStart={handleMediaDragStart}
                                                onDragEnter={handleMediaDragEnter}
                                                onDragEnd={handleMediaDragEnd}
                                                onEdit={() => {
                                                    setEditingMediaIndex(index);
                                                    setEditingLivePendingIndex(null);
                                                    setNewMedia(mediaList[index] as EditorNewMedia);
                                                    setShowAddMedia(true);
                                                }}
                                                onDelete={() => deleteMedia(index)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {content?.id && (
                            <TopicLiveSessionsManager
                                topicId={String(content.id)}
                                teacherProfileId={teacherProfileId}
                                lessonTitle={title}
                            />
                        )}

                        {mediaList.length === 0 && pendingLiveSessions.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>{t("dash.teacher.topics.editor.noMediaYet")}</p>
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {/* Questions & Games Tab */}
            {
                activeTab === "questions" && (
                    <div className="space-y-4">
                        {showQuestionEditor ? (
                            <QuestionGameEditor
                                ref={questionEditorRef}
                                items={challengeItems}
                                onSave={handleSaveChallengeItems}
                                onCancel={() => setShowQuestionEditor(false)}
                                onDirtyChange={handleQuestionsDirtyChange}
                                registerCloseGuard={registerQuestionEditorCloseGuard}
                                media={mediaList}
                                wheelSpinSoundUrl={wheelSpinSoundUrl}
                            />
                        ) : (
                            <>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg">{t("dash.teacher.topics.editor.questionsTitle")}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {t("dash.teacher.topics.editor.questionsDesc")}
                                        </p>
                                    </div>
                                    <Button onClick={() => setShowQuestionEditor(true)} className="gap-2">
                                        <Plus className="w-4 h-4" />{t("dash.teacher.topics.editor.manageQuestions")}</Button>
                                </div>

                                {/* Summary Cards */}
                                {challengeItems.length > 0 ? (
                                    <div className="space-y-4">
                                        {/* Stats */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <Card>
                                                <CardContent className="p-4 text-center">
                                                    <div className="text-3xl font-bold text-primary">{challengeItems.length}</div>
                                                    <div className="text-sm text-muted-foreground">{t("dash.teacher.topics.editor.totalItems")}</div>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4 text-center">
                                                    <div className="text-3xl font-bold text-blue-500">
                                                        {challengeItems.filter(i => ["multiple_choice", "true_false", "qa", "know_dont_know", "order_questions"].includes(i.type)).length}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">{t("dash.teacher.topics.editor.questionsCount")}</div>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4 text-center">
                                                    <div className="text-3xl font-bold text-purple-500">
                                                        {challengeItems.filter(i => ["matching", "shooting", "wheel_spin", "puzzle"].includes(i.type)).length}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">{t("dash.teacher.topics.editor.gamesCount")}</div>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4 text-center">
                                                    <div className="text-3xl font-bold text-green-500">
                                                        {challengeItems.reduce((sum, i) => sum + (i.points || 0), 0)}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">{t("dash.teacher.topics.editor.totalPoints")}</div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Items Preview */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-base flex items-center justify-between">
                                                    <span>{t("dash.teacher.topics.editor.previewItems")}</span>
                                                    <Button variant="ghost" size="sm" onClick={() => setShowQuestionEditor(true)}>{t("dash.teacher.topics.editor.editAll")}</Button>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                                    {challengeItems.map((item, index) => {
                                                        const typeStyle = getChallengeTypeStyle(item.type);
                                                        return (
                                                        <div
                                                            key={item.id}
                                                            className={cn("flex items-center gap-3 p-2 rounded-lg border", typeStyle.border, typeStyle.headerBg)}
                                                        >
                                                            <span className={cn("w-6 h-6 rounded flex items-center justify-center text-xs font-bold", typeStyle.indexBadge)}>
                                                                {index + 1}
                                                            </span>
                                                            <span className={cn("text-xs px-2 py-0.5 rounded font-medium", typeStyle.badge)}>
                                                                {getTypeLabel(item.type)}
                                                            </span>
                                                            <span className="flex-1 text-sm truncate">
                                                                {item.question || t("dash.teacher.topics.qe.noTitle")}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {t("dash.teacher.topics.qe.pointsShort", { n: item.points ?? 0 })}
                                                            </span>
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : (
                                    <Card className="p-12 text-center">
                                        <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                                        <h3 className="text-xl font-bold mb-2">{t("dash.teacher.topics.editor.noQuestions")}</h3>
                                        <p className="text-muted-foreground mb-4">
                                            {t("dash.teacher.topics.editor.noQuestionsDesc")}
                                        </p>
                                        <div className="flex flex-wrap justify-center gap-2 mb-6 text-xs">
                                            {ALL_CHALLENGE_ITEM_TYPES.map((type) => {
                                                const typeStyle = getChallengeTypeStyle(type);
                                                return (
                                                    <span
                                                        key={type}
                                                        className={cn("px-2 py-1 rounded font-medium", typeStyle.badge)}
                                                    >
                                                        {getTypeLabel(type)}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <Button onClick={() => setShowQuestionEditor(true)} className="gap-2">
                                            <Plus className="w-4 h-4" />{t("dash.teacher.topics.editor.addQuestionsGames")}</Button>
                                    </Card>
                                )}
                            </>
                        )}
                    </div>
                )
            }

            <Dialog
                open={showImagePromptDialog}
                onOpenChange={(open) => {
                    if (!open && isRenderingAiImage) return;
                    setShowImagePromptDialog(open);
                    if (!open) setEditableImagePrompt("");
                }}
            >
                <DialogContent className="max-h-[90vh] max-w-2xl gap-4 overflow-y-auto sm:max-w-2xl" dir={dir}>
                    <DialogHeader>
                        <DialogTitle>{t("dash.teacher.topics.editor.confirmImagePromptTitle")}</DialogTitle>
                        <DialogDescription className="text-right space-y-1">
                            <span className="block">
                                {t("dash.teacher.topics.editor.confirmImagePromptDesc1")}
                            </span>
                            <span className="block text-muted-foreground">
                                {t("dash.teacher.topics.editor.confirmImagePromptDesc2")}
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={editableImagePrompt}
                        onChange={(e) => setEditableImagePrompt(e.target.value)}
                        className="min-h-[min(40vh,320px)] text-sm leading-relaxed"
                        dir="auto"
                        disabled={isRenderingAiImage}
                        placeholder={t("dash.teacher.topics.editor.promptPlaceholder")}
                    />
                    <DialogFooter className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (!isRenderingAiImage) {
                                    setShowImagePromptDialog(false);
                                    setEditableImagePrompt("");
                                }
                            }}
                            disabled={isRenderingAiImage}
                        >
                            {t("dash.common.cancel")}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmGenerateImageFromPrompt}
                            disabled={isRenderingAiImage || !editableImagePrompt.trim()}
                        >
                            {isRenderingAiImage ? (
                                <>
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />{t("dash.teacher.topics.editor.generatingImage")}</>
                            ) : (
                                t("dash.teacher.topics.editor.generateImage")
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
};


export default ContentEditor;

