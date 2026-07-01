import type { RuntimeLineage } from "@/lib/aoc/contracts/lineage";
import type { RuntimeMetadata } from "@/lib/aoc/contracts/metadata";
import type { RuntimeErrorEnvelope } from "@/lib/aoc/contracts/errors";

export type SdkSuccessEnvelope<T> = {
  ok: true;
  data: T;
  lineage?: RuntimeLineage;
  runtime?: RuntimeMetadata;
  audit?: Record<string, unknown>;
};

export type SdkErrorEnvelope = RuntimeErrorEnvelope;

export type SdkEnvelope<T> = SdkSuccessEnvelope<T> | SdkErrorEnvelope;
