/* R7 authenticated access gate. Does NOT permit paid service execution.
 * Status is stable and never logs credentials or tokens. */
import {verifySupabaseUser} from './r7-supabase-auth.js';
export async function requireR7User(req,{env=process.env,fetchImpl=fetch}={}){
 if(!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY)
   return {allowed:false,status:503,error:'AUTH_UNCONFIGURED'};
 const raw=req?.headers?.authorization;
 if(typeof raw!=='string'||!raw.startsWith('Bearer '))
   return {allowed:false,status:401,error:'AUTH_REQUIRED'};
 try{
   const user=await verifySupabaseUser({authorization:raw,env,fetchImpl});
   return {allowed:true,userId:user.userId,canBroadcast:user.canBroadcast===true};
 }catch(err){
   if(err?.message==='AUTH_NOT_CONFIGURED'||err?.message==='AUTH_ORIGIN_NOT_ALLOWED')
     return {allowed:false,status:503,error:'AUTH_CONFIGURATION_ERROR'};
   if(err?.message==='SESSION_REJECTED'||err?.message==='INVALID_SESSION_TOKEN'||
      err?.message==='SESSION_INVALID_USER'||err?.message==='ANONYMOUS_USER_NOT_ALLOWED')
     return {allowed:false,status:401,error:'INVALID_SESSION'};
   return {allowed:false,status:503,error:'AUTH_PROVIDER_UNAVAILABLE'};
 }
}

/* Not enough to have a session: LIVE host permission must be server-managed.
 * Viewer access does not imply broadcast rights. */
export function authorizeR7LiveRole(access,mode){
 if(!access?.allowed)return {allowed:false,status:401,error:'AUTH_REQUIRED'};
 if(mode==='viewer')return {allowed:true,role:'viewer'};
 if(mode==='host'&&access.canBroadcast===true)return {allowed:true,role:'host'};
 return {allowed:false,status:403,error:'BROADCAST_NOT_AUTHORIZED'};
}
