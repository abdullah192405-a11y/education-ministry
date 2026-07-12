import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
    buildWahjReadingReportSocialMeta,
    injectWahjReadingReportSocialMeta,
} from "../src/lib/wahjReadingReportSocialMeta";

function resolveIndexHtmlPath(customPath?: string): string {
    if (customPath && existsSync(customPath)) return customPath;

    const candidates = process.env.NODE_ENV === "production"
        ? [
            path.join(process.cwd(), "dist", "index.html"),
            path.join(process.cwd(), "index.html"),
        ]
        : [
            path.join(process.cwd(), "index.html"),
            path.join(process.cwd(), "dist", "index.html"),
        ];

    for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
    }

    throw new Error("Could not find index.html for Wahj reading report page.");
}

function resolveRequestOrigin(req: IncomingMessage): string {
    const host = req.headers.host;
    if (!host) return "http://localhost:8080";

    const forwardedProto = req.headers["x-forwarded-proto"];
    const protocol = Array.isArray(forwardedProto)
        ? forwardedProto[0]
        : forwardedProto?.split(",")[0]?.trim() || "http";

    return `${protocol}://${host}`;
}

function extractReportToken(pathname: string): string | undefined {
    const match = pathname.match(/^\/wahj\/reading-report\/([^/?#]+)/);
    return match?.[1];
}

export async function handleWahjReadingReportPageRequest(
    req: IncomingMessage,
    res: ServerResponse,
    options?: {
        indexHtmlPath?: string;
        participantName?: string;
    },
): Promise<void> {
    if (req.method && req.method !== "GET" && req.method !== "HEAD") {
        res.statusCode = 405;
        res.end("Method Not Allowed");
        return;
    }

    const requestUrl = new URL(req.url || "/", resolveRequestOrigin(req));
    const token = extractReportToken(requestUrl.pathname);
    const origin = resolveRequestOrigin(req);
    const meta = buildWahjReadingReportSocialMeta({
        origin,
        token,
        participantName: options?.participantName,
    });

    const indexHtml = readFileSync(resolveIndexHtmlPath(options?.indexHtmlPath), "utf8");
    const html = injectWahjReadingReportSocialMeta(indexHtml, meta);

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");

    if (req.method === "HEAD") {
        res.end();
        return;
    }

    res.end(html);
}
