import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const indexPath = path.join(root, "index.html");
const scholarsIndexPath = path.join(root, "data", "scholars-index.json");
const baseUrl = "https://ai-scholars.github.io/aischolars.github.io";

if (!fs.existsSync(indexPath)) {
  throw new Error("index.html is required before route generation.");
}

if (!fs.existsSync(scholarsIndexPath)) {
  throw new Error("data/scholars-index.json is required before route generation.");
}

const scholars = JSON.parse(fs.readFileSync(scholarsIndexPath, "utf8"));

fs.copyFileSync(indexPath, path.join(root, "404.html"));

fs.mkdirSync(path.join(root, "scholars"), { recursive: true });
fs.copyFileSync(indexPath, path.join(root, "scholars", "index.html"));

fs.rmSync(path.join(root, "scholar"), { recursive: true, force: true });
for (const scholar of scholars) {
  const outDir = path.join(root, "scholar", scholar.slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(indexPath, path.join(outDir, "index.html"));
}

const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: `${baseUrl}/`, priority: "1.0" },
  { loc: `${baseUrl}/scholars`, priority: "0.9" },
  ...scholars.map((scholar) => ({
    loc: `${baseUrl}/scholar/${encodeURIComponent(scholar.slug)}`,
    priority: "0.7",
  })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${today}</lastmod>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);
console.log(`Generated ${scholars.length} scholar routes and sitemap.xml.`);
