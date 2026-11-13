// Server-only helper. Caller supplies an approved durable secret-store adapter.
// Never return, log, or commit the token. No scheduler is activated by this module.
export async function refreshInstagramToken({readSecret,writeSecret,fetcher=fetch,now=Date.now()}) {
  const saved=await readSecret();
  if(!saved || !Number.isFinite(saved.issuedAt) || !Number.isFinite(saved.expiresAt) || !saved.token) return {status:'not_configured'};
  if(saved.expiresAt<=now) return {status:'reauthorization_required'};
  if(now-saved.issuedAt<86400000 || saved.expiresAt-now>7*86400000) return {status:'not_due'};
  const url=new URL('https://graph.instagram.com/refresh_access_token');
  url.searchParams.set('grant_type','ig_refresh_token');url.searchParams.set('access_token',saved.token);
  try {
    const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!response.ok) return {status:'refresh_failed'};
    const payload=await response.json();
    if(typeof payload.access_token!=='string'||!payload.access_token||!Number.isFinite(payload.expires_in)||payload.expires_in<=0) return {status:'refresh_failed'};
    await writeSecret({token:payload.access_token,issuedAt:now,expiresAt:now+payload.expires_in*1000});
    return {status:'refreshed',expiresAt:now+payload.expires_in*1000};
  } catch {return {status:'refresh_failed'};}
}
