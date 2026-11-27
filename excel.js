/* SheetJS runs locally: no file is uploaded. IDs and exported values stay text. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./vendor/xlsx.full.min.js'):root.XLSX);if(typeof module==='object'&&module.exports)module.exports=api;else root.LabelExcel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(X){
'use strict';
function read(data){
 if(!X)throw Error('No se pudo cargar el lector de Excel. Recarga la página.');
 try{const book=X.read(data,{type:'array',cellDates:false,cellNF:true});if(!book.SheetNames.length)throw Error();return book;}catch{throw Error('No se pudo leer el Excel. Comprueba que sea .xlsx o .xls y que no tenga contraseña.');}
}
function rows(book,name){
 const sheet=book.Sheets[name];if(!sheet||!sheet['!ref'])throw Error('La hoja seleccionada está vacía.');
 const range=X.utils.decode_range(sheet['!ref']);
 if(range.e.r-range.s.r>100000||range.e.c-range.s.c>255)throw Error('La hoja es demasiado grande. Usa un lote de hasta 100 000 publicaciones y 256 columnas, sin filas vacías con formato al final.');
 const table=[];
 for(let r=range.s.r;r<=range.e.r;r++){
  const row=[];
  for(let c=range.s.c;c<=range.e.c;c++){
   const cell=sheet[X.utils.encode_cell({r,c})];let value='';
   if(cell){
    if(cell.t==='e'||(cell.f&&cell.v==null))throw Error(`Hay una fórmula sin resultado o un error en la fila ${r+1}. Guarda sus valores antes de importar.`);
    if(r>range.s.r&&/^(id|tweet_id|post_id|id_publicacion)$/i.test(String(table[0]?.[c-range.s.c]||'').trim())&&cell.t==='n'&&(!Number.isSafeInteger(cell.v)||Math.abs(cell.v)>=1e15))throw Error(`Fila ${r+1}: el ID largo está guardado como número en Excel. Usa el ID original como texto para evitar dígitos redondeados.`);
    value=String(cell.v??'');
    if(cell.t==='n'&&cell.z&&X.SSF.is_date(cell.z)){
     const d=X.SSF.parse_date_code(cell.v,{date1904:!!book.Workbook?.WBProps?.date1904});
     if(!d||d.y<1900)throw Error(`Fila ${r+1}: hay una fecha Excel no válida. Usa una fecha ISO como texto.`);
     const pad=n=>String(n).padStart(2,'0');value=`${d.y}-${pad(d.m)}-${pad(d.d)}T${pad(d.H)}:${pad(d.M)}:${pad(d.S)}-05:00`;
    }
   }
   row.push(value);
  }
  table.push(row);
 }
 const quote=v=>'"'+v.replace(/"/g,'""')+'"';
 return table.map(row=>row.map(quote).join(',')).join('\r\n');
}
function write(table){
 if(!X)throw Error('No se pudo cargar el exportador de Excel. Recarga la página.');
 if(table.length>1048576||table[0].length>16384)throw Error('El archivo supera el tamaño de una hoja Excel. Exporta como CSV.');
 if(table.some(row=>row.some(v=>String(v).length>32767)))throw Error('Hay una celda que supera los 32 767 caracteres de Excel. Exporta como CSV para conservar el contenido completo.');
 const sheet=X.utils.aoa_to_sheet(table.map(row=>row.map(v=>String(v??''))));
 sheet['!cols']=table[0].map(h=>({wch:/texto|full_text|observaciones/i.test(h)?65:/^id$|tweet_id|post_id/.test(h)?24:22}));
 sheet['!autofilter']={ref:sheet['!ref']};
 const book=X.utils.book_new();X.utils.book_append_sheet(book,sheet,'Publicaciones');
 return X.write(book,{type:'array',bookType:'xlsx',compression:true});
}
return {read,rows,write};
});
