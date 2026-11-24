import fs from "node:fs";
import path from "node:path";
import { validateAgentCard, validateRegistryEntry } from "../src/lib/a2a-validator.js";

const rootDir = path.resolve(import.meta.dirname, "..");
const cardsDir = path.join(rootDir, "registry", "cards");
const selfCardPath = path.join(rootDir, "public", ".well-known", "agent-card.json");

let failed = false;

// Validate site's own well-known card
if (fs.existsSync(selfCardPath)) {
  const selfCard = JSON.parse(fs.readFileSync(selfCardPath, "utf8"));
  const result = validateAgentCard(selfCard);
  if (!result.valid) {
    failed = true;
    console.error("FAIL public/.well-known/agent-card.json");
    for (const err of result.errors) {
      console.error(`  - [${err.path}] ${err.message}`);
    }
  } else {
    console.log("OK   public/.well-known/agent-card.json (A2A v1.0)");
  }
}

const files = fs
  .readdirSync(cardsDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

if (files.length === 0) {
  console.error("No card files found in registry/cards/");
  process.exit(1);
}

const seenSlugs = new Set();

for (const file of files) {
  const fullPath = path.join(cardsDir, file);
  const expectedSlug = file.replace(/\.json$/, "");
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    failed = true;
    console.error(`FAIL registry/cards/${file}: Invalid JSON (${error.message})`);
    continue;
  }

  const result = validateRegistryEntry(parsed, expectedSlug);
  if (seenSlugs.has(parsed.slug)) {
    failed = true;
    console.error(`FAIL registry/cards/${file}: Duplicate slug "${parsed.slug}"`);
  }
  seenSlugs.add(parsed.slug);

  if (!result.valid) {
    failed = true;
    console.error(`FAIL registry/cards/${file}`);
    for (const err of result.errors) {
      console.error(`  - [${err.path}] ${err.message}`);
    }
  } else {
    const warnSuffix = result.warnings.length > 0 ? ` (${result.warnings.length} warnings)` : "";
    console.log(`OK   registry/cards/${file}${warnSuffix}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`\nValidated ${files.length} registry cards successfully.`);
