import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const bundleOptions = {
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: true,
  packages: "external",
  external: ["@sparticuz/chromium", "puppeteer-core", "puppeteer"],
  logLevel: "info",
};

const vercelOutfile = path.join(rootDir, "api/challenge-report-pdf.js");
await esbuild.build({
  ...bundleOptions,
  entryPoints: [path.join(rootDir, "scripts/challenge-report-pdf-entry.ts")],
  outfile: vercelOutfile,
});
console.log(`Bundled challenge report API -> ${vercelOutfile}`);

const netlifyOutfile = path.join(rootDir, "netlify/functions/challenge-report-pdf.js");
await esbuild.build({
  ...bundleOptions,
  entryPoints: [path.join(rootDir, "scripts/netlify-challenge-report-pdf-entry.ts")],
  outfile: netlifyOutfile,
});
console.log(`Bundled Netlify challenge report API -> ${netlifyOutfile}`);
