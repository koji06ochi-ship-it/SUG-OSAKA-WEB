/* R7 existing-account sign-in. The access token lives only in the map page's memory. */
(function(){
'use strict';
const endpoint='/api/walk-ai';
const projectOrigin='https://nnqzxcgkqjnmtzcvorha.supabase.co';
let session=null;
const authListeners=new Set();
function notifyAuthChange(){for(const cb of authListeners){try{cb(!!getAccessToken());}catch{}}}
function onAuthChange(callback){if(typeof callback!=='function')return()=>{};authListeners.add(callback);return()=>authListeners.delete(callback);}
function t(ja,en,zh,lang){return ({ja,en,zh})[lang]||ja;}
async function loadConfig(authorization){
 const token=getAccessToken();
 try{
  const response=await fetch(endpoint+'?clientConfig=1',{
   headers:token?{Authorization:'Bearer '+token}:authorization?{Authorization:authorization}:{},
   credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6000)
  });
  if(!response.ok)return null;
  const data=await response.json();
  if(data.supabaseUrl!==projectOrigin||typeof data.publishableKey!=='string'||
   !/^sb_publishable_[A-Za-z0-9_-]+$/.test(data.publishableKey))return null;
  return {key:data.publishableKey,aiEnabled:data.aiEnabled===true};
 }catch{return null;}
}
async function currentAIConfig(){
 const token=getAccessToken();
 if(!token)return {aiEnabled:false};
 return (await loadConfig('Bearer '+token))||{aiEnabled:false};
}
function getAccessToken(){
 if(session&&session.expiresAt<=Date.now())session=null;
 return session?.accessToken||null;
}
async function mount(root,lang){
 if(!root)return null;
 const section=document.createElement('section');
 section.style.cssText='padding:12px;margin-top:12px;border:1px solid #70415f;border-radius:12px;color:#fff';
 const heading=document.createElement('strong');heading.textContent=t('AIログイン','AI sign in','AI登录',lang);section.append(heading);
 const message=document.createElement('p');message.setAttribute('aria-live','polite');message.style.cssText='font-size:12px;white-space:pre-wrap';
 message.textContent=t('ログイン設定を確認中…','Checking sign-in…','正在检查登录配置…',lang);section.append(message);root.append(section);
 const config=await loadConfig();
 if(!section.isConnected)return null;
 if(!config){
  message.textContent=t('ログインに接続できません。観光案内と定型文通訳は利用できます。',
   'Sign-in is unavailable. The guide and phrasebook are available.',
   '无法连接登录服务。仍可使用导览与常用短句。',lang);
  return null;
 }
 const form=document.createElement('form');
 const email=document.createElement('input');email.type='email';email.name='email';email.autocomplete='username';email.required=true;
 email.placeholder=t('メールアドレス','Email address','电子邮箱',lang);
 const password=document.createElement('input');password.type='password';password.name='password';password.autocomplete='current-password';password.required=true;
 password.placeholder=t('パスワード','Password','密码',lang);
 for(const input of [email,password]){
  input.setAttribute('aria-label',input.placeholder);
  input.style.cssText='box-sizing:border-box;width:100%;padding:10px;margin-top:8px;border-radius:8px;border:1px solid #ff007f;background:#151326;color:white;font-size:16px';
  form.append(input);
 }
 const button=document.createElement('button');button.style.cssText='width:100%;padding:10px;margin-top:8px;border-radius:8px;border:1px solid #ff007f;background:#28142c;color:white';
 form.append(button);section.append(form);
 function render(){
  const loggedIn=!!getAccessToken();
  email.hidden=password.hidden=loggedIn;
  button.type=loggedIn?'button':'submit';
  button.textContent=loggedIn?t('ログアウト','Sign out','退出登录',lang):t('ログイン','Sign in','登录',lang);
  message.textContent=loggedIn?t('ログイン済み','Signed in','已登录',lang):t('既存アカウントでログイン','Sign in with an existing account','使用现有账户登录',lang);
 }
 button.addEventListener('click',async()=>{
  if(button.type!=='button')return;
  const token=getAccessToken();session=null;render();notifyAuthChange();if(!token)return;
  try{
   const response=await fetch(projectOrigin+'/auth/v1/logout?scope=local',{
    method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+token},
    cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)
   });
   if(!response.ok)throw new Error('LOGOUT_UNCONFIRMED');
  }catch{
   if(!session)message.textContent=t('この画面からログアウトしました。サーバー側の解除は未確認です。',
    'Signed out of this page. Server sign-out could not be confirmed.',
    '已退出当前页面。未能确认服务器端退出。',lang);
  }
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(button.disabled||getAccessToken())return;
  button.disabled=true;message.textContent=t('ログインを確認中…','Signing in…','正在登录…',lang);
  try{
   const response=await fetch(projectOrigin+'/auth/v1/token?grant_type=password',{
    method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},
    body:JSON.stringify({email:email.value.trim(),password:password.value}),
    cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)
   });
   if(!response.ok)throw new Error('AUTH_DENIED');
   const data=await response.json();
   if(!section.isConnected)return;
   if(typeof data.access_token!=='string'||!data.access_token||
    typeof data.user?.id!=='string'||data.user.is_anonymous===true||
    !Number.isFinite(data.expires_in)||data.expires_in<=0)throw new Error('INVALID_AUTH_RESPONSE');
   session={accessToken:data.access_token,expiresAt:Date.now()+data.expires_in*1000};
   render();notifyAuthChange();
  }catch{
   message.textContent=t('ログインできませんでした。アカウントと通信状況を確認してください。',
    'Sign-in failed. Check your account and connection.','登录失败，请检查账户及网络。',lang);
  }finally{password.value='';button.disabled=false;}
 });
 render();return config;
}
window.SUGR7Auth={mount,getAccessToken,onAuthChange,loadConfig,endpoint};
})();