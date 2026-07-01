import type {
  OperationalCausalityChain,
  OperationalLineageType,
  OperationalMemoryRecord,
  OperationalMemoryRecordType,
  OperationalResolutionStatus,
} from "./runtime-memory-types";

export type LineageNode = {
  recordId: string;
  recordType: OperationalMemoryRecordType;
  summary: string;
  lineageType: OperationalLineageType | null;
  resolutionStatus: OperationalResolutionStatus;
  depth: number;
};

export function buildCausalityChain(
  rootRecord: OperationalMemoryRecord,
  allRecords: OperationalMemoryRecord[],
  maxDepth = 8,
): OperationalCausalityChain {
  const chain: LineageNode[] = [];
  const visited = new Set<string>();

  const traverse = (
    record: OperationalMemoryRecord,
    depth: number,
    incomingLineageType: OperationalLineageType | null,
  ) => {
    if (depth > maxDepth || visited.has(record.id)) return;
    visited.add(record.id);
    chain.push({
      recordId: record.id,
      recordType: record.recordType,
      summary: record.summary,
      lineageType: incomingLineageType,
      resolutionStatus: record.resolutionStatus,
      depth,
    });
    const children = allRecords.filter((r) => r.parentRecordId === record.id && !visited.has(r.id));
    for (const child of children) {
      traverse(child, depth + 1, child.lineageType);
    }
  };

  traverse(rootRecord, 0, null);

  return {
    rootRecordId: rootRecord.id,
    chain,
    totalDepth: chain.length > 0 ? Math.max(...chain.map((n) => n.depth)) : 0,
    unresolved: chain.some(
      (n) => n.resolutionStatus === "unresolved" || n.resolutionStatus === "escalated",
    ),
  };
}

export function reconstructLineageAncestry(
  record: OperationalMemoryRecord,
  allRecords: OperationalMemoryRecord[],
): OperationalMemoryRecord[] {
  const ancestry: OperationalMemoryRecord[] = [];
  const visited = new Set<string>();
  let current: OperationalMemoryRecord | undefined = record;

  while (current?.parentRecordId) {
    if (visited.has(current.parentRecordId)) break;
    visited.add(current.parentRecordId);
    const parent = allRecords.find((r) => r.id === current!.parentRecordId);
    if (!parent) break;
    ancestry.unshift(parent);
    current = parent;
  }

  return ancestry;
}

export function computeLineageDepth(
  record: OperationalMemoryRecord,
  allRecords: OperationalMemoryRecord[],
): number {
  const visited = new Set<string>();
  let depth = 0;
  let current: OperationalMemoryRecord | undefined = record;

  while (current?.parentRecordId) {
    if (visited.has(current.parentRecordId)) break;
    visited.add(current.parentRecordId);
    const parent = allRecords.find((r) => r.id === current!.parentRecordId);
    if (!parent) break;
    depth++;
    current = parent;
  }

  return depth;
}

export function findLineageRoot(
  record: OperationalMemoryRecord,
  allRecords: OperationalMemoryRecord[],
): OperationalMemoryRecord {
  const visited = new Set<string>();
  let current = record;

  while (current.parentRecordId) {
    if (visited.has(current.parentRecordId)) break;
    visited.add(current.parentRecordId);
    const parent = allRecords.find((r) => r.id === current.parentRecordId);
    if (!parent) break;
    current = parent;
  }

  return current;
}

export function getDirectChildren(
  record: OperationalMemoryRecord,
  allRecords: OperationalMemoryRecord[],
): OperationalMemoryRecord[] {
  return allRecords.filter((r) => r.parentRecordId === record.id);
}
