import {requireR7User} from '../server/r7-auth-gate.js';
import {BUDGET_YEN,rejectDisabled} from './_r7-budget-policy.js';
import {AI_TASKS,AI_LANGUAGES,normalizeAIRequest} from '../server/r7-ai-contract.js';
/* Existing BODY meal AI uses a separate API and is not altered.
 * This is a WALK-specific request contract, not an activated OpenAI endpoint.
 * Owner authorization + real atomic DB enforcement + upstream hard spending caps
 * and provider billing reconciliation must PASS before a paid call can be wired.
 */
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='GET')return res.status(200).json({
   service:'walk-ai',enabled:false,mode:'OFF',tasks:AI_TASKS,
   languages:AI_LANGUAGES,aiTextMonthlyLimitYen:BUDGET_YEN.aiText,
   overallMonthlyLimitYen:BUDGET_YEN.total,
   reason:'Authenticated billing and real provider spending cap not verified'
 });
 if(req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 const task=normalizeAIRequest(req.body);
 if(!task)return res.status(400).json({error:'INVALID_REQUEST'});
 const access=await requireR7User(req);
 if(!access.allowed)return res.status(access.status).json({error:access.error});
 // Valid inputs and an authenticated user are necessary, never sufficient.
 // Intentionally no OpenAI fetch, no provider key and no chargeable execution.
 return rejectDisabled(res,'walk-ai');
}
