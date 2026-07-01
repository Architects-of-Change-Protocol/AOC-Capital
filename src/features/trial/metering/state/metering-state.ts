import type {
  OperationCategory,
  OperationalMeteringEvent,
  OperationalQuotaProfile,
  OperationalUsageSnapshot,
} from '../domain/metering-types';
import { createReplaySafeHash } from '../utils/replay-safe';

export type MeteringEventIndex = {
  lastEventId: string | null;
  lastReplaySafeHash: string | null;
  eventSequence: number;
  eventsByCategory: Record<OperationCategory, string[]>;
  eventsByCorrelationId: Record<string, string[]>;
  eventsByWindow: Record<string, string[]>;
  dedupeHashIndex: Record<string, string>;
  latestEventAt: string | null;
};

export type MeteringRuntimeCursor = {
  cursorPosition: number;
  windowId: string | null;
};

export type MeteringStateTransition = {
  transitionId: string;
  fromStateHash: string;
  toStateHash: string;
  eventId: string;
  transitionType: 'usage_registered' | 'credits_consumed' | 'credits_reserved' | 'credits_replenished';
  occurredAt: string;
  reason: string;
  accountingDelta: { availableCreditsDelta: number; consumedCreditsDelta: number; categoryUnitsDelta: number };
  integritySignals: { immutableInputPreserved: boolean; replaySafe: boolean; deterministicCursorAdvance: boolean };
  metadata?: Record<string, unknown>;
};

export type MeteringRuntimeState = {
  dedupeHashes: Set<string>;
  events: OperationalMeteringEvent[];
  categoryUsage: Record<OperationCategory, number>;
  credits: { available: number; reserved: number; consumed: number; softThreshold: number; hardDepleted: boolean };
  eventIndex: MeteringEventIndex;
  cursor: MeteringRuntimeCursor;
  transitions: MeteringStateTransition[];
  quotaProfile: OperationalQuotaProfile;
};

export const createMeteringRuntimeState = (startingCredits: number, softThreshold = 25): MeteringRuntimeState => ({
  dedupeHashes: new Set(),
  events: [],
  categoryUsage: {
    messaging: 0, ingestion: 0, synthesis: 0, continuity: 0, orchestration: 0, retrieval: 0,
    correlation: 0, executive_generation: 0, intervention: 0, memory_operation: 0, activation_progression: 0, intelligence_traversal: 0,
  },
  credits: { available: startingCredits, reserved: 0, consumed: 0, softThreshold, hardDepleted: false },
  eventIndex: {
    lastEventId: null,
    lastReplaySafeHash: null,
    eventSequence: 0,
    eventsByCategory: {
      messaging: [], ingestion: [], synthesis: [], continuity: [], orchestration: [], retrieval: [],
      correlation: [], executive_generation: [], intervention: [], memory_operation: [], activation_progression: [], intelligence_traversal: [],
    },
    eventsByCorrelationId: {},
    eventsByWindow: {},
    dedupeHashIndex: {},
    latestEventAt: null,
  },
  cursor: { cursorPosition: 0, windowId: null },
  transitions: [],
  quotaProfile: { id: 'default-quota-profile', version: '1.0.0', scope: 'trial', quotaType: 'hybrid', hardLimit: null, softLimit: null, burstAllowance: 0, reservedAllowance: 0, sponsorFundedAllowance: 0, temporaryExpansion: 0, resetPolicy: 'rolling', enforcementMode: 'advisory', metadata: {} },
});

export const hashMeteringRuntimeState = (state: MeteringRuntimeState): string => createReplaySafeHash({
  dedupeHashes: [...state.dedupeHashes].sort(),
  events: state.events.map((event) => event.eventId),
  categoryUsage: state.categoryUsage,
  credits: state.credits,
  eventIndex: state.eventIndex,
  cursor: state.cursor,
  transitions: state.transitions.map((transition) => transition.transitionId),
});

export const createUsageSnapshot = (
  state: MeteringRuntimeState,
  snapshot: Omit<OperationalUsageSnapshot, 'categoryUsage' | 'credits' | 'totals'>,
): OperationalUsageSnapshot => ({
  ...snapshot,
  categoryUsage: { ...state.categoryUsage },
  credits: { available: state.credits.available, reserved: state.credits.reserved, consumed: state.credits.consumed },
  totals: {
    units: Object.values(state.categoryUsage).reduce((a, b) => a + b, 0),
    operations: state.events.length,
  },
});
