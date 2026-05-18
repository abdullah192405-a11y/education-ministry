import type { ChallengeReportCsvOptions } from "./challengeReportDownload";
import { buildChallengeReportHtml, getChallengeReportAssetBaseUrl } from "./challengeReportPdfHtml";
import {
  buildFallbackRecommendationReport,
  generateChallengeRecommendationReport,
} from "./challengeReportRecommendations";

const REPORT_ENDPOINT = "/api/challenge-report-pdf";
const MIN_PDF_BYTES = 1500;

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
  const html = buildChallengeReportHtml(enriched, getChallengeReportAssetBaseUrl());
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  const printWindow = window.open(blobUrl, "_blank", "noopener,noreferrer,width=1240,height=1754");
  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    throw new Error("تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.");
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("انتهت مهلة تحميل التقرير للطباعة.")), 20_000);
    const finish = () => {
      window.clearTimeout(timeout);
      resolve();
    };

    printWindow.addEventListener("load", finish, { once: true });
    printWindow.setTimeout(finish, 3000);
  });

  try {
    await printWindow.document.fonts?.ready;
  } catch {
    // ignore font readiness errors in print fallback
  }

  await new Promise<void>((resolve) => {
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      resolve();
    }, 500);
  });

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
    printWindow.close();
  }, 1500);
}

function isPdfBlob(blob: Blob): boolean {
  return blob.type.includes("pdf") || blob.type === "application/octet-stream";
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
    if (!isPdfBlob(blob) || blob.size < MIN_PDF_BYTES) {
      throw new Error("ملف PDF غير صالح أو فارغ.");
    }

    downloadBlob(blob, buildReportFileName());
  } catch (serverError) {
    console.warn("Server PDF failed, falling back to browser print:", serverError);
    await downloadChallengeReportPdfInBrowser(opts);
  }
}
