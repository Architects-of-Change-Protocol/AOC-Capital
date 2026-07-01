// AOC Protocol: capability claim injection ports.
// Protocol code consumes these explicit interfaces only; runtime registries and host
// service locators compose concrete implementations outside the protocol package.

import type { SecurityAuditPort } from "./security-audit";
import type { TrustCoordinationPort } from "./trust-coordination";
import type { TrustDomainPort, TrustKeyRecord } from "./trust-domain";

export interface CapabilitySignerPort {
  resolvePrivateSigningKey(input: {
    trustDomain: string;
    key: TrustKeyRecord;
  }): unknown;
}

export interface CapabilityClaimPorts {
  trustDomain: TrustDomainPort;
  trustCoordination: TrustCoordinationPort;
  securityAudit: Pick<SecurityAuditPort, "logEvent">;
  signer: CapabilitySignerPort;
}
