import type { IncomingMessage, ServerResponse } from "node:http";
import { handleChallengeReportPdfRequest } from "./_lib/challengeReportPdfHandler";

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const geminiApiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  await handleChallengeReportPdfRequest(req, res, geminiApiKey);
}
