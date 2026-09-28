const btn=document.getElementById("menuBtn");
const nav=document.getElementById("nav");

btn?.addEventListener("click",()=>nav?.classList.toggle("open"));
nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));

const feed=document.getElementById("instagram-feed");
const latestSection=document.getElementById("latest");
const INSTAGRAM_PROFILE_URL="https://www.instagram.com/ko_ji.sug/";
const INSTAGRAM_JSON_URL="data/instagram.json";

function formatInstagramDate(value){
  if(!value) return "";
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP",{
    year:"numeric",
    month:"2-digit",
    day:"2-digit"
  }).format(date);
}

function createInstagramCard(post){
  const link=document.createElement("a");
  link.className="instagramCard";
  link.href=post.permalink || INSTAGRAM_PROFILE_URL;
  link.target="_blank";
  link.rel="noopener noreferrer";

  const media=document.createElement("div");
  media.className="instagramMedia";

  const src=post.media_type==="VIDEO"
    ? (post.thumbnail_url || post.media_url)
    : post.media_url;

  if(src){
    const img=document.createElement("img");
    img.src=src;
    img.alt=post.caption ? post.caption.slice(0,80) : "S.u.G OSAKA Instagram投稿";
    img.loading="lazy";
    img.decoding="async";
    media.appendChild(img);
  }

  if(post.media_type==="VIDEO"){
    const badge=document.createElement("span");
    badge.className="instagramType";
    badge.textContent="REEL / VIDEO";
    media.appendChild(badge);
  }else if(post.media_type==="CAROUSEL_ALBUM"){
    const badge=document.createElement("span");
    badge.className="instagramType";
    badge.textContent="CAROUSEL";
    media.appendChild(badge);
  }

  const body=document.createElement("div");
  body.className="instagramCardBody";

  const date=document.createElement("time");
  date.className="instagramDate";
  date.textContent=formatInstagramDate(post.timestamp);

  const caption=document.createElement("p");
  caption.className="instagramCaption";
  const text=(post.caption || "Instagramで最新情報を見る").trim();
  caption.textContent=text.length>110 ? text.slice(0,110)+"…" : text;

  const more=document.createElement("span");
  more.className="instagramMore";
  more.textContent="INSTAGRAMで見る →";

  body.append(date,caption,more);
  link.append(media,body);
  return link;
}

function showInstagramFallback(){
  if(!feed) return;
  feed.replaceChildren();

  const fallback=document.createElement("div");
  fallback.className="instagramFallback";

  const label=document.createElement("span");
  label.textContent="INSTAGRAM";

  const title=document.createElement("strong");
  title.textContent="最新情報はInstagramで更新しています。";

  const link=document.createElement("a");
  link.href=INSTAGRAM_PROFILE_URL;
  link.target="_blank";
  link.rel="noopener noreferrer";
  link.textContent="@ko_ji.sug を見る →";

  fallback.append(label,title,link);
  feed.appendChild(fallback);
}

async function loadInstagramFeed(){
  if(!feed || !latestSection) return;

  try{
    const response=await fetch(INSTAGRAM_JSON_URL,{cache:"no-store"});
    if(!response.ok) throw new Error("Instagram feed unavailable");

    const payload=await response.json();
    const posts=Array.isArray(payload) ? payload : payload.data;

    if(!Array.isArray(posts) || posts.length===0){
      showInstagramFallback();
      return;
    }

    const grid=document.createElement("div");
    grid.className="instagramGrid";

    posts.slice(0,6).forEach(post=>{
      grid.appendChild(createInstagramCard(post));
    });

    const profileLink=document.createElement("a");
    profileLink.className="instagramProfileLink";
    profileLink.href=INSTAGRAM_PROFILE_URL;
    profileLink.target="_blank";
    profileLink.rel="noopener noreferrer";
    profileLink.textContent="Instagramでさらに見る →";

    feed.replaceChildren(grid,profileLink);
    feed.classList.add("isLoaded");
  }catch(error){
    console.info("Instagram feed fallback:",error.message);
    showInstagramFallback();
  }
}

loadInstagramFeed();
