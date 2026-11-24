import fs from "node:fs";
import path from "node:path";
import {
  extractInterfaces,
  validateAgentCard,
  validateRegistryEntry,
} from "../src/lib/a2a-validator.js";

const rootDir = path.resolve(import.meta.dirname, "..");
const cardsDir = path.join(rootDir, "registry", "cards");
const crawledPath = path.join(rootDir, "registry", "crawled", "cards.json");
const generatedDir = path.join(rootDir, "src", "generated");
const publicRegistryDir = path.join(rootDir, "public", "registry");
const publicCardsDir = path.join(publicRegistryDir, "cards");
const publicBadgesDir = path.join(rootDir, "public", "badges");

fs.mkdirSync(generatedDir, { recursive: true });
fs.mkdirSync(publicCardsDir, { recursive: true });
fs.mkdirSync(publicBadgesDir, { recursive: true });

// Clean stale per-card JSON and SVG badges before regenerating
for (const dir of [publicCardsDir, publicBadgesDir]) {
  for (const f of fs.readdirSync(dir)) {
    fs.unlinkSync(path.join(dir, f));
  }
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBadgeSvg(entry) {
  const label = "A2A Card";
  const isOnline = !entry.health || entry.health.status === "online";
  let value = "v1.0 Valid";
  let color = "#0A7C59";

  if (!isOnline) {
    value = "Unreachable";
    color = "#6B7482";
  } else if (!entry.v1Valid) {
    value = entry.specVersion === "0.3-legacy" ? "v0.3 Legacy" : "Partial v1.0";
    color = "#B45309";
  }

  const labelWidth = 64;
  const valueWidth = Math.max(66, value.length * 6.8 + 16);
  const totalWidth = Math.round(labelWidth + valueWidth);
  const labelX = Math.round(labelWidth / 2);
  const valueX = Math.round(labelWidth + valueWidth / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${escapeXml(
    `${label}: ${value}`
  )}">
  <title>${escapeXml(`${entry.card.name} — ${label}: ${value}`)}</title>
  <rect width="${labelWidth}" height="20" rx="3" fill="#111418"/>
  <rect x="${labelWidth - 3}" width="${Math.round(valueWidth) + 3}" height="20" rx="3" fill="${color}"/>
  <rect x="${labelWidth - 3}" width="6" height="20" fill="${color}"/>
  <g fill="#FFFFFF" text-anchor="middle" font-family="ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="11" font-weight="600">
    <text x="${labelX}" y="14">${escapeXml(label)}</text>
    <text x="${valueX}" y="14">${escapeXml(value)}</text>
  </g>
</svg>\n`;
}

const entries = [];
const seenSlugs = new Set();
const seenUrls = new Set();

function canonicalUrl(raw) {
  try {
    const u = new URL(raw);
    return `${u.hostname.toLowerCase().replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return raw;
  }
}

// 1. Curated entries (strict A2A v1.0)
const curatedFiles = fs
  .readdirSync(cardsDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

for (const file of curatedFiles) {
  const expectedSlug = file.replace(/\.json$/, "");
  const entry = JSON.parse(fs.readFileSync(path.join(cardsDir, file), "utf8"));
  const result = validateRegistryEntry(entry, expectedSlug);
  if (!result.valid) {
    console.error(`Cannot build registry: registry/cards/${file} failed validation.`);
    for (const err of result.errors) {
      console.error(`  - [${err.path}] ${err.message}`);
    }
    process.exit(1);
  }
  const cardVal = validateAgentCard(entry.card);
  const enriched = {
    ...entry,
    source: "curated",
    signed: Boolean(entry.signed || (Array.isArray(entry.card.signatures) && entry.card.signatures.length > 0)),
    specVersion: cardVal.detectedVersion,
    v1Valid: cardVal.valid,
    errorCount: cardVal.errors.length,
    warningCount: cardVal.warnings.length,
    health: entry.health || {
      status: "online",
      httpStatus: 200,
      lastCheckedAt: new Date().toISOString(),
      consecutiveFailures: 0,
      legacyPath: false,
    },
  };
  entries.push(enriched);
  seenSlugs.add(enriched.slug);
  seenUrls.add(canonicalUrl(enriched.cardUrl));
}

// 2. Crawled live entries
let lastCrawledAt;
if (fs.existsSync(crawledPath)) {
  const crawled = JSON.parse(fs.readFileSync(crawledPath, "utf8"));
  lastCrawledAt = crawled.lastCrawledAt;
  for (const raw of crawled.entries || []) {
    if (seenSlugs.has(raw.slug) || seenUrls.has(canonicalUrl(raw.cardUrl))) {
      continue;
    }
    const cardVal = validateAgentCard(raw.card);
    const enriched = {
      ...raw,
      source: "crawled",
      signed: Boolean(raw.signed || (Array.isArray(raw.card.signatures) && raw.card.signatures.length > 0)),
      specVersion: cardVal.detectedVersion,
      v1Valid: cardVal.valid,
      errorCount: cardVal.errors.length,
      warningCount: cardVal.warnings.length,
    };
    entries.push(enriched);
    seenSlugs.add(enriched.slug);
    seenUrls.add(canonicalUrl(enriched.cardUrl));
  }
}

// Compute ecosystem stats
const byBinding = {};
const byCategory = {};
let online = 0;
let v1Compliant = 0;
let legacyV03 = 0;
let mixed = 0;
let streamingCount = 0;
let pushCount = 0;
let signedCount = 0;

const summaryEntries = entries.map((entry) => {
  const { card } = entry;
  const interfaces = extractInterfaces(card);
  const bindings = Array.from(new Set(interfaces.map((i) => i.protocolBinding)));
  const skills = Array.isArray(card.skills) ? card.skills : [];
  const tags = Array.from(
    new Set(
      skills.flatMap((s) => (Array.isArray(s?.tags) ? s.tags.filter((t) => typeof t === "string" && t.trim()) : []))
    )
  ).slice(0, 6);
  const streaming = Boolean(card.capabilities?.streaming);
  const pushNotifications = Boolean(card.capabilities?.pushNotifications);
  const extendedAgentCard = Boolean(
    card.capabilities?.extendedAgentCard || card.supportsAuthenticatedExtendedCard
  );
  const hasAuth = Boolean(card.securitySchemes && Object.keys(card.securitySchemes).length > 0);
  const signed = Boolean(entry.signed);

  if (!entry.health || entry.health.status === "online") online++;
  if (entry.v1Valid) v1Compliant++;
  if (entry.specVersion === "0.3-legacy") legacyV03++;
  if (entry.specVersion === "mixed") mixed++;
  if (streaming) streamingCount++;
  if (pushNotifications) pushCount++;
  if (signed) signedCount++;

  for (const b of bindings) {
    byBinding[b] = (byBinding[b] || 0) + 1;
  }
  byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;

  // Write per-card full JSON & SVG badge
  fs.writeFileSync(
    path.join(publicCardsDir, `${entry.slug}.json`),
    JSON.stringify(entry, null, 2) + "\n",
    "utf8"
  );
  fs.writeFileSync(path.join(publicBadgesDir, `${entry.slug}.svg`), renderBadgeSvg(entry), "utf8");

  return {
    slug: entry.slug,
    name: card.name,
    description: String(card.description || "").slice(0, 260),
    version: card.version || "1.0.0",
    organization:
      card.provider?.organization ||
      (() => {
        try {
          return new URL(entry.cardUrl).hostname.replace(/^www\./, "");
        } catch {
          return entry.slug;
        }
      })(),
    category: entry.category,
    status: entry.status,
    source: entry.source,
    cardUrl: entry.cardUrl,
    ...(entry.repoUrl ? { repoUrl: entry.repoUrl } : {}),
    updatedAt: entry.updatedAt,
    bindings,
    streaming,
    pushNotifications,
    extendedAgentCard,
    hasAuth,
    signed,
    skillCount: skills.length,
    tags,
    specVersion: entry.specVersion,
    v1Valid: entry.v1Valid,
    errorCount: entry.errorCount,
    warningCount: entry.warningCount,
    ...(entry.health ? { health: entry.health } : {}),
  };
});

const stats = {
  total: entries.length,
  online,
  v1Compliant,
  legacyV03,
  mixed,
  streamingCount,
  pushCount,
  signedCount,
  byBinding,
  byCategory,
  ...(lastCrawledAt ? { lastCrawledAt } : {}),
};

const generatedAt = new Date().toISOString();

const fullIndex = {
  schemaVersion: "1.0",
  generatedAt,
  total: entries.length,
  stats,
  entries,
};

const summaryIndex = {
  schemaVersion: "1.0",
  generatedAt,
  total: summaryEntries.length,
  stats,
  entries: summaryEntries,
};

fs.writeFileSync(
  path.join(generatedDir, "registry-summary.json"),
  JSON.stringify(summaryIndex, null, 2) + "\n",
  "utf8"
);
fs.writeFileSync(
  path.join(generatedDir, "registry-full.json"),
  JSON.stringify(fullIndex, null, 2) + "\n",
  "utf8"
);
fs.writeFileSync(
  path.join(publicRegistryDir, "summary.json"),
  JSON.stringify(summaryIndex, null, 2) + "\n",
  "utf8"
);
fs.writeFileSync(
  path.join(publicRegistryDir, "index.json"),
  JSON.stringify(fullIndex, null, 2) + "\n",
  "utf8"
);

console.log(
  `Built registry (${entries.length} cards, ${v1Compliant} v1.0 valid, ${legacyV03} v0.3 legacy) + ${entries.length} badges.`
);
