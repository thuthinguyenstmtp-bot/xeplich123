'use strict';
function csvEscape(v){
  v = (v==null?'':String(v));
  if(/[",\n]/.test(v)) return '"'+v.replace(/"/g,'""')+'"';
  return v;
}
function toCSV(headers, rows){
  var lines = [headers.map(csvEscape).join(',')];
  rows.forEach(function(r){ lines.push(r.map(csvEscape).join(',')); });
  return '\uFEFF' + lines.join('\r\n');
}
async function downloadCSV(filename, headers, rows){
  var data = toCSV(headers, rows);
  if(!S.downloadsCap){ toast('Không thể tải file ở chế độ xem này.'); return; }
  try{
    await S.downloadsCap.save({filename:filename, data:data});
    toast('Đã lưu file.');
  }catch(e){
    if(e && e.code==='declined'){ /* silent */ }
    else toast('Không thể lưu file.');
  }
}
