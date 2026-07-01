// AOC Protocol: port interface re-exports.
// All ports defined here represent the boundary between AOC and its host application.
// Future extraction: when AOC becomes a standalone package, these ports become the
// public contract that host applications must satisfy to use the AOC runtime.

export type { SecurityAuditPort, AocGovernanceEventType, AocAuditEventPayload } from "./security-audit";
export type { PrivilegedDbPort, AocPrivilegedDbContext, AocDbClient } from "./privileged-db";
export type { AccessVerificationPort } from "./access-verification";
export { AocAccessDeniedError } from "./access-verification";
export type { AgentAttestationPort } from "./agent-attestation";
export type { PolicyEvaluatorPort, PolicyDecision, PolicyEvaluationInput, PolicyEvaluationResult } from "./policy-evaluation";
export type { TrustDomainPort, TrustKeyRecord, TrustDomainRecord, TrustVerificationResult } from "./trust-domain";
export type { TrustCoordinationPort } from "./trust-coordination";

export type { CapabilityClaimPorts, CapabilitySignerPort } from "./capability-verification";
