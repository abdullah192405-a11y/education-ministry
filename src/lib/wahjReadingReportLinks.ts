import { publicClient, supabase } from "@/lib/supabase";
import type { WahjReadingReportPayload } from "@/lib/wahjReadingReportData";
import {
    buildFallbackIndividualAiReport,
    generateWahjIndividualAiReport,
} from "@/lib/wahjReadingReportRecommendations";

type WahjReadingReportLinkRow = {
    token: string;
    payload: WahjReadingReportPayload;
    created_at?: string;
    updated_at?: string;
};

type SupabaseLikeError = {
    code?: string;
    message?: string;
};

type CreateWahjReadingReportLinkInput = {
    payload: WahjReadingReportPayload;
    participantKey: string;
    subjectId: string;
    createdByUserId?: string | null;
};

export type WahjReadingReportLinkResult = {
    token: string;
    url: string;
    payload: WahjReadingReportPayload;
};

const REPORT_TOKEN_LENGTH = 8;
const REPORT_TOKEN_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateReportToken(): string {
    const bytes = new Uint8Array(REPORT_TOKEN_LENGTH);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i += 1) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }

    return Array.from(bytes)
        .map((byte) => REPORT_TOKEN_CHARS[byte % REPORT_TOKEN_CHARS.length])
        .join("");
}

function getReportUrl(token: string): string {
    const origin = typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "";
    return `${origin}/wahj/reading-report/${token}`;
}

function isMissingReportTable(error: SupabaseLikeError): boolean {
    return error.code === "PGRST205" || /wahj_reading_report_links/i.test(error.message || "");
}

function buildMissingReportTableError(): Error {
    return new Error(
        "Wahj reading report links are not available yet. Apply the wahj_reading_report_links database migration.",
    );
}

async function findExistingReportToken(
    participantKey: string,
    subjectId: string,
): Promise<string | null> {
    const { data, error } = await supabase
        .from("wahj_reading_report_links")
        .select("token")
        .eq("participant_key", participantKey)
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        if (isMissingReportTable(error)) throw buildMissingReportTableError();
        throw error;
    }

    return data?.token || null;
}

function base64UrlDecode(value: string): string {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
        Math.ceil(value.length / 4) * 4,
        "=",
    );
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}


function readInlineReportPayload(): WahjReadingReportPayload | null {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const data = params.get("data");
    if (!data) return null;

    try {
        return JSON.parse(base64UrlDecode(data)) as WahjReadingReportPayload;
    } catch {
        return null;
    }
}

function normalizeUuid(value?: string | null): string | null {
    if (!value) return null;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
        ? value
        : null;
}

export async function enrichWahjIndividualReportPayload(
    payload: WahjReadingReportPayload,
): Promise<WahjReadingReportPayload> {
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

export async function createWahjReadingReportLink({
    payload,
    participantKey,
    subjectId,
    createdByUserId,
}: CreateWahjReadingReportLinkInput): Promise<WahjReadingReportLinkResult> {
    const enrichedPayload = await enrichWahjIndividualReportPayload(payload);
    const existingToken = await findExistingReportToken(participantKey, subjectId);

    if (existingToken) {
        const { error } = await supabase
            .from("wahj_reading_report_links")
            .update({
                participant_name: enrichedPayload.participantName,
                payload: enrichedPayload,
                updated_at: new Date().toISOString(),
            })
            .eq("token", existingToken);

        if (error) {
            if (isMissingReportTable(error)) throw buildMissingReportTableError();
            throw error;
        }

        return {
            token: existingToken,
            url: getReportUrl(existingToken),
            payload: enrichedPayload,
        };
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const token = generateReportToken();

        const { error } = await supabase.from("wahj_reading_report_links").insert({
            token,
            participant_key: participantKey,
            participant_name: enrichedPayload.participantName,
            subject_id: subjectId,
            created_by: normalizeUuid(createdByUserId),
            payload: enrichedPayload,
            updated_at: new Date().toISOString(),
        });

        if (!error) {
            return {
                token,
                url: getReportUrl(token),
                payload: enrichedPayload,
            };
        }

        if (error.code === "23505") continue;

        if (isMissingReportTable(error)) throw buildMissingReportTableError();
        throw error;
    }

    throw new Error("Failed to generate a unique Wahj reading report link.");
}

export async function fetchWahjReadingReportByToken(
    token: string,
): Promise<WahjReadingReportLinkRow | null> {
    if (token === "inline") {
        const payload = readInlineReportPayload();
        return payload ? { token, payload } : null;
    }

    const { data, error } = await publicClient.rpc("get_wahj_reading_report_by_token", {
        report_token: token,
    });

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.payload) return null;

    return row as WahjReadingReportLinkRow;
}
