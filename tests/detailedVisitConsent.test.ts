import test from 'node:test';
import assert from 'node:assert/strict';
import {DetailedVisitConsent} from '../src/diagnostics/DetailedVisitConsent';

const observation = {
 hall:'jazz', zone:'auditorium', x:0, y:0, z:7, walking:false,
 seat:'parterre-1', track:'piece', playlist:'program', measuredMs:0,
} as const;

test('default and rejected choices never create a visit identifier or recorder',()=>{
 let issued=0;
 const consent=new DetailedVisitConsent(()=>true,()=>String(++issued));
 assert.equal(consent.current(),null);
 consent.revoke();
 assert.equal(consent.current(),null);
 assert.equal(issued,0);
});

test('only explicit grant starts a visit; withdrawal scrubs retained rows and invalidates the old callback',()=>{
 let issued=0;
 const consent=new DetailedVisitConsent(()=>true,()=>String(++issued));
 const recorder=consent.grant();
 assert.ok(recorder);
 assert.equal(consent.current(),recorder);
 assert.equal(consent.isCurrent(recorder),true);
 recorder.record(observation,1000,0);
 const rows=recorder.rows;
 assert.equal(rows.length,1);
 consent.revoke();
 assert.equal(rows.length,0);
 assert.equal(consent.current(),null);
 assert.equal(consent.isCurrent(recorder),false);
 const next=consent.grant();
 assert.ok(next);
 assert.notEqual(next.visit,recorder.visit);
 assert.equal(consent.isCurrent(recorder),false);
 assert.deepEqual(next.rows,[]);
});

test('blocked grant issues no identifier, later policy change erases even a paused visit',()=>{
 let allowed=false, issued=0;
 const consent=new DetailedVisitConsent(()=>allowed,()=>String(++issued));
 assert.equal(consent.grant(),null);
 assert.equal(issued,0);
 allowed=true;
 assert.equal(consent.current(),null);
 const recorder=consent.grant();
 assert.ok(recorder);
 recorder.record(observation,1000,0);
 recorder.interrupt();
 allowed=false;
 assert.equal(consent.current(),null);
 assert.equal(recorder.rows.length,0);
 allowed=true;
 assert.equal(consent.current(),null);
 assert.equal(consent.isCurrent(recorder),false);
});

test('unreadable privacy preferences fail closed on grant and during a visit',()=>{
 let broken=true, issued=0;
 const consent=new DetailedVisitConsent(()=>{
  if(broken)throw Error('storage unavailable');
  return true;
 },()=>String(++issued));
 assert.equal(consent.grant(),null);
 assert.equal(issued,0);
 broken=false;
 const recorder=consent.grant();
 assert.ok(recorder);
 recorder.record(observation,1000,0);
 broken=true;
 assert.equal(consent.isCurrent(recorder),false);
 assert.deepEqual(recorder.rows,[]);
});
