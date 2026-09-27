const btn=document.getElementById("menuBtn");
const nav=document.getElementById("nav");
btn.addEventListener("click",()=>nav.classList.toggle("open"));
nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));
