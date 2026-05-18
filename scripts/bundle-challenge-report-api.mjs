import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outfile = path.join(rootDir, "api/challenge-report-pdf.js");

await esbuild.build({
  entryPoints: [path.join(rootDir, "scripts/challenge-report-pdf-entry.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile,
  sourcemap: true,
  packages: "external",
  external: ["@sparticuz/chromium", "puppeteer-core", "puppeteer"],
  logLevel: "info",
});

console.log(`Bundled challenge report API -> ${outfile}`);
