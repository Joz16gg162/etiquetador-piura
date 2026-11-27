/* Separate from v1 so an already-open older page cannot overwrite a fresh start. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LabelStorage=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function open(name='piura-etiquetador-v2'){
 return new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>{r.result.createObjectStore('datasets',{keyPath:'id'});r.result.createObjectStore('meta');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Otra pestaña mantiene abierta una versión antigua.'));});
}
function get(db,store,key){return new Promise((resolve,reject)=>{const t=db.transaction(store,'readonly'),r=t.objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function write(db,value,meta,expectedRevision){
 return new Promise((resolve,reject)=>{
  const t=db.transaction(['datasets','meta'],'readwrite'),store=t.objectStore('datasets'),request=store.get(value.id);let conflict=false;
  request.onsuccess=()=>{
   if((request.result?._storageRevision||0)!==expectedRevision){conflict=true;t.abort();return;}
   store.put({...value,_storageRevision:expectedRevision+1});t.objectStore('meta').put(meta,'last');
  };
  t.oncomplete=()=>resolve(expectedRevision+1);
  t.onerror=()=>reject(t.error);
  t.onabort=()=>{const error=Error(conflict?'El archivo cambió en otra pestaña. Recarga esta página para recuperar el avance actual.':'Guardado cancelado.');if(conflict)error.code='STALE_TAB';reject(error);};
 });
}
return {open,get,write};
});
