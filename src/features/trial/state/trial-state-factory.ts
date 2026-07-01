import type { TrialState } from '../types/trial-types';
import { parseTrialState } from '../schemas/trial-schemas';

export const buildTrialState = (input: unknown): TrialState => parseTrialState(input);
