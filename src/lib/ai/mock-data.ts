import type { AIResponseCard, AIResponseEnvelope, MemoryEvent } from "@/lib/ai/types";

const generatedAt = "2026-04-29T09:30:00Z";

const stakeholderCards: AIResponseCard[] = [
  {
    id: "hidden-owner-detected",
    headline: "Hidden owner detected in security sign-off path",
    confidenceScore: 0.9,
    confidenceLevel: "very-high",
    severity: "high",
    rationale: "Three steering updates referenced Security Architecture decisions, but no accountable owner appears in the RAID log.",
    recommendedNextAction: { title: "Assign named approver for API security exception", owner: "Program Manager", dueBy: "2026-05-01", actionLabel: "Log to Project Memory" },
    sourceTags: [{ label: "steering-notes", context: "Apr 22, Apr 24, Apr 28" }, { label: "raid-log-gap", context: "owner column empty" }],
  },
];

const meetingsCards: AIResponseCard[] = [
  {
    id: "meeting-owner-gap",
    headline: "Meeting ended without clear owner for dependency recovery",
    confidenceScore: 0.87,
    confidenceLevel: "high",
    severity: "critical",
    rationale: "Transcript shows agreement to recover timeline, but owner phrases remained collective (\"we\", \"team\") with no named assignee.",
    recommendedNextAction: { title: "Issue 2-line owner confirmation in follow-up note", owner: "Chief of Staff", dueBy: "2026-04-29", actionLabel: "Create escalation memo" },
    sourceTags: [{ label: "meeting-transcript", context: "SteerCo 2026-04-29" }, { label: "action-parser", context: "owner confidence 0.41" }],
  },
];

const politicalRiskCards: AIResponseCard[] = [
  {
    id: "sponsor-disengagement-risk",
    headline: "Sponsor disengagement risk rising",
    confidenceScore: 0.84,
    confidenceLevel: "high",
    severity: "high",
    rationale: "Executive sponsor declined two readiness reviews and shifted escalation decisions to staff, signaling reduced active sponsorship.",
    recommendedNextAction: { title: "Schedule 15-minute sponsor alignment checkpoint", owner: "PMO Lead", dueBy: "2026-04-30", actionLabel: "Create escalation memo" },
    sourceTags: [{ label: "calendar-signal", context: "2 declined reviews" }, { label: "escalation-thread", context: "delegated approvals" }],
  },
];

const escalationCards: AIResponseCard[] = [
  {
    id: "escalation-not-ready",
    headline: "Escalation not ready for executive forum",
    confidenceScore: 0.82,
    confidenceLevel: "high",
    severity: "moderate",
    rationale: "Current packet lacks quantified impact and alternative paths; likely to trigger deferral instead of decision.",
    recommendedNextAction: { title: "Draft one-page memo with impact, options, and ask", owner: "Delivery Director", dueBy: "2026-04-30", actionLabel: "Create escalation memo" },
    sourceTags: [{ label: "memo-validator", context: "impact section missing" }, { label: "prior-escalations", context: "deferral pattern match" }],
  },
];

const messageNudgesCards: AIResponseCard[] = [
  {
    id: "accusatory-tone-nudge",
    headline: "Message may sound accusatory to Operations leadership",
    confidenceScore: 0.91,
    confidenceLevel: "very-high",
    severity: "moderate",
    rationale: "Draft repeats \"you missed\" framing and lacks shared-accountability language expected for sponsor communications.",
    recommendedNextAction: { title: "Shift to neutral fact + request framing", owner: "Program Manager", dueBy: "2026-04-29", actionLabel: "Rewrite message" },
    sourceTags: [{ label: "tone-model", context: "accusatory score 0.78" }, { label: "persona-profile", context: "Ops VP: collaborative tone" }],
  },
];

const projectMemoryEvents: MemoryEvent[] = [
  { id: "ev-1", timestamp: "2026-04-27T16:30:00Z", type: "decision", summary: "Scope freeze reconfirmed through UAT gate by sponsor council.", module: "project-memory" },
  { id: "ev-2", timestamp: "2026-04-28T11:00:00Z", type: "owner-gap", summary: "Hidden owner detected for security exception sign-off.", module: "stakeholder-intel" },
  { id: "ev-3", timestamp: "2026-04-29T08:50:00Z", type: "escalation", summary: "SteerCo follow-up requested named owner for recovery timeline.", module: "meetings" },
  { id: "ev-4", timestamp: "2026-04-29T09:10:00Z", type: "comms", summary: "Executive update rewritten to remove accusatory framing.", module: "message-nudges" },
];

export const stakeholderIntelEnvelope: AIResponseEnvelope<AIResponseCard[]> = { module: "stakeholder-intel", generatedAt, confidence: "very-high", summary: "Ownership and sponsor patterns indicate concentrated execution risk.", data: stakeholderCards };
export const meetingsEnvelope: AIResponseEnvelope<AIResponseCard[]> = { module: "meetings", generatedAt, confidence: "high", summary: "Owner clarity degradation detected in latest leadership meeting.", data: meetingsCards };
export const politicalRiskEnvelope: AIResponseEnvelope<AIResponseCard[]> = { module: "political-risk", generatedAt, confidence: "high", summary: "Sponsorship signals suggest a pending influence gap.", data: politicalRiskCards };
export const escalationGuideEnvelope: AIResponseEnvelope<AIResponseCard[]> = { module: "escalation-guide", generatedAt, confidence: "high", summary: "Escalation quality below decision-ready threshold.", data: escalationCards };
export const messageNudgesEnvelope: AIResponseEnvelope<AIResponseCard[]> = { module: "message-nudges", generatedAt, confidence: "very-high", summary: "Language adjustments needed for executive-safe tone.", data: messageNudgesCards };
export const projectMemoryEnvelope: AIResponseEnvelope<MemoryEvent[]> = { module: "project-memory", generatedAt, confidence: "high", summary: "Cross-module timeline available for rapid recall and accountability.", data: projectMemoryEvents };
