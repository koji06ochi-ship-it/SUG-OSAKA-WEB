/* S.u.G WALK R7 - AI connector (OFF by default).
 * Never place AI provider keys in browser. Backend must authenticate users and
 * enforce an atomic monthly shared budget before enabling this connector.
 */
(function(){
'use strict';
const MAX_CHARS=500;
const labels={
 ja:{title:'AIに自由に質問（実接続待ち）',placeholder:'観光・交通・道案内について質問',send:'AIに質問する',offline:'AI通信は停止中です。安全なサーバー接続と費用上限の確認後に利用できます。',invalid:'質問は500文字以内で入力してください。',error:'AIへの接続に失敗しました。料金が発生する処理を再試行していません。'},
 en:{title:'Ask the AI (not connected)',placeholder:'Ask about Osaka sightseeing or directions',send:'Ask AI',offline:'AI is off until secure server authentication and spending limits are configured.',invalid:'Enter a question (up to 500 characters).',error:'AI connection failed. The request was not automatically retried.'},
 zh:{title:'向AI提问（尚未连接）',placeholder:'询问大阪观光或交通信息',send:'向AI提问',offline:'完成安全身份验证和预算上限配置前，AI服务保持关闭。',invalid:'请输入500字以内的问题。',error:'AI连接失败，未自动重试。'}
};
function mount(root, lang){
 if(!root)return;
 const t=labels[lang]||labels.ja;
 const panel=document.createElement('section');panel.style.cssText='margin-top:18px;border-top:1px solid #74415d;padding-top:10px';
 const title=document.createElement('h3');title.textContent=t.title;panel.append(title);
 const prompt=document.createElement('textarea');prompt.rows=3;prompt.maxLength=MAX_CHARS;prompt.placeholder=t.placeholder;
 prompt.style.cssText='box-sizing:border-box;width:100%;padding:10px;color:white;background:#151326;border:1px solid #ff007f;border-radius:9px';panel.append(prompt);
 const send=document.createElement('button');send.type='button';send.textContent=t.send;
 send.style.cssText='margin-top:8px;border:1px solid #ff007f;border-radius:9px;background:#28142c;color:white;padding:10px;width:100%';panel.append(send);
 const output=document.createElement('p');output.style.cssText='white-space:pre-wrap;line-height:1.5;font-size:12px';output.setAttribute('aria-live','polite');panel.append(output);
 const cfg=window.SUGR7AIService;
 // Explicitly gate on server-approved settings; no auto-probe, no secret in source.
 const enabled=!!(cfg&&cfg.enabled===true&&cfg.serverHardCapConfirmed===true&&
    typeof cfg.endpoint==='string'&&/^\/api\/walk-ai$/.test(cfg.endpoint));
 if(!enabled){send.disabled=true;send.style.opacity='.5';output.textContent=t.offline;}
 send.addEventListener('click',async()=>{
  if(!enabled)return;
  const text=prompt.value.trim();
  if(!text||text.length>MAX_CHARS){output.textContent=t.invalid;return;}
  send.disabled=true;output.textContent='…';
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(cfg.endpoint,{
    method:'POST',headers:{'Content-Type':'application/json'},
    credentials:'same-origin',cache:'no-store',signal:controller.signal,
    body:JSON.stringify({question:text,language:lang})
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