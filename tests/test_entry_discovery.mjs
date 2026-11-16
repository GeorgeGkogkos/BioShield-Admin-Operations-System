import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileEntryDiscovery,ENTRY_DISCOVERY_STORAGE_KEY} from '../static/entry-discovery.js';

function memoryStorage(){
  const values=new Map();
  return {
    getItem:key=>values.get(key)??null,
    setItem:(key,value)=>values.set(key,value),
    raw:()=>values.get(ENTRY_DISCOVERY_STORAGE_KEY)
  };
}
const a={id:'TED-123456-2026'},b={id:'TED-123457-2026'},c={id:'TED-123458-2026'};
function report(notices,status='ok'){
  return {status,notices,searched_at_utc:'2026-11-16T14:00:00+00:00'};
}

test('first successful app entry creates baseline, not false new notices',()=>{
  const store=memoryStorage();
  const first=reconcileEntryDiscovery(report([a,b]),store);
  assert.equal(first.status,'baseline');
  assert.deepEqual(first.newIds,[]);
  assert.deepEqual(JSON.parse(store.raw()).ids,[a.id,b.id]);
});
test('subsequent entry detects unseen official IDs and does not double count',()=>{
  const store=memoryStorage();
  reconcileEntryDiscovery(report([a]),store);
  const second=reconcileEntryDiscovery(report([a,b,b,c,{id:'INVALID'}]),store);
  assert.equal(second.status,'compared');
  assert.deepEqual(second.newIds,[b.id,c.id]);
  assert.deepEqual(reconcileEntryDiscovery(report([a,b,c]),store).newIds,[]);
});
test('unavailable provider cannot overwrite prior successful cursor',()=>{
  const store=memoryStorage();
  reconcileEntryDiscovery(report([a]),store);
  const before=store.raw();
  assert.equal(reconcileEntryDiscovery(report([], 'unavailable'),store).status,'source_unavailable');
  assert.equal(store.raw(),before);
  assert.deepEqual(reconcileEntryDiscovery(report([a,b]),store).newIds,[b.id]);
});
test('refused browser storage never asserts new',()=>{
  const refused={getItem:()=>{throw Error('SecurityError')},setItem:()=>{throw Error('SecurityError')}};
  const status=reconcileEntryDiscovery(report([a]),refused);
  assert.equal(status.status,'storage_unavailable');
  assert.deepEqual(status.newIds,[]);
});
test('invalid cursor is handled as first visit',()=>{
  const store=memoryStorage();
  store.setItem(ENTRY_DISCOVERY_STORAGE_KEY,'{broken json');
  assert.equal(reconcileEntryDiscovery(report([a]),store).status,'storage_unavailable');
  // If storage persists corrupted data, it needs an explicit reset rather than claiming new.
});
test('only bounded official TED IDs are retained, never contacts',()=>{
  const store=memoryStorage();
  const many=Array.from({length:300},(_,i)=>({id:'TED-'+String(100000+i)+'-2026',name:'sensitive'}));
  reconcileEntryDiscovery(report(many),store);
  const saved=JSON.parse(store.raw());
  assert.equal(saved.ids.length,250);
  assert.equal(store.raw().includes('sensitive'),false);
});
