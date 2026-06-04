import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleChallengeReportPdfRequest } from "../server/challengeReportPdfHandler";

type NetlifyEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
};

type NetlifyResult = {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
};

function normalizeHeaders(headers: Record<string, string | undefined>): IncomingMessage["headers"] {
  const out: IncomingMessage["headers"] = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value != null) out[key.toLowerCase()] = value;
  }
  return out;
}

function createRequest(event: NetlifyEvent): IncomingMessage {
  const rawBody =
    event.body == null
      ? Buffer.alloc(0)
      : event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : Buffer.from(event.body, "utf8");

  const stream = Readable.from(rawBody) as IncomingMessage;
  stream.method = event.httpMethod;
  stream.headers = normalizeHeaders(event.headers);
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
    const bodyBuffer = Buffer.concat(chunks);
    const contentType = headers["content-type"] ?? "text/plain; charset=utf-8";
    const isBinary = contentType.includes("application/pdf");

    resolveCompletion({
      statusCode,
      headers,
      body: isBinary ? bodyBuffer.toString("base64") : bodyBuffer.toString("utf8"),
      isBase64Encoded: isBinary ? true : undefined,
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
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const req = createRequest(event);
  const { res, completion } = createResponse();

  try {
    await handleChallengeReportPdfRequest(req, res, geminiApiKey);
  } catch (error) {
    console.error("challenge-report-pdf Netlify handler failed:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(error instanceof Error ? error.message : "تعذر إنشاء ملف PDF للتقرير.");
    }
  }

  return completion;
}
