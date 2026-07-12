import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleWahjReadingReportPageRequest } from "../server/wahjReadingReportPageHandler";

type NetlifyEvent = {
    httpMethod: string;
    headers: Record<string, string | undefined>;
    path: string;
    rawUrl?: string;
    queryStringParameters?: Record<string, string | undefined> | null;
};

type NetlifyResult = {
    statusCode: number;
    headers?: Record<string, string>;
    body: string;
};

function normalizeHeaders(headers: Record<string, string | undefined>): IncomingMessage["headers"] {
    const out: IncomingMessage["headers"] = {};
    for (const [key, value] of Object.entries(headers)) {
        if (value != null) out[key.toLowerCase()] = value;
    }
    return out;
}

function createRequest(event: NetlifyEvent): IncomingMessage {
    const token = event.queryStringParameters?.token;
    const pathname = token ? `/wahj/reading-report/${token}` : event.path;
    const stream = Readable.from(Buffer.alloc(0)) as IncomingMessage;
    stream.method = event.httpMethod;
    stream.headers = normalizeHeaders(event.headers);
    stream.url = pathname;
    return stream;
}

function createResponse(): {
    res: ServerResponse;
    completion: Promise<NetlifyResult>;
} {
    let statusCode = 200;
    const headers: Record<string, string> = {};
    const chunks: Buffer[] = [];

    const res = {
        statusCode: 200,
        headersSent: false,
        setHeader(name: string, value: string | number | readonly string[]) {
            headers[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
        },
        getHeader(name: string) {
            return headers[name.toLowerCase()];
        },
        end(chunk?: string | Buffer) {
            if (chunk != null) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            res.headersSent = true;
            finish();
        },
    } as ServerResponse & { headersSent: boolean };

    let resolveCompletion!: (value: NetlifyResult) => void;
    const completion = new Promise<NetlifyResult>((resolve) => {
        resolveCompletion = resolve;
    });

    function finish() {
        resolveCompletion({
            statusCode,
            headers,
            body: Buffer.concat(chunks).toString("utf8"),
        });
    }

    Object.defineProperty(res, "statusCode", {
        get() {
            return statusCode;
        },
        set(value: number) {
            statusCode = value;
        },
    });

    return { res, completion };
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResult> {
    const req = createRequest(event);
    const { res, completion } = createResponse();

    try {
        await handleWahjReadingReportPageRequest(req, res, {
            indexHtmlPath: `${process.cwd()}/dist/index.html`,
        });
    } catch (error) {
        console.error("wahj-reading-report-page Netlify handler failed:", error);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end(error instanceof Error ? error.message : "تعذر تحميل تقرير قراء وهج.");
        }
    }

    return completion;
}
