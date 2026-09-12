/**
 * Vercel serverless proxy for Gemini generateContent.
 * Uses GEMINI_API_KEY (private Config) — never VITE_ / browser-exposed prefixes.
 */
const MAX_BODY_BYTES = 10 * 1024 * 1024;

function resolveGeminiApiKey() {
  const key = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim();
  return key || undefined;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > MAX_BODY_BYTES) {
      throw new Error("Request body too large.");
    }
    chunks.push(buffer);
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body);
  }
  return JSON.parse(text);
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST, OPTIONS");
    res.end("Method Not Allowed");
    return;
  }

  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    sendJson(res, 503, {
      error: {
        code: 503,
        message: "Gemini API key is not configured. Set GEMINI_API_KEY on the server.",
      },
    });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(req);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid JSON body.");
    }
  } catch (error) {
    sendJson(res, 400, {
      error: {
        code: 400,
        message: error instanceof Error ? error.message : "Invalid request body.",
      },
    });
    return;
  }

  const model = typeof payload.model === "string" ? payload.model.trim() : "";
  if (!model) {
    sendJson(res, 400, {
      error: { code: 400, message: "Missing required field: model" },
    });
    return;
  }

  const { model: _model, ...geminiBody } = payload;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    const text = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") || "application/json; charset=utf-8"
    );
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) {
      res.setHeader("Retry-After", retryAfter);
    }
    res.end(text);
  } catch (error) {
    sendJson(res, 502, {
      error: {
        code: 502,
        message: error instanceof Error ? error.message : "Failed to reach Gemini API.",
      },
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
  maxDuration: 60,
};
