export const WAHJ_READING_REPORT_LOGO_PATH = "/brand/wahj-logo.png";

export type WahjReadingReportSocialMeta = {
    title: string;
    description: string;
    url: string;
    imageUrl: string;
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
    return escapeHtml(value);
}

export function buildWahjReadingReportSocialMeta(options: {
    origin: string;
    token?: string;
    participantName?: string;
}): WahjReadingReportSocialMeta {
    const title = options.participantName
        ? `تقرير قراء وهج — ${options.participantName}`
        : "تقرير قراء وهج";
    const description = "شاهد ملخص الرحلة في برنامج قراء وهج";
    const path = options.token ? `/wahj/reading-report/${options.token}` : "/wahj/reading-report";

    return {
        title,
        description,
        url: `${options.origin.replace(/\/$/, "")}${path}`,
        imageUrl: `${options.origin.replace(/\/$/, "")}${WAHJ_READING_REPORT_LOGO_PATH}`,
    };
}

export function injectWahjReadingReportSocialMeta(
    html: string,
    meta: WahjReadingReportSocialMeta,
): string {
    const title = escapeHtml(meta.title);
    const description = escapeAttr(meta.description);
    const image = escapeAttr(meta.imageUrl);
    const url = escapeAttr(meta.url);

    let out = html
        .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
        .replace(
            /<meta name="description"[^>]*>/,
            `<meta name="description" content="${description}" />`,
        )
        .replace(/<meta name="author"[^>]*>/, `<meta name="author" content="قراء وهج" />`)
        .replace(
            /<meta property="og:title"[^>]*>/,
            `<meta property="og:title" content="${title}" />`,
        )
        .replace(
            /<meta property="og:description"[^>]*>/,
            `<meta property="og:description" content="${description}" />`,
        )
        .replace(
            /<meta property="og:image"[^>]*>/,
            `<meta property="og:image" content="${image}" />`,
        )
        .replace(
            /<meta name="twitter:title"[^>]*>/,
            `<meta name="twitter:title" content="${title}" />`,
        )
        .replace(
            /<meta name="twitter:image"[^>]*>/,
            `<meta name="twitter:image" content="${image}" />`,
        )
        .replace(
            /<link rel="icon"[^>]*>/,
            `<link rel="icon" type="image/png" href="${WAHJ_READING_REPORT_LOGO_PATH}" />`,
        );

    if (out.includes('property="og:url"')) {
        out = out.replace(
            /<meta property="og:url"[^>]*>/,
            `<meta property="og:url" content="${url}" />`,
        );
    } else {
        out = out.replace(
            /<meta property="og:type"[^>]*>/,
            `$&\n  <meta property="og:url" content="${url}" />`,
        );
    }

    if (!out.includes('name="twitter:description"')) {
        out = out.replace(
            /<meta name="twitter:image"[^>]*>/,
            `$&\n  <meta name="twitter:description" content="${description}" />`,
        );
    } else {
        out = out.replace(
            /<meta name="twitter:description"[^>]*>/,
            `<meta name="twitter:description" content="${description}" />`,
        );
    }

    return out;
}

function upsertMetaTag(
    attribute: "name" | "property",
    key: string,
    content: string,
): void {
    const selector = `meta[${attribute}="${key}"]`;
    let element = document.head.querySelector(selector);

    if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
    }

    element.setAttribute("content", content);
}

export function applyWahjReadingReportSocialMeta(meta: WahjReadingReportSocialMeta): () => void {
    const previousTitle = document.title;
    const previousDescription =
        document.head.querySelector('meta[name="description"]')?.getAttribute("content") ?? null;
    const previousFavicon =
        document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')?.getAttribute("href") ?? null;

    document.title = meta.title;
    upsertMetaTag("name", "description", meta.description);
    upsertMetaTag("property", "og:title", meta.title);
    upsertMetaTag("property", "og:description", meta.description);
    upsertMetaTag("property", "og:image", meta.imageUrl);
    upsertMetaTag("property", "og:url", meta.url);
    upsertMetaTag("property", "og:type", "website");
    upsertMetaTag("name", "twitter:card", "summary_large_image");
    upsertMetaTag("name", "twitter:title", meta.title);
    upsertMetaTag("name", "twitter:description", meta.description);
    upsertMetaTag("name", "twitter:image", meta.imageUrl);

    const favicon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
        favicon.href = WAHJ_READING_REPORT_LOGO_PATH;
    }

    return () => {
        document.title = previousTitle;
        if (previousDescription != null) {
            upsertMetaTag("name", "description", previousDescription);
        }
        if (favicon && previousFavicon != null) {
            favicon.href = previousFavicon;
        }
    };
}
