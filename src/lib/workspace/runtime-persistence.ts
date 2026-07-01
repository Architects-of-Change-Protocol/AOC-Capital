import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { deriveAwakeningState, type AwakeningState } from "@/lib/workspace/awakening-state";
import { emptyImprintState, type PMImprintState } from "@/lib/workspace/operational-imprint-profile";
import { emptyValidationState, type ValidationState } from "@/lib/workspace/runtime-validation";

export type RuntimeFlagsState = { runtimeValidationEnabled: boolean };
export type RuntimePersistenceScope = { companyId: string; workspaceId: string; userId: string };
export type RuntimeHydrationIntegrity = "healthy" | "recovered" | "partial";
export type RuntimeSyncStatus = "synced" | "syncing" | "recovering" | "fallback";

type WorkspaceRuntimeRow = {
  company_id: string; workspace_id: string; user_id: string;
  awakening_state: unknown; imprint_state: unknown; validation_state: unknown; flags: unknown; updated_at?: string;
};

const FLAG_KEY = "pmfreak.beta.ENABLE_RUNTIME_VALIDATION";
const LEGACY = { awakening: "pmfreak.awakening", imprint: "pmfreak.imprint", validation: "pmfreak.validation" };

function legacyKeys(s: RuntimePersistenceScope){return {
  awakening:`${LEGACY.awakening}.${s.companyId}.${s.workspaceId}`,
  imprint:`${LEGACY.imprint}.${s.companyId}.${s.workspaceId}.${s.userId}`,
  validation:`${LEGACY.validation}.${s.companyId}.${s.workspaceId}.${s.userId}`,
};}

function safeParse<T>(value: unknown, fallback: T): T { try { return typeof value === "string" ? JSON.parse(value) as T : (value as T) ?? fallback; } catch { return fallback; } }

export class TenantRuntimePersistence {
  private memory = new Map<string, WorkspaceRuntimeRow>();
  private key(s: RuntimePersistenceScope){ return `${s.companyId}:${s.workspaceId}:${s.userId}`; }
  private async loadRow(scope: RuntimePersistenceScope): Promise<WorkspaceRuntimeRow | null> {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from("workspace_runtime_state").select("*").eq("company_id", scope.companyId).eq("workspace_id", scope.workspaceId).eq("user_id", scope.userId).maybeSingle();
    if (error) throw error;
    return data as WorkspaceRuntimeRow | null;
  }
  private async upsertRow(scope: RuntimePersistenceScope, patch: Partial<WorkspaceRuntimeRow>): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    const payload = { company_id: scope.companyId, workspace_id: scope.workspaceId, user_id: scope.userId, ...patch };
    const { error } = await supabase.from("workspace_runtime_state").upsert(payload, { onConflict: "company_id,workspace_id,user_id" });
    if (error) throw error;
    this.memory.set(this.key(scope), payload as WorkspaceRuntimeRow);
  }
  async loadAwakening(scope: RuntimePersistenceScope): Promise<AwakeningState> { try { const row = await this.loadRow(scope); return safeParse<AwakeningState>(row?.awakening_state, deriveAwakeningState(0)); } catch { return safeParse(this.memory.get(this.key(scope))?.awakening_state, deriveAwakeningState(0)); } }
  async persistAwakening(scope: RuntimePersistenceScope, state: AwakeningState): Promise<void> { await this.upsertRow(scope, { awakening_state: state, updated_at: new Date().toISOString() }); }
  async loadImprint(scope: RuntimePersistenceScope): Promise<PMImprintState> { try { const row = await this.loadRow(scope); return safeParse(row?.imprint_state, emptyImprintState()); } catch { return safeParse(this.memory.get(this.key(scope))?.imprint_state, emptyImprintState()); } }
  async persistImprint(scope: RuntimePersistenceScope, state: PMImprintState): Promise<void> { await this.upsertRow(scope, { imprint_state: state, updated_at: new Date().toISOString() }); }
  async loadValidation(scope: RuntimePersistenceScope): Promise<ValidationState> { try { const row = await this.loadRow(scope); return safeParse(row?.validation_state, emptyValidationState()); } catch { return safeParse(this.memory.get(this.key(scope))?.validation_state, emptyValidationState()); } }
  async persistValidation(scope: RuntimePersistenceScope, state: ValidationState): Promise<void> { await this.upsertRow(scope, { validation_state: state, updated_at: new Date().toISOString() }); }
  async loadFlags(scope: RuntimePersistenceScope): Promise<RuntimeFlagsState> { try { const row = await this.loadRow(scope); return safeParse(row?.flags, { runtimeValidationEnabled: process.env["NEXT_PUBLIC_ENABLE_RUNTIME_VALIDATION"] === "true" }); } catch { return safeParse(this.memory.get(this.key(scope))?.flags, { runtimeValidationEnabled: true }); } }
  async persistFlags(scope: RuntimePersistenceScope, state: RuntimeFlagsState): Promise<void> { await this.upsertRow(scope, { flags: state, updated_at: new Date().toISOString() }); }
  async migrateLegacyLocalState(scope: RuntimePersistenceScope): Promise<boolean> {
    if (typeof window === "undefined") return false; const k = legacyKeys(scope);
    const awakeningRaw = window.localStorage.getItem(k.awakening); const imprintRaw = window.localStorage.getItem(k.imprint); const validationRaw = window.localStorage.getItem(k.validation);
    if (!awakeningRaw && !imprintRaw && !validationRaw) return false;
    await this.upsertRow(scope, {
      awakening_state: awakeningRaw ? safeParse(awakeningRaw, deriveAwakeningState(0)) : deriveAwakeningState(0),
      imprint_state: imprintRaw ? safeParse(imprintRaw, emptyImprintState()) : emptyImprintState(),
      validation_state: validationRaw ? safeParse(validationRaw, emptyValidationState()) : emptyValidationState(),
      flags: { runtimeValidationEnabled: window.localStorage.getItem(FLAG_KEY) === "true" },
      updated_at: new Date().toISOString(),
    });
    window.localStorage.removeItem(k.awakening); window.localStorage.removeItem(k.imprint); window.localStorage.removeItem(k.validation);
    return true;
  }
}

export const runtimePersistence = new TenantRuntimePersistence();
