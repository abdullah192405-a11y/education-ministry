export const WAHJ_READING_REPORT_LOGO_PATH = "/brand/wahj-logo.png";
export const WAHJ_READING_REPORT_OG_IMAGE_PATH = "/brand/wahj-report-9-final.png";
export const WAHJ_READING_REPORT_SITE_NAME = "قراء وهج";

export type WahjReadingReportSocialMeta = {
    title: string;
    description: string;
    url: string;
    imageUrl: string;
    siteName: string;
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
    const origin = options.origin.replace(/\/$/, "");

    return {
        title,
        description,
        url: `${origin}${path}`,
        imageUrl: `${origin}${WAHJ_READING_REPORT_OG_IMAGE_PATH}`,
        siteName: WAHJ_READING_REPORT_SITE_NAME,
    };
}

function replaceMetaTag(
    html: string,
    matcher: RegExp,
    replacement: string,
): string {
    return matcher.test(html) ? html.replace(matcher, replacement) : html;
}

function upsertNamedMeta(html: string, name: string, content: string): string {
    const matcher = new RegExp(`<meta name="${name}"[\\s\\S]*?>`, "i");
    const tag = `<meta name="${name}" content="${content}" />`;

    if (matcher.test(html)) {
        return html.replace(matcher, tag);
    }

    return html.replace(/<meta charset="UTF-8"\s*\/?>/i, `$&\n  ${tag}`);
}

function upsertPropertyMeta(html: string, property: string, content: string): string {
    const matcher = new RegExp(`<meta property="${property}"[\\s\\S]*?>`, "i");
    const tag = `<meta property="${property}" content="${content}" />`;

    if (matcher.test(html)) {
        return html.replace(matcher, tag);
    }

    return html.replace(/<meta property="og:type"[\s\S]*?>/i, `$&\n  ${tag}`);
}

export function injectWahjReadingReportSocialMeta(
    html: string,
    meta: WahjReadingReportSocialMeta,
): string {
    const title = escapeHtml(meta.title);
    const description = escapeAttr(meta.description);
    const image = escapeAttr(meta.imageUrl);
    const url = escapeAttr(meta.url);
    const siteName = escapeAttr(meta.siteName);
    const imageAlt = escapeAttr(WAHJ_READING_REPORT_SITE_NAME);

    let out = html
        .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
        .replace(/<link rel="icon"[\s\S]*?>/i, `<link rel="icon" type="image/png" href="${WAHJ_READING_REPORT_LOGO_PATH}" />`);

    out = upsertNamedMeta(out, "description", description);
    out = upsertNamedMeta(out, "author", WAHJ_READING_REPORT_SITE_NAME);
    out = upsertPropertyMeta(out, "og:title", title);
    out = upsertPropertyMeta(out, "og:description", description);
    out = upsertPropertyMeta(out, "og:image", image);
    out = upsertPropertyMeta(out, "og:url", url);
    out = upsertPropertyMeta(out, "og:site_name", siteName);
    out = upsertPropertyMeta(out, "og:image:alt", imageAlt);
    out = upsertNamedMeta(out, "twitter:title", title);
    out = upsertNamedMeta(out, "twitter:description", description);
    out = upsertNamedMeta(out, "twitter:image", image);
    out = upsertNamedMeta(out, "twitter:image:alt", imageAlt);

    out = replaceMetaTag(
        out,
        /<meta name="twitter:card"[\s\S]*?>/i,
        `<meta name="twitter:card" content="summary_large_image" />`,
    );

    return out;
}

function upsertDocumentMetaTag(
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
    const previousAuthor =
        document.head.querySelector('meta[name="author"]')?.getAttribute("content") ?? null;
    const previousFavicon =
        document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')?.getAttribute("href") ?? null;

    document.title = meta.title;
    upsertDocumentMetaTag("name", "description", meta.description);
    upsertDocumentMetaTag("name", "author", meta.siteName);
    upsertDocumentMetaTag("property", "og:title", meta.title);
    upsertDocumentMetaTag("property", "og:description", meta.description);
    upsertDocumentMetaTag("property", "og:image", meta.imageUrl);
    upsertDocumentMetaTag("property", "og:url", meta.url);
    upsertDocumentMetaTag("property", "og:site_name", meta.siteName);
    upsertDocumentMetaTag("property", "og:image:alt", meta.siteName);
    upsertDocumentMetaTag("property", "og:type", "website");
    upsertDocumentMetaTag("name", "twitter:card", "summary_large_image");
    upsertDocumentMetaTag("name", "twitter:title", meta.title);
    upsertDocumentMetaTag("name", "twitter:description", meta.description);
    upsertDocumentMetaTag("name", "twitter:image", meta.imageUrl);
    upsertDocumentMetaTag("name", "twitter:image:alt", meta.siteName);

    const favicon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
        favicon.href = WAHJ_READING_REPORT_LOGO_PATH;
    }

    return () => {
        document.title = previousTitle;
        if (previousDescription != null) {
            upsertDocumentMetaTag("name", "description", previousDescription);
        }
        if (previousAuthor != null) {
            upsertDocumentMetaTag("name", "author", previousAuthor);
        }
        if (favicon && previousFavicon != null) {
            favicon.href = previousFavicon;
        }
    };
}
