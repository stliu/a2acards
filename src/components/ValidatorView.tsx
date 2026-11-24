import { useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Globe, Loader2 } from "lucide-react";
import { validateAgentCard } from "../lib/a2a-schema";
import type { AgentCard } from "../lib/a2a-schema";
import { bindingBadgeClass, VALIDATOR_PRESETS } from "../lib/ui-helpers";

interface ValidatorViewProps {
  initialJson: string;
}

export function ValidatorView({ initialJson }: ValidatorViewProps) {
  const [rawJson, setRawJson] = useState<string>(initialJson || VALIDATOR_PRESETS.minimalV1.json);
  const [fetchUrl, setFetchUrl] = useState<string>("https://a2acards.com/.well-known/agent-card.json");
  const [fetching, setFetching] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const analysis = useMemo(() => {
    try {
      const parsed = JSON.parse(rawJson) as unknown;
      const result = validateAgentCard(parsed);
      return { parseError: null, parsed, result };
    } catch (error) {
      return {
        parseError: error instanceof Error ? error.message : "Invalid JSON",
        parsed: null,
        result: null,
      };
    }
  }, [rawJson]);

  async function handleFetch() {
    if (!fetchUrl.trim()) return;
    setFetching(true);
    setFetchError(null);
    try {
      let target = fetchUrl.trim();
      if (!/^https?:\/\//i.test(target)) {
        target = `https://${target}`;
      }
      const parsedUrl = new URL(target);
      if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
        parsedUrl.pathname = "/.well-known/agent-card.json";
      }
      const response = await fetch(parsedUrl.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setRawJson(JSON.stringify(data, null, 2));
    } catch (error) {
      setFetchError(
        error instanceof Error
          ? `${error.message} (if remote host blocks browser CORS, paste the JSON directly)`
          : "Unable to fetch remote card"
      );
    } finally {
      setFetching(false);
    }
  }

  const validCard =
    analysis.result?.valid && analysis.parsed && typeof analysis.parsed === "object"
      ? (analysis.parsed as AgentCard)
      : null;

  return (
    <div className="space-y-5">
      {/* Remote well-known fetch toolbar */}
      <div className="flex flex-col gap-3 border-b border-[#E2E6EC] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Globe className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#6B7482]" />
            <input
              type="url"
              value={fetchUrl}
              onChange={(event) => setFetchUrl(event.target.value)}
              placeholder="https://domain.com/.well-known/agent-card.json"
              className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white pr-3 pl-9 font-mono text-[12px] text-[#111418] placeholder:text-[#98A2B3] focus:border-[#0A7C59] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleFetch}
            disabled={fetching}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#111418] px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-[#272D36] disabled:opacity-60"
          >
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>Fetch Card</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(VALIDATOR_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setRawJson(preset.json);
                setFetchError(null);
              }}
              className="h-8 rounded-md border border-[#E2E6EC] bg-white px-2.5 text-[12px] font-medium text-[#4F5866] transition-colors hover:border-[#98A2B3] hover:text-[#111418]"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {fetchError && (
        <div className="flex items-start gap-2 rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-[13px] text-[#92400E]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Editor pane */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="card-json-editor" className="text-[12px] font-semibold uppercase text-[#6B7482]">
              agent-card.json
            </label>
            <span className="font-mono text-[11px] text-[#6B7482]">
              {new TextEncoder().encode(rawJson).length.toLocaleString()} bytes
            </span>
          </div>
          <textarea
            id="card-json-editor"
            value={rawJson}
            onChange={(event) => setRawJson(event.target.value)}
            spellCheck={false}
            rows={24}
            className="w-full flex-1 rounded-lg border border-[#D0D5DD] bg-white p-3.5 font-mono text-[12px] leading-relaxed text-[#111418] focus:border-[#0A7C59] focus:outline-none"
          />
        </div>

        {/* Diagnostics + Preview pane */}
        <div className="space-y-4">
          <div className="text-[12px] font-semibold uppercase text-[#6B7482]">
            A2A v1.0 Schema Diagnostics
          </div>

          {analysis.parseError ? (
            <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[#B91C1C]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>JSON Syntax Error</span>
              </div>
              <p className="mt-1.5 font-mono text-[12px] text-[#991B1B]">{analysis.parseError}</p>
            </div>
          ) : analysis.result ? (
            <>
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4 ${
                  analysis.result.valid
                    ? "border-[#A7F3D0] bg-[#ECFDF5]"
                    : "border-[#FECACA] bg-[#FEF2F2]"
                }`}
              >
                <div className="flex items-center gap-2">
                  {analysis.result.valid ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0A7C59]" />
                  ) : (
                    <AlertCircle className="h-5 w-5 shrink-0 text-[#B91C1C]" />
                  )}
                  <div>
                    <div
                      className={`text-[14px] font-semibold ${
                        analysis.result.valid ? "text-[#065F46]" : "text-[#991B1B]"
                      }`}
                    >
                      {analysis.result.valid
                        ? "Valid A2A v1.0 Agent Card"
                        : `${analysis.result.errors.length} Schema ${
                            analysis.result.errors.length === 1 ? "Error" : "Errors"
                          }`}
                    </div>
                    <div className="text-[12px] text-[#4F5866]">
                      {analysis.result.warnings.length} migration / lint{" "}
                      {analysis.result.warnings.length === 1 ? "warning" : "warnings"}
                    </div>
                  </div>
                </div>
                <span className="rounded border border-[#D0D5DD] bg-white px-2 py-0.5 font-mono text-[11px] font-medium text-[#111418]">
                  detected: {analysis.result.detectedVersion}
                </span>
              </div>

              {(analysis.result.errors.length > 0 || analysis.result.warnings.length > 0) && (
                <div className="divide-y divide-[#E2E6EC] rounded-lg border border-[#E2E6EC] bg-white">
                  {analysis.result.errors.map((issue, idx) => (
                    <div key={`err-${idx}`} className="flex items-start gap-2.5 p-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
                      <div className="min-w-0 space-y-1 text-[13px]">
                        <div>
                          <code className="mr-1.5 rounded bg-[#FEE2E2] px-1.5 py-0.5 text-[11px] text-[#991B1B]">
                            {issue.path}
                          </code>
                          <span className="text-[#111418]">{issue.message}</span>
                        </div>
                        {issue.hint && (
                          <p className="text-[12px] text-[#4F5866]">{issue.hint}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {analysis.result.warnings.map((issue, idx) => (
                    <div key={`warn-${idx}`} className="flex items-start gap-2.5 p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
                      <div className="min-w-0 space-y-1 text-[13px]">
                        <div>
                          <code className="mr-1.5 rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[11px] text-[#92400E]">
                            {issue.path}
                          </code>
                          <span className="text-[#111418]">{issue.message}</span>
                        </div>
                        {issue.hint && (
                          <p className="text-[12px] text-[#4F5866]">{issue.hint}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {validCard && (
                <div className="space-y-2 pt-2">
                  <div className="text-[12px] font-semibold uppercase text-[#6B7482]">
                    Directory Card Preview
                  </div>
                  <div className="rounded-lg border border-[#E2E6EC] bg-white p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-[15px] font-semibold text-[#111418]">{validCard.name}</h3>
                      <span className="font-mono text-[11px] text-[#6B7482]">
                        v{validCard.version}
                      </span>
                    </div>
                    {validCard.provider?.organization && (
                      <p className="text-[12px] text-[#6B7482]">{validCard.provider.organization}</p>
                    )}
                    <p className="mt-2 text-[13px] leading-relaxed text-[#4F5866]">
                      {validCard.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#EEF0F4] pt-3">
                      {Array.from(
                        new Set((validCard.supportedInterfaces ?? []).map((i) => i.protocolBinding))
                      ).map((binding) => (
                        <span
                          key={binding}
                          className={`inline-flex h-5 items-center rounded border px-1.5 font-mono text-[11px] font-medium ${bindingBadgeClass(
                            binding
                          )}`}
                        >
                          {binding}
                        </span>
                      ))}
                      <span className="ml-1 font-mono text-[11px] text-[#6B7482]">
                        {(validCard.skills ?? []).length}{" "}
                        {(validCard.skills ?? []).length === 1 ? "skill" : "skills"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
