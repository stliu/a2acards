# a2acards.com

Open static registry and A2A v1.0 Agent Card validator for the Agent2Agent (A2A) protocol (`/.well-known/agent-card.json`).

## Features

- **Directory**: Browse and filter A2A v1.0 Agent Cards by category, protocol binding (`JSONRPC`, `HTTP+JSON`, `GRPC`), capabilities (`streaming`, `pushNotifications`, JWS signed), and skill tags.
- **Card Inspector**: Inspect `supportedInterfaces`, security schemes, MIME modes, skills, example prompts, `curl` discovery snippet, and raw `agent-card.json`.
- **A2A v1.0 Validator**: Validate Agent Card JSON against A2A v1.0 required fields, detect legacy v0.3 fields (`url`, top-level `protocolVersion`, `preferredTransport`), or fetch a remote `/.well-known/agent-card.json`.
- **Machine-Readable Endpoints**:
  - `/.well-known/agent-card.json` (self-describing Agent Card)
  - `/registry/index.json` (build-generated static JSON catalog from `registry/cards/*.json`)

## Local Development

```bash
npm install
npm run dev
```

Useful scripts:

- `npm run validate:cards` — Validate `public/.well-known/agent-card.json` and every manifest in `registry/cards/*.json`.
- `npm run build:registry` — Compile `registry/cards/*.json` into `src/generated/registry.json` and `public/registry/index.json`.
- `npm test` — Run schema validator unit tests.
- `npm run build` — Validate registry, typecheck, and build static assets into `dist/`.

## Adding an Agent Card

1. Add a JSON file at `registry/cards/<slug>.json` (or generate one in the **Submit Card** tab).
2. Open a Pull Request against `main`.
3. `.github/workflows/ci.yml` validates the card schema, runs tests, and builds the site.
4. Merging to `main` triggers `.github/workflows/deploy.yml` to deploy `dist/` to Cloudflare Workers Static Assets.

## GitHub Actions -> Cloudflare CI/CD Setup

Deployment is handled by `.github/workflows/deploy.yml` using `cloudflare/wrangler-action@v3` and `wrangler.jsonc`.

Configure two GitHub repository secrets in **Settings -> Secrets and variables -> Actions**:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token with **Account -> Workers Scripts: Edit**, **Zone -> Workers Routes: Edit**, **Zone -> DNS: Edit**, and **Zone -> Zone: Read** for `a2acards.com` |

With `custom_domain: true` configured in `wrangler.jsonc`, Wrangler automatically provisions DNS and SSL certificates for `a2acards.com` on deploy (`www.a2acards.com` already 301-redirects to `https://a2acards.com/`).
