export type AwakeningStage =
  | "dormant"
  | "initializing"
  | "orienting"
  | "engaged"
  | "expanded"
  | "fully-operational";

export type AgentCluster =
  | "context"
  | "memory"
  | "delivery"
  | "stakeholders"
  | "risk"
  | "executive"
  | "portfolio";

export type AwakeningState = {
  stage: AwakeningStage;
  awakenedAgents: AgentCluster[];
  interactionCount: number;
};

export const STAGE_AGENTS: Record<AwakeningStage, AgentCluster[]> = {
  dormant: [],
  initializing: ["context", "memory"],
  orienting: ["context", "memory", "delivery"],
  engaged: ["context", "memory", "delivery", "stakeholders", "risk"],
  expanded: ["context", "memory", "delivery", "stakeholders", "risk", "executive"],
  "fully-operational": ["context", "memory", "delivery", "stakeholders", "risk", "executive", "portfolio"],
};

// Minimum meaningful interaction count to reach each stage
export const STAGE_THRESHOLDS: Record<AwakeningStage, number> = {
  dormant: 0,
  initializing: 1,
  orienting: 2,
  engaged: 4,
  expanded: 7,
  "fully-operational": 10,
};

export function computeAwakeningStage(interactionCount: number): AwakeningStage {
  if (interactionCount >= 10) return "fully-operational";
  if (interactionCount >= 7) return "expanded";
  if (interactionCount >= 4) return "engaged";
  if (interactionCount >= 2) return "orienting";
  if (interactionCount >= 1) return "initializing";
  return "dormant";
}

export function deriveAwakeningState(interactionCount: number): AwakeningState {
  const stage = computeAwakeningStage(interactionCount);
  return {
    stage,
    awakenedAgents: STAGE_AGENTS[stage],
    interactionCount,
  };
}

// Whether a given lens href is unlocked at a given awakening stage
export function isLensUnlocked(href: string, stage: AwakeningStage): boolean {
  const unlockStage: Record<string, AwakeningStage> = {
    "/dashboard": "initializing",
    "/command-center": "engaged",
    "/executive": "expanded",
    "/portfolio": "fully-operational",
  };
  const required = unlockStage[href];
  if (!required) return true;
  return STAGE_THRESHOLDS[stage] >= STAGE_THRESHOLDS[required];
}

const STORAGE_KEY_PREFIX = "pmfreak.awakening";

function buildStorageKey(companyId: string, workspaceId: string): string {
  return `${STORAGE_KEY_PREFIX}.${companyId}.${workspaceId}`;
}

export function loadAwakeningState(companyId: string, workspaceId: string): AwakeningState {
  if (typeof window === "undefined") return deriveAwakeningState(0);
  try {
    const raw = window.localStorage.getItem(buildStorageKey(companyId, workspaceId));
    if (!raw) return deriveAwakeningState(0);
    const parsed = JSON.parse(raw) as { interactionCount?: number };
    const count = typeof parsed.interactionCount === "number" ? Math.max(0, parsed.interactionCount) : 0;
    return deriveAwakeningState(count);
  } catch {
    return deriveAwakeningState(0);
  }
}

export function persistAwakeningState(companyId: string, workspaceId: string, state: AwakeningState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      buildStorageKey(companyId, workspaceId),
      JSON.stringify({ interactionCount: state.interactionCount }),
    );
  } catch {
    // localStorage unavailable
  }
}

// Shared broadcast event name for cross-component synchronization
export const AWAKENING_EVENT = "pmfreak:awakening" as const;
