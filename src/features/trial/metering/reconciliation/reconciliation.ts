import type { MeteringRuntimeState } from '../state/metering-state';

export type UsageReconciliationSnapshot = {
  eventCount: number;
  distinctReplayHashes: number;
  availableCredits: number;
  consumedCredits: number;
  integrityOk: boolean;
  transitionCount: number;
  cursorPosition: number;
  latestEventId: string | null;
  latestTransitionId: string | null;
  quotaPosture: 'within_soft' | 'soft_exhausted' | 'hard_exhausted';
  versionContextPresent: boolean;
  lifecycleModifierPresent: boolean;
  immutableTransitionIntegrity: boolean;
};

export const generateUsageReconciliationSnapshot = (state: MeteringRuntimeState): UsageReconciliationSnapshot => ({
  eventCount: state.events.length,
  distinctReplayHashes: state.dedupeHashes.size,
  availableCredits: state.credits.available,
  consumedCredits: state.credits.consumed,
  integrityOk: state.events.length >= state.dedupeHashes.size,
  transitionCount: state.transitions.length,
  cursorPosition: state.cursor.cursorPosition,
  latestEventId: state.eventIndex.lastEventId,
  latestTransitionId: state.transitions.at(-1)?.transitionId ?? null,
  quotaPosture: state.credits.available <= 0 ? 'hard_exhausted' : (state.credits.available <= state.credits.softThreshold ? 'soft_exhausted' : 'within_soft'),
  versionContextPresent: state.events.some((event) => Boolean(event.versionContext)),
  lifecycleModifierPresent: state.events.some((event) => Boolean(event.versionContext?.lifecycleContextVersion)),
  immutableTransitionIntegrity: state.transitions.every((transition) => transition.integritySignals.immutableInputPreserved),
});
