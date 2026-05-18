import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { componentTagger } from "lovable-tagger";
import { handleChallengeReportPdfRequest } from "./src/server/challengeReportPdfHandler";

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

function challengeReportPdfPlugin(geminiApiKey?: string): PluginOption {
  return {
    name: "challenge-report-pdf",
    configureServer(server) {
      registerChallengeReportPdfMiddleware(server.middlewares, geminiApiKey);
    },
    configurePreviewServer(server) {
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

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), challengeReportPdfPlugin(geminiApiKey), mode === "development" && componentTagger()].filter(Boolean),
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
