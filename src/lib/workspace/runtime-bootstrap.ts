import { deriveAwakeningState, type AwakeningState } from "@/lib/workspace/awakening-state";
import { emptyImprintState, type PMImprintState } from "@/lib/workspace/operational-imprint-profile";
import { emptyValidationState, type ValidationState } from "@/lib/workspace/runtime-validation";
import { runtimePersistence, type RuntimeFlagsState, type RuntimeHydrationIntegrity, type RuntimePersistenceScope } from "@/lib/workspace/runtime-persistence";

export type RuntimeBootstrapState = {
  awakening: AwakeningState;
  imprint: PMImprintState;
  validation: ValidationState;
  flags: RuntimeFlagsState;
  integrity: RuntimeHydrationIntegrity;
  resumedLabel: string;
};

export async function bootstrapRuntimeState(scope: RuntimePersistenceScope): Promise<RuntimeBootstrapState> {
  let integrity: RuntimeHydrationIntegrity = "healthy";
  try { await runtimePersistence.migrateLegacyLocalState(scope); } catch { integrity = "recovered"; }
  const [awakening, imprint, validation, flags] = await Promise.all([
    runtimePersistence.loadAwakening(scope), runtimePersistence.loadImprint(scope), runtimePersistence.loadValidation(scope), runtimePersistence.loadFlags(scope),
  ]);
  const resolved = {
    awakening: awakening ?? deriveAwakeningState(0),
    imprint: imprint ?? emptyImprintState(),
    validation: validation ?? emptyValidationState(),
    flags: flags ?? { runtimeValidationEnabled: true },
  };
  if (!resolved.imprint?.profile || !resolved.validation?.traces) integrity = "partial";
  const lastSeen = resolved.validation.traces.at(-1)?.timestamp;
  const resumedLabel = lastSeen && Date.now() - lastSeen > 1000 * 60 * 60 ? "Operational context resumed" : "Continuity restored";
  return { ...resolved, integrity, resumedLabel };
}
