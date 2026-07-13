import type { IncomingMessage, ServerResponse } from "node:http";
import { handleWahjReadingReportPageRequest } from "../server/wahjReadingReportPageHandler";

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
        const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
        const token = requestUrl.searchParams.get("token") || undefined;

        if (token) {
            req.url = `/wahj/reading-report/${token}`;
        }

        await handleWahjReadingReportPageRequest(req, res, {
            indexHtmlPath: `${process.cwd()}/dist/index.html`,
        });
    } catch (error) {
        console.error("wahj-reading-report-page handler failed:", error);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end(error instanceof Error ? error.message : "تعذر تحميل تقرير قراء وهج.");
        }
    }
}
