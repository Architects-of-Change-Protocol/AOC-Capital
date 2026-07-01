// Lightweight cross-signal reasoning layer — no rule engine, no hallucination.
// All reasoning is grounded in actual operational records and typed signals.
// This module never invents causality; it detects patterns that already exist in the data.

import type { OperationalMemoryRecord } from "@/lib/operational-memory";

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

// ─── Operational Contradiction Detection ──────────────────────────────────────
// Detects incoherent cross-domain narratives that reduce operational confidence.
// A contradiction is when domain A says "healthy" while domain B says "deteriorating".

export type ContradictionType =
  | "delivery_vs_stakeholder"
  | "governance_vs_escalation"
  | "risk_silence_vs_blockers"
  | "stable_health_vs_active_escalation";

export type OperationalContradiction = {
  type: ContradictionType;
  description: string;
  confidencePenalty: number;
};

export function detectOperationalContradictions(records: OperationalMemoryRecord[]): OperationalContradiction[] {
  const contradictions: OperationalContradiction[] = [];

  const deliveryRecords = records.filter((r) => r.domain === "delivery_intelligence");
  const stakeholderRecords = records.filter((r) => r.domain === "stakeholder_intelligence");
  const govRecords = records.filter((r) => r.domain === "pmo_governance");
  const riskRecords = records.filter((r) => r.domain === "risk_intelligence");

  // 1. "Green delivery" while stakeholder escalation signals are active.
  //    High-confidence delivery records reporting on_track, alongside stakeholder records showing escalation.
  const deliveryPositive = deliveryRecords.filter(
    (r) =>
      r.extractedFacts.some((f) => /delivery_confidence:\s*on_track/i.test(f)) &&
      r.confidenceScore >= 60,
  );
  const stakeholderEscalating = stakeholderRecords.filter((r) =>
    r.extractedFacts.some(
      (f) =>
        /escalation_behavior:\s*(escalating|threatening)/i.test(f) ||
        /political_risk:\s*(high|critical)/i.test(f),
    ),
  );
  if (deliveryPositive.length >= 1 && stakeholderEscalating.length >= 1) {
    contradictions.push({
      type: "delivery_vs_stakeholder",
      description:
        "Delivery confidence reads as on-track while stakeholder escalation signals are active — these narratives are operationally incoherent.",
      confidencePenalty: 15,
    });
  }

  // 2. Governance completeness appears healthy while escalation is actively spreading.
  //    Well-documented governance that is evidently not preventing escalation = governance not enforced.
  const govHighCompletion = govRecords.filter((r) => r.completionScore >= 65 && r.confidenceScore >= 60).length;
  const escalationActiveCount = records.filter((r) =>
    r.extractedFacts.some((f) => /escalation_behavior:\s*escalating/i.test(f)),
  ).length;
  if (govHighCompletion >= 1 && escalationActiveCount >= 2) {
    contradictions.push({
      type: "governance_vs_escalation",
      description:
        "Governance artifacts appear complete, yet escalation patterns are active across multiple records — governance is documented but not operationally enforced.",
      confidencePenalty: 10,
    });
  }

  // 3. Risk intelligence domain is silent while delivery blockers are accumulating.
  //    No risk records despite visible delivery blockers = risks are being underreported.
  const riskDomainSilent = riskRecords.length === 0;
  const deliveryBlockersActive = deliveryRecords.filter((r) =>
    r.extractedFacts.some((f) => /blockers:/i.test(f) || /current_status:\s*blocked/i.test(f)),
  ).length;
  if (riskDomainSilent && deliveryBlockersActive >= 1) {
    contradictions.push({
      type: "risk_silence_vs_blockers",
      description:
        "Risk intelligence domain has no records while delivery blockers are accumulating — active risks appear unregistered.",
      confidencePenalty: 12,
    });
  }

  // 4. High overall health scores while escalation facts appear in operational memory.
  //    High completion/confidence domain-wide, but escalation events are being recorded.
  const overallHighHealth =
    records.length >= 3 &&
    records.filter((r) => r.completionScore >= 70 && r.confidenceScore >= 70).length / records.length >= 0.6;
  const escalationInMemory = records.filter((r) =>
    r.extractedFacts.some((f) => /escalation_needed:\s*yes/i.test(f) || /event_type:\s*escalation/i.test(f)),
  ).length;
  if (overallHighHealth && escalationInMemory >= 1) {
    contradictions.push({
      type: "stable_health_vs_active_escalation",
      description:
        "Operational memory records show generally high health scores while escalation events are being logged — health metrics may lag actual operational state.",
      confidencePenalty: 8,
    });
  }

  return contradictions;
}

// ─── Hidden Risk Accumulation ─────────────────────────────────────────────────
// Individually-mild signals that collectively indicate a serious pattern.
// The threshold for individual alarm is 55; this detects compounding below that line.

export type HiddenRiskPattern = {
  weakSignals: string[];
  accumulatedScore: number;
  description: string;
};

export function detectHiddenRiskAccumulation(input: {
  stakeholderPressure: number;
  deliveryRisk: number;
  pmFatigue: number;
  governanceFailure: number;
  escalationProbability: number;
}): HiddenRiskPattern | null {
  const weakSignals: string[] = [];

  if (input.stakeholderPressure >= 28 && input.stakeholderPressure < 55) {
    weakSignals.push(`mild stakeholder pressure (${input.stakeholderPressure}/100)`);
  }
  if (input.deliveryRisk >= 28 && input.deliveryRisk < 55) {
    weakSignals.push(`mild delivery risk (${input.deliveryRisk}/100)`);
  }
  if (input.pmFatigue >= 28 && input.pmFatigue < 55) {
    weakSignals.push(`mild PM fatigue (${input.pmFatigue}/100)`);
  }
  if (input.governanceFailure >= 28 && input.governanceFailure < 55) {
    weakSignals.push(`mild governance gap (${input.governanceFailure}/100)`);
  }

  // 3+ concurrent mild signals indicate an accumulating pattern
  if (weakSignals.length >= 3) {
    const accumulatedScore = clamp(weakSignals.length * 16 + input.escalationProbability * 0.35);
    return {
      weakSignals,
      accumulatedScore,
      description: `${weakSignals.length} individually-mild signals are accumulating into a compound operational risk: ${weakSignals.join(", ")}. Each alone is below alarm threshold; together they indicate organizational drift.`,
    };
  }

  return null;
}

// ─── Cross-Signal Severity Reinforcement ──────────────────────────────────────
// When multiple independent signals degrade simultaneously, severity amplifies.
// Compound deterioration is categorically worse than isolated deterioration.

export function computeCompoundSeverityBoost(input: {
  stakeholderPressure: number;
  deliveryRisk: number;
  governanceFailure: number;
  pmFatigue: number;
}): number {
  const elevated = [
    input.stakeholderPressure >= 55,
    input.deliveryRisk >= 55,
    input.governanceFailure >= 55,
    input.pmFatigue >= 55,
  ].filter(Boolean).length;

  // Each additional co-occurring elevated signal amplifies the compound risk
  if (elevated >= 4) return 22;
  if (elevated >= 3) return 13;
  if (elevated >= 2) return 5;
  return 0;
}

// ─── Dependency Propagation Reasoning ────────────────────────────────────────
// Assesses whether unresolved dependencies are threatening adjacent operational domains.
// Platform instability → QA blocked → UAT delayed → stakeholder pressure rising.

export type DependencyPropagationRisk = {
  propagationRisk: "none" | "watch" | "elevated" | "critical";
  chainLength: number;
  description: string;
  causalChain: string[];
};

export function assessDependencyPropagation(input: {
  dependencyCount: number;
  unresolvedIssues: number;
  deliveryRiskScore: number;
  stakeholderPressureScore: number;
  daysSilent: number;
}): DependencyPropagationRisk {
  const causalChain: string[] = [];

  if (input.unresolvedIssues >= 3) {
    causalChain.push(`${input.unresolvedIssues} unresolved issues blocking dependency resolution`);
  }
  if (input.deliveryRiskScore >= 50) {
    causalChain.push(`delivery risk amplified by dependency load (${input.deliveryRiskScore}/100)`);
  }
  if (input.stakeholderPressureScore >= 50) {
    causalChain.push(`stakeholder pressure rising downstream of execution blockage (${input.stakeholderPressureScore}/100)`);
  }
  if (input.daysSilent >= 7) {
    causalChain.push(`${input.daysSilent}-day execution silence compounding dependency aging`);
  }

  const chainFactors = causalChain.length;

  if (input.dependencyCount >= 3 && chainFactors >= 3) {
    return {
      propagationRisk: "critical",
      chainLength: input.dependencyCount,
      causalChain,
      description: `Dependency chain (${input.dependencyCount} deps) is propagating risk across multiple operational domains — ${causalChain.join(" → ")}.`,
    };
  }
  if (input.dependencyCount >= 2 && chainFactors >= 2) {
    return {
      propagationRisk: "elevated",
      chainLength: input.dependencyCount,
      causalChain,
      description: `Dependency load (${input.dependencyCount} deps) is amplifying adjacent delivery and stakeholder risk.`,
    };
  }
  if (input.dependencyCount >= 1 && chainFactors >= 1) {
    return {
      propagationRisk: "watch",
      chainLength: input.dependencyCount,
      causalChain,
      description: `Active dependencies require monitoring — downstream delivery risk may propagate if not resolved.`,
    };
  }

  return {
    propagationRisk: "none",
    chainLength: input.dependencyCount,
    causalChain: [],
    description: "Dependency pathways are not threatening adjacent operational domains.",
  };
}

// ─── Organizational Drift Detection ──────────────────────────────────────────
// Distinguishes between an isolated issue and a worsening directional trend.
// The system should detect MOVEMENT, not just a current snapshot.

export type OrganizationalDriftSignal = {
  driftDetected: boolean;
  driftSeverity: "none" | "watch" | "elevated" | "critical";
  driftIndicators: string[];
  description: string;
};

export function detectOrganizationalDrift(input: {
  escalationFrequencyIncreasing: boolean;
  silenceDurationDays: number;
  repeatedEscalationWithoutResolution: boolean;
  coordinationBreakdownPresent: boolean;
  pmFatigue: number;
  deliveryRisk: number;
  stakeholderPressure: number;
}): OrganizationalDriftSignal {
  const driftIndicators: string[] = [];

  if (input.escalationFrequencyIncreasing) {
    driftIndicators.push("escalation frequency is increasing, not isolated");
  }
  if (input.silenceDurationDays >= 10) {
    driftIndicators.push(`${input.silenceDurationDays}-day coordination silence suggests systemic disengagement`);
  }
  if (input.repeatedEscalationWithoutResolution) {
    driftIndicators.push("repeated escalation without organizational resolution — pattern indicates structural friction");
  }
  if (input.coordinationBreakdownPresent) {
    driftIndicators.push("coordination breakdown is active across multiple channels");
  }
  if (input.pmFatigue >= 50 && input.deliveryRisk >= 50) {
    driftIndicators.push("PM fatigue and delivery risk co-degrading — execution capacity is contracting");
  }
  if (input.stakeholderPressure >= 50 && input.silenceDurationDays >= 7) {
    driftIndicators.push("stakeholder pressure is rising while execution communication is diminishing");
  }

  const driftSeverity: OrganizationalDriftSignal["driftSeverity"] =
    driftIndicators.length >= 4 ? "critical" :
    driftIndicators.length >= 3 ? "elevated" :
    driftIndicators.length >= 1 ? "watch" :
    "none";

  return {
    driftDetected: driftIndicators.length >= 1,
    driftSeverity,
    driftIndicators,
    description:
      driftIndicators.length >= 1
        ? `Organizational drift detected (${driftSeverity}): ${driftIndicators.join("; ")}.`
        : "No directional organizational drift detected.",
  };
}

// ─── Coordination Collapse Detection ─────────────────────────────────────────
// Detects patterns that signal imminent coordination system failure —
// not just a single coordination gap, but a convergence of breakdown signals.

export type CoordinationCollapseRisk = {
  level: "none" | "watch" | "elevated" | "critical";
  collapsePatterns: string[];
  description: string;
};

export function detectCoordinationCollapseRisk(input: {
  daysSilent: number;
  unresolvedDependencies: number;
  repeatedEscalationWithoutResolution: boolean;
  blockerCount: number;
  stalledDecisions: number;
  executionDeadlock: boolean;
}): CoordinationCollapseRisk {
  const collapsePatterns: string[] = [];

  if (input.daysSilent >= 10 && input.unresolvedDependencies >= 2) {
    collapsePatterns.push("prolonged silence concurrent with unresolved dependency chain");
  }
  if (input.repeatedEscalationWithoutResolution && input.blockerCount >= 3) {
    collapsePatterns.push("repeated escalation failing to unblock execution — ownership resolution absent");
  }
  if (input.stalledDecisions >= 2 && input.blockerCount >= 3) {
    collapsePatterns.push("stalled decisions compounding with blocker accumulation — decision authority unclear");
  }
  if (input.daysSilent >= 7 && input.blockerCount >= 4) {
    collapsePatterns.push("execution silence sustained while blocker load is critically high");
  }
  if (input.executionDeadlock) {
    collapsePatterns.push("execution deadlock active — blockers, issues, and decisions converging without resolution");
  }

  const level: CoordinationCollapseRisk["level"] =
    collapsePatterns.length >= 4 ? "critical" :
    collapsePatterns.length >= 3 ? "elevated" :
    collapsePatterns.length >= 1 ? "watch" :
    "none";

  return {
    level,
    collapsePatterns,
    description:
      collapsePatterns.length >= 1
        ? `Coordination collapse risk (${level}): ${collapsePatterns.join("; ")}.`
        : "Coordination system is functioning within normal operational boundaries.",
  };
}
