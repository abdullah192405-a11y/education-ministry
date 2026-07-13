var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// scripts/netlify-wahj-reading-report-page-entry.ts
var netlify_wahj_reading_report_page_entry_exports = {};
__export(netlify_wahj_reading_report_page_entry_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(netlify_wahj_reading_report_page_entry_exports);
var import_node_stream = require("node:stream");

// server/wahjReadingReportPageHandler.ts
var import_node_fs = require("node:fs");
var import_node_path = __toESM(require("node:path"), 1);

// src/lib/wahjReadingReportSocialMeta.ts
var WAHJ_READING_REPORT_LOGO_PATH = "/brand/wahj-logo.png";
var WAHJ_READING_REPORT_OG_IMAGE_PATH = "/brand/wahj-report-9-final.png";
var WAHJ_READING_REPORT_SITE_NAME = "\u0642\u0631\u0627\u0621 \u0648\u0647\u062C";
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeAttr(value) {
  return escapeHtml(value);
}
function buildWahjReadingReportSocialMeta(options) {
  const title = options.participantName ? `\u062A\u0642\u0631\u064A\u0631 \u0642\u0631\u0627\u0621 \u0648\u0647\u062C \u2014 ${options.participantName}` : "\u062A\u0642\u0631\u064A\u0631 \u0642\u0631\u0627\u0621 \u0648\u0647\u062C";
  const description = "\u0634\u0627\u0647\u062F \u0645\u0644\u062E\u0635 \u0627\u0644\u0631\u062D\u0644\u0629 \u0641\u064A \u0628\u0631\u0646\u0627\u0645\u062C \u0642\u0631\u0627\u0621 \u0648\u0647\u062C";
  const path2 = options.token ? `/wahj/reading-report/${options.token}` : "/wahj/reading-report";
  const origin = options.origin.replace(/\/$/, "");
  return {
    title,
    description,
    url: `${origin}${path2}`,
    imageUrl: `${origin}${WAHJ_READING_REPORT_OG_IMAGE_PATH}`,
    siteName: WAHJ_READING_REPORT_SITE_NAME
  };
}
function replaceMetaTag(html, matcher, replacement) {
  return matcher.test(html) ? html.replace(matcher, replacement) : html;
}
function upsertNamedMeta(html, name, content) {
  const matcher = new RegExp(`<meta name="${name}"[\\s\\S]*?>`, "i");
  const tag = `<meta name="${name}" content="${content}" />`;
  if (matcher.test(html)) {
    return html.replace(matcher, tag);
  }
  return html.replace(/<meta charset="UTF-8"\s*\/?>/i, `$&
  ${tag}`);
}
function upsertPropertyMeta(html, property, content) {
  const matcher = new RegExp(`<meta property="${property}"[\\s\\S]*?>`, "i");
  const tag = `<meta property="${property}" content="${content}" />`;
  if (matcher.test(html)) {
    return html.replace(matcher, tag);
  }
  return html.replace(/<meta property="og:type"[\s\S]*?>/i, `$&
  ${tag}`);
}
function injectWahjReadingReportSocialMeta(html, meta) {
  const title = escapeHtml(meta.title);
  const description = escapeAttr(meta.description);
  const image = escapeAttr(meta.imageUrl);
  const url = escapeAttr(meta.url);
  const siteName = escapeAttr(meta.siteName);
  const imageAlt = escapeAttr(WAHJ_READING_REPORT_SITE_NAME);
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`).replace(/<link rel="icon"[\s\S]*?>/i, `<link rel="icon" type="image/png" href="${WAHJ_READING_REPORT_LOGO_PATH}" />`);
  out = upsertNamedMeta(out, "description", description);
  out = upsertNamedMeta(out, "author", WAHJ_READING_REPORT_SITE_NAME);
  out = upsertPropertyMeta(out, "og:title", title);
  out = upsertPropertyMeta(out, "og:description", description);
  out = upsertPropertyMeta(out, "og:image", image);
  out = upsertPropertyMeta(out, "og:url", url);
  out = upsertPropertyMeta(out, "og:site_name", siteName);
  out = upsertPropertyMeta(out, "og:image:alt", imageAlt);
  out = upsertNamedMeta(out, "twitter:title", title);
  out = upsertNamedMeta(out, "twitter:description", description);
  out = upsertNamedMeta(out, "twitter:image", image);
  out = upsertNamedMeta(out, "twitter:image:alt", imageAlt);
  out = replaceMetaTag(
    out,
    /<meta name="twitter:card"[\s\S]*?>/i,
    `<meta name="twitter:card" content="summary_large_image" />`
  );
  return out;
}

// server/wahjReadingReportPageHandler.ts
function resolveIndexHtmlPath(customPath) {
  if (customPath && (0, import_node_fs.existsSync)(customPath)) return customPath;
  const candidates = process.env.NODE_ENV === "production" ? [
    import_node_path.default.join(process.cwd(), "dist", "index.html"),
    import_node_path.default.join(process.cwd(), "index.html")
  ] : [
    import_node_path.default.join(process.cwd(), "index.html"),
    import_node_path.default.join(process.cwd(), "dist", "index.html")
  ];
  for (const candidate of candidates) {
    if ((0, import_node_fs.existsSync)(candidate)) return candidate;
  }
  throw new Error("Could not find index.html for Wahj reading report page.");
}
function resolveRequestOrigin(req) {
  const host = req.headers.host;
  if (!host) return "http://localhost:8080";
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto?.split(",")[0]?.trim() || "http";
  return `${protocol}://${host}`;
}
function extractReportToken(pathname) {
  const match = pathname.match(/^\/wahj\/reading-report\/([^/?#]+)/);
  return match?.[1];
}
async function fetchParticipantNameForToken(token) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !token) return void 0;
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/get_wahj_reading_report_by_token`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ report_token: token })
    });
    if (!response.ok) return void 0;
    const data = await response.json();
    const row = Array.isArray(data) ? data[0] : data;
    return row?.payload?.participantName || void 0;
  } catch {
    return void 0;
  }
}
async function handleWahjReadingReportPageRequest(req, res, options) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }
  const requestUrl = new URL(req.url || "/", resolveRequestOrigin(req));
  const token = extractReportToken(requestUrl.pathname);
  const origin = resolveRequestOrigin(req);
  const participantName = options?.participantName ?? (token ? await fetchParticipantNameForToken(token) : void 0);
  const meta = buildWahjReadingReportSocialMeta({
    origin,
    token,
    participantName
  });
  const indexHtml = (0, import_node_fs.readFileSync)(resolveIndexHtmlPath(options?.indexHtmlPath), "utf8");
  const html = injectWahjReadingReportSocialMeta(indexHtml, meta);
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(html);
}

// scripts/netlify-wahj-reading-report-page-entry.ts
function normalizeHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value != null) out[key.toLowerCase()] = value;
  }
  return out;
}
function createRequest(event) {
  const token = event.queryStringParameters?.token;
  const pathname = token ? `/wahj/reading-report/${token}` : event.path;
  const stream = import_node_stream.Readable.from(Buffer.alloc(0));
  stream.method = event.httpMethod;
  stream.headers = normalizeHeaders(event.headers);
  stream.url = pathname;
  return stream;
}
function createResponse() {
  let statusCode = 200;
  const headers = {};
  const chunks = [];
  const res = {
    statusCode: 200,
    headersSent: false,
    setHeader(name, value) {
      headers[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
    },
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    end(chunk) {
      if (chunk != null) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      res.headersSent = true;
      finish();
    }
  };
  let resolveCompletion;
  const completion = new Promise((resolve) => {
    resolveCompletion = resolve;
  });
  function finish() {
    resolveCompletion({
      statusCode,
      headers,
      body: Buffer.concat(chunks).toString("utf8")
    });
  }
  Object.defineProperty(res, "statusCode", {
    get() {
      return statusCode;
    },
    set(value) {
      statusCode = value;
    }
  });
  return { res, completion };
}
async function handler(event) {
  const req = createRequest(event);
  const { res, completion } = createResponse();
  try {
    await handleWahjReadingReportPageRequest(req, res, {
      indexHtmlPath: `${process.cwd()}/dist/index.html`
    });
  } catch (error) {
    console.error("wahj-reading-report-page Netlify handler failed:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(error instanceof Error ? error.message : "\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u062A\u0642\u0631\u064A\u0631 \u0642\u0631\u0627\u0621 \u0648\u0647\u062C.");
    }
  }
  return completion;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=wahj-reading-report-page.js.map
