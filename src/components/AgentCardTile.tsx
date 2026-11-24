import { Bell, KeyRound, Radio, ShieldCheck, ArrowUpRight } from "lucide-react";
import type { RegistryEntry } from "../lib/a2a-schema";
import { bindingBadgeClass, statusBadgeClass, statusLabel } from "../lib/ui-helpers";

interface AgentCardTileProps {
  entry: RegistryEntry;
  onSelect: (entry: RegistryEntry) => void;
}

export function AgentCardTile({ entry, onSelect }: AgentCardTileProps) {
  const { card } = entry;
  const bindings = Array.from(new Set(card.supportedInterfaces.map((i) => i.protocolBinding)));
  const allTags = Array.from(new Set(card.skills.flatMap((s) => s.tags))).slice(0, 4);
  const hasAuth = Boolean(card.securitySchemes && Object.keys(card.securitySchemes).length > 0);

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="group flex h-full w-full flex-col justify-between rounded-lg border border-[#E2E6EC] bg-white p-4 text-left transition-colors hover:border-[#98A2B3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C59]"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex h-5 items-center rounded border px-1.5 text-[11px] font-medium ${statusBadgeClass(
                  entry.status
                )}`}
              >
                {statusLabel(entry.status)}
              </span>
              <span className="font-mono text-[11px] text-[#6B7482]">v{card.version}</span>
            </div>
            <h3 className="mt-2 truncate text-[15px] font-semibold text-[#111418] group-hover:text-[#0A7C59]">
              {card.name}
            </h3>
            <p className="truncate text-[12px] text-[#6B7482]">
              {card.provider?.organization ?? entry.slug}
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[#98A2B3] transition-colors group-hover:text-[#111418]" />
        </div>

        <p className="line-clamp-2 text-[13px] leading-relaxed text-[#4F5866]">
          {card.description}
        </p>
      </div>

      <div className="mt-4 space-y-2.5 border-t border-[#EEF0F4] pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {bindings.map((binding) => (
              <span
                key={binding}
                className={`inline-flex h-5 items-center rounded border px-1.5 font-mono text-[11px] font-medium ${bindingBadgeClass(
                  binding
                )}`}
              >
                {binding}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-[#6B7482]">
            {card.capabilities.streaming && (
              <span
                title="Supports streaming (SSE)"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-[#E2E6EC] bg-[#F7F8FA] text-[#0A7C59]"
              >
                <Radio className="h-3.5 w-3.5" />
              </span>
            )}
            {card.capabilities.pushNotifications && (
              <span
                title="Supports push notifications"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-[#E2E6EC] bg-[#F7F8FA] text-[#1D4ED8]"
              >
                <Bell className="h-3.5 w-3.5" />
              </span>
            )}
            {hasAuth && (
              <span
                title="Declares authentication securitySchemes"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-[#E2E6EC] bg-[#F7F8FA] text-[#B45309]"
              >
                <KeyRound className="h-3.5 w-3.5" />
              </span>
            )}
            {entry.signed && (
              <span
                title="JWS signed Agent Card"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-[#CCFBF1] bg-[#F0FDFA] text-[#0F766E]"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] text-[#6B7482]">
            {card.skills.length} {card.skills.length === 1 ? "skill" : "skills"}
          </span>
          <span className="text-[#D0D5DD]">/</span>
          {allTags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-[#F1F3F6] px-1.5 py-0.5 font-mono text-[11px] text-[#4F5866]"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
