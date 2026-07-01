# PMFreak Operational Readiness Trial Domain Foundation

## Philosophy
The trial domain is modeled as a governed operational activation runtime, not a UI trial flag. State is deterministic, tenant-scoped, validation-first, and prepared for event-driven orchestration.

## Canonical Entities
- `TrialState`: authoritative tenant/workspace/user scoped runtime state with lifecycle lineage metadata.
- `TrialPlan`: capability and usage envelope with normalized capability semantics.
- `TrialUsage`: operational consumption metrics plus provider-agnostic extensibility primitives for future metering lineage.
- `OperationalCredits`: abstract consumption currency for orchestration intensity.
- `ActivationState`: activation posture and future behavioral signal attachment points.

## Activation Transition Philosophy
Activation progression is no longer modeled as a linear index progression. The canonical transition map (`ALLOWED_ACTIVATION_TRANSITIONS`) provides deterministic allowed-next, re-entry, and recovery semantics that are lightweight today and graph-compatible tomorrow.

This deliberately avoids full state-machine framework complexity while enabling future branching onboarding, collaborative onboarding, enterprise path divergence, and safe reactivation flows.

## Lifecycle Lineage Philosophy
Lifecycle state now supports transition lineage fields (`lastTransition`, `lifecycleEvents`, `transitionReason`, `transitionTimestamp`, `transitionActor`, `transitionMetadata`) to prepare for future replay, audit timeline reconstruction, and orchestration triggering.

The current model remains persistence-agnostic and side-effect free: no event bus and no event sourcing commitment yet.

## Behavioral Signal Philosophy
Behavioral and activation intelligence are introduced as semantic optional structures (`behavioralSignals`, `activationSignals`, `continuityIndicators`, `engagementIndicators`, `operationalComplexitySignals`, `upgradeIntentSignals`).

These structures intentionally remain provider-independent and scoring-engine-neutral, allowing future operational intelligence engines to evolve without contract breaks.

## Normalized Capability Rationale
Capabilities are normalized from legacy string arrays to governed records (`key`, `enabled`, optional `scope`, optional `metadata`).

This enables future scoped permissions, enterprise governance overlays, delegated runtime access, activation gating, and packaging-layer enforcement while retaining backward compatibility through defensive normalization.

## Replay/Audit Compatibility
Lifecycle metadata and extensible usage structures are deterministic and validation-gated, making them compatible with future replay systems and audit-grade runtime introspection.

## Orchestration Evolution Strategy
The current foundation intentionally stays lightweight:
- deterministic parsing,
- pure transition helpers,
- side-effect-free utilities,
- strict governance checks.

This keeps Prompt 2 (Operational Usage Metering Engine) implementation-ready without rewriting foundational domain contracts.
