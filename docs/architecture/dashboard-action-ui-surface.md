# Dashboard Action UI Surface

Track 8.10 — PMO Dashboard Runtime Integration

## Purpose

Track 8.10 exposes the Track 8.7 Dashboard Action Center Runtime as a read-only visual surface inside the executive dashboard. It transforms generated action intelligence into an executive operational command center without executing, mutating, or approving any actions.

## Read-Only Action Surface Model

All components in this track are purely presentational. No component:
- Executes dashboard actions
- Mutates dashboard state
- Creates approval workflows
- Issues API calls
- Contains click handlers that trigger side effects

The surface exists to surface intelligence, not to act on it. Execution workflows are deferred to Track 8.12+.

## Why Actions Are Visual-Only in Track 8.10

Track 8.7 generates and prioritizes actions from dashboard signal. Track 8.10 makes that intelligence visible to executives. The separation is intentional:

1. Executive review of generated actions must precede any execution
2. Approval workflows (Track 8.13) require a persistent action lifecycle (Track 8.14)
3. External task adapters (Track 8.11) must be wired before actions can be dispatched

Track 8.10 closes the visibility gap: actions exist in the runtime but were previously invisible to the UI.

## Component Hierarchy

```
ExecutiveDashboardActionCenter
├── DashboardActionSummary        (aggregate metrics)
├── DashboardNextActionPanel      (prominent recommended action)
└── DashboardActionQueue
    └── DashboardActionCard[]     (per-action detail cards)
        ├── ActionPriorityBadge
        ├── ActionOwnerBadge
        ├── ActionExecutionLaneBadge
        ├── ActionSLADisplay
        └── ActionEscalationIndicator
```

## Priority Grouping

Actions in the queue are grouped by priority in descending severity order:

1. `critical` — immediate response required
2. `high` — response within SLA window
3. `medium` — tracked, scheduled response
4. `low` — monitoring cadence

Each group is only rendered when it contains actions. The grouping function (`groupActionsByPriority`) is exported for testability.

## Owner Lane Rendering

Owner lanes map internal identifiers to human-readable executive labels:

| Lane | Label |
|---|---|
| `project_manager` | Project Manager |
| `pmo_director` | PMO Director |
| `technical_lead` | Technical Lead |
| `finance_lead` | Finance Lead |
| `logistics_lead` | Logistics Lead |
| `executive_sponsor` | Executive Sponsor |
| `client_owner` | Client Owner |
| `vendor_owner` | Vendor Owner |
| `system_runtime` | System Runtime |

## Execution Lane Rendering

Execution lanes indicate which operational process owns resolution:

| Lane | Label |
|---|---|
| `dashboard_refresh` | Dashboard Refresh |
| `portfolio_governance` | Portfolio Governance |
| `pmo_intervention` | PMO Intervention |
| `executive_decision` | Executive Decision |
| `risk_management` | Risk Management |
| `dependency_management` | Dependency Management |
| `financial_governance` | Financial Governance |
| `client_coordination` | Client Coordination |
| `technical_coordination` | Technical Coordination |
| `system_recovery` | System Recovery |

## Escalation Rendering

`ActionEscalationIndicator` renders two states:

- **Escalation required**: Shows target owner lane and escalation reason with a red-tinted indicator
- **No escalation**: Shows a muted "No escalation required" label

## Integration with Track 8.7

The dashboard page calls `runDashboardActionCenter({ dashboardViewModel })` to generate the `DashboardActionCenterReport`. This report flows directly to `ExecutiveDashboardActionCenter` as a prop. No additional state management, caching, or transformation is performed in the UI layer.

## Data Flow

```
DashboardViewModel (Track 8.3/8.4)
    ↓
runDashboardActionCenter() (Track 8.7)
    ↓
DashboardActionCenterReport
    ↓
ExecutiveDashboardActionCenter
    ├── DashboardActionSummary
    ├── DashboardNextActionPanel
    └── DashboardActionQueue → DashboardActionCard[]
```

## Future Execution Workflow Path

Track 8.10 is the visibility foundation for a future execution pipeline:

- **Track 8.11** — External Task Adapter Runtime: Wire actions to external task systems
- **Track 8.12** — Manual Action Execution: Allow controlled single-action execution from the UI
- **Track 8.13** — Approval Workflow: Gate execution behind approval steps
- **Track 8.14** — Action Lifecycle Persistence: Persist action state (proposed → approved → in_progress → completed)

When Track 8.12 lands, action cards will gain execution affordances. Until then, the surface remains read-only by design.
