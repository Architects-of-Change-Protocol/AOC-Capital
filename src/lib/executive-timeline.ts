import type { OperationalMemoryRecord } from "@/lib/operational-memory";

export type ExecutiveTimelineEvent = {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  domain: OperationalMemoryRecord["domain"];
  severity: "info" | "watch" | "high" | "critical";
};

export type OperationalTrend = {
  domain: OperationalMemoryRecord["domain"];
  direction: "improving" | "stable" | "declining";
  delta: number;
};

const byDate = (a: OperationalMemoryRecord, b: OperationalMemoryRecord) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt);

export function generateExecutiveTimeline(records: OperationalMemoryRecord[]): ExecutiveTimelineEvent[] {
  return [...records]
    .sort(byDate)
    .slice(-30)
    .map((record) => {
      // Severity: prefer fact-based adverse signals over score thresholds alone
      const adverseFacts = record.extractedFacts.filter((f) =>
        /(escalating|at_risk|critical|blocked|opposed|high|overload)/i.test(f),
      );
      const severity: ExecutiveTimelineEvent["severity"] =
        adverseFacts.length >= 2
          ? "critical"
          : adverseFacts.length >= 1 || record.confidenceScore < 45
            ? "high"
            : record.completionScore < 40
              ? "watch"
              : "info";

      // Prefer real extracted facts in the detail; fall back to metadata
      const factLines = record.extractedFacts.slice(0, 2);
      const detail =
        factLines.length > 0
          ? factLines.join(" · ")
          : `confidence ${record.confidenceScore}, fields captured: ${Object.keys(record.data).filter((k) => k !== "confidence_score").length}`;

      return {
        id: record.id,
        timestamp: record.updatedAt,
        title: `${record.domain.replaceAll("_", " ")}: ${record.title}`,
        detail,
        domain: record.domain,
        severity,
      };
    });
}

export function calculateOperationalTrends(records: OperationalMemoryRecord[]): OperationalTrend[] {
  const domains = new Map<OperationalMemoryRecord["domain"], OperationalMemoryRecord[]>();
  for (const record of records) {
    const bucket = domains.get(record.domain) ?? [];
    bucket.push(record);
    domains.set(record.domain, bucket);
  }

  return [...domains.entries()].map(([domain, entries]) => {
    const sorted = [...entries].sort(byDate);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const delta = (last?.confidenceScore ?? 0) - (first?.confidenceScore ?? 0);
    const direction = delta > 8 ? "improving" : delta < -8 ? "declining" : "stable";
    return { domain, direction, delta };
  });
}
