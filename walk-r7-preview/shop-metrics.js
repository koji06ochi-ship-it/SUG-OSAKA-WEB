/* Local diagnostic only. No user identifiers, GPS, or network transfer. */
(function(){
'use strict';
const KEY='sug_walk_r7_shop_metrics_v1';
const stores=Object.freeze(['大阪茶会','焼肉ホルモン 暸','S.u.G大阪','川の駅はちけんや']);
const events=Object.freeze({detail:'詳細閲覧',instagram:'Instagram誘導',website:'公式サイト誘導',route:'経路案内'});
const has=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const day=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function read(){
 const raw=localStorage.getItem(KEY);
 if(raw===null)return {};
 const v=JSON.parse(raw);
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('INVALID_METRICS');
 return v;
}
function record(place,event){
 if(place?.category!=='shop'||place.approved!==true||!stores.includes(place.name)||!has(events,event))return false;
 try{
  const data=read(), date=day();
  const group=data[date]??(data[date]={});
  const row=group[place.name]??(group[place.name]={});
  const n=row[event]??0;
  if(!Number.isSafeInteger(n)||n<0||n>=Number.MAX_SAFE_INTEGER)return false;
  row[event]=n+1;
  localStorage.setItem(KEY,JSON.stringify(data));
  return true;
 }catch{return false;}
}
function renderReportLink(root){
 const button=document.createElement('button');button.type='button';button.className='drawer-btn';
 button.textContent='店舗効果測定｜この端末の検証集計';
 button.addEventListener('click',()=>{
  const report=document.createElement('section');
  const title=document.createElement('h3');title.textContent='店舗効果測定（端末内・本日）';report.append(title);
  const note=document.createElement('p');note.textContent='全利用者集計ではありません。閲覧・リンク操作の回数であり、人数・来店実績ではありません。動画再生・特典利用は未計測です。';report.append(note);
  let data;
  try{data=read()[day()]??{};}catch{const p=document.createElement('p');p.textContent='保存データを読み取れません。';report.append(p);root.replaceChildren(report);return;}
  for(const name of stores){
   const h=document.createElement('h4');h.textContent=name;report.append(h);
   for(const [key,label] of Object.entries(events)){
    const n=data[name]?.[key]??0;
    const p=document.createElement('p');p.textContent=label+'：'+(Number.isSafeInteger(n)&&n>=0?n:'未確認')+'回';report.append(p);
   }
  }
  root.replaceChildren(report);
 });
 root.append(button);
}
window.SUGR7ShopMetrics=Object.freeze({record,renderReportLink});
})();