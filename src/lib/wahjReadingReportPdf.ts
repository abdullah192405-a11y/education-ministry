import { buildWahjReadingReportHtml } from "@/lib/wahjReadingReportHtml";
import { buildWahjProgramReportHtml } from "@/lib/wahjProgramReportHtml";
import type { WahjProgramReportPayload, WahjReadingReportPayload } from "@/lib/wahjReadingReportData";
import {
    buildFallbackIndividualAiReport,
    buildFallbackProgramAiReport,
    generateWahjIndividualAiReport,
    generateWahjProgramAiReport,
} from "@/lib/wahjReadingReportRecommendations";
import {
    closeChallengeReportPrintWindow,
    openChallengeReportPrintWindow,
} from "@/lib/challengeReportPdf";
import type { ReportLanguage } from "@/lib/challengeReportLabels";

const PRINT_WINDOW_FEATURES = "width=1240,height=1754";

const PDF_ERRORS: Record<ReportLanguage, {
    popupBlocked: string;
    printTimeout: string;
}> = {
    ar: {
        popupBlocked: "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.",
        printTimeout: "انتهت مهلة تحميل التقرير للطباعة.",
    },
    en: {
        popupBlocked: "Could not open the print window. Allow pop-ups and try again.",
        printTimeout: "The report timed out while loading for print.",
    },
};

function pdfErrors(language?: ReportLanguage) {
    return PDF_ERRORS[language === "en" ? "en" : "ar"];
}

function sanitizeFileName(name: string): string {
    return name.replace(/[^\w\u0600-\u06FF.-]+/g, "_").slice(0, 40) || "report";
}

function buildReportFileName(slug: string, extension: "pdf" | "html"): string {
    const day = new Date().toISOString().slice(0, 10);
    return `wahj-report-${sanitizeFileName(slug)}-${day}.${extension}`;
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

async function waitForPrintWindowReady(
    printWindow: Window,
    errors: ReturnType<typeof pdfErrors>,
): Promise<void> {
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
        // ignore font readiness errors
    }
}

async function printReportInWindow(printWindow: Window): Promise<void> {
    await new Promise<void>((resolve) => {
        window.setTimeout(() => {
            try {
                printWindow.focus();
                printWindow.print();
            } catch {
                // user can still save from the open tab
            }
            resolve();
        }, 500);
    });
}

export type WahjReportDownloadMethod = "browser-print" | "html-file";

export type WahjReportDownloadResult = {
    method: WahjReportDownloadMethod;
};

async function downloadWahjHtmlReport(
    html: string,
    fileSlug: string,
    language: ReportLanguage | undefined,
    printWindow?: Window | null,
): Promise<WahjReportDownloadResult> {
    const errors = pdfErrors(language);

    if (printWindow && !printWindow.closed) {
        try {
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            await waitForPrintWindowReady(printWindow, errors);
            await printReportInWindow(printWindow);
            return { method: "browser-print" };
        } catch (error) {
            console.warn("Pre-opened Wahj print window failed:", error);
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
            console.warn("Fresh Wahj print window failed:", error);
            closeChallengeReportPrintWindow(freshWindow);
        }
    }

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    downloadBlob(blob, buildReportFileName(fileSlug, "html"));
    return { method: "html-file" };
}

async function enrichIndividualPayload(payload: WahjReadingReportPayload): Promise<WahjReadingReportPayload> {
    if (payload.aiReport) return payload;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) {
        return { ...payload, aiReport: buildFallbackIndividualAiReport(payload) };
    }

    try {
        const aiReport = await generateWahjIndividualAiReport(apiKey, payload);
        return { ...payload, aiReport };
    } catch {
        return { ...payload, aiReport: buildFallbackIndividualAiReport(payload) };
    }
}

async function enrichProgramPayload(payload: WahjProgramReportPayload): Promise<WahjProgramReportPayload> {
    if (payload.aiReport) return payload;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) {
        return { ...payload, aiReport: buildFallbackProgramAiReport(payload) };
    }

    try {
        const aiReport = await generateWahjProgramAiReport(apiKey, payload);
        return { ...payload, aiReport };
    } catch {
        return { ...payload, aiReport: buildFallbackProgramAiReport(payload) };
    }
}

export async function downloadWahjReadingReportPdf(
    payload: WahjReadingReportPayload,
    language?: ReportLanguage,
    printWindow?: Window | null,
): Promise<WahjReportDownloadResult> {
    const enriched = await enrichIndividualPayload(payload);
    const html = buildWahjReadingReportHtml(enriched);
    return downloadWahjHtmlReport(html, payload.participantName, language, printWindow);
}

export async function downloadWahjProgramReportPdf(
    payload: WahjProgramReportPayload,
    language?: ReportLanguage,
    printWindow?: Window | null,
): Promise<WahjReportDownloadResult> {
    const enriched = await enrichProgramPayload(payload);
    const html = buildWahjProgramReportHtml(enriched);
    return downloadWahjHtmlReport(html, "program-all", language, printWindow);
}

export { openChallengeReportPrintWindow as openWahjReportPrintWindow };
