// S.u.G WALK R7: budget ledger regression tests
// Run: node --test server/tests/r7-budget-ledger.test.mjs
// Uses Node built-ins only. This is a deterministic SERIALIZABLE DB SIMULATOR,
// not a substitute for real PostgreSQL concurrency/RLS verification.
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const source = await readFile(new URL('../r7-cost-ledger.js', import.meta.url),'utf8');
const {reserveCost,finishCost,ledgerSettings}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const monthKey='2026-11';
function ledger(){
 let row={month_key:monthKey,ai_text_held:0,ai_text_spent:0,ai_voice_held:0,ai_voice_spent:0,live_held:0,live_spent:0};
 let ops=new Map(),lock=Promise.resolve();
 return {
  inspect:()=>({...row,operations:[...ops.values()].map(v=>({...v}))}),
  transaction:async fn=>{
   let release;
   const previous=lock;
   lock=new Promise(resolve=>{release=resolve;});
   await previous; // serializes transactions, like a shared monthly row lock
   const working={...row};
   const workingOps=new Map([...ops].map(([k,v])=>[k,{...v}]));
   const tx={query:async(sql,p=[])=>{
    if(sql.startsWith('SELECT to_char('))return{rows:[{month_key:monthKey}]};
    if(sql.startsWith('INSERT INTO r7_private.r7_budget_month'))return{rows:[]};
    if(sql.startsWith('SELECT * FROM r7_private.r7_budget_month'))return{rows:[{...working}]};
    if(sql.startsWith('SELECT month_key FROM r7_private.r7_budget_operation'))return{rows:workingOps.has(p[0])?[{month_key:workingOps.get(p[0]).month_key}]:[]};
    if(sql.startsWith('SELECT * FROM r7_private.r7_budget_operation'))return{rows:workingOps.has(p[0])?[{...workingOps.get(p[0])}]:[]};
    if(sql.startsWith('UPDATE r7_private.r7_budget_month')){
     const category=sql.match(/SET (ai_text|ai_voice|live)_held=/)?.[1];
     if(!category)throw Error('UNKNOWN_LEDGER_UPDATE');
     const held=category+'_held',spent=category+'_spent';
     if(sql.includes('-$2')){
      if(working[held]<p[1])return{rows:[]};
      working[held]-=p[1];working[spent]+=p[2];
     }else working[held]+=p[1];
     const total=['ai_text','ai_voice','live'].reduce((n,c)=>n+working[c+'_held']+working[c+'_spent'],0);
     const limits={ai_text:2000,ai_voice:2000,live:5000};
     if(total>9000||Object.keys(limits).some(c=>working[c+'_held']+working[c+'_spent']>limits[c]))return{rows:[]};
     return{rows:[{month_key:p[0]}]};
    }
    if(sql.startsWith('INSERT INTO r7_private.r7_budget_operation')){
     if(workingOps.has(p[0]))throw Error('DUPLICATE_ID');
     workingOps.set(p[0],{operation_id:p[0],month_key:p[1],category:p[2],reserved_yen:p[3],status:'reserved',actual_yen:null});
     return{rows:[]};
    }
    if(sql.startsWith('UPDATE r7_private.r7_budget_operation')){
     const op=workingOps.get(p[0]);if(!op)throw Error('MISSING_ID');
     op.actual_yen=p[1];op.status=p[2];return{rows:[]};
    }
    throw Error('UNSUPPORTED_SQL '+sql.slice(0,50));
   }};
   try{
    const result=await fn(tx);
    row=working;ops=workingOps; // commit
    return result;
   }finally{release();}
  }
 };
}
function op(s){return 'r7_operation_'+s.padEnd(22,'_');}
test('JPY budget allocations sum to 10000 with 1000 blocked',()=>{
 const s=ledgerSettings();
 assert.equal(s.totalLimitYen,10000);
 assert.equal(s.spendableYen,9000);
 assert.equal(Object.values(s.categoryCapsYen).reduce((a,b)=>a+b,0),9000);
});
test('reserve, duplicate reservation and settle',async()=>{
 const db=ledger(),id=op('basic');
 assert.equal((await reserveCost(db,{operationId:id,category:'ai_text',maxYen:1000})).accepted,true);
 assert.equal((await reserveCost(db,{operationId:id,category:'ai_text',maxYen:1000})).duplicate,true);
 assert.equal((await finishCost(db,{operationId:id,actualYen:420})).accepted,true);
 assert.equal((await finishCost(db,{operationId:id,actualYen:420})).duplicate,true);
 assert.equal(db.inspect().ai_text_spent,420);
 assert.equal(db.inspect().ai_text_held,0);
 await assert.rejects(finishCost(db,{operationId:id,actualYen:421}),/ALREADY_FINALIZED/);
});
test('category ceiling stops over-limit reservations and rolls back',async()=>{
 const db=ledger();
 await reserveCost(db,{operationId:op('ai-max'),category:'ai_text',maxYen:2000});
 const before=db.inspect();
 await assert.rejects(reserveCost(db,{operationId:op('ai-over'),category:'ai_text',maxYen:1}),/CATEGORY_LIMIT_REACHED/);
 assert.deepEqual(db.inspect(),before);
});
test('all categories share a 9000-yen spendable limit',async()=>{
 const db=ledger();
 await reserveCost(db,{operationId:op('text'),category:'ai_text',maxYen:2000});
 await reserveCost(db,{operationId:op('voice'),category:'ai_voice',maxYen:2000});
 await reserveCost(db,{operationId:op('live'),category:'live',maxYen:5000});
 assert.equal(db.inspect().operations.length,3);
 await assert.rejects(reserveCost(db,{operationId:op('extra'),category:'ai_voice',maxYen:1}),/MONTHLY_LIMIT_REACHED/);
});
test('actual costs above reserved amount rejected without mutation',async()=>{
 const db=ledger(),id=op('provider-over');
 await reserveCost(db,{operationId:id,category:'live',maxYen:450});
 const snapshot=db.inspect();
 await assert.rejects(finishCost(db,{operationId:id,actualYen:451}),/ACTUAL_EXCEEDS_RESERVATION/);
 assert.deepEqual(db.inspect(),snapshot);
});
test('cancel releases reservation idempotently',async()=>{
 const db=ledger(),id=op('cancel');
 await reserveCost(db,{operationId:id,category:'ai_voice',maxYen:600});
 assert.equal((await finishCost(db,{operationId:id,actualYen:0,cancel:true})).accepted,true);
 assert.equal((await finishCost(db,{operationId:id,actualYen:0,cancel:true})).duplicate,true);
 assert.equal(db.inspect().ai_voice_held,0);
 assert.equal(db.inspect().ai_voice_spent,0);
});
test('operation ID cannot be reused with different cost',async()=>{
 const db=ledger(),id=op('reuse');
 await reserveCost(db,{operationId:id,category:'ai_text',maxYen:100});
 await assert.rejects(reserveCost(db,{operationId:id,category:'ai_text',maxYen:101}),/IDEMPOTENCY_CONFLICT/);
});
test('simulated simultaneous operations never over-reserve',async()=>{
 const db=ledger();
 const results=await Promise.allSettled(Array.from({length:40},(_,i)=>
  reserveCost(db,{operationId:op('load'+i),category:'live',maxYen:500})));
 assert.equal(results.filter(x=>x.status==='fulfilled').length,10);
 assert.equal(results.filter(x=>x.status==='rejected').length,30);
 assert.equal(db.inspect().live_held,5000);
 assert.equal(db.inspect().operations.length,10);
});
test('invalid inputs fail closed',async()=>{
 const db=ledger();
 await assert.rejects(reserveCost(db,{operationId:'short',category:'live',maxYen:100}),/INVALID_OPERATION_ID/);
 await assert.rejects(reserveCost(db,{operationId:op('badcat'),category:'other',maxYen:1}),/INVALID_CATEGORY/);
 await assert.rejects(reserveCost(db,{operationId:op('badval'),category:'live',maxYen:-1}),/INVALID_AMOUNT/);
 assert.equal(db.inspect().operations.length,0);
});
