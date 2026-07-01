import type { ConnectorSession, ConnectorSessionHealth } from "../types/live-federation-types.js";

export interface ConnectorSessionDiagnostic {
  sessionId: string;
  level: "info" | "warn" | "error" | "critical";
  message: string;
  recommendation: string;
  isAutomated: false;
  evidence: string[];
  checkedAt: string;
}

export function generateConnectorSessionDiagnostics(
  session: ConnectorSession,
  health: ConnectorSessionHealth,
): ConnectorSessionDiagnostic[] {
  const now = new Date().toISOString();
  const diagnostics: ConnectorSessionDiagnostic[] = [];

  if (session.tokenState.clientSideExposed) {
    diagnostics.push({
      sessionId: session.id,
      level: "critical",
      message: "Token client-side exposure detected",
      recommendation: "Immediately revoke token and reinitialize connector session with server-side-only token handling",
      isAutomated: false,
      evidence: ["clientSideExposed flag set to true"],
      checkedAt: now,
    });
  }

  if (!session.tokenState.encrypted && session.tokenState.present) {
    diagnostics.push({
      sessionId: session.id,
      level: "error",
      message: "Token present but not encrypted",
      recommendation: "Encrypt token using connector-token-encryption contract before further use",
      isAutomated: false,
      evidence: ["encrypted: false", "present: true"],
      checkedAt: now,
    });
  }

  for (const blocker of health.blockers) {
    diagnostics.push({
      sessionId: session.id,
      level: "error",
      message: `Session health blocker: ${blocker}`,
      recommendation: "Review session state and initiate recovery via connector-runtime-recovery",
      isAutomated: false,
      evidence: [`blocker: ${blocker}`],
      checkedAt: now,
    });
  }

  for (const warning of health.warnings) {
    diagnostics.push({
      sessionId: session.id,
      level: "warn",
      message: `Session health warning: ${warning}`,
      recommendation: "Monitor session health and plan proactive refresh before expiry",
      isAutomated: false,
      evidence: [`warning: ${warning}`],
      checkedAt: now,
    });
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      sessionId: session.id,
      level: "info",
      message: "Connector session diagnostics nominal",
      recommendation: "No action required",
      isAutomated: false,
      evidence: [`session status: ${session.status}`, `survivability: ${health.survivabilityScore}`],
      checkedAt: now,
    });
  }

  return diagnostics;
}
