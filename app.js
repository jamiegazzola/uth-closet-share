const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const CENTER=[-121.94,49.44];
const UNIT_BOUNDS=[[-122.15,49.21],[-121.75,49.69]];
const IMG_CORNERS=[[-122.1306254620,49.6681146063],[-121.7707519887,49.6648533211],[-121.7816329677,49.2277668383],[-122.1383221009,49.2309784685]];
const PARTS={
 boundary:['boundary.0.txt'],
 roads_all:['roads_all.0.txt','roads_all.1.txt','roads_all.2.txt'],
 roads_driveable:['roads_driveable.0.txt'],
 cutblocks_all:['cutblocks_all.0.txt','cutblocks_all.1.txt'],
 cutblocks_0_5:['cutblocks_0_5.0.txt'],
 hydro:['hydro.0.txt','hydro.1.txt'],
 vegetation:['vegetation.0.txt','vegetation.1.txt','vegetation.2.txt'],
 wetlands:['wetlands.0.txt'],fires:['fires.0.txt']
};
let exag=1.25, ready=false;
const state={roads:'all',cutblocks:'all'};
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e.t);e.t=setTimeout(()=>e.classList.remove('show'),1700)};
const map=new maplibregl.Map({container:'map',center:CENTER,zoom:9.6,pitch:62,bearing:-18,maxPitch:85,style:{version:8,sources:{sat:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,attribution:'Esri'},topo:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'OpenStreetMap'},dem:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,encoding:'terrarium',maxzoom:15}},layers:[{id:'sat',type:'raster',source:'sat'},{id:'topo',type:'raster',source:'topo',layout:{visibility:'none'}},{id:'hillshade',type:'hillshade',source:'dem',paint:{'hillshade-exaggeration':.38}}]}});
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'bottom-right');
map.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-left');
async function dataUrl(name){const pieces=await Promise.all(PARTS[name].map(f=>fetch('overlay/'+f+'?v=4',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(f+' '+r.status);return r.text()})));return 'data:image/png;base64,'+pieces.join('');}
async function addOverlay(name,visible=true,opacity=1){const url=await dataUrl(name);map.addSource(name,{type:'image',url,coordinates:IMG_CORNERS});map.addLayer({id:name,type:'raster',source:name,layout:{visibility:visible?'visible':'none'},paint:{'raster-opacity':opacity,'raster-fade-duration':0}})}
async function loadOverlays(){
 $('#loadingText').textContent='Loading embedded Chehalis layers…';
 await addOverlay('vegetation',false,.88); await addOverlay('fires',false,.95); await addOverlay('cutblocks_all',true,1); await addOverlay('cutblocks_0_5',false,1); await addOverlay('wetlands',false,1); await addOverlay('hydro',true,1); await addOverlay('roads_all',true,1); await addOverlay('roads_driveable',false,1); await addOverlay('boundary',true,1);
 ready=true; $('#featureCount').textContent='layers ready'; $('#loading').style.display='none'; toast('Chehalis layers loaded');
}
function vis(id,on){if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}
function setGroup(group,on){if(group==='boundary')vis('boundary',on);if(group==='hydro')vis('hydro',on);if(group==='vegetation')vis('vegetation',on);if(group==='wetlands')vis('wetlands',on);if(group==='fires')vis('fires',on);if(group==='roads'){vis('roads_all',on&&state.roads==='all');vis('roads_driveable',on&&state.roads==='driveable')}if(group==='cutblocks'){vis('cutblocks_all',on&&state.cutblocks==='all');vis('cutblocks_0_5',on&&state.cutblocks==='0_5')}}
function checkbox(group,on){const el=$(`input[data-group="${group}"]`);if(el){el.checked=on;setGroup(group,on)}}
function showRoadVariant(v){state.roads=v;const on=$('input[data-group="roads"]').checked;vis('roads_all',on&&v==='all');vis('roads_driveable',on&&v==='driveable')}
function showCutVariant(v){state.cutblocks=v;const on=$('input[data-group="cutblocks"]').checked;vis('cutblocks_all',on&&v==='all');vis('cutblocks_0_5',on&&v==='0_5')}
function resetMap(){state.roads='all';state.cutblocks='all';['boundary','roads','cutblocks','hydro'].forEach(g=>checkbox(g,true));['vegetation','wetlands','fires'].forEach(g=>checkbox(g,false));showRoadVariant('all');showCutVariant('all');setAnalysis('none');map.fitBounds(UNIT_BOUNDS,{padding:45,pitch:58,bearing:-18,duration:800});}
function runCommand(raw){const q=raw.trim().toLowerCase().replace(/[–—]/g,'-');if(!q){$('#cmdStatus').textContent='Type a command';return}if(!ready){$('#cmdStatus').textContent='Layers are still loading…';return}
 if(/reset|start over|default/.test(q)){resetMap();$('#cmdStatus').textContent='Reset complete';return}
 if((/1\s*-\s*5|0\s*-\s*5/.test(q))&&/cut|cutblock|year/.test(q)){checkbox('cutblocks',true);showCutVariant('0_5');$('#cmdStatus').textContent='Highlighted 125 cutblocks aged 0–5 years';toast('0–5 year cutblocks highlighted');return}
 if(/driveable|drivable|likely drive/.test(q)&&/road|access|drive/.test(q)){checkbox('roads',true);showRoadVariant('driveable');$('#cmdStatus').textContent='Highlighted likely driveable roads';toast('Driveable-road layer highlighted');return}
 if(/show all roads|all roads/.test(q)){checkbox('roads',true);showRoadVariant('all');$('#cmdStatus').textContent='Showing all road-access classes';return}
 if(/show all cut|all cutblocks/.test(q)){checkbox('cutblocks',true);showCutVariant('all');$('#cmdStatus').textContent='Showing all cutblock ages';return}
 if(/slope/.test(q)){setAnalysis('slope');$('#cmdStatus').textContent='Slope-oriented terrain shading enabled';return}if(/aspect/.test(q)){setAnalysis('aspect');$('#cmdStatus').textContent='Aspect-oriented terrain shading enabled';return}
 if(/whole unit|overview|zoom out/.test(q)){map.fitBounds(UNIT_BOUNDS,{padding:45,pitch:58,bearing:-18,duration:800});$('#cmdStatus').textContent='Showing whole unit';return}
 const patterns={roads:/roads?|access/,cutblocks:/cutblocks?|cuts/,hydro:/streams?|rivers?|water/,vegetation:/forest|vegetation|vri/,wetlands:/wetlands?/,fires:/fires?/,boundary:/boundary/};let changed=[];for(const[g,re]of Object.entries(patterns)){if(re.test(q)){if(/hide|turn off|remove/.test(q)){checkbox(g,false);changed.push(g+' off')}else if(/show|turn on|display|highlight/.test(q)){checkbox(g,true);changed.push(g+' on')}}}if(/streams?.*wetlands?|wetlands?.*streams?|show water/.test(q)){checkbox('hydro',true);checkbox('wetlands',true);changed=['water layers on']}if(changed.length){$('#cmdStatus').textContent='Done — '+changed.join(', ');return}
 $('#cmdStatus').textContent='Try “highlight 1-5 year cutblocks” or “show driveable roads”';
}
function setAnalysis(mode){$$('[data-analysis]').forEach(b=>b.classList.toggle('active',b.dataset.analysis===mode));if(mode==='none'){map.setPaintProperty('sat','raster-saturation',0);map.setPaintProperty('hillshade','hillshade-shadow-color','#000');map.setPaintProperty('hillshade','hillshade-highlight-color','#fff')}else if(mode==='slope'){map.setPaintProperty('sat','raster-saturation',-.65);map.setPaintProperty('hillshade','hillshade-shadow-color','#4b2020');map.setPaintProperty('hillshade','hillshade-highlight-color','#eedc8a');toast('Relief emphasized for slope reading')}else{map.setPaintProperty('sat','raster-saturation',-.35);map.setPaintProperty('hillshade','hillshade-shadow-color','#1b2b49');map.setPaintProperty('hillshade','hillshade-highlight-color','#d6bd75');toast('Aspect-oriented relief shading enabled')}}
function terrainReadout(e){try{const z=map.queryTerrainElevation(e.lngLat);if(!Number.isFinite(z))return;const lat=e.lngLat.lat,lng=e.lngLat.lng,d=.00055;const vals=[[lng+d,lat],[lng-d,lat],[lng,lat+d],[lng,lat-d]].map(p=>map.queryTerrainElevation(p));let slope='—',aspect='—';if(vals.every(Number.isFinite)){const mlon=111320*Math.cos(lat*Math.PI/180)*d,mlat=111320*d,dx=(vals[0]-vals[1])/(2*mlon),dy=(vals[2]-vals[3])/(2*mlat);slope=(Math.atan(Math.hypot(dx,dy))*180/Math.PI).toFixed(1)+'°';const a=(Math.atan2(dx,dy)*180/Math.PI+180+360)%360;aspect=['N','NE','E','SE','S','SW','W','NW'][Math.round(a/45)%8]}$('#readout').innerHTML=`<b>Elev</b> ${Math.round(z/exag)} m &nbsp; <b>Slope</b> ${slope} &nbsp; <b>Aspect</b> ${aspect}`}catch{}}
map.on('load',async()=>{map.setTerrain({source:'dem',exaggeration:exag});try{await loadOverlays()}catch(e){console.error(e);$('#loadingText').textContent='Layer load failed — refresh';$('#cmdStatus').textContent='Layer load failed'}});map.on('mousemove',terrainReadout);
$$('input[data-group]').forEach(el=>el.addEventListener('change',()=>setGroup(el.dataset.group,el.checked)));
$('#homeBtn').onclick=()=>map.fitBounds(UNIT_BOUNDS,{padding:45,pitch:58,bearing:-18,duration:800});$('#topBtn').onclick=()=>map.easeTo({pitch:0,bearing:0});$('#northBtn').onclick=()=>map.easeTo({pitch:60,bearing:0});
$$('[data-base]').forEach(b=>b.onclick=()=>{$$('[data-base]').forEach(x=>x.classList.toggle('active',x===b));vis('sat',b.dataset.base==='sat');vis('topo',b.dataset.base==='topo')});
$$('[data-analysis]').forEach(b=>b.onclick=()=>setAnalysis(b.dataset.analysis));$('#exag').oninput=e=>{exag=+e.target.value;$('#exagOut').textContent=exag.toFixed(2)+'×';map.setTerrain({source:'dem',exaggeration:exag})};
const run=()=>runCommand($('#cmd').value);$('#run').onclick=run;$('#cmd').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run()}});$$('[data-cmd]').forEach(b=>b.onclick=()=>{$('#cmd').value=b.dataset.cmd;runCommand(b.dataset.cmd)});document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#cmd').focus();$('#cmd').select()}});
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(SR){const rec=new SR();rec.lang='en-CA';$('#mic').onclick=()=>{try{$('#cmdStatus').textContent='Listening…';rec.start()}catch{}};rec.onresult=e=>{$('#cmd').value=e.results[0][0].transcript;runCommand($('#cmd').value)};rec.onerror=()=>$('#cmdStatus').textContent='Mic unavailable — use Wispr Flow';}else $('#mic').onclick=()=>{$('#cmd').focus();$('#cmdStatus').textContent='Use Wispr Flow while this field is focused'};
