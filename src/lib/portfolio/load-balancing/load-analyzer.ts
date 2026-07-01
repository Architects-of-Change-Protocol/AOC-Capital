import type { LoadPressureLevel, PortfolioLoadInput, PortfolioLoadNode } from './types'

function toPressureLevel(utilizationPercent: number): LoadPressureLevel {
  if (utilizationPercent >= 90) return 'critical'
  if (utilizationPercent >= 75) return 'strained'
  if (utilizationPercent >= 60) return 'elevated'
  return 'stable'
}

function createNode(nodeType: PortfolioLoadNode['nodeType'], currentLoad: number, maxCapacity: number): PortfolioLoadNode {
  const utilizationPercent = Math.max(0, Math.min(100, Math.round((currentLoad / Math.max(1, maxCapacity)) * 100)))
  return {
    nodeId: nodeType,
    nodeType,
    currentLoad,
    maxCapacity,
    utilizationPercent,
    pressureLevel: toPressureLevel(utilizationPercent),
  }
}

export function analyzePortfolioLoad(input: PortfolioLoadInput): PortfolioLoadNode[] {
  const projects = input.projects
  const count = Math.max(1, projects.length)

  const resourcePool = new Set(projects.flatMap((project) => project.resourceAssignments))
  const totalResourceDemand = projects.reduce((sum, project) => sum + project.resourceAssignments.length, 0)
  const resourceCapacity = Math.max(1, resourcePool.size * 2)

  const technicalLoad = projects.reduce((sum, project) => sum + project.technicalDemand, 0)
  const technicalCapacity = count * 55

  const timelineLoad = projects.reduce((sum, project) => sum + project.timelineWeight, 0)
  const timelineCapacity = count * 10

  const stakeholderLoad = projects.reduce((sum, project) => sum + project.stakeholderDemand, 0)
  const stakeholderCapacity = count * 25

  const budgetLoad = projects.reduce((sum, project) => sum + project.budgetDemand, 0)
  const budgetCapacity = count * 100

  const dependencyLoad = projects.reduce((sum, project) => sum + (project.dependencies?.length ?? 0), 0) * 12
  const dependencyCapacity = count * 30

  const escalationLoad = projects.reduce((sum, project) => sum + project.escalationDemand, 0)
  const escalationCapacity = count * 20

  return [
    createNode('resource_capacity', totalResourceDemand, resourceCapacity),
    createNode('technical_bandwidth', technicalLoad, technicalCapacity),
    createNode('timeline_distribution', timelineLoad, timelineCapacity),
    createNode('stakeholder_load', stakeholderLoad, stakeholderCapacity),
    createNode('budget_distribution', budgetLoad, budgetCapacity),
    createNode('dependency_pressure', dependencyLoad, dependencyCapacity),
    createNode('escalation_load', escalationLoad, escalationCapacity),
  ]
}
