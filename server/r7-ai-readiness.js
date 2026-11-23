/* S.u.G WALK R7: safe, read-only, non-enabling AI readiness diagnosis.
 * Never reveal env values or tokens. Flags alone cannot prove real DB/billing correctness.
 */
export function aiReadiness({env={},evidence={}}={}){
  const configured=name=>typeof env[name]==='string'&&env[name].trim().length>0;
  const checks=Object.freeze({
    authConfiguration:configured('SUPABASE_URL')&&configured('SUPABASE_PUBLISHABLE_KEY'),
    providerKeyConfigured:configured('OPENAI_API_KEY'),
    databaseConnectionConfigured:configured('R7_PRIVATE_DATABASE_URL'),
    databaseConcurrencyVerified:evidence.databaseConcurrencyVerified===true,
    providerHardCapVerified:evidence.providerHardCapVerified===true,
    billingReconciliationVerified:evidence.billingReconciliationVerified===true,
    ownerApproved:evidence.ownerApproved===true
  });
  const missing=Object.keys(checks).filter(key=>!checks[key]);
  return Object.freeze({service:'walk-ai',enabled:false,mode:'OFF',
    checks,missing,readyForActivationReview:missing.length===0,
    note:'Readiness flags are diagnostic only; cannot activate the AI endpoint.'});
}
