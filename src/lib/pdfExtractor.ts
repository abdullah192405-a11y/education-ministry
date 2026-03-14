// Utility for extracting content from PDFs stored in Supabase Storage
import { supabase } from "@/lib/supabase";

/**
 * Extract text content from a PDF file
 * Works with File objects, Blobs, and URLs
 */
export const extractPdfText = async (source: File | Blob | string): Promise<string> => {
    try {
        console.log("Starting PDF extraction...");
        // Dynamic import of PDF.js
        const pdfjsLib = await import('pdfjs-dist');

        let arrayBuffer: ArrayBuffer;

        if (source instanceof File || source instanceof Blob) {
            // Handle File or Blob object
            arrayBuffer = await source.arrayBuffer();
            console.log("ArrayBuffer loaded from file/blob, size:", arrayBuffer.byteLength);
        } else if (typeof source === 'string') {
            // Handle URL (from Supabase Storage or elsewhere)
            console.log("Fetching PDF from URL:", source);
            const response = await fetch(source);
            if (!response.ok) {
                throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
            }
            arrayBuffer = await response.arrayBuffer();
            console.log("ArrayBuffer loaded from URL, size:", arrayBuffer.byteLength);
        } else {
            throw new Error("Invalid source type for PDF extraction");
        }

        // Set up PDF.js worker with matching version
        const pdfjsVersion = pdfjsLib.version || '3.11.174';
        // Use https scripts for latest versions
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;
        console.log("Using PDF.js version:", pdfjsVersion, "Worker:", pdfjsLib.GlobalWorkerOptions.workerSrc);

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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

        if (!fullText.trim()) {
            throw new Error("لم يتم استخراج أي نص من ملف PDF. قد يكون الملف مُشفراً أو يحتوي على صور فقط.");
        }

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

