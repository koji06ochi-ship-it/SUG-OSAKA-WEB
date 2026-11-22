/* S.u.G WALK R7 - Mapbox Standard 3D module, loaded only when 3D is requested. */
window.createOsaka3D = function createOsaka3D(ui) {
  const container = document.getElementById('osaka-3d');
  const toggle = document.getElementById('osaka-toggle');
  if (!container || !toggle) throw new Error('R7 3D containers are missing');
  let sdkPromise = null, view = null, pin = null, userMarker = null;
  let pending = false, generation = 0, timeoutId = null, bearingAnchor = null;
  let lastGPS = null, following = true, headingUpdates = 0, gpsUpdates = 0, lastMeasure = 0;
  let spots = [], track = [], lastPulse = 0, lastError = '', pulseFrame = null;
  const HUB = {lat:34.690616,lng:135.514183};
  const SPOTS = [
    {name:'八軒家浜（川沿い遊歩道）',lat:34.690616,lng:135.514183},
    {name:'中之島公園（中央公会堂前）',lat:34.693213,lng:135.504950},
    {name:'JR天満駅',lat:34.7049333,lng:135.5121361}
  ];
  const PINK = '#ff3b9a';
  container.dataset.revision = 'r7-mapbox-standard-mobile';
  container.dataset.state = 'closed';
  container.dataset.renderedBuildings = 'unverified';
  function explain(err, fallback) {
    const raw = err && (err.message || err.error?.message || String(err));
    if (/401|403|not authorized|access token|invalid token/i.test(raw || '')) return 'Mapboxトークンを確認してください（認証エラー）。';
    if (!navigator.onLine) return 'オフラインのため3Dを表示できません。';
    if (/webgl|context/i.test(raw || '')) return 'WebGLが利用できません。2D地図に戻ります。';
    return fallback || '3D地図の読み込みに失敗しました。2D地図に戻ります。';
  }
  function notice(message) { if (message && message !== lastError) {lastError = message; ui.notice(message);} }
  function fail(error, fallback) {
    const message = explain(error, fallback);
    close(message);
  }
  function close(message) {
    ++generation;
    pending = false;
    clearTimeout(timeoutId);
    timeoutId = null;
    if (pulseFrame !== null && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(pulseFrame);
    pulseFrame = null;
    if (view) { try { view.remove(); } catch (_) {} }
    view = pin = userMarker = bearingAnchor = lastGPS = null;
    spots.forEach(m => {try {m.remove();} catch (_) {}});
    spots = [];
    track = [];
    container.hidden = true;
    container.dataset.state = message ? 'fallback-2d' : 'closed';
    container.dataset.reason = message || '';
    container.dataset.renderedBuildings = 'unverified';
    toggle.textContent = '3D';
    toggle.setAttribute('aria-pressed', 'false');
    if (message) notice(message);
  }
  function loadSDK() {
    if (window.mapboxgl) return Promise.resolve(window.mapboxgl);
    if (!sdkPromise) sdkPromise = new Promise((resolve, reject) => {
      const root = 'https://api.mapbox.com/mapbox-gl-js/v3.15.0/';
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = root + 'mapbox-gl.css';
      const js = document.createElement('script');
      js.src = root + 'mapbox-gl.js';
      Promise.all([css, js].map(node => new Promise((ok, failLoad) => {
        node.onload = ok;
        node.onerror = () => failLoad(new Error('Mapbox SDK load failed'));
        document.head.appendChild(node);
      }))).then(() => {
        if (!window.mapboxgl) throw new Error('Mapbox SDK was not initialized');
        resolve(window.mapboxgl);
      }).catch(err => {css.remove();js.remove();sdkPromise=null;reject(err);});
    });
    return sdkPromise;
  }
  function circleRing(center, metres, segments=96) {
    const coords = [];
    const radiusLat = metres / 111320;
    const radiusLng = metres / (111320 * Math.cos(center.lat * Math.PI/180));
    for (let i=0;i<=segments;i++) {
      const a = (i/segments)*Math.PI*2;
      coords.push([center.lng+Math.cos(a)*radiusLng,center.lat+Math.sin(a)*radiusLat]);
    }
    return {type:'Feature',properties:{name:'八軒家浜180mリング'},geometry:{type:'LineString',coordinates:coords}};
  }
  function collection(features=[]) {return {type:'FeatureCollection',features};}
  function pointFeature(lng, lat) {
    return {type:'Feature',properties:{},geometry:{type:'Point',coordinates:[lng,lat]}};
  }
  function pathFeature() {
    return {type:'Feature',properties:{},geometry:{type:'LineString',coordinates:track.slice()}};
  }
  function installGlowCSS() {
    if (document.getElementById('sug-r7-mapbox-marker-style')) return;
    const style = document.createElement('style');
    style.id = 'sug-r7-mapbox-marker-style';
    style.textContent = '.sug-r7-3d-spot{border:1px solid #ff3b9a;border-radius:13px;padding:7px 9px;background:rgba(8,5,16,.80);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);box-shadow:0 0 14px #ff3b9a88;color:#ffe9f5;font:600 11px -apple-system,BlinkMacSystemFont,sans-serif;white-space:nowrap;cursor:pointer}.sug-r7-3d-spot:focus-visible{outline:3px solid #fff}';
    document.head.appendChild(style);
  }
  function addSpots(active) {
    installGlowCSS();
    spots.forEach(m => {try {m.remove();} catch (_) {}});
    spots = SPOTS.map(place => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'sug-r7-3d-spot';
      el.textContent = place.name;
      el.setAttribute('aria-label',place.name+'を目的地にする');
      el.addEventListener('click', e => {e.stopPropagation();ui.select(place);});
      return new window.mapboxgl.Marker({element:el,anchor:'bottom'}).setLngLat([place.lng,place.lat]).addTo(active);
    });
  }
  function addOverlay(active) {
    const slot = 'middle';
    const src = (id,data) => active.addSource(id,{type:'geojson',data});
    const line = (id,source,paint) => active.addLayer({id,type:'line',source,slot,layout:{'line-cap':'round','line-join':'round'},paint});
    src('sug-r7-trail',collection());
    src('sug-r7-arrival',collection([circleRing(HUB,180)]));
    src('sug-r7-position',collection());
    line('sug-r7-trail-glow','sug-r7-trail',{
      'line-color':PINK,'line-width':13,'line-opacity':0.24,'line-emissive-strength':1
    });
    line('sug-r7-trail-core','sug-r7-trail',{
      'line-color':PINK,'line-width':3.4,'line-opacity':0.96,'line-emissive-strength':1
    });
    line('sug-r7-arrival-glow','sug-r7-arrival',{
      'line-color':PINK,'line-width':9,'line-opacity':0.2,'line-emissive-strength':1
    });
    line('sug-r7-arrival-core','sug-r7-arrival',{
      'line-color':PINK,'line-width':2,'line-dasharray':[3,3],
      'line-opacity':0.86,'line-emissive-strength':1
    });
    active.addLayer({id:'sug-r7-user-pulse',type:'circle',source:'sug-r7-position',slot,
      paint:{'circle-radius':12,'circle-color':PINK,'circle-opacity':0.24,
        'circle-stroke-color':'#fff','circle-stroke-width':1.5,
        'circle-emissive-strength':1}});
    active.addLayer({id:'sug-r7-user-center',type:'circle',source:'sug-r7-position',slot,
      paint:{'circle-radius':5.5,'circle-color':PINK,'circle-opacity':1,
        'circle-stroke-color':'#fff','circle-stroke-width':1.5,
        'circle-emissive-strength':1}});
  }
  function startPulse(active) {
    if (typeof window.requestAnimationFrame !== 'function') return;
    function frame(timestamp) {
      if (active !== view || container.hidden) return;
      if (timestamp - lastPulse >= 60 && !document.hidden) {
        lastPulse = timestamp;
        const phase = (Math.sin(timestamp / 380) + 1) / 2;
        if (active.getLayer('sug-r7-user-pulse')) {
          active.setPaintProperty('sug-r7-user-pulse','circle-radius',9 + 12 * phase);
          active.setPaintProperty('sug-r7-user-pulse','circle-opacity',0.36 * (1 - phase) + 0.08);
        }
      }
      pulseFrame = window.requestAnimationFrame(frame);
    }
    pulseFrame = window.requestAnimationFrame(frame);
  }
  function refreshPosition(active) {
    if (active !== view || !active.getSource('sug-r7-position')) return;
    const p = lastGPS ? collection([pointFeature(lastGPS.lng,lastGPS.lat)]) : collection();
    active.getSource('sug-r7-position').setData(p);
    active.getSource('sug-r7-trail').setData(track.length>1?collection([pathFeature()]):collection());
  }
  function onCameraRender(active) {
    if (active !== view || Date.now()-lastMeasure < 500) return;
    lastMeasure = Date.now();
    container.dataset.pitch = String(active.getPitch());
    container.dataset.gpsUpdates = String(gpsUpdates);
    container.dataset.headingUpdates = String(headingUpdates);
    container.dataset.renderedBuildings = 'unverified';
    const dock = document.querySelector('.bottom-dock');
    if (dock) {
      const b = Math.max(0,container.getBoundingClientRect().bottom-dock.getBoundingClientRect().top+4);
      container.style.setProperty('--osaka-attribution-bottom',b+'px');
    }
  }
  function destination(place) {
    if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng) || !view) return;
    if (!pin) pin = new window.mapboxgl.Marker({color:PINK});
    pin.setLngLat([place.lng,place.lat]).addTo(view);
    view.easeTo({center:[place.lng,place.lat],duration:550});
  }
  function position(current, heading, follow) {
    if (!current || !Number.isFinite(current.lat) || !Number.isFinite(current.lng)) return;
    const previous = lastGPS;
    lastGPS = {...current};
    if (!view) return;
    ++gpsUpdates;
    if (!userMarker) userMarker = new window.mapboxgl.Marker({color:'#50eaff'});
    userMarker.setLngLat([current.lng,current.lat]).addTo(view);
    if (!previous || Math.hypot((current.lng-previous.lng)*111320*Math.cos(current.lat*Math.PI/180),(current.lat-previous.lat)*111320)>=2) {
      track.push([current.lng,current.lat]);
      if (track.length>1200) track.shift();
    }
    refreshPosition(view);
    if (!follow || !following) return;
    const camera = {center:[current.lng,current.lat],duration:550,essential:true};
    if (typeof heading==='number' && Number.isFinite(heading)) {
      camera.bearing = heading;
      ++headingUpdates;
      bearingAnchor = current;
    } else {
      if (!bearingAnchor || current.t-bearingAnchor.t>60000) bearingAnchor=current;
      if (Number.isFinite(current.t) && Number.isFinite(bearingAnchor.t) && current.t>bearingAnchor.t) {
        const east=(current.lng-bearingAnchor.lng)*111320*Math.cos(current.lat*Math.PI/180);
        const north=(current.lat-bearingAnchor.lat)*111320;
        if (Math.hypot(east,north)>=Math.max(4,current.accuracy||0,bearingAnchor.accuracy||0)) {
          camera.bearing=Math.atan2(east,north)*180/Math.PI;
          ++headingUpdates;
          bearingAnchor=current;
        }
      }
    }
    view.easeTo(camera);
  }
  function resize() {
    if (view && !container.hidden) {
      try {view.resize();onCameraRender(view);return true;} catch (err) {fail(err,'3D画面サイズを更新できません。');}
    }
    return false;
  }
  function resumeFollow() {
    following=true;
    if (view && lastGPS) view.easeTo({center:[lastGPS.lng,lastGPS.lat],zoom:17.2,pitch:65,duration:550});
  }
  async function open() {
    const token=window.SUGMapboxPublicToken;
    if (typeof token!=='string' || !/^pk\.[A-Za-z0-9._-]+$/.test(token)) {
      close('Mapbox公開トークンが未設定です。');return;
    }
    if (window.SUGMapboxFreeTierConfirmed!==true) {
      close('Mapbox利用条件の確認が必要です。');return;
    }
    const id=++generation;
    pending=true;
    lastError='';
    container.dataset.state='loading';
    container.dataset.reason='';
    timeoutId=setTimeout(() => {if (generation===id) close('3D地図の読み込みがタイムアウトしました。');},20000);
    try {
      if (typeof navigator!=='undefined' && navigator.onLine===false) throw new Error('Offline');
      const gl=await loadSDK();
      if (id!==generation) return;
      container.hidden=false;
      following=true;
      track=[];
      view=new gl.Map({
        container,accessToken:token,style:'mapbox://styles/mapbox/standard',
        config:{basemap:{lightPreset:'night',show3dObjects:true,
          showPointOfInterestLabels:false,showTransitLabels:false}},
        center:ui.center(),zoom:17.2,pitch:65,maxPitch:72,antialias:true
      });
      const active=view;
      active.on('error',e => {if (active===view) fail(e.error||e,'3D地図を読み込めません。');});
      active.on('webglcontextlost',e => {if (active===view) fail(e,'WebGLが停止しました。');});
      active.on('dragstart',()=>{following=false;ui.pauseFollow();});
      active.on('rotatestart',e=>{if(e.originalEvent){following=false;ui.pauseFollow();}});
      active.on('click',e=>ui.select({name:'選んだ地点',lat:e.lngLat.lat,lng:e.lngLat.lng}));
      active.once('style.load',()=>{
        if (active!==view) return;
        try {
          for (const [property,value] of Object.entries({lightPreset:'night',show3dObjects:true,
            showPointOfInterestLabels:false,showTransitLabels:false})) {
            active.setConfigProperty('basemap',property,value);
          }
          addOverlay(active);
          addSpots(active);
          refreshPosition(active);
        } catch (err) {fail(err,'3D表示レイヤーの初期化に失敗しました。');}
      });
      active.once('load',()=>{
        if (active!==view) return;
        pending=false;clearTimeout(timeoutId);timeoutId=null;
        container.dataset.state='style-ready';
        toggle.textContent='2D';
        toggle.setAttribute('aria-pressed','true');
        active.on('render',()=>onCameraRender(active));
        startPulse(active);
        resize();
        if (typeof ui.onReady==='function') ui.onReady();
      });
    } catch (err) {
      if (generation===id) fail(err,'3D地図を起動できません。');
    }
  }
  toggle.onclick=()=>view||pending?close():open();
  window.addEventListener('resize',resize);
  window.addEventListener('orientationchange',()=>requestAnimationFrame(resize));
  return {
    position,destination,close,resize,resumeFollow,
    clearPosition(){userMarker?.remove();userMarker=null;lastGPS=bearingAnchor=null;track=[];if(view)refreshPosition(view);},
    focus(center,zoom=16){if(!view)return false;view.easeTo({center,zoom});return true;},
    zoom(delta){if(!view)return false;view.zoomTo(view.getZoom()+delta);return true;}
  };
};