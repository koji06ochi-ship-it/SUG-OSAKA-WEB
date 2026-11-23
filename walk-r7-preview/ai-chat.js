/* S.u.G WALK R7 - AI connector (OFF by default).
 * Never place AI provider keys in browser. Backend must authenticate users and
 * enforce an atomic monthly shared budget before enabling this connector.
 */
(function(){
'use strict';
const MAX_CHARS=500;
const labels={
 ja:{title:'AI観光・自由文翻訳（本接続待ち）',placeholder:'観光・交通・道案内について質問／翻訳する文章',send:'AIに送信',offline:'AI通信は停止中です。既存の定型文通訳は上で使用できます。料金上限と認証を実機確認するまで送信しません。',invalid:'入力は500文字以内にしてください。',error:'AIへの接続に失敗しました。自動再試行はしていません。',task:'AIの用途',guide:'大阪観光の質問',translate:'自由文翻訳',target:'翻訳先'},
 en:{title:'Osaka AI / text translation (not connected)',placeholder:'Ask about Osaka or enter text to translate',send:'Send to AI',offline:'AI is off until authentication and spending caps are verified. Pre-translated phrases above still work.',invalid:'Enter up to 500 characters.',error:'AI connection failed. No automatic retry.',task:'AI task',guide:'Osaka sightseeing',translate:'Translate free text',target:'Target language'},
 zh:{title:'大阪观光AI与自由文本翻译（未连接）',placeholder:'输入观光问题或需要翻译的文字',send:'发送给AI',offline:'验证身份认证和费用上限前不启用AI。上方的常用语翻译可以使用。',invalid:'请输入500字以内的文字。',error:'AI连接失败，未自动重试。',task:'AI功能',guide:'大阪观光咨询',translate:'自由文本翻译',target:'目标语言'}
};
function mount(root, lang){
 if(!root)return;
 const t=labels[lang]||labels.ja;
 const panel=document.createElement('section');panel.style.cssText='margin-top:18px;border-top:1px solid #74415d;padding-top:10px';
 const title=document.createElement('h3');title.textContent=t.title;panel.append(title);
 const task=document.createElement('select');task.setAttribute('aria-label',t.task);
 task.style.cssText='width:100%;padding:10px;background:#151326;border:1px solid #ff007f;border-radius:9px;color:#fff;margin-bottom:8px';
 for(const [id,label] of [['sightseeing',t.guide],['translation',t.translate]]){const o=document.createElement('option');o.value=id;o.textContent=label;task.append(o);}
 panel.append(task);
 const target=document.createElement('select');target.setAttribute('aria-label',t.target);
 target.style.cssText=task.style.cssText;target.hidden=true;
 for(const [id,label] of [['ja','日本語'],['en','English'],['zh','中文']]){const o=document.createElement('option');o.value=id;o.textContent=label;target.append(o);}
 target.value=lang==='ja'?'en':'ja';panel.append(target);
 task.addEventListener('change',()=>{target.hidden=task.value!=='translation';});
 const prompt=document.createElement('textarea');prompt.rows=3;prompt.maxLength=MAX_CHARS;prompt.placeholder=t.placeholder;
 prompt.style.cssText='box-sizing:border-box;width:100%;padding:10px;color:white;background:#151326;border:1px solid #ff007f;border-radius:9px';panel.append(prompt);
 const send=document.createElement('button');send.type='button';send.textContent=t.send;
 send.style.cssText='margin-top:8px;border:1px solid #ff007f;border-radius:9px;background:#28142c;color:white;padding:10px;width:100%';panel.append(send);
 const output=document.createElement('p');output.style.cssText='white-space:pre-wrap;line-height:1.5;font-size:12px';output.setAttribute('aria-live','polite');panel.append(output);
 // Existing Supabase users can verify their account, without starting any billed AI.
 // Login state lives only in this tab's memory. The password is cleared after submit.
 const auth=window.SUGR7AuthSession;
 if(auth){
  const authBox=document.createElement('div');
  authBox.style.cssText='margin:12px 0;padding:10px;border:1px solid #70304d;border-radius:10px;background:#100b19';
  const authTitle=document.createElement('p');
  authTitle.textContent=lang==='ja'?'既存アカウントの認証確認（AIは停止中）':lang==='zh'?'验证现有账号（AI尚未启用）':'Existing account check (AI stays off)';
  authBox.append(authTitle);
  const email=document.createElement('input');email.type='email';email.autocomplete='username';
  email.placeholder=lang==='ja'?'登録済みメールアドレス':'Email';
  email.style.cssText='display:block;box-sizing:border-box;width:100%;padding:9px;margin-bottom:7px;color:#fff;background:#151326;border:1px solid #844164;border-radius:8px';
  authBox.append(email);
  const password=document.createElement('input');password.type='password';password.autocomplete='current-password';
  password.placeholder=lang==='ja'?'パスワード':'Password';
  password.style.cssText=email.style.cssText;authBox.append(password);
  const signIn=document.createElement('button');signIn.type='button';
  signIn.textContent=lang==='ja'?'認証を確認':lang==='zh'?'登录验证':'Check sign-in';
  signIn.style.cssText='padding:9px;border:1px solid #ff479f;background:#361129;color:#fff;border-radius:8px';
  const signOut=document.createElement('button');signOut.type='button';
  signOut.textContent=lang==='ja'?'ログアウト':lang==='zh'?'退出':'Sign out';
  signOut.style.cssText='margin-left:8px;padding:9px;border:1px solid #6d5d71;background:#201829;color:#fff;border-radius:8px';
  const authStatus=document.createElement('p');authStatus.setAttribute('aria-live','polite');
  authStatus.style.cssText='font-size:12px;margin:8px 0 0';
  function refreshAuth(){
   authStatus.textContent=auth.isSignedIn()?
    (lang==='ja'?'認証済み。AIの有料機能は未開放です。':lang==='zh'?'认证成功。付费AI仍未启用。':'Authenticated. Paid AI remains disabled.'):
    (lang==='ja'?'未認証（既存ユーザーのみ）':lang==='zh'?'未认证（仅限现有用户）':'Not signed in (existing users only)');
  }
  signIn.addEventListener('click',async()=>{
   if(signIn.disabled)return;
   const mail=email.value,pass=password.value;password.value='';
   signIn.disabled=true;
   authStatus.textContent=lang==='ja'?'認証中…':'Checking…';
   try{await auth.signIn(mail,pass);refreshAuth()}
   catch{authStatus.textContent=lang==='ja'?'認証できませんでした。メールとパスワードを確認してください。':
        lang==='zh'?'验证失败，请检查账号。':'Sign-in failed. Check your credentials.'}
   finally{signIn.disabled=false}
  });
  signOut.addEventListener('click',()=>{auth.signOut();refreshAuth()});
  authBox.append(signIn);authBox.append(signOut);authBox.append(authStatus);
  refreshAuth();panel.append(authBox);
 }
 const cfg=window.SUGR7AIService;
 // Explicitly gate on server-approved settings; no auto-probe, no secret in source.
 const enabled=!!(cfg&&cfg.enabled===true&&cfg.serverHardCapConfirmed===true&&
    typeof cfg.endpoint==='string'&&/^\/api\/walk-ai$/.test(cfg.endpoint)&&
    typeof cfg.getAccessToken==='function');
 if(!enabled){send.disabled=true;send.style.opacity='.5';output.textContent=t.offline;}
 send.addEventListener('click',async()=>{
  if(!enabled)return;
  const text=prompt.value.trim();
  if(!text||text.length>MAX_CHARS){output.textContent=t.invalid;return;}
  send.disabled=true;output.textContent='…';
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   // The host app must provide its existing authenticated session in memory.
   // Never persist or print this token; without one, do not contact the API.
   const token=await cfg.getAccessToken();
   if(typeof token!=='string'||!/^[A-Za-z0-9._~-]{16,8192}$/.test(token))throw Error('LOGIN_REQUIRED');
   const response=await fetch(cfg.endpoint,{
    method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    credentials:'omit',cache:'no-store',signal:controller.signal,
    body:JSON.stringify({task:task.value,question:text,language:lang,...(task.value==='translation'?{targetLanguage:target.value}:{})})
   });
   if(!response.ok)throw Error('request rejected');
   const result=await response.json();
   if(typeof result.answer!=='string'||result.answer.length>3000)throw Error('invalid response');
   output.textContent=result.answer;
  }catch{output.textContent=t.error;}
  finally{clearTimeout(timeout);send.disabled=false;}
 });
 root.append(panel);
}
window.SUGR7AIChat={mount};
})();