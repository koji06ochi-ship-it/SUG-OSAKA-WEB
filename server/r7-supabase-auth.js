/* S.u.G WALK R7 — server-only Supabase Auth verifier.
 * Validates a user session with Supabase Auth, NOT unverified JWT decoding.
 * This function is not connected to paid AI/LIVE routes; routes still reject POST.
 */
function requireValidConfig(env){
 const raw=env?.SUPABASE_URL;
 const key=env?.SUPABASE_PUBLISHABLE_KEY;
 if(typeof raw!=='string'||typeof key!=='string'||!key.trim())throw Error('AUTH_NOT_CONFIGURED');
 let url;
 try{url=new URL(raw);}catch{throw Error('AUTH_NOT_CONFIGURED');}
 if(url.protocol!=='https:'||!(/^[a-z0-9-]+\.supabase\.co$/i).test(url.hostname)||
    url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)
   throw Error('AUTH_ORIGIN_NOT_ALLOWED');
 return {origin:url.origin,key};
}
export async function verifySupabaseUser({authorization,env=process.env,fetchImpl=fetch}){
 const {origin,key}=requireValidConfig(env);
 if(typeof authorization!=='string'||!/^Bearer [A-Za-z0-9._~-]{16,8192}$/.test(authorization))
   throw Error('INVALID_SESSION_TOKEN');
 const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),5000);
 try{
  const response=await fetchImpl(origin+'/auth/v1/user',{
   method:'GET',
   headers:{authorization,apikey:key,accept:'application/json'},
   cache:'no-store',signal:ctl.signal
  });
  if(!response.ok)throw Error('SESSION_REJECTED');
  const result=await response.json();
  if(!result || typeof result.id!=='string'||
     !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result.id))
    throw Error('SESSION_INVALID_USER');
  if(result.is_anonymous===true)throw Error('ANONYMOUS_USER_NOT_ALLOWED');
  // app_metadata is administrator-controlled; user_metadata is NOT trusted.
  return {userId:result.id,canBroadcast:result.app_metadata?.sug_walk_live_broadcaster===true};
 }finally{clearTimeout(timer);}
}
