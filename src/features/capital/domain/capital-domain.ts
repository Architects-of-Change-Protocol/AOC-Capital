// AOC Capital Strategy Playbook — domain layer barrel (v0.1).
//
// Single import surface for the Strategy Playbook domain layer. Consumers
// (future UI, future simulation pipeline, prompt builders) should import from
// here rather than reaching into individual domain files directly.

export * from "./investor-constitution-schema";
export * from "./investor-constitution-intake";
export * from "./strategy-registry";
export * from "./suitability-rules";
export * from "./simulation-record-schema";
export * from "./llm-guardrails";
