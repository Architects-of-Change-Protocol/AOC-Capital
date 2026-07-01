import { generateArbitrationStrategies } from '../src/lib/portfolio/conflict-arbitration/arbitration-engine.ts'
import { detectPortfolioConflicts } from '../src/lib/portfolio/conflict-arbitration/conflict-detector.ts'
import { runPortfolioConflictArbitration } from '../src/lib/portfolio/conflict-arbitration/portfolio-conflict-runtime.ts'
import { scoreConflictSeverity } from '../src/lib/portfolio/conflict-arbitration/severity-engine.ts'

const input = {
  projects: [
    {
      projectId: 'alpha',
      projectName: 'Alpha',
      priority: 1,
      resourceAssignments: ['Platform-Team', 'SRE'],
      timelineStart: '2026-05-01',
      timelineEnd: '2026-06-01',
      budgetAllocated: 900000,
      dependencies: ['beta'],
      stakeholders: ['VP Engineering', 'CFO'],
      technicalCapacityDemand: 60,
    },
    {
      projectId: 'beta',
      projectName: 'Beta',
      priority: 4,
      resourceAssignments: ['Platform-Team', 'Data-Team'],
      timelineStart: '2026-05-15',
      timelineEnd: '2026-06-12',
      budgetAllocated: 850000,
      stakeholders: ['VP Engineering', 'Director Ops'],
      technicalCapacityDemand: 55,
    },
  ],
}

const conflicts = detectPortfolioConflicts(input)
if (conflicts.length === 0) {
  throw new Error('conflict detection failed')
}

const severity = scoreConflictSeverity(conflicts[0], input)
if (!['low', 'moderate', 'high', 'critical'].includes(severity)) {
  throw new Error('invalid severity value')
}

const strategies = generateArbitrationStrategies(conflicts[0])
if (strategies.length < 2) {
  throw new Error('arbitration generation failed')
}

const report = runPortfolioConflictArbitration(input)
if (!report || report.totalProjects !== input.projects.length) {
  throw new Error('runtime orchestration failed')
}

console.log('[ok] portfolio conflict arbitration runtime valid')
