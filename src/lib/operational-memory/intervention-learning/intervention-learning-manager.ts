import { runInterventionLearningEngine } from "./intervention-learning-engine";
import type { InterventionLearningRequest } from "./intervention-learning-types";

export const retrieveInterventionLearning = (request: InterventionLearningRequest) => runInterventionLearningEngine(request);
export const retrieveInterventionEffectiveness = (request: InterventionLearningRequest) => retrieveInterventionLearning(request).effectiveness;
export const retrieveStakeholderResponsiveness = (request: InterventionLearningRequest) => retrieveInterventionLearning(request).stakeholderProfiles;
export const retrieveSequencingEffectiveness = (request: InterventionLearningRequest) => retrieveInterventionLearning(request).sequencingProfiles;
export const retrieveRecoveryEffectiveness = (request: InterventionLearningRequest) => retrieveInterventionLearning(request).recoveryProfiles;
export const retrieveFailurePatterns = (request: InterventionLearningRequest) => retrieveInterventionLearning(request).failurePatterns;
export const retrieveCalibrationAdjustments = (request: InterventionLearningRequest) => retrieveInterventionLearning(request).calibrationAdjustments;
export const retrieveLearningDiagnostics = (request: InterventionLearningRequest) => retrieveInterventionLearning(request).diagnostics;
export const retrieveLearningNarratives = (request: InterventionLearningRequest) => retrieveInterventionLearning(request).narratives;
