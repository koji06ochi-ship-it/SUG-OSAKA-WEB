import {activeFeed, PROFILE} from './stories-core.mjs';
const root=document.querySelector('#sug-stories');
if (root) {
  const trigger=root.querySelector('button');
  const dialog=document.querySelector('#sug-story-viewer');
  const stage=dialog.querySelector('.sug-story-stage');
  const count=dialog.querySelector('[data-count]');
  const previous=dialog.querySelector('[data-prev]');
  const next=dialog.querySelector('[data-next]');
  let feed=null, items=[], index=0, timer, previousOverflow='';
  function close(){if(dialog.open) dialog.close();}
  function render(){
    clearTimeout(timer);
    stage.querySelector('video')?.pause();
    stage.replaceChildren();
    const story=items[index];
    if(!story){close();return;}
    count.textContent=`${index+1} / ${items.length}`;
    previous.disabled=index===0;
    next.textContent=index===items.length-1?'閉じる':'次へ';
    const advance=()=>{if(index+1<items.length){index++;render();}else close();};
    if(story.media_url){
      const media=document.createElement(story.media_type==='VIDEO'?'video':'img');
      if(story.media_type==='VIDEO'){
        media.controls=true;media.playsInline=true;media.preload='metadata';
        media.muted=true;media.autoplay=true;
        if(story.thumbnail_url) media.poster=story.thumbnail_url;
        media.addEventListener('ended',advance);
      }else{
        media.alt='S.u.G OSAKAのInstagramストーリー';
        media.addEventListener('load',()=>{if(!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setTimeout(advance,7000);});
      }
      media.addEventListener('error',()=>{clearTimeout(timer);stage.replaceChildren();fallback();});
      media.src=story.media_url;stage.append(media);
    }else fallback();
  }
  function fallback(){const p=document.createElement('p');p.textContent='このストーリーはInstagramでご覧ください。';stage.append(p);}
  function refreshActive(){
    const current=items[index]?.id;
    const updated=activeFeed(feed);
    const changed=JSON.stringify(updated)!==JSON.stringify(items);
    items=updated;root.hidden=!items.length;
    if(!items.length){close();return;}
    if(dialog.open&&changed){index=Math.max(0,items.findIndex(s=>s.id===current));render();}
  }
  async function load(){
    if(document.hidden)return;
    try{
      const r=await fetch(root.dataset.feed,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10000)});
      if(!r.ok)throw Error();feed=await r.json();
    }catch{feed=null;}
    refreshActive();
  }
  trigger.addEventListener('click',()=>{refreshActive();if(!items.length)return;index=0;previousOverflow=document.body.style.overflow;dialog.showModal();document.body.style.overflow='hidden';render();});
  previous.addEventListener('click',()=>{if(index>0){index--;render();}});
  next.addEventListener('click',()=>{if(index+1<items.length){index++;render();}else close();});
  dialog.querySelector('[data-close]').addEventListener('click',close);
  dialog.addEventListener('close',()=>{clearTimeout(timer);stage.querySelector('video')?.pause();stage.replaceChildren();document.body.style.overflow=previousOverflow;trigger.focus();});
  dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight')next.click();if(e.key==='ArrowLeft')previous.click();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);stage.querySelector('video')?.pause();}else{refreshActive();load();}});
  dialog.querySelector('[data-instagram]').href=PROFILE;
  setInterval(refreshActive,1000);
  setInterval(load,60000);
  load();
}
