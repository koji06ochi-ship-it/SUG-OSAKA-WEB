/* WALK R7 Vercel Preview auth-only route. STAGED, NOT DEPLOYED.
 * Separate from BODY, never calls OpenAI/DB or creates charges.
 * Future deployment target: sug-private-engine/api/walk-ai.mjs
 */
const origins=new Set(['https://koji06ochi-ship-it.github.io','https://raw.githack.com']);
const tasks=['sightseeing','translation'],langs=['ja','en','zh'];
function output(status,data,origin){
 const h={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
 if(origin){h['Access-Control-Allow-Origin']=origin;h['Access-Control-Allow-Methods']='GET,POST,OPTIONS';h['Access-Control-Allow-Headers']='Authorization,Content-Type';}
 return new Response(JSON.stringify(data),{status,headers:h});
}
function config(env){
 try{
 const u=new URL(env.SUPABASE_URL||'');
 if(u.protocol!=='https:'||!(/^[a-z0-9-]+\.supabase\.co$/i).test(u.hostname)||u.pathname!=='/'||u.search||u.hash||u.port||u.username||u.password)return null;
 if(!String(env.SUPABASE_PUBLISHABLE_KEY||'').startsWith('sb_publishable_'))return null;
 return {url:u.origin,key:env.SUPABASE_PUBLISHABLE_KEY};
 }catch{return null}
}
function valid(b){
 if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['task','question','language','targetLanguage'].includes(k)))return false;
 const task=b.task||'sightseeing';
 return tasks.includes(task)&&langs.includes(b.language)&&typeof b.question==='string'&&b.question.trim().length>0&&b.question.length<=500
 &&(task==='translation'?langs.includes(b.targetLanguage):b.targetLanguage===undefined);
}
export async function handle(req,{env=process.env,fetchImpl=fetch}={}){
 const value=req.headers.get('origin'),origin=value?(origins.has(value)?value:false):null;
 if(origin===false)return output(403,{error:'ORIGIN_DENIED'});
 if(req.method==='OPTIONS'){
  if(!origin)return output(403,{error:'ORIGIN_REQUIRED'});
  return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type','Vary':'Origin'}});
 }
 if(req.method==='GET')return output(200,{service:'walk-ai',enabled:false,mode:'AUTH_PREFLIGHT_ONLY',authConfigured:!!config(env),tasks,langs},origin);
 if(req.method!=='POST')return output(405,{error:'METHOD_NOT_ALLOWED'},origin);
 if(Number(req.headers.get('content-length')||0)>4096)return output(413,{error:'REQUEST_TOO_LARGE'},origin);
 let body;try{body=await req.json()}catch{return output(400,{error:'INVALID_JSON'},origin)}
 if(!valid(body))return output(400,{error:'INVALID_REQUEST'},origin);
 const cfg=config(env);if(!cfg)return output(503,{error:'AUTH_UNCONFIGURED'},origin);
 const authorization=req.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9._~-]{16,8192}$/.test(authorization))return output(401,{error:'AUTH_REQUIRED'},origin);
 const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),5000);
 let r;try{
 r=await fetchImpl(cfg.url+'/auth/v1/user',{method:'GET',headers:{authorization,apikey:cfg.key,accept:'application/json'},cache:'no-store',signal:ctl.signal});
 }catch{return output(503,{error:'AUTH_PROVIDER_UNAVAILABLE'},origin)}
 finally{clearTimeout(timeout)}
 if(!r.ok)return output(401,{error:'INVALID_SESSION'},origin);
 let user;try{user=await r.json()}catch{return output(401,{error:'INVALID_SESSION'},origin)}
 if(!user||typeof user.id!=='string'||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i).test(user.id)||user.is_anonymous===true)return output(401,{error:'INVALID_SESSION'},origin);
 return output(503,{error:'SERVICE_DISABLED',authVerified:true,paidRequestsAttempted:0},origin);
}
export default {fetch:handle};
