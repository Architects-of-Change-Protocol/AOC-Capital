import type { PortfolioLoadInput, PortfolioLoadNode, RedistributionAction } from './types'

export function generateRedistributionActions(input: PortfolioLoadInput, loadNodes: PortfolioLoadNode[]): RedistributionAction[] {
  const projectsByPriority = [...input.projects].sort((a, b) => a.priority - b.priority)
  const criticalProject = projectsByPriority[0]
  const lowPriorityProject = projectsByPriority[projectsByPriority.length - 1]
  const nodes = new Map(loadNodes.map((node) => [node.nodeType, node]))

  const actions: RedistributionAction[] = []

  if (criticalProject && lowPriorityProject && criticalProject.projectId !== lowPriorityProject.projectId) {
    actions.push({
      id: 'action-resource-reassignment',
      type: 'resource_reassignment',
      title: 'Reassign shared engineering capacity to critical path project',
      description: `Move one shared resource from ${lowPriorityProject.projectId} to ${criticalProject.projectId} for critical path stabilization.`,
      sourceProjects: [lowPriorityProject.projectId],
      targetProjects: [criticalProject.projectId],
      expectedLoadReduction: 9,
      projectedHealthGain: 8,
      implementationComplexity: 3,
    })
  }

  if ((nodes.get('timeline_distribution')?.utilizationPercent ?? 0) >= 70 && lowPriorityProject) {
    actions.push({
      id: 'action-timeline-shift',
      type: 'timeline_shift',
      title: 'Shift low-priority milestone window',
      description: `Shift a milestone from ${lowPriorityProject.projectId} to flatten delivery overlap and reduce cluster congestion.`,
      sourceProjects: [lowPriorityProject.projectId],
      targetProjects: [],
      expectedLoadReduction: 7,
      projectedHealthGain: 6,
      implementationComplexity: 2,
    })
  }

  actions.push({
    id: 'action-stakeholder-reallocation',
    type: 'stakeholder_reallocation',
    title: 'Resequence stakeholder approvals by priority lane',
    description: 'Allocate high-priority approvals to early governance windows and defer non-critical approvals to later slots.',
    sourceProjects: projectsByPriority.slice(1).map((p) => p.projectId),
    targetProjects: criticalProject ? [criticalProject.projectId] : [],
    expectedLoadReduction: 6,
    projectedHealthGain: 5,
    implementationComplexity: 2,
  })

  actions.push({
    id: 'action-escalation-reroute',
    type: 'escalation_reroute',
    title: 'Stagger escalation routing windows',
    description: 'Route escalations through alternating windows to prevent executive escalation collisions.',
    sourceProjects: input.projects.map((p) => p.projectId),
    targetProjects: [],
    expectedLoadReduction: 5,
    projectedHealthGain: 4,
    implementationComplexity: 2,
  })

  if ((nodes.get('dependency_pressure')?.utilizationPercent ?? 0) >= 60) {
    actions.push({
      id: 'action-dependency-resequence',
      type: 'dependency_resequence',
      title: 'Resequence dependency execution order',
      description: 'Front-load dependency unlocks for high-priority projects and defer non-blocking dependency chains.',
      sourceProjects: input.projects.map((p) => p.projectId),
      targetProjects: criticalProject ? [criticalProject.projectId] : [],
      expectedLoadReduction: 8,
      projectedHealthGain: 7,
      implementationComplexity: 4,
    })
  }

  actions.push({
    id: 'action-temporary-capacity',
    type: 'temporary_capacity_increase',
    title: 'Introduce temporary technical capacity buffer',
    description: 'Add temporary surge capacity for the highest technical demand window to reduce overload exposure.',
    sourceProjects: [],
    targetProjects: criticalProject ? [criticalProject.projectId] : [],
    expectedLoadReduction: 10,
    projectedHealthGain: 9,
    implementationComplexity: 5,
  })

  return actions.slice(0, 8)
}
