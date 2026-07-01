// AOC Protocol: TrustCoordinationPort
// Future extraction boundary: replaces direct trust-coordination imports from PMFreak.
// Host provides revocation registry lookups across claims, keys, delegations, and grants.
// Do NOT import from host application modules in this file.

export interface TrustCoordinationPort {
  getRevocationReason(input: {
    trustDomain: string;
    keyId?: string;
    claimHash?: string;
    delegationId?: string;
    grantId?: string;
  }): Promise<string | null>;
}
