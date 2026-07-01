import { createHash } from 'node:crypto';

export const createReplaySafeHash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

export const createDeterministicEventId = (seed: string): string => createHash('sha1').update(seed).digest('hex');
