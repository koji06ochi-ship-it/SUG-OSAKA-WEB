const btn=document.getElementById("menuBtn");
const nav=document.getElementById("nav");

btn?.addEventListener("click",()=>nav?.classList.toggle("open"));
nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));


// ===== SUG MOTION 2026-09-29 =====
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const targets = [
    ...document.querySelectorAll(
      "section > h2, .v2-flow article, .v2-tool-card, .v2-result-grid figure, .priceRow, .questWords span, .accessPanel, .linePanel"
    )
  ];

  targets.forEach((el, index) => {
    el.classList.add("sug-reveal");
    if (index % 3 === 1) el.classList.add("sug-from-left");
    if (index % 3 === 2) el.classList.add("sug-from-right");
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    targets.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  targets.forEach(el => observer.observe(el));
})();
