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
  // Dedicated HOME-only dock in the parent shell: no dependency on iframe DOM or text labels.
  // Reserve its own space above the permanent five-tab navigation; no card overlap.
  var launch = document.createElement('button');
  launch.type = 'button';
  launch.id = 'sug-home-special-entry';
  launch.setAttribute('aria-label', 'SPECIALを開く');
  launch.innerHTML = '<span aria-hidden="true" style="font-size:23px">✨</span><strong>SPECIAL</strong><span aria-hidden="true">›</span>';
  launch.style.cssText = 'position:absolute;left:14px;right:14px;bottom:78px;height:55px;z-index:31;display:flex;align-items:center;justify-content:center;gap:18px;border:1.5px solid #ff54ab;border-radius:17px;background:linear-gradient(105deg,#2b0c26,#09050c 65%,#331022);color:white;box-shadow:0 0 14px #ff2e9355;font:800 16px -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer';
  root.appendChild(launch);
  launch.addEventListener('click', openSpecial);
  var dockStyle = document.createElement('style');
  dockStyle.textContent = '#frame-home.active{bottom:146px;height:calc(100% - 146px)} #sug-home-special-entry[hidden]{display:none!important}';
  document.head.appendChild(dockStyle);
  function syncDock() {
    launch.hidden = window.SUGR7UnifiedBridge.getActiveTab() !== 'home' || layer.dataset.open === 'true';
  }
  syncButton = syncDock;
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
