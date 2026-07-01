import type { ProjectMemorySnapshot, StakeholderMemory } from "@/lib/memory/organization-memory";

export type StakeholderInfluenceLevel = "low" | "medium" | "high" | "executive";
export type StakeholderPressureLevel = "low" | "medium" | "high" | "critical";
export type PoliticalRiskLevel = "low" | "moderate" | "high" | "critical";
export type CommunicationVolatility = "stable" | "watching" | "volatile";
export type EscalationBehavior = "none" | "reactive" | "patterned" | "accelerating";
export type AlignmentStatus = "aligned" | "mixed" | "fragmented";

export type StakeholderProfile = {
  name: string;
  role: string | null;
  influenceLevel: StakeholderInfluenceLevel;
  pressureLevel: StakeholderPressureLevel;
  alignmentStatus: AlignmentStatus;
  escalationBehavior: EscalationBehavior;
  politicalRisk: PoliticalRiskLevel;
  communicationVolatility: CommunicationVolatility;
};

export type StakeholderRiskSignal = {
  key: "stakeholder_alignment" | "political_risk" | "executive_pressure" | "communication_stability" | "escalation_trajectory" | "executive_alignment";
  value: string;
  severity: "info" | "warning" | "critical";
  reason: string;
};

export type StakeholderRelationshipSnapshot = {
  projectId: string | null;
  generatedAt: string;
  stakeholderAlignment: AlignmentStatus;
  politicalRisk: PoliticalRiskLevel;
  executivePressure: "stable" | "increasing" | "critical";
  communicationStability: CommunicationVolatility;
  escalationTrajectory: EscalationBehavior;
  executiveAlignment: AlignmentStatus;
  stakeholderPressure: StakeholderPressureLevel;
  // 0–100 composite volatility score: accounts for oscillating sentiment, escalation behavior,
  // and alignment fragmentation. Higher = more volatile organizational landscape.
  volatilityScore: number;
  volatilityReason: string;
  profiles: StakeholderProfile[];
  signals: StakeholderRiskSignal[];
  commentary: string[];
};

const normalizeInfluence = (input: StakeholderMemory): StakeholderInfluenceLevel => {
  if (input.influence === "high" && (input.role ?? "").toLowerCase().includes("exec")) return "executive";
  return input.influence;
};

export function detectStakeholderPressure(stakeholders: StakeholderMemory[]): StakeholderPressureLevel {
  const weighted = stakeholders.reduce((acc, item) => {
    const pressureEvents = item.pressurePatterns.length;
    const influenceWeight = item.influence === "high" ? 3 : item.influence === "medium" ? 2 : 1;
    return acc + pressureEvents * influenceWeight;
  }, 0);

  if (weighted >= 18) return "critical";
  if (weighted >= 10) return "high";
  if (weighted >= 4) return "medium";
  return "low";
}

export function detectCommunicationVolatility(stakeholders: StakeholderMemory[]): CommunicationVolatility {
  const signalCount = stakeholders.reduce((acc, s) => acc + s.sentimentSignals.length, 0);
  const divergentCount = stakeholders.reduce((acc, s) => {
    const uniqueSignals = new Set(s.sentimentSignals.map((p) => p.toLowerCase()));
    return acc + (uniqueSignals.size >= 3 ? 1 : 0);
  }, 0);

  if (signalCount >= 12 || divergentCount >= 3) return "volatile";
  if (signalCount >= 6 || divergentCount >= 1) return "watching";
  return "stable";
}

export function detectEscalationPatterns(stakeholders: StakeholderMemory[]): EscalationBehavior {
  // Weighted by influence: high-influence escalation signals count more
  let weightedScore = 0;
  for (const stakeholder of stakeholders) {
    const joined = [...stakeholder.pressurePatterns, ...stakeholder.sentimentSignals].join(" ").toLowerCase();
    const influenceMultiplier = stakeholder.influence === "high" ? 2.5 : stakeholder.influence === "medium" ? 1.5 : 1;

    // Stronger escalation signals
    const hardEscalation = (joined.match(/\b(escalat(?:ed|ing|es)|will escalate|must escalate)\b/g) ?? []).length;
    // Urgency signals (softer)
    const urgencySignals = (joined.match(/\b(urgent|deadline|slip|blocked|pressure|overdue)\b/g) ?? []).length;

    weightedScore += (hardEscalation * 3 + urgencySignals) * influenceMultiplier;
  }

  if (weightedScore >= 18) return "accelerating";
  if (weightedScore >= 8) return "patterned";
  if (weightedScore >= 2) return "reactive";
  return "none";
}

export function detectAlignmentRisk(stakeholders: StakeholderMemory[]): AlignmentStatus {
  const drivers = stakeholders.filter((s) => s.decisionAuthority === "driver" || s.decisionAuthority === "approver");
  if (drivers.length === 0) return "mixed";

  const polarized = drivers.filter((s) => s.sentimentSignals.length >= 3 || s.pressurePatterns.length >= 2).length;
  if (polarized / drivers.length >= 0.6) return "fragmented";
  if (polarized > 0) return "mixed";
  return "aligned";
}

export function calculatePoliticalRisk(input: {
  pressure: StakeholderPressureLevel;
  communication: CommunicationVolatility;
  escalation: EscalationBehavior;
  alignment: AlignmentStatus;
}): PoliticalRiskLevel {
  let score = 0;
  if (input.pressure === "high") score += 2;
  if (input.pressure === "critical") score += 3;
  if (input.communication === "watching") score += 1;
  if (input.communication === "volatile") score += 2;
  if (input.escalation === "patterned") score += 2;
  if (input.escalation === "accelerating") score += 3;
  if (input.alignment === "mixed") score += 1;
  if (input.alignment === "fragmented") score += 3;

  if (score >= 8) return "critical";
  if (score >= 5) return "high";
  if (score >= 2) return "moderate";
  return "low";
}

const clampStakeholder = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

// Computes a 0–100 volatility score from current-snapshot signals.
// Escalation acceleration = 35, fragmented alignment = 25, volatile communication = 20, critical pressure = 20.
export function computeStakeholderVolatilityScore(input: {
  escalation: EscalationBehavior;
  alignment: AlignmentStatus;
  communication: CommunicationVolatility;
  pressure: StakeholderPressureLevel;
}): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  if (input.escalation === "accelerating") { score += 35; reasons.push("escalation accelerating"); }
  else if (input.escalation === "patterned") { score += 20; reasons.push("escalation patterned"); }
  else if (input.escalation === "reactive") { score += 8; reasons.push("escalation reactive"); }

  if (input.alignment === "fragmented") { score += 25; reasons.push("alignment fragmented"); }
  else if (input.alignment === "mixed") { score += 12; reasons.push("alignment mixed"); }

  if (input.communication === "volatile") { score += 20; reasons.push("communication volatile"); }
  else if (input.communication === "watching") { score += 8; reasons.push("communication watchful"); }

  if (input.pressure === "critical") { score += 20; reasons.push("stakeholder pressure critical"); }
  else if (input.pressure === "high") { score += 10; reasons.push("stakeholder pressure high"); }

  return {
    score: clampStakeholder(score),
    reason: reasons.length > 0 ? reasons.join("; ") : "no significant volatility signals detected",
  };
}

export function buildStakeholderRelationshipSnapshot(projectId: string | null, snapshot: ProjectMemorySnapshot | null): StakeholderRelationshipSnapshot {
  const stakeholders = snapshot?.stakeholders ?? [];
  const pressure = detectStakeholderPressure(stakeholders);
  const communication = detectCommunicationVolatility(stakeholders);
  const escalation = detectEscalationPatterns(stakeholders);
  const alignment = detectAlignmentRisk(stakeholders);
  const politicalRisk = calculatePoliticalRisk({ pressure, communication, escalation, alignment });

  const executiveStakeholders = stakeholders.filter((s) => normalizeInfluence(s) === "executive" || s.influence === "high");
  const executiveAlignment = detectAlignmentRisk(executiveStakeholders);
  const executivePressure: StakeholderRelationshipSnapshot["executivePressure"] = pressure === "critical" || escalation === "accelerating" ? "critical" : pressure === "high" ? "increasing" : "stable";
  const { score: volatilityScore, reason: volatilityReason } = computeStakeholderVolatilityScore({ escalation, alignment, communication, pressure });

  const profiles = stakeholders.map<StakeholderProfile>((s) => ({
    name: s.name,
    role: s.role,
    influenceLevel: normalizeInfluence(s),
    pressureLevel: s.pressurePatterns.length >= 3 ? "high" : s.pressurePatterns.length > 0 ? "medium" : "low",
    alignmentStatus: s.sentimentSignals.length >= 3 ? "mixed" : "aligned",
    escalationBehavior: s.pressurePatterns.length >= 3 ? "patterned" : s.pressurePatterns.length >= 1 ? "reactive" : "none",
    politicalRisk: s.politicalRelevance === "high" ? "high" : s.politicalRelevance === "medium" ? "moderate" : "low",
    communicationVolatility: s.sentimentSignals.length >= 4 ? "volatile" : s.sentimentSignals.length >= 2 ? "watching" : "stable",
  }));

  const highPressureNames = stakeholders
    .filter((s) => s.pressurePatterns.length >= 2)
    .map((s) => s.name)
    .slice(0, 2)
    .join(", ");
  const executiveStakeholderNames = executiveStakeholders.map((s) => s.name).slice(0, 2).join(", ");

  const commentary = [
    alignment === "fragmented"
      ? `Stakeholder expectations are diverging${highPressureNames ? ` — elevated pressure from: ${highPressureNames}` : ""}.`
      : "Stakeholder expectations remain materially aligned.",
    escalation === "accelerating"
      ? `Escalation pressure accelerating without scope stabilization${highPressureNames ? ` (${highPressureNames})` : ""}.`
      : escalation === "patterned"
        ? "Escalation pattern is recurring — not yet accelerating but requires monitoring."
        : "Escalation pressure appears manageable under current scope.",
    communication === "volatile"
      ? `Communication volatility detected across ${stakeholders.length} active participant${stakeholders.length !== 1 ? "s" : ""}.`
      : "Communication rhythm is currently stable across participants.",
    executiveAlignment !== "aligned"
      ? `Project leadership alignment appears unstable${executiveStakeholderNames ? ` (${executiveStakeholderNames})` : ""}.`
      : "Project leadership alignment is holding steady.",
  ];

  // Foundation note: this deterministic graph-oriented snapshot is intentionally structured
  // for future AI negotiation systems, executive escalation agents, stakeholder memory fusion,
  // organization-wide relationship graphs, and portfolio governance intelligence.
  const signals: StakeholderRiskSignal[] = [
    { key: "stakeholder_alignment", value: alignment, severity: alignment === "fragmented" ? "critical" : alignment === "mixed" ? "warning" : "info", reason: "Decision-driver sentiment and pressure pattern divergence." },
    { key: "political_risk", value: politicalRisk, severity: politicalRisk === "critical" || politicalRisk === "high" ? "critical" : politicalRisk === "moderate" ? "warning" : "info", reason: "Combined deterministic pressure, escalation, and alignment score." },
    { key: "executive_pressure", value: executivePressure, severity: executivePressure === "critical" ? "critical" : executivePressure === "increasing" ? "warning" : "info", reason: "Influence-weighted pressure trajectory from executive stakeholders." },
    { key: "communication_stability", value: communication, severity: communication === "volatile" ? "critical" : communication === "watching" ? "warning" : "info", reason: "Signal volume and divergence across participant communication traces." },
    { key: "escalation_trajectory", value: escalation, severity: escalation === "accelerating" ? "critical" : escalation === "patterned" ? "warning" : "info", reason: "Escalation token density across pressure and sentiment records." },
    { key: "executive_alignment", value: executiveAlignment, severity: executiveAlignment === "fragmented" ? "critical" : executiveAlignment === "mixed" ? "warning" : "info", reason: "Leadership consistency among high influence and executive roles." },
  ];

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    stakeholderAlignment: alignment,
    politicalRisk,
    executivePressure,
    communicationStability: communication,
    escalationTrajectory: escalation,
    executiveAlignment,
    stakeholderPressure: pressure,
    volatilityScore,
    volatilityReason,
    profiles,
    signals,
    commentary,
  };
}
