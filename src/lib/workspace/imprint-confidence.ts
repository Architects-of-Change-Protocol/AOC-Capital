import type { PMOperationalImprint } from "./operational-imprint-profile";

export type ImprintConfidence = "forming" | "emerging" | "stable" | "deep";

export const CONFIDENCE_THRESHOLDS: Record<ImprintConfidence, number> = {
  forming: 0,
  emerging: 3,
  stable: 6,
  deep: 10,
};

export function computeImprintConfidence(profile: PMOperationalImprint): ImprintConfidence {
  const count = profile.observedInteractionCount;
  if (count >= CONFIDENCE_THRESHOLDS.deep) return "deep";
  if (count >= CONFIDENCE_THRESHOLDS.stable) return "stable";
  if (count >= CONFIDENCE_THRESHOLDS.emerging) return "emerging";
  return "forming";
}

// Workspace header chip labels — shown only when confidence > "forming"
export const CONFIDENCE_CHIP_LABELS: Record<ImprintConfidence, string> = {
  forming: "Pattern forming",
  emerging: "Cadence emerging",
  stable: "Operational cadence recognized",
  deep: "Continuity established",
};

// Agent panel imprint reflection text
export function deriveImprintReflection(
  profile: PMOperationalImprint,
  confidence: ImprintConfidence,
): string | null {
  if (confidence === "forming") return null;
  if (confidence === "emerging") return "Operational pattern forming";
  if (confidence === "deep") return "Continuity established";
  // stable
  const focusReflection: Record<PMOperationalImprint["dominantFocus"], string> = {
    delivery: "Delivery-first cadence recognized",
    stakeholders: "Stakeholder-sensitive escalation pattern recognized",
    governance: "Governance-first cadence recognized",
    risk: "Risk-aware intervention pattern recognized",
  };
  return focusReflection[profile.dominantFocus];
}
