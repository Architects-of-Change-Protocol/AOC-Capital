# Autonomous Intervention Runtime

## Philosophy
Deterministic recommendation-only intervention intelligence that sequences PM actions while blocking autonomous external execution.

## Safety model
- recommendation-only execution modes
- governance gates and approval requirements
- explicit blocked actions (external messaging, destructive actions, cross-tenant targeting)

## Urgency model
Urgency levels: `monitor`, `next_cycle`, `urgent`, `immediate` based on collapse risk, unresolved pressure, bottleneck severity, survivability, and recovery probability.

## Impact model
Bounded deterministic impact estimates for pressure reduction, survivability improvement, recovery lift, governance clarity, and timeline relief.

## Escalation and recovery
Escalation paths: operational, governance, commercial, procurement, executive, technical.
Recovery paths: timeline collapse, procurement blockage, stakeholder silence, governance ambiguity, technical blocker, resource bottleneck, intervention exhaustion.

## Feedback hooks
Typed events for proposed/accepted/rejected/executed/successful/failed/partially effective interventions.

## Anti-autonomous-action safeguards
No external execution path is exposed; engine only returns explainable recommendations, safety profiles, and fallback paths.
