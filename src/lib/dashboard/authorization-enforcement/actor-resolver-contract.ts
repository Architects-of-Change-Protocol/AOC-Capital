import type { DashboardAuthorizationActor } from '../role-authorization/index'
import type { DashboardActorResolver, DashboardActorResolverInput } from './types'

export function createStaticDashboardActorResolver (actor: DashboardAuthorizationActor | null): DashboardActorResolver {
  return async () => actor
}

function isValidResolvedActor (actor: DashboardAuthorizationActor | null): actor is DashboardAuthorizationActor {
  return !!actor && typeof actor.id === 'string' && actor.id.length > 0 && Array.isArray(actor.roles) && actor.roles.length > 0
}

export async function resolveDashboardActor ({ resolver, input }: { resolver?: DashboardActorResolver; input?: DashboardActorResolverInput }): Promise<DashboardAuthorizationActor | null> {
  if (!resolver) return null
  try {
    const actor = await resolver(input ?? {})
    return isValidResolvedActor(actor) ? actor : null
  } catch {
    return null
  }
}
