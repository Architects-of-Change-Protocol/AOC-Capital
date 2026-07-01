import type { DashboardTaskLifecycleEvent, DashboardTaskLifecycleRecord, DashboardTaskLifecycleStore } from './types'

export function createInMemoryDashboardTaskLifecycleStore(): DashboardTaskLifecycleStore {
  const lifecycleById = new Map<string, DashboardTaskLifecycleRecord>()
  const eventById = new Map<string, DashboardTaskLifecycleEvent>()

  return {
    async saveLifecycle(record) {
      lifecycleById.set(record.id, { ...record, envelope: { ...record.envelope }, approvalDecisions: [...record.approvalDecisions] })
    },
    async getLifecycle(id) {
      const record = lifecycleById.get(id)
      return record ? { ...record, envelope: { ...record.envelope }, approvalDecisions: [...record.approvalDecisions] } : null
    },
    async getLifecycleByEnvelopeId(envelopeId) {
      for (const record of lifecycleById.values()) {
        if (record.envelopeId === envelopeId) return { ...record, envelope: { ...record.envelope }, approvalDecisions: [...record.approvalDecisions] }
      }
      return null
    },
    async listLifecycles() {
      return [...lifecycleById.values()]
        .map((record) => ({ ...record, envelope: { ...record.envelope }, approvalDecisions: [...record.approvalDecisions] }))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id))
    },
    async saveEvent(event) {
      eventById.set(event.id, { ...event, metadata: { ...event.metadata } })
    },
    async listEvents(lifecycleId) {
      return [...eventById.values()]
        .filter((event) => (lifecycleId ? event.lifecycleId === lifecycleId : true))
        .map((event) => ({ ...event, metadata: { ...event.metadata } }))
        .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime() || a.id.localeCompare(b.id))
    },
  }
}
