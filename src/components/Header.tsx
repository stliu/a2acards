import { BarChart3, CheckCircle2, Code2, ExternalLink, Layers, PlusCircle } from "lucide-react";

export type AppTab = "directory" | "validator" | "submit";

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  totalCards: number;
}

export function Header({ activeTab, onSelectTab, totalCards }: HeaderProps) {
  const navItems: Array<{ id: AppTab; label: string; shortLabel: string; icon: typeof Layers }> = [
    { id: "directory", label: "Directory", shortLabel: "Directory", icon: Layers },
    { id: "validator", label: "Validator", shortLabel: "Validator", icon: CheckCircle2 },
    { id: "submit", label: "Submit Card", shortLabel: "Submit", icon: PlusCircle },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[#E2E6EC] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-5">
            <button
              type="button"
              onClick={() => onSelectTab("directory")}
              className="flex shrink-0 items-center gap-2.5 text-left focus:outline-none"
            >
              <img
                src="/favicon.svg"
                alt="a2acards"
                className="h-7 w-7 shrink-0"
                width={28}
                height={28}
              />
              <div className="flex items-baseline gap-2">
                <span className="text-[15px] font-semibold text-[#111418]">a2acards</span>
                <span className="rounded border border-[#E2E6EC] bg-[#F7F8FA] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#4F5866]">
                  A2A v1.0
                </span>
              </div>
            </button>

            <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors ${
                      isActive
                        ? "bg-[#111418] text-white"
                        : "text-[#4F5866] hover:bg-[#F1F3F6] hover:text-[#111418]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.label}</span>
                    {item.id === "directory" && (
                      <span
                        className={`ml-0.5 rounded px-1.5 font-mono text-[11px] ${
                          isActive ? "bg-white/15 text-white" : "bg-[#E9ECF1] text-[#4F5866]"
                        }`}
                      >
                        {totalCards}
                      </span>
                    )}
                  </button>
                );
              })}

              <a
                href="/stats/"
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-[#4F5866] transition-colors hover:bg-[#F1F3F6] hover:text-[#111418]"
              >
                <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                <span>Stats</span>
              </a>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href="/registry/index.json"
              target="_blank"
              rel="noreferrer"
              title="Machine-readable registry JSON"
              className="hidden h-8 items-center gap-1.5 rounded-md border border-[#E2E6EC] bg-white px-2.5 font-mono text-[12px] text-[#4F5866] transition-colors hover:border-[#C9D0DC] hover:text-[#111418] md:inline-flex"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>index.json</span>
            </a>
            <a
              href="https://github.com/stliu/a2acards"
              target="_blank"
              rel="noreferrer"
              title="GitHub Repository"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E2E6EC] bg-white px-2.5 text-[12px] font-medium text-[#111418] transition-colors hover:border-[#C9D0DC] hover:bg-[#F7F8FA]"
            >
              <span>GitHub</span>
              <ExternalLink className="h-3.5 w-3.5 text-[#6B7482]" />
            </a>
          </div>
        </div>

        {/* Mobile navigation row */}
        <nav
          className="flex items-center gap-1 border-t border-[#EEF0F4] py-2 sm:hidden"
          aria-label="Mobile Primary"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-md px-2 text-[12px] font-medium transition-colors ${
                  isActive
                    ? "bg-[#111418] text-white"
                    : "text-[#4F5866] hover:bg-[#F1F3F6] hover:text-[#111418]"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
          <a
            href="/stats/"
            className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-2.5 text-[12px] font-medium text-[#4F5866] hover:bg-[#F1F3F6] hover:text-[#111418]"
          >
            <BarChart3 className="h-3.5 w-3.5 shrink-0" />
            <span>Stats</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
