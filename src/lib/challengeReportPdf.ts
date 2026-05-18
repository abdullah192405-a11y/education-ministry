import type { ChallengeReportCsvOptions } from "./challengeReportDownload";

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

export async function downloadChallengeReportPdf(
    opts: ChallengeReportCsvOptions
): Promise<void> {
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
}
