export {
  CORE_PROTOCOL_BINDINGS,
  REGISTRY_CATEGORIES,
  extractInterfaces,
  isRecognizableAgentCard,
  validateAgentCard,
  validateRegistryEntry,
} from "./a2a-validator.js";
export type {
  CardValidationResult,
  NormalizedInterface,
  RegistryValidationResult,
  ValidationIssue,
} from "./a2a-validator.js";

export type RegistryCategory =
  | "Coding & Dev"
  | "Data & Research"
  | "Finance & Ops"
  | "Travel & Commerce"
  | "Enterprise"
  | "Creative & Media";

export type RegistryStatus = "verified" | "community" | "reference";

export type SpecVersion = "1.0" | "0.3-legacy" | "mixed" | "unknown";

export interface AgentHealth {
  status: "online" | "unreachable";
  httpStatus?: number;
  latencyMs?: number;
  lastCheckedAt: string;
  consecutiveFailures: number;
  legacyPath?: boolean;
}

export interface AgentProvider {
  organization: string;
  url: string;
}

export interface AgentInterface {
  url: string;
  protocolBinding: "JSONRPC" | "HTTP+JSON" | "GRPC" | string;
  protocolVersion: string;
  tenant?: string;
}

export interface AgentCapabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  extendedAgentCard?: boolean;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}

export interface AgentCard {
  name: string;
  description: string;
  version?: string;
  provider?: AgentProvider;
  documentationUrl?: string;
  iconUrl?: string;
  supportedInterfaces?: AgentInterface[];
  url?: string;
  protocolVersion?: string;
  preferredTransport?: string;
  capabilities?: AgentCapabilities;
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  skills?: AgentSkill[];
  securitySchemes?: Record<string, Record<string, unknown>>;
  security?: Array<Record<string, string[]>>;
  signatures?: Array<{
    protected: string;
    signature: string;
    header?: Record<string, unknown>;
  }>;
}

export interface RegistryEntry {
  slug: string;
  category: RegistryCategory;
  status: RegistryStatus;
  source?: "curated" | "crawled";
  cardUrl: string;
  repoUrl?: string;
  updatedAt: string;
  signed?: boolean;
  specVersion?: SpecVersion;
  v1Valid?: boolean;
  errorCount?: number;
  warningCount?: number;
  health?: AgentHealth;
  card: AgentCard;
}

export interface RegistrySummaryItem {
  slug: string;
  name: string;
  description: string;
  version: string;
  organization: string;
  category: RegistryCategory;
  status: RegistryStatus;
  source: "curated" | "crawled";
  cardUrl: string;
  repoUrl?: string;
  updatedAt: string;
  bindings: string[];
  streaming: boolean;
  pushNotifications: boolean;
  extendedAgentCard: boolean;
  hasAuth: boolean;
  signed: boolean;
  skillCount: number;
  tags: string[];
  specVersion: SpecVersion;
  v1Valid: boolean;
  errorCount: number;
  warningCount: number;
  health?: AgentHealth;
}

export interface RegistryStats {
  total: number;
  online: number;
  v1Compliant: number;
  legacyV03: number;
  mixed: number;
  streamingCount: number;
  pushCount: number;
  signedCount: number;
  byBinding: Record<string, number>;
  byCategory: Record<string, number>;
  lastCrawledAt?: string;
}

export interface RegistryIndex {
  schemaVersion: string;
  generatedAt: string;
  total: number;
  stats: RegistryStats;
  entries: RegistryEntry[];
}

export interface RegistrySummaryIndex {
  schemaVersion: string;
  generatedAt: string;
  total: number;
  stats: RegistryStats;
  entries: RegistrySummaryItem[];
}
