import type { ChallengeReportCsvOptions } from "./challengeReportDownload";
import { buildChallengeReportHtml } from "./challengeReportPdfHtml";
import {
  buildFallbackRecommendationReport,
  generateChallengeRecommendationReport,
} from "./challengeReportRecommendations";

const REPORT_ENDPOINT = "/api/challenge-report-pdf";

function buildReportFileName(): string {
  const day = new Date().toISOString().slice(0, 10);
  return `challenge-report-${day}-${Date.now()}.pdf`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function enrichReportPayload(opts: ChallengeReportCsvOptions): Promise<ChallengeReportCsvOptions> {
  if (opts.recommendationReport) return opts;

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    return {
      ...opts,
      recommendationReport: buildFallbackRecommendationReport(opts),
    };
  }

  try {
    const recommendationReport = await generateChallengeRecommendationReport(apiKey, opts);
    return { ...opts, recommendationReport };
  } catch {
    return {
      ...opts,
      recommendationReport: buildFallbackRecommendationReport(opts),
    };
  }
}

async function downloadChallengeReportPdfInBrowser(opts: ChallengeReportCsvOptions): Promise<void> {
  const enriched = await enrichReportPayload(opts);
  const html = buildChallengeReportHtml(enriched);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "challenge-report-print");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error("تعذر فتح نافذة الطباعة لإنشاء ملف PDF.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    iframe.addEventListener("load", done, { once: true });
    win.setTimeout(done, 2500);
  });

  await doc.fonts?.ready?.catch(() => undefined);

  await new Promise<void>((resolve) => {
    win.setTimeout(() => {
      win.focus();
      win.print();
      resolve();
    }, 300);
  });

  win.setTimeout(() => iframe.remove(), 1500);
}

export async function downloadChallengeReportPdf(opts: ChallengeReportCsvOptions): Promise<void> {
  try {
    const response = await fetch(REPORT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(opts),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(message || "تعذر إنشاء ملف PDF للتقرير.");
    }

    const blob = await response.blob();
    downloadBlob(blob, buildReportFileName());
  } catch (serverError) {
    console.warn("Server PDF failed, falling back to browser print:", serverError);
    await downloadChallengeReportPdfInBrowser(opts);
  }
}
