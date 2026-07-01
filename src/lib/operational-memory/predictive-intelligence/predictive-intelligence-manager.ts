import type { PredictiveOperationalRequest } from "./predictive-intelligence-types";
import { assertPredictiveGovernanceScope } from "./predictive-intelligence-governance";
import { buildPredictiveOperationalContext } from "./predictive-intelligence-context";
import { buildPredictiveOperationalResult } from "./predictive-intelligence-engine";

export async function retrievePredictiveOperationalIntelligence(request: PredictiveOperationalRequest) { assertPredictiveGovernanceScope(request); return buildPredictiveOperationalResult(await buildPredictiveOperationalContext(request)); }
export async function retrieveOperationalForecasts(request: PredictiveOperationalRequest) { return (await retrievePredictiveOperationalIntelligence(request)).trajectoryForecasts; }
export async function retrieveScenarioProjections(request: PredictiveOperationalRequest) { return (await retrievePredictiveOperationalIntelligence(request)).scenarioProjections; }
export async function retrievePredictedOperationalOutcomes(request: PredictiveOperationalRequest) { return (await retrievePredictiveOperationalIntelligence(request)).predictedOutcomes; }
export async function retrieveInterventionImpactEstimates(request: PredictiveOperationalRequest) { return (await retrievePredictiveOperationalIntelligence(request)).interventionImpactEstimates; }
export async function retrievePredictiveRiskClusters(request: PredictiveOperationalRequest) { return (await retrievePredictiveOperationalIntelligence(request)).riskClusters; }
export async function retrievePredictiveNarratives(request: PredictiveOperationalRequest) { return (await retrievePredictiveOperationalIntelligence(request)).predictiveNarratives; }
export async function retrieveForecastUncertainty(request: PredictiveOperationalRequest) { return (await retrievePredictiveOperationalIntelligence(request)).uncertaintyNotes; }
