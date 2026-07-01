export * as AocProtocol from "@/lib/aoc/protocol/types";
export * as AocEnterpriseRuntime from "@/lib/aoc/enterprise/runtime";
export * from "@/lib/aoc/compatibility/legacy-policy-map";
export * from "@/lib/aoc/compatibility/legacy-audit-map";
export * from "@/lib/aoc/compatibility/legacy-delegation-map";

/**
 * Governance core — canonical entry point for governance evaluation.
 * Prefer these over direct @aoc-enterprise/runtime imports in product code.
 */
export {
  evaluateRuntimeAuthorization,
  enforceRuntimeAuthorization,
} from "@/lib/aoc/enterprise/runtime";
