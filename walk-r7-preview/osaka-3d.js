/* R7 Osaka MAP — Mapbox Standard 3D. No token or fabricated route data in source. */
window.createOsaka3D = function createOsaka3D(ui) {
  'use strict';
  const container = document.getElementById('osaka-3d');
  const toggle = document.getElementById('osaka-toggle');
  const HUB = ui.hub || {lat:34.690616,lng:135.514183};
  const EMPTY = {type:'FeatureCollection',features:[]};
  const spots = Array.isArray(ui.spots) ? ui.spots.filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && typeof p.name === 'string') : [];
  let sdkPromise=null, view=null, pending=false, generation=0, timeout=null, currentMarker=null;
  let spotMarkers=[], trace=[], routeCoords=[], bearingAnchor=null, lastFix=null, ready=false;
  container.dataset.state='closed';
  container.dataset.renderedBuildings='unverified';

  function notify(message) { if (typeof ui.notice === 'function') ui.notice(message); }
  function isActive() { return !!view && !container.hidden; }
  function featureLine(coords) {
    return coords.length>=2 ? {type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:coords}}]} : EMPTY;
  }
  function featurePoint(fix) {
    return fix ? {type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[fix.lng,fix.lat]}}]} : EMPTY;
  }
  function radiusPolygon(center,metres) {
    const n=72, latRad=center.lat*Math.PI/180, out=[];
    for(let i=0;i<=n;i++){
      const a=i*2*Math.PI/n;
      const dLat=Math.cos(a)*metres/111320;
      const dLng=Math.sin(a)*metres/(111320*Math.cos(latRad));
      out.push([center.lng+dLng,center.lat+dLat]);
    }
    return {type:'FeatureCollection',features:[{type:'Feature',properties:{radiusMetres:metres},geometry:{type:'Polygon',coordinates:[out]}}]};
  }
  function updateSource(name,data) {
    if (!ready || !view) return;
    const src=view.getSource(name);
    if(src) src.setData(data);
  }
  function styleMarkers() {
    if(document.getElementById('sug-r7-mapbox-marker-style'))return;
    const css=document.createElement('style');
    css.id='sug-r7-mapbox-marker-style';
    css.textContent='.sug-r7-spot{padding:6px 9px;border:1px solid #ff3b9a;border-radius:12px;background:rgba(6,4,15,.82);color:#fff;box-shadow:0 0 15px #ff3b9a80;backdrop-filter:blur(9px);font:600 11px -apple-system,sans-serif;white-space:nowrap;cursor:pointer}.sug-r7-spot:focus-visible{outline:2px solid #fff}';
    document.head.appendChild(css);
  }
  function clearMarkers() {
    for(const m of spotMarkers)m.remove();
    spotMarkers=[];
    if(currentMarker){currentMarker.remove();currentMarker=null;}
  }
  function addSpotMarkers(gl) {
    styleMarkers();
    for(const place of spots){
      const el=document.createElement('button');
      el.type='button';el.className='sug-r7-spot';el.textContent=place.name;
      el.addEventListener('click',e=>{e.stopPropagation();ui.select(place);});
      spotMarkers.push(new gl.Marker({element:el,anchor:'bottom'}).setLngLat([place.lng,place.lat]).addTo(view));
    }
  }
  function close(message) {
    generation++; pending=false;ready=false;clearTimeout(timeout);timeout=null;
    clearMarkers();
    if(view){try{view.remove();}catch(e){}}
    view=null;container.hidden=true;
    container.dataset.state=message?'fallback-2d':'closed';
    toggle.textContent='3D';toggle.setAttribute('aria-pressed','false');
    if(message)notify(message);
  }
  function loadSDK() {
    if(window.mapboxgl)return Promise.resolve(window.mapboxgl);
    if(sdkPromise)return sdkPromise;
    sdkPromise=new Promise((resolve,reject)=>{
      const root='https://api.mapbox.com/mapbox-gl-js/v3.15.0/';
      const css=document.createElement('link');css.rel='stylesheet';css.href=root+'mapbox-gl.css';
      const js=document.createElement('script');js.src=root+'mapbox-gl.js';
      Promise.all([css,js].map(el=>new Promise((ok,fail)=>{el.onload=ok;el.onerror=fail;document.head.appendChild(el);})))
        .then(()=>window.mapboxgl?resolve(window.mapboxgl):reject(Error('Mapbox SDK unavailable')))
        .catch(err=>{css.remove();js.remove();sdkPromise=null;reject(err);});
    });
    return sdkPromise;
  }
  function addGeoLayers(active) {
    const src=(id,data)=>active.addSource(id,{type:'geojson',data});
    const layer=obj=>active.addLayer(Object.assign({slot:'middle'},obj));
    src('sug-r7-walk-trace',featureLine(trace));
    src('sug-r7-route',featureLine(routeCoords));
    src('sug-r7-user',featurePoint(lastFix));
    src('sug-r7-arrival-ring',radiusPolygon(HUB,180));
    layer({id:'sug-r7-arrival-fill',type:'fill',source:'sug-r7-arrival-ring',paint:{'fill-color':'#ff3b9a','fill-opacity':0.06}});
    layer({id:'sug-r7-arrival-outline',type:'line',source:'sug-r7-arrival-ring',paint:{'line-color':'#ff3b9a','line-width':2,'line-blur':1.5,'line-emissive-strength':1}});
    for(const [id,source] of [['trace','sug-r7-walk-trace'],['route','sug-r7-route']]){
      layer({id:'sug-r7-'+id+'-glow',type:'line',source,layout:{'line-join':'round','line-cap':'round'},
        paint:{'line-color':'#ff3b9a','line-width':12,'line-blur':7,'line-opacity':0.8,'line-emissive-strength':1}});
      layer({id:'sug-r7-'+id+'-core',type:'line',source,layout:{'line-join':'round','line-cap':'round'},
        paint:{'line-color':'#ff3b9a','line-width':3,'line-opacity':1,'line-emissive-strength':1}});
    }
    layer({id:'sug-r7-gps-halo',type:'circle',source:'sug-r7-user',paint:{'circle-color':'#ff3b9a','circle-radius':20,'circle-blur':0.85,'circle-opacity':0.85,'circle-emissive-strength':1}});
    layer({id:'sug-r7-gps-dot',type:'circle',source:'sug-r7-user',paint:{'circle-color':'#fff2fa','circle-radius':7,'circle-stroke-color':'#ff3b9a','circle-stroke-width':3,'circle-emissive-strength':1}});
  }
  function errorText(err) {
    const message=String(err && (err.message || err.error?.message || err) || '');
    if(/401|403|unauthorized|forbidden|invalid token|access token/i.test(message))return 'Mapbox認証エラー（トークン・URL制限を確認）。2Dに戻しました。';
    if(/webgl|context|gpu/i.test(message))return 'WebGL描画エラー。2Dに戻しました。';
    if(!navigator.onLine || /network|fetch|offline|failed to load/i.test(message))return 'Mapbox通信エラー（オフライン・接続制限）。2Dに戻しました。';
    return '3D地図の読み込みエラー。2Dに戻しました。';
  }
  function resize() {
    if(!isActive())return false;
    requestAnimationFrame(()=>{if(view && !container.hidden && container.clientWidth>0 && container.clientHeight>0)view.resize();});
    return true;
  }
  function destination(place) {
    if(!view || !place || !Number.isFinite(place.lng) || !Number.isFinite(place.lat))return;
    view.easeTo({center:[place.lng,place.lat],duration:550});
  }
  function position(current,heading,follow) {
    if(!current || !Number.isFinite(current.lat) || !Number.isFinite(current.lng))return;
    const coords=[current.lng,current.lat];
    if(!lastFix || Math.hypot((current.lng-lastFix.lng)*111320*Math.cos(current.lat*Math.PI/180),(current.lat-lastFix.lat)*111320)>=2) {
      trace.push(coords);
      if(trace.length>500)trace.shift();
    }
    lastFix=current;
    updateSource('sug-r7-user',featurePoint(current));
    updateSource('sug-r7-walk-trace',featureLine(trace));
    if(!view || !ready || !follow)return;
    let bearing=Number.isFinite(heading)?heading:null;
    const previous=(heading && typeof heading==='object' && Number.isFinite(heading.lat))?heading:bearingAnchor;
    if(bearing===null && previous && Number.isFinite(previous.lat) && Number.isFinite(previous.lng)){
      const east=(current.lng-previous.lng)*111320*Math.cos(current.lat*Math.PI/180);
      const north=(current.lat-previous.lat)*111320;
      if(Math.hypot(east,north)>=Math.max(4,current.accuracy||0,previous.accuracy||0)){
        bearing=Math.atan2(east,north)*180/Math.PI;
        bearingAnchor=current;
      }
    }
    if(!bearingAnchor)bearingAnchor=current;
    const camera={center:coords,duration:650,essential:true};
    if(bearing!==null)camera.bearing=bearing;
    view.easeTo(camera);
  }
  function route(coordinates) {
    // Only actual supplied route geometry is drawn. No invented walking directions.
    routeCoords=Array.isArray(coordinates)?coordinates.filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)):[];
    updateSource('sug-r7-route',featureLine(routeCoords));
  }
  async function open() {
    if(pending || view)return;
    const token=window.SUGMapboxPublicToken;
    if(typeof token!=='string' || !/^pk\.[A-Za-z0-9._-]+$/.test(token)){
      close('Mapbox公開トークンが未設定です。2D地図を表示します。');return;
    }
    if(window.SUGMapboxFreeTierConfirmed!==true){
      close('Mapbox利用条件の確認が必要です。2D地図を表示します。');return;
    }
    if(!navigator.onLine){close('オフラインのため3Dを起動できません。2D地図を表示します。');return;}
    const id=++generation;pending=true;ready=false;
    container.dataset.state='loading';container.dataset.reason='';
    timeout=setTimeout(()=>{if(generation===id)close('3D地図の読み込みがタイムアウトしました。2Dに戻しました。');},20000);
    try {
      const gl=await loadSDK();
      if(generation!==id)return;
      if(!gl.supported()){close('この端末ではWebGLが利用できません。2Dに戻しました。');return;}
      container.hidden=false;
      view=new gl.Map({
        container,accessToken:token,style:'mapbox://styles/mapbox/standard',
        config:{basemap:{lightPreset:'night',show3dObjects:true,showPointOfInterestLabels:false,showTransitLabels:false}},
        center:ui.center(),zoom:17.2,pitch:65,maxPitch:75,antialias:true
      });
      const active=view;
      active.on('error',e=>{
        if(active!==view)return;
        const msg=String(e.error?.message||'');
        if(!ready || /401|403|unauthorized|forbidden|invalid token/i.test(msg))close(errorText(e.error));
      });
      active.on('webglcontextlost',()=>{if(active===view)close('WebGL描画が停止しました。2Dに戻しました。');});
      active.on('dragstart',()=>{if(active===view)ui.pauseFollow();});
      active.on('rotatestart',e=>{if(active===view && e.originalEvent)ui.pauseFollow();});
      active.on('click',e=>ui.select({name:'選んだ地点',lat:e.lngLat.lat,lng:e.lngLat.lng}));
      active.once('style.load',()=>{
        if(active!==view)return;
        try{
          for(const [key,val] of Object.entries({lightPreset:'night',show3dObjects:true,showPointOfInterestLabels:false,showTransitLabels:false})){
            try{active.setConfigProperty('basemap',key,val);}catch(e){/* Config option unavailable in this SDK/style revision. */}
          }
          addGeoLayers(active);
          addSpotMarkers(gl);
          ready=true;pending=false;clearTimeout(timeout);timeout=null;
          container.dataset.state='style-ready';
          toggle.textContent='2D';toggle.setAttribute('aria-pressed','true');
          resize();
          if(typeof ui.onReady==='function')ui.onReady();
        }catch(err){close(errorText(err));}
      });
    }catch(err){if(generation===id)close(errorText(err));}
  }
  toggle.onclick=()=>view||pending?close():open();
  window.addEventListener('orientationchange',resize);
  return {position,destination,route,resize,close,
    clearPosition(){lastFix=null;bearingAnchor=null;trace=[];updateSource('sug-r7-user',EMPTY);updateSource('sug-r7-walk-trace',EMPTY);},
    focus(center,zoom=17.2){if(!view)return false;view.easeTo({center,zoom});return true;},
    zoom(delta){if(!view)return false;view.zoomTo(view.getZoom()+delta);return true;},
    isActive};
};
