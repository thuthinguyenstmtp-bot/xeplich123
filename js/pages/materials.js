'use strict';
/* ============================== Trang Tài liệu & Thảo luận ============================== */

function renderMaterials(){
  var head = '<div class="page-head"><h2>Tài liệu &amp; Thảo luận</h2><div class="sub">Chia sẻ giáo án, tài liệu dùng chung và trao đổi kinh nghiệm dạy theo từng lớp.</div></div>';

  if(!S.classes.length) return head + '<div class="card"><div class="empty">Chưa có lớp học nào.</div></div>';

  var filter = S.materialsClassFilter && S.classesById[S.materialsClassFilter] ? S.materialsClassFilter : S.classes[0].id;
  var picker = '<div class="card"><div class="field" style="margin:0;"><label>Chọn lớp</label>' +
    '<select id="matClassPicker">'+S.classes.map(function(c){return '<option value="'+c.id+'" '+(c.id===filter?'selected':'')+'>'+escapeHtml(c.name)+' ('+dayLabel(c.dayOfWeek)+')</option>';}).join('')+'</select></div></div>';

  var mats = Object.keys(S.materials).filter(function(id){ return S.materials[id].classId===filter; })
    .map(function(id){ return Object.assign({id:id}, S.materials[id]); })
    .sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });

  var matForm = '<div class="card"><div class="section-title">Thêm tài liệu</div>' +
    '<form id="materialForm"><div class="row">' +
      '<div class="field"><label>Tên tài liệu</label><input type="text" name="title" placeholder="VD: Giáo án Toán chương 3" required></div>' +
      '<div class="field"><label>Đường dẫn (link, không bắt buộc)</label><input type="url" name="url" placeholder="https://…"></div>' +
    '</div><div class="field"><label>Ghi chú</label><input type="text" name="note" placeholder="Không bắt buộc"></div>' +
    '<button class="btn btn-primary btn-sm" type="submit">Thêm tài liệu</button></form></div>';

  var matList = '<div class="card"><div class="section-title">Tài liệu dùng chung ('+mats.length+')</div>' +
    (mats.length ? mats.map(function(m){
      return '<div class="class-row"><div class="class-main"><div class="name">'+(m.url?'<a href="'+escapeHtml(m.url)+'" target="_blank" rel="noopener" style="color:var(--marigold-dark);">'+escapeHtml(m.title)+'</a>':escapeHtml(m.title))+'</div>' +
        (m.note?'<div class="meta">'+escapeHtml(m.note)+'</div>':'') +
        '<div class="meta">Thêm bởi '+escapeHtml(profileName(m.addedBy))+'</div></div>' +
        '<button class="btn btn-sm btn-danger" data-action="delete-material" data-id="'+m.id+'">Xoá</button></div>';
    }).join('') : '<div class="empty">Chưa có tài liệu nào cho lớp này.</div>') +
  '</div>';

  var disc = Object.keys(S.discussions).filter(function(id){ return S.discussions[id].classId===filter; })
    .map(function(id){ return Object.assign({id:id}, S.discussions[id]); })
    .sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });

  var discCard = '<div class="card"><div class="section-title">Thảo luận, hỏi đáp ('+disc.length+')</div>' +
    (disc.length ? disc.map(function(d){
      return '<div style="padding:8px 0;border-bottom:1px solid var(--line);">' +
        '<div style="display:flex;gap:8px;align-items:baseline;"><span class="name" style="font-weight:700;font-size:13px;">'+escapeHtml(profileName(d.uid))+'</span><span class="hint" style="margin:0;">'+new Date(d.createdAt||0).toLocaleString('vi-VN')+'</span></div>' +
        '<div style="font-size:13.5px;white-space:pre-wrap;margin-top:2px;">'+escapeHtml(d.content)+'</div>' +
      '</div>';
    }).join('') : '<div class="empty">Chưa có trao đổi nào — hãy đặt câu hỏi hoặc chia sẻ kinh nghiệm đầu tiên.</div>') +
    '<form id="discussionForm" style="margin-top:12px;"><div class="field" style="margin-bottom:8px;"><textarea name="content" placeholder="Đặt câu hỏi hoặc chia sẻ kinh nghiệm dạy lớp này…" required></textarea></div><button class="btn btn-primary btn-sm" type="submit">Gửi</button></form>' +
  '</div>';

  return head + picker + matForm + matList + discCard;
}
async function addMaterial(classId, title, url, note){
  if(!title){ toast('Vui lòng nhập tên tài liệu.'); return; }
  try{ await S.db.collection('materials').add({classId:classId, title:title, url:url||'', note:note||'', addedBy:S.uid, createdAt:Date.now()}); toast('Đã thêm tài liệu.'); }
  catch(e){ toast('Không thể thêm.'); }
}
async function deleteMaterial(id){
  try{ await S.db.doc('materials/'+id).delete(); toast('Đã xoá tài liệu.'); }
  catch(e){ toast('Không thể xoá.'); }
}
async function postDiscussion(classId, content){
  if(!content || !content.trim()){ return; }
  try{ await S.db.collection('discussions').add({classId:classId, uid:S.uid, content:content.trim(), createdAt:Date.now()}); }
  catch(e){ toast('Không thể gửi.'); }
}

function bindMaterialsEvents(){
  // materials & discussion
  var matPicker = document.getElementById('matClassPicker');
  if(matPicker) matPicker.addEventListener('change', function(){ S.materialsClassFilter = matPicker.value; render(); });
  var materialForm = document.getElementById('materialForm');
  if(materialForm) materialForm.addEventListener('submit', function(ev){
    ev.preventDefault(); var fd = new FormData(materialForm);
    var cid = S.materialsClassFilter || (S.classes[0]&&S.classes[0].id);
    addMaterial(cid, fd.get('title'), fd.get('url'), fd.get('note'));
    materialForm.reset();
  });
  document.querySelectorAll('[data-action="delete-material"]').forEach(function(el){
    el.addEventListener('click', function(){ if(confirm('Xoá tài liệu này?')) deleteMaterial(el.getAttribute('data-id')); });
  });
  var discussionForm = document.getElementById('discussionForm');
  if(discussionForm) discussionForm.addEventListener('submit', function(ev){
    ev.preventDefault(); var fd = new FormData(discussionForm);
    var cid = S.materialsClassFilter || (S.classes[0]&&S.classes[0].id);
    postDiscussion(cid, fd.get('content'));
    discussionForm.reset();
  });

}
