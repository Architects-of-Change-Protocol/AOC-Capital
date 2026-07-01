export type ContinuitySeverity = "info" | "warn" | "error";

export type ContinuityIssue = { code: string; severity: ContinuitySeverity; message: string };

export function logContinuityIssue(scope: string, issue: ContinuityIssue, metadata: Record<string, unknown> = {}) {
  const safe = Object.fromEntries(Object.entries(metadata).filter(([k]) => !k.toLowerCase().includes("token") && !k.toLowerCase().includes("secret")));
  const method = issue.severity === "error" ? console.error : issue.severity === "warn" ? console.warn : console.info;
  method(`[continuity:${scope}] ${issue.code}`, { message: issue.message, ...safe });
}
