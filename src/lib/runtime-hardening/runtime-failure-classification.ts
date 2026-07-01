type FailureCategory =
  | "configuration"
  | "validation"
  | "governance"
  | "replay"
  | "synchronization"
  | "connector"
  | "package_integrity"
  | "test_coverage"
  | "unknown";

interface ClassifiedFailure {
  category: FailureCategory;
  failureId: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
}

const FAILURE_CATEGORY_PATTERNS: Array<{
  pattern: RegExp;
  category: FailureCategory;
}> = [
  { pattern: /package|json|pkg/i, category: "package_integrity" },
  { pattern: /governance|boundary|authority|tenant|workspace/i, category: "governance" },
  { pattern: /replay/i, category: "replay" },
  { pattern: /sync|synchroniz/i, category: "synchronization" },
  { pattern: /connector|federation|adapter/i, category: "connector" },
  { pattern: /test|contract|spec/i, category: "test_coverage" },
  { pattern: /script|missing_script/i, category: "configuration" },
  { pattern: /valid|invariant|assertion/i, category: "validation" },
];

export function classifyRuntimeFailure(
  failureId: string,
  description: string,
  severity: ClassifiedFailure["severity"] = "medium"
): ClassifiedFailure {
  for (const { pattern, category } of FAILURE_CATEGORY_PATTERNS) {
    if (pattern.test(failureId) || pattern.test(description)) {
      return { category, failureId, description, severity };
    }
  }
  return { category: "unknown", failureId, description, severity };
}

export function classifyRuntimeFailures(
  failures: Array<{ id: string; description: string; severity?: ClassifiedFailure["severity"] }>
): ClassifiedFailure[] {
  return failures.map((f) => classifyRuntimeFailure(f.id, f.description, f.severity));
}

export function groupFailuresByCategory(
  failures: ClassifiedFailure[]
): Record<FailureCategory, ClassifiedFailure[]> {
  const groups: Record<FailureCategory, ClassifiedFailure[]> = {
    configuration: [],
    validation: [],
    governance: [],
    replay: [],
    synchronization: [],
    connector: [],
    package_integrity: [],
    test_coverage: [],
    unknown: [],
  };
  for (const failure of failures) {
    groups[failure.category].push(failure);
  }
  return groups;
}
