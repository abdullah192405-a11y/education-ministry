import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { componentTagger } from "lovable-tagger";
import { handleChallengeReportPdfRequest } from "./server/challengeReportPdfHandler";
import { handleGeminiProxyRequest } from "./server/geminiProxyHandler";
import { handleWahjReadingReportPageRequest } from "./server/wahjReadingReportPageHandler";

type MiddlewareStack = {
  use: (
    path: string,
    handler: (
      req: IncomingMessage,
      res: ServerResponse,
      next: (err?: unknown) => void
    ) => void | Promise<void>
  ) => void;
};

function registerChallengeReportPdfMiddleware(middlewares: MiddlewareStack, geminiApiKey?: string): void {
  middlewares.use("/api/challenge-report-pdf", async (req, res, next) => {
    try {
      await handleChallengeReportPdfRequest(req, res, geminiApiKey);
    } catch (error) {
      next(error);
    }
  });
}

function registerGeminiProxyMiddleware(middlewares: MiddlewareStack): void {
  middlewares.use("/api/gemini", async (req, res, next) => {
    try {
      await handleGeminiProxyRequest(req, res);
    } catch (error) {
      next(error);
    }
  });
}

function registerWahjReadingReportPageMiddleware(
  middlewares: MiddlewareStack,
  options?: { dev?: boolean },
): void {
  middlewares.use(async (req, res, next) => {
    if (!req.url) return next();

    const pathname = new URL(req.url, "http://localhost").pathname;
    if (!pathname.startsWith("/wahj/reading-report/")) return next();
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    // Inject Wahj social metadata for crawlers in dev and preview.
    try {
      await handleWahjReadingReportPageRequest(req, res, {
        indexHtmlPath: options?.dev
          ? path.join(process.cwd(), "index.html")
          : undefined,
      });
    } catch (error) {
      next(error);
    }
  });
}

function wahjReadingReportPagePlugin(): PluginOption {
  return {
    name: "wahj-reading-report-page",
    // Dev: skip HTML middleware — serving raw index.html bypasses Vite's React Refresh
    // preamble and breaks the app (@vitejs/plugin-react-swc "can't detect preamble").
    // WahjReadingReport applies social meta client-side after the payload loads.
    configurePreviewServer(server) {
      registerWahjReadingReportPageMiddleware(server.middlewares);
    },
  };
}

function challengeReportPdfPlugin(geminiApiKey?: string): PluginOption {
  return {
    name: "challenge-report-pdf",
    configureServer(server) {
      registerGeminiProxyMiddleware(server.middlewares);
      registerChallengeReportPdfMiddleware(server.middlewares, geminiApiKey);
    },
    configurePreviewServer(server) {
      registerGeminiProxyMiddleware(server.middlewares);
      registerChallengeReportPdfMiddleware(server.middlewares, geminiApiKey);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const geminiApiKey =
    env.GEMINI_API_KEY ||
    env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  // Expose private key to Node middleware (Vite does not inject non-VITE_ into process.env).
  if (geminiApiKey) {
    process.env.GEMINI_API_KEY = geminiApiKey;
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      challengeReportPdfPlugin(geminiApiKey),
      wahjReadingReportPagePlugin(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      include: [
        "@digicole/pdfmake-rtl/build/pdfmake",
        "@digicole/pdfmake-rtl/build/vfs_fonts",
      ],
    },
  };
});
