/* S.u.G WALK R7 neon event policy: UI-only, no paid network or location uploads.
 * Remote state must come from a verified trusted service. Unverified events are NOT shown.
 */
(function(root){
'use strict';
const TEN_MINUTES=600000,CHALLENGE_MINUTES=1800000;
const STORE_STATUSES=new Set(['normal','live','sale']);
const https=(value)=>{
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}
};
function validStoreEvent(row,now=Date.now()){
 if(!row||!Number.isSafeInteger(row.osmWayId)||!STORE_STATUSES.has(row.liveStatus))return null;
 const starts=Date.parse(row.startsAt),ends=Date.parse(row.endsAt);
 if(!Number.isFinite(starts)||!Number.isFinite(ends)||starts>now||ends<=now||ends-starts>(row.liveStatus==='sale'?TEN_MINUTES:12*3600000))return null;
 if(row.liveStatus==='normal')return null;
 if(row.liveStatus==='sale'){
   if(typeof row.offerText!=='string'||row.offerText.length<1||row.offerText.length>120)return null;
   const entry={osmWayId:row.osmWayId,status:'sale',offerText:row.offerText,expiresAt:ends};
   return entry;
 }
 const url=https(row.liveUrl);
 if(!url)return null;
 return {osmWayId:row.osmWayId,status:'live',live_url:url,expiresAt:ends};
}
function validateChallenge(row,now=Date.now()){
 if(!row||row.verified!==true||row.challengeId!=='okawa-friday-21'||!Number.isSafeInteger(row.verifiedSteps)||row.verifiedSteps<0)return null;
 if(!Number.isSafeInteger(row.targetSteps)||row.targetSteps<10000||row.targetSteps>1000000)return null;
 const starts=Date.parse(row.startsAt),ends=Date.parse(row.endsAt);
 if(!Number.isFinite(starts)||!Number.isFinite(ends)||ends-starts!==CHALLENGE_MINUTES||now<starts||now>ends)return null;
 const jstStart=new Date(starts+9*3600000);
 if(jstStart.getUTCDay()!==5||jstStart.getUTCHours()!==21)return null;
 return {steps:row.verifiedSteps,target:row.targetSteps,complete:row.verifiedSteps>=row.targetSteps,endsAt:ends};
}
function safeProximityEvent(row,consented,now=Date.now()){
 // No user ID, device ID, other participant coordinates or exact timestamp accepted.
 if(consented!==true||!row||row.verified!==true||row.type!=='mutual-nearby'||!Number.isFinite(row.expiresAt)||row.expiresAt<now||row.expiresAt>now+30000)return null;
 return {kind:'firework',expiry:row.expiresAt};
}
const api={TEN_MINUTES,CHALLENGE_MINUTES,validStoreEvent,validateChallenge,safeProximityEvent};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.SUGR7NeonEvents=api;
})(typeof window!=='undefined'?window:globalThis);
