/* Local experience collection only; never grants spendable COIN or discounts. */
(function(){
'use strict';
const KEY='sug_walk_r7_discovery_diary_v1';
const GOAL='sug_walk_r7_personal_step_goal_v1';
const day=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function read(){const raw=localStorage.getItem(KEY);if(raw===null)return [];const a=JSON.parse(raw);if(!Array.isArray(a))throw Error('INVALID_DIARY');return a;}
function discover(character,spot){
 if(typeof character!=='string'||!character||character.length>50||typeof spot!=='string'||!spot||spot.length>100)return 'invalid';
 try{const a=read(),d=day();if(a.some(x=>x?.day===d&&x.character===character&&x.spot===spot))return 'duplicate';
 a.unshift({day:d,character,spot});localStorage.setItem(KEY,JSON.stringify(a));return 'saved';}catch{return 'error';}
}
function goal(){try{const n=Number(localStorage.getItem(GOAL));return Number.isInteger(n)&&n>=100&&n<=100000?n:null;}catch{return null;}}
function setGoal(n){if(!Number.isInteger(n)||n<100||n>100000)return false;try{localStorage.setItem(GOAL,String(n));return true;}catch{return false;}}
function mount(root,steps){
 const el=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});
 const render=()=>{
  root.replaceChildren(el('h3','WALK REWARDS｜歩いたご褒美'));
  const target=goal(),n=steps();
  const p=el('p',target===null?'自分の歩数目標を設定しよう。':!Number.isSafeInteger(n)||n<0?'目標 '+target.toLocaleString('ja-JP')+'歩｜歩数未取得':'目標 '+target.toLocaleString('ja-JP')+'歩｜'+Math.floor(n/target*100)+'%'+(n>=target?' 達成！':''));
  root.append(p);
  const input=document.createElement('input');input.type='number';input.min='100';input.max='100000';input.step='1';input.placeholder='1日の歩数目標';input.value=target??'';input.className='form-input';input.setAttribute('aria-label','1日の歩数目標');
  const save=el('button','目標を保存');save.type='button';save.className='cta-pink';save.onclick=()=>{if(setGoal(Number(input.value)))render();else p.textContent='100〜100,000の整数を入力してください。保存できない場合は端末設定を確認してください。';};root.append(input,save,el('h4','キャラクターとの出会い'));
  try{const a=read().filter(x=>x&&typeof x.character==='string'&&typeof x.spot==='string'&&typeof x.day==='string');root.append(el('p','今日 '+a.filter(x=>x.day===day()).length+'件｜端末内の体験記録'));for(const e of a.slice(0,10))root.append(el('p',e.day+'｜'+e.character+' @ '+e.spot));}catch{root.append(el('p','出会い記録を読み取れません。'));}
  root.append(el('h4','店舗特典'),el('p','店舗承認済み特典はまだ未登録です。割引・交換・COIN付与は未接続。'));
 };
 render();return render;
}
window.SUGR7Rewards=Object.freeze({discover,mount,goal});
})();