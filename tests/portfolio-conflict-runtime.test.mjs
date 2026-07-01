import test from 'node:test'
import assert from 'node:assert/strict'

import { detectPortfolioConflicts } from '../src/lib/portfolio/conflict-arbitration/conflict-detector.ts'
import { generateExecutiveRecommendation } from '../src/lib/portfolio/conflict-arbitration/executive-recommendation-engine.ts'
import { runPortfolioConflictArbitration } from '../src/lib/portfolio/conflict-arbitration/portfolio-conflict-runtime.ts'
import { scoreConflictSeverity } from '../src/lib/portfolio/conflict-arbitration/severity-engine.ts'

const input = {
  projects: [
    {
      projectId: 'p1',
      projectName: 'Core Platform Revamp',
      priority: 1,
      resourceAssignments: ['Alice', 'API-Team', 'Shared-QA'],
      timelineStart: '2026-05-01',
      timelineEnd: '2026-06-15',
      budgetAllocated: 600000,
      dependencies: ['p2'],
      stakeholders: ['VP Engineering', 'CFO'],
      technicalCapacityDemand: 45,
    },
    {
      projectId: 'p2',
      projectName: 'Billing Migration',
      priority: 4,
      resourceAssignments: ['Alice', 'API-Team', 'Shared-QA'],
      timelineStart: '2026-05-10',
      timelineEnd: '2026-06-20',
      budgetAllocated: 550000,
      dependencies: [],
      stakeholders: ['VP Engineering', 'Director Ops'],
      technicalCapacityDemand: 40,
    },
    {
      projectId: 'p3',
      projectName: 'Compliance Controls',
      priority: 2,
      resourceAssignments: ['Alice', 'Security-Team'],
      timelineStart: '2026-05-12',
      timelineEnd: '2026-06-10',
      budgetAllocated: 500000,
      dependencies: [],
      stakeholders: ['VP Engineering', 'CFO', 'Director Ops'],
      technicalCapacityDemand: 35,
    },
  ],
}

test('detects resource contention', () => {
  const conflicts = detectPortfolioConflicts(input)
  assert.ok(conflicts.some((conflict) => conflict.type === 'resource_contention'))
})

test('detects timeline collision', () => {
  const conflicts = detectPortfolioConflicts(input)
  assert.ok(conflicts.some((conflict) => conflict.type === 'timeline_collision'))
})

test('detects priority inversion', () => {
  const conflicts = detectPortfolioConflicts(input)
  assert.ok(conflicts.some((conflict) => conflict.type === 'priority_inversion'))
})

test('scores critical severity for broad technical overload', () => {
  const candidate = {
    id: 'technical-capacity-overload',
    type: 'technical_capacity_conflict',
    involvedProjects: ['p1', 'p2', 'p3'],
    impactedResources: ['engineering_capacity'],
    description: 'overload',
    rootCause: 'demand',
    detectedAt: new Date().toISOString(),
    metadata: { technicalDemand: 180, threshold: 100, sharedCount: 6 },
  }

  const severity = scoreConflictSeverity(candidate, input)
  assert.equal(severity, 'critical')
})

test('generates executive escalation only for high/critical conflicts', () => {
  assert.equal(generateExecutiveRecommendation('budget_pressure', 'moderate'), undefined)
  assert.ok(generateExecutiveRecommendation('budget_pressure', 'high'))
})

test('computes portfolio health score within 0-100', () => {
  const report = runPortfolioConflictArbitration(input)
  assert.ok(report.portfolioHealthScore >= 0 && report.portfolioHealthScore <= 100)
})

test('runs runtime end-to-end orchestration', () => {
  const report = runPortfolioConflictArbitration(input)
  assert.equal(report.totalProjects, 3)
  assert.ok(report.conflictsDetected > 0)
  assert.equal(report.conflicts.length, report.conflictsDetected)
})
