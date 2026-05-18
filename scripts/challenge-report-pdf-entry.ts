import type { IncomingMessage, ServerResponse } from "node:http";
import { handleChallengeReportPdfRequest } from "../server/challengeReportPdfHandler";

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const geminiApiKey =
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY;

    await handleChallengeReportPdfRequest(req, res, geminiApiKey);
  } catch (error) {
    console.error("challenge-report-pdf handler failed:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(error instanceof Error ? error.message : "تعذر إنشاء ملف PDF للتقرير.");
    }
  }
}
