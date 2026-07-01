import assert from 'node:assert/strict'
import auth from '../src/lib/dashboard/role-authorization/index.ts'
const { getRoleCapabilities, resolveActorCapabilities, inferSensitiveItemType, isActorInRequiredLane, canActorAccessSensitiveType, authorizeApprovalQueueCard, authorizeTaskLifecycle, buildDashboardRoleAuthorizationReport, runDashboardRoleAuthorization } = auth

const actor={id:'a1',roles:['pmo_director']}
const card={id:'c1',lifecycleId:'l1',envelopeId:'e1',actionTitle:'Finance budget review',adapter:'jira',severity:'high',state:'action_required',approvalStatus:'pending',approverLanes:['finance_lead'],lifecycleStatus:'approval_pending',retryCount:0,decisionHistory:[],actions:{canApprove:true,canReject:true,canRequestChanges:true}}
const lifecycle={id:'l1',envelopeId:'e1',actionId:'act1',adapter:'system_runtime',status:'ready_for_execution',envelope:{id:'e1',adapter:'system_runtime',actionId:'act1',payload:{adapter:'system_runtime',title:'system change',description:'',priority:'high',labels:[],dueHours:1,metadata:{}},mode:'ready',createdAt:'2026-05-26T00:00:00.000Z',executionStatus:'ready',warnings:[]},approvalRequest:{id:'r1',envelopeId:'e1',actionId:'act1',adapter:'system_runtime',actionTitle:'x',priority:'high',ownerLane:'project_manager',requestedAt:'2026-05-26T00:00:00.000Z',status:'pending',riskLevel:'high',requiredApproverLanes:['finance_lead'],reasons:[]},approvalDecisions:[],retryCount:2,createdAt:'2026-05-26T00:00:00.000Z',updatedAt:'2026-05-26T00:00:00.000Z'}

assert.ok(getRoleCapabilities('viewer').includes('view_queue_item'))
assert.ok(resolveActorCapabilities({id:'x',roles:['viewer','pmo_director']}).includes('override_approval'))
assert.equal(inferSensitiveItemType({card}),'financial')
assert.equal(isActorInRequiredLane({actor,requiredLanes:['technical_lead']}),true)
assert.equal(canActorAccessSensitiveType({actor,sensitiveType:'financial'}),true)
assert.equal(authorizeApprovalQueueCard({actor,card}).availability.canApprove,true)
assert.equal(authorizeTaskLifecycle({actor,lifecycle}).availability.canTriggerLiveExecution,true)
const report=buildDashboardRoleAuthorizationReport({actor,generatedAt:new Date().toISOString(),cardAuthorizations:[authorizeApprovalQueueCard({actor,card})],lifecycleAuthorizations:[authorizeTaskLifecycle({actor,lifecycle})]})
assert.equal(report.totalCards,1)
assert.equal(runDashboardRoleAuthorization({actor,cards:[card],lifecycles:[lifecycle]}).totalLifecycles,1)
console.log('[ok] dashboard role authorization runtime valid')
