import { adaptPortfolioHealthPanel } from './portfolio-health-adapter'
import { adaptExecutiveSummaryCard } from './executive-summary-adapter'
import { adaptRiskTable } from './risk-table-adapter'
import { adaptDecisionWidget } from './decision-widget-adapter'
import { adaptInterventionQueue } from './intervention-queue-adapter'
import { adaptAlertPanel } from './alert-panel-adapter'
import type { DashboardRuntimeInput, PortfolioExecutiveDashboardDTO } from './types'

export function buildPortfolioExecutiveDashboardDTO(
  input: DashboardRuntimeInput,
): PortfolioExecutiveDashboardDTO {
  const { executiveDashboardReport, interventionReport, decisionSimulationReports, conflictReport } =
    input

  return {
    portfolioHealthPanel: adaptPortfolioHealthPanel(executiveDashboardReport),
    executiveSummaryCard: adaptExecutiveSummaryCard(executiveDashboardReport),
    topRisksTable: adaptRiskTable(executiveDashboardReport),
    decisionsWidget: adaptDecisionWidget(decisionSimulationReports ?? []),
    interventionsQueue: adaptInterventionQueue(interventionReport),
    alertPanel: adaptAlertPanel(
      executiveDashboardReport,
      interventionReport,
      decisionSimulationReports,
      conflictReport,
    ),
  }
}
