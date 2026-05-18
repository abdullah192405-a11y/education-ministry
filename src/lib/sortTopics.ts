/** Sort topics by sort_order, then created_at for stable ordering when ties exist. */
export function sortTopicsByOrder<
    T extends {
        sort_order?: number | null;
        sortOrder?: number | null;
        created_at?: string | null;
        createdAt?: string | null;
    },
>(topics: T[]): T[] {
    return [...topics].sort((a, b) => {
        const orderA = a.sort_order ?? a.sortOrder ?? 0;
        const orderB = b.sort_order ?? b.sortOrder ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
        const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
        return dateA - dateB;
    });
}

export function getTopicSortOrder(topic: { sort_order?: number | null; sortOrder?: number | null }): number {
    return topic.sort_order ?? topic.sortOrder ?? 0;
}
