/* ============================================================
   S.u.G WALK ミニゲーム 共通のしくみ
   - 画面（キャンバス）・スタート画面・結果画面・むずかしさ選び
   - 音・セリフ・ふきだし・文字エフェクト
   - ピンクマン（仮の絵）とフリーズ乱入
   - アプリへの結果送信
   制作：ぬくもWeb
   ============================================================ */
(function () {
  const SUG = (window.SUG = {});
  let cfg, G;

  /* ---------- キャンバス ---------- */
  const cv = document.createElement("canvas");
  cv.id = "sug-canvas";
  const ctx = cv.getContext("2d");
  window.ctx = ctx;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    window.W = innerWidth; window.H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    window.u = Math.min(W / 10, H / 16);
  }

  /* ---------- 画面の部品 ---------- */
  function buildUI() {
    const c = cfg.color, cd = cfg.colorDark || cfg.color, soft = cfg.colorSoft || "#f3f3f3";
    const st = document.createElement("style");
    st.textContent = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;overflow:hidden;background:${cfg.bg || "#222"};font-family:"Hiragino Maru Gothic ProN","Hiragino Sans","Yu Gothic",sans-serif;-webkit-user-select:none;user-select:none;touch-action:none}
#sug-canvas{position:fixed;inset:0;width:100%;height:100%;display:block}
#sug-hud{position:fixed;left:0;right:0;top:0;display:none;align-items:center;gap:8px;padding:calc(env(safe-area-inset-top) + 10px) 14px 0;pointer-events:none}
.sug-chip{background:rgba(255,255,255,.9);border-radius:999px;padding:6px 12px;font-weight:800;font-size:16px;color:#2b2b3a;box-shadow:0 2px 6px rgba(0,0,0,.12)}
#sug-sound{margin-left:auto;pointer-events:auto;border:0;font-size:18px}
.sug-panel{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top) + 16px) 20px calc(env(safe-area-inset-bottom) + 16px);background:rgba(20,15,30,.4)}
.sug-hidden{display:none!important}
.sug-card{width:min(100%,360px);background:#fff;border-radius:24px;padding:22px 20px;text-align:center;color:#2b2b3a;box-shadow:0 10px 30px rgba(0,0,0,.25);max-height:100%;overflow:auto}
.sug-card h1{margin:4px 0 2px;font-size:27px;color:${c};line-height:1.25}
.sug-sub{margin:0 0 12px;font-size:13px;color:#888}
.sug-how{text-align:left;background:${soft};border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.7}
.sug-how b{color:${c}}
.sug-levels{display:flex;gap:6px;margin-top:14px}
.sug-lv{flex:1;padding:10px 4px;border:2px solid #ddd;border-radius:14px;background:#fff;font-size:15px;font-weight:800;color:#999}
.sug-lv small{display:block;font-size:10px;font-weight:600;margin-top:2px}
.sug-lv.on{background:${c};border-color:${c};color:#fff}
.sug-btn{display:block;width:100%;margin-top:14px;padding:16px;border:0;border-radius:999px;background:${c};color:#fff;font-size:20px;font-weight:800;box-shadow:0 5px 0 ${cd}}
.sug-btn:active{transform:translateY(3px);box-shadow:0 2px 0 ${cd}}
.sug-btn.sub2{background:#fff;color:${c};border:2px solid ${c};box-shadow:none;margin-top:10px;padding:12px;font-size:16px}
.sug-big{font-size:52px;font-weight:900;color:${c};margin:6px 0 0}
.sug-title{font-size:28px;font-weight:900;margin:0}
.sug-credit{margin-top:12px;font-size:11px;color:#aaa}`;
    document.head.appendChild(st);
    document.body.prepend(cv);
    document.body.insertAdjacentHTML("beforeend", `
<div id="sug-hud"><span class="sug-chip" id="sug-time"></span><span class="sug-chip" id="sug-score"></span><span class="sug-chip" id="sug-lives"></span><button class="sug-chip" id="sug-sound" aria-label="音のオン・オフ">🔊</button></div>
<div class="sug-panel" id="sug-start"><div class="sug-card">
  <h1>${cfg.title}</h1><p class="sug-sub">主役：${cfg.charName}</p>
  <div class="sug-how">${cfg.howHtml}<br>・<span id="sug-rule"></span></div>
  <div class="sug-levels" id="sug-levels"></div>
  <button class="sug-btn" id="sug-startBtn">スタート</button>
  <div class="sug-credit">制作：ぬくもWeb</div></div></div>
<div class="sug-panel sug-hidden" id="sug-result"><div class="sug-card">
  <p class="sug-title" id="sug-resTitle"></p><p class="sug-big" id="sug-resScore"></p><p class="sug-sub" id="sug-resDetail"></p>
  <button class="sug-btn" id="sug-retryBtn">もう一度あそぶ</button>
  <button class="sug-btn sub2" id="sug-levelBtn">むずかしさを変える</button>
  <div class="sug-credit">制作：ぬくもWeb</div></div></div>`);
  }
  const $ = id => document.getElementById(id);

  /* ---------- むずかしさ ---------- */
  function setLevel(k) {
    SUG.lvKey = k; window.D = cfg.levels[k];
    try { localStorage.setItem(cfg.gameId + "-level", k); } catch (e) {}
    $("sug-levels").innerHTML = Object.entries(cfg.levels).map(([key, l]) =>
      `<button class="sug-lv${key === k ? " on" : ""}" data-k="${key}">${l.name}<small>${l.note}</small></button>`).join("");
    $("sug-rule").textContent = cfg.rule(D);
  }

  /* ---------- 音 ---------- */
  SUG.actx = null; SUG.soundOn = true;
  SUG.beep = function (freq, len = 0.1, type = "sine", vol = 0.15, slide = 0, when = 0) {
    const a = SUG.actx; if (!SUG.soundOn || !a) return;
    const o = a.createOscillator(), g = a.createGain(), t = (when || a.currentTime);
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + len);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + len + 0.02);
  };
  SUG.noise = function (len = 0.2, vol = 0.25, when = 0, hp = 0) {
    const a = SUG.actx; if (!SUG.soundOn || !a) return;
    const n = Math.floor(a.sampleRate * len), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
    const s = a.createBufferSource(), g = a.createGain(); g.gain.value = vol; s.buffer = buf;
    let node = s;
    if (hp) { const f = a.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp; s.connect(f); node = f; }
    node.connect(g).connect(a.destination); s.start(when || a.currentTime);
  };

  /* ---------- セリフ（同じものが続かない） ---------- */
  SUG.LINES = { freeze: ["なんやねん！", "なんやねん！", "呼んだ？", "おじゃましま〜す！", "ピース！"] };
  const lastLine = {};
  SUG.pick = function (kind) {
    const list = SUG.LINES[kind]; let t;
    do { t = list[Math.floor(Math.random() * list.length)]; } while (list.length > 1 && t === lastLine[kind]);
    return (lastLine[kind] = t);
  };

  /* ---------- エフェクト ---------- */
  SUG.fx = [];
  SUG.text = (x, y, txt, col = "#2b2b3a", size = 0.5, life = 0.7) => SUG.fx.push({ type: "text", x, y, txt, col, size, life, max: life });
  SUG.star = (x, y, col = "#ffd23f", life = 0.35) => SUG.fx.push({ type: "star", x, y, col, life, max: life });
  function updateFx(dt) {
    for (const e of SUG.fx) { e.life -= dt; if (e.type === "text") e.y -= u * 1.0 * dt; }
    SUG.fx = SUG.fx.filter(e => e.life > 0);
  }
  SUG.drawFx = function () {
    for (const e of SUG.fx) {
      ctx.globalAlpha = Math.min(1, e.life * 2.5);
      if (e.type === "text") {
        ctx.font = `900 ${u * e.size}px sans-serif`; ctx.textAlign = "center"; ctx.lineJoin = "round";
        ctx.lineWidth = 5; ctx.strokeStyle = "#fff"; ctx.strokeText(e.txt, e.x, e.y); ctx.fillStyle = e.col; ctx.fillText(e.txt, e.x, e.y);
      } else if (e.type === "star") {
        const r = u * (0.5 + (e.max - e.life) * 3);
        ctx.fillStyle = e.col; ctx.beginPath();
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr); }
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };
  /* ランク：score が max（ほぼ満点）の何割か。 S / A / B / C */
  SUG.rank = function (score, max, th = [0.75, 0.55, 0.35]) { const r = score / max; return r >= th[0] ? "S" : r >= th[1] ? "A" : r >= th[2] ? "B" : "C"; };
  SUG.roundRect = function (x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };
  SUG.bubble = function (x, y, txt, size = 0.42) {
    ctx.font = `800 ${u * size}px sans-serif`; ctx.textAlign = "center";
    const w = ctx.measureText(txt).width + u * 0.6;
    x = Math.max(w / 2 + 6, Math.min(W - w / 2 - 6, x));
    ctx.fillStyle = "#fff"; SUG.roundRect(x - w / 2, y - u * size * 1.1, w, u * size * 1.7, u * 0.3); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.15)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#2b2b3a"; ctx.fillText(txt, x, y + u * size * 0.15);
  };
  SUG.bigText = function (txt, x, y, size, col) {
    ctx.font = `900 ${u * size}px sans-serif`; ctx.textAlign = "center"; ctx.lineJoin = "round";
    ctx.lineWidth = u * size * 0.2; ctx.strokeStyle = "#fff"; ctx.strokeText(txt, x, y); ctx.fillStyle = col; ctx.fillText(txt, x, y);
  };

  /* ---------- 公式画像（あれば仮の絵のかわりに使う） ---------- */
  // config.images に { pinkman: "img/pinkman.png", ... } のように書くだけで差しかえできる。空なら仮の絵。
  SUG.img = {};
  SUG.imgOK = n => { const i = SUG.img[n]; return !!(i && i.complete && i.naturalWidth); };
  SUG.drawImg = function (name, x, y, h, ang = 0, flip = 1) {            // x,y=足もと  h=高さ
    const i = SUG.img[name], w = h * i.naturalWidth / i.naturalHeight;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(flip, 1); ctx.drawImage(i, -w / 2, -h, w, h); ctx.restore();
  };

  /* ピンクマンの画像を、場面に合わせて選ぶ（無ければ pinkman.png、それも無ければ仮の絵） */
  SUG.pinkVariant = function (o) {
    const ok = SUG.imgOK;
    if (o.muscle && ok("pinkmanMuscle")) return "pinkmanMuscle";                   // ムキムキ
    if (o.hair === "seaweed" && ok("pinkmanWet")) return "pinkmanWet";              // 川に落ちて海藻をかぶった
    if (o.face === "surprised" && ok("pinkmanSurprised")) return "pinkmanSurprised"; // びっくり・ずっこけ
    if (o.face === "happy" && ok("pinkmanCheer")) return "pinkmanCheer";            // うれしい・ガッツポーズ
    if (o.face === "sad") { if (ok("pinkmanSad")) return "pinkmanSad"; if (ok("pinkmanSurprised")) return "pinkmanSurprised"; }
    return "pinkman";
  };

  /* ---------- ピンクマン（仮の絵。公式画像が届いたら差しかえ） ---------- */
  // o: face("", "sad", "happy", "surprised") / hands: [[x,y],[x,y]]（u単位） / legs: 走る角度 / muscle / hair("seaweed","afro") / noGlasses
  SUG.drawPinkman = function (x, y, ang = 0, o = {}) {
    const s = u * (o.scale || 1);
    if (SUG.imgOK("pinkman")) {                                             // 公式画像があるとき
      SUG.drawImg(SUG.pinkVariant(o), x, y, s * 2.7, ang); return;
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.strokeStyle = "#e8418f"; ctx.lineWidth = s * 0.22; ctx.lineCap = "round";
    const lg = o.legs || 0;
    ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.8); ctx.lineTo(-s * 0.32 + Math.sin(lg) * s * 0.35, 0);
    ctx.moveTo(s * 0.2, -s * 0.8); ctx.lineTo(s * 0.32 - Math.sin(lg) * s * 0.35, 0); ctx.stroke();
    ctx.fillStyle = "#ff5fa2";
    if (o.muscle) { SUG.roundRect(-s * 0.7, -s * 1.8, s * 1.4, s * 1.1, s * 0.4); ctx.fill(); }
    else { SUG.roundRect(-s * 0.45, -s * 1.65, s * 0.9, s * 0.95, s * 0.3); ctx.fill(); }
    const hands = o.hands || [[-0.8, -1.0], [0.8, -1.0]];
    const sh = o.muscle ? 0.62 : 0.4;
    for (let i = 0; i < 2; i++) {
      const sx = (i ? 1 : -1) * s * sh, sy = -s * 1.5, hx = hands[i][0] * s, hy = hands[i][1] * s;
      if (o.muscle) {
        ctx.strokeStyle = "#ffc9a8"; ctx.lineWidth = s * 0.42;
        const mx = (sx + hx) / 2 + (i ? 1 : -1) * s * 0.25, my = (sy + hy) / 2;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(mx, my); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.fillStyle = "#ffc9a8"; ctx.beginPath(); ctx.arc(mx, my - s * 0.12, s * 0.33, 0, 7); ctx.fill();   // 力こぶ
      } else {
        ctx.strokeStyle = "#e8418f"; ctx.lineWidth = s * 0.22;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
      }
    }
    SUG.drawHead(0, -s * 2.15, s * 0.55, o);
    ctx.restore();
  };
  SUG.pinkHead = function (x, y, r, o = {}) {                                // 頭だけ見せたいとき（水の中・どアップ）
    if (SUG.imgOK("pinkman")) { const s = r / 0.55; SUG.drawImg(SUG.pinkVariant(o), x, y + s * 2.15, s * 2.7); return; }
    SUG.drawHead(x, y, r, o);
  };
  SUG.drawHead = function (x, y, r, o = {}) {
    ctx.fillStyle = "#ffc9a8"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (o.hair === "afro") {
      ctx.fillStyle = "#2a1a10";
      for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.95, y - r * 0.2 + Math.sin(a) * r * 0.95, r * 0.45, 0, 7); ctx.fill(); }
      ctx.beginPath(); ctx.arc(x, y - r * 0.75, r * 0.7, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.55, r * 0.25, r * 0.12, -0.5, 0, 7); ctx.fill();
    }
    if (o.noGlasses) {
      ctx.fillStyle = "#3b2a3a"; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.05, r * 0.09, 0, 7); ctx.arc(x + r * 0.3, y - r * 0.05, r * 0.09, 0, 7); ctx.fill();
    } else SUG.drawGlasses(x, y - r * 0.08, r);
    ctx.strokeStyle = "#a3475f"; ctx.lineWidth = r * 0.1; ctx.beginPath();
    const f = o.face || "";
    if (f === "sad") { ctx.arc(x, y + r * 0.55, r * 0.22, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    else if (f === "surprised") { ctx.fillStyle = "#a3475f"; ctx.beginPath(); ctx.ellipse(x, y + r * 0.42, r * 0.13, r * 0.18, 0, 0, 7); ctx.fill(); }
    else if (f === "happy") { ctx.fillStyle = "#a3475f"; ctx.beginPath(); ctx.arc(x, y + r * 0.28, r * 0.3, 0.1, Math.PI - 0.1); ctx.closePath(); ctx.fill(); }
    else { ctx.arc(x, y + r * 0.3, r * 0.25, 0.2, Math.PI - 0.2); ctx.stroke(); }
    if (o.hair === "seaweed") {
      ctx.strokeStyle = "#2f8a3a"; ctx.lineWidth = r * 0.16; ctx.lineCap = "round";
      for (let i = -4; i <= 4; i++) { const sx = x + i * r * 0.2, sy = y - r * 0.95 + Math.abs(i) * r * 0.06, sw = Math.sin(performance.now() / 200 + i) * r * 0.15;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + i * r * 0.2 + sw, sy + r * 0.6, sx + i * r * 0.28 + sw, sy + r * 1.1); ctx.stroke(); }
    }
  };
  SUG.drawGlasses = function (x, y, r) {
    ctx.fillStyle = "#1c1c24";
    SUG.roundRect(x - r * 0.72, y - r * 0.2, r * 0.62, r * 0.38, r * 0.12); ctx.fill();
    SUG.roundRect(x + r * 0.1, y - r * 0.2, r * 0.62, r * 0.38, r * 0.12); ctx.fill();
    ctx.fillRect(x - r * 0.12, y - r * 0.12, r * 0.24, r * 0.08);
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(x - r * 0.6, y - r * 0.13, r * 0.18, r * 0.07); ctx.fillRect(x + r * 0.22, y - r * 0.13, r * 0.18, r * 0.07);
  };

  /* ---------- フリーズ乱入 ---------- */
  let freezeAt, freezeT, freezeDone, freezeLine;
  function drawFreeze() {
    const t = freezeT;
    ctx.fillStyle = "rgba(60,60,70,.45)"; ctx.fillRect(0, 0, W, H);
    if (t < 0.7) {
      for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.4})`; ctx.fillRect(0, Math.random() * H, W, Math.random() * 6 + 1); }
      ctx.fillStyle = "#fff"; ctx.font = `800 ${u * 0.5}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("……あれ？ 止まった？", W / 2, H * 0.4);
      return;
    }
    const inK = Math.min(1, (t - 0.7) / 0.35), outK = t > 2.4 ? (t - 2.4) / 0.4 : 0;
    const r = Math.min(W, H) * 0.32, y = H + r - inK * r * 2.0 + outK * r * 2.4;
    ctx.save(); ctx.translate(W / 2, y); ctx.rotate(Math.sin(t * 10) * 0.05);
    if (SUG.imgOK("pinkman")) { SUG.drawImg("pinkman", 0, r * 3.2, r * 4.6); }
    else {
      ctx.fillStyle = "#ff5fa2"; ctx.beginPath(); ctx.ellipse(0, r * 1.3, r * 1.1, r * 0.8, 0, 0, 7); ctx.fill();
      SUG.drawHead(0, 0, r, {});
      ctx.fillStyle = "#ffc9a8"; ctx.beginPath(); ctx.arc(r * 1.05, r * 0.1, r * 0.22, 0, 7); ctx.fill();
      ctx.strokeStyle = "#ffc9a8"; ctx.lineWidth = r * 0.12; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(r * 1.0, 0); ctx.lineTo(r * 0.9, -r * 0.45); ctx.moveTo(r * 1.12, 0); ctx.lineTo(r * 1.25, -r * 0.42); ctx.stroke();
    }
    ctx.restore();
    if (t > 1.05 && t < 2.4) {
      ctx.save(); const sc = 1 + Math.max(0, 0.3 - (t - 1.05)) * 2; ctx.translate(W / 2, H * 0.2); ctx.scale(sc, sc);
      SUG.bigText(freezeLine, 0, 0, 1.0, "#e8418f"); ctx.restore();
    }
  }

  /* ---------- 入力（タップ・スワイプ） ---------- */
  let pdown = null;
  function onDown(e) {
    e.preventDefault();
    if (SUG.phase !== "play") return;
    pdown = { x: e.clientX, y: e.clientY, t: performance.now(), swiped: false, id: e.pointerId };
    G.down && G.down({ x: e.clientX, y: e.clientY, side: e.clientX < W / 2 ? -1 : 1 });
  }
  function onMove(e) {
    if (!pdown || pdown.swiped || SUG.phase !== "play") return;
    const dx = e.clientX - pdown.x, dy = e.clientY - pdown.y;
    if (Math.hypot(dx, dy) > 30) {
      pdown.swiped = true;
      const dir = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? "down" : "up") : (dx > 0 ? "right" : "left");
      G.swipe && G.swipe(dir);
    }
  }
  function onUp(e) {
    if (!pdown) return;
    const p = pdown; pdown = null;
    if (SUG.phase === "play" && !p.swiped) G.tap && G.tap({ x: p.x, y: p.y, side: p.x < W / 2 ? -1 : 1 });
  }

  /* ---------- 進行 ---------- */
  SUG.phase = "title";
  SUG.playT = 0;
  SUG.score = 0;
  let sent, last;
  function start() {
    if (!SUG.actx) { try { SUG.actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (SUG.actx && SUG.actx.state === "suspended") SUG.actx.resume();
    SUG.fx = []; SUG.playT = 0; SUG.score = 0; sent = false;
    const fr = cfg.freeze || { min: 10, max: 28 };
    freezeAt = fr.off ? 1e9 : fr.min + Math.random() * (fr.max - fr.min); freezeDone = false; freezeLine = SUG.pick("freeze");
    G.reset();
    $("sug-start").classList.add("sug-hidden"); $("sug-result").classList.add("sug-hidden"); $("sug-hud").style.display = "flex";
    SUG.phase = "play";
    SUG.beep(523, 0.1); setTimeout(() => SUG.beep(784, 0.15), 110);
    G.started && G.started();
  }
  SUG.finish = function (clear, title, detail) {
    if (SUG.phase === "end") return;
    SUG.phase = "end";
    $("sug-resTitle").textContent = title || (clear ? "クリア！" : "おしい！");
    $("sug-resTitle").style.color = clear ? cfg.color : "#5a6b8c";
    $("sug-resScore").textContent = Math.floor(SUG.score) + "点";
    let best = 0;
    try { const k = cfg.gameId + "-best-" + SUG.lvKey; best = Math.max(+localStorage.getItem(k) || 0, Math.floor(SUG.score)); localStorage.setItem(k, best); } catch (e) {}
    $("sug-resDetail").textContent = `${D.name}　${detail || ""}　ベスト ${best}点`;
    setTimeout(() => { $("sug-result").classList.remove("sug-hidden"); $("sug-hud").style.display = "none"; }, 500);
    if (!sent) {
      sent = true;
      const data = { gameId: cfg.gameId, score: Math.floor(SUG.score), result: clear ? "clear" : "fail", level: SUG.lvKey };
      try {
        const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers[cfg.messageHandler || "sugGame"];
        if (h) h.postMessage(data);                                         // iPhoneアプリ（WKWebView）
        else if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(data));
        else if (window.parent !== window) window.parent.postMessage(data, "*");
      } catch (e) {}
      console.log("[result]", data);
    }
  };

  function loop(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    updateFx(dt);
    if (SUG.phase === "play") {
      SUG.playT += dt;
      if (!freezeDone && SUG.playT >= freezeAt && (!G.canFreeze || G.canFreeze())) {
        freezeDone = true; SUG.phase = "freeze"; freezeT = 0; SUG.beep(600, 0.6, "square", 0.1, -500);
        G.freezeStart && G.freezeStart();
      } else G.update(dt);
    } else if (SUG.phase === "freeze") {
      freezeT += dt;
      if (freezeT > 2.8) { SUG.phase = "play"; G.freezeEnd && G.freezeEnd(); }
    } else G.idle && G.idle(dt);
    ctx.clearRect(0, 0, W, H);
    G.draw();
    if (SUG.phase === "freeze") drawFreeze();
    if (SUG.phase === "play" || SUG.phase === "freeze") {
      const h = G.hud();
      $("sug-time").textContent = h.time; $("sug-score").textContent = Math.floor(SUG.score) + "点";
      $("sug-lives").textContent = h.lives || ""; $("sug-lives").style.display = h.lives ? "" : "none";
    }
    requestAnimationFrame(loop);
  }

  /* ---------- はじめる ---------- */
  SUG.setup = function (config, game) {
    cfg = config; G = game;
    for (const k in (cfg.images || {})) if (cfg.images[k]) { const im = new Image(); im.src = cfg.images[k]; SUG.img[k] = im; }
    Object.assign(SUG.LINES, cfg.lines || {});
    buildUI(); resize(); addEventListener("resize", resize);
    let k = cfg.defaultLevel || "normal";
    try { const v = localStorage.getItem(cfg.gameId + "-level"); if (cfg.levels[v]) k = v; } catch (e) {}
    try { const q = new URLSearchParams(location.search).get("level"); if (cfg.levels[q]) k = q; } catch (e) {}   // アプリから index.html?level=hard のように指定できる
    setLevel(k);
    $("sug-levels").addEventListener("click", e => { const b = e.target.closest(".sug-lv"); if (b) setLevel(b.dataset.k); });
    $("sug-startBtn").onclick = start; $("sug-retryBtn").onclick = start;
    $("sug-levelBtn").onclick = () => { $("sug-result").classList.add("sug-hidden"); $("sug-start").classList.remove("sug-hidden"); };
    $("sug-sound").onclick = e => { e.stopPropagation(); SUG.soundOn = !SUG.soundOn; $("sug-sound").textContent = SUG.soundOn ? "🔊" : "🔇"; G.soundChanged && G.soundChanged(SUG.soundOn); };
    cv.addEventListener("pointerdown", onDown);
    addEventListener("pointermove", onMove);
    addEventListener("pointerup", onUp);
    addEventListener("pointercancel", onUp);
    addEventListener("keydown", e => {
      if (SUG.phase !== "play") return;
      const map = { ArrowLeft: -1, ArrowRight: 1 };
      if (G.key) G.key(e.key);
      else if (e.key in map || e.key === " ") { const side = map[e.key] || 1; G.down && G.down({ side, x: W / 2 + side, y: H / 2 }); G.tap && G.tap({ side, x: W / 2 + side, y: H / 2 }); }
    });
    G.reset();
    requestAnimationFrame(loop);
  };
  SUG.start = start;
})();
