export function dampCriticalPathConfidence(base: number, staleSignals: number): number {
  return Number(Math.max(0.35, base - staleSignals * 0.04).toFixed(2));
}
