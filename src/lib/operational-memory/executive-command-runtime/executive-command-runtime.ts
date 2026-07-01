import type { ExecutiveCommandContext } from "./executive-command-context";
import type { ExecutiveCommandResult } from "./executive-command-types";
import { buildExecutiveStabilizationPriorities } from "./executive-command-prioritization";
import { buildExecutiveInstabilityZones, buildExecutivePressureClusters } from "./executive-command-pressure";
import { buildExecutiveSurvivabilitySummary } from "./executive-command-survivability";
import { buildExecutiveEscalationSummary } from "./executive-command-escalation";
import { buildExecutivePortfolioHealth, buildExecutiveFragilitySignals } from "./executive-command-portfolio";
import { buildExecutiveCapacitySignal, buildExecutiveOperationalDrift } from "./executive-command-capacity";
import { buildExecutiveGovernanceRisks } from "./executive-command-fragility";
import { buildExecutiveOperationalFocus } from "./executive-command-focus";
import { buildExecutiveRecommendations } from "./executive-command-stabilization";
import { buildExecutiveWarRoomContext } from "./executive-command-warroom";
import { buildExecutiveNarratives } from "./executive-command-narratives";
import { buildExecutiveAlerts } from "./executive-command-alerting";
import { buildExecutiveDiagnostics } from "./executive-command-diagnostics";

export function buildExecutiveOperationalCommand(context: ExecutiveCommandContext): ExecutiveCommandResult { const pressureClusters = buildExecutivePressureClusters(context); const instabilityZones = buildExecutiveInstabilityZones(context, pressureClusters); const survivability = buildExecutiveSurvivabilitySummary(context, instabilityZones); const escalation = buildExecutiveEscalationSummary(context, pressureClusters); const portfolio = buildExecutivePortfolioHealth(context, instabilityZones, escalation); const fragilitySignals = buildExecutiveFragilitySignals(context, portfolio, instabilityZones); const capacity = buildExecutiveCapacitySignal(context, escalation, portfolio); const drift = buildExecutiveOperationalDrift(context, fragilitySignals); const governanceRisks = buildExecutiveGovernanceRisks(context, drift, escalation); const priorities = buildExecutiveStabilizationPriorities(context, survivability, escalation, portfolio, capacity); const focus = buildExecutiveOperationalFocus(context, priorities); const recommendations = buildExecutiveRecommendations(context, priorities, focus); const warRoom = buildExecutiveWarRoomContext(context, instabilityZones, escalation, survivability, recommendations, priorities); const narratives = buildExecutiveNarratives(context, instabilityZones, escalation, survivability, focus); const alerts = buildExecutiveAlerts(context, priorities, survivability, escalation); const diagnostics = buildExecutiveDiagnostics(context, priorities, survivability, escalation, instabilityZones, focus, drift, portfolio); return { priorities, pressureClusters, instabilityZones, survivability, escalation, portfolio, fragilitySignals, capacity, drift, governanceRisks, focus, recommendations, warRoom, narratives, alerts, diagnostics }; }
