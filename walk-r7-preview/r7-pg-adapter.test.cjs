/* Offline tests for R7 transaction adapter. Run:
 * node walk-r7-preview/r7-pg-adapter.test.cjs
 * No real Postgres, Supabase, environment secrets or paid API used.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const raw=fs.readFileSync(path.join(__dirname,'../server/r7-pg-adapter.js'),'utf8');
const {createR7PgAdapter}=new Function(raw.replace('export function createR7PgAdapter','function createR7PgAdapter')+';return {createR7PgAdapter};')();

const make=(fail='')=>{
 const events=[];let released=0;
 const client={
  async query(sql,args=[]){events.push({sql,args});if(sql===fail)throw Error('DB_FAILURE_'+sql);return {rows:[{ok:true}]}},
  release(){released++}
 };
 return {events,get released(){return released},pool:{async connect(){events.push({sql:'CONNECT'});return client}}};
};
let count=0;
async function test(name,fn){await fn();count++;console.log('PASS',name)}
(async()=>{
 await test('reject missing pool',async()=>assert.throws(()=>createR7PgAdapter(null),/POOL_REQUIRED/));
 await test('reject missing callback',async()=>{const t=make();await assert.rejects(createR7PgAdapter(t.pool).transaction(null),/CALLBACK_REQUIRED/);assert.equal(t.events.length,0)});
 await test('successful commit',async()=>{const t=make(),v=await createR7PgAdapter(t.pool).transaction(async tx=>(await tx.query('SELECT 1',[])).rows[0].ok);assert.equal(v,true);assert.deepEqual(t.events.map(x=>x.sql),['CONNECT','BEGIN','SELECT 1','COMMIT']);assert.equal(t.released,1)});
 await test('callback failure rolls back',async()=>{const t=make();await assert.rejects(createR7PgAdapter(t.pool).transaction(async()=>{throw Error('BAD_OP')}),/BAD_OP/);assert.deepEqual(t.events.map(x=>x.sql),['CONNECT','BEGIN','ROLLBACK']);assert.equal(t.released,1)});
 await test('query failure rolls back',async()=>{const t=make('SELECT BROKEN');await assert.rejects(createR7PgAdapter(t.pool).transaction(tx=>tx.query('SELECT BROKEN',[])),/DB_FAILURE/);assert.deepEqual(t.events.map(x=>x.sql),['CONNECT','BEGIN','SELECT BROKEN','ROLLBACK']);assert.equal(t.released,1)});
 await test('BEGIN failure never commits or rolls back',async()=>{const t=make('BEGIN');await assert.rejects(createR7PgAdapter(t.pool).transaction(()=>true),/DB_FAILURE_BEGIN/);assert.deepEqual(t.events.map(x=>x.sql),['CONNECT','BEGIN']);assert.equal(t.released,1)});
 await test('COMMIT failure attempts rollback and releases',async()=>{const t=make('COMMIT');await assert.rejects(createR7PgAdapter(t.pool).transaction(()=>true),/DB_FAILURE_COMMIT/);assert.deepEqual(t.events.map(x=>x.sql),['CONNECT','BEGIN','COMMIT','ROLLBACK']);assert.equal(t.released,1)});
 await test('invalid SQL/parameters are rejected',async()=>{const t=make();await assert.rejects(createR7PgAdapter(t.pool).transaction(tx=>tx.query('',{})),/QUERY_INVALID/);assert.deepEqual(t.events.map(x=>x.sql),['CONNECT','BEGIN','ROLLBACK'])});
 await test('transaction functions return frozen facade',async()=>{const t=make();await createR7PgAdapter(t.pool).transaction(tx=>assert.equal(Object.isFrozen(tx),true))});
 await test('adapter has no standalone connection details',async()=>{assert.doesNotMatch(raw,/process\.env|postgresql:\/\/|supabase\.co|new Pool\(/)});
 console.log('RESULT '+count+'/'+count+' offline adapter tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
