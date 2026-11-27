/* No analytics, uploads, API keys or server-side storage. Data stays in this browser. */
(() => {
'use strict';
const C=LabelCore,$=id=>document.getElementById(id),clone=v=>JSON.parse(JSON.stringify(v));
let dataset=null,session=null,index=0,db=null,legacyDb=null,persistTimer=null,saveChain=Promise.resolve(),loading=false,selectedReference=null,storageConflict=false;
const revisions=new Map();
const PROTOCOL='auxilio_v1';
const statusLabels={borrador:'Borrador',completa:'Completada',duda:'Con duda'};
function notice(text,success=false){$('notice').textContent=text;$('notice').className='notice'+(success?' success':'');$('notice').hidden=!text;}
async function storedDataset(id){return (db?await LabelStorage.get(db,'datasets',id):null)||(legacyDb?await LabelStorage.get(legacyDb,'datasets',id):null);}
function persist(){
 clearTimeout(persistTimer);persistTimer=null;if(!dataset)return Promise.resolve(true);if(storageConflict)return Promise.resolve(false);
 const snapshot=clone(dataset),meta={id:dataset.id,index,annotator:session?.annotator||'',protocol:PROTOCOL};
 $('saveStatus').textContent='Guardando en este navegador…';
 if(!db){$('saveStatus').textContent='Sin guardado local: exporta tu trabajo';return Promise.resolve(true);}
 saveChain=saveChain.catch(()=>{}).then(async()=>{
  if(storageConflict)return false;
  const expected=revisions.get(snapshot.id)??snapshot._storageRevision??0;
  const revision=await LabelStorage.write(db,snapshot,meta,expected);revisions.set(snapshot.id,revision);if(dataset?.id===snapshot.id)dataset._storageRevision=revision;
  $('saveStatus').textContent='Guardado en este navegador';return true;
 }).catch(error=>{
  if(error.code==='STALE_TAB'){storageConflict=true;$('saveStatus').textContent='Pestaña desactualizada';$('formFields').disabled=true;for(const id of ['saveNext','previous','next','jump','statusFilter','search','labelerName'])$(id).disabled=true;notice(error.message);}
  else{$('saveStatus').textContent='No se pudo guardar: exporta tu trabajo';notice('No se pudo guardar el avance en el navegador. Exporta en Excel o CSV antes de cerrar.');}
  return false;
 });return saveChain;
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
 $('progress').max=dataset.records.length;$('progress').value=complete;$('progressText').textContent=`${complete} de ${dataset.records.length} completadas · ${dataset.records.length-complete-doubts} pendientes · ${doubts} con duda`;$('progressPercent').textContent=(dataset.records.length?100*complete/dataset.records.length:0).toLocaleString('es-PE',{maximumFractionDigits:1})+' %';
 $('exportCSV').disabled=!session;$('exportExcel').disabled=!session;
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
 const protocol=C.protocols[PROTOCOL];$('attentionQuestion').textContent='Auxilio a personas';$('attentionHelp').textContent=protocol.help;
 $('currentPost').hidden=!ids.length;$('currentPostNumber').textContent=String(index+1);$('currentPostTotal').textContent=String(dataset.records.length);
 if(!ids.length){loading=false;return;}
 const r=dataset.records[index],a=annotation()||C.blank(r.id);$('postPosition').textContent=`Publicación ${index+1} de ${dataset.records.length}`;$('postStatus').textContent=statusLabels[a.status]||'Pendiente';$('postStatus').className='badge '+(annotation()?a.status:'pendiente');if(!annotation())$('postStatus').textContent='Pendiente';
 $('postId').textContent=r.id;$('postDate').textContent=r.date?formatDate(r.date):'No indicada';$('titleField').hidden=!r.title;$('postTitle').textContent=r.title||'';$('postText').textContent=r.text;$('mediaPresence').textContent=`Contiene imagen: ${r.hasImage?'Sí':'No'} · Contiene video: ${r.hasVideo?'Sí':'No'}`;$('postLink').hidden=!r.url;if(r.url)$('postLink').href=r.url;else $('postLink').removeAttribute('href');renderMedia(r);
 for(const name of ['relevant','attention','flood'])for(const input of document.querySelectorAll(`input[name="${name}"]`))input.checked=input.value===a[name];
 $('noReference').checked=a.noReference;$('locationRows').replaceChildren();a.locations.forEach(addLocation);$('confidence').value=a.confidence;$('notes').value=a.notes;$('videoSection').hidden=!r.hasVideo;$('videoEvidence').value=a.videoEvidence==='no_aplica'?'no_revisado':a.videoEvidence;$('videoTime').value=a.videoTime;
 $('formFields').disabled=!session;$('saveNext').disabled=!session;$('previous').disabled=ids.indexOf(index)<=0;$('next').disabled=ids.indexOf(index)>=ids.length-1;$('formErrors').hidden=true;setDependent();loading=false;
}
function formatDate(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return value;return new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',dateStyle:'medium',timeStyle:'short'}).format(d)+' · Perú';}
async function acceptImport(parsed,name){
 if(dataset){collectDraft();if(!await persist())return false;}
 const id=await C.fingerprint(parsed.records);let stored=await storedDataset(id);
 if(stored&&JSON.stringify(stored.records.map(r=>r.raw))!==JSON.stringify(parsed.records.map(r=>r.raw)))throw Error('Este archivo coincide con un identificador local de otro contenido. Conserva los CSV y usa otro navegador para importarlos por separado.');
 let next=stored||{id,name,records:parsed.records,sessions:[]},restarted=false,resumed=false;
 if(stored&&!parsed.imported.length&&stored.sessions.some(s=>s.annotations.length||s.labelerName)){
  const mode=await chooseImportMode();if(mode==='cancel')return false;
  if(mode==='fresh'){
   next={...stored,name,sessions:[],activeAnnotator:'',annotationHistory:[...(stored.annotationHistory||[]),{savedAt:new Date().toISOString(),sessions:clone(stored.sessions),activeAnnotator:stored.activeAnnotator||''}]};restarted=true;
  }else resumed=true;
 }
 next.records=parsed.records;
 if(parsed.imported.length){
  const conflict=parsed.imported.some(item=>{const s=next.sessions.find(s=>s.annotator===item.annotator&&s.protocol===item.protocol),a=s?.annotations.find(a=>a.id===item.annotation.id);return a&&JSON.stringify(a)!==JSON.stringify(item.annotation);});
  if(conflict&&!confirm('El archivo contiene etiquetas distintas de las guardadas para este archivo. ¿Reemplazar las etiquetas locales por las del CSV? Cancela para conservar las actuales.'))return false;
  for(const item of parsed.imported){let s=next.sessions.find(s=>s.annotator===item.annotator&&s.protocol===item.protocol);if(!s){s={annotator:item.annotator,protocol:item.protocol,annotations:[]};next.sessions.push(s);}const i=s.annotations.findIndex(a=>a.id===item.annotation.id);if(i<0)s.annotations.push(item.annotation);else s.annotations[i]=item.annotation;}
 }
 dataset=next;revisions.set(id,next._storageRevision||0);index=0;session=null;$('search').value='';$('statusFilter').value='all';
 session=C.fileLabels(dataset,parsed.imported[0]?.annotator||'');session.labelerName=restarted?'':parsed.labelerName||session.labelerName||(session.annotator!=='individual'?session.annotator:$('labelerName').value.trim());$('labelerName').value=session.labelerName||'';
 render();if(!await persist())return false;notice(`${dataset.records.length} publicaciones cargadas.${restarted?' Etiquetado iniciado desde cero.':resumed?' Se recuperó el avance guardado en este navegador.':''}${parsed.duplicates?' Se omitieron '+parsed.duplicates+' filas idénticas con el mismo ID.':''}${parsed.imported.length?' Se recuperaron las anotaciones del archivo.':''}`,true);return true;
}
async function chooseImportMode(){
 const dialog=$('importModeDialog');dialog.returnValue='cancel';const closed=new Promise(resolve=>dialog.addEventListener('close',()=>resolve(['fresh','resume'].includes(dialog.returnValue)?dialog.returnValue:'cancel'),{once:true}));dialog.showModal();return closed;
}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]/gi,'_').slice(0,60);
async function exportFile(format){if(!session)return;const name=$('labelerName').value.trim();if(!name){notice('Escribe el nombre del etiquetador antes de exportar.');$('labelerName').focus();return;}session.labelerName=name;collectDraft();await persist();const base=`etiquetas_${slug(dataset.name.replace(/\.(csv|xlsx|xls)$/i,'').replace(/^etiquetas_/i,''))}`;if(format==='xlsx')download(base+'.xlsx',LabelExcel.write(C.exportTable(dataset,session,name)),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');else download(base+'.csv',C.csvExport(dataset,session,name),'text/csv;charset=utf-8');notice(`${format==='xlsx'?'Excel':'CSV'} descargado. Incluye tus publicaciones y etiquetas. Puedes importarlo para continuar en otro ordenador.`,true);}
async function chooseSheet(book){
 const names=book.SheetNames.filter(name=>book.Sheets[name]?.['!ref']);if(!names.length)throw Error('El Excel no contiene hojas con datos.');if(names.length===1)return names[0];
 $('sheetChoice').replaceChildren(...names.map(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;return o;}));
 const dialog=$('sheetDialog');dialog.returnValue='';const closed=new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='import'?$('sheetChoice').value:null),{once:true}));dialog.showModal();return closed;
}
async function importFile(f){
 if(f.size>20*1024*1024)throw Error('El archivo supera 20 MB. Divídelo en lotes para etiquetar con comodidad.');
 const buffer=await f.arrayBuffer();let text;
 if(/\.(xlsx|xls)$/i.test(f.name)){const book=LabelExcel.read(buffer),sheet=await chooseSheet(book);if(!sheet)return;text=LabelExcel.rows(book,sheet);}
 else if(/\.csv$/i.test(f.name)){try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{throw Error('Guarda el CSV con codificación UTF-8 y vuelve a importarlo.');}}
 else throw Error('Elige un archivo CSV, Excel .xlsx o Excel .xls.');
 await acceptImport(C.normalize(C.csv(text)),f.name);
}
function template(){download('plantilla_publicaciones.csv','\uFEFFid,texto,fecha,url,imagenes,videos,miniaturas\r\n"EJEMPLO-001","Texto de la publicación","2023-03-10T15:00:00-05:00","","https://ejemplo.org/foto1.jpg|https://ejemplo.org/foto2.jpg","",""\r\n','text/csv;charset=utf-8');}
async function saveAndAdvance(){
 if(!session)return;const a=readForm(),r=dataset.records[index];const doubt=a.confidence==='con_duda';const e=C.errors(a,r,doubt);if(e.length){$('formErrors').textContent=e.join('\n');$('formErrors').hidden=false;$('formErrors').scrollIntoView({block:'center',behavior:'smooth'});return;}
 a.status=doubt?'duda':'completa';a.updatedAt=new Date().toISOString();upsert(a);if(!await persist())return;const prior=index,ids=matching(),next=ids.find(i=>i>prior);if(next!==undefined)index=next;else if(!ids.includes(prior)&&ids.length)index=ids[0];render();notice(doubt?'Caso marcado con duda. Queda pendiente de consenso.':next===undefined?'Respuesta guardada. Llegaste al final de esta selección.':'Respuesta guardada.',true);
 await persist();$('postPosition').scrollIntoView({block:'start',behavior:'smooth'});
}
async function move(direction){collectDraft();const ids=matching(),pos=ids.indexOf(index),target=ids[pos+direction];if(target===undefined)return;index=target;if(!await persist())return;render();$('postPosition').scrollIntoView({block:'start',behavior:'smooth'});}
$('annotationForm').addEventListener('input',()=>{if(!loading){setDependent();scheduleSave();}});
$('annotationForm').addEventListener('change',()=>{if(!loading){setDependent();scheduleSave();}});
$('annotationForm').addEventListener('submit',e=>{e.preventDefault();saveAndAdvance().catch(fail);});
$('previous').addEventListener('click',()=>move(-1).catch(fail));$('next').addEventListener('click',()=>move(1).catch(fail));
$('addLocation').addEventListener('click',()=>{addLocation();scheduleSave();});
for(const id of ['statusFilter','search'])$(id).addEventListener(id==='search'?'input':'change',async()=>{collectDraft();render();await persist();});
$('jump').addEventListener('change',async()=>{collectDraft();index=Number($('jump').value);render();await persist();});
$('csvFile').addEventListener('change',async e=>{const f=e.target.files[0];try{await ready;if(f)await importFile(f);}catch(err){fail(err);}finally{e.target.value='';}});
$('demoButton').addEventListener('click',async()=>{try{await ready;await acceptImport(C.normalize(C.csv(window.PIURA_DEMO_CSV)),'Ejemplos ficticios · 8 publicaciones');}catch(err){fail(err);}});
$('labelerName').addEventListener('input',()=>{if(session){session.labelerName=$('labelerName').value.trim();persist();}});
$('templateButton').addEventListener('click',template);$('exportCSV').addEventListener('click',()=>exportFile('csv').catch(fail));$('exportExcel').addEventListener('click',()=>exportFile('xlsx').catch(fail));
$('closeImage').addEventListener('click',()=>{$('imageDialog').close();$('largeImage').removeAttribute('src');});
document.addEventListener('selectionchange',()=>{const s=window.getSelection();if(!dataset||!s||s.isCollapsed||!s.anchorNode||!s.focusNode)return;if($('postText').contains(s.anchorNode)&&$('postText').contains(s.focusNode)){const text=s.toString().trim();if(text&&text.length<=500)selectedReference={id:dataset.records[index].id,text};}});
function fail(error){notice(error.message||'No se pudo completar la operación.');}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dataset&&persistTimer){collectDraft();persist();}});
window.addEventListener('pagehide',()=>{if(dataset&&persistTimer){collectDraft();persist();}});
window.addEventListener('beforeunload',e=>{if(persistTimer){collectDraft();persist();e.preventDefault();e.returnValue='';}});
async function start(){
 try{db=await LabelStorage.open();try{legacyDb=await LabelStorage.open('piura-etiquetador-v1');}catch{}const currentMeta=await LabelStorage.get(db,'meta','last'),meta=currentMeta||(legacyDb?await LabelStorage.get(legacyDb,'meta','last'):null);if(meta){dataset=await storedDataset(meta.id);if(dataset){dataset.records=C.normalize(dataset.records.map(r=>r.raw)).records;revisions.set(dataset.id,dataset._storageRevision||0);session=C.fileLabels(dataset,meta.annotator||'');$('labelerName').value=session.labelerName||(session.annotator!=='individual'?session.annotator:'');index=Math.min(Math.max(Number(meta.index)||0,0),dataset.records.length-1);render();if(!currentMeta)await persist();$('saveStatus').textContent='Avance recuperado de este navegador';}}}
 catch{db=null;notice('El guardado del navegador no está disponible. Exporta en Excel o CSV antes de cerrar.');}
}
const ready=start().catch(fail);
})();
