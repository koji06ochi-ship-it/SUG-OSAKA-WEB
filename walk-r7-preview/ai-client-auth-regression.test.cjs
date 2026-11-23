/* S.u.G WALK R7 AI session gating regression
 * node walk-r7-preview/ai-client-auth-regression.test.cjs
 * Isolated mock DOM/HTTP: no real token, network, paid API or GPS.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'ai-chat.js'),'utf8');
class El{
 constructor(tag){this.tagName=tag;this.children=[];this.style={};this.listeners={};this.attributes={};this.value='';this.disabled=false;this.hidden=false;this.textContent='';}
 append(...nodes){this.children.push(...nodes)}
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(k,cb){this.listeners[k]=cb}
}
async function run(cfg,question='大阪城',click=false){
 const calls=[];
 const ctx={
  window:{SUGR7AIService:cfg},document:{createElement:tag=>new El(tag)},
  AbortController:class{constructor(){this.signal={}}abort(){}},
  setTimeout:()=>1,clearTimeout:()=>{},
  fetch:async(url,init)=>{calls.push({url,init});return {ok:true,json:async()=>({answer:'MOCK ANSWER'})}}
 };
 new Function(...Object.keys(ctx),src)(...Object.values(ctx));
 const root=new El('main');ctx.window.SUGR7AIChat.mount(root,'ja');
 const panel=root.children[0];
 const send=panel.children.find(x=>x.tagName==='button');
 const prompt=panel.children.find(x=>x.tagName==='textarea');
 const output=panel.children.find(x=>x.tagName==='p');
 prompt.value=question;
 if(click)await send.listeners.click();
 return {send,calls,output:output.textContent};
}
let count=0;
function test(name,fn){fn();count++;console.log('PASS',name)}
(async()=>{
 let r=await run(undefined);
 test('OFF by default',()=>assert.equal(r.send.disabled,true));
 r=await run({enabled:true,serverHardCapConfirmed:true,endpoint:'/api/walk-ai'});
 test('missing token provider keeps OFF',()=>assert.equal(r.send.disabled,true));
 r=await run({enabled:true,serverHardCapConfirmed:true,endpoint:'/api/walk-ai',getAccessToken:async()=>''},'question',true);
 test('invalid session refuses network',()=>assert.equal(r.calls.length,0));
 const token='a'.repeat(40);
 r=await run({enabled:true,serverHardCapConfirmed:true,endpoint:'/api/walk-ai',getAccessToken:async()=>token},'大阪城',true);
 test('valid mock session invokes one request',()=>assert.equal(r.calls.length,1));
 test('authorization header uses memory token',()=>assert.equal(r.calls[0].init.headers.Authorization,'Bearer '+token));
 test('mock answer is displayed',()=>assert.equal(r.output,'MOCK ANSWER'));
 test('no browser persistent token storage',()=>assert.doesNotMatch(src,/localStorage|sessionStorage|indexedDB/));
 test('request remains same-origin API only',()=>assert.equal(r.calls[0].url,'/api/walk-ai'));
 console.log('RESULT '+count+'/'+count+' isolated session tests passed');
})().catch(err=>{console.error(err);process.exitCode=1});
