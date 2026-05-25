export type LiveProvider = "GOOGLE_MEET" | "ZOOM" | "MICROSOFT_TEAMS" | "CUSTOM";
export type LiveSessionStatus = "live" | "upcoming" | "ended";

export interface TopicLiveSessionRow {
    id: string;
    topic_id?: string | null;
    teacher_id?: string | null;
    provider?: LiveProvider | string | null;
    meeting_url?: string | null;
    title?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    notes?: string | null;
    is_active?: boolean | null;
}

export const LIVE_PROVIDER_I18N_KEYS: Record<Exclude<LiveProvider, "CUSTOM">, string> = {
    GOOGLE_MEET: "dash.teacher.live.provider.googleMeet",
    ZOOM: "dash.teacher.live.provider.zoom",
    MICROSOFT_TEAMS: "dash.teacher.live.provider.teams",
};

export const getLiveProviderLabel = (
    provider: string | null | undefined,
    t: (key: string) => string,
    options?: { customLabel?: string }
) => {
    const key = LIVE_PROVIDER_I18N_KEYS[provider as Exclude<LiveProvider, "CUSTOM">];
    if (key) return t(key);
    if (provider === "CUSTOM") {
        return options?.customLabel || t("dash.teacher.live.otherLink");
    }
    return options?.customLabel || t("topicView.live.directLink");
};

export const LIVE_PROVIDER_PLACEHOLDERS: Record<LiveProvider, string> = {
    GOOGLE_MEET: "https://meet.google.com/abc-defg-hij",
    ZOOM: "https://zoom.us/j/123456789",
    MICROSOFT_TEAMS: "https://teams.microsoft.com/l/meetup-join/...",
    CUSTOM: "https://example.com/live-class",
};

export const toDatetimeLocal = (date: Date) => {
    const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return shifted.toISOString().slice(0, 16);
};

export const nowIso = () => new Date().toISOString();

const toMillis = (value?: string | null) => {
    const t = new Date(value || "").getTime();
    return Number.isFinite(t) ? t : 0;
};

export const isValidMeetingUrl = (value: string, provider: LiveProvider) => {
    try {
        const url = new URL(value.trim());
        if (url.protocol !== "https:") return false;
        const host = url.hostname.toLowerCase();
        if (provider === "GOOGLE_MEET") return host === "meet.google.com" || host.endsWith(".meet.google.com");
        if (provider === "ZOOM") return host.endsWith("zoom.us") || host.endsWith("zoom.com");
        if (provider === "MICROSOFT_TEAMS") {
            return (
                host === "teams.microsoft.com" ||
                host.endsWith(".teams.microsoft.com") ||
                host === "teams.live.com" ||
                host.endsWith(".teams.live.com")
            );
        }
        return true;
    } catch {
        return false;
    }
};

export const getLiveSessionStatus = (session: TopicLiveSessionRow): LiveSessionStatus => {
    const now = Date.now();
    const start = toMillis(session.starts_at);
    const end = toMillis(session.ends_at);
    if (session.is_active && start <= now && now <= end) return "live";
    if (session.is_active && start > now) return "upcoming";
    return "ended";
};

export const buildLessonPageUrl = (path: string) => {
    if (!path) return "";
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}${path}`;
};

export interface PendingLiveSessionDraft {
    provider: LiveProvider;
    meetingUrl: string;
    title: string;
    notes: string;
    startsAt: string;
    endsAt: string;
}

export const createDefaultLiveSessionDraft = (): PendingLiveSessionDraft => ({
    provider: "GOOGLE_MEET",
    meetingUrl: "",
    title: "",
    notes: "",
    startsAt: toDatetimeLocal(new Date()),
    endsAt: toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
});

export const hasLiveSessionDraft = (draft: PendingLiveSessionDraft | null | undefined) =>
    Boolean(draft?.meetingUrl?.trim());

export type LiveSessionDraftValidationKey =
    | "missingUrl"
    | "invalidMeet"
    | "invalidZoom"
    | "invalidTeams"
    | "invalidHttps"
    | "invalidTime";

export const validateLiveSessionDraft = (
    draft: PendingLiveSessionDraft
): LiveSessionDraftValidationKey | null => {
    if (!hasLiveSessionDraft(draft)) return null;

    if (!draft.meetingUrl.trim()) return "missingUrl";
    if (!isValidMeetingUrl(draft.meetingUrl, draft.provider)) {
        if (draft.provider === "GOOGLE_MEET") return "invalidMeet";
        if (draft.provider === "ZOOM") return "invalidZoom";
        if (draft.provider === "MICROSOFT_TEAMS") return "invalidTeams";
        return "invalidHttps";
    }

    const start = new Date(draft.startsAt);
    const end = new Date(draft.endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return "invalidTime";
    }

    return null;
};

export const sessionRowToDraft = (session: TopicLiveSessionRow): PendingLiveSessionDraft => {
    const start = new Date(session.starts_at || "");
    const end = new Date(session.ends_at || "");
    return {
        provider: (session.provider as LiveProvider) || "GOOGLE_MEET",
        meetingUrl: session.meeting_url || "",
        title: session.title || "",
        notes: session.notes || "",
        startsAt: Number.isNaN(start.getTime()) ? toDatetimeLocal(new Date()) : toDatetimeLocal(start),
        endsAt: Number.isNaN(end.getTime())
            ? toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000))
            : toDatetimeLocal(end),
    };
};

export const liveSessionDraftToPayload = (
    draft: PendingLiveSessionDraft,
    defaultTitle: string | null
) => {
    const start = new Date(draft.startsAt);
    const end = new Date(draft.endsAt);
    const sessionTitle = draft.title.trim() || defaultTitle;

    return {
        provider: draft.provider,
        meetingUrl: draft.meetingUrl.trim(),
        title: sessionTitle,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        notes: draft.notes.trim() || null,
    };
};
