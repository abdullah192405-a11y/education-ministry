import { existsSync } from "node:fs";
import { join } from "node:path";

const distDir = join(import.meta.dirname, "..", "dist");
const required = ["index.html", ".htaccess"];

for (const file of required) {
  const path = join(distDir, file);
  if (!existsSync(path)) {
    console.error(
      `Missing dist/${file}. Run "npm run build" and deploy the dist/ folder to the web root (not public/ alone).`
    );
    process.exit(1);
  }
}

console.log("SPA dist OK: index.html and .htaccess are present in dist/.");
