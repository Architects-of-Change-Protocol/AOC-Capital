import type { DashboardAuthorizationActor, DashboardRoleAuthorizationReport } from './types'

export function buildDashboardRoleAuthorizationReport ({ actor, generatedAt, cardAuthorizations, lifecycleAuthorizations }: { actor: DashboardAuthorizationActor; generatedAt: string; cardAuthorizations: DashboardRoleAuthorizationReport['cardAuthorizations']; lifecycleAuthorizations: DashboardRoleAuthorizationReport['lifecycleAuthorizations'] }): DashboardRoleAuthorizationReport {
  const totalCards = cardAuthorizations.length
  const visibleCards = cardAuthorizations.filter(card => card.availability.canView).length
  const restrictedCards = totalCards - visibleCards
  const totalLifecycles = lifecycleAuthorizations.length
  const executableLifecycles = lifecycleAuthorizations.filter(lifecycle => lifecycle.availability.canTriggerLiveExecution).length
  const retryableLifecycles = lifecycleAuthorizations.filter(lifecycle => lifecycle.availability.canRetryExecution).length
  const summary = []
  if (restrictedCards > 0) summary.push(`PMFreak restricted ${restrictedCards} approval queue item(s) for actor ${actor.id}.`)
  if (executableLifecycles > 0) summary.push(`Actor ${actor.id} can execute ${executableLifecycles} lifecycle record(s).`)
  if (retryableLifecycles > 0) summary.push(`Actor ${actor.id} can retry ${retryableLifecycles} failed lifecycle record(s).`)
  if (summary.length === 0) summary.push(`Actor ${actor.id} has dashboard authorization context with no execution capabilities available.`)
  return { actorId: actor.id, generatedAt, totalCards, visibleCards, restrictedCards, totalLifecycles, executableLifecycles, retryableLifecycles, cardAuthorizations, lifecycleAuthorizations, executiveSummary: summary.join(' ') }
}
