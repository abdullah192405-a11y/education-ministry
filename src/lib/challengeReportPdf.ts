import type { ChallengeReportCsvOptions } from "./challengeReportDownload";

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

export async function downloadChallengeReportPdf(opts: ChallengeReportCsvOptions): Promise<void> {
    try {
        const { renderChallengeReportPdfBlob } = await import("./challengeReportPdfRender");
        const blob = await renderChallengeReportPdfBlob(opts);
        downloadBlob(blob, buildReportFileName());
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        throw new Error(message || "تعذر إنشاء ملف PDF للتقرير.");
    }
}
