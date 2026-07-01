import type { ImprintScores, PMImprintState, PMOperationalImprint } from "./operational-imprint-profile";
import { EMPTY_PROFILE } from "./operational-imprint-profile";

// Deterministic keyword → candidate value signal maps
// Each tuple is [keyword, candidate] — keyword match adds one vote to candidate
const INTERVENTION_SIGNALS: Array<[string, PMOperationalImprint["interventionStyle"]]> = [
  ["cómo le digo", "diplomatic"],
  ["how do i tell", "diplomatic"],
  ["how should i frame", "diplomatic"],
  ["cómo lo enmarco", "diplomatic"],
  ["sin sonar confrontativo", "diplomatic"],
  ["sin sonar confrontativa", "diplomatic"],
  ["without sounding confrontational", "diplomatic"],
  ["stakeholder buy-in", "diplomatic"],
  ["executive alignment", "diplomatic"],
  ["sensitive relationship", "diplomatic"],
  ["political", "diplomatic"],
  ["escalate to", "escalatory"],
  ["sponsor pressure", "escalatory"],
  ["steering committee", "escalatory"],
  ["executive steering", "escalatory"],
  ["unblock now", "direct"],
  ["action item", "direct"],
  ["blocker", "direct"],
  ["team alignment", "collaborative"],
  ["coordinate with", "collaborative"],
  ["work together", "collaborative"],
];

const CADENCE_SIGNALS: Array<[string, PMOperationalImprint["decisionCadence"]]> = [
  ["immediately", "fast"],
  ["asap", "fast"],
  ["right now", "fast"],
  ["execution sequence", "fast"],
  ["unblock", "fast"],
  ["today", "fast"],
  ["consider", "measured"],
  ["analyze", "measured"],
  ["evaluate", "measured"],
  ["assess", "measured"],
  ["should we", "measured"],
  ["consensus", "consensus-driven"],
  ["everyone agrees", "consensus-driven"],
  ["team buy-in", "consensus-driven"],
  ["collective decision", "consensus-driven"],
];

const FOCUS_SIGNALS: Array<[string, PMOperationalImprint["dominantFocus"]]> = [
  ["milestone", "delivery"],
  ["dependency", "delivery"],
  ["execution", "delivery"],
  ["delivery", "delivery"],
  ["sprint", "delivery"],
  ["timeline", "delivery"],
  ["schedule", "delivery"],
  ["deadline", "delivery"],
  ["blocking", "delivery"],
  ["stakeholder", "stakeholders"],
  ["sponsor", "stakeholders"],
  ["relationship", "stakeholders"],
  ["alignment", "stakeholders"],
  ["buy-in", "stakeholders"],
  ["politics", "stakeholders"],
  ["governance", "governance"],
  ["policy", "governance"],
  ["change request", "governance"],
  ["audit", "governance"],
  ["compliance", "governance"],
  ["control boundary", "governance"],
  ["risk", "risk"],
  ["mitigation", "risk"],
  ["contingency", "risk"],
  ["exposure", "risk"],
  ["escalation risk", "risk"],
];

const ESCALATION_SIGNALS: Array<[string, PMOperationalImprint["escalationBias"]]> = [
  ["prevent", "preventive"],
  ["proactive", "preventive"],
  ["early warning", "preventive"],
  ["risk visibility", "preventive"],
  ["before it", "preventive"],
  ["watch for", "preventive"],
  ["avoid escalation", "preventive"],
  ["crisis", "reactive"],
  ["emergency", "reactive"],
  ["already happened", "reactive"],
  ["urgent issue", "reactive"],
  ["monitor", "measured"],
  ["track", "measured"],
  ["assess risk", "measured"],
];

function scoreMessage<T extends string>(
  message: string,
  signals: Array<[string, T]>,
): Partial<Record<T, number>> {
  const lower = message.toLowerCase();
  const scores: Partial<Record<T, number>> = {};
  for (const [keyword, candidate] of signals) {
    if (lower.includes(keyword)) {
      scores[candidate] = (scores[candidate] ?? 0) + 1;
    }
  }
  return scores;
}

function inferCommunicationPattern(message: string): PMOperationalImprint["communicationPattern"] | null {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("analysis") ||
    lower.includes("breakdown") ||
    lower.includes("explain why") ||
    lower.includes("detail")
  ) {
    return "analytical";
  }
  if (trimmed.length > 200 || lower.includes("background") || lower.includes("here is what")) {
    return "context-heavy";
  }
  if (trimmed.length < 60) {
    return "concise";
  }
  return null;
}

function mergeScores<T extends string>(
  existing: Partial<Record<T, number>>,
  incoming: Partial<Record<T, number>>,
): Partial<Record<T, number>> {
  const merged = { ...existing };
  for (const [k, v] of Object.entries(incoming) as [T, number][]) {
    merged[k] = (merged[k] ?? 0) + v;
  }
  return merged;
}

function leadingCandidate<T extends string>(scores: Partial<Record<T, number>>, fallback: T): T {
  let best: T = fallback;
  let bestScore = 0;
  for (const [candidate, score] of Object.entries(scores) as [T, number][]) {
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

// Observe one PM message and return an updated imprint state.
// Deterministic: same inputs always produce same outputs.
// Scores accumulate — values only shift when evidence builds.
export function observeInteraction(message: string, current: PMImprintState): PMImprintState {
  const interventionVotes = scoreMessage(message, INTERVENTION_SIGNALS);
  const cadenceVotes = scoreMessage(message, CADENCE_SIGNALS);
  const focusVotes = scoreMessage(message, FOCUS_SIGNALS);
  const escalationVotes = scoreMessage(message, ESCALATION_SIGNALS);
  const commPattern = inferCommunicationPattern(message);

  const newScores: ImprintScores = {
    interventionStyle: mergeScores(current.scores.interventionStyle, interventionVotes),
    decisionCadence: mergeScores(current.scores.decisionCadence, cadenceVotes),
    dominantFocus: mergeScores(current.scores.dominantFocus, focusVotes),
    escalationBias: mergeScores(current.scores.escalationBias, escalationVotes),
    communicationPattern: commPattern
      ? mergeScores(current.scores.communicationPattern, {
          [commPattern]: 1,
        } as Partial<Record<PMOperationalImprint["communicationPattern"], number>>)
      : current.scores.communicationPattern,
  };

  const newProfile: PMOperationalImprint = {
    interventionStyle: leadingCandidate(newScores.interventionStyle, EMPTY_PROFILE.interventionStyle),
    decisionCadence: leadingCandidate(newScores.decisionCadence, EMPTY_PROFILE.decisionCadence),
    dominantFocus: leadingCandidate(newScores.dominantFocus, EMPTY_PROFILE.dominantFocus),
    escalationBias: leadingCandidate(newScores.escalationBias, EMPTY_PROFILE.escalationBias),
    communicationPattern: leadingCandidate(
      newScores.communicationPattern,
      EMPTY_PROFILE.communicationPattern,
    ),
    observedInteractionCount: current.profile.observedInteractionCount + 1,
  };

  return { profile: newProfile, scores: newScores };
}

// Produce adaptive ignition cues based on dominant focus
const DEFAULT_IGNITION_CUES: readonly string[] = [
  "A delivery dependency is blocking execution",
  "A stakeholder alignment issue is emerging",
  "I need help clarifying project scope",
] as const;

const FOCUS_IGNITION_CUES: Record<PMOperationalImprint["dominantFocus"], readonly string[]> = {
  delivery: [
    "A dependency shift is affecting milestone execution",
    "An execution blocker needs immediate resolution",
    "A delivery timeline risk needs assessment",
  ],
  stakeholders: [
    "A relationship misalignment is slowing delivery",
    "A stakeholder communication gap is creating friction",
    "An executive alignment issue needs resolution",
  ],
  governance: [
    "A scope control boundary needs clarification",
    "A governance gap is creating delivery risk",
    "A policy constraint is blocking progress",
  ],
  risk: [
    "An emerging risk needs early intervention",
    "A risk exposure pattern needs mitigation planning",
    "An escalation pathway needs proactive clarification",
  ],
};

export function computeIgnitionCues(
  profile: PMOperationalImprint,
  confidence: import("./imprint-confidence").ImprintConfidence,
): readonly string[] {
  if (confidence === "forming") return DEFAULT_IGNITION_CUES;
  return FOCUS_IGNITION_CUES[profile.dominantFocus];
}

// Produce adaptive first clarifying question based on dominant focus
const FOCUS_CLARIFYING_QUESTIONS: Record<PMOperationalImprint["dominantFocus"], string> = {
  delivery: "What dependency is constraining execution first?",
  stakeholders: "Which alignment relationship is creating delivery drag?",
  governance: "Which control boundary is currently unclear?",
  risk: "Which risk exposure is closest to threshold?",
};

const DEFAULT_CLARIFYING_QUESTION = "Which dependency is now most likely to slip delivery this week?";

export function computeAdaptiveClarifyingQuestion(
  profile: PMOperationalImprint,
  confidence: import("./imprint-confidence").ImprintConfidence,
): string {
  if (confidence === "forming" || confidence === "emerging") return DEFAULT_CLARIFYING_QUESTION;
  return FOCUS_CLARIFYING_QUESTIONS[profile.dominantFocus];
}
