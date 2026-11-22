import {BUDGET_YEN,LIMITS,rejectDisabled} from './_r7-budget-policy.js';
/* Read-only status; no room token, publisher grant, or service is provisioned. */
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='GET')return res.status(200).json({
   service:'walk-live',enabled:false,mode:'OFF',
   liveMonthlyLimitYen:BUDGET_YEN.live,
   overallMonthlyLimitYen:BUDGET_YEN.total,
   proposedSessionCap:{
     maxParticipants:LIMITS.maxLiveParticipants,
     maxMinutes:LIMITS.maxLiveMinutes,
     maxParticipantMinutes:LIMITS.maxLiveParticipantMinutes
   },
   reason:'Authenticated token server and persistent usage metering not configured'
 });
 if(req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 // POST remains closed, even with body flags, credentials or requested session.
 return rejectDisabled(res,'walk-live');
}