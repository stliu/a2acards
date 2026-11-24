# a2acards.com

Open directory, A2A v1.0 Agent Card validator, and daily-crawled registry for the Agent2Agent (A2A) protocol (`/.well-known/agent-card.json`).

## Features

- **Live Crawled Directory**: Daily GitHub Actions crawler discovers and independently probes public HTTPS `/.well-known/agent-card.json` (and legacy `/.well-known/agent.json`) endpoints, recording live status, latency, and A2A v1.0 vs v0.3 compliance.
- **Pre-Rendered SEO Pages**: Static HTML pages generated at build time for every agent (`/cards/<slug>/`), every category (`/categories/<slug>/`), live ecosystem telemetry (`/stats/`), `/validator/`, and `/submit/`, alongside `sitemap.xml`, `robots.txt`, `llms.txt`, and IndexNow push notifications.
- **README Status Badges**: Static SVG badges generated for every indexed card at `/badges/<slug>.svg`.
- **A2A v1.0 Validator**: Browser schema validator with v0.3-to-v1.0 migration diagnostics and remote card fetcher.
- **Machine-Readable Endpoints**:
  - `/.well-known/agent-card.json` — self-describing A2A v1.0 Agent Card
  - `/registry/summary.json` — lightweight catalog with compliance & latency telemetry
  - `/registry/index.json` — full catalog with embedded Agent Card payloads
  - `/registry/cards/<slug>.json` — individual Agent Card JSON

## Local Development

```bash
npm install
npm run dev
```

Useful scripts:

- `npm run crawl` — Discover and probe live A2A Agent Cards into `registry/crawled/cards.json`.
- `npm run validate:cards` — Validate `public/.well-known/agent-card.json`, curated `registry/cards/*.json`, and `registry/crawled/cards.json`.
- `npm run build:registry` — Build lightweight summary index, per-card JSON files, and SVG badges.
- `npm test` — Run schema validator unit tests.
- `npm run build` — Build registry, typecheck, bundle static assets, and pre-render all SEO pages + `sitemap.xml` + `llms.txt`.

## Adding an Agent Card

- Open a GitHub Issue using the **Submit A2A Agent Card** template, OR
- Add a validated JSON manifest at `registry/cards/<slug>.json` via Pull Request (or generate one at `https://a2acards.com/submit/`).

## Automation & CI/CD

- `.github/workflows/ci.yml`: Validates cards, runs tests, and verifies production build on PRs.
- `.github/workflows/deploy.yml`: Builds, pre-renders SEO pages, deploys static assets to Cloudflare (`a2acards.com`), and notifies IndexNow.
- `.github/workflows/crawl.yml`: Runs daily at `06:15 UTC` to crawl and re-probe live endpoints, commits changes to `registry/crawled/`, and chains directly into `deploy.yml`.
