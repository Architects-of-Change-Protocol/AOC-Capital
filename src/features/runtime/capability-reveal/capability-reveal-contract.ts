import type { CapabilityDomain } from "./capability-reveal-types";

export const REVEAL_DOMAIN_ORDER: CapabilityDomain[] = [
  "core",
  "projects",
  "vault",
  "memory",
  "risks",
  "stakeholders",
  "delivery",
  "coordination",
  "interventions",
  "executive",
  "governance",
  "scope",
  "lessons",
];

export const ROLE_DOMAIN_PRIORITIES: Record<string, CapabilityDomain[]> = {
  pm: ["projects", "delivery", "coordination", "interventions"],
  pmo: ["executive", "governance", "memory", "coordination"],
  executive: ["executive", "risks", "stakeholders", "governance"],
  ops: ["delivery", "coordination", "vault", "memory"],
};
