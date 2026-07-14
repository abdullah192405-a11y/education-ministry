import type { PDFDocumentProxy } from "pdfjs-dist";

/** Skip PDF.js for very large inline files to avoid mobile tab crashes. */
const MAX_BASE64_CHARS_FOR_PDFJS = 10_000_000;

export function isPdfTooLargeForClientRender(pdfBase64?: string | null): boolean {
    return Boolean(pdfBase64 && pdfBase64.length > MAX_BASE64_CHARS_FOR_PDFJS);
}

export async function resolveTopicPdfBlobUrl(
    url?: string | null,
    pdfBase64?: string | null,
): Promise<string> {
    if (url && !url.startsWith("data:")) {
        return url;
    }

    const dataUrl =
        url?.startsWith("data:")
            ? url
            : pdfBase64
              ? `data:application/pdf;base64,${pdfBase64}`
              : null;

    if (!dataUrl) {
        throw new Error("PDF source missing");
    }

    const response = await fetch(dataUrl);
    if (!response.ok) {
        throw new Error("Failed to read PDF bytes");
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

export async function loadTopicPdfDocument(blobUrl: string): Promise<PDFDocumentProxy> {
    const { getPdfJs } = await import("@/lib/pdfExtractor");
    const pdfjsLib = await getPdfJs();
    return pdfjsLib.getDocument({ url: blobUrl }).promise;
}

export async function renderTopicPdfPageImageUrl(
    pdfDoc: PDFDocumentProxy,
    pageNum: number,
    maxWidth: number,
): Promise<string> {
    const page = await pdfDoc.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(Math.max(maxWidth / baseViewport.width, 0.2), 1.35);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
        throw new Error("Canvas unavailable");
    }

    const task = page.render({
        canvasContext: context,
        viewport,
    });
    await task.promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (value) => {
                if (value) resolve(value);
                else reject(new Error("Failed to encode PDF page"));
            },
            "image/jpeg",
            0.84,
        );
    });

    return URL.createObjectURL(blob);
}
