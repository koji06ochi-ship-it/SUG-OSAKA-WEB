import {requireR7User} from '../server/r7-auth-gate.js';
import {BUDGET_YEN,validQuestion,rejectDisabled} from './_r7-budget-policy.js';
/* No provider calls. A production endpoint requires real server-side user
 * authentication, atomic budget reservations, and approval before implementation.
 * No public POST may turn this endpoint on via a request flag.
 */
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='GET' && req.query?.clientConfig==='1'){
   const url=process.env.SUPABASE_URL;
   const key=process.env.SUPABASE_PUBLISHABLE_KEY;
   if(typeof url!=='string'||url.replace(/\/$/,'')!=='https://nnqzxcgkqjnmtzcvorha.supabase.co'||
      typeof key!=='string'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))
     return res.status(503).json({error:'AUTH_UNCONFIGURED',aiEnabled:false});
   return res.status(200).json({supabaseUrl:url.replace(/\/$/,''),publishableKey:key,aiEnabled:false});
 }
 if(req.method==='GET')return res.status(200).json({
   service:'walk-ai',enabled:false,mode:'OFF',
   aiTextMonthlyLimitYen:BUDGET_YEN.aiText,
   overallMonthlyLimitYen:BUDGET_YEN.total,
   reason:'Server-side authenticated billing guard not configured'
 });
 if(req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 if(!validQuestion(req.body))return res.status(400).json({error:'INVALID_REQUEST'});
 const access=await requireR7User(req);
 if(!access.allowed)return res.status(access.status).json({error:access.error});
 // Even authenticated sessions cannot start billed processing yet.
 return rejectDisabled(res,'walk-ai');
}