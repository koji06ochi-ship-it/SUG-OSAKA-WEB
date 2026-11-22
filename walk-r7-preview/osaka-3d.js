/* R7 Osaka MAP - Mapbox Standard 3D Night Upgrade (drop-in for walk-r7-preview/osaka-3d.js).
 * Base commit: 0873b9c33a6583a92c2c5b95815f8afff60b28aa
 * No token, no fabricated GPS/route/metrics, and no unauthorized assets in source.
 */
window.createOsaka3D = function createOsaka3D(ui) {
  'use strict';
  const container = document.getElementById('osaka-3d');
  const toggle = document.getElementById('osaka-toggle');
  const HUB = ui.hub || { lat: 34.690616, lng: 135.514183 };
  const EMPTY = { type: 'FeatureCollection', features: [] };
  const spots = Array.isArray(ui.spots)
    ? ui.spots.filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && typeof p.name === 'string')
    : [];

  let sdkPromise = null;
  let view = null;
  let pending = false;
  let generation = 0;
  let timeout = null;
  let currentMarker = null;
  let spotMarkers = [];
  let highlightedStoreMarkers = [];
  let highlightedStores = [];
  let trace = [];
  let routeCoords = [];
  let bearingAnchor = null;
  let lastFix = null;
  let ready = false;

  // Mapbox Standard v3 runtime basemap configuration (black x neon-pink x midnight-river)
  const BASEMAP_CONFIG = {
    lightPreset: 'night',
    theme: 'default',
    show3dObjects: false,
    show3dFacades: false,
    show3dLandmarks: false,
    colorBuildings: '#ff4fa6',
    colorBuildingHighlight: '#ff3b9a',
    colorBuildingSelect: '#e8b955',
    showPointOfInterestLabels: false,
    showTransitLabels: false,
    showRoadLabels: true,
    colorLand: '#070712',
    colorWater: '#071633',
    colorGreenspace: '#0b1e22',
    colorMotorways: '#ff3b9a',
    colorTrunks: '#d92b82',
    colorRoads: '#262b4f'
  };

  container.dataset.state = 'closed';
  container.dataset.renderedBuildings = 'unverified';
  container.dataset.basemap = 'unverified';
  container.dataset.camera = 'waiting';

  function notify(message) {
    if (typeof ui.notice === 'function') ui.notice(message);
  }

  function isActive() {
    return !!view && !container.hidden;
  }

  function featureLine(coords) {
    return coords.length >= 2
      ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }] }
      : EMPTY;
  }

  function featurePoint(fix) {
    return fix
      ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [fix.lng, fix.lat] } }] }
      : EMPTY;
  }

  function radiusPolygon(center, metres) {
    const n = 72;
    const latRad = center.lat * Math.PI / 180;
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = i * 2 * Math.PI / n;
      const dLat = Math.cos(a) * metres / 111320;
      const dLng = Math.sin(a) * metres / (111320 * Math.cos(latRad));
      out.push([center.lng + dLng, center.lat + dLat]);
    }
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: { radiusMetres: metres }, geometry: { type: 'Polygon', coordinates: [out] } }]
    };
  }

  function updateSource(name, data) {
    if (!ready || !view) return;
    const src = view.getSource(name);
    if (src) src.setData(data);
  }

  function styleMarkers() {
    if (document.getElementById('sug-r7-mapbox-marker-style')) return;
    const css = document.createElement('style');
    css.id = 'sug-r7-mapbox-marker-style';
    css.textContent = [
      '#osaka-3d::before{content:"";position:absolute;inset:0 0 auto 0;height:96px;pointer-events:none;z-index:2;background:linear-gradient(180deg,rgba(4,4,12,.72) 0%,rgba(4,4,12,0) 100%);}',
      '#osaka-3d::after{content:"";position:absolute;inset:auto 0 0 0;height:120px;pointer-events:none;z-index:2;background:linear-gradient(0deg,rgba(4,4,12,.78) 0%,rgba(4,4,12,0) 100%);}',
      '.sug-r7-spot{display:flex;flex-direction:column;align-items:center;gap:3px;padding:0;border:0;background:transparent;cursor:pointer;}',
      '.sug-r7-spot-pill{padding:5px 12px;border:1.3px solid rgba(255,79,166,.92);border-radius:999px;background:rgba(12,6,22,.84);color:#fff;box-shadow:0 0 16px rgba(255,59,154,.48),inset 0 0 8px rgba(255,59,154,.18);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font:700 11.5px -apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:.03em;white-space:nowrap;}',
      '.sug-r7-spot-drop{width:16px;height:20px;filter:drop-shadow(0 0 7px rgba(255,59,154,.95));}',
      '.sug-r7-selected-shop{padding:7px 12px;border:1.5px solid var(--sug-store-color);border-radius:999px;background:rgba(5,5,13,.94);color:var(--sug-store-color);font:700 12px -apple-system,sans-serif;white-space:nowrap;box-shadow:0 0 12px var(--sug-store-color);}',
      '.sug-r7-spot:focus-visible .sug-r7-spot-pill{outline:2px solid #fff;outline-offset:2px;}',
      '.sug-r7-gps-pulse{position:relative;width:22px;height:22px;border:2.5px solid #fff;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff 0%,#ff80c2 55%,#ff2a8d 100%);box-shadow:0 0 16px #ff3b9a,0 0 28px rgba(255,59,154,.85);animation:sug-r7-gps-pulse 1.9s ease-in-out infinite;}',
      '@keyframes sug-r7-gps-pulse{0%,100%{box-shadow:0 0 10px 3px rgba(255,59,154,.55)}50%{box-shadow:0 0 24px 14px rgba(255,59,154,.82)}}'
    ].join('');
    document.head.appendChild(css);
  }

  function clearMarkers() {
    for (const m of highlightedStoreMarkers) m.remove();
    highlightedStoreMarkers = [];
    for (const m of spotMarkers) m.remove();
    spotMarkers = [];
    if (currentMarker) {
      currentMarker.remove();
      currentMarker = null;
    }
  }

  function addSpotMarkers(gl) {
    styleMarkers();
    for (const place of spots) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'sug-r7-spot';
      const pill = document.createElement('span');
      pill.className = 'sug-r7-spot-pill';
      pill.textContent = place.name;
      el.appendChild(pill);
      el.insertAdjacentHTML(
        'beforeend',
        '<svg class="sug-r7-spot-drop" viewBox="0 0 24 30" fill="none" aria-hidden="true">' +
          '<path d="M12 2C6.48 2 2 6.48 2 12c0 6.8 10 16 10 16s10-9.2 10-16c0-5.52-4.48-10-10-10z" fill="#fff" stroke="#ff3b9a" stroke-width="2"/>' +
          '<circle cx="12" cy="11.5" r="3.5" fill="#ff3b9a"/>' +
        '</svg>'
      );
      el.addEventListener('click', e => {
        e.stopPropagation();
        ui.select(place);
      });
      spotMarkers.push(new gl.Marker({ element: el, anchor: 'bottom' }).setLngLat([place.lng, place.lat]).addTo(view));
    }
  }

  // Only explicitly approved, selected stores can receive a colored 3D overlay.
  // No inferred address, footprint, height or shop color is generated.
  function approvedHighlight(p) {
    return p && p.approved === true && p.highlight3D === true &&
      p.category === 'shop' && typeof p.name === 'string' &&
      Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
      Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
  }
  function storeColor(p) {
    return typeof p.highlightColor === 'string' && /^#[0-9a-f]{6}$/i.test(p.highlightColor)
      ? p.highlightColor : '#ff3b9a';
  }
  function approvedFootprint(p) {
    const ring = p.footprint;
    if (!Array.isArray(ring) || ring.length < 4 || ring.length > 100 ||
        !Number.isFinite(p.heightMetres) || p.heightMetres <= 0 || p.heightMetres > 500) return null;
    if (!ring.every(pt => Array.isArray(pt) && pt.length === 2 &&
          pt.every(Number.isFinite) && Math.abs(pt[0] - p.lng) < 0.003 && Math.abs(pt[1] - p.lat) < 0.003)) return null;
    const first = ring[0], last = ring[ring.length - 1];
    return first[0] === last[0] && first[1] === last[1] ? ring : null;
  }
  function selectedBuildings() {
    return {type:'FeatureCollection',features:highlightedStores.flatMap(p => {
      const ring = approvedFootprint(p);
      return ring ? [{type:'Feature',properties:{color:storeColor(p),height:p.heightMetres},
        geometry:{type:'Polygon',coordinates:[ring]}}] : [];
    })};
  }
  function drawHighlightedStores(gl) {
    for(const marker of highlightedStoreMarkers) marker.remove();
    highlightedStoreMarkers=[];
    if(!view) return;
    styleMarkers();
    for(const store of highlightedStores) {
      const el=document.createElement('button');
      el.type='button';
      el.className='sug-r7-spot sug-r7-selected-shop';
      el.style.setProperty('--sug-store-color',storeColor(store));
      el.textContent=store.name;
      el.title=store.name;
      el.addEventListener('click',event=>{event.stopPropagation();ui.select(store);});
      highlightedStoreMarkers.push(new gl.Marker({element:el,anchor:'bottom'})
        .setLngLat([store.lng,store.lat]).addTo(view));
    }
  }
  function setHighlightedStores(stores) {
    highlightedStores=Array.isArray(stores)?stores.filter(approvedHighlight):[];
    if(view && ready) {
      const source=view.getSource('sug-r7-selected-buildings');
      if(source)source.setData(selectedBuildings());
      drawHighlightedStores(window.mapboxgl);
    }
    return highlightedStores.length;
  }

  function close(message) {
    generation++;
    pending = false;
    ready = false;
    clearTimeout(timeout);
    timeout = null;
    clearMarkers();
    if (view) {
      try { view.remove(); } catch (e) {}
    }
    view = null;
    container.hidden = true;
    container.dataset.state = message ? 'fallback-2d' : 'closed';
    container.dataset.renderedBuildings = 'unverified';
    container.dataset.camera = 'closed';
    toggle.textContent = '3D';
    toggle.setAttribute('aria-pressed', 'false');
    if (message) notify(message);
  }

  function loadSDK() {
    if (window.mapboxgl) return Promise.resolve(window.mapboxgl);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const root = 'https://api.mapbox.com/mapbox-gl-js/v3.17.0/';
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = root + 'mapbox-gl.css';
      const js = document.createElement('script');
      js.src = root + 'mapbox-gl.js';
      Promise.all([css, js].map(el => new Promise((ok, fail) => {
        el.onload = ok;
        el.onerror = fail;
        document.head.appendChild(el);
      })))
        .then(() => (window.mapboxgl ? resolve(window.mapboxgl) : reject(Error('Mapbox SDK unavailable'))))
        .catch(err => {
          css.remove();
          js.remove();
          sdkPromise = null;
          reject(err);
        });
    });
    return sdkPromise;
  }

  function applyNightAtmosphere(active) {
    try {
      active.setFog({
        range: [0.8, 7.5],
        'horizon-blend': 0.28,
        color: '#2a0f2e',
        'high-color': '#0b0a1c',
        'space-color': '#04040a',
        'star-intensity': 0.15
      });
    } catch (e) {
      /* setFog optional if unsupported */
    }
  }

  // Mapbox Standard colorBuildings was rendered nearly black on iPhone.
  // Use the documented Streets v8 building source with luminous extrusions instead.
  // Building palette is visual decoration, NOT a verified store-to-building match.
  function addNeonCityBuildings(active) {
    const sourceId = 'sug-r7-neon-streets-buildings';
    const layerId = 'sug-r7-neon-building-extrusions';
    active.addSource(sourceId, {type:'vector',url:'mapbox://mapbox.mapbox-streets-v8'});
    const variety = ['%', ['to-number',['coalesce',['id'],['get','height'],0]], 5];
    active.addLayer({
      id:layerId, type:'fill-extrusion', slot:'top',
      source:sourceId, 'source-layer':'building',
      minzoom:14, filter:['==',['get','extrude'],'true'],
      paint:{
        'fill-extrusion-color':['match',variety,
          0,'#ff4fa6',1,'#04e6ff',2,'#b76aff',3,'#ffd065','#32e8a5'],
        'fill-extrusion-height':['max',8,['to-number',['get','height'],8]],
        'fill-extrusion-base':['to-number',['get','min_height'],0],
        'fill-extrusion-opacity':0.96,
        'fill-extrusion-emissive-strength':0.95,
        'fill-extrusion-vertical-gradient':false
      }
    });
    container.dataset.buildingPalette = 'pink-cyan-violet-gold-mint';
    active.on('idle', () => {
      if (view !== active || !active.getLayer(layerId)) return;
      const count = active.queryRenderedFeatures({layers:[layerId]}).length;
      container.dataset.renderedNeonBuildings = String(count);
    });
  }

  function addGeoLayers(active) {
    const src = (id, data) => active.addSource(id, { type: 'geojson', data });
    const layer = obj => active.addLayer(Object.assign({ slot: 'middle' }, obj));

    src('sug-r7-walk-trace', featureLine(trace));
    src('sug-r7-route', featureLine(routeCoords));
    src('sug-r7-user', featurePoint(lastFix));
    src('sug-r7-arrival-ring', radiusPolygon(HUB, 180));
    // Empty unless a store is explicitly selected AND has a supplied verified footprint + height.
    src('sug-r7-selected-buildings', selectedBuildings());
    active.addLayer({id:'sug-r7-selected-shop-buildings',type:'fill-extrusion',
      slot:'top',source:'sug-r7-selected-buildings',
      paint:{'fill-extrusion-color':['get','color'],
        'fill-extrusion-height':['get','height'],
        'fill-extrusion-base':0,'fill-extrusion-opacity':0.65}});

    // 180m Arrival Zone (subtle neon-pink halo)
    layer({
      id: 'sug-r7-arrival-fill',
      type: 'fill',
      source: 'sug-r7-arrival-ring',
      paint: { 'fill-color': '#ff3b9a', 'fill-opacity': 0.05 }
    });
    layer({
      id: 'sug-r7-arrival-outline',
      type: 'line',
      source: 'sug-r7-arrival-ring',
      paint: {
        'line-color': '#ff4fa6',
        'line-width': ['interpolate', ['linear'], ['zoom'], 14, 1.2, 17, 2.2, 19, 3.2],
        'line-blur': 1.2,
        'line-dasharray': [2, 2],
        'line-opacity': 0.85,
        'line-emissive-strength': 1
      }
    });

    // Zoom-interpolated Neon Pink Walked Trace & Active Walking Route (prevents thick pink bands)
    for (const [id, source, colorCore] of [
      ['trace', 'sug-r7-walk-trace', '#ffd6ee'],
      ['route', 'sug-r7-route', '#9af6ff']
    ]) {
      layer({
        id: 'sug-r7-' + id + '-glow',
        type: 'line',
        source,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': id === 'route' ? '#38e8ff' : '#ff3b9a',
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 14, 4, 17, 9, 19, 14],
          'line-blur': 5,
          'line-opacity': 0.55,
          'line-emissive-strength': 1
        }
      });
      layer({
        id: 'sug-r7-' + id + '-core',
        type: 'line',
        source,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': colorCore,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 14, 1.4, 17, 2.8, 19, 4.4],
          'line-opacity': 0.98,
          'line-emissive-strength': 1
        }
      });
    }

    // Glowing GPS Current Position Halo & Dot
    layer({
      id: 'sug-r7-gps-halo',
      type: 'circle',
      source: 'sug-r7-user',
      paint: {
        'circle-color': '#ff3b9a',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 12, 17, 22, 19, 28],
        'circle-blur': 0.85,
        'circle-opacity': 0.72,
        'circle-emissive-strength': 1
      }
    });
    layer({
      id: 'sug-r7-gps-dot',
      type: 'circle',
      source: 'sug-r7-user',
      paint: {
        'circle-color': '#fff2fa',
        'circle-radius': 6.5,
        'circle-stroke-color': '#ff3b9a',
        'circle-stroke-width': 2.8,
        'circle-emissive-strength': 1
      }
    });
  }

  function errorText(err) {
    const message = String((err && (err.message || (err.error && err.error.message) || err)) || '');
    if (/401|403|unauthorized|forbidden|invalid token|access token/i.test(message)) {
      return 'Mapbox認証エラー（トークン・URL制限を確認）。2Dに戻しました。';
    }
    if (/webgl|context|gpu/i.test(message)) {
      return 'WebGL描画エラー。2Dに戻しました。';
    }
    if (!navigator.onLine || /network|fetch|offline|failed to load/i.test(message)) {
      return 'Mapbox通信エラー（オフライン・接続制限）。2Dに戻しました。';
    }
    return '3D地図の読み込みエラー。2Dに戻しました。';
  }

  function resize() {
    if (!isActive()) return false;
    requestAnimationFrame(() => {
      if (view && !container.hidden && container.clientWidth > 0 && container.clientHeight > 0) {
        view.resize();
      }
    });
    return true;
  }

  function destination(place) {
    if (!view || !place || !Number.isFinite(place.lng) || !Number.isFinite(place.lat)) return;
    view.easeTo({ center: [place.lng, place.lat], pitch: 68, duration: 600 });
  }

  function position(current, heading, follow) {
    if (!current || !Number.isFinite(current.lat) || !Number.isFinite(current.lng)) return;
    const coords = [current.lng, current.lat];
    if (
      !lastFix ||
      Math.hypot(
        (current.lng - lastFix.lng) * 111320 * Math.cos(current.lat * Math.PI / 180),
        (current.lat - lastFix.lat) * 111320
      ) >= 2
    ) {
      trace.push(coords);
      if (trace.length > 500) trace.shift();
    }
    lastFix = current;

    if (view && ready) {
      if (!currentMarker) {
        styleMarkers();
        const el = document.createElement('div');
        el.className = 'sug-r7-gps-pulse';
        currentMarker = new window.mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(view);
      } else {
        currentMarker.setLngLat(coords);
      }
    }

    updateSource('sug-r7-user', featurePoint(current));
    updateSource('sug-r7-walk-trace', featureLine(trace));

    if (!view || !ready || !follow) return;
    let bearing = Number.isFinite(heading) ? heading : null;
    const previous = (heading && typeof heading === 'object' && Number.isFinite(heading.lat)) ? heading : bearingAnchor;
    if (bearing === null && previous && Number.isFinite(previous.lat) && Number.isFinite(previous.lng)) {
      const east = (current.lng - previous.lng) * 111320 * Math.cos(current.lat * Math.PI / 180);
      const north = (current.lat - previous.lat) * 111320;
      if (Math.hypot(east, north) >= Math.max(4, current.accuracy || 0, previous.accuracy || 0)) {
        bearing = Math.atan2(east, north) * 180 / Math.PI;
        bearingAnchor = current;
      }
    }
    if (!bearingAnchor) bearingAnchor = current;

    const camera = { center: coords, pitch: 68, duration: 650, essential: true };
    if (bearing !== null) camera.bearing = bearing;
    view.easeTo(camera);
  }

  function route(coordinates) {
    // Only actual supplied route geometry is drawn. No invented walking directions.
    routeCoords = Array.isArray(coordinates)
      ? coordinates.filter(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))
      : [];
    updateSource('sug-r7-route', featureLine(routeCoords));
  }

  async function open() {
    if (pending || view) return;
    const token = window.SUGMapboxPublicToken;
    if (typeof token !== 'string' || !/^pk\.[A-Za-z0-9._-]+$/.test(token)) {
      close('Mapbox公開トークンが未設定です。2D地図を表示します。');
      return;
    }
    if (window.SUGMapboxFreeTierConfirmed !== true) {
      close('Mapbox利用条件の確認が必要です。2D地図を表示します。');
      return;
    }
    if (!navigator.onLine) {
      close('オフラインのため3Dを起動できません。2D地図を表示します。');
      return;
    }

    const id = ++generation;
    pending = true;
    ready = false;
    container.dataset.state = 'loading';
    container.dataset.reason = '';
    timeout = setTimeout(() => {
      if (generation === id) close('3D地図の読み込みがタイムアウトしました。2Dに戻しました。');
    }, 20000);

    try {
      const gl = await loadSDK();
      if (generation !== id) return;
      if (!gl.supported()) {
        close('この端末ではWebGLが利用できません。2Dに戻しました。');
        return;
      }
      container.hidden = false;
      view = new gl.Map({
        container,
        accessToken: token,
        style: 'mapbox://styles/mapbox/standard',
        config: { basemap: BASEMAP_CONFIG },
        // Look along Okawa River from Hachikenyahama toward Nakanoshima skyline
        center: [HUB.lng, HUB.lat],
        zoom: 16.9,
        pitch: 68,
        bearing: -68,
        maxPitch: 78,
        antialias: true
      });

      const active = view;
      active.on('error', e => {
        if (active !== view) return;
        const msg = String((e && e.error && e.error.message) || '');
        if (
          !ready ||
          /401|403|unauthorized|forbidden|invalid token|network|fetch|offline|webgl|context lost/i.test(msg) ||
          !navigator.onLine
        ) {
          close(errorText(e.error));
        }
      });
      active.on('webglcontextlost', () => {
        if (active === view) close('WebGL描画が停止しました。2Dに戻しました。');
      });
      active.on('dragstart', () => {
        if (active === view) ui.pauseFollow();
      });
      active.on('rotatestart', e => {
        if (active === view && e.originalEvent) ui.pauseFollow();
      });
      active.on('click', e => ui.select({ name: '選んだ地点', lat: e.lngLat.lat, lng: e.lngLat.lng }));

      active.once('style.load', () => {
        if (active !== view) return;
        try {
          for (const [key, val] of Object.entries(BASEMAP_CONFIG)) {
            try {
              active.setConfigProperty('basemap', key, val);
            } catch (e) {
              /* Ignore unsupported config tokens in older style revisions */
            }
          }
          // Disable Standard's dark buildings so they cannot occlude custom neon extrusions.
          active.setConfigProperty('basemap','show3dObjects',false);
          container.dataset.buildingColorRequested = 'five-color-vector-extrusions';
          applyNightAtmosphere(active);
          addNeonCityBuildings(active);
          addGeoLayers(active);
          addSpotMarkers(gl);
          ready = true;
          drawHighlightedStores(gl);
          if (lastFix) position(lastFix, null, false);
          pending = false;
          clearTimeout(timeout);
          timeout = null;

          container.dataset.state = 'style-ready';
          container.dataset.basemap = 'mapbox-standard-night-neon';
          container.dataset.camera = 'hachikenya-okawa-eye-level';
          container.dataset.renderedBuildings = 'unverified';
          toggle.textContent = '2D';
          toggle.setAttribute('aria-pressed', 'true');
          resize();
          if (typeof ui.onReady === 'function') ui.onReady();
        } catch (err) {
          close(errorText(err));
        }
      });
    } catch (err) {
      if (generation === id) close(errorText(err));
    }
  }

  toggle.onclick = () => (view || pending ? close() : open());
  window.addEventListener('orientationchange', resize);

  return {
    position,
    destination,
    route,
    resize,
    close,
    clearPosition() {
      if (currentMarker) {
        currentMarker.remove();
        currentMarker = null;
      }
      lastFix = null;
      bearingAnchor = null;
      trace = [];
      updateSource('sug-r7-user', EMPTY);
      updateSource('sug-r7-walk-trace', EMPTY);
    },
    focus(center, zoom = 16.9) {
      if (!view) return false;
      view.easeTo({ center, zoom, pitch: 68 });
      return true;
    },
    zoom(delta) {
      if (!view) return false;
      view.zoomTo(view.getZoom() + delta);
      return true;
    },
    isActive,
    setHighlightedStores
  };
};