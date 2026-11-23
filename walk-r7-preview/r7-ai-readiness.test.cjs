/* S.u.G WALK R7 offline readiness regression.
 * Run: node walk-r7-preview/r7-ai-readiness.test.cjs
 * Does not call providers, connect DB, read real secrets or enable charging.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../server/r7-ai-readiness.js'),'utf8');
const {aiReadiness}=new Function(source.replace('export function aiReadiness','function aiReadiness')+';return {aiReadiness};')();
let count=0;const check=(label,fn)=>{fn();count++;console.log('PASS',label)};
const empty=aiReadiness();
check('default remains disabled',()=>assert.equal(empty.enabled,false));
check('missing configuration is explicit',()=>assert.equal(empty.missing.length,7));
check('default cannot be reviewed as ready',()=>assert.equal(empty.readyForActivationReview,false));
const env={OPENAI_API_KEY:'fake',SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fake-key'};
const partial=aiReadiness({env});
check('configured authentication is detected',()=>assert.equal(partial.checks.authConfiguration,true));
check('existing provider key is detected',()=>assert.equal(partial.checks.providerKeyConfigured,true));
check('missing private DB is detected',()=>assert.equal(partial.checks.databaseConnectionConfigured,false));
check('no secret values appear',()=>assert.ok(!JSON.stringify(partial).includes('fake-key')));
const complete=aiReadiness({env:{...env,R7_PRIVATE_DATABASE_URL:'postgresql://fake'},evidence:{
 databaseConcurrencyVerified:true,providerHardCapVerified:true,billingReconciliationVerified:true,ownerApproved:true}});
check('full evidence enables review only',()=>assert.equal(complete.readyForActivationReview,true));
check('even full evidence never activates AI',()=>assert.equal(complete.enabled,false));
check('all evidence accounted for',()=>assert.equal(complete.missing.length,0));
check('caller cannot flip frozen checks',()=>assert.equal(Object.isFrozen(complete.checks),true));
console.log('RESULT '+count+'/'+count+' readiness tests passed');
