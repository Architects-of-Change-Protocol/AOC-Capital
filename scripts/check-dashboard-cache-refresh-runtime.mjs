import assert from 'node:assert/strict'
import { createInMemoryDashboardSnapshotStore } from '../src/lib/dashboard/source-hydration/snapshot-store.ts'
import { DEFAULT_DASHBOARD_CACHE_POLICY } from '../src/lib/dashboard/cache-refresh/types.ts'
import { resolveDashboardCachePolicy, isRefreshIntervalElapsed } from '../src/lib/dashboard/cache-refresh/cache-policy-engine.ts'
import { evaluateDashboardCacheStatus, isDashboardCacheUsable } from '../src/lib/dashboard/cache-refresh/cache-health-engine.ts'
import { buildDashboardRefreshPlan } from '../src/lib/dashboard/cache-refresh/refresh-planner.ts'
import { buildDashboardCacheMetadata } from '../src/lib/dashboard/cache-refresh/cache-metadata-engine.ts'
import { runDashboardCacheRefresh } from '../src/lib/dashboard/cache-refresh/cache-refresh-runtime.ts'

const store=createInMemoryDashboardSnapshotStore()
await store.saveSnapshot({id:'seed',tenantId:'tenant-1',sourceKind:'executive_dashboard_report',payload:{},generatedAt:new Date(Date.now()-50*60000).toISOString(),schemaVersion:'1',runtimeVersion:'1'})
const policy=resolveDashboardCachePolicy({maxAgeMinutes:1,softRefreshMinutes:0,hardRefreshMinutes:2}); assert.equal(policy.maxAgeMinutes,5)
const hydration={sourceData:{executiveDashboardReport:{}},snapshots:[],freshness:[{sourceKind:'executive_dashboard_report',status:'stale',ageMinutes:50,freshnessScore:40,reason:'older than max age'}],completeness:{requiredSourcesPresent:true,presentSources:['executive_dashboard_report'],missingSources:[],invalidSources:[],completenessScore:100},riskLevel:'low',warnings:[]}
const status=evaluateDashboardCacheStatus({hydration,policy:DEFAULT_DASHBOARD_CACHE_POLICY}); assert.equal(status,'refresh_recommended'); assert.equal(isDashboardCacheUsable(status),true)
assert.equal(isRefreshIntervalElapsed({freshness:hydration.freshness,policy:DEFAULT_DASHBOARD_CACHE_POLICY}),true)
const plan=buildDashboardRefreshPlan({hydration,cacheStatus:status,policy:DEFAULT_DASHBOARD_CACHE_POLICY,intervalElapsed:true}); assert.equal(plan.actions.length>=1,true)
const metadata=buildDashboardCacheMetadata({hydration,cacheStatus:status,refreshPlan:plan,policy:DEFAULT_DASHBOARD_CACHE_POLICY}); assert.equal(typeof metadata.generatedAt,'string')
const runtimeResult=await runDashboardCacheRefresh({request:{tenantId:'tenant-1'},store}); assert.equal(!!runtimeResult.metadata,true)
console.log('[ok] dashboard cache refresh runtime valid')
