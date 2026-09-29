const btn=document.getElementById("menuBtn");
const nav=document.getElementById("nav");

const syncMenuState = (open) => {
  nav?.classList.toggle("open", open);
  document.body.classList.toggle("mobile-menu-open", open);
  if (btn) {
    btn.textContent = open ? "CLOSE" : "MENU";
    btn.setAttribute("aria-expanded", String(open));
  }
};

btn?.setAttribute("aria-expanded","false");

btn?.addEventListener("click", () => {
  syncMenuState(!(nav?.classList.contains("open")));
});

nav?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
  syncMenuState(false);
}));

window.addEventListener("resize", () => {
  if (window.innerWidth > 760) syncMenuState(false);
});


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


// ===== EKO MINI GUIDE =====
(() => {
  const guide = document.getElementById("eko-guide");
  const rider = document.getElementById("eko-rider");
  const talk = document.getElementById("eko-talk");
  const close = document.getElementById("eko-close");
  const message = document.getElementById("eko-message");
  if (!guide || !rider || !talk || !message) return;

  const chime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [0, 0.11].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = i === 0 ? 880 : 1320;
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.07, now + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.10);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.11);
      });
      setTimeout(() => ctx.close(), 500);
    } catch (_) {}
  };

  const openGuide = () => {
    guide.classList.add("is-open");
    talk.setAttribute("aria-hidden", "false");
  };

  const closeGuide = () => {
    guide.classList.remove("is-open");
    talk.setAttribute("aria-hidden", "true");
  };

  rider.addEventListener("click", () => {
    chime();
    if (guide.classList.contains("is-open")) {
      closeGuide();
    } else {
      message.textContent = "どこ行く？ 三輪車で案内するよ。";
      openGuide();
    }
  });

  close?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeGuide();
  });

  document.querySelectorAll("[data-eko-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.ekoTarget);
      if (!target) return;

      chime();
      message.textContent = button.dataset.ekoMessage || "到着！";
      openGuide();

      document.querySelectorAll(".eko-arrival").forEach(el => el.classList.remove("eko-arrival"));
      target.classList.add("eko-arrival");

      target.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      window.setTimeout(() => {
        target.classList.remove("eko-arrival");
      }, 2600);
    });
  });
})();


// ===== EKO BUBBLE HARD FIX =====
(() => {
  const guide = document.getElementById("eko-guide");
  const rider = document.getElementById("eko-rider");
  const talk = document.getElementById("eko-talk");
  const message = document.getElementById("eko-message");
  const close = document.getElementById("eko-close");
  if (!guide || !rider || !talk || !message) return;

  const forceOpen = (text) => {
    if (text) message.textContent = text;
    guide.classList.add("is-open");
    talk.setAttribute("aria-hidden","false");
    talk.style.display = "block";
  };

  const forceClose = () => {
    guide.classList.remove("is-open");
    talk.setAttribute("aria-hidden","true");
    talk.style.display = "none";
  };

  rider.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (guide.classList.contains("is-open")) {
      forceClose();
    } else {
      forceOpen("どこ行く？ BODY・QUEST・予約を案内するよ。");
    }
  }, true);

  close?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    forceClose();
  }, true);

  document.querySelectorAll("[data-eko-target]").forEach((button) => {
    button.addEventListener("click", () => {
      forceOpen(button.dataset.ekoMessage || "到着！");
    }, true);
  });
})();


// ===== SAMURAI WALKER =====
(() => {
  const walker = document.getElementById("samurai-walker");
  const image = document.getElementById("samurai-walker-img");
  if (!walker || !image) return;

  walker.addEventListener("click", () => {
    walker.classList.remove("is-reacting");
    void walker.offsetWidth;
    walker.classList.add("is-reacting");
    setTimeout(() => walker.classList.remove("is-reacting"), 650);
  });

  const quest = document.getElementById("quest");
  if (!quest || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        walker.classList.toggle("is-questing", entry.isIntersecting);
      });
    },
    { threshold: 0.18 }
  );

  observer.observe(quest);
})();


// ===== IPHONE FORM MASCOT HIDE =====
(() => {
  const formSection = document.getElementById("contact-form");
  if (!formSection || !("IntersectionObserver" in window)) return;

  const mq = window.matchMedia("(max-width: 700px)");
  const sync = (inside) => {
    if (!mq.matches) {
      document.body.classList.remove("mobile-form-zone");
      return;
    }
    document.body.classList.toggle("mobile-form-zone", inside);
  };

  const observer = new IntersectionObserver(
    entries => entries.forEach(entry => sync(entry.isIntersecting)),
    { threshold: 0.12 }
  );

  observer.observe(formSection);
  mq.addEventListener?.("change", () => {
    if (!mq.matches) document.body.classList.remove("mobile-form-zone");
  });
})();
