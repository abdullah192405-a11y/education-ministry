import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, Play, Eye, Clock,
    BookOpen, Gamepad2,
    FileText, Image as ImageIcon, AlignLeft, Video,
    Headphones, Link2, ExternalLink, MessageCircle, Paperclip, Star, Radio
} from "lucide-react";
import {
    useCreateTopicDiscussion,
    useCreateTopicDiscussionReply,
    useTopicLiveSessions,
    useUpsertTopicRating,
    useToggleDiscussionReaction,
    useTopic,
    useTopicDiscussions,
    useTopicRatings,
    useUpdateTopic,
    useUser,
    useCreateChallengeSession,
} from "@/hooks/useDatabase";
import { getTopicChallengePreset, navigateToTopicChallenge } from "@/lib/topicChallengePreset";
import { findMyTopicRating, getOrCreateTopicRatingGuestId } from "@/lib/topicRatingGuest";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "./NotFound";
import { getYouTubeEmbedUrl, getYouTubeThumbnail } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/contexts/LanguageContext";
import { getLiveProviderLabel } from "@/lib/topicLiveSession";

interface TopicLiveSession {
    id: string;
    provider?: string | null;
    meeting_url?: string | null;
    title?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    notes?: string | null;
    is_active?: boolean | null;
    host?: {
        user?: {
            name?: string | null;
        } | null;
    } | null;
}

const getLiveSessionStatus = (session: TopicLiveSession): "live" | "upcoming" | "ended" => {
    const now = Date.now();
    const start = new Date(session.starts_at || "").getTime();
    const end = new Date(session.ends_at || "").getTime();
    if (session.is_active && Number.isFinite(start) && Number.isFinite(end) && start <= now && now <= end) return "live";
    if (session.is_active && Number.isFinite(start) && start > now) return "upcoming";
    return "ended";
};


const TopicView = () => {
    const { topicId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { data: topic, isLoading, error } = useTopic(topicId || "");
    const { data: user } = useUser();
    const createSessionMutation = useCreateChallengeSession();
    const [isJoiningChallenge, setIsJoiningChallenge] = useState(false);
    const { t, dir, language } = useTranslation();
    const dateLocale = language === "ar" ? "ar-SA" : "en-US";
    const ChevronBack = dir === "rtl" ? ChevronRight : ChevronLeft;
    const ChevronForward = dir === "rtl" ? ChevronLeft : ChevronRight;
    const liveProviderLabel = (provider?: string | null) =>
        getLiveProviderLabel(provider, t, { customLabel: t("topicView.live.directLink") });
    const formatLiveDateTime = (value?: string | null) => {
        const date = new Date(value || "");
        if (Number.isNaN(date.getTime())) return "—";
        return date.toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" });
    };
    const { data: discussions = [], isLoading: discussionsLoading } = useTopicDiscussions(topicId || "");
    const { data: topicLiveSessionsData = [] } = useTopicLiveSessions(topicId || "");
    const topicLiveSessions = topicLiveSessionsData as TopicLiveSession[];
    const { data: topicRatings = [] } = useTopicRatings(topicId || "");
    const createDiscussionMutation = useCreateTopicDiscussion();
    const createReplyMutation = useCreateTopicDiscussionReply();
    const toggleReactionMutation = useToggleDiscussionReaction();
    const upsertTopicRatingMutation = useUpsertTopicRating();
    const subject = topic?.subject;
    const grade = subject?.grade;

    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [hasViewedAllMedia, setHasViewedAllMedia] = useState(false);
    const [discussionContent, setDiscussionContent] = useState("");
    const [isDiscussionComposerOpen, setIsDiscussionComposerOpen] = useState(false);
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
    const [discussionSticker, setDiscussionSticker] = useState<string>("");
    const [replyStickers, setReplyStickers] = useState<Record<string, string>>({});
    const [discussionAttachment, setDiscussionAttachment] = useState<{
        url: string;
        name: string;
        type: string;
    } | null>(null);
    const [replyAttachments, setReplyAttachments] = useState<Record<string, {
        url: string;
        name: string;
        type: string;
    } | null>>({});
    const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
    const [discussionsOpen, setDiscussionsOpen] = useState(false);
    const [openDiscussionId, setOpenDiscussionId] = useState<string>("");
    const [discussionSort, setDiscussionSort] = useState<"newest" | "oldest" | "mostReplies">("newest");
    const [topicRatingGuestId] = useState(() => getOrCreateTopicRatingGuestId());
    const hasIncrementedView = useRef(false);
    const discussionAttachmentInputRef = useRef<HTMLInputElement | null>(null);
    const replyAttachmentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const updateTopicMutation = useUpdateTopic();
    const publicDiscussionsEnabled = topic?.discussions_enabled !== false;
    const canParticipateInDiscussions = user?.role === "STUDENT" || user?.role === "TEACHER";
    const discussionStarterPrompts = [
        t("topicView.compose.prompt1"),
        t("topicView.compose.prompt2"),
        t("topicView.compose.prompt3"),
        t("topicView.compose.prompt4"),
    ];
    const stickerChoices = ["😀", "😍", "🤩", "😂", "👏", "🔥", "🎉", "💡", "📚", "👍"];
    const reactionChoices = ["👍", "❤️", "😂", "😮", "👏", "🔥"];

    useEffect(() => {
        if (topic && !hasIncrementedView.current) {
            hasIncrementedView.current = true;
            updateTopicMutation.mutate({
                id: topic.id,
                updates: { views: (topic.views || 0) + 1 }
            });
        }
    }, [topic]);

    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        setIsPlaying(false);
    }, [currentMediaIndex]);


    // Normalize media data
    // Use useMemo to avoid reconstructing Blob URLs on every render
    const media = useMemo(() => {
        return (topic?.mediaItems || []).map((m: any) => {
            const type = (m.type || "").toLowerCase();
            let url = m.url;

            // If it's a PDF and has base64 data but no URL, construct an Object URL from a Blob
            // This is significantly faster for the browser to render than putting a 5MB base64 string directly in the DOM
            if (type === 'pdf' && !url && m.pdf_base64) {
                try {
                    const byteCharacters = atob(m.pdf_base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    url = URL.createObjectURL(blob);
                } catch (e) {
                    console.error("Error creating PDF blob:", e);
                    // Fallback to data URL if conversion fails
                    url = `data:application/pdf;base64,${m.pdf_base64}`;
                }
            }

            return {
                type,
                url,
                content: m.content,
                caption: m.caption || m.fileName || m.file_name || m.type
            };
        });
    }, [topic?.mediaItems, topicId]);

    // Track if all media has been viewed
    useEffect(() => {
        if (media.length > 0 && currentMediaIndex === media.length - 1) {
            setHasViewedAllMedia(true);
        }
    }, [currentMediaIndex, media]);

    const activeLiveSession = useMemo(() => {
        const now = Date.now();
        const liveNow = topicLiveSessions
            .filter((session) => {
                const start = new Date(session.starts_at || "").getTime();
                const end = new Date(session.ends_at || "").getTime();
                return session.is_active && Number.isFinite(start) && Number.isFinite(end) && start <= now && now <= end;
            })
            .sort((a, b) => new Date(b.starts_at || "").getTime() - new Date(a.starts_at || "").getTime());
        return liveNow[0] || null;
    }, [topicLiveSessions]);

    const upcomingLiveSessions = useMemo(() => {
        const now = Date.now();
        return topicLiveSessions
            .filter((session) => {
                const start = new Date(session.starts_at || "").getTime();
                return session.is_active && Number.isFinite(start) && start > now;
            })
            .sort((a, b) => new Date(a.starts_at || "").getTime() - new Date(b.starts_at || "").getTime());
    }, [topicLiveSessions]);

    const featuredLiveSession = activeLiveSession || upcomingLiveSessions[0] || null;
    const additionalUpcomingSessions = featuredLiveSession
        ? upcomingLiveSessions.filter((session) => session.id !== featuredLiveSession.id).slice(0, 2)
        : upcomingLiveSessions.slice(0, 2);

    const courseMedia = useMemo(() => {
        if (!featuredLiveSession) return media;

        return [
            {
                type: "live_session",
                caption: featuredLiveSession.title || t("topicView.live.bannerTitle"),
                liveSession: featuredLiveSession,
                additionalLiveSessions: additionalUpcomingSessions,
            },
            ...media,
        ];
    }, [additionalUpcomingSessions, featuredLiveSession, media, t]);

    if (isLoading) {
        return (
            <div className="min-h-screen font-cairo" dir={dir}>
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4">
                        <Skeleton className="h-8 w-64 mb-6" />
                        <Skeleton className="h-32 w-full mb-8" />
                        <Skeleton className="h-[400px] w-full rounded-2xl" />
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !topic || !subject || !grade) {
        return <NotFound />;
    }

    const currentMedia = courseMedia[currentMediaIndex];
    const totalMedia = courseMedia.length;

    const handleNextMedia = () => {
        if (currentMediaIndex < totalMedia - 1) {
            setCurrentMediaIndex(currentMediaIndex + 1);
        }
    };

    const handlePrevMedia = () => {
        if (currentMediaIndex > 0) {
            setCurrentMediaIndex(currentMediaIndex - 1);
        }
    };

    const handleJoinChallenge = async () => {
        if (!grade?.slug || !subject?.id || !topic?.id) return;

        const preset = getTopicChallengePreset(topic as Record<string, unknown>);
        if (!preset) {
            navigate(`/grade/${grade.slug}/subject/${subject.id}/topic/${topic.id}/challenge`);
            return;
        }

        setIsJoiningChallenge(true);
        try {
            await navigateToTopicChallenge({
                preset,
                gradeId: grade.slug,
                subjectId: subject.id,
                topicId: topic.id,
                navigate,
                currentUser: user,
                createSession: (args) => createSessionMutation.mutateAsync(args),
            });
        } catch (error) {
            console.error("Failed to start preset challenge", error);
            toast({
                title: t("topicView.toast.challengeStartFail"),
                description: t("topicView.toast.challengeStartFailDesc"),
                variant: "destructive",
            });
        } finally {
            setIsJoiningChallenge(false);
        }
    };

    const formatRelativeTime = (iso: string) => {
        const ms = Date.now() - new Date(iso).getTime();
        const minutes = Math.floor(ms / (1000 * 60));
        if (minutes < 1) return t("topicView.relative.now");
        if (minutes < 60) return t("topicView.relative.minutes", { n: minutes });
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return t("topicView.relative.hours", { n: hours });
        const days = Math.floor(hours / 24);
        return t("topicView.relative.days", { n: days });
    };

    const getStudentClassLabel = (discussionUser: any) => {
        if (discussionUser?.role === "TEACHER") return null;
        const gradeName = discussionUser?.student_profiles?.[0]?.grade?.name;
        if (gradeName) return gradeName;
        if (discussionUser?.details) return discussionUser.details;
        return t("topicView.user.classUnknown");
    };

    const getUserRoleLabel = (discussionUser: any) => {
        if (discussionUser?.role === "TEACHER") return t("topicView.user.teacher");
        if (discussionUser?.role === "ADMIN") return t("topicView.user.admin");
        return t("topicView.user.student");
    };

    const getRoleDefaultAvatar = (discussionUser: any) => {
        const seed = discussionUser?.id || discussionUser?.name || "user";
        if (discussionUser?.role === "TEACHER") {
            return `https://api.dicebear.com/7.x/adventurer/svg?seed=teacher-${encodeURIComponent(seed)}`;
        }
        return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=student-${encodeURIComponent(seed)}`;
    };

    const getUserAvatarSrc = (discussionUser: any) => {
        return discussionUser?.avatar || getRoleDefaultAvatar(discussionUser);
    };

    const fileToDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error(t("topicView.toast.errReadFile")));
            reader.readAsDataURL(file);
        });

    const currentUserId = user?.id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id)
        ? user.id
        : null;
    const ratingsList = Array.isArray(topicRatings) ? topicRatings : [];
    const ratingsTotal = ratingsList.length;
    const ratingsAvg =
        ratingsTotal > 0
            ? ratingsList.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / ratingsTotal
            : 0;
    const myRating = findMyTopicRating(ratingsList, {
        userId: currentUserId,
        guestId: currentUserId ? null : topicRatingGuestId,
    });

    const isUuid = (value?: string | null) => {
        if (!value) return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    };

    const resolveDiscussionUserId = async () => {
        if (isUuid(user?.id)) return user!.id as string;
        if (user?.email) {
            const { data, error } = await supabase
                .from("users")
                .select("id")
                .eq("email", user.email)
                .maybeSingle();
            if (error) throw error;
            if (isUuid(data?.id)) return data.id as string;
        }
        throw new Error(t("topicView.toast.errResolveUser"));
    };

    const handleAddDiscussion = async () => {
        const trimmed = discussionContent.trim();
        if (!user?.id || !canParticipateInDiscussions) {
            toast({
                title: t("topicView.toast.commentNotAvailable"),
                description: t("topicView.toast.commentForStudentsTeachers"),
                variant: "destructive",
            });
            return;
        }
        if (!trimmed && !discussionSticker && !discussionAttachment) return;
        try {
            const validUserId = await resolveDiscussionUserId();
            await createDiscussionMutation.mutateAsync({
                topicId: topic.id,
                userId: validUserId,
                content: trimmed || " ",
                sticker: discussionSticker || null,
                attachmentUrl: discussionAttachment?.url || null,
                attachmentName: discussionAttachment?.name || null,
                attachmentType: discussionAttachment?.type || null,
            });
            setDiscussionContent("");
            setDiscussionSticker("");
            setDiscussionAttachment(null);
            setIsDiscussionComposerOpen(false);
            setDiscussionsOpen(true);
            toast({ title: t("topicView.toast.publishedSuccess") });
        } catch (err: unknown) {
            console.error("Failed to add discussion:", err);
            const message = err instanceof Error ? err.message : t("topicView.toast.errPublish");
            toast({
                title: t("topicView.toast.errGeneric"),
                description: message,
                variant: "destructive",
            });
        }
    };

    const handleAddReply = async (discussionId: string) => {
        const trimmed = (replyDrafts[discussionId] || "").trim();
        if (!user?.id || !canParticipateInDiscussions) {
            toast({
                title: t("topicView.toast.commentNotAvailable"),
                description: t("topicView.toast.commentForStudentsTeachers"),
                variant: "destructive",
            });
            return;
        }
        if (!trimmed && !replyStickers[discussionId] && !replyAttachments[discussionId]) return;
        try {
            const validUserId = await resolveDiscussionUserId();
            await createReplyMutation.mutateAsync({
                topicId: topic.id,
                discussionId,
                userId: validUserId,
                content: trimmed || " ",
                sticker: replyStickers[discussionId] || null,
                attachmentUrl: replyAttachments[discussionId]?.url || null,
                attachmentName: replyAttachments[discussionId]?.name || null,
                attachmentType: replyAttachments[discussionId]?.type || null,
            });
            setReplyDrafts((prev) => ({ ...prev, [discussionId]: "" }));
            setReplyStickers((prev) => ({ ...prev, [discussionId]: "" }));
            setReplyAttachments((prev) => ({ ...prev, [discussionId]: null }));
        } catch (err: unknown) {
            console.error("Failed to add reply:", err);
            const message = err instanceof Error ? err.message : t("topicView.toast.errAddReply");
            toast({
                title: t("topicView.toast.errGeneric"),
                description: message,
                variant: "destructive",
            });
        }
    };

    const handleSelectDiscussionAttachment = async (file?: File | null) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: t("topicView.toast.fileLarge"), description: t("topicView.toast.fileLargeDesc"), variant: "destructive" });
            return;
        }
        try {
            const url = await fileToDataUrl(file);
            setDiscussionAttachment({ url, name: file.name, type: file.type || "application/octet-stream" });
        } catch (e) {
            console.error(e);
            toast({ title: t("topicView.toast.errGeneric"), description: t("topicView.toast.errPrepFile"), variant: "destructive" });
        }
    };

    const handleSelectReplyAttachment = async (discussionId: string, file?: File | null) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: t("topicView.toast.fileLarge"), description: t("topicView.toast.fileLargeDesc"), variant: "destructive" });
            return;
        }
        try {
            const url = await fileToDataUrl(file);
            setReplyAttachments((prev) => ({
                ...prev,
                [discussionId]: { url, name: file.name, type: file.type || "application/octet-stream" },
            }));
        } catch (e) {
            console.error(e);
            toast({ title: t("topicView.toast.errGeneric"), description: t("topicView.toast.errPrepFile"), variant: "destructive" });
        }
    };

    const handleToggleReaction = async (payload: { discussionId?: string; replyId?: string; emoji: string }) => {
        if (!currentUserId) {
            toast({ title: t("topicView.toast.loginFirst"), description: t("topicView.toast.loginToReact") });
            return;
        }
        try {
            await toggleReactionMutation.mutateAsync({
                topicId: topic.id,
                userId: currentUserId,
                emoji: payload.emoji,
                discussionId: payload.discussionId,
                replyId: payload.replyId,
            });
        } catch (e) {
            console.error(e);
            toast({ title: t("topicView.toast.errGeneric"), description: t("topicView.toast.errSaveReact"), variant: "destructive" });
        }
    };

    const handleRateTopic = async (value: number) => {
        try {
            await upsertTopicRatingMutation.mutateAsync({
                topicId: topic.id,
                userId: currentUserId,
                guestId: currentUserId ? null : topicRatingGuestId,
                rating: value,
            });
        } catch (e) {
            console.error(e);
            toast({ title: t("topicView.toast.errGeneric"), description: t("topicView.rate.errSaving"), variant: "destructive" });
        }
    };

    const isRepliesExpanded = (discussionId: string, repliesCount: number) => {
        if (expandedReplies[discussionId] !== undefined) return expandedReplies[discussionId];
        return repliesCount <= 2;
    };

    const toggleReplies = (discussionId: string, current: boolean) => {
        setExpandedReplies((prev) => ({
            ...prev,
            [discussionId]: !current,
        }));
    };

    const sortedDiscussions = useMemo(() => {
        const list = [...discussions];
        if (discussionSort === "oldest") {
            return list.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
        if (discussionSort === "mostReplies") {
            return list.sort(
                (a: any, b: any) => (b.replies?.length || 0) - (a.replies?.length || 0),
            );
        }
        return list;
    }, [discussions, discussionSort]);

    const getDiscussionPreview = (content: string) => {
        const trimmed = content.trim();
        if (!trimmed) return t("topicView.posts.stickerOnly");
        return trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed;
    };

    const totalReplies = useMemo(
        () => discussions.reduce((acc: number, d: any) => acc + (d.replies?.length || 0), 0),
        [discussions],
    );

    const getMediaIcon = (type: string) => {
        switch (type) {
            case "live_session": return <Radio className="w-4 h-4" />;
            case "video": return <Video className="w-4 h-4" />;
            case "image": return <ImageIcon className="w-4 h-4" />;
            case "text": return <AlignLeft className="w-4 h-4" />;
            case "pdf": return <FileText className="w-4 h-4" />;
            case "audio": return <Headphones className="w-4 h-4" />;
            case "link": return <Link2 className="w-4 h-4" />;
            default: return <BookOpen className="w-4 h-4" />;
        }
    };

    const renderMedia = () => {
        if (!currentMedia) return null;
        switch (currentMedia.type) {
            case "live_session": {
                const session = currentMedia.liveSession as TopicLiveSession | undefined;
                if (!session) return null;

                const status = getLiveSessionStatus(session);
                const isLiveNow = status === "live";
                const hostName = session.host?.user?.name;
                const upcomingSessions = currentMedia.additionalLiveSessions as TopicLiveSession[] | undefined;

                return (
                    <Card className="overflow-hidden border-0 shadow-xl ring-1 ring-border/60">
                        <CardContent className="p-0">
                            <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-slate-950 p-6 text-white md:p-8">
                                <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                                <div className="absolute -bottom-16 right-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

                                <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold backdrop-blur ${isLiveNow ? "bg-emerald-500 text-white" : "bg-white/15 text-white"}`}>
                                                {isLiveNow ? <Radio className="w-3.5 h-3.5 animate-pulse" /> : <CalendarClock className="w-3.5 h-3.5" />}
                                                {isLiveNow ? t("topicView.live.now") : t("topicView.live.upcoming")}
                                            </span>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                {t("topicView.live.partOfLesson")}
                                            </span>
                                        </div>

                                        <div>
                                            <p className="text-2xl md:text-3xl font-black tracking-tight">{session.title || t("topicView.live.lessonStream")}</p>
                                            <p className="mt-2 max-w-2xl text-sm md:text-base text-white/80">
                                                {isLiveNow
                                                    ? t("topicView.live.descNow")
                                                    : t("topicView.live.descUpcoming")}
                                            </p>
                                        </div>
                                    </div>

                                    <Button asChild size="lg" className="h-12 rounded-full bg-white px-6 font-bold text-primary shadow-lg hover:bg-white/90">
                                        <a href={session.meeting_url || "#"} target="_blank" rel="noopener noreferrer">
                                            {isLiveNow ? t("topicView.live.joinNow") : t("topicView.live.openLink")}
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4 bg-background p-5 md:p-6">
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-2xl border bg-muted/25 p-4">
                                        <p className="text-[11px] font-bold text-muted-foreground">{t("topicView.live.platform")}</p>
                                        <p className="mt-1 font-bold">{liveProviderLabel(session.provider)}</p>
                                    </div>
                                    <div className="rounded-2xl border bg-muted/25 p-4">
                                        <p className="text-[11px] font-bold text-muted-foreground">{t("topicView.live.startTime")}</p>
                                        <p className="mt-1 text-sm font-bold">{formatLiveDateTime(session.starts_at)}</p>
                                    </div>
                                    <div className="rounded-2xl border bg-muted/25 p-4">
                                        <p className="text-[11px] font-bold text-muted-foreground">{t("topicView.live.endTime")}</p>
                                        <p className="mt-1 text-sm font-bold">{formatLiveDateTime(session.ends_at)}</p>
                                    </div>
                                    {hostName && (
                                        <div className="rounded-2xl border bg-muted/25 p-4">
                                            <p className="text-[11px] font-bold text-muted-foreground">{t("topicView.teacher")}</p>
                                            <p className="mt-1 font-bold">{hostName}</p>
                                        </div>
                                    )}
                                </div>

                                {session.notes && (
                                    <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
                                        <p className="mb-1 text-xs font-bold text-primary">{t("topicView.live.teacherNote")}</p>
                                        <p className="text-sm text-muted-foreground">{session.notes}</p>
                                    </div>
                                )}

                                {upcomingSessions && upcomingSessions.length > 0 && (
                                    <div className="border-t pt-4">
                                        <p className="mb-2 text-xs font-bold text-muted-foreground">{t("topicView.live.otherUpcoming")}</p>
                                        <div className="grid gap-2 md:grid-cols-2">
                                            {upcomingSessions.map((upcomingSession) => (
                                                <div key={upcomingSession.id} className="rounded-xl border bg-muted/20 p-3">
                                                    <p className="text-sm font-bold">{upcomingSession.title || t("topicView.live.upcomingTitle")}</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {formatLiveDateTime(upcomingSession.starts_at)} - {liveProviderLabel(upcomingSession.provider)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            }
            case "video":
                const embedUrl = getYouTubeEmbedUrl(currentMedia.url);
                const isYouTube = currentMedia.url?.includes("youtube") || currentMedia.url?.includes("youtu.be");

                if (isYouTube && !isPlaying) {
                    const thumbnailUrl = getYouTubeThumbnail(currentMedia.url);
                    return (
                        <div
                            className="relative aspect-video rounded-2xl overflow-hidden bg-black group cursor-pointer"
                            onClick={() => setIsPlaying(true)}
                        >
                            <img
                                src={thumbnailUrl || ""}
                                alt={currentMedia.caption}
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                onError={(e) => {
                                    // Fallback to high quality if maxres isn't available
                                    const target = e.target as HTMLImageElement;
                                    if (target.src.includes('maxresdefault')) {
                                        target.src = target.src.replace('maxresdefault', 'hqdefault');
                                    }
                                }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-20 h-20 bg-primary/90 text-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                                    <Play className="w-10 h-10 fill-current" />
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-white text-lg font-bold">{currentMedia.caption || t("topicView.video.show")}</p>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
                        <iframe
                            src={embedUrl}
                            title={currentMedia.caption}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                );

            case "image":
                return (
                    <div className="relative rounded-2xl overflow-hidden">
                        <img
                            src={currentMedia.url}
                            alt={currentMedia.caption}
                            className="w-full h-auto max-h-[500px] object-contain bg-muted"
                        />
                    </div>
                );
            case "text":
                return (
                    <Card className="p-6 md:p-8">
                        <div className="prose prose-lg dark:prose-invert max-w-none text-right leading-relaxed">
                            {currentMedia.content?.split('\n').map((paragraph: string, index: number) => {
                                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                                    return <h3 key={index} className="text-xl font-bold mt-6 mb-3">{paragraph.replace(/\*\*/g, '')}</h3>;
                                }
                                if (paragraph.startsWith('- ') || paragraph.startsWith('• ')) {
                                    return <li key={index} className="mr-4 mb-2">{paragraph.substring(2)}</li>;
                                }
                                if (paragraph.match(/^\d+\./)) {
                                    return <li key={index} className="mr-4 mb-2 list-decimal">{paragraph.substring(3)}</li>;
                                }
                                if (paragraph.startsWith('🔢') || paragraph.startsWith('💧') || paragraph.startsWith('♻️') || paragraph.startsWith('🔐') || paragraph.startsWith('🛡️') || paragraph.startsWith('⚠️') || paragraph.startsWith('💻') || paragraph.startsWith('🔤')) {
                                    return <p key={index} className="text-lg mb-2">{paragraph}</p>;
                                }
                                return paragraph.trim() ? <p key={index} className="mb-4">{paragraph}</p> : <br key={index} />;
                            })}
                        </div>
                    </Card>
                );
            case "pdf": {
                if (!currentMedia.url) {
                    return (
                        <div className="w-full h-[400px] flex flex-col items-center justify-center bg-muted/20 rounded-2xl border border-dashed text-center p-6">
                            <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-bold mb-2">{t("topicView.pdf.notAvailable")}</h3>
                            <p className="text-muted-foreground max-w-sm">
                                {t("topicView.pdf.notAvailableDesc")}
                            </p>
                        </div>
                    );
                }

                return (
                    <div className="w-full h-[65vh] min-h-[450px] rounded-2xl overflow-hidden border bg-background shadow-lg relative group transition-all duration-300">
                        {/* Loading indicator behind the PDF */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/10 z-0">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                            <p className="text-muted-foreground font-medium text-sm md:text-base">{t("topicView.pdf.loading")}</p>
                        </div>

                        {/* PDF Viewer - using object for better compatibility, falls back to iframe */}
                        <object
                            data={currentMedia.url}
                            type="application/pdf"
                            className="w-full h-full relative z-10 bg-transparent"
                        >
                            <iframe
                                src={currentMedia.url}
                                className="w-full h-full border-none"
                                title={currentMedia.caption || t("topicView.pdf.viewPdf")}
                            />
                        </object>

                        {/* Enhanced controls on hover */}
                        <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-xl backdrop-blur-sm">
                            <Button size="sm" variant="secondary" className="shadow-md font-bold" asChild>
                                <a href={currentMedia.url} target="_blank" rel="noopener noreferrer">
                                    <FileText className="w-4 h-4 ml-2" />
                                    {t("topicView.pdf.openNewWindow")}
                                </a>
                            </Button>
                        </div>
                    </div>
                );
            }
            case "audio": {
                if (!currentMedia.url) {
                    return (
                        <div className="w-full min-h-[200px] flex flex-col items-center justify-center bg-muted/20 rounded-2xl border border-dashed text-center p-6">
                            <Headphones className="w-16 h-16 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-bold mb-2">{t("topicView.audio.notAvailable")}</h3>
                            <p className="text-muted-foreground max-w-sm text-sm">
                                {t("topicView.audio.notAvailableDesc")}
                            </p>
                        </div>
                    );
                }
                return (
                    <div className="rounded-2xl overflow-hidden border bg-muted/20 p-6 md:p-8 flex flex-col items-center gap-4">
                        <audio
                            controls
                            className="w-full max-w-2xl"
                            src={currentMedia.url}
                            preload="metadata"
                        >
                            {t("topicView.audio.notSupported")}
                        </audio>
                        {currentMedia.caption ? (
                            <p className="text-center text-muted-foreground text-sm md:text-base max-w-2xl">
                                {currentMedia.caption}
                            </p>
                        ) : null}
                    </div>
                );
            }
            case "link": {
                if (!currentMedia.url) {
                    return (
                        <div className="w-full min-h-[200px] flex flex-col items-center justify-center bg-muted/20 rounded-2xl border border-dashed text-center p-6">
                            <Link2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-bold mb-2">{t("topicView.link.notAvailable")}</h3>
                        </div>
                    );
                }
                const linkUrl = currentMedia.url;
                const isYouTube =
                    linkUrl.includes("youtube.com") ||
                    linkUrl.includes("youtu.be");
                if (isYouTube) {
                    const embedUrl = getYouTubeEmbedUrl(linkUrl);
                    return (
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
                            <iframe
                                src={embedUrl}
                                title={currentMedia.caption || t("topicView.link.videoCaption")}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    );
                }
                return (
                    <Card className="p-8 md:p-10 max-w-2xl mx-auto">
                        <div className="flex flex-col items-center gap-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <ExternalLink className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">
                                    {currentMedia.caption || t("topicView.link.external")}
                                </h3>
                                <p className="text-sm text-muted-foreground break-all mb-6" dir="ltr">
                                    {linkUrl}
                                </p>
                            </div>
                            <Button size="lg" className="font-bold gap-2" asChild>
                                <a href={linkUrl} target="_blank" rel="noopener noreferrer">
                                    {t("topicView.link.openLink")}
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </Button>
                        </div>
                    </Card>
                );
            }
            default: return null;
        }
    };

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-b from-background to-muted/30" dir={dir}>
            <Header />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4">
                    {/* Breadcrumb */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
                    >
                        <Link to="/grades" className="hover:text-primary transition-colors">
                            {t("subjectView.breadcrumbGrades")}
                        </Link>
                        <span>/</span>
                        <Link to={`/grade/${grade.slug}`} className="hover:text-primary transition-colors">
                            {grade.name}
                        </Link>
                        <span>/</span>
                        <Link to={`/grade/${grade.slug}/subject/${subject.id}`} className="hover:text-primary transition-colors">
                            {subject.icon} {subject.name}
                        </Link>
                        <span>/</span>
                        <span className="text-foreground">{topic.title}</span>
                    </motion.div>

                    {/* Content Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <span
                                className="px-3 py-1 rounded-full text-sm font-medium"
                                style={{
                                    backgroundColor: `${subject.color}20`,
                                    color: subject.color
                                }}
                            >
                                {subject.icon} {subject.name}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground text-sm">
                                <Eye className="w-4 h-4" />
                                {((topic.views || 0) + (topic.activities?.length || 0)).toLocaleString(dateLocale)} {t("topicView.viewsSuffix")}
                            </span>
                            {topic.duration && (
                                <span className="flex items-center gap-1 text-muted-foreground text-sm">
                                    <Clock className="w-4 h-4" />
                                    {topic.duration}
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black mb-3">{topic.title}</h1>
                        <p className="text-lg text-muted-foreground">{topic.description}</p>
                    </motion.div>
                    {/* Main Content Area */}
                    <div className="space-y-6">
                        {/* Progress Bar */}
                        <div className="flex items-center gap-4 mb-4">
                            <span className="text-sm text-muted-foreground">
                                {t("topicView.media.ofTotal", { current: currentMediaIndex + 1, total: totalMedia })}
                            </span>
                            <Progress value={((currentMediaIndex + 1) / totalMedia) * 100} className="flex-1 h-2 rotate-180" />
                        </div>

                        {/* Media Content */}
                        <div className="max-w-4xl mx-auto">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentMediaIndex}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    {renderMedia()}
                                </motion.div>
                            </AnimatePresence>

                            {/* Caption */}
                            {currentMedia?.caption && currentMedia.type !== "live_session" && (
                                <p className="text-center text-muted-foreground mt-4 text-lg">
                                    {currentMedia.caption}
                                </p>
                            )}
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between max-w-4xl mx-auto mt-8">
                            <Button
                                variant="outline"
                                onClick={handlePrevMedia}
                                disabled={currentMediaIndex === 0}
                                className="gap-1 md:gap-2 h-8 px-3 text-xs md:h-10 md:px-4 md:text-base"
                            >
                                <ChevronBack className="w-3 h-3 md:w-4 md:h-4" />
                                {t("topicView.previous")}
                            </Button>

                            <div className="flex flex-wrap justify-center gap-2 max-h-[200px] overflow-y-auto p-2">
                                {courseMedia.map((item: any, index: number) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentMediaIndex(index)}
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border-2 ${index === currentMediaIndex
                                            ? "bg-primary text-white border-primary scale-110 shadow-md"
                                            : index <= currentMediaIndex
                                                ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                                : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                                            }`}
                                        title={item.type}
                                    >
                                        {getMediaIcon(item.type)}
                                    </button>
                                ))}
                            </div>

                            {currentMediaIndex < totalMedia - 1 ? (
                                <Button onClick={handleNextMedia} className="gap-1 md:gap-2 h-8 px-3 text-xs md:h-10 md:px-4 md:text-base">
                                    {t("topicView.next")}
                                    <ChevronForward className="w-3 h-3 md:w-4 md:h-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleJoinChallenge}
                                    variant="hero"
                                    disabled={isJoiningChallenge}
                                    className="gap-1 md:gap-2 h-8 px-3 text-xs md:h-10 md:px-4 md:text-base"
                                >
                                    <Gamepad2 className="w-3 h-3 md:w-4 md:h-4" />
                                    {isJoiningChallenge ? t("topicView.preparing") : t("topicView.joinChallenge")}
                                </Button>
                            )}
                        </div>

                        {/* Quick Challenge Access */}
                        {hasViewedAllMedia && currentMediaIndex < totalMedia - 1 && (
                            <div className="text-center mt-4">
                                <Button
                                    variant="ghost"
                                    onClick={handleJoinChallenge}
                                    disabled={isJoiningChallenge}
                                    className="gap-2"
                                >
                                    <Play className="w-4 h-4" />
                                    {isJoiningChallenge ? t("topicView.preparing") : t("topicView.goToChallenge")}
                                </Button>
                            </div>
                        )}

                        {/* Public Discussion Arena */}
                        {publicDiscussionsEnabled && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="max-w-4xl mx-auto mt-8"
                            >
                                <Card className="border-primary/30 shadow-sm bg-gradient-to-b from-primary/[0.05] via-background to-background overflow-hidden">
                                    <Collapsible open={discussionsOpen} onOpenChange={setDiscussionsOpen}>
                                        <CollapsibleTrigger asChild>
                                            <button
                                                type="button"
                                                className="w-full p-6 md:p-8 flex items-center justify-between gap-4 text-start hover:bg-muted/20 transition-colors"
                                            >
                                                <div className="space-y-2 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <MessageCircle className="w-5 h-5 text-primary shrink-0" />
                                                        <h3 className="text-xl font-bold">{t("topicView.discussions.title")}</h3>
                                                        <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                            {discussions.length} {t("topicView.discussions.countSuffix")}
                                                        </span>
                                                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium">
                                                            {totalReplies} {t("topicView.discussions.repliesSuffix")}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {discussionsOpen
                                                            ? t("topicView.discussions.collapseHint")
                                                            : t("topicView.discussions.expandHint")}
                                                    </p>
                                                </div>
                                                <ChevronDown
                                                    className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${discussionsOpen ? "rotate-180" : ""}`}
                                                />
                                            </button>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent className="px-6 md:px-8 pb-6 md:pb-8 space-y-6 border-t border-primary/10">
                                        <p className="text-sm text-muted-foreground pt-4">
                                            {t("topicView.discussions.intro")}
                                        </p>
                                        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                                            {t("topicView.discussions.enabled")}
                                        </div>

                                        <div className="rounded-xl border bg-background p-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-bold">{t("topicView.rate.title")}</h4>
                                                <span className="text-xs text-muted-foreground">
                                                    {t("topicView.rate.summary", { count: ratingsTotal, avg: ratingsAvg.toFixed(1) })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() => handleRateTopic(star)}
                                                        className="p-1 rounded hover:bg-muted transition"
                                                        aria-label={t("topicView.rate.aria", { n: star })}
                                                    >
                                                        <Star
                                                            className={`w-5 h-5 ${star <= myRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                                                        />
                                                    </button>
                                                ))}
                                                <span className="text-xs text-muted-foreground mr-2">{t("topicView.rate.yourRating")} {myRating || "—"}</span>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border bg-background p-4 md:p-5">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <h4 className="text-sm font-bold">{t("topicView.compose.title")}</h4>
                                                    <span className="text-[11px] text-muted-foreground">{t("topicView.compose.sub")}</span>
                                                </div>
                                                <Button
                                                    onClick={() => setIsDiscussionComposerOpen(true)}
                                                    disabled={!canParticipateInDiscussions}
                                                >
                                                    {t("topicView.compose.title")}
                                                </Button>
                                            </div>
                                        </div>

                                        <Dialog open={isDiscussionComposerOpen} onOpenChange={setIsDiscussionComposerOpen}>
                                            <DialogContent dir={dir} className="sm:max-w-2xl">
                                                <DialogHeader>
                                                    <DialogTitle>{t("topicView.compose.title")}</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {discussionStarterPrompts.map((prompt) => (
                                                            <button
                                                                key={prompt}
                                                                type="button"
                                                                onClick={() => setDiscussionContent(prompt)}
                                                                className="text-xs px-3 py-1.5 rounded-full border bg-muted/40 hover:bg-primary/5 hover:border-primary/40 transition"
                                                            >
                                                                {prompt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <Textarea
                                                        value={discussionContent}
                                                        onChange={(e) => setDiscussionContent(e.target.value)}
                                                        placeholder={canParticipateInDiscussions ? t("topicView.compose.placeholder") : t("topicView.compose.placeholderDisabled")}
                                                        rows={5}
                                                        disabled={!canParticipateInDiscussions}
                                                        className="bg-background"
                                                    />
                                                    <div className="flex flex-wrap gap-2">
                                                        {stickerChoices.map((sticker) => (
                                                            <button
                                                                key={`s-${sticker}`}
                                                                type="button"
                                                                onClick={() => setDiscussionSticker(sticker)}
                                                                className={`h-8 w-8 rounded-full border text-lg ${discussionSticker === sticker ? "bg-primary/10 border-primary" : "bg-background"}`}
                                                            >
                                                                {sticker}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {discussionSticker ? (
                                                        <div className="text-2xl">{discussionSticker}</div>
                                                    ) : null}
                                                    {discussionAttachment ? (
                                                        <div className="rounded-lg border bg-muted/20 p-2 text-xs flex items-center justify-between gap-2">
                                                            <span className="truncate">{discussionAttachment.name}</span>
                                                            <Button size="sm" variant="ghost" onClick={() => setDiscussionAttachment(null)}>{t("topicView.posts.delete")}</Button>
                                                        </div>
                                                    ) : null}
                                                    <input
                                                        ref={discussionAttachmentInputRef}
                                                        type="file"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            void handleSelectDiscussionAttachment(e.target.files?.[0] || null);
                                                            e.currentTarget.value = "";
                                                        }}
                                                    />
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs text-muted-foreground">
                                                            {discussionContent.trim().length}/300
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => discussionAttachmentInputRef.current?.click()}
                                                            >
                                                                <Paperclip className="w-4 h-4 ml-1" />
                                                                {t("topicView.compose.file")}
                                                            </Button>
                                                            <Button
                                                                onClick={handleAddDiscussion}
                                                                disabled={
                                                                    !canParticipateInDiscussions ||
                                                                    createDiscussionMutation.isPending ||
                                                                    (!discussionContent.trim() && !discussionSticker && !discussionAttachment) ||
                                                                    discussionContent.trim().length > 300
                                                                }
                                                            >
                                                                {t("topicView.compose.publish")}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        <div className="space-y-4 rounded-xl border bg-background p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                                                <div>
                                                    <h4 className="text-sm font-bold">{t("topicView.posts.title")}</h4>
                                                    <span className="text-xs text-muted-foreground">{t("topicView.posts.clickToExpand")}</span>
                                                </div>
                                                <Select
                                                    value={discussionSort}
                                                    onValueChange={(value) =>
                                                        setDiscussionSort(value as "newest" | "oldest" | "mostReplies")
                                                    }
                                                >
                                                    <SelectTrigger className="w-full sm:w-[200px]">
                                                        <SelectValue placeholder={t("topicView.discussions.sortLabel")} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="newest">{t("topicView.discussions.sortNewest")}</SelectItem>
                                                        <SelectItem value="oldest">{t("topicView.discussions.sortOldest")}</SelectItem>
                                                        <SelectItem value="mostReplies">{t("topicView.discussions.sortMostReplies")}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {discussionsLoading ? (
                                                <Skeleton className="h-24 w-full" />
                                            ) : sortedDiscussions.length === 0 ? (
                                                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                                                    {t("topicView.posts.empty")}
                                                </div>
                                            ) : (
                                                <Accordion
                                                    type="single"
                                                    collapsible
                                                    value={openDiscussionId}
                                                    onValueChange={setOpenDiscussionId}
                                                    className="space-y-2"
                                                >
                                                {sortedDiscussions.map((discussion: any) => (
                                                    <AccordionItem
                                                        key={discussion.id}
                                                        value={discussion.id}
                                                        className="rounded-2xl border-2 border-muted/60 px-4 bg-background overflow-hidden"
                                                    >
                                                        <AccordionTrigger className="hover:no-underline py-4 [&>svg]:ms-3">
                                                            <div className="flex items-start gap-3 min-w-0 flex-1 text-start">
                                                                <Avatar className="h-10 w-10 border shrink-0">
                                                                    <AvatarImage
                                                                        src={getUserAvatarSrc(discussion.user)}
                                                                        alt={discussion.user?.name || t("topicView.user.student")}
                                                                    />
                                                                    <AvatarFallback>
                                                                        <img
                                                                            src={getRoleDefaultAvatar(discussion.user)}
                                                                            alt="profile"
                                                                            className="h-full w-full object-cover"
                                                                        />
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <p className="font-semibold truncate">{discussion.user?.name || t("topicView.user.student")}</p>
                                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                                            {getUserRoleLabel(discussion.user)}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                                        {discussion.sticker && !discussion.content.trim()
                                                                            ? discussion.sticker
                                                                            : getDiscussionPreview(discussion.content)}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(discussion.created_at)}</p>
                                                                </div>
                                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">
                                                                    {discussion.replies?.length || 0} {t("topicView.discussions.repliesSuffix")}
                                                                </span>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="pb-4">
                                                    <div className="space-y-4 pt-2 border-t border-dashed">
                                                        <p className="leading-7 whitespace-pre-wrap text-[15px]">{discussion.content.trim()}</p>
                                                        {getStudentClassLabel(discussion.user) ? (
                                                            <span className="inline-flex text-[10px] px-2 py-0.5 rounded-full bg-secondary/20 text-secondary-foreground">
                                                                {getStudentClassLabel(discussion.user)}
                                                            </span>
                                                        ) : null}
                                                        {discussion.sticker ? <div className="text-3xl">{discussion.sticker}</div> : null}
                                                        {discussion.attachment_url ? (
                                                            <div className="rounded-lg border p-2 bg-muted/20">
                                                                {String(discussion.attachment_type || "").startsWith("image/") ? (
                                                                    <img
                                                                        src={discussion.attachment_url}
                                                                        alt={discussion.attachment_name || "attachment"}
                                                                        className="max-h-56 rounded-md object-contain"
                                                                    />
                                                                ) : (
                                                                    <a
                                                                        href={discussion.attachment_url}
                                                                        download={discussion.attachment_name || "file"}
                                                                        className="text-sm text-primary underline"
                                                                    >
                                                                        {discussion.attachment_name || t("topicView.posts.downloadAttachment")}
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ) : null}
                                                        <div className="flex flex-wrap gap-1">
                                                            {reactionChoices.map((emoji) => {
                                                                const reactions = discussion.reactions || [];
                                                                const count = reactions.filter((r: any) => r.emoji === emoji).length;
                                                                const active = currentUserId ? reactions.some((r: any) => r.emoji === emoji && r.user_id === currentUserId) : false;
                                                                return (
                                                                    <button
                                                                        key={`${discussion.id}-${emoji}`}
                                                                        type="button"
                                                                        onClick={() => void handleToggleReaction({ discussionId: discussion.id, emoji })}
                                                                        className={`px-2 py-1 rounded-full border text-xs ${active ? "bg-primary/10 border-primary" : "bg-background"}`}
                                                                    >
                                                                        {emoji} {count > 0 ? count : ""}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        <div className="space-y-3 border-t border-dashed pt-3">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-xs font-semibold text-muted-foreground">{t("topicView.posts.repliesLabel")}</p>
                                                                {(discussion.replies?.length || 0) > 0 ? (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 px-2 text-xs"
                                                                        onClick={() =>
                                                                            toggleReplies(
                                                                                discussion.id,
                                                                                isRepliesExpanded(discussion.id, discussion.replies?.length || 0)
                                                                            )
                                                                        }
                                                                    >
                                                                        {isRepliesExpanded(discussion.id, discussion.replies?.length || 0)
                                                                            ? t("topicView.posts.hideReplies")
                                                                            : t("topicView.posts.showReplies", { count: discussion.replies?.length || 0 })}
                                                                    </Button>
                                                                ) : null}
                                                            </div>
                                                            {isRepliesExpanded(discussion.id, discussion.replies?.length || 0)
                                                                ? (discussion.replies || []).map((reply: any) => (
                                                                    <div key={reply.id} className="rounded-xl bg-muted/35 border p-3">
                                                                        <div className="flex items-start gap-2.5">
                                                                            <Avatar className="h-8 w-8 border">
                                                                                <AvatarImage
                                                                                    src={getUserAvatarSrc(reply.user)}
                                                                                    alt={reply.user?.name || t("topicView.user.student")}
                                                                                />
                                                                                <AvatarFallback>
                                                                                    <img
                                                                                        src={getRoleDefaultAvatar(reply.user)}
                                                                                        alt="profile"
                                                                                        className="h-full w-full object-cover"
                                                                                    />
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                                    <p className="text-sm font-medium truncate">{reply.user?.name || t("topicView.user.student")}</p>
                                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                                                {getUserRoleLabel(reply.user)}
                                                                            </span>
                                                                            {getStudentClassLabel(reply.user) ? (
                                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/20 text-secondary-foreground">
                                                                                    {getStudentClassLabel(reply.user)}
                                                                                </span>
                                                                            ) : null}
                                                                        </div>
                                                                                <p className="text-sm whitespace-pre-wrap leading-6">{reply.content.trim()}</p>
                                                                                {reply.sticker ? <div className="text-2xl mt-1">{reply.sticker}</div> : null}
                                                                                {reply.attachment_url ? (
                                                                                    <div className="rounded-lg border p-2 bg-background/70 mt-2">
                                                                                        {String(reply.attachment_type || "").startsWith("image/") ? (
                                                                                            <img
                                                                                                src={reply.attachment_url}
                                                                                                alt={reply.attachment_name || "attachment"}
                                                                                                className="max-h-44 rounded-md object-contain"
                                                                                            />
                                                                                        ) : (
                                                                                            <a
                                                                                                href={reply.attachment_url}
                                                                                                download={reply.attachment_name || "file"}
                                                                                                className="text-xs text-primary underline"
                                                                                            >
                                                                                                {reply.attachment_name || t("topicView.posts.downloadFile")}
                                                                                            </a>
                                                                                        )}
                                                                                    </div>
                                                                                ) : null}
                                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                                    {reactionChoices.map((emoji) => {
                                                                                        const reactions = reply.reactions || [];
                                                                                        const count = reactions.filter((r: any) => r.emoji === emoji).length;
                                                                                        const active = currentUserId ? reactions.some((r: any) => r.emoji === emoji && r.user_id === currentUserId) : false;
                                                                                        return (
                                                                                            <button
                                                                                                key={`${reply.id}-${emoji}`}
                                                                                                type="button"
                                                                                                onClick={() => void handleToggleReaction({ replyId: reply.id, emoji })}
                                                                                                className={`px-2 py-1 rounded-full border text-xs ${active ? "bg-primary/10 border-primary" : "bg-background"}`}
                                                                                            >
                                                                                                {emoji} {count > 0 ? count : ""}
                                                                                            </button>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                                : null}
                                                            <div className="space-y-2 rounded-xl bg-muted/20 p-3 border">
                                                                <Textarea
                                                                    value={replyDrafts[discussion.id] || ""}
                                                                    onChange={(e) =>
                                                                        setReplyDrafts((prev) => ({
                                                                            ...prev,
                                                                            [discussion.id]: e.target.value,
                                                                        }))
                                                                    }
                                                                    rows={2}
                                                                    placeholder={t("topicView.posts.replyPlaceholder")}
                                                                    disabled={!canParticipateInDiscussions}
                                                                    className="bg-background"
                                                                />
                                                                <div className="flex flex-wrap gap-1">
                                                                    {stickerChoices.map((sticker) => (
                                                                        <button
                                                                            key={`${discussion.id}-${sticker}`}
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setReplyStickers((prev) => ({ ...prev, [discussion.id]: sticker }))
                                                                            }
                                                                            className={`h-7 w-7 rounded-full border text-sm ${replyStickers[discussion.id] === sticker ? "bg-primary/10 border-primary" : "bg-background"}`}
                                                                        >
                                                                            {sticker}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                {replyStickers[discussion.id] ? (
                                                                    <div className="text-xl">{replyStickers[discussion.id]}</div>
                                                                ) : null}
                                                                {replyAttachments[discussion.id] ? (
                                                                    <div className="rounded-lg border bg-background p-2 text-xs flex items-center justify-between gap-2">
                                                                        <span className="truncate">{replyAttachments[discussion.id]?.name}</span>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() =>
                                                                                setReplyAttachments((prev) => ({ ...prev, [discussion.id]: null }))
                                                                            }
                                                                        >
                                                                            {t("topicView.posts.delete")}
                                                                        </Button>
                                                                    </div>
                                                                ) : null}
                                                                <input
                                                                    ref={(el) => {
                                                                        replyAttachmentInputRefs.current[discussion.id] = el;
                                                                    }}
                                                                    type="file"
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        void handleSelectReplyAttachment(discussion.id, e.target.files?.[0] || null);
                                                                        e.currentTarget.value = "";
                                                                    }}
                                                                />
                                                                <div className="flex justify-end">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => replyAttachmentInputRefs.current[discussion.id]?.click()}
                                                                    >
                                                                        <Paperclip className="w-4 h-4 ml-1" />
                                                                        {t("topicView.compose.file")}
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleAddReply(discussion.id)}
                                                                        disabled={
                                                                            !canParticipateInDiscussions ||
                                                                            createReplyMutation.isPending ||
                                                                            (!(replyDrafts[discussion.id] || "").trim() &&
                                                                                !replyStickers[discussion.id] &&
                                                                                !replyAttachments[discussion.id])
                                                                        }
                                                                    >
                                                                        {t("topicView.posts.addReply")}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                ))}
                                                </Accordion>
                                            )}
                                        </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </Card>
                            </motion.div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default TopicView;
