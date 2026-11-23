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