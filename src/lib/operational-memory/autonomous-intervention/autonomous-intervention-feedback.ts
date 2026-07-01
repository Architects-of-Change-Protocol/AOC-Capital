import type { InterventionFeedbackSignal } from "./autonomous-intervention-types";
export const interventionFeedbackHooks: Array<InterventionFeedbackSignal["event"]> = ["intervention_proposed","intervention_accepted","intervention_rejected","intervention_executed_manually","intervention_successful","intervention_failed","intervention_partially_effective"];
