import assert from 'node:assert/strict'
import { createInMemoryDashboardTaskLifecycleStore } from '../src/lib/dashboard/task-lifecycle/lifecycle-store.ts'
import { createLifecycleRecordFromEnvelope } from '../src/lib/dashboard/task-lifecycle/lifecycle-record-mapper.ts'
import { createStaticLiveConnector } from '../src/lib/dashboard/live-adapter-connectors/connector-registry.ts'
import { validateLiveConnector } from '../src/lib/dashboard/live-adapter-connectors/connector-validator.ts'
import { selectExecutableLifecycles } from '../src/lib/dashboard/live-adapter-connectors/execution-selector.ts'
import { resolveExecutionPayload } from '../src/lib/dashboard/live-adapter-connectors/execution-payload-resolver.ts'
import { executeLifecycleThroughConnector } from '../src/lib/dashboard/live-adapter-connectors/connector-execution-engine.ts'
import { applyLiveExecutionResultToLifecycle, buildDashboardLiveExecutionReport } from '../src/lib/dashboard/live-adapter-connectors/execution-result-engine.ts'
import { runDashboardLiveAdapterConnectorRuntime } from '../src/lib/dashboard/live-adapter-connectors/live-adapter-connector-runtime.ts'

const now='2026-05-26T12:00:00.000Z'; const env={id:'env',adapter:'jira',actionId:'a',payload:{adapter:'jira',title:'x',description:'y',priority:'high',metadata:{}},mode:'ready',createdAt:now,executionStatus:'ready',warnings:[]}
const lifecycle={...createLifecycleRecordFromEnvelope({envelope:env,now}),status:'ready_for_execution'}
const staticConnector=createStaticLiveConnector({adapter:'jira'})
assert.equal((await staticConnector.execute({payload:env.payload,lifecycle,mode:'dry_run',now})).status,'simulated')
assert.equal((await staticConnector.execute({payload:env.payload,lifecycle,mode:'execute',now})).status,'created')
assert.equal(validateLiveConnector({adapter:'jira',connector:staticConnector}).valid,true)
assert.equal(selectExecutableLifecycles({lifecycles:[lifecycle]}).selected.length,1)
assert.equal(resolveExecutionPayload(lifecycle).valid,true)
assert.equal((await executeLifecycleThroughConnector({lifecycle,connector:staticConnector,mode:'execute',now})).status,'executed')
assert.equal((await executeLifecycleThroughConnector({lifecycle,mode:'execute',now})).status,'skipped')
const store=createInMemoryDashboardTaskLifecycleStore(); await store.saveLifecycle(lifecycle)
const applied=await applyLiveExecutionResultToLifecycle({lifecycle,result:{lifecycleId:lifecycle.id,envelopeId:lifecycle.envelopeId,adapter:lifecycle.adapter,status:'executed',message:'ok',retryable:false},store,now}); assert.equal(applied.lifecycle.status,'execution_completed')
assert.equal(buildDashboardLiveExecutionReport({generatedAt:now,mode:'execute',results:[{lifecycleId:'1',envelopeId:'1',adapter:'jira',status:'executed',message:'ok',retryable:false}],events:[]}).executed,1)
const runStore=createInMemoryDashboardTaskLifecycleStore(); await runStore.saveLifecycle(lifecycle)
const runtime=await runDashboardLiveAdapterConnectorRuntime({store:runStore,connectors:{jira:staticConnector},mode:'execute',now}); assert.equal(runtime.executed,1)
console.log('[ok] dashboard live adapter connector runtime valid')
