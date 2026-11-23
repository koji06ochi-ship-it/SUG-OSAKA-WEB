/* S.u.G WALK R7: isolated SPECIAL overlay, preserving the official five tabs and MAP. */
(function () {
  'use strict';
  var root = document.querySelector('.phone-frame');
  var home = document.getElementById('frame-home');
  if (!root || !home || !window.SUGR7UnifiedBridge) return;
  var style = document.createElement('style');
  style.textContent = [
    '.sug-special-layer{display:none;position:absolute;inset:0;z-index:40;background:#050408;}',
    '.sug-special-layer[data-open="true"]{display:block;}',
    '.sug-special-layer iframe{display:block;width:100%;height:100%;border:0;}',
  ].join('');
  document.head.appendChild(style);
  var layer = document.createElement('section');
  layer.className = 'sug-special-layer';
  layer.setAttribute('data-open', 'false');
  layer.setAttribute('aria-label', 'S.u.G SPECIAL');
  layer.setAttribute('aria-hidden', 'true');
  var frame = document.createElement('iframe');
  frame.title = 'S.u.G SPECIAL';
  frame.setAttribute('allow', 'accelerometer; gyroscope');
  layer.appendChild(frame);
  root.appendChild(layer);
  var originTab = 'home';
  var loaded = false;
  function syncButton(){ /* entry lives inside HOME, not above the five-tab shell */ }
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
  // Reuse the existing MAP controls without changing map logic or fabricating state.
  var mapRouteTicket = 0;
  function activateMapFeature(route) {
    var ticket = ++mapRouteTicket;
    var mapFrame = document.getElementById('frame-map');
    if (!mapFrame) return;
    var targetId = route === 'reel' ? 'btn-neon-flight' : 'btn-neon-offers';
    function tryActivate() {
      if (ticket !== mapRouteTicket || window.SUGR7UnifiedBridge.getActiveTab() !== 'map') return false;
      try {
        var target = mapFrame.contentDocument && mapFrame.contentDocument.getElementById(targetId);
        if (!target || typeof target.onclick !== 'function') return false;
        target.click();
        return true;
      } catch (error) { return false; }
    }
    // Loaded MAP pages are activated after the visible viewport gets two paint frames.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (tryActivate()) return;
        // If MAP is still loading, activate once after the iframe finishes loading.
        mapFrame.addEventListener('load', function onMapLoaded() {
          mapFrame.removeEventListener('load', onMapLoaded);
          if (ticket !== mapRouteTicket) return;
          requestAnimationFrame(function () { requestAnimationFrame(tryActivate); });
        });
      });
    });
  }
  // Attach a seventh tile without replacing the existing Event/SAFE or QUEST cards.
  function mountHomeSpecialCard() {
    var doc;
    try { doc = home.contentDocument; } catch (_) { return false; }
    if (!doc || !doc.body) return false;
    if (doc.getElementById('sug-home-special-card')) return true;
    var labels = Array.from(doc.querySelectorAll('button,a,div,span,strong,p,h2,h3'));
    var eventLabel = labels.find(function (node) {
      return node.children.length === 0 && /イベント\s*[\/／]\s*SAFE/.test(node.textContent || '');
    });
    var grid = null;
    if (eventLabel) {
      for (var parent = eventLabel.parentElement, i = 0; parent && i < 9; parent = parent.parentElement, i++) {
        if (parent.children.length < 3 || parent.children.length > 12) continue;
        var text = (parent.textContent || '').replace(/\s/g, '');
        if (text.includes('AI観光') && text.includes('AI通訳') && text.includes('QUEST')) {
          grid = parent;
          break;
        }
      }
    }
    var tile = doc.createElement('button');
    tile.type = 'button';
    tile.id = 'sug-home-special-card';
    tile.setAttribute('aria-label', 'SPECIALを開く');
    tile.innerHTML = '<span aria-hidden="true" style="font-size:30px">✨</span><strong>SPECIAL</strong>';
    tile.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:150px;width:100%;border:2px solid #ff499f;border-radius:22px;background:linear-gradient(145deg,#280b25,#090712);color:#fff;box-shadow:inset 0 0 20px #ff2e9325,0 0 17px #ff2e9338;font:700 16px -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer';
    tile.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); openSpecial(); });
    if (grid) {
      grid.appendChild(tile);
      return true;
    }
    // Safe fallback: place an in-flow full-width entry inside HOME rather than
    // an overlay that hides an existing card.
    var anchor = labels.find(function (node) {
      return node.children.length === 0 && /R7状態/.test(node.textContent || '');
    });
    if (!anchor) return false;
    var section = anchor;
    for (var j = 0; j < 6 && section.parentElement; j++) {
      if (section.parentElement.children.length >= 2) break;
      section = section.parentElement;
    }
    tile.style.minHeight = '64px';
    tile.style.flexDirection = 'row';
    tile.style.margin = '10px auto';
    tile.style.maxWidth = 'calc(100% - 28px)';
    section.parentElement.insertBefore(tile, section);
    return true;
  }
  home.addEventListener('load', mountHomeSpecialCard);
  try {
    if (home.contentDocument && home.contentDocument.readyState !== 'loading') mountHomeSpecialCard();
  } catch (_) {}
  window.addEventListener('message', function(e){
    if (e.origin !== location.origin || e.source !== frame.contentWindow || !e.data) return;
    if (e.data.type === 'SUG_CLOSE_SPECIAL') { closeSpecial(); return; }
    // The MAP already contains these two real UI entries. Do not synthesize results.
    if (e.data.type === 'SUG_SPECIAL_ROUTE' && (e.data.route === 'reel' || e.data.route === 'live')) {
      frame.contentWindow.postMessage({ type: 'SUG_SPECIAL_ROUTE_HANDLED' }, location.origin);
      closeSpecial();
      window.SUGR7UnifiedBridge.switchTab('map');
      activateMapFeature(e.data.route);
      syncButton();
    }
    // The 'osaka' achievement and 'game' are not yet implemented here.
  });
  // Keep the HOME-only entry in sync when navigation originates in a child iframe.
  window.addEventListener('message', function (event) {
    if (event.origin !== location.origin || !event.data || event.data.type !== 'SUG_SWITCH_TAB') return;
    var knownScreen = ['home', 'map', 'meet', 'log', 'settings'].some(function (key) {
      var target = document.getElementById('frame-' + key);
      return target && target.contentWindow === event.source;
    });
    if (knownScreen) requestAnimationFrame(syncButton);
  });
  var nav = root.querySelector('.preview-nav');
  if(nav) nav.addEventListener('click', function(){requestAnimationFrame(syncButton);});
  // Also synchronize navigation initiated through the public unified bridge API.
  var originalSwitchTab = window.SUGR7UnifiedBridge.switchTab;
  window.SUGR7UnifiedBridge.switchTab = function () {
    var result = originalSwitchTab.apply(this, arguments);
    syncButton();
    return result;
  };
  window.SUGR7SpecialBridge = {open:openSpecial,close:closeSpecial};
  syncButton();
})();
