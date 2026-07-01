import { OPERATION_CATEGORIES, type OperationalMeteringEvent } from '../domain/metering-types';

export const parseOperationalMeteringEvent = (input: unknown): OperationalMeteringEvent => {
  if (!input || typeof input !== 'object') throw new Error('Invalid OperationalMeteringEvent: expected object.');
  const event = input as OperationalMeteringEvent;
  if (!event.eventId || !event.replaySafeHash) throw new Error('Invalid OperationalMeteringEvent identity.');
  if (!OPERATION_CATEGORIES.includes(event.operationCategory)) throw new Error('Invalid OperationalMeteringEvent.operationCategory');
  if (typeof event.operationalCreditsConsumed !== 'number' || event.operationalCreditsConsumed < 0) throw new Error('Invalid OperationalMeteringEvent.operationalCreditsConsumed');
  return event;
};
