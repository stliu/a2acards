import { useMemo, useState } from "react";
import { Check, Copy, Download, ExternalLink, GitPullRequest } from "lucide-react";
import { REGISTRY_CATEGORIES, validateRegistryEntry } from "../lib/a2a-schema";
import type { RegistryCategory } from "../lib/a2a-schema";

export function SubmitView() {
  const [slug, setSlug] = useState("my-a2a-agent");
  const [category, setCategory] = useState<RegistryCategory>("Coding & Dev");
  const [name, setName] = useState("My A2A Agent");
  const [version, setVersion] = useState("1.0.0");
  const [organization, setOrganization] = useState("Acme Labs");
  const [orgUrl, setOrgUrl] = useState("https://acme.example.com");
  const [cardUrl, setCardUrl] = useState("https://agent.acme.example.com/.well-known/agent-card.json");
  const [endpointUrl, setEndpointUrl] = useState("https://agent.acme.example.com/a2a/v1");
  const [repoUrl, setRepoUrl] = useState("https://github.com/stliu/a2acards");
  const [protocolBinding, setProtocolBinding] = useState<"JSONRPC" | "HTTP+JSON" | "GRPC">("JSONRPC");
  const [streaming, setStreaming] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [description, setDescription] = useState(
    "Automates targeted workflows via A2A v1.0 tasks and returns structured JSON artifacts."
  );
  const [skillId, setSkillId] = useState("primary-workflow");
  const [skillName, setSkillName] = useState("Primary Workflow");
  const [skillDescription, setSkillDescription] = useState(
    "Executes the agent's core domain workflow and reports progress updates."
  );
  const [skillTags, setSkillTags] = useState("automation, a2a, workflow");
  const [copied, setCopied] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const generated = useMemo(() => {
    const cleanSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const parsedTags = skillTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const entry = {
      slug: cleanSlug || "my-a2a-agent",
      category,
      status: "community" as const,
      cardUrl: cardUrl.trim(),
      ...(repoUrl.trim() ? { repoUrl: repoUrl.trim() } : {}),
      updatedAt: today,
      card: {
        name: name.trim(),
        description: description.trim(),
        version: version.trim(),
        provider: {
          organization: organization.trim(),
          url: orgUrl.trim(),
        },
        supportedInterfaces: [
          {
            url: endpointUrl.trim(),
            protocolBinding,
            protocolVersion: "1.0",
          },
        ],
        capabilities: {
          streaming,
          pushNotifications,
          extendedAgentCard: false,
        },
        defaultInputModes: ["text/plain", "application/json"],
        defaultOutputModes: ["application/json", "text/plain"],
        skills: [
          {
            id: skillId.trim(),
            name: skillName.trim(),
            description: skillDescription.trim(),
            tags: parsedTags.length > 0 ? parsedTags : ["a2a"],
          },
        ],
      },
    };

    const validation = validateRegistryEntry(entry, entry.slug);
    const json = JSON.stringify(entry, null, 2) + "\n";
    return { entry, validation, json };
  }, [
    slug,
    category,
    name,
    version,
    organization,
    orgUrl,
    cardUrl,
    endpointUrl,
    repoUrl,
    protocolBinding,
    streaming,
    pushNotifications,
    description,
    skillId,
    skillName,
    skillDescription,
    skillTags,
    today,
  ]);

  const targetPath = `registry/cards/${generated.entry.slug}.json`;
  const githubNewFileUrl = `https://github.com/stliu/a2acards/new/main?filename=${encodeURIComponent(
    targetPath
  )}&value=${encodeURIComponent(generated.json)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generated.json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  }

  function handleDownload() {
    const blob = new Blob([generated.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${generated.entry.slug}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* PR workflow strip */}
      <div className="grid grid-cols-1 gap-4 border-b border-[#E2E6EC] pb-5 md:grid-cols-3">
        <div className="space-y-1">
          <div className="font-mono text-[11px] font-semibold text-[#0A7C59]">01 / MANIFEST</div>
          <div className="text-[14px] font-semibold text-[#111418]">
            Add <code className="text-[13px]">registry/cards/&lt;slug&gt;.json</code>
          </div>
          <p className="text-[13px] text-[#4F5866]">
            Host your A2A v1.0 card at <code className="text-[12px]">/.well-known/agent-card.json</code> and commit its registry entry.
          </p>
        </div>
        <div className="space-y-1">
          <div className="font-mono text-[11px] font-semibold text-[#1D4ED8]">02 / CI CHECK</div>
          <div className="text-[14px] font-semibold text-[#111418]">
            GitHub Actions validates schema
          </div>
          <p className="text-[13px] text-[#4F5866]">
            PRs run <code className="text-[12px]">npm run validate:cards</code> and rebuild <code className="text-[12px]">/registry/index.json</code>.
          </p>
        </div>
        <div className="space-y-1">
          <div className="font-mono text-[11px] font-semibold text-[#B45309]">03 / CLOUDFLARE CD</div>
          <div className="text-[14px] font-semibold text-[#111418]">
            Merge deploys to a2acards.com
          </div>
          <p className="text-[13px] text-[#4F5866]">
            Merging to <code className="text-[12px]">main</code> triggers automatic deployment to Cloudflare edge static assets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Form */}
        <div className="space-y-4 lg:col-span-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#4F5866]">Registry Slug</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 font-mono text-[12px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#4F5866]">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RegistryCategory)}
                className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-2.5 text-[13px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
              >
                {REGISTRY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#4F5866]">Agent Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#4F5866]">Agent Version</span>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 font-mono text-[12px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#4F5866]">Provider Organization</span>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#4F5866]">Provider URL</span>
              <input
                type="url"
                value={orgUrl}
                onChange={(e) => setOrgUrl(e.target.value)}
                className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 font-mono text-[12px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[12px] font-medium text-[#4F5866]">Description</span>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-[#D0D5DD] bg-white p-2.5 text-[13px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-[12px] font-medium text-[#4F5866]">
                Discovery Card URL (/.well-known/agent-card.json)
              </span>
              <input
                type="url"
                value={cardUrl}
                onChange={(e) => setCardUrl(e.target.value)}
                className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 font-mono text-[12px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
              />
            </label>

            <label className="block space-y-1 sm:col-span-2">
              <span className="text-[12px] font-medium text-[#4F5866]">Primary Interface URL</span>
              <input
                type="url"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 font-mono text-[12px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#4F5866]">Protocol Binding</span>
              <select
                value={protocolBinding}
                onChange={(e) =>
                  setProtocolBinding(e.target.value as "JSONRPC" | "HTTP+JSON" | "GRPC")
                }
                className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-2.5 font-mono text-[12px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
              >
                <option value="JSONRPC">JSONRPC</option>
                <option value="HTTP+JSON">HTTP+JSON</option>
                <option value="GRPC">GRPC</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#4F5866]">Repository URL (Optional)</span>
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 font-mono text-[12px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 text-[13px] text-[#111418]">
              <input
                type="checkbox"
                checked={streaming}
                onChange={(e) => setStreaming(e.target.checked)}
                className="h-4 w-4 rounded border-[#D0D5DD] accent-[#0A7C59]"
              />
              <span>Streaming (SSE)</span>
            </label>
            <label className="inline-flex items-center gap-2 text-[13px] text-[#111418]">
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
                className="h-4 w-4 rounded border-[#D0D5DD] accent-[#0A7C59]"
              />
              <span>Push Notifications</span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-[#E2E6EC] pt-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#4F5866]">Primary Skill ID</span>
              <input
                type="text"
                value={skillId}
                onChange={(e) => setSkillId(e.target.value)}
                className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 font-mono text-[12px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#4F5866]">Skill Name</span>
              <input
                type="text"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
              />
            </label>

            <label className="block space-y-1 sm:col-span-2">
              <span className="text-[12px] font-medium text-[#4F5866]">Skill Description</span>
              <input
                type="text"
                value={skillDescription}
                onChange={(e) => setSkillDescription(e.target.value)}
                className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
              />
            </label>

            <label className="block space-y-1 sm:col-span-2">
              <span className="text-[12px] font-medium text-[#4F5866]">
                Skill Tags (comma-separated)
              </span>
              <input
                type="text"
                value={skillTags}
                onChange={(e) => setSkillTags(e.target.value)}
                className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 font-mono text-[12px] text-[#111418] focus:border-[#0A7C59] focus:outline-none"
              />
            </label>
          </div>
        </div>

        {/* Generated PR file output */}
        <div className="flex flex-col space-y-3 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <code className="rounded bg-[#E9ECF1] px-2 py-1 text-[12px] font-medium text-[#111418]">
              {targetPath}
            </code>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#D0D5DD] bg-white px-2.5 text-[12px] font-medium text-[#111418] hover:border-[#98A2B3]"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#0A7C59]" /> : <Copy className="h-3.5 w-3.5 text-[#6B7482]" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                title="Download JSON file"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#D0D5DD] bg-white text-[#4F5866] hover:border-[#98A2B3] hover:text-[#111418]"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <a
                href={githubNewFileUrl}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium text-white transition-colors ${
                  generated.validation.valid
                    ? "bg-[#0A7C59] hover:bg-[#086649]"
                    : "pointer-events-none bg-[#98A2B3]"
                }`}
              >
                <GitPullRequest className="h-3.5 w-3.5" />
                <span>Create PR on GitHub</span>
                <ExternalLink className="h-3 w-3 opacity-80" />
              </a>
            </div>
          </div>

          {!generated.validation.valid && (
            <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]">
              {generated.validation.errors.map((err, i) => (
                <div key={i}>
                  <code className="mr-1 font-semibold">{err.path}</code>
                  {err.message}
                </div>
              ))}
            </div>
          )}

          <pre className="flex-1 overflow-x-auto rounded-lg border border-[#E2E6EC] bg-white p-4 font-mono text-[12px] leading-relaxed text-[#111418]">
            {generated.json}
          </pre>
        </div>
      </div>
    </div>
  );
}
