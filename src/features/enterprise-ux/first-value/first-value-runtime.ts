import type {
  FirstValueMilestone,
  FirstValueReadiness,
} from "../types/enterprise-ux-types";

const FIRST_VALUE_MILESTONES: Omit<FirstValueMilestone, "achievedAt" | "isAchieved">[] = [
  {
    id: "first-ingestion",
    label: "First operational signal ingested",
    description:
      "A meeting note, blocker, status update, or escalation has been ingested into operational memory.",
    requiredForFirstInsight: true,
  },
  {
    id: "first-survivability-signal",
    label: "First survivability signal generated",
    description:
      "PMFreak has produced its first survivability assessment from ingested project signals.",
    requiredForFirstInsight: true,
  },
  {
    id: "first-war-room-access",
    label: "War-room accessed for the first time",
    description:
      "A user has visited the Command Center with operational context present.",
    requiredForFirstInsight: false,
  },
  {
    id: "first-operational-narrative",
    label: "First operational narrative generated",
    description:
      "PMFreak has generated its first bounded-certainty operational narrative from real signals.",
    requiredForFirstInsight: true,
  },
  {
    id: "first-topology-evolution",
    label: "First topology evolution detected",
    description:
      "The operational topology map has updated based on a new signal, reflecting a coordination state change.",
    requiredForFirstInsight: false,
  },
  {
    id: "first-executive-digest",
    label: "First executive digest generated",
    description:
      "A stakeholder-appropriate operational summary has been generated with bounded-certainty language.",
    requiredForFirstInsight: false,
  },
];

export function evaluateFirstValueReadiness(
  achievedMilestoneIds: string[]
): FirstValueReadiness {
  const milestones: FirstValueMilestone[] = FIRST_VALUE_MILESTONES.map((m) => ({
    ...m,
    isAchieved: achievedMilestoneIds.includes(m.id),
    achievedAt: achievedMilestoneIds.includes(m.id)
      ? new Date().toISOString()
      : null,
  }));

  const requiredMilestones = milestones.filter((m) => m.requiredForFirstInsight);
  const allRequiredAchieved = requiredMilestones.every((m) => m.isAchieved);

  const achieved = milestones.filter((m) => m.isAchieved).length;
  const readinessPercent = Math.round((achieved / milestones.length) * 100);

  const firstInsightAchievedAt = allRequiredAchieved ? new Date().toISOString() : null;

  const firstInsightNarrative = allRequiredAchieved
    ? buildFirstInsightNarrative(milestones)
    : null;

  const nextMilestone = milestones.find((m) => !m.isAchieved && m.requiredForFirstInsight)
    ?? milestones.find((m) => !m.isAchieved)
    ?? null;

  return {
    milestones,
    isFirstInsightReady: allRequiredAchieved,
    firstInsightAchievedAt,
    firstInsightNarrative,
    nextMilestoneId: nextMilestone?.id ?? null,
    readinessPercent,
  };
}

export function retrieveFirstValueMilestones(): Omit<
  FirstValueMilestone,
  "achievedAt" | "isAchieved"
>[] {
  return FIRST_VALUE_MILESTONES;
}

export function retrieveFirstInsightNarrative(
  achievedMilestoneIds: string[]
): string | null {
  const readiness = evaluateFirstValueReadiness(achievedMilestoneIds);
  return readiness.firstInsightNarrative;
}

function buildFirstInsightNarrative(milestones: FirstValueMilestone[]): string {
  const achievedLabels = milestones
    .filter((m) => m.isAchieved)
    .map((m) => m.label);

  return (
    `PMFreak has reached first operational value. The following milestones confirm ` +
    `a baseline of operational cognition is active: ${achievedLabels.join(", ")}. ` +
    `Survivability modeling, bounded-certainty narratives, and war-room activation are now operational. ` +
    `Confidence will increase as more signals are ingested over time. ` +
    `PMFreak continues to disclose uncertainty alongside every insight it generates.`
  );
}
