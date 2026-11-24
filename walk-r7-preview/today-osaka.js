/* Shared JST event classification; local CMS is preview-only. */
(function(){
'use strict';
const KEY='sug_walk_r7_events_cms_v1';
function time(s){
 if(typeof s!=='string')return NaN;
 const x=s.trim();
 if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(x))return Date.parse(x.replace(' ','T')+'+09:00');
 if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(x))return Date.parse(x);
 return NaN;
}
function bounds(now){const d=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));const start=Date.parse(d+'T00:00:00+09:00');return [start,start+86400000];}
function classify(e,now=Date.now()){
 if(!e||typeof e.title!=='string'||!e.title.trim()||e.status!=='published')return null;
 const s=time(e.startAt||e.startsAt),t=time(e.endAt||e.endsAt);
 if(!Number.isFinite(s)||!Number.isFinite(t)||t<=s||t<=now)return null;
 const [,end]=bounds(now);
 return s<=now?'live':s<end?'today':s<end+7*86400000?'soon':null;
}
function local(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.filter(e=>e&&typeof e==='object').map(e=>({...e,localPreview:true})):[];}catch{return [];}}
function groups(items,now=Date.now()){const g={live:[],today:[],soon:[]};for(const e of items){const k=classify(e,now);if(k)g[k].push(e);}for(const a of Object.values(g))a.sort((a,b)=>time(a.startAt||a.startsAt)-time(b.startAt||b.startsAt));return g;}
window.SUGR7Today=Object.freeze({time,classify,local,groups});
})();