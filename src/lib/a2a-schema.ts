export {
  CORE_PROTOCOL_BINDINGS,
  REGISTRY_CATEGORIES,
  validateAgentCard,
  validateRegistryEntry,
} from "./a2a-validator.js";
export type {
  CardValidationResult,
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

export type RegistryStatus = "reference" | "community" | "verified";

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
  version: string;
  provider?: AgentProvider;
  documentationUrl?: string;
  iconUrl?: string;
  supportedInterfaces: AgentInterface[];
  capabilities: AgentCapabilities;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: AgentSkill[];
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
  cardUrl: string;
  repoUrl?: string;
  updatedAt: string;
  signed?: boolean;
  card: AgentCard;
}

export interface RegistryIndex {
  schemaVersion: string;
  generatedAt: string;
  total: number;
  entries: RegistryEntry[];
}
