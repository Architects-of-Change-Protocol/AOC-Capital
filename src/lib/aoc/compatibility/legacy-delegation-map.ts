import type { Delegation } from "@/lib/aoc/protocol/types";

export function mapLegacyDelegationToProtocol(delegation: Delegation): Delegation {
  return {
    ...delegation,
    metadata: delegation.metadata ?? {},
  };
}
