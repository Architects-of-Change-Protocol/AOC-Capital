import type { ArbitrationStrategy, PortfolioConflictCandidate } from './types'

const strategy = (
  conflictId: string,
  suffix: string,
  title: string,
  rationale: string,
  recommendedActions: string[],
  expectedImpact: string,
  executiveEscalationRequired: boolean,
): ArbitrationStrategy => ({
  id: `${conflictId}-${suffix}`,
  title,
  rationale,
  recommendedActions,
  expectedImpact,
  executiveEscalationRequired,
})

export function generateArbitrationStrategies(conflict: PortfolioConflictCandidate): ArbitrationStrategy[] {
  switch (conflict.type) {
    case 'resource_contention':
      return [
        strategy(conflict.id, 'redistribute', 'Resource Redistribution', 'Directly rebalance scarce contributors across affected streams.', ['Move shared resources to highest-priority project first', 'Backfill lower-priority teams with alternate contributors'], 'Reduces immediate delivery blocking risk.', false),
        strategy(conflict.id, 'staffing', 'Temporary Staffing Escalation', 'Short-term augmentation can absorb demand spikes without full replanning.', ['Authorize contractor or internal surge team for constrained role', 'Set 30-day exit and handover criteria'], 'Restores concurrency capacity while preserving timelines.', true),
      ]
    case 'timeline_collision':
      return [
        strategy(conflict.id, 'resequence', 'Timeline Resequencing', 'Sequence conflicting windows to remove same-week delivery compression.', ['Shift lower-priority milestone out of overlap window', 'Lock a single critical path owner for handoff timing'], 'Lowers collision risk and protects near-term deadlines.', false),
        strategy(conflict.id, 'scope', 'Scope Containment', 'Containment reduces parallel work at peak overlap periods.', ['Defer non-critical scope from one project', 'Convert deferred work into follow-up release'], 'Improves focus on critical deliverables.', false),
      ]
    case 'dependency_conflict':
      return [
        strategy(conflict.id, 'fast-track', 'Dependency Fast-Track', 'Dedicated unblock workstream reduces downstream schedule slip.', ['Create daily dependency burndown checkpoint', 'Assign integration lead to constrained dependency owner'], 'Accelerates dependency clearance for blocked projects.', true),
        strategy(conflict.id, 'override', 'Priority Override', 'Dependencies impacting strategic projects require explicit precedence.', ['Issue temporary dependency SLA for upstream team', 'Freeze non-essential tasks until dependency milestone lands'], 'Protects strategic commitments and reduces cascading delays.', true),
      ]
    case 'budget_pressure':
      return [
        strategy(conflict.id, 'reallocate', 'Budget Reallocation Proposal', 'Reallocating phased spend can smooth peak portfolio pressure.', ['Move discretionary spend to next quarter', 'Protect committed spend for mission-critical milestones'], 'Stabilizes portfolio cash utilization profile.', true),
        strategy(conflict.id, 'containment', 'Scope Containment Recommendation', 'Constrain lower-value increments to stay within available envelope.', ['Pause low-value epics with low strategic alignment', 'Apply benefit-cost gate before new approvals'], 'Reduces overrun probability and preserves runway.', true),
      ]
    default:
      return [
        strategy(conflict.id, 'governance', 'Cross-Portfolio Arbitration Session', 'A formal arbitration session aligns tradeoffs across projects quickly.', ['Convene PMO-led conflict triage with all project leads', 'Agree explicit decision owner and resolution deadline'], 'Creates decisive and auditable conflict closure.', conflict.type !== 'stakeholder_saturation'),
        strategy(conflict.id, 'override', 'Executive Intervention Scheduling', 'Escalation-ready scheduling ensures unresolved conflicts do not stall execution.', ['Reserve executive decision slot in next governance cadence', 'Pre-compile option matrix with quantified tradeoffs'], 'Improves time-to-decision on persistent constraints.', true),
      ]
  }
}
