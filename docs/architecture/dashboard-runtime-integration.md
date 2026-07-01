# Dashboard Runtime Integration

**Track 8.1 — PMO Dashboard Runtime Integration Layer**

## Purpose

The Dashboard Runtime Integration layer bridges all completed portfolio executive orchestration runtimes (Track 7) into a unified dashboard-consumption layer. It transforms raw portfolio runtime outputs into dashboard-ready, UI-safe, deterministic DTOs consumable by PMFreak protected routes, API endpoints, executive cards, widgets, and portfolio panels.

This runtime does **not** render UI. It produces deterministic data contracts.

---

## DTO Strategy

All dashboard surfaces consume a single unified DTO: `PortfolioExecutiveDashboardDTO`. This object is assembled by composing six independent adapter outputs. Each adapter is a pure function — same input always produces the same output.

Severity and status normalization is centralised in adapter functions. No consumer needs to re-interpret raw portfolio severity strings.

---

## Adapter Responsibilities

| Adapter | Input | Output |
|---|---|---|
| `adaptPortfolioHealthPanel` | `PortfolioExecutiveDashboardReport` | `PortfolioHealthPanelDTO` |
| `adaptExecutiveSummaryCard` | `PortfolioExecutiveDashboardReport` | `ExecutiveSummaryCardDTO` |
| `adaptRiskTable` | `PortfolioExecutiveDashboardReport` | `RiskTableRowDTO[]` (max 10) |
| `adaptDecisionWidget` | `ExecutiveDecisionSimulationReport[]` | `DecisionWidgetItemDTO[]` (max 8) |
| `adaptInterventionQueue` | `PMOInterventionAutomationReport` | `InterventionQueueItemDTO[]` (max 15, sorted by urgency) |
| `adaptAlertPanel` | All inputs | `AlertPanelItemDTO[]` (max 12, aggregated) |

---

## Severity Normalization

### Portfolio Risk Level → DashboardSeverity

| Portfolio Risk Level | Dashboard Severity |
|---|---|
| `critical` | `critical` |
| `high` | `warning` |
| `moderate` | `warning` |
| `low` | `info` |

### Portfolio Health Score → DashboardCardStatus

| Score Range | Status |
|---|---|
| 80+ | `healthy` |
| 65–79 | `attention` |
| < 65 | `critical` |

### Intervention Urgency → DashboardSeverity

| Urgency | Severity |
|---|---|
| `critical` | `critical` |
| `high` | `warning` |
| `medium` | `warning` |
| `low` | `info` |

### Decision Recommendation → DashboardSeverity

| Condition | Severity |
|---|---|
| `reject` or `escalate` | `critical` |
| `approve` / `approve_with_conditions` with confidence ≥ 80 | `info` |
| All other cases | `warning` |

---

## Dashboard Integration Contract

The runtime exposes one entry point:

```typescript
runDashboardRuntimeIntegration(input: DashboardRuntimeInput): PortfolioExecutiveDashboardDTO
```

`DashboardRuntimeInput` accepts:

- `executiveDashboardReport` — output of Track 7.5 `runExecutiveDashboardAggregation()`
- `interventionReport?` — output of Track 7.4 `runPMOInterventionAutomation()`
- `decisionSimulationReports?` — array of Track 7.2 `runExecutiveDecisionSimulation()` outputs
- `conflictReport?` — raw conflict report with individual conflict objects

The output `PortfolioExecutiveDashboardDTO` powers:

1. Portfolio health panel
2. Executive summary card
3. Top risks table (max 10 rows)
4. Decisions needed widget (max 8 items)
5. PMO interventions queue (max 15 items, sorted critical → low)
6. Conflict/alert panel (max 12 items, aggregated from all sources)

---

## PMFreak Frontend Consumption Path

Planned for Track 8.3 (Protected Route Dashboard Consumption):

```
Protected Route Handler
  → calls runDashboardRuntimeIntegration(input)
  → passes PortfolioExecutiveDashboardDTO to page props
  → dashboard surface components consume typed DTOs directly
```

No component should call Track 7 runtimes directly. All portfolio data flows through this integration layer.

---

## Future API Integration Path

Planned for Track 8.2 (Dashboard API Runtime):

```
GET /api/dashboard/portfolio-executive
  → assembles DashboardRuntimeInput from stored runtime outputs
  → calls runDashboardRuntimeIntegration(input)
  → returns PortfolioExecutiveDashboardDTO as JSON response
```

---

## Future Extension Points

- **Tenant-specific dashboard personalization** — adapter layer can accept tenant config to filter or weight severity thresholds per organization
- **Live refresh orchestration** — runtime can be invoked on a polling schedule; DTO shape is stable across refreshes
- **Widget hydration strategy** — individual adapter exports allow selective hydration of specific dashboard panels without running the full pipeline
- **Dashboard caching layer** — deterministic DTO output is cache-safe; same inputs always produce the same DTO for a given portfolio snapshot
