import test from "node:test";
import assert from "node:assert/strict";
import { validateAgentCard, validateRegistryEntry } from "../src/lib/a2a-validator.js";

const validV1Card = {
  name: "GeoRoute Planner Agent",
  description: "Computes multi-stop driving and transit routes with live traffic constraints.",
  version: "1.2.0",
  provider: {
    organization: "OpenRoute Reference",
    url: "https://a2acards.com",
  },
  supportedInterfaces: [
    {
      url: "https://georoute.example.com/a2a/v1",
      protocolBinding: "JSONRPC",
      protocolVersion: "1.0",
    },
  ],
  capabilities: {
    streaming: true,
    pushNotifications: false,
    extendedAgentCard: false,
  },
  defaultInputModes: ["text/plain", "application/json"],
  defaultOutputModes: ["application/json"],
  skills: [
    {
      id: "route-optimize",
      name: "Route Optimization",
      description: "Calculates optimal waypoint ordering and ETA.",
      tags: ["routing", "maps"],
      examples: ["Plan a 4-stop delivery loop in Seattle avoiding tolls"],
    },
  ],
};

test("accepts a compliant A2A v1.0 Agent Card", () => {
  const result = validateAgentCard(validV1Card);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.detectedVersion, "1.0");
});

test("rejects missing required fields and detects v0.3 legacy shape", () => {
  const legacyCard = {
    name: "Legacy Agent",
    description: "Uses v0.3 top-level url",
    version: "0.3.0",
    protocolVersion: "0.3.0",
    url: "https://legacy.example.com",
    preferredTransport: "JSONRPC",
    capabilities: { streaming: true },
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    skills: [
      {
        id: "echo",
        name: "Echo",
        description: "Echoes messages",
        tags: ["test"],
      },
    ],
  };

  const result = validateAgentCard(legacyCard);
  assert.equal(result.valid, false);
  assert.equal(result.detectedVersion, "0.3-legacy");
  assert.ok(result.errors.some((e) => e.path === "supportedInterfaces"));
  assert.ok(result.warnings.some((w) => w.path === "url"));
  assert.ok(result.warnings.some((w) => w.path === "protocolVersion"));
});

test("rejects duplicate skill ids", () => {
  const card = structuredClone(validV1Card);
  card.skills.push({ ...card.skills[0] });
  const result = validateAgentCard(card);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.path === "skills[1].id"));
});

test("validates registry wrapper and filename slug match", () => {
  const entry = {
    slug: "georoute-planner",
    category: "Travel & Commerce",
    status: "reference",
    cardUrl: "https://georoute.example.com/.well-known/agent-card.json",
    updatedAt: "2026-11-24",
    card: validV1Card,
  };

  const ok = validateRegistryEntry(entry, "georoute-planner");
  assert.equal(ok.valid, true);

  const mismatch = validateRegistryEntry(entry, "wrong-slug");
  assert.equal(mismatch.valid, false);
  assert.ok(mismatch.errors.some((e) => e.path === "slug"));
});
