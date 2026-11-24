(function(){
'use strict';
const $=id=>document.getElementById(id);
const auth=window.SUGR7Auth;
const labels=Object.freeze({detail:'店舗詳細閲覧',instagram:'Instagram誘導',website:'公式サイト誘導',route:'徒歩経路案内',video_play:'動画再生',reward_redeemed:'特典利用'});
const keys=Object.keys(labels);
const origin='https://nnqzxcgkqjnmtzcvorha.supabase.co';
let sequence=0, config=null;
function status(s){$('status').textContent=s;}
function clearReport(){$('report').hidden=true;$('cards').replaceChildren();$('rows').replaceChildren();$('store').replaceChildren();}
function jstDay(d=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
function startDay(end,period){if(period==='month')return end.slice(0,7)+'-01';const d=new Date(end+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-Number(period)+1);return d.toISOString().slice(0,10);}
async function get(table,params,token){
 if(!config?.key||!token)throw Error('AUTH_REQUIRED');
 const u=new URL(origin+'/rest/v1/'+table);
 Object.entries(params).forEach(([k,v])=>u.searchParams.append(k,v));
 const response=await fetch(u,{headers:{apikey:config.key,Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('DATA_UNAVAILABLE_'+response.status);
 const data=await response.json();if(!Array.isArray(data))throw Error('BAD_DATA');return data;
}
function valid(id){return typeof id==='string'&&/^[a-z0-9-]{1,64}$/.test(id);}
function count(n){if(typeof n==='number'&&Number.isSafeInteger(n)&&n>=0)return BigInt(n);if(typeof n==='string'&&/^\d{1,19}$/.test(n))return BigInt(n);throw Error('BAD_COUNT');}
function cell(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
function fmt(n){return n===undefined?'未取得':n.toLocaleString('ja-JP');}
async function refresh(){
 const run=++sequence,token=auth.getAccessToken(),store=$('store').value,period=$('period').value;
 $('cards').replaceChildren();$('rows').replaceChildren();
 if(!token||!valid(store)){clearReport();status('ログインまたは店舗権限を確認してください。');return;}
 const end=jstDay(),start=startDay(end,period);status('集計取得中…');
 try{
  const data=await get('r7_store_daily',{select:'store_id,day_jst,metric,total',store_id:'eq.'+store,day_jst:'gte.'+start,and:'(day_jst.lte.'+end+')',order:'day_jst.desc',limit:'200'},token);
  if(run!==sequence||auth.getAccessToken()!==token)return;
  const sums=new Map(),days=new Map(),seen=new Set();
  for(const r of data){
   if(r.store_id!==store||!keys.includes(r.metric)||typeof r.day_jst!=='string'||r.day_jst<start||r.day_jst>end||!/^\d{4}-\d{2}-\d{2}$/.test(r.day_jst))throw Error('BAD_ROW');
   const k=r.day_jst+':'+r.metric;if(seen.has(k))throw Error('DUPLICATE_ROW');seen.add(k);
   const n=count(r.total);sums.set(r.metric,(sums.get(r.metric)||0n)+n);
   if(!days.has(r.day_jst))days.set(r.day_jst,new Map());days.get(r.day_jst).set(r.metric,n);
  }
  for(const k of keys){const card=document.createElement('article');card.className='metric';card.append(cell('small',labels[k]),cell('strong',fmt(sums.get(k))),cell('span',sums.has(k)?'回／件':'計測データなし'));$('cards').append(card);}
  for(const [day,metrics] of days){const row=document.createElement('tr');row.append(cell('td',day),...['detail','route','video_play','reward_redeemed'].map(k=>cell('td',fmt(metrics.get(k)))));$('rows').append(row);}
  $('report-title').textContent=$('store').selectedOptions[0].textContent+'｜'+start+' ～ '+end;
  status(data.length?'集計取得済み（登録済み集計行のみ）':'集計データはまだ登録されていません。');
 }catch{if(run===sequence){$('cards').replaceChildren();$('rows').replaceChildren();status('集計を取得できません。権限・DB接続を確認してください。');}}
}
async function loadStores(signedIn){
 const run=++sequence;clearReport();
 if(!signedIn){status('店舗担当者のアカウントでログインしてください。');return;}
 const token=auth.getAccessToken();status('店舗閲覧権限を確認中…');
 try{
  config=await auth.loadConfig();if(run!==sequence)return;
  const stores=await get('r7_store_directory',{select:'store_id,display_name',active:'eq.true',order:'display_name',limit:'100'},token);
  if(run!==sequence||auth.getAccessToken()!==token)return;
  for(const s of stores){if(!valid(s.store_id)||typeof s.display_name!=='string')continue;const option=cell('option',s.display_name);option.value=s.store_id;$('store').append(option);}
  if(!$('store').options.length){status('閲覧できる店舗がありません。担当者権限の登録が必要です。');return;}
  $('report').hidden=false;await refresh();
 }catch{if(run===sequence)status('店舗情報に接続できません。DB未適用または権限・通信エラーです。');}
}
$('refresh').addEventListener('click',refresh);$('store').addEventListener('change',refresh);$('period').addEventListener('change',refresh);
if(!auth){status('認証コードを読み込めません。');return;}
auth.onAuthChange(loadStores);
auth.mount($('auth'),'ja').then(c=>{if(!c)status('ログイン設定に接続できません。');else if(!auth.getAccessToken())status('店舗担当者のアカウントでログインしてください。');}).catch(()=>status('認証画面を表示できません。'));
})();