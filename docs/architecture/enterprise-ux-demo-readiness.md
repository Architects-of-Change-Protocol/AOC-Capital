# Enterprise UX & Demo Readiness

## Purpose

This document describes the philosophy, architecture, and design constraints behind
PMFreak's enterprise UX domain — the layer that transforms operational cognition
infrastructure into an approachable, trustworthy, demoable product experience.

---

## Onboarding Philosophy

PMFreak's onboarding is not a generic SaaS wizard. It is a structured trust-building
sequence designed to:

1. **Establish governance context** before any operational cognition begins
2. **Explain what PMFreak does** in plain language before asking for data
3. **Set accurate expectations** about signal quality, confidence levels, and knowledge gaps
4. **Accelerate time-to-first-value** without fabricating insights

### Onboarding Flow

```
Workspace creation
  → Governance expectations declaration
  → First project creation
  → Connector intention declaration (no live OAuth required)
  → First operational signal ingestion
  → War-room first access
  → Executive digest generation
```

Each step has:
- A human-readable explanation
- A governance note
- A trust implication
- An estimated operational impact

### What Onboarding Does NOT Do

- Does not fabricate insights to make the platform look active
- Does not skip governance boundary establishment
- Does not present generic empty states without educational context
- Does not require live connector OAuth to deliver educational value

---

## Trust-Building Philosophy

Trust in PMFreak is built through:

### 1. Source Lineage

Every insight is traceable to the signals that informed it. Lineage is immutable after
ingestion. Users can always answer: "Why did PMFreak say that?"

### 2. Bounded Uncertainty

Every insight carries an explicit uncertainty disclosure. PMFreak never claims false
certainty. Confidence levels reflect actual signal support, not UI polish.

### 3. Governance Transparency

Governance boundaries are surfaced in the UX, not hidden in configuration menus.
Users see what PMFreak cannot see, what it cannot do without authorization, and
what has been explicitly bounded.

### 4. Knowledge Gap Disclosure

PMFreak explicitly states what it does not know. The `whatPMFreakDoesNotKnow` field
on trust signals is a design requirement, not optional documentation.

---

## Guided Cognition Philosophy

Operational cognition is unfamiliar territory for most PMs and executives. The guided
cognition experience introduces concepts in order of operational dependency:

1. **Operational Cognition** — what PMFreak does
2. **Survivability** — what it measures
3. **Instability Propagation** — how pressure spreads
4. **Operational Lineage** — why insights are trustworthy
5. **Governance-Safe Federation** — how cross-system correlation works

### Design Constraints

- No AI hype language ("revolutionary", "magic", "fully automated")
- No false certainty ("will catch everything", "always accurate")
- No surveillance framing ("tracks your team", "monitors individual activity")
- Each concept includes a `whatItIsNot` clarification

---

## Empty-State Intelligence

Empty states in PMFreak are educational surfaces, not blank placeholders.

### Design Principle

Instead of: `"No projects yet."`

Use: `"Operational cognition becomes more valuable once project coordination,
escalation flow, or delivery pressure signals are available."`

### Implementation

Each route has a registered `EmptyStateGuidance` record containing:
- An educational headline
- A value explanation
- A governance note (if relevant)
- A primary call-to-action with honest framing

Empty states are honest about why they are empty — signal absence, not
feature absence.

---

## First-Value Optimization

PMFreak tracks time-to-first-insight through structured milestones:

| Milestone | Required for First Insight |
|-----------|---------------------------|
| First operational signal ingested | Yes |
| First survivability signal generated | Yes |
| First operational narrative generated | Yes |
| War-room accessed | No |
| First topology evolution detected | No |
| First executive digest generated | No |

The `evaluateFirstValueReadiness()` function determines whether the required
milestones are met and generates an honest first-value narrative that includes
confidence qualifiers.

---

## Demo Runtime Philosophy

### Core Constraint

All demo data is:
- Tagged `SYNTHETIC_DEMO` on every record
- Labeled `(SYNTHETIC)` in human-readable display fields
- Accompanied by an explicit data disclaimer on every demo scenario
- Fully deterministic (same input → same output, always)

### What Demo Data Preserves

Demo scenarios are not just fake data — they preserve PMFreak's semantic model:
- Source lineage structure
- Uncertainty disclosures
- Governance boundaries
- Survivability scoring semantics

This means a demo walkthrough teaches the platform's real architecture, not a
simplified toy version.

### Supported Demo Audiences

- **Executive**: Operational overview, escalation pressure summary, intervention
  recommendations
- **PM**: Project survivability, blocker and escalation flow
- **Governance**: Boundary visualization, source lineage inspection
- **War Room**: Operational pulse, propagation path
- **Federation**: Multi-connector correlation, source attribution

---

## Governance-Safe UX

Governance is not hidden in PMFreak's UX. Every experience surface that touches
governance-sensitive data includes:

1. **Explicit role-scoping disclosure** — what different roles can see
2. **Boundary explanation** — what cannot cross the boundary and why
3. **Approval gate visibility** — when human authorization is required
4. **Source attribution** — where the data came from

### Tenant Isolation

All enterprise UX functions accept `workspaceId` as a required parameter. There is
no path in the enterprise UX domain that could accidentally surface cross-tenant data.
Tenant isolation is enforced at the database layer (row-level security) and reinforced
at the API and UX layers.

---

## Bounded Uncertainty UX

Every insight surface in PMFreak includes uncertainty language appropriate to the
confidence level of the underlying signals:

| Confidence Level | Language Pattern |
|-----------------|-----------------|
| High | "Signals strongly indicate..." |
| Medium | "Available signals suggest..." |
| Low | "Limited signals hint at... — treat with caution" |
| Insufficient | "PMFreak does not have sufficient signal to assess this" |

The enterprise UX narratives registry enforces:
- `isHonest: true` on all narrative entries
- `avoidsFakeConfidence: true` on all narrative entries
- `exposesUncertainty: boolean` tracked explicitly per narrative

---

## Architecture

```
src/features/enterprise-ux/
├── types/                        # Shared TypeScript contracts
├── onboarding/                   # Onboarding runtime, state, checklist
├── guided-experience/            # Guided cognition runtime and concept library
├── empty-states/                 # Educational empty-state guidance registry
├── first-value/                  # First-value milestone tracking
├── demo-runtime/                 # Demo scenario builder, executive demo runtime
├── trust/                        # Trust signals, governance explanations
├── workspace/                    # Workspace bootstrap UX
├── projects/                     # Project bootstrap UX
├── connectors/                   # Connector onboarding (education, no live OAuth)
├── war-room/                     # First war-room experience, concept explainers
├── narratives/                   # Operational tour, enterprise UX narratives
├── diagnostics/                  # UX readiness diagnostics
├── hooks/                        # React hooks for all runtime surfaces
├── enterprise-ux-manager.ts      # Unified API surface
└── index.ts                      # Public exports
```
