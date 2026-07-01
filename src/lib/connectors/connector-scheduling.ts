export function shouldPollConnector(inFlight: boolean, driftSeconds: number, thresholdSeconds = 30) { return !inFlight && driftSeconds >= thresholdSeconds; }
