// Utility for extracting content from PDFs stored in Supabase Storage
import { supabase } from "@/lib/supabase";
// Bundled worker avoids CDN version skew and works offline — critical for rendering scanned pages
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.js?url";

/**
 * Whether the PDF text layer looks like a scan / image-only PDF (no real text),
 * or too short to rely on for question generation. Printed PDFs often yield empty
 * or metadata-only strings; some files yield long garbage with few real letters.
 */
export function pdfNeedsVisualPageImages(extractedText: string): boolean {
    const t = extractedText.trim();
    if (t.length === 0) return true;
    const letters = (t.match(/\p{L}/gu) ?? []).length;
    const density = letters / t.length;
    if (letters < 100) return true;
    if (density < 0.12) return true;
    if (t.length < 420) return true;
    return false;
}

let pdfWorkerConfigured = false;

async function getPdfJs() {
    const pdfjsLib = await import("pdfjs-dist");
    if (!pdfWorkerConfigured) {
        try {
            // Try local worker first
            pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
            pdfWorkerConfigured = true;
            console.log("PDF.js worker configured with local source");
        } catch (e) {
            console.warn("Failed to set local PDF worker, falling back to CDN", e);
            // Fallback to CDN matching the library version
            const version = pdfjsLib.version || "3.11.174";
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
            pdfWorkerConfigured = true;
        }
    }
    return pdfjsLib;
}

/** Copy buffer so the worker thread does not detach the caller's underlying ArrayBuffer. */
async function readPdfArrayBuffer(source: File | Blob | string): Promise<ArrayBuffer> {
    if (source instanceof File || source instanceof Blob) {
        return source.arrayBuffer();
    }
    if (typeof source === "string") {
        const response = await fetch(source);
        if (!response.ok) throw new Error("Failed to fetch PDF");
        return response.arrayBuffer();
    }
    throw new Error("Invalid source for PDF");
}

/**
 * Extract pages of a PDF as base64 images
 * Useful for scanned PDFs or when text extraction isn't enough
 */
export const extractPdfAsImages = async (
    source: File | Blob | string,
    maxPages: number = 20,
    scale: number = 2
): Promise<string[]> => {
    try {
        console.log("Starting PDF image extraction...");
        const pdfjsLib = await getPdfJs();

        const raw = await readPdfArrayBuffer(source);
        const data = new Uint8Array(raw);

        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const totalPages = Math.min(pdf.numPages, maxPages);
        const images: string[] = [];

        console.log(`Rendering ${totalPages} pages to images...`);

        for (let i = 1; i <= totalPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d", { alpha: false });
                if (!context) continue;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport,
                }).promise;

                // Convert to base64 jpeg to save space
                const base64 = canvas.toDataURL("image/jpeg", 0.82).split(",")[1];
                images.push(base64);
                console.log(`Page ${i} rendered`);
            } catch (pageError) {
                console.warn(`Error rendering page ${i}:`, pageError);
            }
        }

        return images;
    } catch (error: any) {
        console.error("Error extracting PDF images:", error);
        throw new Error(error.message || "فشل تحويل PDF إلى صور");
    }
};

/**
 * Extract text content from a PDF file
 * Works with File objects, Blobs, and URLs
 */
export const extractPdfText = async (source: File | Blob | string): Promise<string> => {
    try {
        console.log("Starting PDF extraction...");
        const pdfjsLib = await getPdfJs();

        const arrayBuffer = await readPdfArrayBuffer(source);
        console.log("ArrayBuffer loaded, size:", arrayBuffer.byteLength);
        const data = new Uint8Array(arrayBuffer);

        const pdf = await pdfjsLib.getDocument({ data }).promise;
        console.log("PDF loaded successfully, pages:", pdf.numPages);

        let fullText = "";

        // Extract text from each page, limit to first 100 pages for performance
        const maxPages = Math.min(pdf.numPages, 100);
        for (let i = 1; i <= maxPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => item.str || '')
                    .join(" ");

                if (pageText.trim()) {
                    fullText += `\n--- صفحة ${i} ---\n${pageText}`;
                }
            } catch (pageError) {
                console.warn(`Error on page ${i}:`, pageError);
            }
        }

        // IMPORTANT: We don't throw if empty anymore, because we might use visual analysis
        console.log("Total extracted text length:", fullText.length);
        return fullText;
    } catch (error: any) {
        console.error("Error extracting PDF text:", error);
        throw new Error(error.message || "فشل استخراج محتوى PDF");
    }
};

/**
 * Fetch PDF from Supabase Storage and extract its content
 */
export const extractPdfFromSupabase = async (
    teacherId: string,
    fileName: string
): Promise<string> => {
    try {
        console.log(`Extracting PDF from Supabase: ${teacherId}/content/${fileName}`);

        // Use download() instead of getPublicUrl() to avoid CORS/permission issues
        const { data: blob, error } = await supabase.storage
            .from("teacher-content")
            .download(`${teacherId}/content/${fileName}`);

        if (error) {
            console.error("Supabase download error:", error);
            throw new Error(`فشل تحميل الملف من التخزين: ${error.message}`);
        }

        if (!blob) {
            throw new Error("لم يتم العثور على محتوى في الملف المُحمّل");
        }

        // Extract text from the Blob
        return await extractPdfText(blob);
    } catch (error: any) {
        console.error("Error extracting PDF from Supabase:", error);
        throw new Error(error.message || "فشل استخراج محتوى PDF من التخزين");
    }
};

/**
 * Get all PDFs uploaded by a teacher
 */
export const getTeacherPdfs = async (teacherId: string): Promise<Array<{
    name: string;
    size: number;
    uploadedAt: string;
}>> => {
    try {
        console.log(`Listing PDFs for teacher: ${teacherId}`);
        const { data: files, error } = await supabase.storage
            .from("teacher-content")
            .list(`${teacherId}/content`, {
                limit: 100,
                sortBy: { column: "created_at", order: "desc" }
            });

        if (error && error.message !== "not found") {
            throw error;
        }

        // Filter only PDF files
        const pdfFiles = (files || [])
            .filter(file => file.name.toLowerCase().endsWith(".pdf"))
            .map(file => ({
                name: file.name,
                size: file.metadata?.size || 0,
                uploadedAt: new Date(file.created_at).toLocaleString("ar-SA")
            }));

        console.log(`Found ${pdfFiles.length} PDFs for teacher`);
        return pdfFiles;
    } catch (error) {
        console.error("Error fetching teacher PDFs:", error);
        throw new Error("فشل جلب ملفات PDF من التخزين");
    }
};

/**
 * Fetch PDF from Supabase Storage and extract its pages as images
 */
export const extractPdfFromSupabaseAsImages = async (
    teacherId: string,
    fileName: string,
    maxPages: number = 20,
    scale: number = 2
): Promise<string[]> => {
    try {
        console.log(`Extracting PDF as images from Supabase: ${teacherId}/content/${fileName}`);

        const { data: blob, error } = await supabase.storage
            .from("teacher-content")
            .download(`${teacherId}/content/${fileName}`);

        if (error) throw new Error(`فشل تحميل الملف: ${error.message}`);
        if (!blob) throw new Error("الملف فارغ");

        return await extractPdfAsImages(blob, maxPages, scale);
    } catch (error: any) {
        console.error("Error extracting PDF images from Supabase:", error);
        throw new Error(error.message || "فشل تحويل PDF من التخزين إلى صور");
    }
};

/**
 * Extract text from multiple PDFs
 */
export const extractMultiplePdfs = async (
    pdfFiles: Array<{ name: string; file: File | Blob | string }>
): Promise<Map<string, string>> => {
    const results = new Map<string, string>();

    for (const pdf of pdfFiles) {
        try {
            const text = await extractPdfText(pdf.file);
            results.set(pdf.name, text);
        } catch (error) {
            console.error(`Error extracting PDF ${pdf.name}:`, error);
        }
    }

    return results;
};


