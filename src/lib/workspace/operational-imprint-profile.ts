export type PMOperationalImprint = {
  interventionStyle: "direct" | "collaborative" | "diplomatic" | "escalatory";
  decisionCadence: "fast" | "measured" | "consensus-driven";
  dominantFocus: "delivery" | "stakeholders" | "governance" | "risk";
  escalationBias: "preventive" | "reactive" | "measured";
  communicationPattern: "concise" | "analytical" | "context-heavy";
  observedInteractionCount: number;
};

// Cumulative vote scores across all observed messages — determines leading value per dimension
export type ImprintScores = {
  interventionStyle: Partial<Record<PMOperationalImprint["interventionStyle"], number>>;
  decisionCadence: Partial<Record<PMOperationalImprint["decisionCadence"], number>>;
  dominantFocus: Partial<Record<PMOperationalImprint["dominantFocus"], number>>;
  escalationBias: Partial<Record<PMOperationalImprint["escalationBias"], number>>;
  communicationPattern: Partial<Record<PMOperationalImprint["communicationPattern"], number>>;
};

export type PMImprintState = {
  profile: PMOperationalImprint;
  scores: ImprintScores;
};

export const EMPTY_PROFILE: PMOperationalImprint = {
  interventionStyle: "direct",
  decisionCadence: "fast",
  dominantFocus: "delivery",
  escalationBias: "measured",
  communicationPattern: "concise",
  observedInteractionCount: 0,
};

function emptyScores(): ImprintScores {
  return {
    interventionStyle: {},
    decisionCadence: {},
    dominantFocus: {},
    escalationBias: {},
    communicationPattern: {},
  };
}

export function emptyImprintState(): PMImprintState {
  return { profile: { ...EMPTY_PROFILE }, scores: emptyScores() };
}

const STORAGE_KEY_PREFIX = "pmfreak.imprint";

function buildStorageKey(companyId: string, workspaceId: string, userId: string): string {
  return `${STORAGE_KEY_PREFIX}.${companyId}.${workspaceId}.${userId}`;
}

export function loadImprintState(companyId: string, workspaceId: string, userId: string): PMImprintState {
  if (typeof window === "undefined") return emptyImprintState();
  try {
    const raw = window.localStorage.getItem(buildStorageKey(companyId, workspaceId, userId));
    if (!raw) return emptyImprintState();
    return JSON.parse(raw) as PMImprintState;
  } catch {
    return emptyImprintState();
  }
}

export function persistImprintState(
  companyId: string,
  workspaceId: string,
  userId: string,
  state: PMImprintState,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(buildStorageKey(companyId, workspaceId, userId), JSON.stringify(state));
  } catch {
    // localStorage unavailable
  }
}

export function resetImprintState(companyId: string, workspaceId: string, userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(buildStorageKey(companyId, workspaceId, userId));
  } catch {
    // localStorage unavailable
  }
}
