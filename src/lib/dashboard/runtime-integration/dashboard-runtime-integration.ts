import { adaptPortfolioHealthPanel } from './portfolio-health-adapter'
import { adaptExecutiveSummaryCard } from './executive-summary-adapter'
import { adaptRiskTable } from './risk-table-adapter'
import { adaptDecisionWidget } from './decision-widget-adapter'
import { adaptInterventionQueue } from './intervention-queue-adapter'
import { adaptAlertPanel } from './alert-panel-adapter'
import type { DashboardRuntimeInput, PortfolioExecutiveDashboardDTO } from './types'

export function runDashboardRuntimeIntegration(
  input: DashboardRuntimeInput,
): PortfolioExecutiveDashboardDTO {
  const { executiveDashboardReport, interventionReport, decisionSimulationReports, conflictReport } =
    input

  const portfolioHealthPanel = adaptPortfolioHealthPanel(executiveDashboardReport)
  const executiveSummaryCard = adaptExecutiveSummaryCard(executiveDashboardReport)
  const topRisksTable = adaptRiskTable(executiveDashboardReport)
  const decisionsWidget = adaptDecisionWidget(decisionSimulationReports ?? [])
  const interventionsQueue = adaptInterventionQueue(interventionReport)
  const alertPanel = adaptAlertPanel(
    executiveDashboardReport,
    interventionReport,
    decisionSimulationReports,
    conflictReport,
  )

  return {
    portfolioHealthPanel,
    executiveSummaryCard,
    topRisksTable,
    decisionsWidget,
    interventionsQueue,
    alertPanel,
  }
}
