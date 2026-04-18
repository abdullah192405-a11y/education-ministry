/**
 * Maps topic_media rows between Supabase (UPPERCASE enums, snake_case) and the app (lowercase types, mixed case fields).
 * Optional legacy: audio/link stored as type TEXT with JSON in `content` when the DB enum did not include AUDIO/LINK.
 */

const MEDIA_TYPE_MAP: Record<string, string> = {
    video: "VIDEO",
    image: "IMAGE",
    text: "TEXT",
    pdf: "PDF",
    audio: "AUDIO",
    link: "LINK",
};

export type EncodedTopicMediaRow = {
    type: string;
    url: string | null;
    content: string | null;
    caption: string | null;
    file_name: string | null;
    pdf_base64: string | null;
};

function normalizeDbType(t: unknown): string {
    return String(t ?? "TEXT").toUpperCase();
}

/** Raw media rows from a topic record (Supabase join or legacy keys). */
export function getMediaItemsFromTopicRow(row: Record<string, unknown> | null | undefined): unknown[] {
    if (!row) return [];
    const raw = row.mediaItems ?? row.media_items;
    return Array.isArray(raw) ? raw : [];
}

function parseLegacyTextContent(content: string): {
    kind: string;
    url: string | null;
    innerContent: string | null;
    caption: string | null;
    file_name: string | null;
} | null {
    const trimmed = content.trim();
    if (!trimmed.startsWith("{")) return null;
    try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;

        let kind: string | null = null;
        if (parsed?.__topicMedia === 1 && typeof parsed.kind === "string") {
            kind = String(parsed.kind).toLowerCase();
        } else if (typeof parsed._topicMediaV1 === "string") {
            kind = String(parsed._topicMediaV1).toLowerCase();
        }
        if (!kind) return null;

        return {
            kind,
            url: typeof parsed.url === "string" ? parsed.url : null,
            innerContent:
                typeof parsed.textContent === "string"
                    ? parsed.textContent
                    : typeof parsed.htmlContent === "string"
                      ? parsed.htmlContent
                      : null,
            caption: typeof parsed.caption === "string" ? parsed.caption : null,
            file_name:
                typeof parsed.file_name === "string"
                    ? parsed.file_name
                    : typeof parsed.fileName === "string"
                      ? parsed.fileName
                      : null,
        };
    } catch {
        return null;
    }
}

/** Normalize DB rows for UI: lowercase type, camelCase aliases, decode legacy TEXT+json audio/link. */
export function mapTopicMediaItems(items: unknown[]): Record<string, unknown>[] {
    return items.map((item) => {
        const row = item as Record<string, unknown>;
        let type = normalizeDbType(row.type);
        let url = (row.url as string | null | undefined) ?? null;
        let content = (row.content as string | null | undefined) ?? null;
        let caption = (row.caption as string | null | undefined) ?? null;
        let file_name =
            (row.file_name as string | null | undefined) ?? (row.fileName as string | null | undefined) ?? null;
        const pdf_base64 =
            (row.pdf_base64 as string | null | undefined) ??
            (row.pdfBase64 as string | null | undefined) ??
            null;

        if (type === "TEXT" && typeof content === "string") {
            const legacy = parseLegacyTextContent(content);
            if (legacy && (legacy.kind === "audio" || legacy.kind === "link")) {
                type = legacy.kind.toUpperCase();
                url = legacy.url ?? url;
                content = legacy.innerContent;
                caption = legacy.caption ?? caption;
                file_name = legacy.file_name ?? file_name;
            }
        }

        const lowerType = type.toLowerCase();

        return {
            ...row,
            type: lowerType,
            url,
            content,
            caption,
            file_name,
            fileName: file_name,
            pdf_base64,
            pdfBase64: pdf_base64,
        };
    });
}

/**
 * Build a topic_media insert row from editor state (ContentMedia / loose objects).
 */
export function encodeTopicMediaForInsert(m: Record<string, unknown>): EncodedTopicMediaRow {
    const raw = String(m.type ?? "text").toLowerCase();
    const type = MEDIA_TYPE_MAP[raw] ?? "TEXT";

    const url = (m.url as string | undefined) ?? null;
    const caption = (m.caption as string | undefined) ?? null;
    const file_name = (m.file_name as string | undefined) ?? (m.fileName as string | undefined) ?? null;
    const pdf_base64 = (m.pdf_base64 as string | undefined) ?? (m.pdfBase64 as string | undefined) ?? null;
    const content = (m.content as string | undefined) ?? null;

    return {
        type,
        url,
        content,
        caption,
        file_name,
        pdf_base64,
    };
}
