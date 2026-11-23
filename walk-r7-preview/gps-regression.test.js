/* S.u.G WALK R7 / isolated GPS segment regression. Run: node gps-regression.test.js
 * This test does not request GPS, visit servers, modify production storage or use paid services.
 */
'use strict';
const assert = require('node:assert/strict');
const {create,read,dayKey} = require('./neon-walk.js');
const NOW = Date.parse('2026-11-23T09:00:00+09:00');
const A={lat:34.6906,lng:135.5141},B={lat:34.6907,lng:135.5142},C={lat:34.6908,lng:135.5143};
const data=new Map();
const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
const trail=create(storage,()=>NOW);
let checked=0;
function test(label,fn){try{fn();console.log('PASS',label);checked++;}catch(e){console.error('FAIL',label);throw e;}}
test('empty walk is zero',()=>assert.equal(trail.snapshot().segments,0));
test('steps below four metres rejected',()=>assert.equal(trail.record(A,B,3,NOW),false));
test('valid local segment accepted',()=>assert.equal(trail.record(A,B,12,NOW),true));
test('identical coordinates rejected',()=>assert.equal(trail.record(A,A,12,NOW),false));
test('stale timestamp rejected',()=>assert.equal(trail.record(B,C,10,NOW-61000),false));
test('out of Osaka region coordinates rejected',()=>assert.equal(trail.record(A,{lat:40,lng:135},10,NOW),false));
test('one saved segment',()=>assert.equal(read(storage,NOW).length,1));
test('restored segment after recreation',()=>assert.equal(create(storage,()=>NOW).snapshot().segments,1));
test('rounded total metres',()=>assert.equal(trail.snapshot().metres,12));
test('geojson line segments',()=>assert.equal(trail.featureCollection().features.length,1));
test('invalid view rejected',()=>assert.equal(trail.setView('invalid'),false));
test('all-time view accepted',()=>assert.equal(trail.setView('all'),true));
const broken={getItem:()=>'{broken',setItem:()=>{throw new Error('storage unavailable')}};
test('corrupted JSON is ignored',()=>assert.equal(create(broken,()=>NOW).snapshot().segments,0));
test('unavailable storage refuses writes',()=>assert.equal(create(broken,()=>NOW).record(A,B,12,NOW),false));
test('Tokyo calendar day',()=>assert.equal(dayKey(NOW),'2026-11-23'));
console.log('RESULT',checked+' / '+checked,'code-level tests passed');
