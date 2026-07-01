import type { PortfolioConflictCandidate, PortfolioConflictInput, PortfolioProjectInput } from './types'

const RESOURCE_CONCURRENCY_THRESHOLD = 2
const STAKEHOLDER_CONCURRENCY_THRESHOLD = 3
const TECHNICAL_CAPACITY_THRESHOLD = 100
const ESCALATION_CONCURRENCY_THRESHOLD = 3
const PORTFOLIO_BUDGET_THRESHOLD = 1_500_000

const toDay = (value?: string): number | null => {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : Math.floor(ms / 86_400_000)
}

const hasTimelineOverlap = (a: PortfolioProjectInput, b: PortfolioProjectInput): number => {
  const aStart = toDay(a.timelineStart)
  const aEnd = toDay(a.timelineEnd)
  const bStart = toDay(b.timelineStart)
  const bEnd = toDay(b.timelineEnd)
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) return 0
  const start = Math.max(aStart, bStart)
  const end = Math.min(aEnd, bEnd)
  return end >= start ? end - start + 1 : 0
}

export function detectPortfolioConflicts(input: PortfolioConflictInput): PortfolioConflictCandidate[] {
  const now = new Date().toISOString()
  const conflicts: PortfolioConflictCandidate[] = []
  const projects = input.projects
  const resourceMap = new Map<string, PortfolioProjectInput[]>()
  const stakeholderMap = new Map<string, PortfolioProjectInput[]>()

  for (const project of projects) {
    for (const resource of project.resourceAssignments) {
      const key = resource.trim()
      resourceMap.set(key, [...(resourceMap.get(key) ?? []), project])
    }
    for (const stakeholder of project.stakeholders ?? []) {
      const key = stakeholder.trim()
      stakeholderMap.set(key, [...(stakeholderMap.get(key) ?? []), project])
    }
  }

  resourceMap.forEach((owners, resource) => {
    if (owners.length > RESOURCE_CONCURRENCY_THRESHOLD) {
      conflicts.push({ id: `resource-${resource.toLowerCase().replace(/\s+/g, '-')}`, type: 'resource_contention', involvedProjects: owners.map((o) => o.projectId), impactedResources: [resource], description: `Resource ${resource} is concurrently assigned across ${owners.length} active projects.`, rootCause: `Concurrency threshold ${RESOURCE_CONCURRENCY_THRESHOLD} exceeded for critical shared resource.`, detectedAt: now, metadata: { sharedCount: owners.length, threshold: RESOURCE_CONCURRENCY_THRESHOLD } })
    }
  })

  for (let i = 0; i < projects.length; i += 1) for (let j = i + 1; j < projects.length; j += 1) {
    const left = projects[i]
    const right = projects[j]
    const overlap = hasTimelineOverlap(left, right)
    if (overlap <= 0) continue
    const sharedResources = left.resourceAssignments.filter((resource) => right.resourceAssignments.includes(resource))
    if (sharedResources.length > 0) conflicts.push({ id: `timeline-${left.projectId}-${right.projectId}`, type: 'timeline_collision', involvedProjects: [left.projectId, right.projectId], impactedResources: sharedResources, description: `Projects ${left.projectName} and ${right.projectName} overlap for ${overlap} days with shared resources.`, rootCause: 'Concurrent delivery windows compete for the same constrained execution resources.', detectedAt: now, metadata: { overlapDays: overlap, sharedCount: sharedResources.length } })
  }

  for (const project of projects) for (const dependency of project.dependencies ?? []) {
    const owner = projects.find((candidate) => candidate.projectId === dependency)
    if (!owner) continue
    const ownerConstrained = owner.resourceAssignments.length >= RESOURCE_CONCURRENCY_THRESHOLD || (owner.technicalCapacityDemand ?? 0) >= 80
    if (ownerConstrained) conflicts.push({ id: `dependency-${project.projectId}-${dependency}`, type: 'dependency_conflict', involvedProjects: [project.projectId, dependency], impactedResources: owner.resourceAssignments, description: `Project ${project.projectName} depends on constrained delivery from ${owner.projectName}.`, rootCause: 'Dependency milestone owner is capacity-constrained, increasing blockage probability.', detectedAt: now, metadata: { dependencyCount: (project.dependencies ?? []).length } })
  }

  const totalBudget = projects.reduce((sum, project) => sum + (project.budgetAllocated ?? 0), 0)
  if (totalBudget > PORTFOLIO_BUDGET_THRESHOLD) conflicts.push({ id: 'budget-portfolio-pressure', type: 'budget_pressure', involvedProjects: projects.map((project) => project.projectId), impactedResources: ['portfolio_budget'], description: `Portfolio budget demand (${totalBudget}) exceeds stress threshold (${PORTFOLIO_BUDGET_THRESHOLD}).`, rootCause: 'Overlapping funding peaks create allocation pressure across active initiatives.', detectedAt: now, metadata: { totalBudgetPressure: totalBudget, threshold: PORTFOLIO_BUDGET_THRESHOLD } })

  stakeholderMap.forEach((owners, stakeholder) => {
    if (owners.length > STAKEHOLDER_CONCURRENCY_THRESHOLD) conflicts.push({ id: `stakeholder-${stakeholder.toLowerCase().replace(/\s+/g, '-')}`, type: 'stakeholder_saturation', involvedProjects: owners.map((o) => o.projectId), impactedResources: [stakeholder], description: `Stakeholder ${stakeholder} is required across ${owners.length} critical approvals.`, rootCause: 'Decision bandwidth saturation introduces approval delay risk.', detectedAt: now, metadata: { sharedCount: owners.length, threshold: STAKEHOLDER_CONCURRENCY_THRESHOLD } })
  })

  resourceMap.forEach((owners, resource) => {
    const highest = owners.reduce((a, b) => (a.priority <= b.priority ? a : b))
    const lowest = owners.reduce((a, b) => (a.priority >= b.priority ? a : b))
    if (highest.projectId !== lowest.projectId && lowest.priority - highest.priority >= 3) conflicts.push({ id: `priority-${resource.toLowerCase().replace(/\s+/g, '-')}`, type: 'priority_inversion', involvedProjects: [highest.projectId, lowest.projectId], impactedResources: [resource], description: `Lower-priority project ${lowest.projectName} holds resource ${resource} required by higher-priority ${highest.projectName}.`, rootCause: 'Resource allocation order is misaligned with declared strategic priority.', detectedAt: now, metadata: { priorityGap: lowest.priority - highest.priority } })
  })

  const technicalDemand = projects.reduce((sum, project) => sum + (project.technicalCapacityDemand ?? 0), 0)
  if (technicalDemand > TECHNICAL_CAPACITY_THRESHOLD) conflicts.push({ id: 'technical-capacity-overload', type: 'technical_capacity_conflict', involvedProjects: projects.map((project) => project.projectId), impactedResources: ['engineering_capacity'], description: `Aggregate technical capacity demand (${technicalDemand}) exceeds available engineering bandwidth (${TECHNICAL_CAPACITY_THRESHOLD}).`, rootCause: 'Combined workstream demand outstrips technical delivery capacity.', detectedAt: now, metadata: { technicalDemand, threshold: TECHNICAL_CAPACITY_THRESHOLD } })

  stakeholderMap.forEach((ownedProjects, owner) => {
    if (!/(vp|chief|director|cfo|cto|ceo)/i.test(owner)) return
    if (ownedProjects.length > ESCALATION_CONCURRENCY_THRESHOLD) conflicts.push({ id: `escalation-${owner.toLowerCase().replace(/\s+/g, '-')}`, type: 'escalation_bottleneck', involvedProjects: ownedProjects.map((project) => project.projectId), impactedResources: [owner], description: `${owner} is a common escalation owner for ${ownedProjects.length} simultaneous critical streams.`, rootCause: 'Escalation paths converge on a single executive owner, creating governance bottlenecks.', detectedAt: now, metadata: { sharedCount: ownedProjects.length, threshold: ESCALATION_CONCURRENCY_THRESHOLD } })
  })

  return conflicts
}
