/* S.u.G WALK R7 contract and fail-closed handler test, no network or API key.
 * Run: node walk-r7-preview/r7-ai-contract-regression.test.cjs
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(base,'server/r7-ai-contract.js'),'utf8');
const c=new Function(src.replace(/export (const|function) /g,'$1 ')+'\nreturn {normalizeAIRequest,systemInstruction,AI_TASKS,AI_LANGUAGES};')();
let checks=0;function test(name,fn){fn();checks++;console.log('PASS',name);}
test('two supported tasks',()=>assert.deepEqual([...c.AI_TASKS],['sightseeing','translation']));
test('three languages',()=>assert.deepEqual([...c.AI_LANGUAGES],['ja','en','zh']));
test('legacy sightseeing input accepted',()=>assert.equal(c.normalizeAIRequest({question:'大阪城について',language:'ja'}).task,'sightseeing'));
test('translation accepted',()=>assert.equal(c.normalizeAIRequest({task:'translation',question:'Hello',language:'en',targetLanguage:'ja'}).targetLanguage,'ja'));
test('empty input denied',()=>assert.equal(c.normalizeAIRequest({task:'translation',question:' ',language:'en',targetLanguage:'ja'}),null));
test('oversized input denied',()=>assert.equal(c.normalizeAIRequest({question:'あ'.repeat(501),language:'ja'}),null));
test('unknown task denied',()=>assert.equal(c.normalizeAIRequest({task:'streaming',question:'ok',language:'ja'}),null));
test('unknown language denied',()=>assert.equal(c.normalizeAIRequest({question:'ok',language:'xx'}),null));
test('unexpected fields denied',()=>assert.equal(c.normalizeAIRequest({question:'ok',language:'ja',ownerApproved:true}),null));
test('translation target required',()=>assert.equal(c.normalizeAIRequest({task:'translation',question:'ok',language:'ja'}),null));
test('sightseeing target invalid',()=>assert.equal(c.normalizeAIRequest({task:'sightseeing',question:'ok',language:'ja',targetLanguage:'en'}),null));
test('precise coordinates denied',()=>assert.equal(c.normalizeAIRequest({question:'34.690616,135.514183',language:'ja'}),null));
test('credential-like text denied',()=>assert.equal(c.normalizeAIRequest({question:'Bearer '+'a'.repeat(40),language:'ja'}),null));
test('tourism prompt protects time-sensitive claims',()=>assert.match(c.systemInstruction({task:'sightseeing',language:'en'}),/opening hours/));
test('translation prompt forbids invented directions',()=>assert.match(c.systemInstruction({task:'translation',language:'ja',targetLanguage:'zh'}),/Do not invent directions/));

const handlerCode=fs.readFileSync(path.join(base,'api/walk-ai.js'),'utf8').replace(/^import .*;\s*$/gm,'').replace(/export default async function handler/, 'async function handler');
const handler=new Function('requireR7User','BUDGET_YEN','rejectDisabled','AI_TASKS','AI_LANGUAGES','normalizeAIRequest',handlerCode+'\nreturn handler;')(
 async()=>({allowed:true,userId:'test-user'}),{aiText:2000,total:10000},
 (res,service)=>res.status(503).json({error:'SERVICE_DISABLED',service}),c.AI_TASKS,c.AI_LANGUAGES,c.normalizeAIRequest);
function res(){return {code:200,body:null,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(k){this.code=k;return this},json(o){this.body=o;return this}}}
(async()=>{
 let r=res();
 await handler({method:'GET'},r);
 test('GET clearly advertises disabled status',()=>{assert.equal(r.body.enabled,false);assert.equal(r.code,200)});
 r=res();
 await handler({method:'POST',body:{task:'translation',question:'Hello',language:'en',targetLanguage:'ja'}},r);
 test('valid authenticated translation still fails closed',()=>{assert.equal(r.code,503);assert.equal(r.body.error,'SERVICE_DISABLED')});
 r=res();
 await handler({method:'POST',body:{question:'',language:'ja'}},r);
 test('bad request rejected with 400',()=>assert.equal(r.code,400));
 console.log('RESULT '+checks+'/'+checks+' offline contract tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
