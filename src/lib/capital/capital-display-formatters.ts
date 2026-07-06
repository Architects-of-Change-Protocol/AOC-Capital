// Shared display-formatting helpers for AOC Capital MVP pages (PR #23 — MVP
// Polish & Navigation Consolidation). Pure functions only — no data
// fetching, no mutation, no service/RPC calls — so product pages stay
// consistent about how missing data, currency, percentages, and dates are
// rendered without every page reimplementing the same null-checks.
//
// Consistency rules (see docs/capital/aoc-capital-mvp-navigation-map.md):
//   - null / undefined / NaN -> "Not available"
//   - zero is displayed as zero, never treated as missing
//   - percentages and currency use a consistent, fixed precision

export const NOT_AVAILABLE = "Not available";

function isMissing(value: number | null | undefined): boolean {
  return value === null || value === undefined || Number.isNaN(value);
}

export function formatCurrencyOrUnavailable(value: number | null | undefined, currency = "$"): string {
  if (isMissing(value)) return NOT_AVAILABLE;
  return `${currency}${(value as number).toFixed(2)}`;
}

export function formatPercentOrUnavailable(value: number | null | undefined, precision = 2): string {
  if (isMissing(value)) return NOT_AVAILABLE;
  return `${((value as number) * 100).toFixed(precision)}%`;
}

export function formatNumberOrUnavailable(value: number | null | undefined, precision = 0): string {
  if (isMissing(value)) return NOT_AVAILABLE;
  return (value as number).toFixed(precision);
}

export function formatDateOrUnavailable(value: string | null | undefined): string {
  if (!value) return NOT_AVAILABLE;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return NOT_AVAILABLE;
  return parsed.toLocaleString();
}

export function formatStatusLabel(value: string | null | undefined): string {
  if (!value) return NOT_AVAILABLE;
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type EvidenceStatus = "complete" | "partial" | "missing" | "not_applicable";

export function formatEvidenceStatus(value: EvidenceStatus | string | null | undefined): string {
  if (!value) return NOT_AVAILABLE;
  return formatStatusLabel(value);
}

export type ReadinessStatus = "ready_for_review" | "needs_minor_review" | "needs_hardening" | "blocked" | "not_available";

export function formatReadinessStatus(value: ReadinessStatus | string | null | undefined): string {
  if (!value) return NOT_AVAILABLE;
  return formatStatusLabel(value);
}
