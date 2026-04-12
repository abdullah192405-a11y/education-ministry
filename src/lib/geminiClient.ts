/**
 * Gemini generateContent with retries and model fallback.
 * Handles transient failures (429/503, "high demand", overloaded, etc.).
 */

export type GeminiGeneratePayload = {
    contents: unknown[];
    generationConfig?: Record<string, unknown>;
    safetySettings?: unknown[];
};

export type GeminiRetryInfo = {
    model: string;
    attempt: number;
    delayMs: number;
    reason: string;
};

const DEFAULT_MODEL_CHAIN = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(ms: number): number {
    const cap = Math.min(2500, Math.floor(ms * 0.25));
    return ms + Math.floor(Math.random() * (cap + 1));
}

function readApiError(body: unknown, httpStatus: number, statusText: string): { code: number; message: string } {
    if (body && typeof body === "object" && "error" in body) {
        const err = (body as { error?: { code?: number; message?: string; status?: string } }).error;
        const code = typeof err?.code === "number" ? err.code : httpStatus;
        const message = (err?.message || err?.status || statusText || `HTTP ${httpStatus}`).trim();
        return { code, message };
    }
    return { code: httpStatus, message: statusText || `HTTP ${httpStatus}` };
}

function isRetryableHttp(status: number): boolean {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function isRetryableMessage(message: string): boolean {
    const m = message.toLowerCase();
    return (
        m.includes("high demand") ||
        m.includes("resource exhausted") ||
        m.includes("try again") ||
        m.includes("overloaded") ||
        m.includes("unavailable") ||
        m.includes("deadline exceeded") ||
        m.includes("capacity") ||
        m.includes("rate limit") ||
        m.includes("too many requests") ||
        m.includes("internal error") ||
        m.includes("temporar")
    );
}

function isModelNotFound(httpStatus: number, message: string): boolean {
    if (httpStatus === 404) return true;
    const m = message.toLowerCase();
    return (
        (m.includes("not found") || m.includes("does not exist")) &&
        (m.includes("model") || m.includes("models/"))
    );
}

function shouldRetry(httpStatus: number, apiCode: number, message: string): boolean {
    if ([400, 401, 403].includes(httpStatus)) return false;
    if (httpStatus === 404) return false;
    return isRetryableHttp(httpStatus) || isRetryableHttp(apiCode) || isRetryableMessage(message);
}

/**
 * POST generateContent; retries with backoff, then tries fallback models.
 */
export async function generateGeminiContent(
    apiKey: string,
    body: GeminiGeneratePayload,
    options?: {
        models?: string[];
        maxAttemptsPerModel?: number;
        initialDelayMs?: number;
        maxDelayMs?: number;
        onRetry?: (info: GeminiRetryInfo) => void;
    }
): Promise<unknown> {
    const models = options?.models?.length ? options.models : DEFAULT_MODEL_CHAIN;
    const maxAttempts = options?.maxAttemptsPerModel ?? 5;
    const initialDelay = options?.initialDelayMs ?? 2000;
    const maxDelay = options?.maxDelayMs ?? 45000;

    let lastMessage = "";

    for (const model of models) {
        let delay = initialDelay;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            let parsed: unknown = null;
            try {
                parsed = await res.json();
            } catch {
                parsed = null;
            }

            if (res.ok) {
                return parsed;
            }

            const { code: apiCode, message } = readApiError(parsed, res.status, res.statusText);
            lastMessage = message;

            if (isModelNotFound(res.status, message)) {
                console.warn(`[Gemini] model ${model} not available, trying fallback`, message);
                break;
            }

            const retry = shouldRetry(res.status, apiCode, message);

            if (!retry) {
                throw new Error(message.startsWith("API:") ? message : `API: ${message}`);
            }

            if (attempt >= maxAttempts) {
                break;
            }

            const waitMs = withJitter(Math.min(delay, maxDelay));
            options?.onRetry?.({
                model,
                attempt,
                delayMs: waitMs,
                reason: message.slice(0, 200),
            });
            await sleep(waitMs);
            delay = Math.min(delay * 2, maxDelay);
        }
    }

    throw new Error(
        lastMessage
            ? `API: ${lastMessage}`
            : "API: فشل التوليد بعد عدة محاولات. يرجى المحاولة لاحقاً."
    );
}
