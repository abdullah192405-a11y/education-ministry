import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { ChallengeReportCsvOptions } from "./challengeReportDownload";
import { buildChallengeReportHtml } from "./challengeReportPdfHtml";
import {
    buildFallbackRecommendationReport,
    generateChallengeRecommendationReport,
} from "./challengeReportRecommendations";

const REPORT_VIEWPORT_WIDTH_PX = 1240;
const PDF_FORMAT = "a4" as const;
const PDF_ORIENTATION = "portrait" as const;

async function waitForReportDocument(doc: Document): Promise<void> {
    await doc.fonts.ready;

    const stylesheets = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
    await Promise.all(
        stylesheets.map(
            (link) =>
                new Promise<void>((resolve) => {
                    if (link.sheet) {
                        resolve();
                        return;
                    }
                    link.addEventListener("load", () => resolve(), { once: true });
                    link.addEventListener("error", () => resolve(), { once: true });
                    window.setTimeout(resolve, 4000);
                })
        )
    );

    await new Promise<void>((resolve) => window.setTimeout(resolve, 250));
}

async function htmlToPdfBlob(html: string): Promise<Blob> {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = `${REPORT_VIEWPORT_WIDTH_PX}px`;
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    iframe.srcdoc = html;
    document.body.appendChild(iframe);

    try {
        await new Promise<void>((resolve, reject) => {
            iframe.addEventListener("load", () => resolve(), { once: true });
            iframe.addEventListener("error", () => reject(new Error("تعذر تحميل قالب التقرير.")), {
                once: true,
            });
        });

        const doc = iframe.contentDocument;
        if (!doc?.body) {
            throw new Error("تعذر تجهيز محتوى التقرير.");
        }

        await waitForReportDocument(doc);

        const canvas = await html2canvas(doc.body, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            width: REPORT_VIEWPORT_WIDTH_PX,
            windowWidth: REPORT_VIEWPORT_WIDTH_PX,
        });

        const pdf = new jsPDF({
            orientation: PDF_ORIENTATION,
            unit: "mm",
            format: PDF_FORMAT,
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imageWidth = pageWidth;
        const imageHeight = (canvas.height * imageWidth) / canvas.width;
        const imageData = canvas.toDataURL("image/jpeg", 0.92);

        let heightLeft = imageHeight;
        let position = 0;

        pdf.addImage(imageData, "JPEG", 0, position, imageWidth, imageHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position = heightLeft - imageHeight;
            pdf.addPage();
            pdf.addImage(imageData, "JPEG", 0, position, imageWidth, imageHeight);
            heightLeft -= pageHeight;
        }

        return pdf.output("blob");
    } finally {
        iframe.remove();
    }
}

export async function enrichChallengeReportPayload(
    opts: ChallengeReportCsvOptions
): Promise<ChallengeReportCsvOptions> {
    if (opts.recommendationReport) {
        return opts;
    }

    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
    if (!apiKey) {
        return {
            ...opts,
            recommendationReport: buildFallbackRecommendationReport(opts),
        };
    }

    try {
        const recommendationReport = await generateChallengeRecommendationReport(apiKey, opts);
        return { ...opts, recommendationReport };
    } catch (error) {
        console.warn(
            "Gemini recommendation report generation failed; using fallback recommendations.",
            error instanceof Error ? error.message : String(error)
        );
        return {
            ...opts,
            recommendationReport: buildFallbackRecommendationReport(opts),
        };
    }
}

export async function renderChallengeReportPdfBlob(opts: ChallengeReportCsvOptions): Promise<Blob> {
    const enriched = await enrichChallengeReportPayload(opts);
    const html = buildChallengeReportHtml(enriched);
    return htmlToPdfBlob(html);
}
