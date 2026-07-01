import test from 'node:test'; import assert from 'node:assert/strict'
import { createInMemoryDashboardSnapshotStore } from '../src/lib/dashboard/source-hydration/snapshot-store.ts'
import { DEFAULT_DASHBOARD_CACHE_POLICY } from '../src/lib/dashboard/cache-refresh/types.ts'
import { resolveDashboardCachePolicy, isRefreshIntervalElapsed } from '../src/lib/dashboard/cache-refresh/cache-policy-engine.ts'
import { evaluateDashboardCacheStatus, isDashboardCacheUsable } from '../src/lib/dashboard/cache-refresh/cache-health-engine.ts'
import { buildDashboardRefreshPlan } from '../src/lib/dashboard/cache-refresh/refresh-planner.ts'
import { assignDashboardRefreshPriority, prioritizeDashboardRefreshActions } from '../src/lib/dashboard/cache-refresh/refresh-priority-engine.ts'
import { buildDashboardCacheMetadata } from '../src/lib/dashboard/cache-refresh/cache-metadata-engine.ts'
import { runDashboardCacheRefresh } from '../src/lib/dashboard/cache-refresh/cache-refresh-runtime.ts'
const base={tenantId:'t1'}; const past=(m)=>new Date(Date.now()-m*60000).toISOString();
const hydBase={sourceData:{executiveDashboardReport:{}},snapshots:[],freshness:[],completeness:{requiredSourcesPresent:true,presentSources:['executive_dashboard_report'],missingSources:[],invalidSources:[],completenessScore:100},riskLevel:'low',warnings:[]}
for (const [i,name,fn] of Object.entries({
1:['default',()=>assert.deepEqual(resolveDashboardCachePolicy(),DEFAULT_DASHBOARD_CACHE_POLICY)],
2:['clamp',()=>assert.equal(resolveDashboardCachePolicy({maxAgeMinutes:1}).maxAgeMinutes,5)],
3:['interval',()=>assert.equal(isRefreshIntervalElapsed({freshness:[{sourceKind:'executive_dashboard_report',status:'fresh',ageMinutes:50,freshnessScore:1,reason:'x'}],policy:DEFAULT_DASHBOARD_CACHE_POLICY}),true)],
4:['usable',()=>assert.equal(evaluateDashboardCacheStatus({hydration:hydBase,policy:DEFAULT_DASHBOARD_CACHE_POLICY}),'usable')],
5:['warn',()=>assert.equal(evaluateDashboardCacheStatus({hydration:{...hydBase,warnings:['w']},policy:DEFAULT_DASHBOARD_CACHE_POLICY}),'usable_with_warnings')],
6:['req',()=>assert.equal(evaluateDashboardCacheStatus({hydration:{...hydBase,sourceData:{},completeness:{...hydBase.completeness,requiredSourcesPresent:false}},policy:{...DEFAULT_DASHBOARD_CACHE_POLICY,requireExecutiveDashboardReport:false}}),'refresh_required')],
7:['unavail',()=>assert.equal(evaluateDashboardCacheStatus({hydration:{...hydBase,sourceData:{}},policy:DEFAULT_DASHBOARD_CACHE_POLICY}),'unavailable')],
8:['usable-helper',()=>assert.equal(isDashboardCacheUsable('refresh_required'),false)],
9:['plan-missing',()=>assert.equal(buildDashboardRefreshPlan({hydration:{...hydBase,freshness:[{sourceKind:'executive_dashboard_report',status:'missing',freshnessScore:0,reason:'m'}],completeness:{...hydBase.completeness,completenessScore:0,missingSources:['executive_dashboard_report']}},cacheStatus:'refresh_required',policy:DEFAULT_DASHBOARD_CACHE_POLICY}).actions[0].reason,'missing_source')],
10:['plan-stale',()=>assert.equal(buildDashboardRefreshPlan({hydration:{...hydBase,freshness:[{sourceKind:'executive_dashboard_report',status:'stale',freshnessScore:0,reason:'s'}]},cacheStatus:'refresh_recommended',policy:DEFAULT_DASHBOARD_CACHE_POLICY}).actions.some(a=>a.reason==='stale_source'),true)],
11:['plan-manual',()=>assert.equal(buildDashboardRefreshPlan({hydration:hydBase,cacheStatus:'refresh_required',policy:DEFAULT_DASHBOARD_CACHE_POLICY,manualRefresh:true}).actions.some(a=>a.reason==='manual_refresh'),true)],
12:['prio-critical',()=>assert.equal(assignDashboardRefreshPriority({id:'x',sourceKind:'executive_dashboard_report',reason:'missing_source',priority:'medium',title:'',description:''}),'critical')],
13:['prio-high',()=>assert.equal(assignDashboardRefreshPriority({id:'x',sourceKind:'executive_dashboard_report',reason:'stale_source',priority:'medium',title:'',description:''}),'high')],
14:['prio-medium',()=>assert.equal(assignDashboardRefreshPriority({id:'x',sourceKind:'intervention_report',reason:'stale_source',priority:'medium',title:'',description:''}),'medium')],
15:['sort-dedupe',()=>assert.equal(prioritizeDashboardRefreshActions([{id:'a',sourceKind:'executive_dashboard_report',reason:'missing_source',priority:'low',title:'',description:''},{id:'b',sourceKind:'executive_dashboard_report',reason:'missing_source',priority:'low',title:'',description:''}]).length,1)],
16:['meta-avg',()=>assert.equal(buildDashboardCacheMetadata({hydration:{...hydBase,freshness:[{freshnessScore:50},{freshnessScore:100}]},cacheStatus:'usable',refreshPlan:{refreshRequired:false,refreshRecommended:false,actions:[],priority:'low',reasonSummary:'ok'},policy:DEFAULT_DASHBOARD_CACHE_POLICY}).freshnessScore,75)],
17:['meta-next',()=>assert.equal(buildDashboardCacheMetadata({hydration:hydBase,cacheStatus:'refresh_required',refreshPlan:{refreshRequired:true,refreshRecommended:true,actions:[],priority:'critical',reasonSummary:'x'},policy:DEFAULT_DASHBOARD_CACHE_POLICY}).nextRecommendedRefreshAt,undefined)],
}) ) test(`${i} ${name}`, fn)
test('18 e2e fresh', async()=>{const s=createInMemoryDashboardSnapshotStore(); await s.saveSnapshot({id:'1',tenantId:'t1',sourceKind:'executive_dashboard_report',payload:{},generatedAt:new Date().toISOString(),schemaVersion:'1',runtimeVersion:'1'}); const r=await runDashboardCacheRefresh({request:base,store:s}); assert.equal(r.cacheStatus,'usable_with_warnings')})
test('19 e2e stale', async()=>{const s=createInMemoryDashboardSnapshotStore(); await s.saveSnapshot({id:'1',tenantId:'t1',sourceKind:'executive_dashboard_report',payload:{},generatedAt:past(120),schemaVersion:'1',runtimeVersion:'1'}); const r=await runDashboardCacheRefresh({request:base,store:s}); assert.equal(r.cacheStatus,'refresh_recommended')})
test('20 e2e empty', async()=>{const s=createInMemoryDashboardSnapshotStore(); const r=await runDashboardCacheRefresh({request:base,store:s}); assert.equal(r.cacheStatus,'unavailable')})
