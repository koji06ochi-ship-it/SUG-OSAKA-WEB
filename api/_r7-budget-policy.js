/* Shared R7 AI/LIVE limits. No billed operation is permitted without a
 * durable atomic ledger and server-side authenticated session. */
export const BUDGET_YEN=Object.freeze({
 total:10000, aiText:2000, aiVoice:2000, live:5000, reserve:1000
});
export const LIMITS=Object.freeze({
 maxQuestionChars:500, maxAnswerChars:3000,
 maxLiveParticipants:10, maxLiveMinutes:30, maxLiveParticipantMinutes:300
});
export function validQuestion(body){
 return !!body && typeof body.question==='string' &&
   body.question.trim().length>=1 && body.question.trim().length<=LIMITS.maxQuestionChars &&
   ['ja','en','zh'].includes(body.language) &&
   Object.keys(body).every(k=>['question','language'].includes(k));
}
export function rejectDisabled(res, service){
 res.setHeader('Cache-Control','no-store');
 return res.status(503).json({
   error:'SERVICE_DISABLED',
   service,
   message:'Authenticated backend, durable atomic budget reservation, and explicit owner approval are required.',
   paidRequestsAttempted:0
 });
}
/* Security preflight required for any future enabled endpoint.
 * NEVER trust a browser's budget flag or client-reported spending.
 * An in-memory counter, localStorage, alert-only billing limit,
 * or unauthenticated API key is NOT adequate protection.
 */
export function prerequisiteStatus(config){
 return Object.freeze({
   ownerApproved:config?.ownerApproved===true,
   authenticated:config?.authenticated===true,
   serverSecretConfigured:config?.serverSecretConfigured===true,
   atomicLedgerConfigured:config?.atomicLedgerConfigured===true,
   providerHardLimitConfigured:config?.providerHardLimitConfigured===true,
   noAutomaticOverage:config?.noAutomaticOverage===true
 });
}
export function canEnable(status){
 return Object.values(status).every(Boolean);
}
