import type {
  OperationalDependencySignal,
  OperationalEscalationSignal,
  OperationalMemoryRecordType,
  OperationalMemoryWeights,
  OperationalPressureSignal,
  OperationalRiskSignal,
  OperationalSignal,
  OperationalStakeholderSignal,
  OperationalTimelineSignal,
} from "./runtime-memory-types";

const MIN_SIGNAL_TEXT = 12;
const DEFAULT_CONFIDENCE = 0.7;
const MIN_CONF_FOR_SIGNAL = 0.55;

type SignalExtractionContext = {
  sourceRef: string;
  timestamp: string;
  lineageMemoryRecordId?: string | null;
};

type SignalCandidate = {
  signalType: OperationalSignal["signalType"];
  matchedText: string;
  matchedPattern: string;
  confidence: number;
};

const RISK_PATTERNS: Array<{
  pattern: RegExp;
  category: OperationalRiskSignal["riskCategory"];
  severity: OperationalRiskSignal["severity"];
}> = [
  { pattern: /\bcritical risk\b/i, category: "delivery", severity: "critical" },
  { pattern: /\bbudget risk\b|\bfunding gap\b|\bprocurement delay\b/i, category: "financial", severity: "high" },
  { pattern: /\bgovernance gap\b|\bmissing approval\b/i, category: "governance", severity: "high" },
  { pattern: /\bat risk\b/i, category: "delivery", severity: "high" },
  { pattern: /\bstakeholder risk\b|\bsponsor concern\b/i, category: "stakeholder", severity: "medium" },
  { pattern: /\btechnical risk\b|\barchitectural risk\b/i, category: "technical", severity: "medium" },
  { pattern: /\btimeline risk\b|\bschedule risk\b/i, category: "timeline", severity: "medium" },
  { pattern: /\bexposure\b|\bthreat to delivery\b/i, category: "delivery", severity: "medium" },
  { pattern: /\brisk\b/i, category: "delivery", severity: "medium" },
];

const PRESSURE_PATTERNS: Array<{
  pattern: RegExp;
  source: OperationalPressureSignal["pressureSource"];
  intensity: OperationalPressureSignal["intensity"];
}> = [
  { pattern: /\bstill blocked\b|\bstill unresolved\b|\bpersistent blocker\b/i, source: "unresolved_blocker", intensity: "high" },
  { pattern: /\bescalation pending\b|\bescalation unresolved\b/i, source: "pending_escalation", intensity: "high" },
  { pattern: /\bprocurement delay\b|\bpo not issued\b|\bpurchase order pending\b/i, source: "procurement_delay", intensity: "high" },
  { pattern: /\btimeline compressed\b|\bschedule slipping\b|\bdeadline pressure\b/i, source: "timeline_compression", intensity: "high" },
  { pattern: /\bsilent\b.*\bstakeholder\b|\bno response from\b|\bunresponsive\b/i, source: "silent_stakeholder", intensity: "medium" },
  { pattern: /\bapproval gap\b|\bapproval pending\b|\bwaiting for sign.?off\b/i, source: "approval_gap", intensity: "medium" },
  { pattern: /\bhidden dependency\b|\bundisclosed dependency\b/i, source: "hidden_dependency", intensity: "medium" },
  { pattern: /\bblocker\b|\bblocked\b|\bimpediment\b/i, source: "unresolved_blocker", intensity: "medium" },
];

const STAKEHOLDER_PATTERNS: Array<{
  pattern: RegExp;
  status: OperationalStakeholderSignal["engagementStatus"];
  criticalPath: boolean;
}> = [
  { pattern: /\bsponsor disengaged\b|\bexecutive disengaged\b/i, status: "disengaged", criticalPath: true },
  { pattern: /\bescalated to\b|\bsponsor escalation\b/i, status: "escalated", criticalPath: true },
  { pattern: /\bstakeholder silent\b|\bno reply\b|\bno update from\b/i, status: "silent", criticalPath: false },
  { pattern: /\bstakeholder unavailable\b|\bkey contact unavailable\b/i, status: "unavailable", criticalPath: false },
  { pattern: /\bstakeholder\b|\bsponsor\b|\bexecutive\b|\bclient\b/i, status: "active", criticalPath: false },
];

const DEPENDENCY_PATTERNS: Array<{
  pattern: RegExp;
  type: OperationalDependencySignal["dependencyType"];
  status: OperationalDependencySignal["status"];
}> = [
  { pattern: /\bexternal dependency\b|\bthird.?party dependency\b/i, type: "external", status: "pending" },
  { pattern: /\bvendor dependency\b|\bsupplier dependency\b/i, type: "vendor", status: "pending" },
  { pattern: /\bupstream dependency\b|\bupstream team\b/i, type: "upstream", status: "pending" },
  { pattern: /\bdownstream dependency\b|\bdownstream team\b/i, type: "downstream", status: "pending" },
  { pattern: /\bdependency blocked\b|\bdepends on.*blocked\b/i, type: "internal", status: "blocked" },
  { pattern: /\bdependency\b|\bdepends on\b|\bwaiting for\b|\bhandoff\b/i, type: "internal", status: "pending" },
];

const ESCALATION_PATTERNS: Array<{
  pattern: RegExp;
  level: OperationalEscalationSignal["escalationLevel"];
  status: OperationalEscalationSignal["status"];
}> = [
  { pattern: /\bboard.?level\b|\bexternal escalation\b/i, level: "external", status: "pending" },
  { pattern: /\bexecutive escalation\b|\bexecutive attention\b|\bsteering committee\b/i, level: "executive", status: "pending" },
  { pattern: /\bmanagement escalation\b|\bescalated to management\b/i, level: "management", status: "pending" },
  { pattern: /\bescalation resolved\b|\bescalation closed\b/i, level: "team", status: "resolved" },
  { pattern: /\bescalat/i, level: "team", status: "pending" },
];

const TIMELINE_PATTERNS: Array<{
  pattern: RegExp;
  event: OperationalTimelineSignal["timelineEvent"];
}> = [
  { pattern: /\bdeadline approaching\b|\bdeadline is\b|\bdue (this|next)\b/i, event: "deadline_approaching" },
  { pattern: /\bmilestone at risk\b|\bmilestone slipping\b/i, event: "milestone_at_risk" },
  { pattern: /\bschedule (drift|slipping|delayed)\b|\bbehind schedule\b/i, event: "schedule_drift" },
  { pattern: /\bdate conflict\b|\bdate overlap\b/i, event: "date_conflict" },
  { pattern: /\bdelivery delay\b|\bdelayed delivery\b|\boverdue\b/i, event: "delivery_delay" },
];

function extractCandidates(text: string): SignalCandidate[] {
  const candidates: SignalCandidate[] = [];
  const t = text.trim();
  if (t.length < MIN_SIGNAL_TEXT) return [];

  for (const { pattern } of RISK_PATTERNS) {
    if (pattern.test(t)) {
      candidates.push({ signalType: "risk", matchedText: t.slice(0, 240), matchedPattern: pattern.toString(), confidence: DEFAULT_CONFIDENCE });
      break;
    }
  }
  for (const { pattern } of PRESSURE_PATTERNS) {
    if (pattern.test(t)) {
      candidates.push({ signalType: "pressure", matchedText: t.slice(0, 240), matchedPattern: pattern.toString(), confidence: DEFAULT_CONFIDENCE });
      break;
    }
  }
  for (const { pattern } of STAKEHOLDER_PATTERNS) {
    if (pattern.test(t)) {
      candidates.push({ signalType: "stakeholder", matchedText: t.slice(0, 240), matchedPattern: pattern.toString(), confidence: DEFAULT_CONFIDENCE });
      break;
    }
  }
  for (const { pattern } of DEPENDENCY_PATTERNS) {
    if (pattern.test(t)) {
      candidates.push({ signalType: "dependency", matchedText: t.slice(0, 240), matchedPattern: pattern.toString(), confidence: DEFAULT_CONFIDENCE });
      break;
    }
  }
  for (const { pattern } of ESCALATION_PATTERNS) {
    if (pattern.test(t)) {
      candidates.push({ signalType: "escalation", matchedText: t.slice(0, 240), matchedPattern: pattern.toString(), confidence: DEFAULT_CONFIDENCE });
      break;
    }
  }
  for (const { pattern } of TIMELINE_PATTERNS) {
    if (pattern.test(t)) {
      candidates.push({ signalType: "timeline", matchedText: t.slice(0, 240), matchedPattern: pattern.toString(), confidence: DEFAULT_CONFIDENCE });
      break;
    }
  }

  return candidates;
}

export function extractOperationalSignals(
  text: string,
  context: SignalExtractionContext,
): OperationalSignal[] {
  const candidates = extractCandidates(text);
  const signals: OperationalSignal[] = [];

  for (const candidate of candidates) {
    if (candidate.confidence < MIN_CONF_FOR_SIGNAL) continue;

    switch (candidate.signalType) {
      case "risk": {
        const match = RISK_PATTERNS.find(({ pattern }) => pattern.test(candidate.matchedText));
        signals.push({
          signalType: "risk",
          riskCategory: match?.category ?? "delivery",
          severity: match?.severity ?? "medium",
          summary: candidate.matchedText.slice(0, 200),
          confidence: candidate.confidence,
          sourceRef: context.sourceRef,
          timestamp: context.timestamp,
          lineageMemoryRecordId: context.lineageMemoryRecordId ?? null,
          retrievalWeight:
            match?.severity === "critical" ? 1.0 : match?.severity === "high" ? 0.85 : 0.7,
        } satisfies OperationalRiskSignal);
        break;
      }
      case "pressure": {
        const match = PRESSURE_PATTERNS.find(({ pattern }) => pattern.test(candidate.matchedText));
        signals.push({
          signalType: "pressure",
          pressureSource: match?.source ?? "unresolved_blocker",
          intensity: match?.intensity ?? "medium",
          summary: candidate.matchedText.slice(0, 200),
          confidence: candidate.confidence,
          sourceRef: context.sourceRef,
          timestamp: context.timestamp,
          ageDays: 0,
          unresolvedWeight: 1.0,
          lineageMemoryRecordId: context.lineageMemoryRecordId ?? null,
        } satisfies OperationalPressureSignal);
        break;
      }
      case "stakeholder": {
        const match = STAKEHOLDER_PATTERNS.find(({ pattern }) => pattern.test(candidate.matchedText));
        signals.push({
          signalType: "stakeholder",
          stakeholderRef: "unknown",
          engagementStatus: match?.status ?? "active",
          lastContactDate: null,
          criticalPath: match?.criticalPath ?? false,
          summary: candidate.matchedText.slice(0, 200),
          confidence: candidate.confidence,
          sourceRef: context.sourceRef,
          timestamp: context.timestamp,
          lineageMemoryRecordId: context.lineageMemoryRecordId ?? null,
        } satisfies OperationalStakeholderSignal);
        break;
      }
      case "dependency": {
        const match = DEPENDENCY_PATTERNS.find(({ pattern }) => pattern.test(candidate.matchedText));
        signals.push({
          signalType: "dependency",
          dependencyType: match?.type ?? "internal",
          summary: candidate.matchedText.slice(0, 200),
          status: match?.status ?? "pending",
          confidence: candidate.confidence,
          sourceRef: context.sourceRef,
          timestamp: context.timestamp,
          lineageMemoryRecordId: context.lineageMemoryRecordId ?? null,
        } satisfies OperationalDependencySignal);
        break;
      }
      case "escalation": {
        const match = ESCALATION_PATTERNS.find(({ pattern }) => pattern.test(candidate.matchedText));
        signals.push({
          signalType: "escalation",
          escalationLevel: match?.level ?? "team",
          summary: candidate.matchedText.slice(0, 200),
          status: match?.status ?? "pending",
          confidence: candidate.confidence,
          sourceRef: context.sourceRef,
          timestamp: context.timestamp,
          lineageMemoryRecordId: context.lineageMemoryRecordId ?? null,
        } satisfies OperationalEscalationSignal);
        break;
      }
      case "timeline": {
        const match = TIMELINE_PATTERNS.find(({ pattern }) => pattern.test(candidate.matchedText));
        signals.push({
          signalType: "timeline",
          timelineEvent: match?.event ?? "delivery_delay",
          summary: candidate.matchedText.slice(0, 200),
          targetDate: null,
          confidence: candidate.confidence,
          sourceRef: context.sourceRef,
          timestamp: context.timestamp,
          lineageMemoryRecordId: context.lineageMemoryRecordId ?? null,
        } satisfies OperationalTimelineSignal);
        break;
      }
    }
  }

  return signals;
}

export function signalToRecordType(signal: OperationalSignal): OperationalMemoryRecordType {
  switch (signal.signalType) {
    case "risk":
      return "risk";
    case "pressure":
      return "delivery_pressure";
    case "stakeholder":
      return "stakeholder_signal";
    case "dependency":
      return "dependency";
    case "escalation":
      return "escalation";
    case "timeline":
      return "timeline_signal";
  }
}

export function computeSignalWeights(signal: OperationalSignal): OperationalMemoryWeights {
  switch (signal.signalType) {
    case "risk": {
      const sevMap: Record<string, number> = { critical: 1.0, high: 0.85, medium: 0.65, low: 0.4 };
      const w = sevMap[signal.severity] ?? 0.65;
      return {
        continuityWeight: w,
        operationalPressureWeight: w * 0.8,
        escalationWeight: w * 0.6,
        unresolvedWeight: w,
        deliveryImpactWeight: w,
      };
    }
    case "pressure": {
      const intMap: Record<string, number> = { critical: 1.0, high: 0.9, medium: 0.7, low: 0.5 };
      const w = intMap[signal.intensity] ?? 0.7;
      return {
        continuityWeight: w,
        operationalPressureWeight: w,
        escalationWeight: w * 0.7,
        unresolvedWeight: signal.unresolvedWeight,
        deliveryImpactWeight: w * 0.9,
      };
    }
    case "escalation": {
      const lvlMap: Record<string, number> = { external: 1.0, executive: 0.9, management: 0.75, team: 0.6 };
      const w = lvlMap[signal.escalationLevel] ?? 0.7;
      return {
        continuityWeight: w,
        operationalPressureWeight: w * 0.8,
        escalationWeight: w,
        unresolvedWeight: signal.status === "pending" ? w : 0.2,
        deliveryImpactWeight: w * 0.85,
      };
    }
    case "stakeholder":
      return {
        continuityWeight: 0.7,
        operationalPressureWeight: signal.criticalPath ? 0.8 : 0.5,
        escalationWeight: 0.5,
        unresolvedWeight: signal.engagementStatus === "disengaged" ? 0.9 : 0.5,
        deliveryImpactWeight: signal.criticalPath ? 0.8 : 0.4,
      };
    case "dependency":
      return {
        continuityWeight: 0.65,
        operationalPressureWeight: signal.status === "blocked" ? 0.9 : 0.5,
        escalationWeight: 0.4,
        unresolvedWeight: signal.status === "resolved" ? 0.1 : 0.7,
        deliveryImpactWeight: 0.7,
      };
    case "timeline":
      return {
        continuityWeight: 0.7,
        operationalPressureWeight: 0.75,
        escalationWeight: 0.5,
        unresolvedWeight: 0.8,
        deliveryImpactWeight: 0.9,
      };
  }
}
