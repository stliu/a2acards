import { useEffect, useMemo, useState } from "react";
import { Bell, Radio, Search, ShieldCheck, X } from "lucide-react";
import registryData from "./generated/registry.json";
import { CORE_PROTOCOL_BINDINGS, REGISTRY_CATEGORIES } from "./lib/a2a-schema";
import type { RegistryCategory, RegistryEntry, RegistryIndex } from "./lib/a2a-schema";
import { AgentCardTile } from "./components/AgentCardTile";
import { CardInspector } from "./components/CardInspector";
import { Header } from "./components/Header";
import type { AppTab } from "./components/Header";
import { SubmitView } from "./components/SubmitView";
import { ValidatorView } from "./components/ValidatorView";
import { VALIDATOR_PRESETS } from "./lib/ui-helpers";

const registry = registryData as RegistryIndex;

function readInitialState(): { tab: AppTab; cardSlug: string | null } {
  const params = new URLSearchParams(window.location.search);
  const rawTab = params.get("tab");
  const tab: AppTab =
    rawTab === "validator" || rawTab === "submit" ? rawTab : "directory";
  const cardSlug = params.get("card");
  return { tab, cardSlug };
}

export function App() {
  const initial = useMemo(() => readInitialState(), []);
  const [activeTab, setActiveTab] = useState<AppTab>(initial.tab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | RegistryCategory>("All");
  const [selectedBinding, setSelectedBinding] = useState<string | null>(null);
  const [onlyStreaming, setOnlyStreaming] = useState(false);
  const [onlyPush, setOnlyPush] = useState(false);
  const [onlySigned, setOnlySigned] = useState(false);
  const [validatorJson, setValidatorJson] = useState(VALIDATOR_PRESETS.minimalV1.json);
  const [selectedEntry, setSelectedEntry] = useState<RegistryEntry | null>(() => {
    if (!initial.cardSlug) return null;
    return registry.entries.find((e) => e.slug === initial.cardSlug) ?? null;
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== "directory") {
      params.set("tab", activeTab);
    }
    if (selectedEntry) {
      params.set("card", selectedEntry.slug);
    }
    const queryString = params.toString();
    const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [activeTab, selectedEntry]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set("All", registry.entries.length);
    for (const entry of registry.entries) {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
    return counts;
  }, []);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return registry.entries.filter((entry) => {
      if (selectedCategory !== "All" && entry.category !== selectedCategory) {
        return false;
      }
      if (
        selectedBinding &&
        !entry.card.supportedInterfaces.some((i) => i.protocolBinding === selectedBinding)
      ) {
        return false;
      }
      if (onlyStreaming && !entry.card.capabilities.streaming) {
        return false;
      }
      if (onlyPush && !entry.card.capabilities.pushNotifications) {
        return false;
      }
      if (onlySigned && !entry.signed) {
        return false;
      }
      if (!q) return true;

      const haystack = [
        entry.slug,
        entry.category,
        entry.card.name,
        entry.card.description,
        entry.card.provider?.organization ?? "",
        ...entry.card.supportedInterfaces.map((i) => i.protocolBinding),
        ...entry.card.skills.flatMap((s) => [s.id, s.name, s.description, ...s.tags]),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [searchQuery, selectedCategory, selectedBinding, onlyStreaming, onlyPush, onlySigned]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategory !== "All" ||
    selectedBinding !== null ||
    onlyStreaming ||
    onlyPush ||
    onlySigned;

  function resetFilters() {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedBinding(null);
    setOnlyStreaming(false);
    setOnlyPush(false);
    setOnlySigned(false);
  }

  function handleOpenInValidator(jsonText: string) {
    setValidatorJson(jsonText);
    setSelectedEntry(null);
    setActiveTab("validator");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FA] text-[#111418]">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        totalCards={registry.total}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {activeTab === "directory" && (
          <div className="space-y-5">
            {/* Compact utilitarian registry header */}
            <div className="flex flex-col justify-between gap-4 border-b border-[#E2E6EC] pb-5 md:flex-row md:items-end">
              <div className="space-y-1">
                <h1 className="text-[22px] font-semibold text-[#111418]">
                  A2A Agent Card Directory
                </h1>
                <p className="text-[14px] text-[#4F5866]">
                  Discover, inspect, and validate{" "}
                  <code className="break-all rounded bg-[#E9ECF1] px-1.5 py-0.5 text-[12px] text-[#111418] sm:break-normal">
                    /.well-known/agent-card.json
                  </code>{" "}
                  manifests for Agent2Agent v1.0 interoperability.
                </p>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#6B7482]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search agents, skills, tags..."
                  aria-label="Search Agent Cards"
                  className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white pr-8 pl-9 text-[13px] text-[#111418] placeholder:text-[#98A2B3] focus:border-[#0A7C59] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    title="Clear search"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-[#6B7482] hover:text-[#111418]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category & protocol filters */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Categories">
                {(["All", ...REGISTRY_CATEGORIES] as Array<"All" | RegistryCategory>).map(
                  (category) => {
                    const active = selectedCategory === category;
                    const count = categoryCounts.get(category) ?? 0;
                    return (
                      <button
                        key={category}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSelectedCategory(category)}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors ${
                          active
                            ? "border-[#111418] bg-[#111418] text-white"
                            : "border-[#E2E6EC] bg-white text-[#4F5866] hover:border-[#98A2B3] hover:text-[#111418]"
                        }`}
                      >
                        <span>{category}</span>
                        <span
                          className={`font-mono text-[11px] ${
                            active ? "text-white/75" : "text-[#6B7482]"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[12px] font-medium text-[#6B7482]">Binding:</span>
                  {CORE_PROTOCOL_BINDINGS.map((binding) => {
                    const active = selectedBinding === binding;
                    return (
                      <button
                        key={binding}
                        type="button"
                        onClick={() => setSelectedBinding(active ? null : binding)}
                        className={`inline-flex h-7 items-center rounded border px-2 font-mono text-[11px] font-medium transition-colors ${
                          active
                            ? "border-[#0A7C59] bg-[#ECFDF5] text-[#047857]"
                            : "border-[#E2E6EC] bg-white text-[#4F5866] hover:border-[#98A2B3]"
                        }`}
                      >
                        {binding}
                      </button>
                    );
                  })}

                  <span className="mx-1 h-4 w-px bg-[#DCE1E8]" />

                  <button
                    type="button"
                    onClick={() => setOnlyStreaming((v) => !v)}
                    className={`inline-flex h-7 items-center gap-1 rounded border px-2 text-[12px] font-medium transition-colors ${
                      onlyStreaming
                        ? "border-[#0A7C59] bg-[#ECFDF5] text-[#047857]"
                        : "border-[#E2E6EC] bg-white text-[#4F5866] hover:border-[#98A2B3]"
                    }`}
                  >
                    <Radio className="h-3.5 w-3.5" />
                    <span>Streaming</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlyPush((v) => !v)}
                    className={`inline-flex h-7 items-center gap-1 rounded border px-2 text-[12px] font-medium transition-colors ${
                      onlyPush
                        ? "border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]"
                        : "border-[#E2E6EC] bg-white text-[#4F5866] hover:border-[#98A2B3]"
                    }`}
                  >
                    <Bell className="h-3.5 w-3.5" />
                    <span>Push</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlySigned((v) => !v)}
                    className={`inline-flex h-7 items-center gap-1 rounded border px-2 text-[12px] font-medium transition-colors ${
                      onlySigned
                        ? "border-[#0F766E] bg-[#F0FDFA] text-[#0F766E]"
                        : "border-[#E2E6EC] bg-white text-[#4F5866] hover:border-[#98A2B3]"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Signed</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[12px] text-[#6B7482]">
                  <span className="font-mono">
                    {filteredEntries.length} / {registry.total} cards
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="font-medium text-[#0A7C59] hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Cards Grid */}
            {filteredEntries.length === 0 ? (
              <div className="rounded-lg border border-[#E2E6EC] bg-white px-6 py-12 text-center">
                <p className="text-[14px] font-medium text-[#111418]">
                  No Agent Cards match the current filters.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-3 inline-flex h-8 items-center rounded-md border border-[#D0D5DD] bg-white px-3 text-[12px] font-medium text-[#111418] hover:border-[#98A2B3]"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredEntries.map((entry) => (
                  <AgentCardTile
                    key={entry.slug}
                    entry={entry}
                    onSelect={setSelectedEntry}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "validator" && (
          <div className="space-y-5">
            <div className="border-b border-[#E2E6EC] pb-4">
              <h1 className="text-[22px] font-semibold text-[#111418]">
                A2A v1.0 Agent Card Validator
              </h1>
              <p className="mt-1 text-[14px] text-[#4F5866]">
                Check required v1.0 fields, transport bindings, MIME modes, and v0.3 legacy migration warnings.
              </p>
            </div>
            <ValidatorView initialJson={validatorJson} />
          </div>
        )}

        {activeTab === "submit" && (
          <div className="space-y-5">
            <div className="border-b border-[#E2E6EC] pb-4">
              <h1 className="text-[22px] font-semibold text-[#111418]">
                Submit an Agent Card
              </h1>
              <p className="mt-1 text-[14px] text-[#4F5866]">
                Generate a validated registry manifest and open a pull request to{" "}
                <code className="rounded bg-[#E9ECF1] px-1.5 py-0.5 text-[12px] text-[#111418]">
                  stliu/a2acards
                </code>
                .
              </p>
            </div>
            <SubmitView />
          </div>
        )}
      </main>

      <footer className="border-t border-[#E2E6EC] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 py-4 text-[12px] text-[#6B7482] sm:flex-row sm:items-center sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-medium text-[#111418]">a2acards.com</span>
            <a
              href="/.well-known/agent-card.json"
              target="_blank"
              rel="noreferrer"
              className="font-mono hover:text-[#0A7C59] hover:underline"
            >
              /.well-known/agent-card.json
            </a>
            <a
              href="/registry/index.json"
              target="_blank"
              rel="noreferrer"
              className="font-mono hover:text-[#0A7C59] hover:underline"
            >
              /registry/index.json
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://a2a-protocol.org/latest/specification/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#111418] hover:underline"
            >
              A2A v1.0 Spec
            </a>
            <a
              href="https://github.com/stliu/a2acards"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#111418] hover:underline"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {selectedEntry && (
        <CardInspector
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onOpenInValidator={handleOpenInValidator}
        />
      )}
    </div>
  );
}
