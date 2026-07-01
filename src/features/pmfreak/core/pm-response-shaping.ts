type ShapeInput = {
  diagnosis: string;
  immediateAction: string;
  reinforcement: string;
  nextStep: string;
};

const normalizeLine = (value: string) => value.replace(/\s+/g, " ").trim();

const stripAIPhrasing = (value: string) =>
  value
    .replace(/\bas an ai\b/gi, "")
    .replace(/\bi can help\b/gi, "")
    .replace(/\bconsider\b/gi, "decide")
    .replace(/\bperhaps\b/gi, "")
    .replace(/\bmaybe\b/gi, "")
    .trim();

const formatStep = (title: string, value: string) => `- ${title}: ${normalizeLine(stripAIPhrasing(value))}`;

export function buildPmNativeResponse(input: ShapeInput): string {
  return [
    "### Situation",
    formatStep("Core failure", input.diagnosis),
    "",
    "### Escalation logic",
    formatStep("What breaks next", input.reinforcement),
    "",
    "### Decision now",
    formatStep("Owner / action / timing", input.immediateAction),
    "",
    "### Next 24h",
    formatStep("Follow-through", input.nextStep),
  ].join("\n");
}
