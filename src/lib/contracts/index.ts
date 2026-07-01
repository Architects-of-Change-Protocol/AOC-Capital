// Mirrored from operational-memory-v1 to avoid circular imports
const MEMORY_TYPE_VALUES = [
  "risks",
  "blockers",
  "decisions",
  "stakeholders",
  "action_items",
  "unresolved_questions",
  "dependencies",
  "milestones",
  "escalations",
] as const;

export type ValidationError = { field: string; message: string; received: unknown };

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: ValidationError[] };

export type Validator<T> = (value: unknown) => ParseResult<T>;

// --- Micro-library primitives ---

export function string(field: string): Validator<string> {
  return (value) => {
    if (typeof value === "string") return { ok: true, data: value };
    return { ok: false, errors: [{ field, message: "must be a string", received: value }] };
  };
}

export function nonEmptyString(field: string): Validator<string> {
  return (value) => {
    if (typeof value !== "string") {
      return { ok: false, errors: [{ field, message: "must be a string", received: value }] };
    }
    if (value.trim().length === 0) {
      return { ok: false, errors: [{ field, message: "must be non-empty", received: value }] };
    }
    return { ok: true, data: value };
  };
}

export function optionalString(field: string): Validator<string | null | undefined> {
  return (value) => {
    if (value === null || value === undefined) return { ok: true, data: value };
    if (typeof value === "string") return { ok: true, data: value };
    return { ok: false, errors: [{ field, message: "must be a string or absent", received: value }] };
  };
}

export function stringEnum<T extends string>(field: string, values: readonly T[]): Validator<T> {
  return (value) => {
    if (typeof value === "string" && (values as readonly string[]).includes(value)) {
      return { ok: true, data: value as T };
    }
    return {
      ok: false,
      errors: [{ field, message: `must be one of: ${values.join(", ")}`, received: value }],
    };
  };
}

export function stringArray(field: string): Validator<string[]> {
  return (value) => {
    if (!Array.isArray(value)) {
      return { ok: false, errors: [{ field, message: "must be an array", received: value }] };
    }
    const errors: ValidationError[] = [];
    const data: string[] = [];
    for (let i = 0; i < value.length; i++) {
      if (typeof value[i] !== "string") {
        errors.push({ field: `${field}[${i}]`, message: "must be a string", received: value[i] });
      } else {
        data.push(value[i] as string);
      }
    }
    if (errors.length > 0) return { ok: false, errors };
    return { ok: true, data };
  };
}

export function optionalStringArray(field: string): Validator<string[] | undefined> {
  return (value) => {
    if (value === undefined) return { ok: true, data: undefined };
    return stringArray(field)(value);
  };
}

export function boolean(field: string): Validator<boolean> {
  return (value) => {
    if (typeof value === "boolean") return { ok: true, data: value };
    return { ok: false, errors: [{ field, message: "must be a boolean", received: value }] };
  };
}

export function object<T>(
  field: string,
  shape: { [K in keyof T]: Validator<T[K]> }
): Validator<T> {
  return (value) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { ok: false, errors: [{ field, message: "must be an object", received: value }] };
    }
    const errors: ValidationError[] = [];
    const data = {} as T;
    for (const key of Object.keys(shape) as (keyof T)[]) {
      const result = shape[key]((value as Record<string, unknown>)[key as string]);
      if (result.ok) {
        data[key] = result.data;
      } else {
        errors.push(...result.errors);
      }
    }
    if (errors.length > 0) return { ok: false, errors };
    return { ok: true, data };
  };
}

export function array<T>(field: string, itemValidator: Validator<T>): Validator<T[]> {
  return (value) => {
    if (!Array.isArray(value)) {
      return { ok: false, errors: [{ field, message: "must be an array", received: value }] };
    }
    const errors: ValidationError[] = [];
    const data: T[] = [];
    for (let i = 0; i < value.length; i++) {
      const result = itemValidator(value[i]);
      if (result.ok) {
        data.push(result.data);
      } else {
        errors.push(...result.errors);
      }
    }
    if (errors.length > 0) return { ok: false, errors };
    return { ok: true, data };
  };
}

export function nullable<T>(field: string, inner: Validator<T>): Validator<T | null> {
  return (value) => {
    if (value === null) return { ok: true, data: null };
    const result = inner(value);
    if (result.ok) return { ok: true, data: result.data };
    return result as ParseResult<T | null>;
  };
}

export function partial<T>(validators: { [K in keyof T]: Validator<T[K]> }): Validator<Partial<T>> {
  return (value) => {
    const obj =
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    const data: Partial<T> = {};
    for (const key of Object.keys(validators) as (keyof T)[]) {
      const result = validators[key](obj[key as string]);
      if (result.ok) {
        data[key] = result.data;
      }
      // fail-soft: drop fields that fail
    }
    return { ok: true, data };
  };
}

// --- Internal helpers ---

const optionalStringEnum = <T extends string>(
  field: string,
  values: readonly T[]
): Validator<T | undefined> => {
  return (value) => {
    if (value === undefined || value === null) return { ok: true, data: undefined };
    if (typeof value === "string" && (values as readonly string[]).includes(value)) {
      return { ok: true, data: value as T };
    }
    return {
      ok: false,
      errors: [{ field, message: `must be one of: ${values.join(", ")} or absent`, received: value }],
    };
  };
};

const optionalStringMaxLen = (field: string, maxLength: number): Validator<string | null | undefined> => {
  return (value) => {
    const result = optionalString(field)(value);
    if (!result.ok) return result;
    if (typeof result.data === "string" && result.data.length > maxLength) {
      return {
        ok: false,
        errors: [{ field, message: `must be at most ${maxLength} characters`, received: value }],
      };
    }
    return result;
  };
};

const truncatingOptionalString = (field: string, maxLength: number): Validator<string | null | undefined> => {
  return (value) => {
    const result = optionalString(field)(value);
    if (!result.ok) return result;
    if (typeof result.data === "string" && result.data.length > maxLength) {
      return { ok: true, data: result.data.slice(0, maxLength) };
    }
    return result;
  };
};

const filteredStringArray = (field: string, maxItemLength: number, maxItems?: number): Validator<string[]> => {
  return (value) => {
    if (!Array.isArray(value)) {
      return { ok: false, errors: [{ field, message: "must be an array", received: value }] };
    }
    const source = maxItems !== undefined ? value.slice(0, maxItems) : value;
    const data = source
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.slice(0, maxItemLength));
    return { ok: true, data };
  };
};

const nonEmptyStringBounded = (field: string, min: number, max: number): Validator<string> => {
  return (value) => {
    const result = nonEmptyString(field)(value);
    if (!result.ok) return result;
    if (result.data.length < min) {
      return { ok: false, errors: [{ field, message: `must be at least ${min} characters`, received: value }] };
    }
    if (result.data.length > max) {
      return { ok: false, errors: [{ field, message: `must be at most ${max} characters`, received: value }] };
    }
    return result;
  };
};

// --- CONTRACT 1: CopilotRequestContract ---

const COPILOT_ROLE_VALUES = ["pm", "executive", "team_member", "external_stakeholder", "admin"] as const;
const METHODOLOGY_VALUES = ["PMI", "Agile", "Hybrid", "General PMO"] as const;

type CopilotRequestShape = {
  message: string;
  projectId: string | null | undefined;
  projectName: string | null | undefined;
  companyId: string | null | undefined;
  role: (typeof COPILOT_ROLE_VALUES)[number] | undefined;
  methodology: (typeof METHODOLOGY_VALUES)[number] | undefined;
};

export const CopilotRequestContract: Validator<CopilotRequestShape> = object<CopilotRequestShape>(
  "CopilotRequest",
  {
    message: nonEmptyString("message"),
    projectId: optionalStringMaxLen("projectId", 100),
    projectName: optionalStringMaxLen("projectName", 200),
    companyId: optionalString("companyId"),
    role: optionalStringEnum("role", COPILOT_ROLE_VALUES),
    methodology: optionalStringEnum("methodology", METHODOLOGY_VALUES),
  }
);

// --- CONTRACT 2: CopilotResponseContract ---

type CardType = "Risks" | "Next Actions" | "Draft Email" | "RACI" | "Checklist";
const CARD_TYPE_VALUES = ["Risks", "Next Actions", "Draft Email", "RACI", "Checklist"] as const;

const cardValidator = object<{ type: CardType; title: string; items: string[] }>("card", {
  type: stringEnum("type", CARD_TYPE_VALUES),
  title: string("title"),
  items: stringArray("items"),
});

const cappedCardsValidator: Validator<Array<{ type: CardType; title: string; items: string[] }>> = (value) => {
  if (!Array.isArray(value)) {
    return { ok: false, errors: [{ field: "cards", message: "must be an array", received: value }] };
  }
  const valid: Array<{ type: CardType; title: string; items: string[] }> = [];
  for (const card of value.slice(0, 5)) {
    const r = cardValidator(card);
    if (r.ok) valid.push(r.data);
  }
  return { ok: true, data: valid };
};

type CopilotResponseShape = {
  answer: string | null | undefined;
  diagnosis: string | null | undefined;
  immediateAction: string | null | undefined;
  reinforcement: string | null | undefined;
  nextStep: string | null | undefined;
  facts: string[];
  bestPractices: string[];
  assumptions: string[];
  cards: Array<{ type: CardType; title: string; items: string[] }>;
  requiresMoreContext: boolean;
  contextGapQuestions: string[];
};

export const CopilotResponseContract: Validator<Partial<CopilotResponseShape>> = partial<CopilotResponseShape>({
  answer: optionalString("answer"),
  diagnosis: truncatingOptionalString("diagnosis", 500),
  immediateAction: truncatingOptionalString("immediateAction", 500),
  reinforcement: truncatingOptionalString("reinforcement", 500),
  nextStep: truncatingOptionalString("nextStep", 500),
  facts: filteredStringArray("facts", 300),
  bestPractices: filteredStringArray("bestPractices", 300),
  assumptions: filteredStringArray("assumptions", 300),
  cards: cappedCardsValidator,
  requiresMoreContext: boolean("requiresMoreContext"),
  contextGapQuestions: filteredStringArray("contextGapQuestions", 300, 5),
});

// --- CONTRACT 3: OperationalMemoryEntryContract ---

type MemoryType = (typeof MEMORY_TYPE_VALUES)[number];
type MemoryStatus = "active" | "resolved";
type MemorySourceType = "upload" | "copilot_message" | "ingestion_summary" | "manual";

const STATUS_VALUES = ["active", "resolved"] as const;
const SOURCE_TYPE_VALUES = ["upload", "copilot_message", "ingestion_summary", "manual"] as const;

type OperationalMemoryEntryShape = {
  id: string;
  companyId: string;
  projectId: string | null;
  memoryType: MemoryType;
  memoryText: string;
  status: MemoryStatus;
  sourceType: MemorySourceType;
  sourceReference: string;
  createdAt: string;
};

export const OperationalMemoryEntryContract: Validator<OperationalMemoryEntryShape> =
  object<OperationalMemoryEntryShape>("OperationalMemoryEntry", {
    id: nonEmptyString("id"),
    companyId: nonEmptyString("companyId"),
    projectId: nullable("projectId", string("projectId")),
    memoryType: stringEnum("memoryType", MEMORY_TYPE_VALUES),
    memoryText: nonEmptyStringBounded("memoryText", 1, 2000),
    status: stringEnum("status", STATUS_VALUES),
    sourceType: stringEnum("sourceType", SOURCE_TYPE_VALUES),
    sourceReference: string("sourceReference"),
    createdAt: string("createdAt"),
  });

// --- CONTRACT 4: OperationalMemoryCandidateContract ---

type OperationalMemoryCandidateShape = {
  memoryType: MemoryType;
  memoryText: string;
  sourceType: MemorySourceType;
  sourceReference: string;
  status: MemoryStatus;
};

export const OperationalMemoryCandidateContract: Validator<OperationalMemoryCandidateShape> =
  object<OperationalMemoryCandidateShape>("OperationalMemoryCandidate", {
    memoryType: stringEnum("memoryType", MEMORY_TYPE_VALUES),
    memoryText: nonEmptyStringBounded("memoryText", 14, 400),
    sourceType: stringEnum("sourceType", SOURCE_TYPE_VALUES),
    sourceReference: nonEmptyString("sourceReference"),
    status: stringEnum("status", STATUS_VALUES),
  });

// --- CONTRACT 5: AIResponseEnvelopeContract factory ---

export function createAIResponseEnvelopeValidator<T>(
  dataValidator: Validator<T>
): Validator<{ ok: boolean; data: T | null; error: string | null | undefined }> {
  return object("AIResponseEnvelope", {
    ok: boolean("ok"),
    data: nullable("data", dataValidator),
    error: optionalString("error"),
  });
}

// --- New primitives for contracts 6 and 7 ---

export function recordOrNull(field: string): Validator<Record<string, string>> {
  return (value) => {
    if (value === null || value === undefined) return { ok: true, data: {} };
    if (Array.isArray(value) || typeof value !== "object") {
      return { ok: false, errors: [{ field, message: "must be a plain object or null", received: value }] };
    }
    return { ok: true, data: value as Record<string, string> };
  };
}

export function numberInRange(field: string, min: number, max: number): Validator<number> {
  return (value) => {
    if (typeof value !== "number" || !isFinite(value)) {
      return { ok: false, errors: [{ field, message: "must be a finite number", received: value }] };
    }
    if (value < min || value > max) {
      return { ok: false, errors: [{ field, message: `must be between ${min} and ${max}`, received: value }] };
    }
    return { ok: true, data: value };
  };
}

// --- CONTRACT 6: OperationalMemoryRecordContract ---

const OPERATIONAL_DOMAIN_VALUES = [
  "stakeholder_intelligence",
  "delivery_intelligence",
  "risk_intelligence",
  "pmo_governance",
  "team_health",
  "executive_context",
  "operational_memory",
] as const;

type OperationalMemoryRecordShape = {
  id: string;
  companyId: string;
  projectId: string | null;
  domain: (typeof OPERATIONAL_DOMAIN_VALUES)[number];
  title: string;
  data: Record<string, string>;
  confidenceScore: number;
  completionScore: number;
  missingFields: string[] | undefined;
  extractedFacts: string[] | undefined;
  createdAt: string;
  updatedAt: string;
};

export const OperationalMemoryRecordContract: Validator<OperationalMemoryRecordShape> =
  object<OperationalMemoryRecordShape>("OperationalMemoryRecord", {
    id: nonEmptyString("id"),
    companyId: nonEmptyString("companyId"),
    projectId: nullable("projectId", string("projectId")),
    domain: stringEnum("domain", OPERATIONAL_DOMAIN_VALUES),
    title: nonEmptyString("title"),
    data: recordOrNull("data"),
    confidenceScore: numberInRange("confidenceScore", 0, 100),
    completionScore: numberInRange("completionScore", 0, 100),
    missingFields: optionalStringArray("missingFields"),
    extractedFacts: optionalStringArray("extractedFacts"),
    createdAt: nonEmptyString("createdAt"),
    updatedAt: nonEmptyString("updatedAt"),
  });

// --- CONTRACT 7: StoredProjectAnalysisContract ---

const COMPLEXITY_LEVEL_VALUES = ["Low", "Medium", "High"] as const;

type StoredProjectAnalysisShape = {
  id: string;
  projectName: string;
  uploadDate: string;
  executiveSummary: string;
  requirements: string[] | undefined;
  risks: string[] | undefined;
  dependencies: string[] | undefined;
  ambiguities: string[] | undefined;
  complexity: (typeof COMPLEXITY_LEVEL_VALUES)[number];
  sourceFileNames: string[] | undefined;
  similarProjects: string[] | undefined;
  historicalRisks: string[] | undefined;
  estimatedRelativeComplexity: string;
};

export const StoredProjectAnalysisContract: Validator<StoredProjectAnalysisShape> =
  object<StoredProjectAnalysisShape>("StoredProjectAnalysis", {
    id: nonEmptyString("id"),
    projectName: nonEmptyString("projectName"),
    uploadDate: nonEmptyString("uploadDate"),
    executiveSummary: string("executiveSummary"),
    requirements: optionalStringArray("requirements"),
    risks: optionalStringArray("risks"),
    dependencies: optionalStringArray("dependencies"),
    ambiguities: optionalStringArray("ambiguities"),
    complexity: stringEnum("complexity", COMPLEXITY_LEVEL_VALUES),
    sourceFileNames: optionalStringArray("sourceFileNames"),
    similarProjects: optionalStringArray("similarProjects"),
    historicalRisks: optionalStringArray("historicalRisks"),
    estimatedRelativeComplexity: string("estimatedRelativeComplexity"),
  });
