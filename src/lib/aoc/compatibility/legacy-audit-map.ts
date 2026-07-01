import type { AuditTimelineItem } from "@/lib/aoc/protocol/types";

export function mapLegacyAuditEvent(item: AuditTimelineItem): AuditTimelineItem {
  return {
    ...item,
    event_detail: item.event_detail ?? {},
  };
}
