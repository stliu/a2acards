import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  KeyRound,
  Radio,
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react";
import type { RegistryEntry } from "../lib/a2a-schema";
import { bindingBadgeClass, statusBadgeClass, statusLabel } from "../lib/ui-helpers";

interface CardInspectorProps {
  entry: RegistryEntry;
  onClose: () => void;
  onOpenInValidator: (jsonText: string) => void;
}

export function CardInspector({ entry, onClose, onOpenInValidator }: CardInspectorProps) {
  const [view, setView] = useState<"overview" | "json">("overview");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { card } = entry;
  const formattedCardJson = JSON.stringify(card, null, 2);
  const curlCommand = `curl -s ${entry.cardUrl} | jq .`;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function copyText(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Fallback ignored if clipboard is blocked
    }
  }

  function downloadJson() {
    const blob = new Blob([formattedCardJson + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${entry.slug}.agent-card.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const securityEntries = card.securitySchemes ? Object.entries(card.securitySchemes) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#111418]/35 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={card.name}
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-2xl flex-col border-l border-[#E2E6EC] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Top sticky header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E6EC] px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex h-5 items-center rounded border px-1.5 text-[11px] font-medium ${statusBadgeClass(
                  entry.status
                )}`}
              >
                {statusLabel(entry.status)}
              </span>
              <span className="rounded bg-[#F1F3F6] px-1.5 py-0.5 text-[11px] font-medium text-[#4F5866]">
                {entry.category}
              </span>
              <span className="font-mono text-[11px] text-[#6B7482]">v{card.version}</span>
            </div>
            <h2 className="mt-1.5 text-[18px] font-semibold text-[#111418]">{card.name}</h2>
            <p className="mt-0.5 text-[13px] text-[#6B7482]">
              {card.provider?.organization ?? entry.slug}
              {card.provider?.url && (
                <>
                  {" · "}
                  <a
                    href={card.provider.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0A7C59] hover:underline"
                  >
                    {card.provider.url.replace(/^https?:\/\//, "")}
                  </a>
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenInValidator(formattedCardJson)}
              title="Open in A2A Validator"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E2E6EC] text-[#4F5866] hover:border-[#98A2B3] hover:text-[#111418]"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={downloadJson}
              title="Download agent-card.json"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E2E6EC] text-[#4F5866] hover:border-[#98A2B3] hover:text-[#111418]"
            >
              <Download className="h-4 w-4" />
            </button>
            {entry.repoUrl && (
              <a
                href={entry.repoUrl}
                target="_blank"
                rel="noreferrer"
                title="Open repository"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E2E6EC] text-[#4F5866] hover:border-[#98A2B3] hover:text-[#111418]"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Close inspector"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E2E6EC] text-[#4F5866] hover:border-[#98A2B3] hover:text-[#111418]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex items-center justify-between border-b border-[#E2E6EC] bg-[#F7F8FA] px-5 py-2">
          <div className="inline-flex rounded-md border border-[#E2E6EC] bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView("overview")}
              className={`h-7 rounded px-3 text-[12px] font-medium transition-colors ${
                view === "overview"
                  ? "bg-[#111418] text-white"
                  : "text-[#4F5866] hover:text-[#111418]"
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setView("json")}
              className={`h-7 rounded px-3 font-mono text-[12px] font-medium transition-colors ${
                view === "json"
                  ? "bg-[#111418] text-white"
                  : "text-[#4F5866] hover:text-[#111418]"
              }`}
            >
              agent-card.json
            </button>
          </div>

          <button
            type="button"
            onClick={() => copyText("json", formattedCardJson)}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[#E2E6EC] bg-white px-2.5 text-[12px] font-medium text-[#111418] hover:border-[#98A2B3]"
          >
            {copiedKey === "json" ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#0A7C59]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#6B7482]" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {view === "json" ? (
            <div className="p-5">
              <pre className="overflow-x-auto rounded-lg border border-[#E2E6EC] bg-[#F7F8FA] p-4 font-mono text-[12px] leading-relaxed text-[#111418]">
                {formattedCardJson}
              </pre>
            </div>
          ) : (
            <div className="divide-y divide-[#E2E6EC]">
              {/* Description & Discovery */}
              <section className="space-y-4 px-5 py-4">
                <p className="text-[14px] leading-relaxed text-[#2C333F]">{card.description}</p>

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase text-[#6B7482]">
                    Well-Known Discovery URI
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-md border border-[#E2E6EC] bg-[#F7F8FA] px-3 py-2">
                    <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-[12px] text-[#111418]">
                      {entry.cardUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText("cardUrl", entry.cardUrl)}
                      title="Copy discovery URL"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[#E2E6EC] bg-white text-[#4F5866] hover:text-[#111418]"
                    >
                      {copiedKey === "cardUrl" ? (
                        <Check className="h-3.5 w-3.5 text-[#0A7C59]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-md border border-[#E2E6EC] bg-[#111418] px-3 py-2 text-white">
                    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
                      <Terminal className="h-3.5 w-3.5 shrink-0 text-[#34D399]" />
                      <code className="whitespace-nowrap text-[12px] text-[#E5E7EB]">
                        {curlCommand}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText("curl", curlCommand)}
                      title="Copy curl command"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-white/15 bg-white/5 text-[#D1D5DB] hover:bg-white/10 hover:text-white"
                    >
                      {copiedKey === "curl" ? (
                        <Check className="h-3.5 w-3.5 text-[#34D399]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </section>

              {/* Supported Interfaces */}
              <section className="space-y-2.5 px-5 py-4">
                <div className="text-[11px] font-semibold uppercase text-[#6B7482]">
                  Supported Interfaces (Priority Order)
                </div>
                <div className="overflow-x-auto rounded-md border border-[#E2E6EC]">
                  <table className="w-full border-collapse text-left text-[12px]">
                    <thead className="border-b border-[#E2E6EC] bg-[#F7F8FA] text-[#6B7482]">
                      <tr>
                        <th className="px-3 py-2 font-medium">#</th>
                        <th className="px-3 py-2 font-medium">Binding</th>
                        <th className="px-3 py-2 font-medium">Version</th>
                        <th className="px-3 py-2 font-medium">Endpoint URL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF0F4]">
                      {card.supportedInterfaces.map((iface, idx) => (
                        <tr key={`${iface.protocolBinding}-${iface.url}`}>
                          <td className="px-3 py-2 font-mono text-[#6B7482]">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex h-5 items-center rounded border px-1.5 font-mono text-[11px] font-medium ${bindingBadgeClass(
                                iface.protocolBinding
                              )}`}
                            >
                              {iface.protocolBinding}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-[#111418]">
                            {iface.protocolVersion}
                          </td>
                          <td className="px-3 py-2 font-mono text-[#4F5866] break-all">
                            {iface.url}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Capabilities, Security & Modalities */}
              <section className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase text-[#6B7482]">
                    Capabilities
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[12px] ${
                        card.capabilities.streaming
                          ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]"
                          : "border-[#E2E6EC] bg-[#F7F8FA] text-[#6B7482]"
                      }`}
                    >
                      <Radio className="h-3.5 w-3.5" />
                      Streaming: {card.capabilities.streaming ? "Yes" : "No"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[12px] ${
                        card.capabilities.pushNotifications
                          ? "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]"
                          : "border-[#E2E6EC] bg-[#F7F8FA] text-[#6B7482]"
                      }`}
                    >
                      <Bell className="h-3.5 w-3.5" />
                      Push: {card.capabilities.pushNotifications ? "Yes" : "No"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[12px] ${
                        card.capabilities.extendedAgentCard
                          ? "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                          : "border-[#E2E6EC] bg-[#F7F8FA] text-[#6B7482]"
                      }`}
                    >
                      Extended Card: {card.capabilities.extendedAgentCard ? "Yes" : "No"}
                    </span>
                    {entry.signed && (
                      <span className="inline-flex items-center gap-1 rounded border border-[#CCFBF1] bg-[#F0FDFA] px-2 py-1 text-[12px] text-[#0F766E]">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        JWS Signed
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase text-[#6B7482]">
                    Authentication Schemes
                  </div>
                  {securityEntries.length === 0 ? (
                    <div className="text-[12px] text-[#6B7482]">
                      Public / unauthenticated discovery
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {securityEntries.map(([name, spec]) => {
                        const schemeKey = Object.keys(spec)[0] ?? "custom";
                        return (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1.5 rounded border border-[#FDE68A] bg-[#FFFBEB] px-2 py-1 font-mono text-[11px] text-[#92400E]"
                          >
                            <KeyRound className="h-3 w-3" />
                            <span>{name}</span>
                            <span className="text-[#B45309]/70">({schemeKey.replace("SecurityScheme", "")})</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase text-[#6B7482]">
                    Default Input Modes
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {card.defaultInputModes.map((mode) => (
                      <span
                        key={mode}
                        className="rounded border border-[#E2E6EC] bg-[#F7F8FA] px-1.5 py-0.5 font-mono text-[11px] text-[#374151]"
                      >
                        {mode}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase text-[#6B7482]">
                    Default Output Modes
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {card.defaultOutputModes.map((mode) => (
                      <span
                        key={mode}
                        className="rounded border border-[#E2E6EC] bg-[#F7F8FA] px-1.5 py-0.5 font-mono text-[11px] text-[#374151]"
                      >
                        {mode}
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              {/* Skills */}
              <section className="space-y-3 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase text-[#6B7482]">
                    Declared Skills ({card.skills.length})
                  </div>
                  <span className="font-mono text-[11px] text-[#6B7482]">
                    Updated {entry.updatedAt}
                  </span>
                </div>

                <div className="divide-y divide-[#EEF0F4] rounded-md border border-[#E2E6EC]">
                  {card.skills.map((skill) => (
                    <div key={skill.id} className="space-y-2 p-3.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-[14px] font-semibold text-[#111418]">
                          {skill.name}
                        </span>
                        <code className="rounded bg-[#F1F3F6] px-1.5 py-0.5 text-[11px] text-[#4F5866]">
                          {skill.id}
                        </code>
                      </div>
                      <p className="text-[13px] leading-relaxed text-[#4F5866]">
                        {skill.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {skill.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-[#F7F8FA] px-1.5 py-0.5 font-mono text-[11px] text-[#4F5866]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      {skill.examples && skill.examples.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {skill.examples.map((example) => (
                            <div
                              key={example}
                              className="flex items-center justify-between gap-2 rounded border border-[#EEF0F4] bg-[#F7F8FA] px-2.5 py-1.5 text-[12px] text-[#2C333F]"
                            >
                              <span className="min-w-0 flex-1 break-words">&ldquo;{example}&rdquo;</span>
                              <button
                                type="button"
                                onClick={() => copyText(example, example)}
                                title="Copy example prompt"
                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#6B7482] hover:bg-white hover:text-[#111418]"
                              >
                                {copiedKey === example ? (
                                  <Check className="h-3 w-3 text-[#0A7C59]" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
