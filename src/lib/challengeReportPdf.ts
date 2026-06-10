import type { ChallengeReportCsvOptions } from "./challengeReportDownload";
import { buildChallengeReportHtml } from "./challengeReportPdfHtml";
import {
  buildFallbackRecommendationReport,
  generateChallengeRecommendationReport,
} from "./challengeReportRecommendations";
import type { ReportLanguage } from "./challengeReportLabels";

const REPORT_ENDPOINT = "/api/challenge-report-pdf";
const MIN_PDF_BYTES = 1500;
const PRINT_WINDOW_FEATURES = "width=1240,height=1754";

export type ChallengeReportDownloadMethod = "server-pdf" | "browser-print" | "html-file";

export type ChallengeReportDownloadResult = {
  method: ChallengeReportDownloadMethod;
};

const PDF_ERRORS: Record<ReportLanguage, {
  popupBlocked: string;
  printTimeout: string;
  createFailed: string;
  invalidBlob: string;
}> = {
  ar: {
    popupBlocked: "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.",
    printTimeout: "انتهت مهلة تحميل التقرير للطباعة.",
    createFailed: "تعذر إنشاء ملف PDF للتقرير.",
    invalidBlob: "ملف PDF غير صالح أو فارغ.",
  },
  en: {
    popupBlocked: "Could not open the print window. Allow pop-ups and try again.",
    printTimeout: "The report timed out while loading for print.",
    createFailed: "Could not generate the report PDF.",
    invalidBlob: "The PDF file is invalid or empty.",
  },
};

function pdfErrors(language?: ReportLanguage) {
  return PDF_ERRORS[language === "en" ? "en" : "ar"];
}

function buildReportFileName(extension: "pdf" | "html"): string {
  const day = new Date().toISOString().slice(0, 10);
  return `challenge-report-${day}-${Date.now()}.${extension}`;
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

function loadingHtml(language?: ReportLanguage): string {
  const title = language === "en" ? "Generating report…" : "جاري إعداد التقرير…";
  return `<!DOCTYPE html><html lang="${language === "en" ? "en" : "ar"}"><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center">${title}</body></html>`;
}

/** Open synchronously on user click so the browser keeps the print window after async work. */
export function openChallengeReportPrintWindow(language?: ReportLanguage): Window | null {
  const printWindow = window.open("about:blank", "_blank", PRINT_WINDOW_FEATURES);
  if (!printWindow) return null;

  try {
    printWindow.document.open();
    printWindow.document.write(loadingHtml(language));
    printWindow.document.close();
  } catch {
    try {
      printWindow.close();
    } catch {
      // ignore
    }
    return null;
  }

  return printWindow;
}

export function closeChallengeReportPrintWindow(printWindow?: Window | null): void {
  if (!printWindow || printWindow.closed) return;
  try {
    printWindow.close();
  } catch {
    // ignore
  }
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

async function waitForPrintWindowReady(printWindow: Window, errors: ReturnType<typeof pdfErrors>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(errors.printTimeout)), 20_000);
    const finish = () => {
      window.clearTimeout(timeout);
      resolve();
    };

    try {
      if (printWindow.document.readyState === "complete") {
        finish();
        return;
      }
      printWindow.addEventListener("load", finish, { once: true });
    } catch {
      finish();
    }

    window.setTimeout(finish, 3000);
  });

  try {
    await printWindow.document.fonts?.ready;
  } catch {
    // ignore font readiness errors in print fallback
  }
}

async function printReportInWindow(printWindow: Window): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        // ignore print errors; user can still save from the open tab
      }
      resolve();
    }, 500);
  });
}

async function downloadChallengeReportPdfInBrowser(
  opts: ChallengeReportCsvOptions,
  printWindow?: Window | null
): Promise<ChallengeReportDownloadResult> {
  const enriched = await enrichReportPayload(opts);
  const html = buildChallengeReportHtml(enriched);
  const errors = pdfErrors(opts.language);

  if (printWindow && !printWindow.closed) {
    try {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      await waitForPrintWindowReady(printWindow, errors);
      await printReportInWindow(printWindow);
      return { method: "browser-print" };
    } catch (error) {
      console.warn("Pre-opened print window failed, trying other fallbacks:", error);
      closeChallengeReportPrintWindow(printWindow);
    }
  }

  const freshWindow = window.open("about:blank", "_blank", PRINT_WINDOW_FEATURES);
  if (freshWindow) {
    try {
      freshWindow.document.open();
      freshWindow.document.write(html);
      freshWindow.document.close();
      await waitForPrintWindowReady(freshWindow, errors);
      await printReportInWindow(freshWindow);
      return { method: "browser-print" };
    } catch (error) {
      console.warn("Fresh print window failed, downloading HTML file:", error);
      closeChallengeReportPrintWindow(freshWindow);
    }
  }

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  downloadBlob(blob, buildReportFileName("html"));
  return { method: "html-file" };
}

function isPdfBlob(blob: Blob): boolean {
  return blob.type.includes("pdf") || blob.type === "application/octet-stream";
}

export async function downloadChallengeReportPdf(
  opts: ChallengeReportCsvOptions,
  printWindow?: Window | null
): Promise<ChallengeReportDownloadResult> {
  const errors = pdfErrors(opts.language);
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
      throw new Error(message || errors.createFailed);
    }

    const blob = await response.blob();
    if (!isPdfBlob(blob) || blob.size < MIN_PDF_BYTES) {
      throw new Error(errors.invalidBlob);
    }

    downloadBlob(blob, buildReportFileName("pdf"));
    closeChallengeReportPrintWindow(printWindow);
    return { method: "server-pdf" };
  } catch (serverError) {
    console.warn("Server PDF failed, falling back to browser print:", serverError);
    return downloadChallengeReportPdfInBrowser(opts, printWindow);
  }
}
