import assert from 'node:assert/strict'
import { createPersistentLifecycleStore, getPersistentLifecycleStoreHealth } from '../src/lib/dashboard/persistent-lifecycle-store/lifecycle-store-factory.ts'
import { hydratePersistentLifecycleState } from '../src/lib/dashboard/persistent-lifecycle-store/lifecycle-hydration-engine.ts'
import { replayLifecycleEventStream } from '../src/lib/dashboard/persistent-lifecycle-store/lifecycle-replay-engine.ts'
import { reconcilePersistentLifecycleState } from '../src/lib/dashboard/persistent-lifecycle-store/lifecycle-reconciliation-engine.ts'
import { runPersistentLifecycleStoreRuntime } from '../src/lib/dashboard/persistent-lifecycle-store/persistent-lifecycle-store-runtime.ts'
import { mapLifecycleToPersistentRecord } from '../src/lib/dashboard/persistent-lifecycle-store/lifecycle-record-mapper.ts'
import { mapEventToPersistentRecord } from '../src/lib/dashboard/persistent-lifecycle-store/lifecycle-event-mapper.ts'

const NOW='2026-05-26T12:00:00.000Z'
const lifecycle={id:'l1',envelopeId:'e1',actionId:'a1',adapter:'jira',status:'created',envelope:{id:'e1'},approvalDecisions:[],retryCount:0,createdAt:NOW,updatedAt:NOW}
const event={id:'ev1',lifecycleId:'l1',eventType:'execution_completed',occurredAt:NOW,message:'done',metadata:{}}
const fake={from(){return {eq(){return this},is(){return this},order(){return this},select(){return this},maybeSingle:async()=>({data:null}),then(r){return Promise.resolve({data:[]}).then(r)},upsert:async()=>({}),insert:async()=>({})}},rpc(){}}
assert.equal(mapLifecycleToPersistentRecord({tenantId:'t',lifecycle}).lifecycle_id,'l1')
assert.equal(mapEventToPersistentRecord({tenantId:'t',event}).event_id,'ev1')
const store=createPersistentLifecycleStore({config:{provider:'supabase',tenantId:'t'},supabaseClient:fake})
await store.saveLifecycle(lifecycle)
await store.saveEvent(event)
const hydrated=await hydratePersistentLifecycleState(store)
const replayed=replayLifecycleEventStream({lifecycles:hydrated.records,events:hydrated.events})
reconcilePersistentLifecycleState({hydrated:hydrated.records,replayed:replayed.reconstructed})
await runPersistentLifecycleStoreRuntime({store,supabaseClient:fake,now:NOW})
assert.equal(getPersistentLifecycleStoreHealth({config:{provider:'supabase',tenantId:'t'},supabaseClient:fake}).healthy,true)
console.log('[ok] dashboard persistent lifecycle store runtime valid')
