/* S.u.G WALK R7: isolated SPECIAL overlay, preserving the official five tabs and MAP. */
(function () {
  'use strict';
  var root = document.querySelector('.phone-frame');
  var home = document.getElementById('frame-home');
  if (!root || !home || !window.SUGR7UnifiedBridge) return;
  var style = document.createElement('style');
  style.textContent = [
    '.sug-special-open{position:absolute;z-index:28;right:14px;bottom:88px;border:1px solid #ff6ec4;border-radius:18px;background:#17071c;color:#fff;font:800 13px -apple-system,BlinkMacSystemFont,sans-serif;padding:10px 17px;box-shadow:0 0 16px #ff2e9390;cursor:pointer;}',
    '.sug-special-layer{display:none;position:absolute;inset:0;z-index:40;background:#050408;}',
    '.sug-special-layer[data-open="true"]{display:block;}',
    '.sug-special-layer iframe{display:block;width:100%;height:100%;border:0;}',
    '.sug-special-open[hidden]{display:none!important;}'
  ].join('');
  document.head.appendChild(style);
  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'sug-special-open';
  button.textContent = '✨ SPECIAL';
  button.setAttribute('aria-label', 'SPECIALを開く');
  var layer = document.createElement('section');
  layer.className = 'sug-special-layer';
  layer.setAttribute('data-open', 'false');
  layer.setAttribute('aria-label', 'S.u.G SPECIAL');
  layer.setAttribute('aria-hidden', 'true');
  var frame = document.createElement('iframe');
  frame.title = 'S.u.G SPECIAL';
  frame.setAttribute('allow', 'accelerometer; gyroscope');
  layer.appendChild(frame);
  root.appendChild(button);
  root.appendChild(layer);
  var originTab = 'home';
  var loaded = false;
  function syncButton(){button.hidden = window.SUGR7UnifiedBridge.getActiveTab() !== 'home' || layer.dataset.open === 'true';}
  function openSpecial(){
    originTab=window.SUGR7UnifiedBridge.getActiveTab();
    if (!loaded) {frame.src = 'special.html';loaded=true;}
    layer.dataset.open='true';layer.setAttribute('aria-hidden','false');syncButton();
  }
  function closeSpecial(){
    layer.dataset.open='false';layer.setAttribute('aria-hidden','true');
    window.SUGR7UnifiedBridge.switchTab(originTab);
    syncButton();
  }
  button.addEventListener('click', openSpecial);
  window.addEventListener('message', function(e){
    if (e.origin !== location.origin || e.source !== frame.contentWindow || !e.data) return;
    if (e.data.type === 'SUG_CLOSE_SPECIAL') closeSpecial();
    /* SPECIAL routes remain unconnected: never invent GPS, achievements, LIVE or game results. */
  });
  var nav = root.querySelector('.preview-nav');
  if(nav) nav.addEventListener('click', function(){requestAnimationFrame(syncButton);});
  window.SUGR7SpecialBridge = {open:openSpecial,close:closeSpecial};
  syncButton();
})();
