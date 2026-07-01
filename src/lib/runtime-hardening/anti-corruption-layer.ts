import type { AntiCorruptionResult } from "./runtime-hardening-types";

export function sanitizeRuntimeEvidence(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.slice(0, 500));
}

export function normalizeRuntimeConfidence(raw: unknown): number {
  if (typeof raw !== "number" || isNaN(raw)) return 0.5;
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return raw;
}

export function validateRuntimeBoundaryIds(input: {
  tenantId?: unknown;
  workspaceId?: unknown;
}): { valid: boolean; rejectionReasons: string[] } {
  const reasons: string[] = [];
  if (input.tenantId !== undefined && input.tenantId !== null) {
    if (typeof input.tenantId !== "string" || input.tenantId.trim().length === 0) {
      reasons.push("tenantId must be a non-empty string when provided");
    }
  }
  if (input.workspaceId !== undefined && input.workspaceId !== null) {
    if (typeof input.workspaceId !== "string" || input.workspaceId.trim().length === 0) {
      reasons.push("workspaceId must be a non-empty string when provided");
    }
  }
  return { valid: reasons.length === 0, rejectionReasons: reasons };
}

export function rejectMalformedRuntimeSignal(signal: unknown): {
  accepted: boolean;
  rejectionReasons: string[];
} {
  const reasons: string[] = [];
  if (signal === null || signal === undefined) {
    reasons.push("signal is null or undefined");
  } else if (typeof signal !== "object") {
    reasons.push("signal must be an object");
  } else {
    const s = signal as Record<string, unknown>;
    if (!("subsystem" in s)) {
      reasons.push("signal missing required field: subsystem");
    }
    if (!("checkedAt" in s)) {
      reasons.push("signal missing required field: checkedAt");
    }
    if (!("evidence" in s) || !Array.isArray(s["evidence"])) {
      reasons.push("signal missing or malformed field: evidence (must be array)");
    }
  }
  return { accepted: reasons.length === 0, rejectionReasons: reasons };
}

export function enforceBoundedUncertainty(raw: unknown): string[] {
  if (!Array.isArray(raw)) return ["uncertainty not provided — treating as fully uncertain"];
  const filtered = raw.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
  if (filtered.length === 0) return ["empty uncertainty array provided"];
  return filtered.slice(0, 20);
}

export function buildAntiCorruptionResult(
  rawSignal: unknown,
  rawEvidence: unknown,
  rawConfidence: unknown,
  rawUncertainty: unknown,
  boundaryIds: { tenantId?: unknown; workspaceId?: unknown }
): AntiCorruptionResult {
  const signalCheck = rejectMalformedRuntimeSignal(rawSignal);
  const boundaryCheck = validateRuntimeBoundaryIds(boundaryIds);
  const rejectionReasons = [
    ...signalCheck.rejectionReasons,
    ...boundaryCheck.rejectionReasons,
  ];

  const sanitizedEvidence = sanitizeRuntimeEvidence(rawEvidence);
  const normalizedConfidence = normalizeRuntimeConfidence(rawConfidence);
  const _boundedUncertainty = enforceBoundedUncertainty(rawUncertainty);

  const sanitizedFields: string[] = [];
  if (sanitizedEvidence.length > 0) sanitizedFields.push("evidence");
  if (normalizedConfidence !== rawConfidence) sanitizedFields.push("confidence");

  return {
    valid: rejectionReasons.length === 0,
    rejectionReasons,
    sanitizedFields,
    checkedAt: new Date().toISOString(),
  };
}
