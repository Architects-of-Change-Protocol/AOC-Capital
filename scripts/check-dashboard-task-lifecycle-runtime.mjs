import assert from 'node:assert/strict'
import { createInMemoryDashboardTaskLifecycleStore } from '../src/lib/dashboard/task-lifecycle/lifecycle-store.ts'
import { createLifecycleRecordFromEnvelope, mergeApprovalIntoLifecycle } from '../src/lib/dashboard/task-lifecycle/lifecycle-record-mapper.ts'
import { deriveExecutionReadinessTransition, deriveLifecycleTransitionFromApproval } from '../src/lib/dashboard/task-lifecycle/lifecycle-transition-engine.ts'
import { buildEventFromTransition } from '../src/lib/dashboard/task-lifecycle/lifecycle-audit-engine.ts'
import { runDashboardTaskLifecyclePersistence } from '../src/lib/dashboard/task-lifecycle/task-lifecycle-runtime.ts'
import { buildDashboardTaskLifecycleReport } from '../src/lib/dashboard/task-lifecycle/lifecycle-report-builder.ts'
const now='2026-05-26T12:00:00.000Z'; const env={id:'env',adapter:'jira',actionId:'a',payload:{adapter:'jira',title:'x',description:'',priority:'high',labels:[],dueHours:1,metadata:{}},mode:'ready',createdAt:now,executionStatus:'ready',warnings:[]}
const store=createInMemoryDashboardTaskLifecycleStore(); const lifecycle=createLifecycleRecordFromEnvelope({envelope:env,now}); await store.saveLifecycle(lifecycle); assert.equal((await store.getLifecycle(lifecycle.id))?.id,lifecycle.id)
const request={id:'approval:env',envelopeId:'env',actionId:'a',adapter:'jira',actionTitle:'x',priority:'medium',ownerLane:'project_manager',requestedAt:now,status:'approved',riskLevel:'medium',requiredApproverLanes:[],reasons:[]}
const merged=mergeApprovalIntoLifecycle({lifecycle,approvalRequest:request,now}); assert.equal(merged.status,'approved')
const a=deriveLifecycleTransitionFromApproval({lifecycle:createLifecycleRecordFromEnvelope({envelope:env,now}),approvalRequest:request}); assert.ok(a)
const e=buildEventFromTransition({transition:a,now}); assert.equal(e.eventType,'approval_approved')
const x=deriveExecutionReadinessTransition({lifecycle:merged,approvalWorkflowReport:{generatedAt:now,totalEnvelopes:1,approvalRequiredCount:1,pendingCount:0,approvedCount:1,rejectedCount:0,blockedCount:0,requests:[request],decisions:[],executableEnvelopeIds:['env'],blockedEnvelopeIds:[],warnings:[],executiveSummary:''}}); assert.equal(x?.eventType,'execution_ready')
const runtime=await runDashboardTaskLifecyclePersistence({manualPushReport:{mode:'ready',generatedAt:now,totalProjections:1,eligibleCount:1,ineligibleCount:0,envelopeCount:1,simulatedCount:0,skippedCount:0,envelopes:[env],simulations:[],warnings:[],executiveSummary:''},approvalWorkflowReport:{generatedAt:now,totalEnvelopes:1,approvalRequiredCount:1,pendingCount:0,approvedCount:1,rejectedCount:0,blockedCount:0,requests:[request],decisions:[],executableEnvelopeIds:['env'],blockedEnvelopeIds:[],warnings:[],executiveSummary:''},store,now}); assert.equal(runtime.totalLifecycles,1)
assert.equal(buildDashboardTaskLifecycleReport({generatedAt:now,lifecycles:runtime.lifecycles,events:runtime.events}).totalLifecycles,1)
console.log('[ok] dashboard task lifecycle runtime valid')
