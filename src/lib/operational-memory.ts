import { createAocRuntimeClient, RuntimeAuthorityAdapter, RuntimeExecutionAdapter } from "@/lib/aoc/runtime-client";

export const OPERATIONAL_DOMAINS = [
  "stakeholder_intelligence",
  "delivery_intelligence",
  "risk_intelligence",
  "pmo_governance",
  "team_health",
  "executive_context",
  "operational_memory",
] as const;

export type OperationalDomain = (typeof OPERATIONAL_DOMAINS)[number];

type SourceTrace = { sourceType: "chat" | "document" | "system"; sourceRef: string; excerpt?: string };

export type OperationalMemoryRecord = {
  id: string;
  domain: OperationalDomain;
  title: string;
  data: Record<string, string>;
  confidenceScore: number;
  completionScore: number;
  missingFields: string[];
  extractedFacts: string[];
  sourceTrace: SourceTrace[];
  createdAt: string;
  updatedAt: string;
};

export const DOMAIN_FIELDS: Record<OperationalDomain, string[]> = {
  stakeholder_intelligence: ["name","role","organization","decision_power","influence_level","support_level","interests","communication_preference","escalation_behavior","political_risk","known_frictions","preferred_update_format","last_signal","confidence_score"],
  delivery_intelligence: ["milestones","blockers","dependencies","deadlines","delivery_confidence","critical_path_risks","recovery_options","current_status","confidence_score"],
  risk_intelligence: ["risk_name","category","severity","probability","impact","owner","mitigation","escalation_needed","current_status","confidence_score"],
  pmo_governance: ["methodology","escalation_rules","reporting_cadence","approval_rules","quality_gates","compliance_requirements","communication_standards","confidence_score"],
  team_health: ["pm_name","workload_level","after_hours_activity","meeting_pressure","context_switching","overload_signals","fatigue_risk","support_needed","confidence_score"],
  executive_context: ["sponsor","strategic_importance","budget_sensitivity","political_visibility","executive_expectations","decision_deadlines","escalation_sensitivity","confidence_score"],
  operational_memory: ["decision","event_type","date","source","affected_project","affected_stakeholders","implication","follow_up_needed","confidence_score"],
};

// ─── Extraction helpers ────────────────────────────────────────────────────────

function extractAfter(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().slice(0, 120);
  }
  return null;
}

function extractProperNoun(text: string): string | null {
  const match = text.match(/\b([A-Z][a-z]{1,}(?:\s+[A-Z][a-z]{1,})+)\b/);
  return match?.[0] ?? null;
}

function extractDate(text: string): string | null {
  const match = text.match(
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?|(?:next\s+(?:week|month|quarter)|end\s+of\s+(?:month|quarter|year|sprint)|Q[1-4]\s+\d{4}))\b/i,
  );
  return match?.[0] ?? null;
}

function extractContextSnippet(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  if (!match || match.index === undefined) return null;
  const snippet = text.slice(match.index, match.index + 100).replace(/\n/g, " ").trim();
  return snippet.length > 15 ? snippet.slice(0, 100) : null;
}

// ─── Per-field grounded extractors ────────────────────────────────────────────
// Each extractor attempts to pull a real value from the text.
// Returns null if no confident extraction is possible (anti-hallucination).

const FIELD_EXTRACTORS: Record<string, (text: string) => string | null> = {
  // stakeholder_intelligence
  name: (text) =>
    extractAfter(text, [
      /(?:contact|owner|assigned to|with|from|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:said|requested|escalated|mentioned|confirmed|flagged)/,
    ]) ?? extractProperNoun(text),

  role: (text) =>
    extractAfter(text, [
      /\b(VP(?:\s+of\s+\w+)?|CTO|CPO|CFO|CEO|COO|CISO|Director(?:\s+of\s+\w+)?|PM\b|PMO|Program\s+Manager|Project\s+Manager|Product\s+Owner|Delivery\s+Manager|Engineering\s+Manager|Scrum\s+Master|Tech\s+Lead|Principal\s+\w+|Head\s+of\s+\w+|Senior\s+\w+\s+Manager|Executive\s+Sponsor|Steering\s+\w+)\b/i,
    ]),

  organization: (text) =>
    extractAfter(text, [
      /(?:from|at|representing|on behalf of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|Ltd|Corp|Group|Team|Division|Department))?)/,
    ]),

  decision_power: (text) => {
    if (/\b(approved|approves|final\s+say|veto|sign.?off|decision\s+maker|has\s+authority|ultimate\s+call)\b/i.test(text)) return "approver";
    if (/\b(must\s+approve|requires\s+approval|gate.?keeper|sign.?off\s+required)\b/i.test(text)) return "approver_required";
    if (/\b(recommend|advise|consult|provides\s+input|advisory)\b/i.test(text)) return "advisor";
    if (/\b(blocking|blocked\s+by|cannot\s+proceed\s+without|held\s+up\s+by)\b/i.test(text)) return "blocker";
    if (/\b(driving|leads|driving\s+the\s+decision|steering)\b/i.test(text)) return "driver";
    return null;
  },

  influence_level: (text) => {
    if (/\b(executive|C-suite|board|steering\s+committee|very\s+influential|highly\s+influential)\b/i.test(text)) return "executive";
    if (/\b(high\s+influence|key\s+stakeholder|critical\s+stakeholder|senior\s+sponsor)\b/i.test(text)) return "high";
    if (/\b(moderate\s+influence|medium\s+influence|regular\s+stakeholder)\b/i.test(text)) return "medium";
    if (/\b(low\s+influence|minor\s+stakeholder|limited\s+influence)\b/i.test(text)) return "low";
    return null;
  },

  support_level: (text) => {
    if (/\b(champion|strongly\s+supports|fully\s+behind|sponsor(?:ing)?|advocates)\b/i.test(text)) return "strong_support";
    if (/\b(support(?:s|ive)|aligned|on\s+board|agrees|backing)\b/i.test(text)) return "supportive";
    if (/\b(concern(?:ed)?|hesitant|unsure|skeptical|questioning|wavering)\b/i.test(text)) return "concerned";
    if (/\b(opposes|against|rejected|blocking|resistant|pushback)\b/i.test(text)) return "opposed";
    return null;
  },

  escalation_behavior: (text) => {
    if (/\b(escalated|escalating|keeps\s+escalating|repeatedly\s+escalat|has\s+escalated)\b/i.test(text)) return "escalating";
    if (/\b(will\s+escalate|threaten(?:ing)?\s+to\s+escalate|may\s+escalate|considering\s+escalation)\b/i.test(text)) return "threatening_escalation";
    if (/\b(de-escalat|escalation\s+resolved|stepped\s+back)\b/i.test(text)) return "resolved";
    return null;
  },

  political_risk: (text) => {
    if (/\b(politically\s+sensitive|high\s+visibility|executive\s+eyes|board\s+level|critical\s+political)\b/i.test(text)) return "high";
    if (/\b(some\s+political|moderate\s+risk|watching\s+closely)\b/i.test(text)) return "moderate";
    if (/\b(low\s+politics|no\s+political|standard)\b/i.test(text)) return "low";
    return null;
  },

  known_frictions: (text) =>
    extractAfter(text, [
      /(?:friction|tension|conflict|disagreement|challenge\s+with)[:\s]+([^\.\n]{5,100})/i,
    ]),

  last_signal: (text) =>
    extractAfter(text, [
      /(?:last\s+(?:said|mentioned|flagged|raised|updated)|recently\s+(?:said|noted|flagged))[:\s]+([^\.\n]{5,100})/i,
    ]) ?? (text.length > 20 ? text.slice(0, 100) : null),

  // delivery_intelligence
  milestones: (text) =>
    extractAfter(text, [
      /(?:milestone|phase|release|sprint|go-live|launch|checkpoint)[:\s]+([^\.\n]{5,80})/i,
    ]),

  blockers: (text) =>
    extractAfter(text, [
      /(?:blocked?\s+by|blocking\s+issue|cannot\s+proceed\s+(?:until|because)|waiting\s+on\s+(?:team|vendor|approval))[:\s]*([^\.\n]{5,100})/i,
      /^(?:blocker|blocked)[:\s]+([^\.\n]{5,100})/i,
    ]),

  dependencies: (text) =>
    extractAfter(text, [
      /(?:depends\s+on|dependent\s+on|waiting\s+(?:for|on)|pending\s+from|requires\s+(?:input|sign-off)\s+from)[:\s]*([^\.\n]{5,80})/i,
    ]),

  deadlines: (text) => extractDate(text),

  delivery_confidence: (text) => {
    if (/\b(on\s+track|green|ahead\s+of\s+schedule|confident\s+we\s+will|no\s+issues)\b/i.test(text)) return "on_track";
    if (/\b(at\s+risk|slipping|delayed|behind\s+schedule|amber|yellow|concern(?:ed)?)\b/i.test(text)) return "at_risk";
    if (/\b(missed|failed|critical|red|stopped|cannot\s+deliver|will\s+miss)\b/i.test(text)) return "critical";
    return null;
  },

  critical_path_risks: (text) =>
    extractAfter(text, [
      /(?:critical\s+path|blocking\s+delivery|delivery\s+risk|schedule\s+risk)[:\s]+([^\.\n]{5,100})/i,
    ]),

  recovery_options: (text) =>
    extractAfter(text, [
      /(?:recovery|to\s+recover|workaround|fallback|contingency|alternative)[:\s]+([^\.\n]{5,100})/i,
    ]),

  current_status: (text) => {
    if (/\b(completed|done|finished|resolved|closed|delivered)\b/i.test(text)) return "completed";
    if (/\b(in\s+progress|ongoing|active|underway|started)\b/i.test(text)) return "in_progress";
    if (/\b(blocked|on\s+hold|paused|stopped|halted)\b/i.test(text)) return "blocked";
    if (/\b(not\s+started|pending|planned|scheduled|upcoming)\b/i.test(text)) return "planned";
    return null;
  },

  // risk_intelligence
  risk_name: (text) =>
    extractAfter(text, [
      /^(?:risk)[:\s]+([^\.\n]{5,80})/i,
      /(?:risk\s+is|risks?\s+include|identified\s+risk)[:\s]+([^\.\n]{5,80})/i,
    ]),

  category: (text) => {
    if (/\b(technical|architecture|infra|infrastructure|platform)\b/i.test(text)) return "technical";
    if (/\b(delivery|timeline|schedule|deadline)\b/i.test(text)) return "delivery";
    if (/\b(resource|staffing|capacity|headcount)\b/i.test(text)) return "resource";
    if (/\b(vendor|third.?party|supplier|external)\b/i.test(text)) return "vendor";
    if (/\b(security|compliance|regulatory|audit)\b/i.test(text)) return "compliance";
    if (/\b(budget|cost|financial|spend)\b/i.test(text)) return "financial";
    return null;
  },

  severity: (text) => {
    if (/\b(critical|showstopper|blocker|extreme|project.?stopping)\b/i.test(text)) return "critical";
    if (/\b(high|major|significant|serious|severe)\b/i.test(text)) return "high";
    if (/\b(medium|moderate|notable)\b/i.test(text)) return "medium";
    if (/\b(low|minor|minimal|negligible|small)\b/i.test(text)) return "low";
    return null;
  },

  probability: (text) => {
    if (/\b(very\s+likely|almost\s+certain|high\s+probability|>?\s*80%)\b/i.test(text)) return "high";
    if (/\b(likely|probable|moderate\s+probability|50.?70%)\b/i.test(text)) return "medium";
    if (/\b(unlikely|low\s+probability|<?\s*30%|remote\s+chance)\b/i.test(text)) return "low";
    return null;
  },

  impact: (text) => {
    if (/\b(project.?stopping|catastrophic|complete\s+failure|mission.?critical)\b/i.test(text)) return "catastrophic";
    if (/\b(major\s+impact|significant\s+delay|large\s+scope)\b/i.test(text)) return "major";
    if (/\b(moderate\s+impact|some\s+delay|partial)\b/i.test(text)) return "moderate";
    if (/\b(minor\s+impact|small\s+delay|limited)\b/i.test(text)) return "minor";
    return null;
  },

  owner: (text) =>
    extractAfter(text, [
      /(?:owner|owned\s+by|responsible|assigned\s+to|accountable)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    ]) ?? extractProperNoun(text),

  mitigation: (text) =>
    extractAfter(text, [
      /(?:mitigat(?:e|ion)|to\s+fix|resolution\s+path|workaround|contingency|plan\s+to|approach)[:\s]+([^\.\n]{5,100})/i,
    ]),

  escalation_needed: (text) => {
    if (/\b(escalat(?:e|ion)\s+(?:needed|required|necessary|now))\b/i.test(text)) return "yes";
    if (/\b(no\s+escalation|escalation\s+not\s+needed|handle\s+internally)\b/i.test(text)) return "no";
    return null;
  },

  // pmo_governance
  methodology: (text) => {
    const match = text.match(/\b(agile|scrum|kanban|SAFe|LeSS|waterfall|PRINCE2|PMP|PMBOK|hybrid)\b/i);
    return match?.[0]?.toLowerCase() ?? null;
  },

  escalation_rules: (text) =>
    extractAfter(text, [
      /(?:escalat(?:ion\s+(?:rule|path|process|protocol))|escalate\s+to)[:\s]+([^\.\n]{5,100})/i,
    ]),

  reporting_cadence: (text) =>
    extractAfter(text, [
      /(?:report(?:ing)?\s+(?:cadence|frequency|schedule|cycle)|status\s+update\s+every)[:\s]+([^\.\n]{5,80})/i,
    ]) ??
    (() => {
      const match = text.match(/\b(daily|weekly|bi-weekly|fortnightly|monthly|quarterly)\b/i);
      return match?.[0] ?? null;
    })(),

  approval_rules: (text) =>
    extractAfter(text, [
      /(?:approval\s+(?:required|process|gate|workflow)|must\s+be\s+approved)[:\s]+([^\.\n]{5,100})/i,
    ]),

  // team_health
  pm_name: (text) => extractProperNoun(text),

  workload_level: (text) => {
    if (/\b(overwhelmed|critical\s+overload|burnout|too\s+much|drowning)\b/i.test(text)) return "critical";
    if (/\b(overloaded|stressed|too\s+many|stretched\s+thin|under\s+pressure)\b/i.test(text)) return "high";
    if (/\b(manageable|normal|balanced|under\s+control)\b/i.test(text)) return "normal";
    if (/\b(light|low\s+workload|capacity\s+available)\b/i.test(text)) return "low";
    return null;
  },

  after_hours_activity: (text) => {
    if (/\b(after[\s-]hours|weekend|late\s+night|overtime|past\s+midnight|3am|4am|5am)\b/i.test(text)) return "detected";
    return null;
  },

  meeting_pressure: (text) =>
    extractAfter(text, [
      /(?:meeting\s+pressure|back.?to.?back|too\s+many\s+meetings|meeting\s+overload)[:\s]*([^\.\n]{0,80})/i,
    ]) ??
    (() => {
      if (/\b(back.?to.?back|too\s+many\s+meetings|all\s+day\s+meetings)\b/i.test(text)) return "high";
      return null;
    })(),

  overload_signals: (text) =>
    extractAfter(text, [
      /(?:overload|too\s+much|cannot\s+handle|stretched)[:\s]+([^\.\n]{5,80})/i,
    ]),

  fatigue_risk: (text) => {
    if (/\b(burnout|exhausted|fatigued|hitting\s+a\s+wall)\b/i.test(text)) return "high";
    if (/\b(tired|stressed|overloaded|worn\s+out)\b/i.test(text)) return "medium";
    return null;
  },

  support_needed: (text) =>
    extractAfter(text, [
      /(?:support\s+needed|need\s+help|require\s+assistance|requesting\s+support)[:\s]+([^\.\n]{5,80})/i,
    ]),

  // executive_context
  sponsor: (text) =>
    extractAfter(text, [
      /(?:executive\s+sponsor|program\s+sponsor|sponsor)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    ]) ?? extractProperNoun(text),

  strategic_importance: (text) => {
    if (/\b(strategic|high.?priority|critical\s+initiative|flagship|top\s+priority|must.?win)\b/i.test(text)) return "high";
    if (/\b(important|significant|notable|priority)\b/i.test(text)) return "medium";
    if (/\b(low\s+priority|nice.?to.?have|backlog)\b/i.test(text)) return "low";
    return null;
  },

  budget_sensitivity: (text) => {
    if (/\b(over\s+budget|budget\s+exceeded|cost\s+overrun|spend\s+concern)\b/i.test(text)) return "over_budget";
    if (/\b(budget\s+at\s+risk|budget\s+concern|watching\s+costs)\b/i.test(text)) return "at_risk";
    if (/\b(on\s+budget|within\s+budget|budget\s+ok)\b/i.test(text)) return "on_track";
    return null;
  },

  political_visibility: (text) => {
    if (/\b(board|C-suite|high\s+visibility|executive\s+eyes|politically\s+sensitive)\b/i.test(text)) return "high";
    if (/\b(some\s+visibility|management\s+watching)\b/i.test(text)) return "medium";
    return null;
  },

  executive_expectations: (text) =>
    extractAfter(text, [
      /(?:exec(?:utive)?\s+expect(?:s|ation)|leadership\s+expect|board\s+expect)[:\s]+([^\.\n]{5,100})/i,
    ]),

  decision_deadlines: (text) => extractDate(text),

  escalation_sensitivity: (text) => {
    if (/\b(very\s+sensitive|do\s+not\s+escalate|handle\s+quietly|confidential\s+escalation)\b/i.test(text)) return "high";
    if (/\b(escalate\s+carefully|sensitive\s+escalation)\b/i.test(text)) return "moderate";
    return null;
  },

  // operational_memory
  decision: (text) =>
    extractAfter(text, [
      /(?:decided?|decision|we\s+agreed)[:\s]+([^\.\n]{5,100})/i,
      /(?:approved|confirmed|signed\s+off)[:\s]+([^\.\n]{5,100})/i,
    ]),

  event_type: (text) => {
    if (/\b(escalat)/i.test(text)) return "escalation";
    if (/\b(decided?|decision|approved|sign.?off)/i.test(text)) return "decision";
    if (/\b(blocked?|blocker|cannot\s+proceed)/i.test(text)) return "blocker";
    if (/\b(milestone|phase|release|go-live|launch)/i.test(text)) return "milestone";
    if (/\b(risk|risk\s+raised|risk\s+identified)/i.test(text)) return "risk";
    if (/\b(meeting|sync|standup|retrospective)/i.test(text)) return "meeting";
    return null;
  },

  date: (text) => extractDate(text),

  source: (text) =>
    extractAfter(text, [
      /(?:from|source|via|in|during)[:\s]+([^\.\n]{5,60})/i,
    ]),

  affected_stakeholders: (text) => extractProperNoun(text),

  implication: (text) =>
    extractAfter(text, [
      /(?:impact(?:s)?|implication|means|therefore|as\s+a\s+result|consequence)[,:\s]+([^\.\n]{5,100})/i,
    ]),

  follow_up_needed: (text) =>
    extractAfter(text, [
      /(?:follow.?up|action\s+item|next\s+step|need\s+to)[:\s]+([^\.\n]{5,80})/i,
    ]) ??
    (() => {
      if (/\b(needs?\s+follow.?up|action\s+required|pending\s+response)\b/i.test(text)) return "yes";
      return null;
    })(),

  context_switching: (text) => {
    if (/\b(context.?switching|jumping\s+between|too\s+many\s+projects|spread\s+thin)\b/i.test(text)) return "high";
    return null;
  },
};

// ─── Core extraction function ──────────────────────────────────────────────────

export function extractDomainFacts(domain: OperationalDomain, text: string) {
  const fields = DOMAIN_FIELDS[domain];
  const data: Record<string, string> = {};
  const facts: string[] = [];
  let highConfidenceCount = 0;
  let lowConfidenceCount = 0;

  for (const field of fields) {
    if (field === "confidence_score") continue;

    const extractor = FIELD_EXTRACTORS[field];
    if (extractor) {
      const extracted = extractor(text);
      if (extracted) {
        data[field] = extracted;
        facts.push(`${field}: ${extracted}`);
        highConfidenceCount++;
      }
      // No extraction → field absent. Anti-hallucination: no placeholder stored.
    } else {
      // Fallback for fields without a dedicated extractor: grab context snippet
      const fieldPattern = new RegExp(`\\b${field.replaceAll("_", "[_\\s-]?")}\\b`, "i");
      if (fieldPattern.test(text)) {
        const snippet = extractContextSnippet(text, fieldPattern);
        if (snippet && snippet.length > 15) {
          data[field] = snippet;
          facts.push(`${field}: ${snippet}`);
          lowConfidenceCount++;
        }
      }
    }
  }

  const filled = Object.keys(data).length;
  const required = fields.filter((f) => f !== "confidence_score");
  const completionScore = Math.round((filled / required.length) * 100);
  const missingFields = required.filter((field) => !(field in data));

  // Confidence reflects extraction quality, not just field count.
  // High-confidence extractions (via dedicated extractors) count more.
  const rawConfidence = filled === 0
    ? 25
    : Math.max(25, Math.min(92, 28 + highConfidenceCount * 9 + lowConfidenceCount * 3));

  // Apply anti-hallucination penalty when very few fields extracted
  const confidenceScore = filled <= 1 ? Math.min(rawConfidence, 45) : rawConfidence;

  data.confidence_score = String(confidenceScore);
  return { data, extractedFacts: facts, completionScore, missingFields, confidenceScore };
}

const runtimeClient = createAocRuntimeClient(extractDomainFacts);
const runtimeAuthority = new RuntimeAuthorityAdapter(runtimeClient);
const runtimeExecution = new RuntimeExecutionAdapter(runtimeClient, runtimeAuthority);

export async function listOperationalMemory(companyId: string, projectId: string | null, domain?: OperationalDomain) {
  const namespace = runtimeClient.resolveNamespace({ companyId, projectId });
  return runtimeClient.listOperationalMemory(namespace, domain);
}

export async function saveOperationalMemory(input: { companyId: string; projectId: string | null; domain: OperationalDomain; title: string; text: string; sourceRef: string; }) {
  const { record } = await runtimeExecution.saveOperationalMemory(input);
  return record;
}
