import type { Plan } from "@/lib/feature-gates";

export type CapabilityRevealStage =
  | "activation"
  | "awareness"
  | "guidance"
  | "governance"
  | "constraint"
  | "organizational";

export type RoleProfile = "pm" | "pmo" | "executive" | "ops";
export type EvidenceDensity = "none" | "low" | "moderate" | "high";
export type ContinuityMaturity = "emerging" | "developing" | "stable";

export type CapabilityDomain =
  | "core"
  | "projects"
  | "risks"
  | "stakeholders"
  | "delivery"
  | "coordination"
  | "interventions"
  | "executive"
  | "vault"
  | "memory"
  | "governance"
  | "scope"
  | "lessons";

export type CapabilityRevealState = {
  stage: CapabilityRevealStage;
  planTier: Plan;
  roleProfile: RoleProfile;
  hasProject: boolean;
  evidenceDensity: EvidenceDensity;
  continuityMaturity: ContinuityMaturity;
  unlockedDomains: CapabilityDomain[];
  revealReasons: string[];
  blockedDomains: CapabilityDomain[];
  educationalHints: string[];
};

export type CapabilityRevealInput = {
  planTier: Plan;
  role: string;
  onboardingCompleted: boolean;
  hasProject: boolean;
  firstRun: boolean;
  evidenceSignals: number;
  operationalMemorySignals: number;
  continuitySignals: number;
  canUseAdvancedAi: boolean;
  canUsePortfolioMemory: boolean;
  canUseGovernanceDirectives: boolean;
};

export type NavigationRailItem = {
  label: string;
  href: string;
  accent: string;
  active: string;
  idle: string;
};
