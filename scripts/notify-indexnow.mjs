import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const sitemapPath = path.join(rootDir, "dist", "sitemap.xml");
const HOST = "a2acards.com";
const KEY = "8f4c1d9e7b3a4026a2acards91e5c7b2";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

async function main() {
  if (!fs.existsSync(sitemapPath)) {
    console.log("Skipping IndexNow: dist/sitemap.xml not found.");
    return;
  }

  const xml = fs.readFileSync(sitemapPath, "utf8");
  const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
  if (urls.length === 0) {
    console.log("Skipping IndexNow: no URLs in sitemap.");
    return;
  }

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls.slice(0, 1000),
  };

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    console.log(`IndexNow response: HTTP ${res.status} (${urls.length} URLs submitted)`);
  } catch (error) {
    console.warn("IndexNow notification skipped due to network error:", error.message);
  }
}

main();
