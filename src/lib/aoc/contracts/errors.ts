export type RuntimeErrorCode =
  | "authorization_denied"
  | "runtime_unavailable"
  | "malformed_decision"
  | "invalid_capability"
  | "delegation_violation"
  | "policy_violation"
  | "audit_failure"
  | "runtime_contract_mismatch";

export type RuntimeErrorEnvelope = {
  ok: false;
  code: RuntimeErrorCode;
  message: string;
  failClosed: true;
  decisionId?: string;
  metadata?: Record<string, unknown>;
};

export function runtimeError(code: RuntimeErrorCode, message: string, metadata?: Record<string, unknown>): RuntimeErrorEnvelope {
  return { ok: false, code, message, failClosed: true, metadata };
}
