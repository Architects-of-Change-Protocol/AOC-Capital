import type { CostGovernanceSeverity, ProcurementRiskSignal } from "./cost-governance-types";

export interface ProcurementRiskInput {
  poLatencyDays: number;
  vendorDependencyTimingRisk: number;
  blockedPurchasingSequenceCount: number;
  downstreamScheduleFinancialCouplingRisk: number;
  delayedVendorRelease: boolean;
  approvalLag: boolean;
  hardwareShipmentDelay: boolean;
  dependencyInvoiceBlockage: boolean;
}

const severityByRisk = (risk: number): CostGovernanceSeverity => {
  if (risk < 25) return "healthy";
  if (risk < 45) return "watch";
  if (risk < 70) return "elevated";
  return "critical";
};

export function evaluateProcurementRisk(input: ProcurementRiskInput): ProcurementRiskSignal {
  const scenarioFlags = [
    input.delayedVendorRelease ? "delayed_vendor_release" : null,
    input.approvalLag ? "procurement_approval_lag" : null,
    input.hardwareShipmentDelay ? "hardware_shipment_delay" : null,
    input.dependencyInvoiceBlockage ? "dependency_invoice_blockage" : null,
  ].filter((v): v is string => Boolean(v));

  const scenarioWeight = scenarioFlags.length * 8;
  const riskScore = Math.round(
    Math.min(
      100,
      input.poLatencyDays * 1.5 +
        input.vendorDependencyTimingRisk * 0.25 +
        input.blockedPurchasingSequenceCount * 9 +
        input.downstreamScheduleFinancialCouplingRisk * 0.25 +
        scenarioWeight,
    ),
  );

  return {
    poLatencyDays: input.poLatencyDays,
    vendorDependencyRisk: input.vendorDependencyTimingRisk,
    blockedPurchasingCount: input.blockedPurchasingSequenceCount,
    downstreamFinancialCouplingRisk: input.downstreamScheduleFinancialCouplingRisk,
    scenarioFlags,
    severity: severityByRisk(riskScore),
    riskScore,
  };
}
