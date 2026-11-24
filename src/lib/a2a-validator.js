export const CORE_PROTOCOL_BINDINGS = ["JSONRPC", "HTTP+JSON", "GRPC"];

export const REGISTRY_CATEGORIES = [
  "Coding & Dev",
  "Data & Research",
  "Finance & Ops",
  "Travel & Commerce",
  "Enterprise",
  "Creative & Media",
];

const MIME_RE = /^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseHttpUrl(value) {
  if (!isNonEmptyString(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts normalized transport interfaces from either A2A v1.0 (`supportedInterfaces`)
 * or legacy v0.3 (`url` + `preferredTransport` + `additionalInterfaces`).
 * @param {Record<string, any>} card
 */
export function extractInterfaces(card) {
  if (!isRecord(card)) return [];
  if (Array.isArray(card.supportedInterfaces) && card.supportedInterfaces.length > 0) {
    return card.supportedInterfaces
      .filter((iface) => isRecord(iface) && isNonEmptyString(iface.url))
      .map((iface) => ({
        url: String(iface.url).trim(),
        protocolBinding: isNonEmptyString(iface.protocolBinding)
          ? String(iface.protocolBinding).trim()
          : "JSONRPC",
        protocolVersion: isNonEmptyString(iface.protocolVersion)
          ? String(iface.protocolVersion).trim()
          : "1.0",
        ...(isNonEmptyString(iface.tenant) ? { tenant: String(iface.tenant).trim() } : {}),
      }));
  }

  const legacy = [];
  if (isNonEmptyString(card.url)) {
    legacy.push({
      url: String(card.url).trim(),
      protocolBinding: isNonEmptyString(card.preferredTransport)
        ? String(card.preferredTransport).trim()
        : "JSONRPC",
      protocolVersion: isNonEmptyString(card.protocolVersion)
        ? String(card.protocolVersion).trim()
        : "0.3",
    });
  }
  if (Array.isArray(card.additionalInterfaces)) {
    for (const iface of card.additionalInterfaces) {
      if (isRecord(iface) && isNonEmptyString(iface.url)) {
        legacy.push({
          url: String(iface.url).trim(),
          protocolBinding: isNonEmptyString(iface.transport || iface.protocolBinding)
            ? String(iface.transport || iface.protocolBinding).trim()
            : "HTTP+JSON",
          protocolVersion: isNonEmptyString(iface.protocolVersion || card.protocolVersion)
            ? String(iface.protocolVersion || card.protocolVersion).trim()
            : "0.3",
        });
      }
    }
  }
  return legacy;
}

/**
 * Validates an A2A v1.0 Agent Card payload and detects v0.3 legacy patterns.
 * @param {unknown} input
 */
export function validateAgentCard(input) {
  /** @type {Array<{path: string, message: string, severity: "error" | "warning", hint?: string}>} */
  const issues = [];

  if (!isRecord(input)) {
    issues.push({
      path: "$",
      severity: "error",
      message: "Agent Card root must be a JSON object.",
    });
    return {
      valid: false,
      errors: issues,
      warnings: [],
      detectedVersion: "unknown",
    };
  }

  let hasLegacyFields = false;

  if ("url" in input) {
    hasLegacyFields = true;
    issues.push({
      path: "url",
      severity: "warning",
      message: "Top-level `url` was removed in A2A v1.0.",
      hint: "Move endpoint URLs into `supportedInterfaces[].url` with `protocolBinding` and `protocolVersion`.",
    });
  }
  if ("protocolVersion" in input) {
    hasLegacyFields = true;
    issues.push({
      path: "protocolVersion",
      severity: "warning",
      message: "Top-level `protocolVersion` was removed in A2A v1.0.",
      hint: "Declare `protocolVersion` on each entry in `supportedInterfaces` (for example `\"1.0\"`).",
    });
  }
  if ("preferredTransport" in input || "additionalInterfaces" in input) {
    hasLegacyFields = true;
    issues.push({
      path: "preferredTransport",
      severity: "warning",
      message: "`preferredTransport` and `additionalInterfaces` were replaced in A2A v1.0.",
      hint: "List ordered entries in `supportedInterfaces`; the first entry is the preferred transport.",
    });
  }
  if ("supportsAuthenticatedExtendedCard" in input) {
    hasLegacyFields = true;
    issues.push({
      path: "supportsAuthenticatedExtendedCard",
      severity: "warning",
      message: "`supportsAuthenticatedExtendedCard` moved under `capabilities.extendedAgentCard` in A2A v1.0.",
    });
  }

  // Required identity fields
  if (!isNonEmptyString(input.name)) {
    issues.push({
      path: "name",
      severity: "error",
      message: "`name` is required and must be a non-empty string.",
    });
  }
  if (!isNonEmptyString(input.description)) {
    issues.push({
      path: "description",
      severity: "error",
      message: "`description` is required and must be a non-empty string.",
    });
  }
  if (!isNonEmptyString(input.version)) {
    issues.push({
      path: "version",
      severity: "error",
      message: "`version` is required (your agent's release version, e.g. `1.0.0`).",
    });
  }

  // supportedInterfaces
  if (!Array.isArray(input.supportedInterfaces) || input.supportedInterfaces.length === 0) {
    issues.push({
      path: "supportedInterfaces",
      severity: "error",
      message: "`supportedInterfaces` is required and must contain at least one interface entry.",
      hint: "Example: [{ url: \"https://agent.example.com/a2a/v1\", protocolBinding: \"JSONRPC\", protocolVersion: \"1.0\" }]",
    });
  } else {
    input.supportedInterfaces.forEach((iface, index) => {
      const prefix = `supportedInterfaces[${index}]`;
      if (!isRecord(iface)) {
        issues.push({
          path: prefix,
          severity: "error",
          message: "Interface entry must be an object.",
        });
        return;
      }
      const parsedUrl = parseHttpUrl(iface.url);
      if (!parsedUrl) {
        issues.push({
          path: `${prefix}.url`,
          severity: "error",
          message: "Interface `url` must be an absolute HTTP(S) URL.",
        });
      } else if (parsedUrl.protocol === "http:" && parsedUrl.hostname !== "localhost" && parsedUrl.hostname !== "127.0.0.1") {
        issues.push({
          path: `${prefix}.url`,
          severity: "warning",
          message: "Production A2A endpoints should use HTTPS.",
        });
      }

      if (!isNonEmptyString(iface.protocolBinding)) {
        issues.push({
          path: `${prefix}.protocolBinding`,
          severity: "error",
          message: "`protocolBinding` is required (e.g. `JSONRPC`, `HTTP+JSON`, or `GRPC`).",
        });
      } else if (!CORE_PROTOCOL_BINDINGS.includes(iface.protocolBinding)) {
        issues.push({
          path: `${prefix}.protocolBinding`,
          severity: "warning",
          message: `Non-core protocolBinding \`${iface.protocolBinding}\`. Official v1.0 core bindings are JSONRPC, HTTP+JSON, and GRPC.`,
        });
      }

      if (!isNonEmptyString(iface.protocolVersion)) {
        issues.push({
          path: `${prefix}.protocolVersion`,
          severity: "error",
          message: "`protocolVersion` is required on each interface (e.g. `1.0`).",
        });
      }
    });
  }

  // capabilities
  if (!isRecord(input.capabilities)) {
    issues.push({
      path: "capabilities",
      severity: "error",
      message: "`capabilities` object is required.",
    });
  } else {
    for (const flag of ["streaming", "pushNotifications", "extendedAgentCard"]) {
      if (flag in input.capabilities && typeof input.capabilities[flag] !== "boolean") {
        issues.push({
          path: `capabilities.${flag}`,
          severity: "error",
          message: `\`capabilities.${flag}\` must be a boolean.`,
        });
      }
    }
  }

  // defaultInputModes & defaultOutputModes
  for (const field of ["defaultInputModes", "defaultOutputModes"]) {
    if (!Array.isArray(input[field]) || input[field].length === 0) {
      issues.push({
        path: field,
        severity: "error",
        message: `\`${field}\` is required and must list at least one MIME media type (e.g. \`text/plain\`).`,
      });
    } else {
      input[field].forEach((mode, idx) => {
        if (!isNonEmptyString(mode)) {
          issues.push({
            path: `${field}[${idx}]`,
            severity: "error",
            message: "Media type must be a non-empty string.",
          });
        } else if (!MIME_RE.test(mode)) {
          issues.push({
            path: `${field}[${idx}]`,
            severity: "warning",
            message: `\`${mode}\` does not look like a standard MIME type (e.g. \`text/plain\`, \`application/json\`).`,
          });
        }
      });
    }
  }

  // skills
  if (!Array.isArray(input.skills) || input.skills.length === 0) {
    issues.push({
      path: "skills",
      severity: "error",
      message: "`skills` is required and must declare at least one skill.",
    });
  } else {
    const seenIds = new Set();
    input.skills.forEach((skill, idx) => {
      const prefix = `skills[${idx}]`;
      if (!isRecord(skill)) {
        issues.push({
          path: prefix,
          severity: "error",
          message: "Skill entry must be an object.",
        });
        return;
      }
      if (!isNonEmptyString(skill.id)) {
        issues.push({
          path: `${prefix}.id`,
          severity: "error",
          message: "Skill `id` is required.",
        });
      } else if (seenIds.has(skill.id)) {
        issues.push({
          path: `${prefix}.id`,
          severity: "error",
          message: `Duplicate skill id \`${skill.id}\`.`,
        });
      } else {
        seenIds.add(skill.id);
      }

      if (!isNonEmptyString(skill.name)) {
        issues.push({
          path: `${prefix}.name`,
          severity: "error",
          message: "Skill `name` is required.",
        });
      }
      if (!isNonEmptyString(skill.description)) {
        issues.push({
          path: `${prefix}.description`,
          severity: "error",
          message: "Skill `description` is required.",
        });
      }
      if (!Array.isArray(skill.tags) || skill.tags.length === 0 || !skill.tags.every(isNonEmptyString)) {
        issues.push({
          path: `${prefix}.tags`,
          severity: "error",
          message: "Skill `tags` is required and must contain at least one non-empty string.",
        });
      }
    });
  }

  // Optional provider validation
  if ("provider" in input && input.provider !== undefined && input.provider !== null) {
    if (!isRecord(input.provider) || !isNonEmptyString(input.provider.organization) || !parseHttpUrl(input.provider.url)) {
      issues.push({
        path: "provider",
        severity: "error",
        message: "`provider` must include `organization` and a valid HTTP(S) `url`.",
      });
    }
  }

  if ("documentationUrl" in input && input.documentationUrl !== undefined && input.documentationUrl !== null && !parseHttpUrl(input.documentationUrl)) {
    issues.push({
      path: "documentationUrl",
      severity: "error",
      message: "`documentationUrl` must be a valid HTTP(S) URL.",
    });
  }

  if ("iconUrl" in input && input.iconUrl !== undefined && input.iconUrl !== null && !parseHttpUrl(input.iconUrl)) {
    issues.push({
      path: "iconUrl",
      severity: "error",
      message: "`iconUrl` must be a valid HTTP(S) URL.",
    });
  }

  const errors = issues.filter((item) => item.severity === "error");
  const warnings = issues.filter((item) => item.severity === "warning");

  let detectedVersion = "1.0";
  if (hasLegacyFields && !Array.isArray(input.supportedInterfaces)) {
    detectedVersion = "0.3-legacy";
  } else if (hasLegacyFields) {
    detectedVersion = "mixed";
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    detectedVersion,
  };
}

/**
 * Loose check used by the crawler to accept real-world live A2A Agent Cards (v1.0 or v0.3)
 * even if they still carry legacy fields or minor schema warnings.
 * @param {unknown} input
 */
export function isRecognizableAgentCard(input) {
  if (!isRecord(input)) return false;
  if (!isNonEmptyString(input.name) || !isNonEmptyString(input.description)) return false;
  const interfaces = extractInterfaces(input);
  if (interfaces.length === 0) return false;
  const hasSkills = Array.isArray(input.skills) && input.skills.length > 0;
  const hasCapabilities = isRecord(input.capabilities);
  return hasSkills || hasCapabilities;
}

/**
 * Validates a curated registry entry wrapper stored under `registry/cards/<slug>.json`.
 * @param {unknown} entry
 * @param {string} [expectedSlug]
 */
export function validateRegistryEntry(entry, expectedSlug) {
  /** @type {Array<{path: string, message: string, severity: "error" | "warning", hint?: string}>} */
  const issues = [];

  if (!isRecord(entry)) {
    return {
      valid: false,
      errors: [{ path: "$", severity: "error", message: "Registry file must be a JSON object." }],
      warnings: [],
    };
  }

  if (!isNonEmptyString(entry.slug) || !SLUG_RE.test(entry.slug)) {
    issues.push({
      path: "slug",
      severity: "error",
      message: "`slug` must be lowercase alphanumeric words separated by hyphens.",
    });
  } else if (expectedSlug && entry.slug !== expectedSlug) {
    issues.push({
      path: "slug",
      severity: "error",
      message: `\`slug\` (\`${entry.slug}\`) must match filename (\`${expectedSlug}.json\`).`,
    });
  }

  if (!REGISTRY_CATEGORIES.includes(entry.category)) {
    issues.push({
      path: "category",
      severity: "error",
      message: `\`category\` must be one of: ${REGISTRY_CATEGORIES.join(", ")}.`,
    });
  }

  if (!["reference", "community", "verified"].includes(entry.status)) {
    issues.push({
      path: "status",
      severity: "error",
      message: "`status` must be `reference`, `community`, or `verified`.",
    });
  }

  if (!parseHttpUrl(entry.cardUrl)) {
    issues.push({
      path: "cardUrl",
      severity: "error",
      message: "`cardUrl` must be a valid HTTP(S) discovery URL (usually `https://<domain>/.well-known/agent-card.json`).",
    });
  }

  if (entry.repoUrl !== undefined && !parseHttpUrl(entry.repoUrl)) {
    issues.push({
      path: "repoUrl",
      severity: "error",
      message: "`repoUrl` must be a valid HTTP(S) URL when provided.",
    });
  }

  const cardResult = validateAgentCard(entry.card);
  for (const issue of [...cardResult.errors, ...cardResult.warnings]) {
    issues.push({
      ...issue,
      path: `card.${issue.path}`,
    });
  }

  const errors = issues.filter((item) => item.severity === "error");
  const warnings = issues.filter((item) => item.severity === "warning");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
