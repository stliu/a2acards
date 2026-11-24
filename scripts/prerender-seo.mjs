import fs from "node:fs";
import path from "node:path";
import { extractInterfaces, validateAgentCard } from "../src/lib/a2a-validator.js";

const rootDir = path.resolve(import.meta.dirname, "..");
const distDir = path.join(rootDir, "dist");
const fullRegistryPath = path.join(rootDir, "src", "generated", "registry-full.json");

const SITE_ORIGIN = "https://a2acards.com";
export const INDEXNOW_KEY = "8f4c1d9e7b3a4026a2acards91e5c7b2";

const CATEGORY_SLUGS = {
  "Coding & Dev": "coding-dev",
  "Data & Research": "data-research",
  "Finance & Ops": "finance-ops",
  "Travel & Commerce": "travel-commerce",
  Enterprise: "enterprise",
  "Creative & Media": "creative-media",
};

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function findCssHref(indexHtml) {
  const match = indexHtml.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/);
  return match ? match[1] : "";
}

function bindingChipHtml(binding) {
  let cls = "bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]";
  if (binding === "JSONRPC") cls = "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
  else if (binding === "HTTP+JSON") cls = "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]";
  else if (binding === "GRPC") cls = "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]";
  return `<span title="${esc(binding)}" class="inline-block max-w-[240px] truncate rounded border px-1.5 py-0.5 font-mono text-[11px] font-medium leading-4 ${cls}">${esc(binding)}</span>`;
}

function renderSharedHeader(totalCards, activePath) {
  const nav = [
    { href: "/", label: `Directory (${totalCards})`, key: "directory" },
    { href: "/validator/", label: "Validator", key: "validator" },
    { href: "/stats/", label: "Ecosystem Stats", key: "stats" },
    { href: "/submit/", label: "Submit Card", key: "submit" },
  ];
  return `<header class="sticky top-0 z-30 border-b border-[#E2E6EC] bg-white/95 backdrop-blur-sm">
    <div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
      <div class="flex items-center gap-5 min-w-0">
        <a href="/" class="flex items-center gap-2.5 shrink-0">
          <img src="/favicon.svg" alt="a2acards" width="28" height="28" class="h-7 w-7" />
          <span class="text-[15px] font-semibold text-[#111418]">a2acards</span>
          <span class="hidden sm:inline-block rounded border border-[#E2E6EC] bg-[#F7F8FA] px-1.5 py-0.5 font-mono text-[11px] text-[#4F5866]">A2A v1.0</span>
        </a>
        <nav class="hidden sm:flex items-center gap-1" aria-label="Primary">
          ${nav
            .map((item) => {
              const active = activePath === item.key;
              return `<a href="${item.href}" class="inline-flex h-8 items-center rounded-md px-2.5 text-[13px] font-medium ${
                active
                  ? "bg-[#111418] text-white"
                  : "text-[#4F5866] hover:bg-[#F1F3F6] hover:text-[#111418]"
              }">${esc(item.label)}</a>`;
            })
            .join("")}
        </nav>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <a href="/registry/index.json" class="hidden md:inline-flex h-8 items-center rounded-md border border-[#E2E6EC] bg-white px-2.5 font-mono text-[12px] text-[#4F5866] hover:border-[#98A2B3] hover:text-[#111418]">index.json</a>
        <a href="https://github.com/stliu/a2acards" target="_blank" rel="noreferrer" class="inline-flex h-8 items-center rounded-md border border-[#E2E6EC] bg-white px-2.5 text-[12px] font-medium text-[#111418] hover:border-[#98A2B3]">GitHub</a>
      </div>
    </div>
  </header>`;
}

function renderSharedFooter() {
  return `<footer class="mt-12 border-t border-[#E2E6EC] bg-white">
    <div class="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-5 text-[12px] text-[#6B7482] sm:flex-row sm:items-center sm:px-6">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <a href="/" class="font-medium text-[#111418]">a2acards.com</a>
        <a href="/.well-known/agent-card.json" class="font-mono hover:text-[#0A7C59] hover:underline">/.well-known/agent-card.json</a>
        <a href="/registry/index.json" class="font-mono hover:text-[#0A7C59] hover:underline">/registry/index.json</a>
        <a href="/llms.txt" class="font-mono hover:text-[#0A7C59] hover:underline">/llms.txt</a>
        <a href="/sitemap.xml" class="font-mono hover:text-[#0A7C59] hover:underline">/sitemap.xml</a>
      </div>
      <div class="flex items-center gap-4">
        <a href="/stats/" class="hover:text-[#111418] hover:underline">Ecosystem Stats</a>
        <a href="/validator/" class="hover:text-[#111418] hover:underline">Validator</a>
        <a href="https://a2a-protocol.org/latest/specification/" target="_blank" rel="noreferrer" class="hover:text-[#111418] hover:underline">A2A v1.0 Spec</a>
        <a href="https://github.com/stliu/a2acards" target="_blank" rel="noreferrer" class="hover:text-[#111418] hover:underline">GitHub</a>
      </div>
    </div>
  </footer>`;
}

function renderStaticShell({ title, description, canonicalUrl, cssHref, jsonLd, bodyHtml }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${esc(canonicalUrl)}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta property="og:site_name" content="a2acards.com" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(canonicalUrl)}" />
    <meta property="og:image" content="${SITE_ORIGIN}/og-card.svg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    ${cssHref ? `<link rel="stylesheet" href="${esc(cssHref)}" />` : ""}
    ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
  </head>
  <body class="bg-[#F7F8FA] text-[#111418] antialiased">
    ${bodyHtml}
  </body>
</html>\n`;
}

function renderCardPage(entry, related, totalCards, cssHref) {
  const { card } = entry;
  const interfaces = extractInterfaces(card);
  const validation = validateAgentCard(card);
  const skills = Array.isArray(card.skills) ? card.skills : [];
  const catSlug = CATEGORY_SLUGS[entry.category] || "enterprise";
  const canonicalUrl = `${SITE_ORIGIN}/cards/${entry.slug}/`;
  const org =
    card.provider?.organization ||
    (() => {
      try {
        return new URL(entry.cardUrl).hostname.replace(/^www\./, "");
      } catch {
        return entry.slug;
      }
    })();

  const title = `${card.name} — A2A Agent Card | a2acards.com`;
  const description = `${String(card.description || "").slice(0, 155)} Inspect /.well-known/agent-card.json, supported interfaces, skills, and A2A v1.0 schema compliance.`;
  const badgeMd = `[![A2A Agent Card](${SITE_ORIGIN}/badges/${entry.slug}.svg)](${canonicalUrl})`;
  const formattedJson = JSON.stringify(card, null, 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: card.name,
    description: card.description,
    applicationCategory: entry.category,
    softwareVersion: card.version || "1.0.0",
    url: canonicalUrl,
    operatingSystem: "Agent2Agent (A2A) Protocol",
    publisher: {
      "@type": "Organization",
      name: org,
      ...(card.provider?.url ? { url: card.provider.url } : {}),
    },
  };

  const isOnline = !entry.health || entry.health.status === "online";
  const specBadge = entry.v1Valid
    ? `<span class="inline-flex h-5 items-center rounded border border-[#A7F3D0] bg-[#ECFDF5] px-1.5 font-mono text-[11px] font-medium text-[#047857]">A2A v1.0 Valid</span>`
    : `<span class="inline-flex h-5 items-center rounded border border-[#FDE68A] bg-[#FFFBEB] px-1.5 font-mono text-[11px] font-medium text-[#B45309]">${esc(entry.specVersion || "v0.3")}</span>`;

  const healthBadge = isOnline
    ? `<span class="inline-flex h-5 items-center rounded border border-[#A7F3D0] bg-[#ECFDF5] px-1.5 font-mono text-[11px] font-medium text-[#0A7C59]">Online${entry.health?.latencyMs ? ` · ${entry.health.latencyMs}ms` : ""}</span>`
    : `<span class="inline-flex h-5 items-center rounded border border-[#E2E6EC] bg-[#F1F3F6] px-1.5 font-mono text-[11px] font-medium text-[#6B7482]">Unreachable</span>`;

  const bodyHtml = `
    ${renderSharedHeader(totalCards, "directory")}
    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
      <nav class="flex flex-wrap items-center gap-2 text-[12px] text-[#6B7482]" aria-label="Breadcrumb">
        <a href="/" class="hover:text-[#111418] hover:underline">Directory</a>
        <span>/</span>
        <a href="/categories/${catSlug}/" class="hover:text-[#111418] hover:underline">${esc(entry.category)}</a>
        <span>/</span>
        <span class="font-mono text-[#111418]">${esc(entry.slug)}</span>
      </nav>

      <section class="rounded-lg border border-[#E2E6EC] bg-white p-5 sm:p-6 space-y-4">
        <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div class="space-y-2 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              ${healthBadge}
              ${specBadge}
              <a href="/categories/${catSlug}/" class="rounded bg-[#F1F3F6] px-2 py-0.5 text-[11px] font-medium text-[#4F5866] hover:text-[#111418]">${esc(entry.category)}</a>
              <span class="font-mono text-[11px] text-[#6B7482]">v${esc(card.version || "1.0.0")}</span>
            </div>
            <h1 class="text-[24px] font-semibold text-[#111418]">${esc(card.name)}</h1>
            <p class="text-[13px] text-[#6B7482]">
              Published by <span class="font-medium text-[#111418]">${esc(org)}</span>
              ${card.provider?.url ? ` · <a href="${esc(card.provider.url)}" target="_blank" rel="noreferrer" class="text-[#0A7C59] hover:underline">${esc(card.provider.url.replace(/^https?:\/\//, ""))}</a>` : ""}
              ${entry.health?.lastCheckedAt ? ` · Verified ${esc(entry.health.lastCheckedAt.slice(0, 10))}` : ""}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <a href="/?card=${encodeURIComponent(entry.slug)}" class="inline-flex h-8 items-center rounded-md border border-[#D0D5DD] bg-white px-3 text-[12px] font-medium text-[#111418] hover:border-[#98A2B3]">Open Interactive Inspector</a>
            <a href="/registry/cards/${encodeURIComponent(entry.slug)}.json" class="inline-flex h-8 items-center rounded-md bg-[#111418] px-3 font-mono text-[12px] font-medium text-white hover:bg-[#272D36]">Download JSON</a>
          </div>
        </div>

        <p class="text-[14px] leading-relaxed text-[#2C333F]">${esc(card.description)}</p>

        <div class="space-y-2 pt-2 border-t border-[#EEF0F4]">
          <div class="text-[11px] font-semibold uppercase text-[#6B7482]">Well-Known Discovery URI</div>
          <div class="rounded-md border border-[#E2E6EC] bg-[#F7F8FA] px-3 py-2 font-mono text-[12px] break-all text-[#111418]">
            <a href="${esc(entry.cardUrl)}" target="_blank" rel="noreferrer" class="hover:text-[#0A7C59] hover:underline">${esc(entry.cardUrl)}</a>
          </div>
          <div class="rounded-md bg-[#111418] px-3 py-2 font-mono text-[12px] overflow-x-auto text-[#E5E7EB]">
            <code>curl -s ${esc(entry.cardUrl)} | jq .</code>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div class="space-y-6 lg:col-span-8">
          <section class="rounded-lg border border-[#E2E6EC] bg-white p-5 space-y-3">
            <h2 class="text-[14px] font-semibold text-[#111418]">Supported Interfaces</h2>
            <div class="overflow-x-auto rounded-md border border-[#E2E6EC]">
              <table class="w-full border-collapse text-left text-[12px]">
                <thead class="border-b border-[#E2E6EC] bg-[#F7F8FA] text-[#6B7482]">
                  <tr>
                    <th class="px-3 py-2 font-medium">#</th>
                    <th class="px-3 py-2 font-medium">Binding</th>
                    <th class="px-3 py-2 font-medium">Protocol</th>
                    <th class="px-3 py-2 font-medium">Endpoint URL</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#EEF0F4]">
                  ${interfaces
                    .map(
                      (iface, i) => `<tr>
                    <td class="px-3 py-2 font-mono text-[#6B7482]">${i + 1}</td>
                    <td class="px-3 py-2">${bindingChipHtml(iface.protocolBinding)}</td>
                    <td class="px-3 py-2 font-mono text-[#111418]">${esc(iface.protocolVersion)}</td>
                    <td class="px-3 py-2 font-mono break-all text-[#4F5866]">${esc(iface.url)}</td>
                  </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </section>

          <section class="rounded-lg border border-[#E2E6EC] bg-white p-5 space-y-3">
            <h2 class="text-[14px] font-semibold text-[#111418]">Declared Skills (${skills.length})</h2>
            ${
              skills.length === 0
                ? `<p class="text-[13px] text-[#6B7482]">No skills declared in this Agent Card.</p>`
                : `<div class="divide-y divide-[#EEF0F4] rounded-md border border-[#E2E6EC]">
                ${skills
                  .map(
                    (skill) => `<div class="p-3.5 space-y-2">
                  <div class="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 class="text-[14px] font-semibold text-[#111418]">${esc(skill.name || skill.id)}</h3>
                    <code class="rounded bg-[#F1F3F6] px-1.5 py-0.5 text-[11px] text-[#4F5866]">${esc(skill.id || "")}</code>
                  </div>
                  <p class="text-[13px] leading-relaxed text-[#4F5866]">${esc(skill.description || "")}</p>
                  ${
                    Array.isArray(skill.tags) && skill.tags.length > 0
                      ? `<div class="flex flex-wrap gap-1.5">${skill.tags
                          .slice(0, 10)
                          .map((t) => `<span class="rounded bg-[#F7F8FA] px-1.5 py-0.5 font-mono text-[11px] text-[#4F5866]">#${esc(t)}</span>`)
                          .join("")}</div>`
                      : ""
                  }
                  ${
                    Array.isArray(skill.examples) && skill.examples.length > 0
                      ? `<ul class="space-y-1 pt-1">${skill.examples
                          .slice(0, 4)
                          .map((ex) => `<li class="rounded border border-[#EEF0F4] bg-[#F7F8FA] px-2.5 py-1.5 text-[12px] text-[#2C333F]">&ldquo;${esc(ex)}&rdquo;</li>`)
                          .join("")}</ul>`
                      : ""
                  }
                </div>`
                  )
                  .join("")}
              </div>`
            }
          </section>

          <section class="rounded-lg border border-[#E2E6EC] bg-white p-5 space-y-3">
            <h2 class="text-[14px] font-semibold text-[#111418]">Raw agent-card.json</h2>
            <pre class="max-h-[480px] overflow-auto rounded-md border border-[#E2E6EC] bg-[#F7F8FA] p-4 font-mono text-[12px] leading-relaxed text-[#111418]">${esc(formattedJson)}</pre>
          </section>
        </div>

        <aside class="space-y-6 lg:col-span-4">
          <section class="rounded-lg border border-[#E2E6EC] bg-white p-5 space-y-3">
            <h2 class="text-[14px] font-semibold text-[#111418]">A2A v1.0 Compliance</h2>
            <div class="text-[13px] text-[#4F5866]">
              Detected schema: <code class="rounded bg-[#F1F3F6] px-1.5 py-0.5 text-[12px] text-[#111418]">${esc(validation.detectedVersion)}</code>
              · ${validation.errors.length} errors, ${validation.warnings.length} warnings
            </div>
            ${
              validation.errors.length + validation.warnings.length > 0
                ? `<ul class="space-y-1.5 text-[12px]">
                ${[...validation.errors, ...validation.warnings]
                  .slice(0, 6)
                  .map(
                    (issue) => `<li class="rounded border ${
                      issue.severity === "error"
                        ? "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
                        : "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
                    } px-2.5 py-1.5"><code class="font-semibold">${esc(issue.path)}</code>: ${esc(issue.message)}</li>`
                  )
                  .join("")}
              </ul>`
                : `<p class="rounded border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-[12px] text-[#065F46]">Passes all A2A v1.0 required schema checks with zero warnings.</p>`
            }
            <a href="/validator/" class="inline-flex text-[12px] font-medium text-[#0A7C59] hover:underline">Test in A2A v1.0 Validator →</a>
          </section>

          <section class="rounded-lg border border-[#E2E6EC] bg-white p-5 space-y-3">
            <h2 class="text-[14px] font-semibold text-[#111418]">README Badge</h2>
            <div>
              <img src="/badges/${encodeURIComponent(entry.slug)}.svg" alt="${esc(card.name)} A2A Agent Card badge" height="20" />
            </div>
            <pre class="overflow-x-auto rounded border border-[#E2E6EC] bg-[#F7F8FA] p-2.5 font-mono text-[11px] text-[#111418]">${esc(badgeMd)}</pre>
          </section>

          ${
            related.length > 0
              ? `<section class="rounded-lg border border-[#E2E6EC] bg-white p-5 space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-[14px] font-semibold text-[#111418]">More in ${esc(entry.category)}</h2>
              <a href="/categories/${catSlug}/" class="text-[12px] text-[#0A7C59] hover:underline">View all</a>
            </div>
            <ul class="divide-y divide-[#EEF0F4]">
              ${related
                .map(
                  (rel) => `<li class="py-2.5">
                <a href="/cards/${encodeURIComponent(rel.slug)}/" class="block group">
                  <div class="text-[13px] font-medium text-[#111418] group-hover:text-[#0A7C59]">${esc(rel.card.name)}</div>
                  <div class="mt-0.5 line-clamp-1 text-[12px] text-[#6B7482]">${esc(rel.card.description)}</div>
                </a>
              </li>`
                )
                .join("")}
            </ul>
          </section>`
              : ""
          }
        </aside>
      </div>
    </main>
    ${renderSharedFooter()}
  `;

  return renderStaticShell({ title, description, canonicalUrl, cssHref, jsonLd, bodyHtml });
}

function renderCategoryPage(category, catSlug, items, totalCards, cssHref) {
  const canonicalUrl = `${SITE_ORIGIN}/categories/${catSlug}/`;
  const title = `${category} A2A Agent Cards (${items.length}) | a2acards.com`;
  const description = `Browse ${items.length} live verified ${category} AI agents implementing the Agent2Agent (A2A) protocol (/.well-known/agent-card.json).`;

  const bodyHtml = `
    ${renderSharedHeader(totalCards, "directory")}
    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
      <div class="border-b border-[#E2E6EC] pb-4 space-y-1">
        <div class="text-[12px] text-[#6B7482]"><a href="/" class="hover:underline">Directory</a> / ${esc(category)}</div>
        <h1 class="text-[22px] font-semibold text-[#111418]">${esc(category)} A2A Agents</h1>
        <p class="text-[14px] text-[#4F5866]">${items.length} indexed Agent2Agent (A2A) Agent Cards in ${esc(category)}.</p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        ${items
          .map((entry) => {
            const bindings = Array.from(new Set(extractInterfaces(entry.card).map((i) => i.protocolBinding)));
            return `<a href="/cards/${encodeURIComponent(entry.slug)}/" class="flex flex-col justify-between rounded-lg border border-[#E2E6EC] bg-white p-4 hover:border-[#98A2B3]">
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <span class="rounded border px-1.5 py-0.5 font-mono text-[11px] ${
                    entry.v1Valid
                      ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]"
                      : "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                  }">${entry.v1Valid ? "v1.0" : esc(entry.specVersion || "v0.3")}</span>
                  <span class="font-mono text-[11px] text-[#6B7482]">v${esc(entry.card.version || "1.0.0")}</span>
                </div>
                <h2 class="text-[15px] font-semibold text-[#111418]">${esc(entry.card.name)}</h2>
                <p class="line-clamp-2 text-[13px] text-[#4F5866]">${esc(entry.card.description)}</p>
              </div>
              <div class="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[#EEF0F4] pt-3">
                ${bindings.map(bindingChipHtml).join("")}
              </div>
            </a>`;
          })
          .join("")}
      </div>
    </main>
    ${renderSharedFooter()}
  `;

  return renderStaticShell({ title, description, canonicalUrl, cssHref, bodyHtml });
}

function renderStatsPage(fullIndex, cssHref) {
  const { stats, entries } = fullIndex;
  const canonicalUrl = `${SITE_ORIGIN}/stats/`;
  const title = `A2A Protocol Ecosystem Stats & v1.0 Adoption Report | a2acards.com`;
  const description = `Live daily telemetry across ${stats.total} verified public A2A Agent Cards: ${stats.v1Compliant} A2A v1.0 compliant, ${stats.legacyV03} legacy v0.3, protocol bindings, and capabilities.`;

  const pct = (n) => (stats.total > 0 ? `${Math.round((n / stats.total) * 100)}%` : "0%");
  const fastest = entries
    .filter((e) => e.v1Valid && e.health?.status === "online" && typeof e.health?.latencyMs === "number")
    .sort((a, b) => a.health.latencyMs - b.health.latencyMs)
    .slice(0, 12);

  const bodyHtml = `
    ${renderSharedHeader(stats.total, "stats")}
    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
      <div class="border-b border-[#E2E6EC] pb-4 space-y-1">
        <h1 class="text-[22px] font-semibold text-[#111418]">A2A Protocol Ecosystem Report</h1>
        <p class="text-[14px] text-[#4F5866]">
          Automated daily scan of public <code class="rounded bg-[#E9ECF1] px-1.5 py-0.5 text-[12px]">/.well-known/agent-card.json</code> endpoints.
          ${stats.lastCrawledAt ? `Last updated <span class="font-mono">${esc(stats.lastCrawledAt.slice(0, 16).replace("T", " "))} UTC</span>.` : ""}
        </p>
      </div>

      <section class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div class="rounded-lg border border-[#E2E6EC] bg-white p-4">
          <div class="text-[12px] text-[#6B7482]">Indexed Live Agents</div>
          <div class="mt-1 font-mono text-[26px] font-semibold text-[#111418]">${stats.total}</div>
          <div class="mt-0.5 text-[12px] text-[#0A7C59]">${stats.online} online today</div>
        </div>
        <div class="rounded-lg border border-[#E2E6EC] bg-white p-4">
          <div class="text-[12px] text-[#6B7482]">A2A v1.0 Compliant</div>
          <div class="mt-1 font-mono text-[26px] font-semibold text-[#0A7C59]">${stats.v1Compliant}</div>
          <div class="mt-0.5 text-[12px] text-[#4F5866]">${pct(stats.v1Compliant)} of indexed cards</div>
        </div>
        <div class="rounded-lg border border-[#E2E6EC] bg-white p-4">
          <div class="text-[12px] text-[#6B7482]">Legacy v0.3 Cards</div>
          <div class="mt-1 font-mono text-[26px] font-semibold text-[#B45309]">${stats.legacyV03}</div>
          <div class="mt-0.5 text-[12px] text-[#4F5866]">${pct(stats.legacyV03)} still on top-level url</div>
        </div>
        <div class="rounded-lg border border-[#E2E6EC] bg-white p-4">
          <div class="text-[12px] text-[#6B7482]">Streaming (SSE)</div>
          <div class="mt-1 font-mono text-[26px] font-semibold text-[#1D4ED8]">${stats.streamingCount}</div>
          <div class="mt-0.5 text-[12px] text-[#4F5866]">${pct(stats.streamingCount)} · Push: ${stats.pushCount}</div>
        </div>
      </section>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section class="rounded-lg border border-[#E2E6EC] bg-white p-5 space-y-3">
          <h2 class="text-[14px] font-semibold text-[#111418]">Protocol Bindings</h2>
          <div class="space-y-2">
            ${Object.entries(stats.byBinding)
              .sort((a, b) => b[1] - a[1])
              .map(
                ([binding, count]) => `<div class="flex items-center justify-between text-[13px]">
                <div>${bindingChipHtml(binding)}</div>
                <span class="shrink-0 font-mono text-[#111418]">${count} (${pct(count)})</span>
              </div>`
              )
              .join("")}
          </div>
        </section>

        <section class="rounded-lg border border-[#E2E6EC] bg-white p-5 space-y-3">
          <h2 class="text-[14px] font-semibold text-[#111418]">Agents by Category</h2>
          <div class="space-y-2">
            ${Object.entries(stats.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => {
                const slug = CATEGORY_SLUGS[cat] || "enterprise";
                return `<div class="flex items-center justify-between text-[13px]">
                  <a href="/categories/${slug}/" class="font-medium text-[#111418] hover:text-[#0A7C59] hover:underline">${esc(cat)}</a>
                  <span class="font-mono text-[#4F5866]">${count} (${pct(count)})</span>
                </div>`;
              })
              .join("")}
          </div>
        </section>
      </div>

      <section class="rounded-lg border border-[#E2E6EC] bg-white p-5 space-y-3">
        <h2 class="text-[14px] font-semibold text-[#111418]">Fastest Verified A2A v1.0 Endpoints</h2>
        <div class="overflow-x-auto rounded-md border border-[#E2E6EC]">
          <table class="w-full border-collapse text-left text-[12px]">
            <thead class="border-b border-[#E2E6EC] bg-[#F7F8FA] text-[#6B7482]">
              <tr>
                <th class="px-3 py-2 font-medium">Agent</th>
                <th class="px-3 py-2 font-medium">Category</th>
                <th class="px-3 py-2 font-medium">Discovery URL</th>
                <th class="px-3 py-2 font-medium">Latency</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#EEF0F4]">
              ${fastest
                .map(
                  (e) => `<tr>
                <td class="px-3 py-2 font-medium"><a href="/cards/${encodeURIComponent(e.slug)}/" class="text-[#111418] hover:text-[#0A7C59] hover:underline">${esc(e.card.name)}</a></td>
                <td class="px-3 py-2 text-[#4F5866]">${esc(e.category)}</td>
                <td class="px-3 py-2 font-mono text-[#4F5866] break-all">${esc(e.cardUrl)}</td>
                <td class="px-3 py-2 font-mono text-[#0A7C59]">${e.health.latencyMs}ms</td>
              </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>
    </main>
    ${renderSharedFooter()}
  `;

  return renderStaticShell({ title, description, canonicalUrl, cssHref, bodyHtml });
}

function writeRouteSpaHtml(baseIndexHtml, routePath, { title, description, canonicalUrl }) {
  let html = baseIndexHtml;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${esc(description)}" />`
  );
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${esc(canonicalUrl)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${esc(title)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${esc(description)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${esc(canonicalUrl)}" />`
  );
  const outDir = path.join(distDir, routePath);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
}

function main() {
  const fullIndex = JSON.parse(fs.readFileSync(fullRegistryPath, "utf8"));
  const baseIndexHtml = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
  const cssHref = findCssHref(baseIndexHtml);
  const today = new Date().toISOString().slice(0, 10);

  const sitemapEntries = [
    { loc: `${SITE_ORIGIN}/`, lastmod: today, priority: "1.0" },
    { loc: `${SITE_ORIGIN}/validator/`, lastmod: today, priority: "0.9" },
    { loc: `${SITE_ORIGIN}/stats/`, lastmod: today, priority: "0.9" },
    { loc: `${SITE_ORIGIN}/submit/`, lastmod: today, priority: "0.8" },
  ];

  // 1. Pre-render SPA tool routes with tailored SEO meta
  writeRouteSpaHtml(baseIndexHtml, "validator", {
    title: "A2A v1.0 Agent Card Validator & v0.3 Migration Checker | a2acards.com",
    description:
      "Validate /.well-known/agent-card.json manifests against the A2A v1.0 schema, detect deprecated v0.3 fields, and preview directory cards.",
    canonicalUrl: `${SITE_ORIGIN}/validator/`,
  });
  writeRouteSpaHtml(baseIndexHtml, "submit", {
    title: "Submit an A2A Agent Card to a2acards.com | Open Registry",
    description:
      "Generate a validated A2A v1.0 registry manifest and submit your /.well-known/agent-card.json to a2acards.com via GitHub PR.",
    canonicalUrl: `${SITE_ORIGIN}/submit/`,
  });

  // 2. Pre-render /stats/
  fs.mkdirSync(path.join(distDir, "stats"), { recursive: true });
  fs.writeFileSync(
    path.join(distDir, "stats", "index.html"),
    renderStatsPage(fullIndex, cssHref),
    "utf8"
  );

  // 3. Pre-render /categories/<slug>/
  const byCat = new Map();
  for (const entry of fullIndex.entries) {
    const list = byCat.get(entry.category) || [];
    list.push(entry);
    byCat.set(entry.category, list);
  }
  for (const [catName, catSlug] of Object.entries(CATEGORY_SLUGS)) {
    const items = byCat.get(catName) || [];
    const catDir = path.join(distDir, "categories", catSlug);
    fs.mkdirSync(catDir, { recursive: true });
    fs.writeFileSync(
      path.join(catDir, "index.html"),
      renderCategoryPage(catName, catSlug, items, fullIndex.total, cssHref),
      "utf8"
    );
    sitemapEntries.push({
      loc: `${SITE_ORIGIN}/categories/${catSlug}/`,
      lastmod: today,
      priority: "0.8",
    });
  }

  // 4. Pre-render /cards/<slug>/
  for (const entry of fullIndex.entries) {
    const sameCat = (byCat.get(entry.category) || [])
      .filter((e) => e.slug !== entry.slug)
      .slice(0, 5);
    const cardDir = path.join(distDir, "cards", entry.slug);
    fs.mkdirSync(cardDir, { recursive: true });
    fs.writeFileSync(
      path.join(cardDir, "index.html"),
      renderCardPage(entry, sameCat, fullIndex.total, cssHref),
      "utf8"
    );
    sitemapEntries.push({
      loc: `${SITE_ORIGIN}/cards/${entry.slug}/`,
      lastmod: entry.updatedAt || today,
      priority: entry.v1Valid ? "0.7" : "0.6",
    });
  }

  // 5. Write sitemap.xml
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (u) => `  <url>
    <loc>${esc(u.loc)}</loc>
    <lastmod>${esc(u.lastmod)}</lastmod>
    <priority>${esc(u.priority)}</priority>
  </url>`
  )
  .join("\n")}
</urlset>\n`;
  fs.writeFileSync(path.join(distDir, "sitemap.xml"), sitemapXml, "utf8");

  // 6. Write robots.txt
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;
  fs.writeFileSync(path.join(distDir, "robots.txt"), robotsTxt, "utf8");

  // 7. Write IndexNow key file
  fs.writeFileSync(path.join(distDir, `${INDEXNOW_KEY}.txt`), `${INDEXNOW_KEY}\n`, "utf8");

  // 8. Write llms.txt for AI search engines and agent discovery
  const topVerified = fullIndex.entries
    .filter((e) => e.v1Valid && (!e.health || e.health.status === "online"))
    .slice(0, 25);

  const llmsTxt = `# a2acards.com

> Open directory, A2A v1.0 Agent Card validator, and daily-updated index of live Agent2Agent (A2A) protocol endpoints (/.well-known/agent-card.json).

## Machine-Readable Endpoints

- [Registry Agent Card](${SITE_ORIGIN}/.well-known/agent-card.json): Self-describing A2A v1.0 Agent Card for a2acards.com
- [Full Registry JSON](${SITE_ORIGIN}/registry/index.json): Complete catalog of ${fullIndex.total} indexed A2A Agent Cards
- [Summary Index JSON](${SITE_ORIGIN}/registry/summary.json): Lightweight index with compliance and latency telemetry
- [A2A v1.0 Validator](${SITE_ORIGIN}/validator/): Browser schema validator and v0.3-to-v1.0 migration checker
- [Ecosystem Stats](${SITE_ORIGIN}/stats/): Daily A2A v1.0 vs v0.3 adoption telemetry (${fullIndex.stats.v1Compliant}/${fullIndex.total} v1.0 compliant)

## Categories

${Object.entries(CATEGORY_SLUGS)
  .map(
    ([name, slug]) =>
      `- [${name}](${SITE_ORIGIN}/categories/${slug}/): ${(byCat.get(name) || []).length} agents`
  )
  .join("\n")}

## Sample Verified A2A v1.0 Agents

${topVerified
  .map(
    (e) =>
      `- [${e.card.name}](${SITE_ORIGIN}/cards/${e.slug}/): ${String(e.card.description || "")
        .replace(/\s+/g, " ")
        .slice(0, 140)} (${e.cardUrl})`
  )
  .join("\n")}
`;
  fs.writeFileSync(path.join(distDir, "llms.txt"), llmsTxt, "utf8");

  console.log(
    `Pre-rendered ${fullIndex.entries.length} card pages, ${Object.keys(CATEGORY_SLUGS).length} category pages, /stats/, /validator/, /submit/, sitemap.xml (${sitemapEntries.length} URLs), robots.txt, and llms.txt.`
  );
}

main();
