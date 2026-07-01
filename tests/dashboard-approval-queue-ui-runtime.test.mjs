import test from 'node:test'; import assert from 'node:assert/strict'
import { buildApprovalQueueCard, buildApprovalDecisionHistory, deriveApprovalActionAvailability, groupApprovalCardsByApproverLane, groupApprovalCardsBySeverity, buildApprovalQueueSummary, runDashboardApprovalQueueRuntime } from '../src/lib/dashboard/approval-queue-ui/index.ts'

const NOW='2026-05-26T12:00:00.000Z'
const mkReq=(status,risk='medium',lanes=['project_manager'])=>({id:`req-${status}-${risk}`,envelopeId:'env-1',actionId:'act-1',adapter:'jira',actionTitle:'Ship release',priority:'high',ownerLane:'project_manager',requestedAt:NOW,status,riskLevel:risk,requiredApproverLanes:lanes,reasons:['Awaiting governance sign-off']})
const mkLifecycle=(status,retryCount=0)=>({id:`lc-${status}-${retryCount}`,envelopeId:'env-1',actionId:'act-1',adapter:'jira',status,envelope:{id:'env-1',adapter:'jira',actionId:'act-1',payload:{adapter:'jira',title:'Ship release',description:'',priority:'high',labels:[],dueHours:24,metadata:{}},mode:'ready',createdAt:NOW,executionStatus:'ready',warnings:[]},approvalDecisions:[],retryCount,createdAt:NOW,updatedAt:NOW})

const d1={requestId:'req-1',decision:'approve',decidedBy:'a',decidedAt:'2026-05-26T10:00:00.000Z'}
const d2={requestId:'req-1',decision:'reject',decidedBy:'b',decidedAt:'2026-05-26T11:00:00.000Z'}

test('1 Card builds action_required',()=>assert.equal(buildApprovalQueueCard({lifecycle:mkLifecycle('approval_pending'),approvalRequest:mkReq('pending')}).state,'action_required'))
test('2 Card builds blocked',()=>assert.equal(buildApprovalQueueCard({lifecycle:mkLifecycle('execution_blocked'),approvalRequest:mkReq('blocked')}).state,'blocked'))
test('3 Card builds approved',()=>assert.equal(buildApprovalQueueCard({lifecycle:mkLifecycle('approved'),approvalRequest:mkReq('approved')}).state,'approved'))
test('4 Card builds rejected',()=>assert.equal(buildApprovalQueueCard({lifecycle:mkLifecycle('rejected'),approvalRequest:mkReq('rejected')}).state,'rejected'))
test('5 Card builds expired',()=>assert.equal(buildApprovalQueueCard({lifecycle:mkLifecycle('expired'),approvalRequest:mkReq('expired')}).state,'expired'))
test('6 Card builds completed',()=>assert.equal(buildApprovalQueueCard({lifecycle:mkLifecycle('execution_completed'),approvalRequest:mkReq('approved')}).state,'completed'))
test('7 Card builds retry_attention',()=>assert.equal(buildApprovalQueueCard({lifecycle:mkLifecycle('execution_failed',1),approvalRequest:mkReq('approved')}).state,'retry_attention'))
test('8 Critical severity mapping',()=>assert.equal(buildApprovalQueueCard({lifecycle:mkLifecycle('approved'),approvalRequest:mkReq('approved','critical')}).severity,'critical'))
test('9 Decision history newest first',()=>assert.deepEqual(buildApprovalDecisionHistory([d1,d2]).map(x=>x.decidedBy),['b','a']))
test('10 Pending enables all actions',()=>assert.deepEqual(deriveApprovalActionAvailability({approvalStatus:'pending',lifecycle:mkLifecycle('approval_pending')}),{canApprove:true,canReject:true,canRequestChanges:true}))
test('11 Approved disables actions',()=>assert.equal(deriveApprovalActionAvailability({approvalStatus:'approved',lifecycle:mkLifecycle('approved')}).canApprove,false))
test('12 Rejected enables re-approval',()=>{const a=deriveApprovalActionAvailability({approvalStatus:'rejected',lifecycle:mkLifecycle('rejected')});assert.equal(a.canApprove,true);assert.equal(a.canReject,false)})
test('13 Completed disables all',()=>assert.equal(deriveApprovalActionAvailability({approvalStatus:'approved',lifecycle:mkLifecycle('execution_completed')}).canReject,false))
test('14 Severity grouping order',()=>assert.deepEqual(groupApprovalCardsBySeverity([{...buildApprovalQueueCard({lifecycle:mkLifecycle('execution_completed'),approvalRequest:mkReq('approved')}),severity:'low'},{...buildApprovalQueueCard({lifecycle:mkLifecycle('approval_pending'),approvalRequest:mkReq('pending')}),severity:'high'}]).map(g=>g.key),['high','low']))
test('15 Approver grouping order',()=>{const cards=[buildApprovalQueueCard({lifecycle:mkLifecycle('approval_pending'),approvalRequest:mkReq('pending','medium',['technical_lead'])}),buildApprovalQueueCard({lifecycle:mkLifecycle('approval_pending'),approvalRequest:mkReq('pending','medium',['pmo_director'])})];assert.deepEqual(groupApprovalCardsByApproverLane(cards).map(g=>g.key),['pmo_director','technical_lead'])})
test('16 Summary action required count',()=>assert.equal(buildApprovalQueueSummary([buildApprovalQueueCard({lifecycle:mkLifecycle('approval_pending'),approvalRequest:mkReq('pending')})]).actionRequired,1))
test('17 Summary retry attention count',()=>assert.equal(buildApprovalQueueSummary([buildApprovalQueueCard({lifecycle:mkLifecycle('execution_failed',2),approvalRequest:mkReq('approved')})]).retryAttention,1))
test('18 Summary completed state',()=>assert.equal(buildApprovalQueueSummary([buildApprovalQueueCard({lifecycle:mkLifecycle('execution_completed'),approvalRequest:mkReq('approved')})]).executiveSummary,'All approval queue items have completed execution.'))
test('19 Runtime builds cards',()=>assert.equal(runDashboardApprovalQueueRuntime({lifecycles:[mkLifecycle('approval_pending')],approvalRequests:[mkReq('pending')],now:NOW}).summary.totalCards,1))
test('20 Runtime builds severity groups',()=>assert.equal(runDashboardApprovalQueueRuntime({lifecycles:[mkLifecycle('approval_pending')],approvalRequests:[mkReq('pending')],now:NOW}).groupsBySeverity[0].key,'high'))
test('21 Runtime builds approver groups',()=>assert.equal(runDashboardApprovalQueueRuntime({lifecycles:[mkLifecycle('approval_pending')],approvalRequests:[mkReq('pending','medium',['security_owner'])],now:NOW}).groupsByApproverLane[0].key,'security_owner'))
test('22 Runtime summary deterministic',()=>assert.equal(runDashboardApprovalQueueRuntime({lifecycles:[mkLifecycle('approval_pending')],approvalRequests:[mkReq('pending')],now:NOW}).summary.executiveSummary,'PMFreak requires approval action on 1 queue item(s).'))
test('23 Missing approval request handled safely',()=>assert.equal(runDashboardApprovalQueueRuntime({lifecycles:[mkLifecycle('execution_blocked')],now:NOW}).summary.blocked,1))
test('24 Empty queue handled safely',()=>assert.equal(runDashboardApprovalQueueRuntime({lifecycles:[],now:NOW}).summary.totalCards,0))
test('25 Runtime deterministic ordering',()=>{const a={...mkLifecycle('execution_completed'),id:'a',envelopeId:'a',envelope:{...mkLifecycle('execution_completed').envelope,id:'a'}};const b={...mkLifecycle('approval_pending'),id:'b',envelopeId:'b',envelope:{...mkLifecycle('approval_pending').envelope,id:'b'}};const r=runDashboardApprovalQueueRuntime({lifecycles:[a,b],approvalRequests:[{...mkReq('approved'),envelopeId:'a'},{...mkReq('pending'),envelopeId:'b'}],now:NOW});assert.equal(r.summary.totalCards,2);assert.equal(r.groupsBySeverity[0].cards[0].lifecycleId,'b')})
