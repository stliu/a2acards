import fs from "node:fs";
import path from "node:path";
import {
  extractInterfaces,
  isRecognizableAgentCard,
  REGISTRY_CATEGORIES,
  validateAgentCard,
} from "../src/lib/a2a-validator.js";

const rootDir = path.resolve(import.meta.dirname, "..");
const sourcesPath = path.join(rootDir, "registry", "sources.json");
const curatedDir = path.join(rootDir, "registry", "cards");
const crawledDir = path.join(rootDir, "registry", "crawled");
const crawledCardsPath = path.join(crawledDir, "cards.json");
const crawledStatsPath = path.join(crawledDir, "stats.json");

const MAX_BODY_BYTES = 150 * 1024;
const FETCH_TIMEOUT_MS = 6500;
const CONCURRENCY = 12;
const USER_AGENT = "a2acards-crawler/1.0 (+https://a2acards.com)";

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /\.example(\.[a-z]+)?$/i,
  /^example\.(com|org|net)$/i,
  /^127\./,
  /^10\./,
  /^0\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^\[?::1\]?$/,
  /^\[?fc/i,
  /^\[?fd/i,
  /^\[?fe80:/i,
];

function isSafePublicHttpsUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:") return null;
    if (!parsed.hostname || !parsed.hostname.includes(".")) return null;
    if (BLOCKED_HOST_PATTERNS.some((re) => re.test(parsed.hostname))) return null;
    return parsed;
  } catch {
    return null;
  }
}

function canonicalKey(rawUrl) {
  const u = new URL(rawUrl);
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const pathname = u.pathname.replace(/\/+$/, "") || "/";
  return `${host}${pathname}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
}

function buildSlug(card, cardUrl, usedSlugs) {
  const u = new URL(cardUrl);
  const hostBase = u.hostname.replace(/^www\./, "").replace(/\.[a-z]{2,}$/i, "");
  const namePart = slugify(card.name);
  const hostPart = slugify(hostBase);
  let base = namePart.length >= 3 ? namePart : hostPart || "a2a-agent";
  if (usedSlugs.has(base)) {
    base = slugify(`${namePart}-${hostPart}`) || `${base}-agent`;
  }
  let candidate = base;
  let counter = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${base.slice(0, 50)}-${counter++}`;
  }
  usedSlugs.add(candidate);
  return candidate;
}

function classifyCategory(card, hintCategory) {
  if (hintCategory && REGISTRY_CATEGORIES.includes(hintCategory)) {
    return hintCategory;
  }
  const text = [
    card.name || "",
    card.description || "",
    ...(Array.isArray(card.skills)
      ? card.skills.flatMap((s) => [s?.name || "", s?.description || "", ...(s?.tags || [])])
      : []),
  ]
    .join(" ")
    .toLowerCase();

  const rules = [
    ["Coding & Dev", /\b(code|github|git|programming|developer|sdk|kubernetes|k8s|docker|security|cve|lint|schema|validator|debug|ci\/cd|repo|compiler|devops|sre|protocol|spec|well-known|mcp|api|software|audit|testing|cli|web)\b/g],
    ["Finance & Ops", /\b(finance|billing|invoice|payment|crypto|trading|stock|ledger|tax|defi|wallet|bank|erp|supply.?chain|freight|logistics|treasury|blockchain|solana|ethereum|usdc|x402|accounting)\b/g],
    ["Travel & Commerce", /\b(travel|flight|hotel|route|map|geo|booking|commerce|shop|store|marketplace|retail|order|delivery|weather|perfume|restaurant|product|catalog|ecommerce|shopping|cart)\b/g],
    ["Data & Research", /\b(sql|data|analytics|research|scholar|paper|arxiv|science|rag|knowledge|dataset|benchmark|stats|scraping|crawl|news|intelligence|academic|biotech|medical|health|survey)\b/g],
    ["Creative & Media", /\b(design|image|video|audio|music|creative|media|ui|ux|figma|brand|content|writing|copy|marketing|social|podcast|art|seo|blog|publishing|story)\b/g],
    ["Enterprise", /\b(enterprise|legal|contract|compliance|hr|recruiting|crm|sales|support|helpdesk|calendar|meeting|workflow|governance|identity|certificate|registry|directory|board)\b/g],
  ];

  let bestCat = "Enterprise";
  let bestScore = 0;
  for (const [cat, regex] of rules) {
    const matches = text.match(regex);
    const score = matches ? matches.length : 0;
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  }
  return bestCat;
}

async function fetchJsonWithLimit(url, maxBytes = MAX_BODY_BYTES) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain;q=0.5",
        "User-Agent": USER_AGENT,
      },
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      return { ok: false, httpStatus: res.status, latencyMs };
    }

    const finalParsed = isSafePublicHttpsUrl(res.url || url);
    if (!finalParsed) {
      return { ok: false, httpStatus: 400, latencyMs, error: "Unsafe redirect target" };
    }

    const contentLength = Number(res.headers.get("content-length") || "0");
    if (contentLength > maxBytes) {
      return { ok: false, httpStatus: res.status, latencyMs, error: "Payload exceeds 150KB limit" };
    }

    const text = await res.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) {
      return { ok: false, httpStatus: res.status, latencyMs, error: "Payload exceeds 150KB limit" };
    }

    const json = JSON.parse(text);
    return { ok: true, httpStatus: res.status, latencyMs, json, finalUrl: res.url || url };
  } catch (error) {
    return {
      ok: false,
      httpStatus: 0,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function probeAgentCard(candidate) {
  const primary = await fetchJsonWithLimit(candidate.url);
  if (primary.ok && isRecognizableAgentCard(primary.json)) {
    const legacyPath = candidate.url.endsWith("/.well-known/agent.json");
    return { ...primary, resolvedUrl: primary.finalUrl || candidate.url, legacyPath };
  }

  // Fallback from /.well-known/agent-card.json -> /.well-known/agent.json
  if (candidate.url.endsWith("/.well-known/agent-card.json")) {
    const altUrl = candidate.url.replace(/\/\.well-known\/agent-card\.json$/, "/.well-known/agent.json");
    const fallback = await fetchJsonWithLimit(altUrl);
    if (fallback.ok && isRecognizableAgentCard(fallback.json)) {
      return { ...fallback, resolvedUrl: fallback.finalUrl || altUrl, legacyPath: true };
    }
  }

  return primary;
}

async function discoverFromA2ARegistryFeed(feed) {
  const discovered = [];
  const pageSize = 50;
  const maxCandidates = feed.maxCandidates || 150;

  for (let offset = 0; offset < 800 && discovered.length < maxCandidates; offset += pageSize) {
    const url = `${feed.url}?limit=${pageSize}&offset=${offset}`;
    const res = await fetchJsonWithLimit(url, 2 * 1024 * 1024);
    if (!res.ok || !Array.isArray(res.json?.agents) || res.json.agents.length === 0) {
      break;
    }

    for (const agent of res.json.agents) {
      if (agent.hidden) continue;
      // Prefer healthy agents with an explicit wellKnownURI
      if (agent.is_healthy === false) continue;
      const uri = agent.wellKnownURI;
      const parsed = isSafePublicHttpsUrl(uri);
      if (!parsed) continue;
      const repoUrl = isSafePublicHttpsUrl(agent.repository)?.toString();
      discovered.push({
        url: parsed.toString(),
        repoUrl,
        sourceFeed: feed.name,
      });
      if (discovered.length >= maxCandidates) break;
    }

    if (res.json.agents.length < pageSize) break;
  }

  return discovered;
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
  return results;
}

async function main() {
  fs.mkdirSync(crawledDir, { recursive: true });
  const sources = JSON.parse(fs.readFileSync(sourcesPath, "utf8"));
  const maxFailuresBeforePrune = sources.maxFailuresBeforePrune ?? 14;
  const nowIso = new Date().toISOString();
  const todayDate = nowIso.slice(0, 10);

  // Load curated cards so crawler does not duplicate them
  const curatedKeys = new Set();
  const usedSlugs = new Set();
  for (const file of fs.readdirSync(curatedDir).filter((f) => f.endsWith(".json"))) {
    const entry = JSON.parse(fs.readFileSync(path.join(curatedDir, file), "utf8"));
    usedSlugs.add(entry.slug);
    if (isSafePublicHttpsUrl(entry.cardUrl)) {
      curatedKeys.add(canonicalKey(entry.cardUrl));
    }
  }

  // Load previous crawled cards to preserve slugs and failure counts (SEO stability)
  const existingByKey = new Map();
  if (fs.existsSync(crawledCardsPath)) {
    const prev = JSON.parse(fs.readFileSync(crawledCardsPath, "utf8"));
    for (const entry of prev.entries || []) {
      if (isSafePublicHttpsUrl(entry.cardUrl)) {
        existingByKey.set(canonicalKey(entry.cardUrl), entry);
      }
      if (entry.slug) usedSlugs.add(entry.slug);
    }
  }

  // Collect deduplicated candidates
  const candidateMap = new Map();
  function addCandidate(cand) {
    const parsed = isSafePublicHttpsUrl(cand.url);
    if (!parsed) return;
    const key = canonicalKey(parsed.toString());
    if (curatedKeys.has(key)) return;
    if (!candidateMap.has(key)) {
      candidateMap.set(key, { ...cand, url: parsed.toString() });
    }
  }

  // 1. Seed URLs
  for (const seed of sources.seeds || []) {
    addCandidate(seed);
  }

  // 2. Previously indexed crawled cards (keep re-checking health)
  for (const existing of existingByKey.values()) {
    addCandidate({
      url: existing.cardUrl,
      category: existing.category,
      repoUrl: existing.repoUrl,
    });
  }

  // 3. External discovery feeds
  for (const feed of sources.feeds || []) {
    if (feed.type === "a2aregistry-api") {
      try {
        const feedCandidates = await discoverFromA2ARegistryFeed(feed);
        console.log(`Discovered ${feedCandidates.length} healthy candidates from ${feed.name}`);
        for (const cand of feedCandidates) {
          addCandidate(cand);
        }
      } catch (err) {
        console.warn(`Feed ${feed.name} failed:`, err.message);
      }
    }
  }

  const candidates = Array.from(candidateMap.values());
  console.log(`Probing ${candidates.length} candidate A2A Agent Card URLs (concurrency=${CONCURRENCY})...`);

  const probeResults = await runPool(candidates, CONCURRENCY, async (cand) => {
    const res = await probeAgentCard(cand);
    return { cand, res };
  });

  const nextEntries = [];
  let onlineCount = 0;
  let unreachableKept = 0;
  let rejectedCount = 0;

  for (const { cand, res } of probeResults) {
    const key = canonicalKey(cand.url);
    const prev = existingByKey.get(key);

    if (res.ok && isRecognizableAgentCard(res.json)) {
      const card = res.json;
      const validation = validateAgentCard(card);
      const interfaces = extractInterfaces(card);
      if (interfaces.length === 0) {
        rejectedCount++;
        continue;
      }

      // Skip obvious spam/placeholder names
      if (/^(test|demo|hello world|my agent|example)$/i.test(String(card.name || "").trim())) {
        rejectedCount++;
        continue;
      }

      const slug = prev?.slug || buildSlug(card, res.resolvedUrl || cand.url, usedSlugs);
      const category = classifyCategory(card, cand.category || prev?.category);
      const signed = Array.isArray(card.signatures) && card.signatures.length > 0;
      const status = validation.valid ? "verified" : "community";

      nextEntries.push({
        slug,
        category,
        status,
        source: "crawled",
        cardUrl: res.resolvedUrl || cand.url,
        ...(cand.repoUrl ? { repoUrl: cand.repoUrl } : prev?.repoUrl ? { repoUrl: prev.repoUrl } : {}),
        updatedAt: todayDate,
        signed,
        specVersion: validation.detectedVersion,
        v1Valid: validation.valid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
        health: {
          status: "online",
          httpStatus: res.httpStatus,
          latencyMs: res.latencyMs,
          lastCheckedAt: nowIso,
          consecutiveFailures: 0,
          legacyPath: Boolean(res.legacyPath),
        },
        card,
      });
      onlineCount++;
    } else if (prev) {
      const failures = (prev.health?.consecutiveFailures || 0) + 1;
      if (failures <= maxFailuresBeforePrune) {
        nextEntries.push({
          ...prev,
          health: {
            status: "unreachable",
            httpStatus: res.httpStatus || 0,
            latencyMs: res.latencyMs,
            lastCheckedAt: nowIso,
            consecutiveFailures: failures,
            legacyPath: prev.health?.legacyPath || false,
          },
        });
        unreachableKept++;
      } else {
        rejectedCount++;
      }
    } else {
      rejectedCount++;
    }
  }

  // Sort deterministically: online first, v1 valid first, then slug
  nextEntries.sort((a, b) => {
    const aOnline = a.health?.status === "online" ? 1 : 0;
    const bOnline = b.health?.status === "online" ? 1 : 0;
    if (aOnline !== bOnline) return bOnline - aOnline;
    if (Boolean(a.v1Valid) !== Boolean(b.v1Valid)) return a.v1Valid ? -1 : 1;
    return a.slug.localeCompare(b.slug);
  });

  const payload = {
    schemaVersion: "1.0",
    lastCrawledAt: nowIso,
    total: nextEntries.length,
    entries: nextEntries,
  };

  fs.writeFileSync(crawledCardsPath, JSON.stringify(payload, null, 2) + "\n", "utf8");

  const stats = {
    lastCrawledAt: nowIso,
    probedCandidates: candidates.length,
    online: onlineCount,
    unreachableKept,
    rejectedOrSkipped: rejectedCount,
    v1Valid: nextEntries.filter((e) => e.v1Valid).length,
    legacyV03: nextEntries.filter((e) => e.specVersion === "0.3-legacy").length,
    mixed: nextEntries.filter((e) => e.specVersion === "mixed").length,
  };
  fs.writeFileSync(crawledStatsPath, JSON.stringify(stats, null, 2) + "\n", "utf8");

  console.log("Crawl complete:", JSON.stringify(stats, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
