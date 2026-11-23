/* R7 Osaka MAP - Mapbox Standard 3D Night Upgrade (drop-in for walk-r7-preview/osaka-3d.js).
 * Base commit: 0873b9c33a6583a92c2c5b95815f8afff60b28aa
 * No token, no fabricated GPS/route/metrics, and no unauthorized assets in source.
 */
window.createOsaka3D = function createOsaka3D(ui) {
  'use strict';
  const container = document.getElementById('osaka-3d');
  const toggle = document.getElementById('osaka-toggle');
  const HUB = ui.hub || { lat: 34.690616, lng: 135.514183 };
  // iPhone inspection route: map.html?focus=mint-museum (no effect on regular map).
  const MINT_MUSEUM_INSPECTION = new URLSearchParams(window.location.search).get('focus') === 'mint-museum';
  const venueRecords = Array.isArray(ui.selectedVenues) ? ui.selectedVenues.filter(p => p && p.approved === true && p.highlight3D === true) : [];
  let verifiedVenueFeatures = [];
  let venueLabels = [];
  let venueLoadGeneration = 0;
  const LANDMARKS = [
    {name:'関西テレビ（カンテレ）',lat:34.7046972,lng:135.5102667,color:'#ffbf47',officialAddress:'大阪市北区扇町2-1-7',officialUrl:'https://www.ktv.jp/corp/map/',sharedBuildingAnchor:{lat:34.70453,lng:135.51027}},
    {name:'大阪城',lat:34.68734,lng:135.526,color:'#ffce65',officialAddress:'大阪市中央区大阪城1-1',officialUrl:'https://www.osakacastle.net/access/'},
    {name:'大阪市中央公会堂',lat:34.69361,lng:135.50389,color:'#b17cff',officialAddress:'大阪市北区中之島1-1-27',officialUrl:'https://osaka-chuokokaido.com/ja/access'},
    {name:'造幣博物館',lat:34.69592,lng:135.52167,color:'#b65a43',officialAddress:'大阪市北区天満1-1-79',officialUrl:'https://www.mint.go.jp/'},
    {name:'大阪天満宮',lat:34.696025,lng:135.5126194,color:'#bf483c',officialAddress:'大阪市北区天神橋2-1-8',officialUrl:'https://osakatemmangu.or.jp/'}
  ];
  let landmarkGeometryHashes = '';
  let cachedKanteleLandmark = null; // Keep only a previously verified actual Streets polygon across tile transitions.
  let landmarkColorsReady = false;
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
  let cameraAnchor = null;
  let stableBearing = null;
  let lastFix = null;
  let ready = false;
  let cameraMode = 'overview'; // toggles without switching map instances or changing GPS permissions

  // Mapbox Standard v3 runtime basemap configuration (black x neon-pink x midnight-river)
  const BASEMAP_CONFIG = {
    lightPreset: 'dusk',
    theme: 'default',
    // Restore Mapbox Standard's built-in building meshes, facade detail, landmarks and light/shadows.
    show3dObjects: true,
    show3dBuildings: true,
    show3dFacades: true,
    show3dLandmarks: true,
    show3dTrees: true,
    colorBuildings: '#536078',
    colorBuildingHighlight: '#ff3b9a',
    colorBuildingSelect: '#e8b955',
    showPointOfInterestLabels: false,
    showTransitLabels: false,
    showRoadLabels: true,
    colorLand: '#080B16',
    colorWater: '#102B48',
    colorGreenspace: '#163F34',
    // Official WALK neon city roads: visible pink even without an active route.
    colorMotorways: '#FF007F',
    colorTrunks: '#FF4AA5',
    colorRoads: '#BE718D'
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
      '.sug-r7-spot-pill{padding:5px 12px;border:1.3px solid var(--sug-spot-color,#ff4fa6);border-radius:999px;background:rgba(12,6,22,.84);color:#fff;box-shadow:0 0 14px var(--sug-spot-color,#ff4fa6);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font:700 11.5px -apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:.03em;white-space:nowrap;}',
      '.sug-r7-spot-drop{width:16px;height:20px;color:var(--sug-spot-color,#ff4fa6);filter:drop-shadow(0 0 7px var(--sug-spot-color,#ff4fa6));}',
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
      // Official venues get exactly one label, only after their OSM way matches.
      if (venueRecords.some(v => v.name === place.name)) continue;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'sug-r7-spot';
      const colors={landmark:'#ffcb63',sightseeing:'#ffcb63',station:'#80b9ff',port:'#64e8da',park:'#65d896',waterfront:'#b478ff'};
      const pinColor=colors[place.category]||'#ff4fa6';
      el.style.setProperty('--sug-spot-color',pinColor);
      el.style.color=pinColor; // SVG currentColor previously inherited dark text and lost its mark.
      el.style.zIndex='6';
      if(place.name==='関西テレビ（カンテレ）') {
        const sign=document.createElement('span');
        sign.textContent='8'; // Numeric landmark marker, not a recreated corporate logo.
        sign.style.cssText='position:absolute;right:-8px;top:-13px;display:grid;place-items:center;min-width:20px;height:20px;border-radius:50%;background:#10121c;border:2px solid #ffbf47;color:#ffbf47;font:bold 13px sans-serif;box-shadow:0 0 12px #ffbf47;';
        el.appendChild(sign);
      }
      const pill = document.createElement('span');
      pill.className = 'sug-r7-spot-pill';
      pill.textContent = place.name;
      el.appendChild(pill);
      el.insertAdjacentHTML(
        'beforeend',
        '<svg class="sug-r7-spot-drop" viewBox="0 0 24 30" fill="none" aria-hidden="true">' +
          '<path d="M12 2C6.48 2 2 6.48 2 12c0 6.8 10 16 10 16s10-9.2 10-16c0-5.52-4.48-10-10-10z" fill="#fff" stroke="currentColor" stroke-width="2"/>' +
          '<circle cx="12" cy="11.5" r="3.5" fill="currentColor"/>' +
        '</svg>'
      );
      el.addEventListener('click', e => {
        e.stopPropagation();
        ui.select(place);
      });
      spotMarkers.push(new gl.Marker({ element: el, anchor: 'bottom' }).setLngLat([place.lng, place.lat]).addTo(view));
    }
  }

  // JR Temma is an elevated railway station. Do not turn its railway viaduct
  // into an invented rectangular building without surveyed geometry.
  function addJRTemmaStationMarker(gl) {
    const station = {name:'JR天満駅',lat:34.7049333,lng:135.5121361};
    const el=document.createElement('button');
    el.type='button';
    el.className='sug-r7-spot';
    el.setAttribute('aria-label','JR天満駅に移動');
    el.innerHTML='<span class="sug-r7-spot-pill" style="border-color:#49caff;color:#d7f6ff;box-shadow:0 0 15px #168dff88;background:#061929ee">🚉 JR天満駅</span>';
    el.addEventListener('click',e=>{
      e.stopPropagation();
      if(view) view.easeTo({center:[station.lng,station.lat],zoom:17.8,pitch:68,duration:750});
      if(typeof ui.select==='function')ui.select(station);
    });
    spotMarkers.push(new gl.Marker({element:el,anchor:'bottom'})
      .setLngLat([station.lng,station.lat]).addTo(view));
    container.dataset.jrTemmaStation='marker-added-no-unverified-building';
  }

  // Osaka Tenmangu: point is a shrine locator, not proof of a particular main-hall polygon.
  // The existing unique Streets footprint matcher colors a building only if the
  // source identifies one footprint containing this point and provides a height.
  function addOsakaTenmanguFocus(gl) {
    const shrine=LANDMARKS.find(p=>p.name==='大阪天満宮');
    if(!shrine||!view)return;
    const el=document.createElement('button');
    el.type='button';el.className='sug-r7-spot';
    el.setAttribute('aria-label','大阪天満宮を3Dで見る');
    const pill=document.createElement('span');pill.className='sug-r7-spot-pill';
    pill.textContent='⛩ 大阪天満宮';
    pill.style.cssText='border-color:#bf483c;color:#fff3ed;box-shadow:0 0 15px #bf483c99;background:#36150fee';
    el.appendChild(pill);
    el.addEventListener('click',event=>{
      event.stopPropagation();view.easeTo({center:[shrine.lng,shrine.lat],zoom:18,pitch:65,duration:750});
      if(typeof ui.select==='function')ui.select(shrine);
    });
    spotMarkers.push(new gl.Marker({element:el,anchor:'bottom'}).setLngLat([shrine.lng,shrine.lat]).addTo(view));
    container.dataset.osakaTenmanguStatus='locator-added-footprint-unverified';
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
    ++venueLoadGeneration;
    for(const marker of venueLabels) marker.remove();
    venueLabels=[];
    verifiedVenueFeatures=[];
    landmarkGeometryHashes='';
    cachedKanteleLandmark=null;
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
        range: [2.0, 12.0],
        'horizon-blend': 0.18,
        color: '#1b1c32',
        'high-color': '#10142a',
        'space-color': '#04040a',
        'star-intensity': 0.15
      });
    } catch (e) {
      /* setFog optional if unsupported */
    }
  }

  // Streets v8 is retained only for dark background building geometry.
  // Random building colors are prohibited: verified OSM ways own the accents.
  // iPhone screenshot review: the former extrusion texture produced roof dots,
  // not recognizable lit windows on facades. Do not reuse that failed approach.
  // Bright navy walls + restrained wall flood lighting keep the city readable.
  // Actual lit windows require separate facade geometry and remain unimplemented.
  const ORDINARY_BUILDING_COLOR='#596780';
  function addNeonCityBuildings(active) {
    const sourceId='sug-r7-neon-streets-buildings', layerId='sug-r7-neon-building-extrusions';
    active.addSource(sourceId,{type:'vector',url:'mapbox://mapbox.mapbox-streets-v8'});
    const paint={
      'fill-extrusion-color':ORDINARY_BUILDING_COLOR,
      'fill-extrusion-height':['max',8,['to-number',['get','height'],8]],
      'fill-extrusion-base':['to-number',['get','min_height'],0],
      'fill-extrusion-opacity':1,
      'fill-extrusion-emissive-strength':0.78,
      'fill-extrusion-vertical-gradient':false
    };
    active.addLayer({
      id:layerId,type:'fill-extrusion',slot:'top',source:sourceId,'source-layer':'building',
      minzoom:14,filter:['==',['get','extrude'],'true'],paint
    });
    // Previous line layers traced the *roof* instead of vertical building edges.
    // They are deliberately retired; see addPilotVerticalNeonEdges().
    container.dataset.cityOutline='roof-footprint-lines-disabled';
    // Mapbox v3 supports wall flood lights; optional, never fatal to the map.
    try{
      active.setPaintProperty(layerId,'fill-extrusion-flood-light-color','#BFCFFF');
      active.setPaintProperty(layerId,'fill-extrusion-flood-light-intensity',0.68);
      active.setPaintProperty(layerId,'fill-extrusion-flood-light-wall-radius',16);
      container.dataset.cityFacadeLighting='strong-cool-facade-flood';
    }catch(err){
      container.dataset.cityFacadeLighting='emissive-only-fallback';
      container.dataset.cityFacadeLightingError=String(err.message||err);
    }
    container.dataset.buildingPalette='bright-navy-no-roof-dots';
    container.dataset.cityFacadeColor=ORDINARY_BUILDING_COLOR;
    container.dataset.cityWindowStatus='not-implemented-facade-geometry-required';
  }

  // First pilot: real vertical neon geometry on up to six nearby Mapbox
  // Streets buildings, not 2D footprint lines. A thin extruded square at
  // each verified building corner makes a vertical neon strip on its facade.
  // Two extrusion widths create a soft halo + a brighter inner core.
  // Limited to Hachikenyahama to protect iPhone frame rate.
  function addPilotVerticalNeonEdges(active) {
    const sourceId='sug-r7-pilot-vertical-neon-source';
    const empty={type:'FeatureCollection',features:[]};
    active.addSource(sourceId,{type:'geojson',data:empty});
    const base={
      type:'fill-extrusion',slot:'top',source:sourceId,minzoom:16,
      paint:{
        'fill-extrusion-base':['get','base'],
        'fill-extrusion-height':['get','height'],
        'fill-extrusion-vertical-gradient':false
      }
    };
    active.addLayer({...base,id:'sug-r7-pilot-vertical-neon-halo',
      paint:{...base.paint,'fill-extrusion-color':'#D8A43C',
        'fill-extrusion-opacity':0.26,
        'fill-extrusion-emissive-strength':1},
      filter:['==',['get','kind'],'halo']
    });
    active.addLayer({...base,id:'sug-r7-pilot-vertical-neon-core',
      paint:{...base.paint,'fill-extrusion-color':'#FFE5A0',
        'fill-extrusion-opacity':0.96,
        'fill-extrusion-emissive-strength':1},
      filter:['==',['get','kind'],'core']
    });
    // Ground-level neon strips only; no rooftop tracing or wall-covering glow.
    // GeoJSON extrusion bands follow real Streets-v8 building edges.
    for (const [kind,color,opacity] of [
      ['base-halo','#FF007F',0.30],['base-core','#FF4BA9',0.98]
    ]) {
      active.addLayer({...base,id:'sug-r7-building-'+kind,
        filter:['==',['get','kind'],kind],
        paint:{...base.paint,'fill-extrusion-color':color,
          'fill-extrusion-opacity':opacity,'fill-extrusion-emissive-strength':1}
      });
    }
    // Illuminated windows are decorative, NOT verified real-world window positions.
    // Extruded thin facade bands are capped so iPhone GPU usage stays bounded.
    for(const [kind,color] of [
      ['window-white','#F4F0DD'],['window-warm','#FFD38B'],['window-blue','#9ADDF4']
    ]){
      active.addLayer({...base,id:'sug-r7-'+kind,
        filter:['==',['get','kind'],kind],
        paint:{...base.paint,'fill-extrusion-color':color,
          'fill-extrusion-opacity':0.92,'fill-extrusion-emissive-strength':1}
      });
    }
    const toRad=Math.PI/180;
    const cosLat=Math.cos(HUB.lat*toRad);
    const dist=(a,b)=>Math.hypot((a[0]-b[0])*111320*cosLat,(a[1]-b[1])*111320);
    function square(center,width){
      const dx=width/(2*111320*cosLat),dy=width/(2*111320);
      return {type:'Polygon',coordinates:[[
        [center[0]-dx,center[1]-dy],[center[0]+dx,center[1]-dy],
        [center[0]+dx,center[1]+dy],[center[0]-dx,center[1]+dy],
        [center[0]-dx,center[1]-dy]
      ]]};
    }
    function baseStrip(a,b,width) {
      const mx=111320*cosLat,my=111320;
      const dx=(b[0]-a[0])*mx,dy=(b[1]-a[1])*my;
      const length=Math.hypot(dx,dy);
      if(length<0.6||length>120)return null; // Short facade window ribbons are ~1.24m wide.
      const offsetX=(-dy/length)*width/(2*mx);
      const offsetY=(dx/length)*width/(2*my);
      const p=[[a[0]+offsetX,a[1]+offsetY],[b[0]+offsetX,b[1]+offsetY],
        [b[0]-offsetX,b[1]-offsetY],[a[0]-offsetX,a[1]-offsetY]];
      return {type:'Polygon',coordinates:[[...p,p[0]]]};
    }
    let updated=false;
    let lastRefreshCenter=null;
    function refresh() {
      if(active!==view)return;
      const vc=active.getCenter();
      const viewCenter=[vc.lng,vc.lat];
      if(lastRefreshCenter&&dist(viewCenter,lastRefreshCenter)<65)return;
      let features=[];
      try{features=active.querySourceFeatures('sug-r7-neon-streets-buildings',{sourceLayer:'building'});}
      catch(e){container.dataset.verticalNeonStatus='source-unavailable';return;}
      if(!features.length){container.dataset.verticalNeonStatus='waiting-for-building-tiles';return;}
      const candidates=[],seen=new Set();
      for(const feature of features){
        if(!feature||!feature.geometry||!['Polygon','MultiPolygon'].includes(feature.geometry.type))continue;
        if(String(feature.properties&&feature.properties.extrude)!=='true')continue;
        const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
        const ring=polygons[0]&&polygons[0][0];
        if(!Array.isArray(ring)||ring.length<4||ring.length>100)continue;
        const center=ring.slice(0,-1).reduce((p,c)=>[p[0]+c[0]/(ring.length-1),p[1]+c[1]/(ring.length-1)],[0,0]);
        const d=dist(center,viewCenter);
        if(d>360)continue;
        const height=Number(feature.properties.height);
        if(!Number.isFinite(height)||height<9||height>160)continue;
        const key=String(feature.id??'')+'|'+center.map(n=>n.toFixed(5)).join(',');
        if(seen.has(key))continue;
        seen.add(key);
        candidates.push({ring,height,base:Math.max(0,Number(feature.properties.min_height)||0),d});
      }
      candidates.sort((a,b)=>a.d-b.d);
      const result=[],chosen=candidates.slice(0,20);
      let windowCount=0;
      const MAX_WINDOWS=400;
      const WINDOWS_PER_BUILDING=28;
      for(const building of chosen){
        // Sample max 8 real corners, omit ring closure and near-duplicates.
        let corners=[];
        for(const corner of building.ring.slice(0,-1)){
          if(corners.every(p=>dist(p,corner)>2))corners.push(corner);
          if(corners.length>=8)break;
        }
        // Gold full-height corner pillars obscured windows in the iPhone screenshot.
        // Keep original geometries on other venue layers, but omit these decorative columns.
        container.dataset.cornerColumns='disabled-for-readable-windows';
        // Continuous low bands on the actual building footprint, capped at 12 edges
        // per building to avoid excessive geometry on iPhone.
        const fullRing=building.ring;
        for(let i=0;i<Math.min(fullRing.length-1,12);i++){
          const a=fullRing[i],b=fullRing[i+1];
          for(const [kind,width] of [['base-halo',1.5],['base-core',0.40]]){
            const geometry=baseStrip(a,b,width);
            if(geometry)result.push({type:'Feature',
              properties:{kind,base:building.base+0.15,height:building.base+1.05},
              geometry});
          }
        }
        // Approximate individual facade windows from mapped building edges.
        // Only use actual building footprints, never invent building locations.
        const buildingWindowStart=windowCount;
        const floorCount=Math.min(7,Math.floor((building.height-building.base-2)/3.25));
        for(let floor=1;floor<=floorCount&&windowCount<MAX_WINDOWS&&windowCount-buildingWindowStart<WINDOWS_PER_BUILDING;floor++){
          const floorBase=building.base+floor*3.25+0.65;
          if(floorBase+1.4>=building.height)break;
          for(let edge=0;edge<Math.min(fullRing.length-1,8)&&windowCount<MAX_WINDOWS&&windowCount-buildingWindowStart<WINDOWS_PER_BUILDING;edge++){
            const a=fullRing[edge],b=fullRing[edge+1];
            const length=dist(a,b);
            if(length<4||length>100)continue;
            const count=Math.min(4,Math.floor(length/5.5));
            if((floor+edge)%3===0)continue; // distribute light across floors and facade edges
            for(let j=0;j<count&&windowCount<MAX_WINDOWS&&windowCount-buildingWindowStart<WINDOWS_PER_BUILDING;j++){
              // An unlit pane is deliberately skipped for a natural night skyline.
              const pattern=(floor*17+edge*13+j*7+Math.round(building.height));
              if(pattern%4===0)continue;
              const t=(j+0.5)/count,half=0.75/length;
              const p=[a[0]+(b[0]-a[0])*(t-half),a[1]+(b[1]-a[1])*(t-half)];
              const q=[a[0]+(b[0]-a[0])*(t+half),a[1]+(b[1]-a[1])*(t+half)];
              const geometry=baseStrip(p,q,0.65);
              if(!geometry)continue;
              const kind=pattern%10<7?'window-white':pattern%10<9?'window-warm':'window-blue';
              result.push({type:'Feature',properties:{kind,base:floorBase,height:floorBase+1.4},geometry});
              windowCount++;
            }
          }
        }
      }
      active.getSource(sourceId).setData({type:'FeatureCollection',features:result});
      updated=true;
      lastRefreshCenter=viewCenter;
      container.dataset.windowStatus=windowCount?'geometry-ready':'no-eligible-buildings';
      container.dataset.windowCount=String(windowCount);
      container.dataset.windowBuildings=String(chosen.length);
      container.dataset.windowLimit=String(MAX_WINDOWS);
      container.dataset.windowAccuracy='decorative-not-surveyed';
      container.dataset.baseNeonStatus=chosen.length?'geometry-ready':'no-eligible-buildings';
      container.dataset.baseNeonBands=String(result.filter(f=>f.properties.kind.startsWith('base-')).length);
      container.dataset.verticalNeonStatus='full-height-pillars-disabled';
      container.dataset.verticalNeonBuildings=String(chosen.length);
      container.dataset.verticalNeonStrips=String(result.length);
    }
    // Wait until source tiles have been loaded; no perpetual animation loop.
    active.once('idle',refresh);
    active.on('moveend',refresh);
    active.on('sourcedata',e=>{
      if(!updated&&e.sourceId==='sug-r7-neon-streets-buildings'&&e.isSourceLoaded){
        active.once('idle',refresh);
      }
    });
    container.dataset.verticalNeonStatus='waiting-for-building-tiles';
  }

  // Explicit landscape fills: Standard's colorWater/colorGreenspace configuration
  // did not visibly tint the water and park polygons in the iPhone screenshots.
  // Streets v8 has actual water polygons and landuse class=park/grass/wood geometry.
  function addOsakaLandscapeLayers(active) {
    const sourceId='sug-r7-neon-streets-buildings'; // existing Streets v8 source
    active.addLayer({
      id:'sug-r7-water-surface',type:'fill',slot:'bottom',
      source:sourceId,'source-layer':'water',
      paint:{
        'fill-color':'#102B48',
        'fill-opacity':0.98,
        'fill-emissive-strength':0.18
      }
    });
    // Wide, soft outer glow follows actual water polygon boundaries.
    active.addLayer({
      id:'sug-r7-water-bank-glow',type:'line',slot:'bottom',
      source:sourceId,'source-layer':'water',
      paint:{
        'line-color':'#32C8EF',
        'line-width':['interpolate',['linear'],['zoom'],12,1.3,16,3.2,19,5.5],
        'line-opacity':0.40,
        'line-blur':2.0,
        'line-emissive-strength':0.80
      }
    });
    active.addLayer({
      id:'sug-r7-water-bank',type:'line',slot:'bottom',
      source:sourceId,'source-layer':'water',
      paint:{
        'line-color':'#79E9FF',
        'line-width':['interpolate',['linear'],['zoom'],12,0.5,16,1.25,19,2.1],
        'line-opacity':0.82,
        'line-blur':0.18,
        'line-emissive-strength':0.85
      }
    });
    active.addLayer({
      id:'sug-r7-green-parks',type:'fill',slot:'bottom',
      source:sourceId,'source-layer':'landuse',
      filter:['in',['get','class'],['literal',['park','grass','wood']]],
      paint:{
        'fill-color':['match',['get','class'],
          'park','#163F34','grass','#1B4939','wood','#112E29','#163F34'],
        'fill-opacity':0.96,
        'fill-emissive-strength':0.28
      }
    });
    active.addLayer({
      id:'sug-r7-park-border',type:'line',slot:'bottom',
      source:sourceId,'source-layer':'landuse',
      filter:['==',['get','class'],'park'],
      paint:{
        'line-color':'#41B98E',
        'line-width':['interpolate',['linear'],['zoom'],12,0.7,16,1.3,19,2.3],
        'line-opacity':0.60,
        'line-emissive-strength':0.5
      }
    });
    container.dataset.landscapeLayerMode='streets-v8-water-and-landuse';
    active.on('idle',()=>{
      if(view!==active)return;
      try {
        container.dataset.waterPolygonCount=String(active.queryRenderedFeatures({layers:['sug-r7-water-surface']}).length);
        container.dataset.parkPolygonCount=String(active.queryRenderedFeatures({layers:['sug-r7-green-parks']}).length);
      }catch(err){container.dataset.landscapeQueryError=String(err.message||err);}
    });
  }

  // Ogimachi Park only. OSM geometry, not a guessed park-shaped rectangle.
  // City of Osaka: Ogimachi 1-1; park size 7.3 hectares.
  // OSM Way 54237489: leisure=park; independently referenced by Mapcarta.
  function addVerifiedOgimachiPark(active) {
    const park={name:'扇町公園',wayId:54237489,lat:34.70403816,lng:135.50916285};
    const id='sug-r7-ogimachi-verified';
    active.addSource(id,{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    active.addLayer({
      id:'sug-r7-ogimachi-park-fill',type:'fill',slot:'middle',source:id,
      paint:{'fill-color':'#167e4f','fill-opacity':0.96,'fill-emissive-strength':0.9}
    });
    active.addLayer({
      id:'sug-r7-ogimachi-park-outline',type:'line',slot:'middle',source:id,
      paint:{'line-color':'#51f4a0','line-width':['interpolate',['linear'],['zoom'],12,0.8,16,2,19,3],
        'line-opacity':0.97,'line-emissive-strength':1.1}
    });
    container.dataset.ogimachiParkStatus='loading';
    const thisView=active;
    (async()=>{
      try {
        const response=await fetch('https://api.openstreetmap.org/api/0.6/way/54237489/full.json',
          {mode:'cors',credentials:'omit',signal:AbortSignal.timeout(12000)});
        if(!response.ok)throw Error('OSM HTTP '+response.status);
        const data=await response.json();
        const elements=Array.isArray(data.elements)?data.elements:[];
        const way=elements.find(e=>e.type==='way'&&e.id===park.wayId);
        if(!way||way.tags?.leisure!=='park'||!Array.isArray(way.nodes)||way.nodes.length<4)
          throw Error('Expected park way not found');
        if(!String(way.tags.name||way.tags['name:ja']||'').includes('扇町'))
          throw Error('Park name does not match');
        const nodes=new Map(elements.filter(e=>e.type==='node').map(e=>[e.id,e]));
        const ring=way.nodes.map(n=>nodes.get(n)).map(n=>n?[n.lon,n.lat]:null);
        if(ring.length>2500||ring.some(p=>!p||!p.every(Number.isFinite)))
          throw Error('Invalid or oversized park geometry');
        if(ring[0][0]!==ring[ring.length-1][0]||ring[0][1]!==ring[ring.length-1][1])
          throw Error('Park ring is not closed');
        if(!pointInRing(park.lng,park.lat,ring))
          throw Error('Recorded park position is outside OSM way');
        // Shoelace area in metric coordinates; refuse polygons inconsistent with
        // Osaka City's reported park area of approximately 73,000 m2.
        let area=0;
        const sx=111320*Math.cos(park.lat*Math.PI/180),sy=111320;
        for(let i=1;i<ring.length;i++)
          area+=(ring[i-1][0]*sx)*(ring[i][1]*sy)-(ring[i][0]*sx)*(ring[i-1][1]*sy);
        area=Math.abs(area)/2;
        if(!(area>30000&&area<130000))throw Error('Park polygon area does not match city size: '+Math.round(area));
        if(view!==thisView)return;
        const source=active.getSource(id);
        if(!source)return;
        source.setData({type:'FeatureCollection',features:[{type:'Feature',
          properties:{name:park.name,wayId:park.wayId},
          geometry:{type:'Polygon',coordinates:[ring]}}]});
        container.dataset.ogimachiParkStatus='geometry-loaded';
        container.dataset.ogimachiParkAreaM2=String(Math.round(area));
        active.once('idle',()=>{
          if(view!==thisView)return;
          try{
            const count=active.queryRenderedFeatures({layers:['sug-r7-ogimachi-park-fill']}).length;
            container.dataset.ogimachiParkRendered=String(count);
            container.dataset.ogimachiParkStatus=count>0?'rendered-in-current-view':'geometry-loaded-outside-view';
          }catch(error){container.dataset.ogimachiParkError=String(error.message||error);}
        });
      }catch(error){
        if(view===thisView){
          container.dataset.ogimachiParkStatus='not-verified';
          container.dataset.ogimachiParkError=String(error.message||error);
        }
      }
    })();
  }

  function addVerifiedNakanoshimaPark(active) {
    const park={name:'中之島公園',wayId:54037338,lat:34.69242,lng:135.50777};
    const id='sug-r7-nakanoshima-verified';
    active.addSource(id,{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    active.addLayer({
      id:'sug-r7-nakanoshima-park-fill',type:'fill',slot:'middle',source:id,
      paint:{'fill-color':'#167e4f','fill-opacity':0.96,'fill-emissive-strength':0.9}
    });
    active.addLayer({
      id:'sug-r7-nakanoshima-park-outline',type:'line',slot:'middle',source:id,
      paint:{'line-color':'#51f4a0','line-width':['interpolate',['linear'],['zoom'],12,0.8,16,2,19,3],
        'line-opacity':0.97,'line-emissive-strength':1.1}
    });
    container.dataset.nakanoshimaParkStatus='loading';
    const thisView=active;
    (async()=>{
      try {
        const response=await fetch('https://api.openstreetmap.org/api/0.6/way/54037338/full.json',
          {mode:'cors',credentials:'omit',signal:AbortSignal.timeout(12000)});
        if(!response.ok)throw Error('OSM HTTP '+response.status);
        const data=await response.json();
        const elements=Array.isArray(data.elements)?data.elements:[];
        const way=elements.find(e=>e.type==='way'&&e.id===park.wayId);
        if(!way||way.tags?.leisure!=='park'||!Array.isArray(way.nodes)||way.nodes.length<4)
          throw Error('Expected park way not found');
        if(!String(way.tags.name||way.tags['name:ja']||'').includes('扇町'))
          throw Error('Park name does not match');
        const nodes=new Map(elements.filter(e=>e.type==='node').map(e=>[e.id,e]));
        const ring=way.nodes.map(n=>nodes.get(n)).map(n=>n?[n.lon,n.lat]:null);
        if(ring.length>2500||ring.some(p=>!p||!p.every(Number.isFinite)))
          throw Error('Invalid or oversized park geometry');
        if(ring[0][0]!==ring[ring.length-1][0]||ring[0][1]!==ring[ring.length-1][1])
          throw Error('Park ring is not closed');
        const minLat=Math.min(...ring.map(p=>p[1])), maxLat=Math.max(...ring.map(p=>p[1]));
        const minLng=Math.min(...ring.map(p=>p[0])), maxLng=Math.max(...ring.map(p=>p[0]));
        if(park.lat<minLat-0.002||park.lat>maxLat+0.002||park.lng<minLng-0.002||park.lng>maxLng+0.002)
          throw Error('OSM geometry is too far from mapped Nakanoshima Park');
        // Shoelace area in metric coordinates; refuse polygons inconsistent with
        // The mapped OSM way can differ from Osaka City's 96,275 m2 administrative area.
        let area=0;
        const sx=111320*Math.cos(park.lat*Math.PI/180),sy=111320;
        for(let i=1;i<ring.length;i++)
          area+=(ring[i-1][0]*sx)*(ring[i][1]*sy)-(ring[i][0]*sx)*(ring[i-1][1]*sy);
        area=Math.abs(area)/2;
        if(!(area>5000&&area<200000))throw Error('Park polygon area outside plausible range: '+Math.round(area));
        if(view!==thisView)return;
        const source=active.getSource(id);
        if(!source)return;
        source.setData({type:'FeatureCollection',features:[{type:'Feature',
          properties:{name:park.name,wayId:park.wayId},
          geometry:{type:'Polygon',coordinates:[ring]}}]});
        container.dataset.nakanoshimaParkStatus='geometry-loaded';
        container.dataset.nakanoshimaParkAreaM2=String(Math.round(area));
        active.once('idle',()=>{
          if(view!==thisView)return;
          try{
            const count=active.queryRenderedFeatures({layers:['sug-r7-nakanoshima-park-fill']}).length;
            container.dataset.nakanoshimaParkRendered=String(count);
            container.dataset.nakanoshimaParkStatus=count>0?'rendered-in-current-view':'geometry-loaded-outside-view';
          }catch(error){container.dataset.nakanoshimaParkError=String(error.message||error);}
        });
      }catch(error){
        if(view===thisView){
          container.dataset.nakanoshimaParkStatus='not-verified';
          container.dataset.nakanoshimaParkError=String(error.message||error);
        }
      }
    })();
  }

  function addVerifiedOsakaCastlePark(active) {
    const park={name:'大阪城公園',wayId:35457792,lat:34.68658,lng:135.52725};
    const id='sug-r7-osakaCastle-verified';
    active.addSource(id,{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    active.addLayer({
      id:'sug-r7-osakaCastle-park-fill',type:'fill',slot:'middle',source:id,
      paint:{'fill-color':'#167e4f','fill-opacity':0.96,'fill-emissive-strength':0.9}
    });
    active.addLayer({
      id:'sug-r7-osakaCastle-park-outline',type:'line',slot:'middle',source:id,
      paint:{'line-color':'#51f4a0','line-width':['interpolate',['linear'],['zoom'],12,0.8,16,2,19,3],
        'line-opacity':0.97,'line-emissive-strength':1.1}
    });
    container.dataset.osakaCastleParkStatus='loading';
    const thisView=active;
    (async()=>{
      try {
        const response=await fetch('https://api.openstreetmap.org/api/0.6/way/35457792/full.json',
          {mode:'cors',credentials:'omit',signal:AbortSignal.timeout(12000)});
        if(!response.ok)throw Error('OSM HTTP '+response.status);
        const data=await response.json();
        const elements=Array.isArray(data.elements)?data.elements:[];
        const way=elements.find(e=>e.type==='way'&&e.id===park.wayId);
        if(!way||way.tags?.leisure!=='park'||!Array.isArray(way.nodes)||way.nodes.length<4)
          throw Error('Expected park way not found');
        if(!String(way.tags.name||way.tags['name:ja']||'').includes('扇町'))
          throw Error('Park name does not match');
        const nodes=new Map(elements.filter(e=>e.type==='node').map(e=>[e.id,e]));
        const ring=way.nodes.map(n=>nodes.get(n)).map(n=>n?[n.lon,n.lat]:null);
        if(ring.length>2500||ring.some(p=>!p||!p.every(Number.isFinite)))
          throw Error('Invalid or oversized park geometry');
        if(ring[0][0]!==ring[ring.length-1][0]||ring[0][1]!==ring[ring.length-1][1])
          throw Error('Park ring is not closed');
        if(!pointInRing(park.lng,park.lat,ring))
          throw Error('OSM park reference position outside polygon');
        // Shoelace area in metric coordinates; refuse polygons inconsistent with
        // Osaka City's reported park area of approximately 1,055,000 m2.
        let area=0;
        const sx=111320*Math.cos(park.lat*Math.PI/180),sy=111320;
        for(let i=1;i<ring.length;i++)
          area+=(ring[i-1][0]*sx)*(ring[i][1]*sy)-(ring[i][0]*sx)*(ring[i-1][1]*sy);
        area=Math.abs(area)/2;
        if(!(area>250000&&area<1600000))throw Error('Park polygon area inconsistent with Osaka City 105.5ha park: '+Math.round(area));
        if(view!==thisView)return;
        const source=active.getSource(id);
        if(!source)return;
        source.setData({type:'FeatureCollection',features:[{type:'Feature',
          properties:{name:park.name,wayId:park.wayId},
          geometry:{type:'Polygon',coordinates:[ring]}}]});
        container.dataset.osakaCastleParkStatus='geometry-loaded';
        container.dataset.osakaCastleParkAreaM2=String(Math.round(area));
        active.once('idle',()=>{
          if(view!==thisView)return;
          try{
            const count=active.queryRenderedFeatures({layers:['sug-r7-osakaCastle-park-fill']}).length;
            container.dataset.osakaCastleParkRendered=String(count);
            container.dataset.osakaCastleParkStatus=count>0?'rendered-in-current-view':'geometry-loaded-outside-view';
          }catch(error){container.dataset.osakaCastleParkError=String(error.message||error);}
        });
      }catch(error){
        if(view===thisView){
          container.dataset.osakaCastleParkStatus='not-verified';
          container.dataset.osakaCastleParkError=String(error.message||error);
        }
      }
    })();
  }

  function distanceMetres(lat1,lng1,lat2,lng2) {
    const r=Math.PI/180, dy=(lat2-lat1)*111320, dx=(lng2-lng1)*111320*Math.cos(((lat1+lat2)/2)*r);
    return Math.hypot(dx,dy);
  }
  function pointInRing(lng,lat,ring) {
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
      const a=ring[i],b=ring[j];
      if(((a[1]>lat)!==(b[1]>lat)) &&
         lng<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
    }
    return inside;
  }
  function distanceToRing(lat,lng,ring) {
    return Math.min(...ring.map(c=>distanceMetres(lat,lng,c[1],c[0])));
  }
  async function fetchOSMFootprint(venue) {
    const url='https://api.openstreetmap.org/api/0.6/way/'+encodeURIComponent(venue.osmWayId)+'/full.json';
    const response=await fetch(url,{mode:'cors',credentials:'omit',signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error('OSM HTTP '+response.status);
    const data=await response.json();
    const way=(data.elements||[]).find(e=>e.type==='way'&&e.id===venue.osmWayId);
    if(!way||!Array.isArray(way.nodes)||way.nodes.length<4)throw Error('OSM way missing');
    if(!(way.tags&&(way.tags.building||way.tags['building:part'])))throw Error('Way is not tagged as building');
    const nodes=new Map((data.elements||[]).filter(e=>e.type==='node').map(e=>[e.id,e]));
    const ring=way.nodes.map(id=>nodes.get(id)).map(n=>n?[n.lon,n.lat]:null);
    if(ring.some(p=>!p||!p.every(Number.isFinite)))throw Error('Way nodes incomplete');
    if(ring[0][0]!==ring[ring.length-1][0]||ring[0][1]!==ring[ring.length-1][1])throw Error('Way polygon not closed');
    if(ring.length>800)throw Error('Way geometry too large');
    // Check POI coordinate against actual way polygon, with a modest 15m entrance tolerance.
    if(!pointInRing(venue.lng,venue.lat,ring) && distanceToRing(venue.lat,venue.lng,ring)>15)
      throw Error('POI and building polygon do not match');
    let height=Number(way.tags.height);
    if(!Number.isFinite(height)||height<=0)height=Number(venue.heightMetres);
    if(!Number.isFinite(height)||height<=0)height=Number(way.tags['building:levels']||venue.levels)*3;
    if(!Number.isFinite(height)||height<=0||height>300)throw Error('No verified building height');
    return {type:'Feature',
      properties:{name:venue.name,color:venue.highlightColor,height,wayId:venue.osmWayId},
      geometry:{type:'Polygon',coordinates:[ring]}};
  }
  function interiorPoint(feature, venue) {
    const ring=feature.geometry.coordinates[0];
    if(pointInRing(venue.lng,venue.lat,ring))return [venue.lng,venue.lat];
    const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
    const loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);
    // Find a point strictly inside the verified OSM polygon. Never guess another building.
    for(let scale=0;scale<4;scale++) {
      const steps=8*(scale+1);
      for(let y=1;y<steps;y++)for(let x=1;x<steps;x++){
        const lng=loX+(hiX-loX)*x/steps,lat=loY+(hiY-loY)*y/steps;
        if(pointInRing(lng,lat,ring))return [lng,lat];
      }
    }
    return null;
  }
  function recolorVerifiedStreetsBuildings(active, answers) {
    const layer='sug-r7-neon-building-extrusions';
    if(!active.getLayer(layer))return;
    const condition=['case'];
    let matches=0;
    for(const {venue,feature} of answers) {
      if(!feature)continue;
      const pt=interiorPoint(feature,venue);
      if(!pt)continue;
      // This recolors Streets v8's real extruded building intersecting the
      // independently verified OSM way, avoiding a hidden competing overlay.
      condition.push(['<=',['distance',{type:'Point',coordinates:pt}],0.8],venue.highlightColor);
      matches++;
    }
    condition.push(ORDINARY_BUILDING_COLOR);
    try {
      active.setPaintProperty(layer,'fill-extrusion-color',matches?condition:ORDINARY_BUILDING_COLOR);
      container.dataset.venueStreetsColorRules=String(matches);
      container.dataset.venueStreetsColorError='';
    } catch (err) {
      container.dataset.venueStreetsColorError=String(err.message||err);
    }
  }
  async function loadOfficialVenueWays(active) {
    const current=++venueLoadGeneration;
    container.dataset.venueFootprints='loading';
    // The API result must be checked against the supplied coordinates before drawing.
    const answers=await Promise.all(venueRecords.map(async venue=>{
      try{return {venue,feature:await fetchOSMFootprint(venue)};}
      catch(e){return {venue,error:String(e.message||e)};}
    }));
    if(current!==venueLoadGeneration||view!==active)return;
    verifiedVenueFeatures=answers.filter(x=>x.feature).map(x=>x.feature);
    const source=active.getSource('sug-r7-exact-venue-buildings');
    if(source)source.setData({type:'FeatureCollection',features:verifiedVenueFeatures});
    recolorVerifiedStreetsBuildings(active,answers);
    for(const marker of venueLabels)marker.remove();
    venueLabels=[];
    styleMarkers();
    for(const {venue,feature} of answers) {
      if(!feature)continue; // Never show an approved-colored building without the verified way.
      const el=document.createElement('button');
      el.type='button';el.className='sug-r7-spot sug-r7-selected-shop';
      el.style.setProperty('--sug-store-color',venue.highlightColor);
      el.textContent=venue.name;
      el.title=venue.name+' (OSM Way '+venue.osmWayId+')';
      el.addEventListener('click',event=>{event.stopPropagation();ui.select(venue);});
      venueLabels.push(new window.mapboxgl.Marker({element:el,anchor:'bottom'})
        .setLngLat([venue.lng,venue.lat]).addTo(active));
    }
    container.dataset.venueFootprints=verifiedVenueFeatures.length+'/4';
    container.dataset.venueErrors=answers.filter(x=>x.error).map(x=>x.venue.osmWayId+':'+x.error).join('; ');
  }
  function addExactVenueLayers(active) {
    active.addSource('sug-r7-exact-venue-buildings',{
      type:'geojson',data:{type:'FeatureCollection',features:[]}});
    active.addLayer({id:'sug-r7-exact-venue-extrusions',
      type:'fill-extrusion',slot:'top',source:'sug-r7-exact-venue-buildings',
      paint:{
        'fill-extrusion-color':['get','color'],
        'fill-extrusion-height':['+',3,['get','height']],
        'fill-extrusion-base':0,
        'fill-extrusion-opacity':1,
        'fill-extrusion-emissive-strength':0.95,
        'fill-extrusion-vertical-gradient':false
      }});
    loadOfficialVenueWays(active);
  }

  // Color only real Mapbox Streets building geometry that actually contains the landmark POI.
  // Do not use generated rectangles or indiscriminate radius coloring.
  function landmarkGeometryMatch(geom,point) {
    const polygons=geom.type==='Polygon'?[geom.coordinates]:geom.type==='MultiPolygon'?geom.coordinates:[];
    for(const polygon of polygons) {
      const outer=polygon[0];
      if(Array.isArray(outer)&&pointInRing(point.lng,point.lat,outer))return true;
    }
    return false;
  }
  function updateLandmarkBuildingColors(active) {
    if(view!==active || !active.getLayer('sug-r7-neon-building-extrusions'))return;
    let candidates=[];
    try {
      // Source query is independent of camera pitch, whereas a rendered
      // screen-box query at a ground POI can miss a tall 3D building.
      candidates=active.querySourceFeatures('sug-r7-neon-streets-buildings',{sourceLayer:'building'});
    } catch(err) {
      container.dataset.landmarkQueryError=String(err.message||err);
      return;
    }
    const features=[], matched=[];
    for(const landmark of LANDMARKS) {
      // The verified OSM footprint supersedes the approximate Streets landmark overlay.
      if(landmark.name==='大阪市中央公会堂' && container.dataset.centralPublicHallStatus?.startsWith('geometry-loaded'))continue;
      // For Kantele only, Osaka City confirms a shared Kids Plaza building.
      // Its OSM POI is a second reference point; it is NOT a building Way ID.
      const anchors=[landmark];
      if(landmark.sharedBuildingAnchor)anchors.push(landmark.sharedBuildingAnchor);
      let chosen=null;
      for(const point of anchors) {
        const hits=candidates.filter(f=>f.geometry&&landmarkGeometryMatch(f.geometry,point));
        const distinct=new Map(hits.map(f=>[JSON.stringify(f.geometry),f]));
        if(distinct.size===1) { chosen=[...distinct.values()][0];break; }
      }
      // On iPhone the currently loaded vector tiles can change while panning.
      // Do not drop a previously matched Kantele polygon just because its tile
      // momentarily disappears; never cache an unverified or nearby building.
      const isKantele=landmark.name==='関西テレビ（カンテレ）';
      let verifiedFeature=null;
      if(chosen){
        if(landmark.name==='大阪天満宮')container.dataset.osakaTenmanguStatus='unique-streets-footprint-found';
        const measured=Number(chosen.properties?.height);
        const isMint=landmark.name==='造幣博物館';
        // Mint Museum: 1911 red-brick former power station, per Mint Bureau / MOF.
        // Only use a single building polygon containing the mapped museum point.
        // If the vector tile lacks height, use an explicitly flagged visual estimate.
        const heightSource=Number.isFinite(measured)&&measured>0&&measured<=300?'mapbox-height':
          (isMint?'visual-estimate-not-measured':'missing');
        const height=heightSource==='mapbox-height'?measured:(isMint?9:NaN);
        if(Number.isFinite(height)){
          verifiedFeature={type:'Feature',
            properties:{name:landmark.name,color:landmark.color,height:height+3},
            geometry:chosen.geometry};
          if(isMint){
            container.dataset.mintMuseumStatus='unique-streets-footprint-matched';
            container.dataset.mintMuseumHeightSource=heightSource;
          }
          if(isKantele)cachedKanteleLandmark=verifiedFeature;
        }
      }
      if(!verifiedFeature&&isKantele&&cachedKanteleLandmark)
        verifiedFeature=cachedKanteleLandmark;
      if(!verifiedFeature)continue;
      features.push(verifiedFeature);
      matched.push(landmark.name);
    }
    const hash=JSON.stringify(features.map(f=>[f.properties.name,f.geometry]));
    if(hash===landmarkGeometryHashes)return;
    landmarkGeometryHashes=hash;
    const source=active.getSource('sug-r7-landmark-building-overlays');
    if(source)source.setData({type:'FeatureCollection',features});
    container.dataset.landmarkBuildingsMatched=matched.join(' / ')||'none';
    container.dataset.mintMuseumStatus=matched.includes('造幣博物館') ? 'unique-streets-footprint-match' : 'not-verified';
    container.dataset.landmarkBuildingCount=String(features.length);
    container.dataset.landmarkSourceCandidates=String(candidates.length);
  }
  // Kantele only: candidate OSM way from external mapping records.
  // Never replace the existing landmark coloring unless this is verified as
  // the specific office building containing the Kantele point.
  function tryVerifiedKanteleFootprint(active) {
    const wayId=160444453, lat=34.7046972, lng=135.5102667;
    const sourceId='sug-r7-kantele-verified-building';
    active.addSource(sourceId,{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    active.addLayer({
      id:'sug-r7-kantele-exact-extrusion',type:'fill-extrusion',slot:'top',source:sourceId,
      paint:{
        'fill-extrusion-color':'#ffbf47',
        'fill-extrusion-height':['get','height'],
        'fill-extrusion-base':0,
        'fill-extrusion-opacity':1,
        'fill-extrusion-emissive-strength':0.8,
        'fill-extrusion-vertical-gradient':false
      }
    });
    container.dataset.kanteleWayStatus='checking';
    (async()=>{
      try{
        const response=await fetch('https://api.openstreetmap.org/api/0.6/way/'+wayId+'/full.json',
          {mode:'cors',credentials:'omit',signal:AbortSignal.timeout(12000)});
        if(!response.ok)throw Error('OSM HTTP '+response.status);
        const data=await response.json();
        const elements=Array.isArray(data.elements)?data.elements:[];
        const way=elements.find(e=>e.type==='way'&&e.id===wayId);
        if(!way||!Array.isArray(way.nodes)||way.nodes.length<4||!way.tags?.building)
          throw Error('Way is not a confirmed building footprint');
        const textTags=[way.tags.name,way.tags['name:ja'],way.tags.operator,way.tags.description]
          .filter(Boolean).join(' ');
        if(!/関西テレビ|カンテレ|Kansai Television|KTV|扇町スクエア|キッズプラザ/i.test(textTags))
          throw Error('Way name is not attributable to Kantele');
        const nodeMap=new Map(elements.filter(e=>e.type==='node').map(e=>[e.id,e]));
        const ring=way.nodes.map(id=>nodeMap.get(id)).map(n=>n?[n.lon,n.lat]:null);
        if(ring.length>1500||ring.some(p=>!p||!p.every(Number.isFinite)))
          throw Error('Invalid building coordinates');
        if(ring[0][0]!==ring[ring.length-1][0]||ring[0][1]!==ring[ring.length-1][1])
          throw Error('Unclosed building polygon');
        if(!pointInRing(lng,lat,ring) && distanceToRing(lat,lng,ring)>25)
          throw Error('Way is too far from the official address marker');
        let height=Number(way.tags.height);
        if(!Number.isFinite(height)||height<10||height>200) {
          const levels=Number(way.tags['building:levels']);
          height=Number.isFinite(levels)&&levels>=3&&levels<=55?levels*3:null;
        }
        if(!height)throw Error('No confirmed building height');
        if(view!==active)return;
        const source=active.getSource(sourceId);
        if(!source)return;
        source.setData({type:'FeatureCollection',features:[{
          type:'Feature',properties:{name:'関西テレビ（カンテレ）',height},
          geometry:{type:'Polygon',coordinates:[ring]}
        }]});
        container.dataset.kanteleWayStatus='verified-geometry-loaded';
      }catch(err){
        if(view===active){
          container.dataset.kanteleWayStatus='not-verified-original-preserved';
          container.dataset.kanteleWayError=String(err.message||err);
        }
      }
    })();
  }

  // Osaka Castle tower ONLY. Official building data:
  // Osaka City (2026-10-16): 39.4 m tower over 13.3 m stone base,
  // 52.7 m overall; official footprint 1177.97 m2.
  // The polygon is an OSM map geometry, NOT an official surveyed footprint.
  function addVerifiedOsakaCastleTower(active) {
    const sourceId='sug-r7-osakajo-tower-exact';
    const wayId=34619038;
    const landmark=LANDMARKS.find(p=>p.name==='大阪城');
    active.addSource(sourceId,{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    active.addLayer({
      id:'sug-r7-osakajo-tower-gold',type:'fill-extrusion',slot:'top',source:sourceId,
      paint:{
        'fill-extrusion-color':'#ffce65',
        'fill-extrusion-height':['get','height'],
        'fill-extrusion-base':0,
        'fill-extrusion-opacity':1,
        'fill-extrusion-emissive-strength':0.85,
        'fill-extrusion-vertical-gradient':false
      }
    });
    container.dataset.osakajoTowerStatus='loading';
    const thisView=active;
    (async()=>{
      try{
        const response=await fetch('https://api.openstreetmap.org/api/0.6/way/34619038/full.json',
          {mode:'cors',credentials:'omit',signal:AbortSignal.timeout(12000)});
        if(!response.ok)throw Error('OSM HTTP '+response.status);
        const data=await response.json();
        const elements=Array.isArray(data.elements)?data.elements:[];
        const way=elements.find(e=>e.type==='way'&&e.id===wayId);
        if(!way||!Array.isArray(way.nodes)||way.nodes.length<4||!way.tags?.building)
          throw Error('Osaka Castle building way not found');
        const tags=way.tags||{};
        const identity=[tags.name,tags['name:ja'],tags['name:en'],tags.historic,tags.tourism]
          .filter(Boolean).join(' ');
        if(!/大阪城|大坂城|Osaka.Castle|castle/i.test(identity))
          throw Error('OSM building identity does not match Osaka Castle');
        const nodes=new Map(elements.filter(e=>e.type==='node').map(e=>[e.id,e]));
        const ring=way.nodes.map(id=>nodes.get(id)).map(n=>n?[n.lon,n.lat]:null);
        if(ring.length>1000||ring.some(p=>!p||!p.every(Number.isFinite)))
          throw Error('OSM tower geometry invalid');
        if(ring[0][0]!==ring[ring.length-1][0]||ring[0][1]!==ring[ring.length-1][1])
          throw Error('OSM tower polygon not closed');
        if(!landmark||(!pointInRing(landmark.lng,landmark.lat,ring)
          && distanceToRing(landmark.lat,landmark.lng,ring)>35))
          throw Error('OSM tower footprint does not match castle POI');
        // Compute polygon area in local metric coordinates to reject a courtyard
        // or entire park being mistaken for the tower.
        const x0=ring[0][0],y0=ring[0][1];
        const mx=111320*Math.cos(landmark.lat*Math.PI/180),my=111320;
        let area=0;
        for(let i=1;i<ring.length;i++){
          const ax=(ring[i-1][0]-x0)*mx,ay=(ring[i-1][1]-y0)*my;
          const bx=(ring[i][0]-x0)*mx,by=(ring[i][1]-y0)*my;
          area+=ax*by-bx*ay;
        }
        area=Math.abs(area)/2;
        if(area<400||area>4000)throw Error('Tower footprint area not plausible: '+Math.round(area));
        if(view!==thisView)return;
        const source=active.getSource(sourceId);
        if(!source)return;
        // Simplified single extrusion. This is not an architectural 3D reconstruction.
        source.setData({type:'FeatureCollection',features:[{
          type:'Feature',
          properties:{name:'大阪城天守閣',height:52.7,wayId,areaM2:Math.round(area)},
          geometry:{type:'Polygon',coordinates:[ring]}
        }]});
        container.dataset.osakajoTowerStatus='geometry-loaded';
        container.dataset.osakajoTowerAreaM2=String(Math.round(area));
        active.once('idle',()=>{
          if(view!==thisView)return;
          try{
            const count=active.queryRenderedFeatures({layers:['sug-r7-osakajo-tower-gold']}).length;
            container.dataset.osakajoTowerRendered=String(count);
            container.dataset.osakajoTowerStatus=count>0?'rendered-in-current-view':'geometry-loaded-outside-view';
          }catch(err){container.dataset.osakajoTowerError=String(err.message||err);}
        });
      }catch(err){
        if(view===thisView){
          container.dataset.osakajoTowerStatus='not-verified-fallback-preserved';
          container.dataset.osakajoTowerError=String(err.message||err);
        }
      }
    })();
  }


  // Central Public Hall only: OSM Way 162382613 is a mapped building footprint.
  // Official building area: 2164m2; three storeys (building height not published).
  // This extrusion reproduces a verified outline, NOT the ornate roof/domes.
  function addVerifiedCentralPublicHall(active) {
    const sourceId='sug-r7-central-public-hall-exact', layerId='sug-r7-central-public-hall-brick';
    const wayId=162382613;
    const hall=LANDMARKS.find(p=>p.name==='大阪市中央公会堂');
    active.addSource(sourceId,{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    active.addLayer({id:layerId,type:'fill-extrusion',slot:'top',source:sourceId,
      paint:{
        'fill-extrusion-color':'#b85c45',
        'fill-extrusion-height':['get','height'],
        'fill-extrusion-base':0,
        'fill-extrusion-opacity':1,
        'fill-extrusion-emissive-strength':0.82,
        'fill-extrusion-vertical-gradient':false
      }});
    container.dataset.centralPublicHallStatus='loading';
    (async()=>{
      try {
        const response=await fetch('https://api.openstreetmap.org/api/0.6/way/162382613/full.json',
          {mode:'cors',credentials:'omit',signal:AbortSignal.timeout(12000)});
        if(!response.ok)throw Error('OSM HTTP '+response.status);
        const data=await response.json();
        const elements=Array.isArray(data.elements)?data.elements:[];
        const way=elements.find(e=>e.type==='way'&&e.id===wayId);
        if(!way||!way.tags?.building||!Array.isArray(way.nodes)||way.nodes.length<4)
          throw Error('Public Hall building way not found');
        const tags=way.tags;
        const identity=[tags.name,tags['name:ja'],tags['name:en'],tags['alt_name']]
          .filter(Boolean).join(' ');
        if(!/中央公会堂|Central.Public.Hall/i.test(identity))
          throw Error('OSM way identity is not Central Public Hall');
        const nodes=new Map(elements.filter(e=>e.type==='node').map(e=>[e.id,e]));
        const ring=way.nodes.map(id=>nodes.get(id)).map(n=>n?[n.lon,n.lat]:null);
        if(ring.length>1000||ring.some(p=>!p||!p.every(Number.isFinite)))
          throw Error('Invalid Public Hall outline');
        if(ring[0][0]!==ring[ring.length-1][0]||ring[0][1]!==ring[ring.length-1][1])
          throw Error('Public Hall polygon not closed');
        if(!hall||(!pointInRing(hall.lng,hall.lat,ring)
          && distanceToRing(hall.lat,hall.lng,ring)>45))
          throw Error('OSM outline does not match mapped Public Hall location');
        const x0=ring[0][0], y0=ring[0][1];
        const mx=111320*Math.cos(hall.lat*Math.PI/180),my=111320;
        let area=0;
        for(let i=1;i<ring.length;i++){
          const ax=(ring[i-1][0]-x0)*mx,ay=(ring[i-1][1]-y0)*my;
          const bx=(ring[i][0]-x0)*mx,by=(ring[i][1]-y0)*my;
          area+=ax*by-bx*ay;
        }
        area=Math.abs(area)/2;
        if(area<950||area>4500)throw Error('Unexpected Public Hall footprint area '+Math.round(area));
        let height=Number(tags.height);
        let heightSource='osm-height';
        if(!Number.isFinite(height)||height<8||height>65){
          // 3 floors is confirmed; this 15m block is a visual approximation, not measured.
          height=15;heightSource='estimated-three-storey-block';
        }
        if(view!==active)return;
        const source=active.getSource(sourceId);
        if(!source)return;
        source.setData({type:'FeatureCollection',features:[{
          type:'Feature',properties:{name:'大阪市中央公会堂',height:height+3,wayId,areaM2:Math.round(area)},
          geometry:{type:'Polygon',coordinates:[ring]}
        }]});
        container.dataset.centralPublicHallHeightSource=heightSource;
        container.dataset.centralPublicHallAreaM2=String(Math.round(area));
        container.dataset.centralPublicHallStatus='geometry-loaded';
        // Remove the former purple landmark candidate only after the exact polygon loads.
        landmarkGeometryHashes='';
        updateLandmarkBuildingColors(active);
        active.once('idle',()=>{
          if(view!==active)return;
          try{
            const count=active.queryRenderedFeatures({layers:[layerId]}).length;
            container.dataset.centralPublicHallRendered=String(count);
            container.dataset.centralPublicHallStatus=count>0
              ? 'geometry-loaded-rendered-in-current-view'
              : 'geometry-loaded-outside-current-view';
          }catch(err){container.dataset.centralPublicHallRenderError=String(err.message||err);}
        });
      }catch(err){
        if(view===active){
          container.dataset.centralPublicHallStatus='not-verified-fallback-preserved';
          container.dataset.centralPublicHallError=String(err.message||err);
        }
      }
    })();
  }

  function addLandmarkBuildingLayers(active) {
    active.addSource('sug-r7-landmark-building-overlays',{
      type:'geojson',data:{type:'FeatureCollection',features:[]}});
    active.addLayer({id:'sug-r7-landmark-building-extrusions',type:'fill-extrusion',
      slot:'top',source:'sug-r7-landmark-building-overlays',
      paint:{'fill-extrusion-color':['get','color'],
        'fill-extrusion-height':['get','height'],
        'fill-extrusion-base':0,
        'fill-extrusion-opacity':1,
        'fill-extrusion-emissive-strength':0.8,
        'fill-extrusion-vertical-gradient':false}});
    active.on('idle',()=>updateLandmarkBuildingColors(active));
    active.on('moveend',()=>updateLandmarkBuildingColors(active));
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
        'line-color': '#ff007f',
        'line-width': ['interpolate', ['linear'], ['zoom'], 14, 1.2, 17, 2.2, 19, 3.2],
        'line-blur': 1.2,
        'line-dasharray': [2, 2],
        'line-opacity': 0.85,
        'line-emissive-strength': 1
      }
    });

    // Zoom-interpolated Neon Pink Walked Trace & Active Walking Route (prevents thick pink bands)
    for (const [id, source, colorCore] of [
      ['trace', 'sug-r7-walk-trace', '#ff007f'],
      ['route', 'sug-r7-route', '#FF007F']
    ]) {
      layer({
        id: 'sug-r7-' + id + '-glow',
        type: 'line',
        source,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': id === 'route' ? '#FF4CA0' : '#ff007f',
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 14, 4, 17, 9, 19, 14],
          'line-blur': 3.5,
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
    view.easeTo({ center: [place.lng, place.lat], pitch: 54, duration: 600 });
  }

  // Real GPS motion only: no simulated steps, and no camera drift while stationary.
  function position(current, heading, follow) {
    if (!current || !Number.isFinite(current.lat) || !Number.isFinite(current.lng)) return;
    const coords = [current.lng, current.lat];
    const deltaMetres = (a, b) => Math.hypot(
      (a.lng - b.lng) * 111320 * Math.cos(current.lat * Math.PI / 180),
      (a.lat - b.lat) * 111320
    );
    if (!lastFix || deltaMetres(current, lastFix) >= 2) {
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
    // A very uncertain GPS fix must not throw the walking camera across streets.
    if (Number.isFinite(current.accuracy) && current.accuracy > 80) return;
    const travelled = cameraAnchor ? deltaMetres(current, cameraAnchor) : Infinity;
    const minMovement = Math.max(3, Math.min(12, (current.accuracy || 6) * 0.5));
    if (cameraAnchor && travelled < minMovement) return;

    let bearing = Number.isFinite(heading) && heading >= 0 ? heading : null;
    if (bearing === null && bearingAnchor) {
      const moved = deltaMetres(current, bearingAnchor);
      const confidence = Math.max(5, ((current.accuracy || 0) + (bearingAnchor.accuracy || 0)) / 2);
      if (moved >= confidence) {
        const east = (current.lng - bearingAnchor.lng) * 111320 * Math.cos(current.lat * Math.PI / 180);
        const north = (current.lat - bearingAnchor.lat) * 111320;
        bearing = Math.atan2(east, north) * 180 / Math.PI;
        bearingAnchor = current;
      }
    }
    if (!bearingAnchor) bearingAnchor = current;
    if (bearing !== null) {
      // Shortest-angle smoothing prevents sudden 360-degree turns near north.
      stableBearing = stableBearing === null ? bearing
        : stableBearing + (((bearing - stableBearing + 540) % 360) - 180) * 0.35;
    }
    cameraAnchor = current;
    const camera = {
      center: coords,
      zoom: cameraMode === 'eye' ? 18.15 : 18.25,
      pitch: cameraMode === 'eye' ? 78 : 72,
      offset: [0, Math.round(Math.max(0, container.clientHeight) * (cameraMode === 'eye' ? 0.14 : 0.20))],
      duration: 950,
      essential: true
    };
    if (stableBearing !== null) camera.bearing = stableBearing;
    view.easeTo(camera);
    container.dataset.camera = 'pedestrian-follow-gps';
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
        center: MINT_MUSEUM_INSPECTION ? [135.52167,34.69592] : [HUB.lng, HUB.lat],
        zoom: MINT_MUSEUM_INSPECTION ? 18 : (cameraMode === 'eye' ? 18.15 : 17.3),
        pitch: MINT_MUSEUM_INSPECTION ? 68 : (cameraMode === 'eye' ? 78 : 65),
        bearing: -68,
        maxPitch: 85,
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
          // Avoid double geometry: Standard's own buildings render instead of our flat
          // fill-extrusions and hand-built facade windows. Keep all other existing data.
          // The old implementation remains preserved in Git history for A/B and rollback.
          container.dataset.buildingColorRequested = 'mapbox-standard-native-3d';
          container.dataset.cityWindowStatus = 'standard-facades-coverage-dependent';
          container.dataset.customBuildingExtrusions = 'disabled-to-prevent-overlap';
          container.dataset.facadeLightSource = 'standard-style';
          addOsakaLandscapeLayers(active);
          addVerifiedOgimachiPark(active);
          addVerifiedNakanoshimaPark(active);
          addVerifiedOsakaCastlePark(active);
          addGeoLayers(active);
          addSpotMarkers(gl);
          addJRTemmaStationMarker(gl);
          addOsakaTenmanguFocus(gl);
          ready = true;
          drawHighlightedStores(gl);
          if (lastFix) position(lastFix, null, false);
          pending = false;
          clearTimeout(timeout);
          timeout = null;

          container.dataset.state = 'style-ready';
          container.dataset.basemap = 'mapbox-standard-native-3d-neon';
          container.dataset.camera = MINT_MUSEUM_INSPECTION ? 'mint-museum-inspection' : 'hachikenya-okawa-eye-level';
          container.dataset.renderedBuildings = 'mapbox-standard-enabled-not-device-verified';
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

  function setCameraMode(mode) {
    if (mode !== 'eye' && mode !== 'overview') return false;
    cameraMode = mode;
    container.dataset.viewMode = mode;
    // Switching camera mode must work even without GPS consent or movement.
    if (view && ready) {
      view.easeTo({
        zoom: mode === 'eye' ? 18.15 : 17.3,
        pitch: mode === 'eye' ? 78 : 65,
        offset: [0, mode === 'eye' ? Math.round(container.clientHeight * 0.14) : 0],
        duration: 850,
        essential: true
      });
    }
    return true;
  }

  toggle.onclick = () => (view || pending ? close() : open());
  window.addEventListener('orientationchange', resize);

  return {
    position,
    setCameraMode,
    getCameraMode: () => cameraMode,
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
      cameraAnchor = null;
      stableBearing = null;
      trace = [];
      updateSource('sug-r7-user', EMPTY);
      updateSource('sug-r7-walk-trace', EMPTY);
    },
    focus(center, zoom = 18.25) {
      if (!view) return false;
      view.easeTo({ center, zoom: cameraMode === 'eye' ? 18.15 : zoom, pitch: cameraMode === 'eye' ? 78 : 72 });
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