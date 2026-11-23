/* R7 sightseeing questions and short text translations over the same-origin API. */
(function(){
'use strict';
const maxChars=500;
const speechLocales={ja:'ja-JP',en:'en-US',zh:'zh-CN'};
const languageNames={ja:'日本語',en:'English',zh:'中文'};
const labels={
 ja:{title:'Gemini AI観光案内・通訳',task:'機能',guide:'観光案内',translate:'自由文の翻訳',source:'入力言語',target:'翻訳先',input:'質問または翻訳する文章',send:'送信',off:'登録済みスポット・定型文はこの入力欄から使えます（AI生成は停止中）。',auth:'AIを利用するにはログインしてください。',invalid:'500文字以内で入力してください。',failed:'AIの応答を受け取れませんでした。'},
 en:{title:'Gemini AI guide and interpreter',task:'Task',guide:'Sightseeing',translate:'Translate text',source:'Input language',target:'Translate into',input:'Question or text to translate',send:'Send',off:'Saved places and phrases work here without AI. Generative AI is not enabled.',auth:'Sign in to use AI.',invalid:'Enter up to 500 characters.',failed:'No AI response was received.'},
 zh:{title:'Gemini AI导览与翻译',task:'功能',guide:'观光导览',translate:'翻译文本',source:'输入语言',target:'目标语言',input:'请输入问题或待翻译文本',send:'发送',off:'可在此查询已收录的景点和常用短句（AI生成尚未启用）。',auth:'请登录后使用AI。',invalid:'请输入500字以内的内容。',failed:'未收到AI回复。'}
};
const controlStyle='box-sizing:border-box;width:100%;padding:10px;margin-top:8px;color:white;background:#151326;border:1px solid #ff007f;border-radius:9px;font-size:16px';
function select(label,choices){
 const field=document.createElement('select');field.setAttribute('aria-label',label);field.style.cssText=controlStyle;
 for(const [value,name] of Object.entries(choices))field.add(new Option(name,value));
 return field;
}
function mount(root,language,config){
 const t=labels[language]||labels.ja;
 let enabled=config?.aiEnabled===true;
 const panel=document.createElement('section');panel.style.cssText='margin-top:18px;border-top:1px solid #74415d;padding-top:10px';
 const title=document.createElement('h3');title.textContent=t.title;panel.append(title);
 const task=select(t.task,{sightseeing:t.guide,translation:t.translate});
 const source=select(t.source,languageNames);source.value=language;
 const target=select(t.target,languageNames);
 const prompt=document.createElement('textarea');prompt.rows=3;prompt.maxLength=maxChars;
 prompt.setAttribute('aria-label',t.input);prompt.placeholder=t.input;prompt.style.cssText=controlStyle;
 const send=document.createElement('button');send.type='button';send.textContent=t.send;send.style.cssText=controlStyle;
 const output=document.createElement('p');output.style.cssText='white-space:pre-wrap;line-height:1.5;font-size:12px';
 const speak=document.createElement('button');speak.type='button';
 speak.textContent=language==='en'?'Read answer':language==='zh'?'朗读回答':'回答を読み上げる';
 speak.style.cssText=controlStyle;
 const stop=document.createElement('button');stop.type='button';
 stop.textContent=language==='en'?'Stop reading':language==='zh'?'停止朗读':'読み上げ停止';
 stop.style.cssText=controlStyle;
 function canSpeak(){return 'speechSynthesis' in window&&typeof SpeechSynthesisUtterance!=='undefined';}
 speak.addEventListener('click',()=>{
  if(!canSpeak()||!output.dataset.answer)return;
  speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(output.dataset.answer);
  utterance.lang=speechLocales[output.dataset.language]||speechLocales.ja;
  utterance.rate=0.94;speechSynthesis.speak(utterance);
 });
 stop.addEventListener('click',()=>{if(canSpeak())speechSynthesis.cancel();});
 function showAnswer(text,answerLanguage,spokenText=text){
  if(canSpeak())speechSynthesis.cancel();
  output.textContent=text;
  output.dataset.answer=spokenText;
  output.dataset.language=answerLanguage;
  speak.hidden=!canSpeak();
 }
 output.setAttribute('aria-live','polite');if(!enabled)output.textContent=t.off;
 function updateTarget(){
  target.hidden=task.value!=='translation';
  for(const option of target.options)option.disabled=option.value===source.value;
  if(target.selectedOptions[0]?.disabled)target.value=Object.keys(languageNames).find(key=>key!==source.value);
 }
 task.addEventListener('change',updateTarget);source.addEventListener('change',updateTarget);updateTarget();
 // Server-side budget gates own whether paid inference may run.
 // After signing in, recheck status using the actual user JWT rather than cached pre-login status.
 window.SUGR7Auth.onAuthChange(async signedIn=>{
   if(!panel.isConnected)return;
   if(!signedIn){enabled=false;output.textContent=t.off;delete output.dataset.answer;return;}
   const updated=await window.SUGR7Auth.loadConfig();
   if(!panel.isConnected)return;
   enabled=updated?.aiEnabled===true;
   output.textContent=enabled?'':t.off;delete output.dataset.answer;
 });
 send.addEventListener('click',async()=>{
  if(send.disabled)return;
  const question=prompt.value.trim();
  if(!question||question.length>maxChars){output.textContent=t.invalid;delete output.dataset.answer;return;}
  // Paid AI is separate: exact saved places and translated phrases remain usable,
  // even when there is no login or no spending approval.
  const token=window.SUGR7Auth.getAccessToken();
  if(!enabled||!token){
    const reply=window.SUGR7TourGuide?.offlineReply(question,
      task.value==='translation'?target.value:source.value);
    const prefix=language==='en'?'Saved guide / phrase (not AI): ':language==='zh'?
      '已收录导览／短句（非AI）：':'登録済み案内・定型文（AI生成ではありません）：';
    const missing=language==='en'?'No matching saved place or phrase. Arbitrary text translation requires AI.':
      language==='zh'?'没有匹配的已收录景点或短句。任意文本翻译需要AI。':
      '登録済みスポット・定型文に一致しません。自由文翻訳にはAI接続が必要です。';
    if(reply)showAnswer(prefix+reply.text,task.value==='translation'?target.value:source.value,reply.text);
   else {output.textContent=missing;delete output.dataset.answer;}
    return;
  }
  const payload={task:task.value,question,language:source.value};
  if(task.value==='translation')payload.targetLanguage=target.value;
  send.disabled=true;output.textContent='…';delete output.dataset.answer;
  try{
   const response=await fetch(window.SUGR7Auth.endpoint,{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000),
    body:JSON.stringify(payload)
   });
   if(response.status===401){output.textContent=t.auth;return;}
   if(!response.ok){
    const problem=await response.json().catch(()=>({}));
    const code=String(problem.error||problem.code||'');
    if(response.status===503){
     output.textContent=language==='en'?'AI is not enabled on this Preview yet.':language==='zh'?'此预览环境尚未启用 AI。':'このPreviewではAI生成がまだ許可されていません。';
     return;
    }
    if(response.status===429||response.status===402){
     output.textContent=language==='en'?'AI usage limit reached.':language==='zh'?'已达到 AI 使用限制。':'AIの利用上限に達しています。';
     return;
    }
    if(response.status===403){output.textContent=language==='en'?'Request blocked by access policy.':language==='zh'?'访问策略阻止了请求。':'アクセス制限により送信できません。';return;}
    throw new Error('AI_REQUEST_FAILED:'+code);
   }
   const result=await response.json();
   if(typeof result.answer!=='string'||!result.answer.trim()||result.answer.length>3000)
    throw new Error('INVALID_ANSWER');
   showAnswer(result.answer,task.value==='translation'?target.value:source.value);
  }catch{output.textContent=t.failed;delete output.dataset.answer;}
  finally{send.disabled=false;}
 });
 panel.append(task,source,target,prompt,send,output,speak,stop);
 speak.hidden=!canSpeak();
 stop.hidden=!canSpeak();
 root.append(panel);
}
window.SUGR7AIChat={mount};
})();