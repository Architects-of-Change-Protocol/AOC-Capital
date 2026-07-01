import {
  buildEnterpriseRuntimeRequest as buildLegacyEnterpriseRuntimeRequest,
  type PMFreakRuntimeContextInput,
} from "@/lib/aoc/pmfreak-runtime-consumer";

/**
 * Transitional compatibility wrapper for app/product runtime authority calls.
 *
 * App-layer code must import runtime request builders from `@/aoc/runtime-consumer`
 * and not from `@/lib/aoc/pmfreak-runtime-consumer`.
 */
export function buildRuntimeConsumerRequest(input: PMFreakRuntimeContextInput) {
  return buildLegacyEnterpriseRuntimeRequest(input);
}

/**
 * Compatibility alias to keep route migrations surgical while moving callers
 * onto the runtime-consumer boundary.
 */
export const buildEnterpriseRuntimeRequest = buildRuntimeConsumerRequest;

export type { PMFreakRuntimeContextInput };
