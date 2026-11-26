/* No analytics, uploads, API keys or server-side storage. Data stays in this browser. */
(() => {
'use strict';
const C=LabelCore,$=id=>document.getElementById(id),clone=v=>JSON.parse(JSON.stringify(v));
let dataset=null,session=null,index=0,db=null,persistTimer=null,saveChain=Promise.resolve(),loading=false,selectedReference=null;
const statusLabels={borrador:'Borrador',completa:'Completada',duda:'Con duda'};
function notice(text,success=false){$('notice').textContent=text;$('notice').className='notice'+(success?' success':'');$('notice').hidden=!text;}
function dbOpen(){return new Promise((resolve,reject)=>{const r=indexedDB.open('piura-etiquetador-v1',1);r.onupgradeneeded=()=>{r.result.createObjectStore('datasets',{keyPath:'id'});r.result.createObjectStore('meta');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Otra pestaña mantiene abierta una versión antigua.'));});}
function dbGet(store,key){return new Promise((resolve,reject)=>{const t=db.transaction(store,'readonly'),r=t.objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function dbWrite(value,meta){return new Promise((resolve,reject)=>{const t=db.transaction(['datasets','meta'],'readwrite');t.objectStore('datasets').put(value);t.objectStore('meta').put(meta,'last');t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Guardado cancelado.'));});}
function persist(){
 clearTimeout(persistTimer);persistTimer=null;if(!dataset)return Promise.resolve();
 const snapshot=clone(dataset),meta={id:dataset.id,index,annotator:session?.annotator||'',protocol:$('protocol').value};
 $('saveStatus').textContent='Guardando en este navegador…';
 if(!db){$('saveStatus').textContent='Sin guardado local: exporta tu trabajo';return Promise.resolve();}
 saveChain=saveChain.catch(()=>{}).then(()=>dbWrite(snapshot,meta)).then(()=>{$('saveStatus').textContent='Guardado en este navegador';}).catch(()=>{$('saveStatus').textContent='No se pudo guardar: exporta tu trabajo';notice('El navegador no pudo guardar el avance. Descarga un CSV o un respaldo JSON antes de cerrar.');});return saveChain;
}
function annotation(){return session?.annotations.find(a=>a.id===dataset.records[index]?.id)||null;}
function upsert(a){const i=session.annotations.findIndex(x=>x.id===a.id);if(i<0)session.annotations.push(a);else session.annotations[i]=a;}
function getValue(name){return document.querySelector(`input[name="${name}"]:checked`)?.value||'';}
function readForm(){
 const a=C.blank(dataset.records[index].id);a.relevant=getValue('relevant');a.attention=getValue('attention');a.flood=getValue('flood');a.noReference=$('noReference').checked;
 a.locations=Array.from($('locationRows').children).map(row=>Object.fromEntries(['reference','type','resolved','district','lat','lng','source'].map(k=>[k,row.querySelector(`[data-field="${k}"]`).value])));
 a.confidence=$('confidence').value;a.notes=$('notes').value;a.videoEvidence=dataset.records[index].hasVideo?$('videoEvidence').value:'no_aplica';a.videoTime=$('videoTime').value;
 return C.effective(a);
}
function collectDraft(){
 if(!dataset||!session||loading||!dataset.records[index]||$('editor').hidden)return;
 const a=readForm(),old=annotation();const comparable=v=>{const t=clone(v);delete t.updatedAt;delete t.status;return JSON.stringify(t);};
 if(old&&comparable(a)===comparable(old))return;
 if(!old&&!a.relevant&&!a.attention&&!a.flood&&!a.notes&&!a.noReference&&!a.locations.length&&['no_revisado','no_aplica'].includes(a.videoEvidence))return;
 a.updatedAt=new Date().toISOString();a.status='borrador';upsert(a);updateProgress();$('postStatus').textContent='Borrador';$('postStatus').className='badge borrador';
}
function scheduleSave(){collectDraft();clearTimeout(persistTimer);$('saveStatus').textContent='Cambios pendientes de guardar…';persistTimer=setTimeout(()=>persist(),350);}
function updateProgress(){if(!dataset)return;const values=session?.annotations||[],complete=values.filter(a=>a.status==='completa').length,doubts=values.filter(a=>a.status==='duda').length;const drafts=values.filter(a=>a.status==='borrador').length;
 $('progress').max=dataset.records.length;$('progress').value=complete;$('progressText').textContent=`${complete} de ${dataset.records.length} completadas · ${doubts} con duda · ${drafts} borradores`;
 $('exportCSV').disabled=!session;$('backup').disabled=false;
}
function matching(){const labels=new Map((session?.annotations||[]).map(a=>[a.id,a]));const term=$('search').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),filter=$('statusFilter').value;return dataset.records.flatMap((r,i)=>{const a=labels.get(r.id);const status=a?.status||'pendiente';const normalized=(r.id+' '+r.text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return normalized.includes(term)&&(filter==='all'||filter===status||(filter==='pending'&&['pendiente','borrador'].includes(status)))?[i]:[];});}
function refreshNavigation(){const ids=matching();$('jump').replaceChildren(...ids.map(i=>{const o=document.createElement('option');o.value=String(i);o.textContent=`${i+1} · ${dataset.records[i].id}`;return o;}));if(!ids.includes(index)&&ids.length)index=ids[0];$('jump').value=String(index);$('emptyFilter').hidden=!!ids.length;$('editor').hidden=!ids.length;return ids;}
function inputField(label,key,value='',type='text'){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.type=type;input.value=value;input.dataset.field=key;if(['lat','lng'].includes(key))input.inputMode='decimal';l.append(input);return l;}
function addLocation(value={}){
 const row=document.createElement('div');row.className='location-row';const grid=document.createElement('div');grid.className='location-grid';
 const ref=inputField('Referencia literal del texto','reference',value.reference||'');ref.className='wide';grid.append(ref);
 const level=document.createElement('label');level.textContent='Nivel de ubicación';const select=document.createElement('select');select.dataset.field='type';for(const [v,label] of [['','Elige un nivel'],['no_resuelta','No resuelta'],['area','Área'],['punto','Punto']]){const o=document.createElement('option');o.value=v;o.textContent=label;select.append(o);}select.value=value.type||'';level.append(select);grid.append(level);
 const maps=document.createElement('div');maps.className='map-tools';const selectedButton=document.createElement('button');selectedButton.type='button';selectedButton.textContent='Usar texto seleccionado del post';maps.append(selectedButton);
 const queryLabel=inputField('Búsqueda en el mapa · puedes ajustarla','mapQuery','');const queryInput=queryLabel.querySelector('input');queryInput.maxLength=500;queryInput.placeholder='Ej.: puente Sánchez Cerro, Piura, Perú';maps.append(queryLabel);
 const mapLinks=document.createElement('div');mapLinks.className='map-links';const links={};for(const [key,label] of [['google','Buscar en Google Maps'],['osm','Buscar en OpenStreetMap']]){const a=document.createElement('a');a.className='button';a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';a.addEventListener('click',e=>{if(a.getAttribute('aria-disabled')==='true')e.preventDefault();});links[key]=a;mapLinks.append(a);}maps.append(mapLinks);
 const mapHelp=document.createElement('p');mapHelp.className='help';mapHelp.textContent='Selecciona la referencia en el texto del post o escríbela arriba. La búsqueda añade «Piura, Perú» como contexto editable; esto no modifica la referencia literal ni verifica el lugar.';maps.append(mapHelp);grid.append(maps);
 grid.append(inputField('Lugar identificado','resolved',value.resolved||''),inputField('Distrito, si se identifica','district',value.district||''),inputField('Latitud','lat',value.lat||''),inputField('Longitud','lng',value.lng||''));const source=inputField('Fuente de verificación del punto','source',value.source||'');source.className='wide';grid.append(source);
 const pasteBox=document.createElement('div');pasteBox.className='coordinate-helper';const pasteLabel=inputField('Pega las coordenadas o el enlace del punto','coordinatePaste','');pasteLabel.querySelector('input').placeholder='Latitud, longitud · o enlace con marcador';pasteBox.append(pasteLabel);const apply=document.createElement('button');apply.type='button';apply.textContent='Usar coordenadas';pasteBox.append(apply);const result=document.createElement('p');result.className='help';result.setAttribute('role','status');result.textContent='Google Maps: clic derecho sobre el punto y copia sus coordenadas. OpenStreetMap: Compartir, Incluir marcador y copiar el enlace. Verifica el lugar antes de guardar.';pasteBox.append(result);grid.append(pasteBox);
 let editedQuery=false;
 const syncMaps=()=>{if(!editedQuery){const literal=ref.querySelector('input').value.trim();queryInput.value=literal?literal+', Piura, Perú':'';}let urls={google:'',osm:''};try{urls=C.mapSearchURLs(queryInput.value);}catch{}for(const key of ['google','osm']){const disabled=queryInput.matches(':disabled')||!urls[key];if(disabled)links[key].removeAttribute('href');else links[key].href=urls[key];links[key].setAttribute('aria-disabled',String(disabled));links[key].tabIndex=disabled?-1:0;}};
 row.refreshMapLinks=syncMaps;ref.querySelector('input').addEventListener('input',syncMaps);queryInput.addEventListener('input',()=>{editedQuery=true;syncMaps();});
 selectedButton.addEventListener('click',()=>{if(!selectedReference||selectedReference.id!==dataset.records[index].id){notice('Selecciona con el mouse una referencia geográfica dentro del texto de esta publicación y vuelve a pulsar el botón.');return;}ref.querySelector('input').value=selectedReference.text;editedQuery=false;syncMaps();scheduleSave();});
 apply.addEventListener('click',()=>{try{const c=C.coordinates(pasteLabel.querySelector('input').value);grid.querySelector('[data-field="lat"]').value=c.lat;grid.querySelector('[data-field="lng"]').value=c.lng;if(c.source)grid.querySelector('[data-field="source"]').value=c.source;result.textContent='Coordenadas colocadas: latitud '+c.lat+', longitud '+c.lng+'. Confirma el lugar identificado y la fuente antes de guardar.';result.className='help success-text';scheduleSave();}catch(e){result.textContent=e.message;result.className='help error-text';}});
 const update=()=>{const type=select.value;for(const k of ['resolved','district','lat','lng','source']){const input=grid.querySelector(`[data-field="${k}"]`);const point=['lat','lng','source'].includes(k);input.parentElement.hidden=point?type!=='punto':!['area','punto'].includes(type);}pasteBox.hidden=type!=='punto';syncMaps();};
 select.addEventListener('change',()=>{update();scheduleSave();});row.append(grid);const remove=document.createElement('button');remove.type='button';remove.className='remove';remove.textContent='Quitar este lugar';remove.addEventListener('click',()=>{row.remove();scheduleSave();});row.append(remove);$('locationRows').append(row);update();
}
function setDependent(){const relevant=getValue('relevant')!=='no';for(const container of document.querySelectorAll('.dependent')){container.classList.toggle('disabled',!relevant);for(const c of container.querySelectorAll('input,select,button'))c.disabled=!relevant||!session;}
 $('locationRows').hidden=$('noReference').checked;$('addLocation').disabled=!relevant||!session||$('noReference').checked;
 for(const row of $('locationRows').children)row.refreshMapLinks?.();
}
function renderMedia(r){
 $('media').replaceChildren();const media=$('media');
 const image=(url,caption)=>{const fig=document.createElement('figure'),b=document.createElement('button');b.type='button';b.className='image';b.setAttribute('aria-label',`Ampliar ${caption.toLowerCase()}`);const img=document.createElement('img');img.src=url;img.alt=caption;img.referrerPolicy='no-referrer';b.append(img);const cap=document.createElement('figcaption');cap.textContent=caption+' · pulsa para ampliar';fig.append(b,cap);img.addEventListener('error',()=>{b.hidden=true;cap.textContent='No se pudo cargar este medio. Conserva el caso y registra la incidencia en Observaciones.';cap.className='failed';});b.addEventListener('click',()=>{$('largeImage').src=url;$('imageCaption').textContent=caption+' · publicación '+r.id;$('imageDialog').showModal();});media.append(fig);};
 r.photos.forEach((url,i)=>image(url,`Imagen ${i+1}`));r.thumbs.forEach((url,i)=>image(url,`Miniatura de video ${i+1} · no es una imagen estática de evaluación`));
 r.videos.forEach((url,i)=>{const fig=document.createElement('figure');if(/\.(mp4|webm|ogg)(?:[?#]|$)/i.test(url)){const v=document.createElement('video');v.src=url;v.controls=true;v.preload='none';v.addEventListener('error',()=>notice('No se pudo reproducir un video. Puedes usar su enlace y dejar «No revisado» si no está disponible.'));fig.append(v);}const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=`Abrir video ${i+1}`;fig.append(a);media.append(fig);});
 if(r.hasVideo){const p=document.createElement('p');p.className='help';p.textContent='Contiene video. Su evidencia se registra aparte; las etiquetas principales usan texto e imágenes estáticas.';media.append(p);}
 if(!r.photos.length&&!r.thumbs.length&&!r.videos.length){const p=document.createElement('div');p.className='placeholder';p.textContent=r.hasVideo?'El CSV indica video, pero no incluye un enlace.':r.hasImage?'El CSV indica imagen, pero no incluye un enlace.':'Esta publicación no tiene imágenes ni videos adjuntos.';media.append(p);}
}
function render(){
 if(!dataset)return;loading=true;selectedReference=null;$('workspace').hidden=false;$('welcome').hidden=true;$('datasetTitle').textContent=dataset.name;updateProgress();const ids=refreshNavigation();
 const protocol=C.protocols[$('protocol').value];$('attentionQuestion').textContent=protocol.question;$('attentionHelp').textContent=protocol.help;
 $('sessionHint').textContent=session?`Sesión de ${session.annotator}. Se aplica el protocolo de etiquetado manual facilitado.`:'Escribe tu nombre o código y pulsa «Abrir mi sesión» para etiquetar.';
 $('sessionSummary').textContent=session?`Anotador: ${session.annotator} · Cambiar sesión`:'Tu sesión de etiquetado';
 $('knownAnnotators').replaceChildren(...[...new Set(dataset.sessions.map(s=>s.annotator))].map(n=>{const o=document.createElement('option');o.value=n;return o;}));
 if(!ids.length){loading=false;return;}
 const r=dataset.records[index],a=annotation()||C.blank(r.id);$('postPosition').textContent=`Publicación ${index+1} de ${dataset.records.length}`;$('postStatus').textContent=statusLabels[a.status]||'Pendiente';$('postStatus').className='badge '+(annotation()?a.status:'pendiente');if(!annotation())$('postStatus').textContent='Pendiente';
 $('postMeta').textContent=`ID: ${r.id}${r.date?' · '+formatDate(r.date):''}`;$('postText').textContent=r.text;$('mediaPresence').textContent=`Contiene imagen: ${r.hasImage?'Sí':'No'} · Contiene video: ${r.hasVideo?'Sí':'No'}`;$('postLink').hidden=!r.url;if(r.url)$('postLink').href=r.url;else $('postLink').removeAttribute('href');renderMedia(r);
 for(const name of ['relevant','attention','flood'])for(const input of document.querySelectorAll(`input[name="${name}"]`))input.checked=input.value===a[name];
 $('noReference').checked=a.noReference;$('locationRows').replaceChildren();a.locations.forEach(addLocation);$('confidence').value=a.confidence;$('notes').value=a.notes;$('videoSection').hidden=!r.hasVideo;$('videoEvidence').value=a.videoEvidence==='no_aplica'?'no_revisado':a.videoEvidence;$('videoTime').value=a.videoTime;
 $('formFields').disabled=!session;$('markDoubt').disabled=!session;$('saveNext').disabled=!session;$('previous').disabled=ids.indexOf(index)<=0;$('next').disabled=ids.indexOf(index)>=ids.length-1;$('formErrors').hidden=true;setDependent();loading=false;
}
function formatDate(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return value;return new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',dateStyle:'medium',timeStyle:'short'}).format(d)+' · Perú';}
async function openSession(){if(dataset){collectDraft();await persist();}const name=$('annotator').value.trim();if(!name){notice('Escribe tu nombre o código para abrir tu sesión.');$('annotator').focus();return;}if(!dataset){notice('Nombre registrado. Ahora importa un CSV o prueba los ejemplos.',true);return;}
 const protocol=$('protocol').value;session=dataset.sessions.find(s=>s.annotator===name&&s.protocol===protocol);if(!session){session={annotator:name,protocol,annotations:[]};dataset.sessions.push(session);}render();$('sessionSettings').open=false;await persist();notice(`Sesión de ${name} abierta. Las respuestas de otros anotadores no se muestran.`,true);
}
async function acceptImport(parsed,name){
 if(dataset){collectDraft();await persist();}
 const id=await C.fingerprint(parsed.records);let stored=db?await dbGet('datasets',id):null;
 if(stored&&JSON.stringify(stored.records.map(r=>r.raw))!==JSON.stringify(parsed.records.map(r=>r.raw)))throw Error('El identificador local coincide con otro contenido. Importa un respaldo en un navegador distinto para conservar ambos.');
 const next=stored||{id,name,records:parsed.records,sessions:[]};
 if(parsed.imported.length){
  const conflict=parsed.imported.some(item=>{const s=next.sessions.find(s=>s.annotator===item.annotator&&s.protocol===item.protocol),a=s?.annotations.find(a=>a.id===item.annotation.id);return a&&JSON.stringify(a)!==JSON.stringify(item.annotation);});
  if(conflict&&!confirm('El archivo contiene respuestas distintas de las guardadas para este mismo anotador y protocolo. ¿Reemplazar esas respuestas locales por las del archivo? Cancela para conservar las actuales.'))return false;
  for(const item of parsed.imported){let s=next.sessions.find(s=>s.annotator===item.annotator&&s.protocol===item.protocol);if(!s){s={annotator:item.annotator,protocol:item.protocol,annotations:[]};next.sessions.push(s);}const i=s.annotations.findIndex(a=>a.id===item.annotation.id);if(i<0)s.annotations.push(item.annotation);else s.annotations[i]=item.annotation;}
 }
 dataset=next;index=0;session=null;$('search').value='';$('statusFilter').value='all';
 if(parsed.imported.length){$('annotator').value=parsed.imported[0].annotator;$('protocol').value=parsed.imported[0].protocol;}
 const nameValue=$('annotator').value.trim();if(nameValue){const protocol=$('protocol').value;session=dataset.sessions.find(s=>s.annotator===nameValue&&s.protocol===protocol)||{annotator:nameValue,protocol,annotations:[]};if(!dataset.sessions.includes(session))dataset.sessions.push(session);}
 render();$('sessionSettings').open=!session;await persist();notice(`${dataset.records.length} publicaciones cargadas.${parsed.duplicates?' Se omitieron '+parsed.duplicates+' filas idénticas con el mismo ID.':''}${parsed.imported.length?' Se recuperaron las anotaciones del CSV.':''}`,true);return true;
}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]/gi,'_').slice(0,60);
function backupObject(){return {format:'piura-etiquetador',version:C.VERSION,exportedAt:new Date().toISOString(),dataset:clone(dataset),active:{annotator:session?.annotator||'',protocol:$('protocol').value,index}};}
async function exportCSV(){if(!session)return;collectDraft();await persist();download(`etiquetas_${slug(session.annotator)}_${session.protocol}.csv`,C.csvExport(dataset,session),'text/csv;charset=utf-8');notice('CSV descargado. Incluye el dataset y las respuestas de tu sesión; puedes importarlo para continuar en otro ordenador.',true);}
function template(){download('plantilla_publicaciones.csv','\uFEFFid,texto,fecha,url,imagenes,videos,miniaturas\r\n"EJEMPLO-001","Texto de la publicación","2023-03-10T15:00:00-05:00","","https://ejemplo.org/foto1.jpg|https://ejemplo.org/foto2.jpg","",""\r\n','text/csv;charset=utf-8');}
async function saveAndAdvance(doubt){
 if(!session)return;const a=readForm(),r=dataset.records[index];doubt=doubt||a.confidence==='con_duda';if(doubt)a.confidence='con_duda';const e=C.errors(a,r,doubt);if(e.length){$('formErrors').textContent=e.join('\n');$('formErrors').hidden=false;$('formErrors').scrollIntoView({block:'center',behavior:'smooth'});return;}
 a.status=doubt?'duda':'completa';a.updatedAt=new Date().toISOString();upsert(a);await persist();const prior=index,ids=matching(),next=ids.find(i=>i>prior);if(next!==undefined)index=next;else if(!ids.includes(prior)&&ids.length)index=ids[0];render();notice(doubt?'Caso marcado con duda. Queda pendiente de consenso.':next===undefined?'Respuesta guardada. Llegaste al final de esta selección.':'Respuesta guardada.',true);
 await persist();$('postPosition').scrollIntoView({block:'start',behavior:'smooth'});
}
async function move(direction){collectDraft();const ids=matching(),pos=ids.indexOf(index),target=ids[pos+direction];if(target===undefined)return;index=target;await persist();render();$('postPosition').scrollIntoView({block:'start',behavior:'smooth'});}
$('openSession').addEventListener('click',()=>openSession().catch(fail));
$('protocol').addEventListener('change',async()=>{collectDraft();await persist();session=null;render();notice('Protocolo cambiado. Pulsa «Abrir mi sesión» para trabajar con sus etiquetas; las respuestas del protocolo anterior se conservan.');});
$('annotator').addEventListener('input',()=>{if(session&&$('annotator').value.trim()!==session.annotator){collectDraft();persist();session=null;render();}});
$('annotationForm').addEventListener('input',()=>{if(!loading){setDependent();scheduleSave();}});
$('annotationForm').addEventListener('change',()=>{if(!loading){setDependent();scheduleSave();}});
$('annotationForm').addEventListener('submit',e=>{e.preventDefault();saveAndAdvance(false).catch(fail);});
 $('markDoubt').addEventListener('click',()=>saveAndAdvance(true).catch(fail));$('previous').addEventListener('click',()=>move(-1).catch(fail));$('next').addEventListener('click',()=>move(1).catch(fail));
$('addLocation').addEventListener('click',()=>{addLocation();scheduleSave();});
for(const id of ['statusFilter','search'])$(id).addEventListener(id==='search'?'input':'change',async()=>{collectDraft();render();await persist();});
$('jump').addEventListener('change',async()=>{collectDraft();index=Number($('jump').value);render();await persist();});
$('csvFile').addEventListener('change',async e=>{const f=e.target.files[0];try{if(!f)return;if(f.size>20*1024*1024)throw Error('El CSV supera 20 MB. Divídelo en lotes para etiquetar con comodidad.');let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(await f.arrayBuffer());}catch{throw Error('Guarda el CSV con codificación UTF-8 y vuelve a importarlo.');}await acceptImport(C.normalize(C.csv(text)),f.name);}catch(err){fail(err);}finally{e.target.value='';}});
$('demoButton').addEventListener('click',()=>acceptImport(C.normalize(C.csv(window.PIURA_DEMO_CSV)),'Ejemplos ficticios · 8 publicaciones').catch(fail));
$('templateButton').addEventListener('click',template);$('templateMore').addEventListener('click',template);$('exportCSV').addEventListener('click',()=>exportCSV().catch(fail));
$('backup').addEventListener('click',async()=>{collectDraft();await persist();download(`respaldo_${slug(dataset.name)}.json`,JSON.stringify(backupObject(),null,2),'application/json');notice('Respaldo descargado. Contiene todas las sesiones locales de este dataset: no lo compartas durante una anotación independiente.',true);});
$('backupFile').addEventListener('change',async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>40*1024*1024)throw Error('El respaldo supera 40 MB.');const b=JSON.parse(await f.text());if(b.format!=='piura-etiquetador'||b.version!==C.VERSION||!b.dataset||!Array.isArray(b.dataset.records)||!Array.isArray(b.dataset.sessions))throw Error('No es un respaldo compatible.');const normalized=C.normalize(b.dataset.records.map(r=>r.raw));const ids=new Set(normalized.records.map(r=>r.id));const imported=[];for(const s of b.dataset.sessions){if(!s||typeof s.annotator!=='string'||!s.annotator.trim()||!C.protocols[s.protocol]||!Array.isArray(s.annotations))throw Error('Una sesión del respaldo no es válida.');for(const a of s.annotations){if(!ids.has(a.id))throw Error('Una anotación no corresponde al dataset.');C.validateAnnotationShape(a,a.id);if(a.status==='completa'&&C.errors(a,normalized.records.find(r=>r.id===a.id)).length)throw Error('El respaldo contiene una anotación completada sin campos requeridos.');imported.push({annotator:s.annotator,protocol:s.protocol,annotation:a});}}normalized.imported=imported;if(!await acceptImport(normalized,String(b.dataset.name||f.name)))return;if(b.active&&C.protocols[b.active.protocol]&&typeof b.active.annotator==='string'){$('annotator').value=b.active.annotator;$('protocol').value=b.active.protocol;await openSession();index=Math.min(Math.max(Number(b.active.index)||0,0),dataset.records.length-1);render();await persist();}notice('Respaldo importado. Las sesiones se conservan separadas por anotador y protocolo.',true);}catch(err){fail(err);}finally{e.target.value='';}});
$('closeImage').addEventListener('click',()=>{$('imageDialog').close();$('largeImage').removeAttribute('src');});
document.addEventListener('selectionchange',()=>{const s=window.getSelection();if(!dataset||!s||s.isCollapsed||!s.anchorNode||!s.focusNode)return;if($('postText').contains(s.anchorNode)&&$('postText').contains(s.focusNode)){const text=s.toString().trim();if(text&&text.length<=500)selectedReference={id:dataset.records[index].id,text};}});
function fail(error){notice(error.message||'No se pudo completar la operación.');}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dataset){collectDraft();persist();}});
window.addEventListener('pagehide',()=>{if(dataset){collectDraft();persist();}});
window.addEventListener('beforeunload',e=>{if(persistTimer){collectDraft();persist();e.preventDefault();e.returnValue='';}});
async function start(){try{db=await dbOpen();const meta=await dbGet('meta','last');if(meta){dataset=await dbGet('datasets',meta.id);if(dataset){dataset.records=C.normalize(dataset.records.map(r=>r.raw)).records;$('annotator').value=meta.annotator||'';$('protocol').value=C.protocols[meta.protocol]?meta.protocol:'auxilio_v1';session=dataset.sessions.find(s=>s.annotator===meta.annotator&&s.protocol===$('protocol').value)||null;index=Math.min(meta.index||0,dataset.records.length-1);render();$('sessionSettings').open=!session;$('saveStatus').textContent='Sesión recuperada de este navegador';}}}catch{db=null;notice('El guardado del navegador no está disponible. Puedes usar la herramienta, pero debes exportar antes de cerrar.');}}
start().catch(fail);
})();
