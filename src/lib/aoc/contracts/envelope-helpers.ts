import { runtimeError, type RuntimeErrorCode, type RuntimeErrorEnvelope } from "@/lib/aoc/contracts/errors";
import type { RuntimeLineage } from "@/lib/aoc/contracts/lineage";
import type { RuntimeMetadata, RuntimeScope } from "@/lib/aoc/contracts/metadata";
import type { SdkEnvelope, SdkSuccessEnvelope } from "@/lib/aoc/contracts/sdk-envelope";

export function sdkSuccess<T>(data: T, options?: { lineage?: RuntimeLineage; runtime?: RuntimeMetadata; audit?: Record<string, unknown> }): SdkSuccessEnvelope<T> {
  return { ok: true, data, lineage: options?.lineage, runtime: options?.runtime, audit: options?.audit };
}

export function sdkRuntimeError(input: {
  code: RuntimeErrorCode;
  message: string;
  decisionId?: string;
  metadata?: Record<string, unknown>;
}): RuntimeErrorEnvelope {
  return { ...runtimeError(input.code, input.message, input.metadata), decisionId: input.decisionId };
}

export function runtimeMetadata(routeId: string, scope?: RuntimeScope): RuntimeMetadata {
  return { routeId, source: "sdk-route", evaluatedAt: new Date().toISOString(), scope };
}

export function withRuntime<T>(envelope: SdkSuccessEnvelope<T>, routeId: string, scope?: RuntimeScope): SdkEnvelope<T> {
  return { ...envelope, runtime: envelope.runtime ?? runtimeMetadata(routeId, scope) };
}
