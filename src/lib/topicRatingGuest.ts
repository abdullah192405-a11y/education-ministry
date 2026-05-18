const STORAGE_KEY = "edu_topic_rating_guest_id";

/** Stable anonymous id so guests can rate once per topic without signing in. */
export function getOrCreateTopicRatingGuestId(): string {
    if (typeof window === "undefined") {
        return "ssr-guest";
    }

    try {
        const existing = localStorage.getItem(STORAGE_KEY)?.trim();
        if (existing && existing.length >= 8) {
            return existing;
        }

        const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

        localStorage.setItem(STORAGE_KEY, id);
        return id;
    } catch {
        return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }
}

export function buildTopicRatingRaterKey(opts: {
    userId?: string | null;
    guestId?: string | null;
}): string {
    const userId = opts.userId?.trim();
    const guestId = opts.guestId?.trim();
    if (userId) return `user:${userId}`;
    if (guestId) return `guest:${guestId}`;
    throw new Error("userId or guestId required for topic rating");
}

export function findMyTopicRating(
    ratings: Array<{ user_id?: string | null; guest_id?: string | null; rating?: number }>,
    opts: { userId?: string | null; guestId?: string | null }
): number {
    const match = ratings.find((r) => {
        if (opts.userId && r.user_id === opts.userId) return true;
        if (opts.guestId && r.guest_id === opts.guestId) return true;
        return false;
    });
    return Number(match?.rating || 0);
}
