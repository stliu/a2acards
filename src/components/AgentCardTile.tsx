import { ArrowUpRight, Bell, KeyRound, Radio, ShieldCheck } from "lucide-react";
import type { RegistrySummaryItem } from "../lib/a2a-schema";
import { bindingBadgeClass } from "../lib/ui-helpers";

interface AgentCardTileProps {
  item: RegistrySummaryItem;
  onSelect: (item: RegistrySummaryItem) => void;
}

export function AgentCardTile({ item, onSelect }: AgentCardTileProps) {
  const isOnline = !item.health || item.health.status === "online";

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="group flex h-full w-full flex-col justify-between rounded-lg border border-[#E2E6EC] bg-white p-4 text-left transition-colors hover:border-[#98A2B3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C59]"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex h-5 items-center rounded border px-1.5 font-mono text-[11px] font-medium ${
                  item.v1Valid
                    ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]"
                    : "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                }`}
              >
                {item.v1Valid ? "v1.0" : item.specVersion === "0.3-legacy" ? "v0.3" : "mixed"}
              </span>
              {isOnline && item.health?.latencyMs !== undefined && (
                <span className="font-mono text-[11px] text-[#0A7C59]">
                  {item.health.latencyMs}ms
                </span>
              )}
              {!isOnline && (
                <span className="rounded bg-[#F1F3F6] px-1.5 py-0.5 font-mono text-[10px] text-[#6B7482]">
                  offline
                </span>
              )}
              <span className="font-mono text-[11px] text-[#6B7482]">v{item.version}</span>
            </div>
            <h3 className="mt-2 truncate text-[15px] font-semibold text-[#111418] group-hover:text-[#0A7C59]">
              {item.name}
            </h3>
            <p className="truncate text-[12px] text-[#6B7482]">{item.organization}</p>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[#98A2B3] transition-colors group-hover:text-[#111418]" />
        </div>

        <p className="line-clamp-2 text-[13px] leading-relaxed text-[#4F5866]">
          {item.description}
        </p>
      </div>

      <div className="mt-4 space-y-2.5 border-t border-[#EEF0F4] pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {item.bindings.slice(0, 3).map((binding) => (
              <span
                key={binding}
                title={binding} className={`inline-block max-w-[130px] truncate rounded border px-1.5 py-0.5 font-mono text-[11px] font-medium leading-4 ${bindingBadgeClass(
                  binding
                )}`}
              >
                {binding}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-[#6B7482]">
            {item.streaming && (
              <span
                title="Supports streaming (SSE)"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-[#E2E6EC] bg-[#F7F8FA] text-[#0A7C59]"
              >
                <Radio className="h-3.5 w-3.5" />
              </span>
            )}
            {item.pushNotifications && (
              <span
                title="Supports push notifications"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-[#E2E6EC] bg-[#F7F8FA] text-[#1D4ED8]"
              >
                <Bell className="h-3.5 w-3.5" />
              </span>
            )}
            {item.hasAuth && (
              <span
                title="Declares authentication securitySchemes"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-[#E2E6EC] bg-[#F7F8FA] text-[#B45309]"
              >
                <KeyRound className="h-3.5 w-3.5" />
              </span>
            )}
            {item.signed && (
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
            {item.skillCount} {item.skillCount === 1 ? "skill" : "skills"}
          </span>
          {item.tags.length > 0 && <span className="text-[#D0D5DD]">/</span>}
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="max-w-[110px] truncate rounded bg-[#F1F3F6] px-1.5 py-0.5 font-mono text-[11px] text-[#4F5866]"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
