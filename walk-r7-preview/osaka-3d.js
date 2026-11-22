/* Loaded only when the user opens 3D with a configured public token. */
window.createOsaka3D = function (ui) {
  const container = document.getElementById('osaka-3d');
  const toggle = document.getElementById('osaka-toggle');
  let sdk, view, pin, person, pending = false, generation = 0, timer, bearingAnchor;
  let gpsUpdates = 0, headingUpdates = 0, lastMeasured = 0;
  container.dataset.revision = 'r7-mapbox-review-r1';
  container.dataset.state = 'closed';
  function measure(active) {
    if (active !== view || !active.getLayer('osaka-buildings') || Date.now()-lastMeasured < 500) return;
    lastMeasured = Date.now();
    const dock = document.querySelector('.bottom-dock');
    if (dock) {
      const bottom = Math.max(0,container.getBoundingClientRect().bottom-dock.getBoundingClientRect().top+4)+'px';
      if (container.style.getPropertyValue('--osaka-attribution-bottom') !== bottom) container.style.setProperty('--osaka-attribution-bottom',bottom);
    }
    const buildings = active.queryRenderedFeatures({layers:['osaka-buildings']});
    container.dataset.renderedBuildings = String(buildings.length);
    container.dataset.pitch = String(active.getPitch());
    container.dataset.state = buildings.length ? 'buildings-rendered' : 'map-ready-no-buildings';
  }
  function close(message) {
    generation++;
    pending = false;
    clearTimeout(timer);
    if (view) view.remove();
    view = pin = person = bearingAnchor = null;
    container.hidden = true;
    container.dataset.state = message ? 'fallback-2d' : 'closed';
    container.dataset.renderedBuildings = '0';
    toggle.textContent = '3D';
    toggle.setAttribute('aria-pressed','false');
    if (message) ui.notice(message);
  }
  function loadSDK() {
    if (window.mapboxgl) return Promise.resolve(window.mapboxgl);
    if (!sdk) sdk = new Promise((resolve,reject) => {
      const root = 'https://api.mapbox.com/mapbox-gl-js/v3.15.0/';
      const style = document.createElement('link');
      style.rel = 'stylesheet'; style.href = root + 'mapbox-gl.css';
      const script = document.createElement('script');
      script.src = root + 'mapbox-gl.js';
      Promise.all([style,script].map(node => new Promise((ok,fail) => {
        node.onload = ok; node.onerror = fail; document.head.append(node);
      }))).then(() => resolve(window.mapboxgl)).catch(() => {
        style.remove(); script.remove(); sdk = null; reject(Error('SDK load'));
      });
    });
    return sdk;
  }
  function destination(place) {
    if (!view || !place) return;
    if (!pin) pin = new window.mapboxgl.Marker({color:'#ff268b'});
    pin.setLngLat([place.lng,place.lat]).addTo(view);
    view.easeTo({center:[place.lng,place.lat]});
  }
  function position(current,previous,follow) {
    if (!view) return;
    const center = [current.lng,current.lat];
    if (!person) person = new window.mapboxgl.Marker({color:'#50eaff'});
    person.setLngLat(center).addTo(view);
    container.dataset.gpsUpdates = String(++gpsUpdates);
    if (!follow) return;
    const camera = {center,duration:450};
    if (!bearingAnchor || current.t-bearingAnchor.t > 60000) bearingAnchor = current;
    previous = bearingAnchor;
    if (current.t > previous.t) {
      const east = (current.lng-previous.lng)*111320*Math.cos(current.lat*Math.PI/180);
      const north = (current.lat-previous.lat)*111320;
      if (Math.hypot(east,north) >= Math.max(4,current.accuracy,previous.accuracy)) {
        camera.bearing = Math.atan2(east,north)*180/Math.PI;
        container.dataset.headingUpdates = String(++headingUpdates);
        bearingAnchor = current;
      }
    }
    view.easeTo(camera);
  }
  async function open() {
    const token = window.SUGMapboxPublicToken;
    if (typeof token !== 'string' || !token.startsWith('pk.')) {
      container.dataset.reason = 'public-token-missing';
      ui.notice('3D地図の認証が未設定です。2D地図を表示します。'); return;
    }
    if (window.SUGMapboxFreeTierConfirmed !== true) {
      container.dataset.reason = 'free-allowance-unconfirmed';
      ui.notice('Mapboxの無料枠確認が未設定です。2D地図を表示します。'); return;
    }
    const id = ++generation;
    pending = true;
    container.dataset.state = 'loading';
    container.dataset.reason = '';
    container.dataset.gpsUpdates = container.dataset.headingUpdates = '0';
    gpsUpdates = headingUpdates = lastMeasured = 0;
    timer = setTimeout(() => close('3D地図の読み込みがタイムアウトしました。'),20000);
    try {
      const gl = await loadSDK();
      if (id !== generation) return;
      container.hidden = false;
      view = new gl.Map({container,accessToken:token,style:'mapbox://styles/mapbox/dark-v11',
        center:ui.center(),zoom:17.5,pitch:69,maxPitch:72,antialias:true});
      const active = view;
      active.on('error', () => { if (view === active) close('3D地図を読み込めません。2D地図に戻りました。'); });
      active.on('webglcontextlost', () => { if (view === active) close('3D描画が停止しました。'); });
      active.on('dragstart',ui.pauseFollow);
      active.on('rotatestart', e => { if (e.originalEvent) ui.pauseFollow(); });
      active.on('click', e => ui.select({name:'選んだ地点',lat:e.lngLat.lat,lng:e.lngLat.lng}));
      active.once('load', () => {
        if (active !== view) return;
        try {
          const layers = active.getStyle().layers;
          for (const layer of layers) {
            if (layer.type === 'background') active.setPaintProperty(layer.id,'background-color','#050308');
            if (layer.source === 'composite' && layer['source-layer'] === 'road' && layer.type === 'line') {
              active.setPaintProperty(layer.id,'line-color',layer.id.includes('case') ? '#6e194e' : '#ff57ac');
            }
          }
          active.addLayer({id:'osaka-buildings',type:'fill-extrusion',source:'composite',
            'source-layer':'building',filter:['==',['get','extrude'],'true'],
            paint:{'fill-extrusion-height':['coalesce',['get','height'],0],'fill-extrusion-base':['coalesce',['get','min_height'],0],
              'fill-extrusion-color':'#884879','fill-extrusion-opacity':0.92}},
            layers.find(layer => layer.type==='symbol' && layer.layout?.['text-field'])?.id);
          if (active.getLayer('water')) active.setPaintProperty('water','fill-color','#2e1234');
          active.addLayer({id:'osaka-water-edge',type:'line',source:'composite','source-layer':'water',
            paint:{'line-color':'#ff398f','line-width':1.6,'line-opacity':0.8}});
          active.setLight({anchor:'viewport',color:'#ffd8eb',intensity:0.65});
          pending = false; clearTimeout(timer);
          container.dataset.state = 'style-ready';
          active.on('render', () => measure(active));
          active.on('idle', () => { lastMeasured = 0; measure(active); });
          toggle.textContent='2D'; toggle.setAttribute('aria-pressed','true');
          ui.onReady();
        } catch { close('建物レイヤーを読み込めません。2D地図に戻りました。'); }
      });
    } catch { if (generation === id) close('3D地図を起動できません。'); }
  }
  toggle.onclick = () => view || pending ? close() : open();
  return {position,destination,close,clearPosition() { person?.remove(); person=bearingAnchor=null; },
    focus(center,zoom=16) { if (!view) return false; view.easeTo({center,zoom}); return true; },
    zoom(delta) { if (!view) return false; view.zoomTo(view.getZoom()+delta); return true; }};
};
