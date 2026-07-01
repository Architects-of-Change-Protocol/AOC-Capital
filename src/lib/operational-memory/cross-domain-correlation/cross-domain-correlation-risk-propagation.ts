import type { CrossDomainRiskPropagation, CrossDomainSignal } from "./cross-domain-correlation-types";

export function modelRiskPropagation(signals: CrossDomainSignal[]): CrossDomainRiskPropagation[] {
  const transitions: Array<[CrossDomainSignal["domain"],CrossDomainSignal["domain"],string]> = [
    ["procurement","delivery","Procurement delays compress delivery timelines."],
    ["governance","delivery","Approval instability creates delivery blockers."],
    ["stakeholder","governance","Stakeholder silence leaves governance decisions unresolved."],
    ["financial","technical","Financial blockers defer technical remediation."],
  ];
  return transitions.map(([fromDomain, toDomain, causalNarrative]) => {
    const from = signals.filter((s)=>s.domain===fromDomain);
    const transfer = from.reduce((sum,s)=>sum+s.pressureContribution,0) / Math.max(1, from.length);
    return { fromDomain, toDomain, pressureTransfer: Math.min(1, transfer), causalNarrative };
  }).filter((p)=>p.pressureTransfer > 0.15);
}
