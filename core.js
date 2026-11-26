(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LabelCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=1;
const protocols={
 auxilio_v1:{label:'Protocolo de etiquetado manual',question:'¿Hay auxilio a personas?',help:'Se solicita ayuda o existe evidencia clara de personas que necesitan asistencia o rescate. La presencia de personas cerca del agua no es suficiente.'}
};
function csv(text){
 text=String(text).replace(/^\uFEFF/,'');if(!text.trim())throw Error('El archivo está vacío.');
 let quoted=false,first='';for(let i=0;i<text.length;i++){if(text[i]==='"')quoted=!quoted;if(!quoted&&/[\r\n]/.test(text[i]))break;first+=text[i];}
 const delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
 const rows=[];let row=[],cell='',inside=false,closed=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];if(inside){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{inside=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw Error('Comillas no válidas en el CSV.');inside=true;continue;}
  if(c===delimiter||c==='\n'||c==='\r'){row.push(cell);cell='';closed=false;if(c!==delimiter){if(row.some(v=>v!==''))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}continue;}
  if(closed){if(c===' '||c==='\t')continue;throw Error('Hay texto después del cierre de comillas.');}cell+=c;
 }
 if(inside)throw Error('Una celda tiene comillas sin cerrar.');if(cell||row.length){row.push(cell);if(row.some(v=>v!==''))rows.push(row);}
 if(rows.length<2)throw Error('El CSV necesita encabezados y al menos una publicación.');
 const headers=rows.shift().map(x=>x.trim());if(headers.some(x=>!x)||new Set(headers.map(x=>x.toLowerCase())).size!==headers.length)throw Error('Los encabezados deben ser únicos y no estar vacíos.');
 return rows.map((r,i)=>{if(r.length!==headers.length)throw Error(`Fila ${i+2}: hay ${r.length} celdas; se esperaban ${headers.length}. Revisa comillas y separadores.`);return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));});
}
function safeURL(value,relative=false){const s=String(value||'').trim();if(!s)return '';if(relative&&/^(?:assets|examples)\/[a-z0-9_./-]+$/i.test(s)&&!s.includes('..'))return s;try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function list(v){if(!v)return [];if(v.trim().startsWith('[')){try{const a=JSON.parse(v);if(!Array.isArray(a)||!a.every(x=>typeof x==='string'))throw Error();return a;}catch{throw Error('La lista de medios debe ser un arreglo JSON de enlaces o enlaces separados por |.');}}return v.split('|').map(x=>x.trim()).filter(Boolean);}
function encodeCell(v){let s=String(v??'');if(/^'/.test(s)||/^[\s]*[=+@-]/.test(s)||/^\d{16,}$/.test(s))s="'"+s;return s;}
function decodeCell(v){return v.startsWith("'")?v.slice(1):v;}
function normalize(rows){
 const seen=new Set(),records=[],imported=[];let duplicates=0;
 for(const [i,rawInput] of rows.entries()){
  const encoded=rawInput._etq_export_version==='1';const raw=Object.fromEntries(Object.entries(rawInput).map(([k,v])=>[k,encoded?decodeCell(String(v)):String(v)]));
  const keyMap=new Map(Object.keys(raw).map(k=>[k.toLowerCase().trim(),k]));
  const get=(...names)=>{for(const n of names){if(keyMap.has(n))return raw[keyMap.get(n)];}return '';};
  const id=get('id','tweet_id','post_id','id_publicacion').trim(),text=get('texto','text','full_text');
  if(!id||!text.trim())throw Error(`Fila ${i+2}: son obligatorios un ID y texto. Encabezados admitidos: id/texto o tweet_id/text.`);
  if(/^\d+[.,]\d+e[+-]?\d+$/i.test(id)||/^\d+e[+-]?\d+$/i.test(id))throw Error(`Fila ${i+2}: el ID está en notación científica. Usa el ID original como texto.`);
  const photos=list(get('imagenes','image_urls','photo_urls','image_url','media_urls')).map(x=>safeURL(x,true));
  const videos=list(get('videos','video_urls','video_url')).map(x=>safeURL(x,true));
  const thumbs=list(get('miniaturas','video_preview_urls','preview_image_url')).map(x=>safeURL(x,true));
  if([...photos,...videos,...thumbs].some(x=>!x))throw Error(`Fila ${i+2}: un enlace de medio no es HTTP/HTTPS válido.`);
  const hasVideo=videos.length>0||thumbs.length>0||/^(si|sí|true|1)$/i.test(get('contiene_video','has_video'));
  const hasImage=photos.length>0||/^(si|sí|true|1)$/i.test(get('contiene_imagen','has_image'));
  const r={id,text,date:get('fecha','created_at','date'),url:safeURL(get('url','tweet_url','enlace')),photos,videos,thumbs,hasImage,hasVideo,raw:Object.fromEntries(Object.entries(raw).filter(([k])=>!k.startsWith('_etq_')))};
  if(seen.has(id)){const old=records.find(p=>p.id===id);if(JSON.stringify(old)!==JSON.stringify(r))throw Error(`El ID ${id} aparece con contenidos distintos. Resuelve ese conflicto antes de importar.`);duplicates++;continue;}
  seen.add(id);records.push(r);
  if(raw._etq_anotador&&raw._etq_protocolo){
   if(!protocols[raw._etq_protocolo])throw Error('El CSV contiene una versión de protocolo desconocida.');
   let a;try{a=JSON.parse(raw._etq_anotacion_json||'null');}catch{throw Error('Una anotación exportada no tiene JSON válido.');}
   if(a){validateAnnotationShape(a,id);if(a.status==='completa'&&errors(a,r).length)throw Error('Una anotación completada del CSV no cumple los campos requeridos.');imported.push({annotator:raw._etq_anotador,protocol:raw._etq_protocolo,annotation:a});}
  }
 }
 return {records,imported,duplicates};
}
function validateAnnotationShape(a,id){
 if(!a||a.id!==id||!['borrador','completa','duda'].includes(a.status)||!Array.isArray(a.locations)||!['','si','no'].includes(a.relevant)||!['','si','no'].includes(a.attention)||!['','si','no'].includes(a.flood))throw Error('El respaldo contiene una anotación incompatible.');
 if(['id','relevant','attention','flood','confidence','notes','videoEvidence','videoTime','updatedAt'].some(k=>typeof a[k]!=='string')||typeof a.noReference!=='boolean'||!['segura','con_duda'].includes(a.confidence)||!['no_revisado','no_aplica','sin_aporte','atencion','inundacion','ambos'].includes(a.videoEvidence))throw Error('Campos de anotación incompatibles en el respaldo.');
 if(a.locations.some(l=>!l||['reference','type','resolved','district','lat','lng','source'].some(k=>typeof l[k]!=='string')))throw Error('Ubicación incompatible en el respaldo.');
 if(a.status==='duda'&&!a.notes.trim())throw Error('Un caso con duda debe incluir una explicación.');
 if(a.relevant==='no'&&(a.attention!=='no'||a.flood!=='no'||a.locations.length))throw Error('Una anotación no relevante tiene categorías o ubicaciones incompatibles.');
}
function errors(a,record,forDoubt=false){
 if(forDoubt)return a.notes.trim()?[]:['Explica la duda en Observaciones.'];
 const e=[];if(!['si','no'].includes(a.relevant))e.push('Indica si la publicación es relevante.');
 if(a.relevant==='si'){
  if(!['si','no'].includes(a.attention))e.push('Responde la categoría de atención.');if(!['si','no'].includes(a.flood))e.push('Responde el reporte de inundación o desborde.');
  if(!a.noReference&&!a.locations.length)e.push('Registra una ubicación o marca «No hay referencia geográfica en el texto».');
  if(!a.noReference)for(const [i,l] of a.locations.entries()){
   if(!l.reference.trim())e.push(`Ubicación ${i+1}: copia la referencia textual.`);if(!['no_resuelta','area','punto'].includes(l.type))e.push(`Ubicación ${i+1}: elige el nivel.`);
   if(['area','punto'].includes(l.type)&&!l.resolved.trim())e.push(`Ubicación ${i+1}: indica el lugar identificado.`);
   if(l.type==='punto'){
    if(l.lat.trim()===''||l.lng.trim()===''||!Number.isFinite(Number(l.lat))||!Number.isFinite(Number(l.lng))||Math.abs(Number(l.lat))>90||Math.abs(Number(l.lng))>180)e.push(`Ubicación ${i+1}: revisa latitud y longitud en grados decimales.`);
    if(!l.source.trim())e.push(`Ubicación ${i+1}: añade la fuente de verificación del punto.`);
   }
  }
 }
 if(a.confidence==='con_duda'&&!a.notes.trim())e.push('Explica la incertidumbre en Observaciones.');
 if(record.hasVideo&&['atencion','inundacion','ambos'].includes(a.videoEvidence)&&!a.videoTime.trim())e.push('Indica el momento del video donde aparece la evidencia.');
 return e;
}
function blank(id){return {id,status:'borrador',relevant:'',attention:'',flood:'',noReference:false,locations:[],confidence:'segura',notes:'',videoEvidence:'no_revisado',videoTime:'',updatedAt:''};}
function effective(a){const b=JSON.parse(JSON.stringify(a));if(b.relevant==='no'){b.attention='no';b.flood='no';b.noReference=true;b.locations=[];}else if(b.noReference)b.locations=[];else b.locations=b.locations.map(l=>{if(l.type==='no_resuelta')return {...l,resolved:'',district:'',lat:'',lng:'',source:''};if(l.type==='area')return {...l,lat:'',lng:'',source:''};return l;});return b;}
function csvExport(dataset,session){
 const headers=[...new Set(dataset.records.flatMap(r=>Object.keys(r.raw)))];
 const extra=['_etq_export_version','_etq_anotador','_etq_protocolo','_etq_estado','_etq_relevante','_etq_auxilio_personas','_etq_inundacion_desborde','_etq_ubicaciones_json','_etq_confianza','_etq_observaciones','_etq_fecha','_etq_anotacion_json','_etq_contiene_imagen','_etq_contiene_video'];
 const annotations=new Map(session.annotations.map(a=>[a.id,a]));const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const rows=dataset.records.map(r=>{const a=annotations.get(r.id);return [...headers.map(h=>r.raw[h]||''),'1',session.annotator,session.protocol,a?.status||'pendiente',a?.relevant||'',a?.attention||'',a?.flood||'',a?JSON.stringify(a.locations):'',a?.confidence||'',a?.notes||'',a?.updatedAt||'',a?JSON.stringify(a):'',r.hasImage?'si':'no',r.hasVideo?'si':'no'].map(encodeCell).map(quote).join(',');});
 return '\uFEFF'+[headers.concat(extra).map(quote).join(','),...rows].join('\r\n');
}
async function fingerprint(records){const value=JSON.stringify(records.map(r=>r.raw));if(globalThis.crypto?.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}let a=2166136261,b=5381;for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b,33)^value.charCodeAt(i);}return `portable-${a>>>0}-${b>>>0}-${value.length}`;}
return {VERSION,protocols,csv,normalize,safeURL,blank,effective,errors,csvExport,fingerprint,validateAnnotationShape};
});
