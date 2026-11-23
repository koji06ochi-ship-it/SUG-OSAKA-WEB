/* R7 sightseeing questions and short text translations over the same-origin API. */
(function(){
'use strict';
const maxChars=500;
const languageNames={ja:'日本語',en:'English',zh:'中文'};
const labels={
 ja:{title:'AI観光案内・通訳',task:'機能',guide:'観光案内',translate:'自由文の翻訳',source:'入力言語',target:'翻訳先',input:'質問または翻訳する文章',send:'送信',off:'AIの自由文応答は停止中です。上の観光案内と定型文通訳を利用できます。',auth:'AIを利用するにはログインしてください。',invalid:'500文字以内で入力してください。',failed:'AIの応答を受け取れませんでした。'},
 en:{title:'AI guide and interpreter',task:'Task',guide:'Sightseeing',translate:'Translate text',source:'Input language',target:'Translate into',input:'Question or text to translate',send:'Send',off:'AI text responses are off. You can use the guide and phrasebook above.',auth:'Sign in to use AI.',invalid:'Enter up to 500 characters.',failed:'No AI response was received.'},
 zh:{title:'AI导览与翻译',task:'功能',guide:'观光导览',translate:'翻译文本',source:'输入语言',target:'目标语言',input:'请输入问题或待翻译文本',send:'发送',off:'AI文本功能已暂停。仍可使用上方的导览和常用短句。',auth:'请登录后使用AI。',invalid:'请输入500字以内的内容。',failed:'未收到AI回复。'}
};
const controlStyle='box-sizing:border-box;width:100%;padding:10px;margin-top:8px;color:white;background:#151326;border:1px solid #ff007f;border-radius:9px;font-size:16px';
function select(label,choices){
 const field=document.createElement('select');field.setAttribute('aria-label',label);field.style.cssText=controlStyle;
 for(const [value,name] of Object.entries(choices))field.add(new Option(name,value));
 return field;
}
function mount(root,language,config){
 const t=labels[language]||labels.ja;
 const disabled=config?.aiEnabled!==true;
 const panel=document.createElement('section');panel.style.cssText='margin-top:18px;border-top:1px solid #74415d;padding-top:10px';
 const title=document.createElement('h3');title.textContent=t.title;panel.append(title);
 const task=select(t.task,{sightseeing:t.guide,translation:t.translate});
 const source=select(t.source,languageNames);source.value=language;
 const target=select(t.target,languageNames);
 const prompt=document.createElement('textarea');prompt.rows=3;prompt.maxLength=maxChars;
 prompt.setAttribute('aria-label',t.input);prompt.placeholder=t.input;prompt.style.cssText=controlStyle;
 const send=document.createElement('button');send.type='button';send.textContent=t.send;send.style.cssText=controlStyle;
 const output=document.createElement('p');output.style.cssText='white-space:pre-wrap;line-height:1.5;font-size:12px';
 output.setAttribute('aria-live','polite');if(disabled)output.textContent=t.off;
 function updateTarget(){
  target.hidden=task.value!=='translation';
  for(const option of target.options)option.disabled=option.value===source.value;
  if(target.selectedOptions[0]?.disabled)target.value=Object.keys(languageNames).find(key=>key!==source.value);
 }
 task.addEventListener('change',updateTarget);source.addEventListener('change',updateTarget);updateTarget();
 for(const control of [task,source,target,prompt,send])control.disabled=disabled;
 send.addEventListener('click',async()=>{
  if(disabled||send.disabled)return;
  const token=window.SUGR7Auth.getAccessToken();
  if(!token){output.textContent=t.auth;return;}
  const question=prompt.value.trim();
  if(!question||question.length>maxChars){output.textContent=t.invalid;return;}
  const payload={task:task.value,question,language:source.value};
  if(task.value==='translation')payload.targetLanguage=target.value;
  send.disabled=true;output.textContent='…';
  try{
   const response=await fetch(window.SUGR7Auth.endpoint,{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000),
    body:JSON.stringify(payload)
   });
   if(response.status===401){output.textContent=t.auth;return;}
   if(!response.ok)throw new Error('AI_REQUEST_FAILED');
   const result=await response.json();
   if(typeof result.answer!=='string'||!result.answer.trim()||result.answer.length>3000)
    throw new Error('INVALID_ANSWER');
   output.textContent=result.answer;
  }catch{output.textContent=t.failed;}
  finally{send.disabled=false;}
 });
 panel.append(task,source,target,prompt,send,output);
 root.append(panel);
}
window.SUGR7AIChat={mount};
})();