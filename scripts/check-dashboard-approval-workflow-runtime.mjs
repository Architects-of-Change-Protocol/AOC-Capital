import assert from 'node:assert/strict'

import { evaluateDashboardApprovalPolicy, resolveDashboardApprovalPolicy } from '../src/lib/dashboard/approval-workflow/approval-policy-engine.ts'
import { routeDashboardApprovalApprovers } from '../src/lib/dashboard/approval-workflow/approver-routing-engine.ts'
import { buildDashboardApprovalRequest } from '../src/lib/dashboard/approval-workflow/approval-request-builder.ts'
import { applyDashboardApprovalDecision } from '../src/lib/dashboard/approval-workflow/approval-decision-engine.ts'
import { deriveDashboardEnvelopeExecutionGate } from '../src/lib/dashboard/approval-workflow/approval-state-machine.ts'
import { runDashboardApprovalWorkflow } from '../src/lib/dashboard/approval-workflow/approval-workflow-runtime.ts'

const now = '2026-05-26T12:00:00.000Z'
const action = { id:'a1', type:'review_financial_exposure', title:'Finance review', description:'', priority:'critical', status:'proposed', ownerLane:'finance_lead', executionLane:'financial_governance', affectedProjects:[], source:'x', sla:{responseDueHours:1,resolutionDueHours:1,cadence:'d'}, escalationRoute:{required:true}, evidenceRequired:[], rationale:'' }
const envelope = { id:'e1', adapter:'jira', actionId:'a1', payload:{adapter:'jira', title:'Push', description:'', priority:'high', labels:[], dueHours:24, metadata:{}}, mode:'ready', requestedBy:'u', createdAt:now, executionStatus:'ready', warnings:[] }

const policy = resolveDashboardApprovalPolicy({ approvalExpiryHours: 0 })
assert.equal(policy.approvalExpiryHours, 1)

const evalReadyExternal = evaluateDashboardApprovalPolicy({ envelope, action, policy })
assert.equal(evalReadyExternal.approvalRequired, true)

const evalDry = evaluateDashboardApprovalPolicy({ envelope: { ...envelope, id:'e2', mode: 'dry_run' }, action, policy })
assert.equal(evalDry.approvalRequired, false)

const lanes = routeDashboardApprovalApprovers({ envelope, action, evaluation: evalReadyExternal })
assert.ok(lanes.includes('finance_lead'))

const req = buildDashboardApprovalRequest({ envelope, action, evaluation: { ...evalReadyExternal, requiredApproverLanes: lanes }, policy, now })
assert.equal(req.status, 'pending')

const approved = applyDashboardApprovalDecision({ request: req, decision: { requestId: req.id, decision: 'approve', decidedBy:'x', decidedAt: now }, now })
assert.equal(deriveDashboardEnvelopeExecutionGate(approved).executable, true)

const rejected = applyDashboardApprovalDecision({ request: req, decision: { requestId: req.id, decision: 'reject', decidedBy:'x', decidedAt: now }, now })
assert.equal(deriveDashboardEnvelopeExecutionGate(rejected).blocked, true)

const expired = applyDashboardApprovalDecision({ request: { ...req, expiresAt: '2026-05-25T00:00:00.000Z' }, now })
assert.equal(expired.status, 'expired')

const report = runDashboardApprovalWorkflow({ envelopes:[envelope], actions:[action], now })
assert.equal(report.totalEnvelopes, 1)
assert.equal(report.blockedCount, 1)

console.log('[ok] dashboard approval workflow runtime valid')
