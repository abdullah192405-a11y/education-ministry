import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Browser } from "puppeteer-core";
import type { IncomingMessage, ServerResponse } from "node:http";
import { buildChallengeReportHtml } from "../../src/lib/challengeReportPdfHtml";
import {
  buildFallbackRecommendationReport,
  generateChallengeRecommendationReport,
} from "../../src/lib/challengeReportRecommendations";

const MAX_REPORT_BODY_BYTES = 10 * 1024 * 1024;
const LOCAL_PUPPETEER_CACHE = path.resolve(process.cwd(), ".cache/puppeteer");
const CHROME_EXECUTABLE_NAMES = new Set([
  "Google Chrome for Testing",
  "Google Chrome",
  "Chromium",
  "chrome",
  "chromium",
  "chrome.exe",
]);

function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV
  );
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > MAX_REPORT_BODY_BYTES) {
      throw new Error("حجم بيانات التقرير أكبر من الحد المسموح.");
    }
    chunks.push(buffer);
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : {};
}

function findChromeExecutableInDirectory(directory: string, depth = 0): string | undefined {
  if (depth > 8 || !existsSync(directory)) return undefined;

  try {
    const entries = readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isFile() && CHROME_EXECUTABLE_NAMES.has(entry.name)) {
        return fullPath;
      }
      if (entry.isDirectory()) {
        const found = findChromeExecutableInDirectory(fullPath, depth + 1);
        if (found) return found;
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function resolveLocalChromeExecutablePath(puppeteerExecutablePath?: string): string | undefined {
  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (configuredPath && existsSync(configuredPath)) return configuredPath;

  if (puppeteerExecutablePath && existsSync(puppeteerExecutablePath)) {
    return puppeteerExecutablePath;
  }

  const systemCandidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];
  const systemPath = systemCandidates.find((candidate) => existsSync(candidate));
  if (systemPath) return systemPath;

  return findChromeExecutableInDirectory(LOCAL_PUPPETEER_CACHE);
}

async function launchReportBrowser(): Promise<Browser> {
  if (isServerlessRuntime()) {
    const [chromium, puppeteer] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);

    chromium.default.setGraphicsMode = false;

    const viewport = {
      width: 1240,
      height: 1754,
      deviceScaleFactor: 1,
    };

    return puppeteer.default.launch({
      args: puppeteer.default.defaultArgs({ args: chromium.default.args, headless: "shell" }),
      defaultViewport: viewport,
      executablePath: await chromium.default.executablePath(),
      headless: "shell",
    });
  }

  const puppeteer = await import("puppeteer");
  const executablePath = resolveLocalChromeExecutablePath(puppeteer.default.executablePath());

  return puppeteer.default.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
}

async function renderChallengeReportPdf(payload: unknown): Promise<Uint8Array> {
  const browser = await launchReportBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
    await page.setContent(buildChallengeReportHtml(payload as any), {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    await page
      .evaluate(() => document.fonts.ready)
      .catch(() => undefined);

    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function enrichReportWithAiRecommendations(
  payload: unknown,
  geminiApiKey?: string
): Promise<unknown> {
  if (!isPlainObject(payload) || payload.recommendationReport) {
    return payload;
  }

  if (!geminiApiKey) {
    return {
      ...payload,
      recommendationReport: buildFallbackRecommendationReport(payload as any),
    };
  }

  try {
    const recommendationReport = await generateChallengeRecommendationReport(geminiApiKey, payload as any);
    return {
      ...payload,
      recommendationReport,
    };
  } catch (error) {
    console.warn(
      "Gemini recommendation report generation failed; using fallback recommendations.",
      error instanceof Error ? error.message : String(error)
    );
    return {
      ...payload,
      recommendationReport: buildFallbackRecommendationReport(payload as any),
    };
  }
}

export async function handleChallengeReportPdfRequest(
  req: IncomingMessage,
  res: ServerResponse,
  geminiApiKey?: string
): Promise<void> {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Method Not Allowed");
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const enrichedPayload = await enrichReportWithAiRecommendations(payload, geminiApiKey);
    const pdf = await renderChallengeReportPdf(enrichedPayload);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="challenge-report.pdf"');
    res.end(Buffer.from(pdf));
  } catch (error) {
    console.error("Failed to render challenge report PDF:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(error instanceof Error ? error.message : "تعذر إنشاء ملف PDF للتقرير.");
  }
}
