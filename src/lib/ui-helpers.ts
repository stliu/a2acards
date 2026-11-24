export function bindingBadgeClass(binding: string): string {
  switch (binding) {
    case "JSONRPC":
      return "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
    case "HTTP+JSON":
      return "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]";
    case "GRPC":
      return "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]";
    default:
      return "bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]";
  }
}

export function statusBadgeClass(status: "verified" | "community" | "reference"): string {
  switch (status) {
    case "verified":
      return "bg-[#ECFDF5] text-[#0A7C59] border-[#A7F3D0]";
    case "community":
      return "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
    case "reference":
    default:
      return "bg-[#F1F3F6] text-[#4F5866] border-[#DCE1E8]";
  }
}

export function statusLabel(status: "verified" | "community" | "reference"): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "community":
      return "Community";
    case "reference":
    default:
      return "Reference";
  }
}

export const VALIDATOR_PRESETS: Record<string, { label: string; json: string }> = {
  minimalV1: {
    label: "v1.0 Minimal",
    json: JSON.stringify(
      {
        name: "Weather Forecast Agent",
        description: "Returns hourly and 7-day weather forecasts with severe alert metadata.",
        version: "1.0.0",
        supportedInterfaces: [
          {
            url: "https://weather.example.com/a2a/v1",
            protocolBinding: "JSONRPC",
            protocolVersion: "1.0",
          },
        ],
        capabilities: {
          streaming: true,
          pushNotifications: false,
          extendedAgentCard: false,
        },
        defaultInputModes: ["text/plain"],
        defaultOutputModes: ["application/json", "text/plain"],
        skills: [
          {
            id: "forecast-lookup",
            name: "Forecast Lookup",
            description: "Fetches current conditions and hourly precipitation forecast by city or coordinates.",
            tags: ["weather", "forecast", "alerts"],
            examples: ["Get 48-hour rain forecast for Vancouver, BC"],
          },
        ],
      },
      null,
      2
    ),
  },
  multiTransportV1: {
    label: "v1.0 Multi-Transport",
    json: JSON.stringify(
      {
        name: "Enterprise Ledger Agent",
        description: "Performs read-only account reconciliation and invoice anomaly detection across ERP systems.",
        version: "2.3.0",
        provider: {
          organization: "FinOps Interop",
          url: "https://finops.example.com",
        },
        documentationUrl: "https://finops.example.com/docs/a2a",
        supportedInterfaces: [
          {
            url: "https://ledger.example.com/a2a.v1.A2AService",
            protocolBinding: "GRPC",
            protocolVersion: "1.0",
          },
          {
            url: "https://ledger.example.com/a2a/v1",
            protocolBinding: "JSONRPC",
            protocolVersion: "1.0",
          },
          {
            url: "https://ledger.example.com/rest/v1",
            protocolBinding: "HTTP+JSON",
            protocolVersion: "1.0",
          },
        ],
        capabilities: {
          streaming: true,
          pushNotifications: true,
          extendedAgentCard: true,
        },
        defaultInputModes: ["application/json", "text/csv"],
        defaultOutputModes: ["application/json"],
        securitySchemes: {
          corpOidc: {
            openIdConnectSecurityScheme: {
              openIdConnectUrl: "https://sso.example.com/.well-known/openid-configuration",
            },
          },
        },
        skills: [
          {
            id: "reconcile-batch",
            name: "Batch Reconciliation",
            description: "Matches payout batches to open invoices and reports variances.",
            tags: ["finance", "erp", "reconciliation"],
            examples: ["Reconcile payout batch po_2026_11_24"],
          },
        ],
      },
      null,
      2
    ),
  },
  legacyV03: {
    label: "Legacy v0.3",
    json: JSON.stringify(
      {
        protocolVersion: "0.3.0",
        name: "Legacy Report Summarizer",
        description: "Summarizes quarterly filings using the older A2A 0.3 schema shape.",
        url: "https://legacy-agent.example.com/a2a",
        version: "0.9.0",
        preferredTransport: "JSONRPC",
        supportsAuthenticatedExtendedCard: true,
        capabilities: {
          streaming: true,
          pushNotifications: false,
        },
        defaultInputModes: ["text/plain"],
        defaultOutputModes: ["text/plain"],
        skills: [
          {
            id: "summarize-filing",
            name: "Filing Summary",
            description: "Extracts key risks and revenue highlights from earnings filings.",
            tags: ["finance", "summary"],
          },
        ],
      },
      null,
      2
    ),
  },
};
