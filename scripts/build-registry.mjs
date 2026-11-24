import fs from "node:fs";
import path from "node:path";
import { validateRegistryEntry } from "../src/lib/a2a-validator.js";

const rootDir = path.resolve(import.meta.dirname, "..");
const cardsDir = path.join(rootDir, "registry", "cards");
const generatedDir = path.join(rootDir, "src", "generated");
const publicRegistryDir = path.join(rootDir, "public", "registry");

fs.mkdirSync(generatedDir, { recursive: true });
fs.mkdirSync(publicRegistryDir, { recursive: true });

const files = fs
  .readdirSync(cardsDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

const entries = [];

for (const file of files) {
  const fullPath = path.join(cardsDir, file);
  const expectedSlug = file.replace(/\.json$/, "");
  const entry = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  const result = validateRegistryEntry(entry, expectedSlug);

  if (!result.valid) {
    console.error(`Cannot build registry: registry/cards/${file} failed validation.`);
    for (const err of result.errors) {
      console.error(`  - [${err.path}] ${err.message}`);
    }
    process.exit(1);
  }

  entries.push(entry);
}

const indexPayload = {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  total: entries.length,
  entries,
};

const serialized = JSON.stringify(indexPayload, null, 2) + "\n";
fs.writeFileSync(path.join(generatedDir, "registry.json"), serialized, "utf8");
fs.writeFileSync(path.join(publicRegistryDir, "index.json"), serialized, "utf8");

console.log(`Built registry index with ${entries.length} A2A Agent Cards.`);
