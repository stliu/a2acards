export declare const CORE_PROTOCOL_BINDINGS: readonly string[];
export declare const REGISTRY_CATEGORIES: readonly string[];

export interface ValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
  hint?: string;
}

export interface NormalizedInterface {
  url: string;
  protocolBinding: string;
  protocolVersion: string;
  tenant?: string;
}

export interface CardValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  detectedVersion: "1.0" | "0.3-legacy" | "mixed" | "unknown";
}

export interface RegistryValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export declare function extractInterfaces(card: Record<string, unknown>): NormalizedInterface[];
export declare function isRecognizableAgentCard(input: unknown): boolean;
export declare function validateAgentCard(input: unknown): CardValidationResult;
export declare function validateRegistryEntry(
  entry: unknown,
  expectedSlug?: string,
): RegistryValidationResult;
