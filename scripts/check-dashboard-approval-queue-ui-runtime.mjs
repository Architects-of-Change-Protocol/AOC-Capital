import assert from 'node:assert/strict'
import { buildApprovalQueueCard, buildApprovalDecisionHistory, deriveApprovalActionAvailability, groupApprovalCardsByApproverLane, groupApprovalCardsBySeverity, buildApprovalQueueSummary, runDashboardApprovalQueueRuntime } from '../src/lib/dashboard/approval-queue-ui/index.ts'

const NOW='2026-05-26T12:00:00.000Z'
const lifecycle={id:'lc-1',envelopeId:'env-1',actionId:'act-1',adapter:'jira',status:'approval_pending',envelope:{id:'env-1',adapter:'jira',actionId:'act-1',payload:{adapter:'jira',title:'Ship',description:'',priority:'high',labels:[],dueHours:8,metadata:{}},mode:'ready',createdAt:NOW,executionStatus:'ready',warnings:[]},approvalDecisions:[],retryCount:0,createdAt:NOW,updatedAt:NOW}
const req={id:'req-1',envelopeId:'env-1',actionId:'act-1',adapter:'jira',actionTitle:'Ship',priority:'high',ownerLane:'project_manager',requestedAt:NOW,status:'pending',riskLevel:'high',requiredApproverLanes:['project_manager'],reasons:['need approval']}
const decisions=[{requestId:'req-1',decision:'approve',decidedBy:'alice',decidedAt:'2026-05-26T10:00:00.000Z'},{requestId:'req-1',decision:'reject',decidedBy:'bob',decidedAt:'2026-05-26T11:00:00.000Z'}]

const card=buildApprovalQueueCard({lifecycle,approvalRequest:req,decisions})
assert.equal(card.state,'action_required')
assert.equal(card.severity,'high')
assert.equal(deriveApprovalActionAvailability({approvalStatus:'pending',lifecycle}).canApprove,true)
assert.deepEqual(buildApprovalDecisionHistory(decisions).map(d=>d.decidedBy),['bob','alice'])
assert.equal(groupApprovalCardsBySeverity([card])[0].key,'high')
assert.equal(groupApprovalCardsByApproverLane([card])[0].key,'project_manager')
assert.equal(buildApprovalQueueSummary([card]).actionRequired,1)
assert.equal(runDashboardApprovalQueueRuntime({lifecycles:[lifecycle],approvalRequests:[req],approvalDecisions:decisions,now:NOW}).summary.totalCards,1)

console.log('[ok] dashboard approval queue ui runtime valid')
