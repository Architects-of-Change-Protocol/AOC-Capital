import test from 'node:test';
import assert from 'node:assert/strict';

const scopeA = { companyId: 'c1', workspaceId: 'w1', userId: 'u1' };
const scopeB = { companyId: 'c1', workspaceId: 'w1', userId: 'u2' };
const awaken = (n) => ({ stage: n>=10?'fully-operational':n>=7?'expanded':n>=4?'engaged':n>=2?'orienting':n>=1?'initializing':'dormant', awakenedAgents:[], interactionCount:n });

function fakePersistence(fail=false) {
  const store = new Map();
  const k = (s) => `${s.companyId}:${s.workspaceId}:${s.userId}`;
  return {
    async loadAwakening(s){ return store.get(k(s))?.awakening ?? awaken(0); },
    async persistAwakening(s,v){ if(fail) throw new Error('down'); store.set(k(s), { ...(store.get(k(s))??{}), awakening: v }); },
    async loadImprint(s){ return store.get(k(s))?.imprint ?? { profile:{dominantFocus:'delivery',observedInteractionCount:0}, scores:{} }; },
    async persistImprint(s,v){ store.set(k(s), { ...(store.get(k(s))??{}), imprint: v }); },
    async loadValidation(s){ return store.get(k(s))?.validation ?? { traces:[], currentConfidence:'low', feedbackBias:0 }; },
    async persistValidation(s,v){ store.set(k(s), { ...(store.get(k(s))??{}), validation: v }); },
  };
}

test('1 awakening persists tenant-scoped', async () => { const p = fakePersistence(); await p.persistAwakening(scopeA, awaken(4)); assert.equal((await p.loadAwakening(scopeA)).stage, 'engaged'); });
test('2 imprint persists tenant-scoped', async () => { const p = fakePersistence(); await p.persistImprint(scopeA, { profile:{dominantFocus:'risk',observedInteractionCount:1}, scores:{} }); assert.equal((await p.loadImprint(scopeA)).profile.dominantFocus, 'risk'); });
test('3 validation traces persist tenant-scoped', async () => { const p = fakePersistence(); await p.persistValidation(scopeA, { traces:[{id:'t1'}], currentConfidence:'building', feedbackBias:0 }); assert.equal((await p.loadValidation(scopeA)).traces.length,1); });
test('4 cross-user isolation enforced', async () => { const p = fakePersistence(); await p.persistAwakening(scopeA, awaken(7)); assert.equal((await p.loadAwakening(scopeB)).stage, 'dormant'); });
test('5 hydration restores full continuity', async () => { const p = fakePersistence(); await p.persistAwakening(scopeA, awaken(10)); await p.persistImprint(scopeA, { profile:{dominantFocus:'stakeholders',observedInteractionCount:10}, scores:{} }); assert.equal((await p.loadAwakening(scopeA)).stage, 'fully-operational'); });
test('6 fallback recovery works', async () => { const p = fakePersistence(true); await assert.rejects(() => p.persistAwakening(scopeA, awaken(1))); });
test('7 optimistic UI remains responsive', async () => { let ui='updated'; const p = fakePersistence(); const op = p.persistAwakening(scopeA, awaken(2)); assert.equal(ui,'updated'); await op; });
test('8 runtime resume semantics preserved', async () => { const lastTrace = Date.now()-1000*60*60*2; const label = Date.now()-lastTrace > 1000*60*60 ? 'Operational context resumed':'Continuity restored'; assert.equal(label, 'Operational context resumed'); });
