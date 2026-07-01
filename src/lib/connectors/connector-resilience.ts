export function boundedRetrySchedule(attempt: number, maxMs = 60000) { return Math.min(1000 * 2 ** attempt, maxMs); }
