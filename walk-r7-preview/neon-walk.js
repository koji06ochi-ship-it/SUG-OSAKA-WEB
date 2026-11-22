/* S.u.G WALK R7 local neon walk segments. No remote location upload.
 * Retains last 365 days / 10,000 accepted segments at most.
 * No raw GPS samples stored unless an accepted walking step was recorded.
 */
(function(root){
 'use strict';
 const KEY='sug_walk_r7_neon_segments_v1',MAX=10000,MAX_AGE=365*86400000;
 function dayKey(ms){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));}
 function validCoord(x){return Array.isArray(x)&&x.length===2&&Number.isFinite(x[0])&&Number.isFinite(x[1])&&x[0]>=134&&x[0]<=137&&x[1]>=33&&x[1]<=36;}
 function validSegment(s){return Array.isArray(s)&&s.length===2&&s.every(validCoord);}
 function read(storage,now=Date.now()){
   try{
     const raw=storage.getItem(KEY);if(!raw)return [];
     const rows=JSON.parse(raw);if(!Array.isArray(rows))return [];
     return rows.filter(x=>x&&typeof x.day==='string'&&/^20\\d{2}-\\d{2}-\\d{2}$/.test(x.day)&&Number.isFinite(Date.parse(x.day+'T00:00:00+09:00'))&&Date.parse(x.day+'T00:00:00+09:00')>now-MAX_AGE&&validSegment(x.line)&&Number.isFinite(x.metres)&&x.metres>0&&x.metres<=300).slice(-MAX);
   }catch{return [];}
 }
 function point(fix){return [Math.round(fix.lng*1e5)/1e5,Math.round(fix.lat*1e5)/1e5];}
 function create(storage,clock=()=>Date.now()){
   let segments=read(storage,clock());
   let view='today';
   function collect(){
     const today=dayKey(clock());return segments.filter(x=>view==='all'||x.day===today);
   }
   function featureCollection(){return {type:'FeatureCollection',features:collect().map(x=>({type:'Feature',properties:{day:x.day},geometry:{type:'LineString',coordinates:x.line}}))};}
   function snapshot(){
     const items=collect();return {view,day:dayKey(clock()),metres:Math.round(items.reduce((n,x)=>n+x.metres,0)),segments:items.length,features:featureCollection()};
   }
   function record(from,to,metres,time){
     if(!from||!to||!Number.isFinite(metres)||metres<4||metres>300||!Number.isFinite(time)||Math.abs(time-clock())>60000)return false;
     const line=[point(from),point(to)];
     if(!validSegment(line)||line[0][0]===line[1][0]&&line[0][1]===line[1][1])return false;
     const next=[...segments,{day:dayKey(time),line,metres:Math.round(metres*100)/100}].slice(-MAX);
     try{storage.setItem(KEY,JSON.stringify(next));segments=next;return true;}catch{return false;}
   }
   function setView(v){if(v!=='today'&&v!=='all')return false;view=v;return true;}
   return {record,setView,snapshot,featureCollection};
 }
 const api={create,read,dayKey};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.SUGR7NeonWalk=api;
})(typeof window!=='undefined'?window:globalThis);
