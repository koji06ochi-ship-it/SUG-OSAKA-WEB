/* S.u.G WALK R7: existing Supabase password sign-in, SESSION MEMORY ONLY.
 * Password sign-in is optional. No sign-up, email sending, token persistence or AI billing.
 * The public publishable key is reused from the existing BODY engine (not a secret).
 */
(function(){
'use strict';
const origin='https://nnqzxcgkqjnmtzcvorha.supabase.co',apikey='sb_publishable_zcn7r2YSKDZa1lXJvmk3sg_GulOJXwI';
let session=null,expiresAt=0,authGeneration=0;
function clear(){authGeneration++;session=null;expiresAt=0}
function token(){if(!session||Date.now()>=expiresAt){clear();return null}return session}
async function signIn(email,password,fetchImpl=fetch){
 if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email.trim())||email.length>254||typeof password!=='string'||password.length<1||password.length>1024)
   throw Error('INVALID_CREDENTIAL_INPUT');
 // Never retry automatically or send a request without an explicit user action.
 clear();
 const requestGeneration=authGeneration;
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),8000);
 try{
  const response=await fetchImpl(origin+'/auth/v1/token?grant_type=password',{
   method:'POST',headers:{apikey,'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify({email:email.trim(),password}),cache:'no-store',credentials:'omit',signal:ctl.signal
  });
  if(!response.ok)throw Error('SIGN_IN_REJECTED');
  const data=await response.json();
  if(typeof data?.access_token!=='string'||data.access_token.length<16||!Number.isFinite(Number(data.expires_in))||Number(data.expires_in)<30)
   throw Error('INVALID_SESSION');
  const verify=await fetchImpl(origin+'/auth/v1/user',{
   method:'GET',headers:{apikey,Authorization:'Bearer '+data.access_token,Accept:'application/json'},
   cache:'no-store',credentials:'omit',signal:ctl.signal
  });
  if(!verify.ok)throw Error('SESSION_REJECTED');
  const user=await verify.json();
  if(!user||typeof user.id!=='string'||user.is_anonymous===true)throw Error('SESSION_REJECTED');
  if(requestGeneration!==authGeneration)throw Error('SESSION_CANCELLED');
  session=data.access_token;
  // No refresh token retained. Expire early; sign-in required after refresh/navigation.
  expiresAt=Date.now()+Math.min(Number(data.expires_in),3600)*1000-15000;
  return {authenticated:true,expiresInSeconds:Math.max(0,Math.floor((expiresAt-Date.now())/1000))};
 }catch(err){clear();throw err}
 finally{clearTimeout(timer)}
}
window.SUGR7AuthSession=Object.freeze({getAccessToken:async()=>token(),signIn,signOut:clear,isSignedIn:()=>!!token()});
})();
