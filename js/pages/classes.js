'use strict';
/* ============================== Trang Lớp học (quản lý lớp cố định — dùng cho Tài liệu/Học sinh) ============================== */

var editingClassId = null;

function renderClasses(){
  var head = '<div class="page-head"><h2>Lớp học</h2><div class="sub">Danh sách các lớp dạy học lặp lại hằng tuần. Đây là dữ liệu nền để xếp lịch tự động.</div></div>';

  var form = '<div class="card"><div class="section-title">Thêm lớp học mới</div>' +
    '<form id="classForm">' +
      '<div class="row">' +
        '<div class="field"><label>Tên lớp</label><input type="text" name="name" placeholder="VD: Lớp Toán buổi chiều" required></div>' +
        '<div class="field"><label>Môn học</label><input type="text" name="subject" placeholder="VD: Toán, Tiếng Anh…" list="subjList"><datalist id="subjList"><option value="Toán"><option value="Tiếng Việt"><option value="Tiếng Anh"><option value="Kỹ năng sống"><option value="Âm nhạc"><option value="Mỹ thuật"></datalist></div>' +
      '</div>' +
      '<div class="row">' +
        '<div class="field"><label>Thứ</label><select name="dow">'+DAYS.map(function(d){return '<option value="'+d.v+'">'+d.label+'</option>';}).join('')+'</select></div>' +
        '<div class="field"><label>Từ</label><input type="time" name="start" value="14:00" required></div>' +
        '<div class="field"><label>Đến</label><input type="time" name="end" value="16:00" required></div>' +
        '<div class="field"><label>Số TNV cần</label><input type="number" name="needed" value="1" min="1" max="10" required></div>' +
      '</div>' +
      '<div class="row"><div class="field"><label>Địa điểm</label><input type="text" name="location" placeholder="VD: Phòng học 1"></div></div>' +
      '<div class="field"><label>Ghi chú</label><textarea name="notes" placeholder="Ghi chú thêm (không bắt buộc)"></textarea></div>' +
      '<button class="btn btn-primary" type="submit">Thêm lớp học</button>' +
    '</form></div>';

  var listHtml = '<div class="card"><div class="section-title">Tất cả lớp học ('+S.classes.length+')</div>';
  if(!S.classes.length){
    listHtml += '<div class="empty">Chưa có lớp học nào. Thêm lớp đầu tiên ở trên.</div>';
  }else{
    var byDay = {};
    S.classes.forEach(function(c){ (byDay[c.dayOfWeek]=byDay[c.dayOfWeek]||[]).push(c); });
    DAYS.forEach(function(d){
      var list = byDay[d.v]||[];
      if(!list.length) return;
      listHtml += '<div class="day-band"><span class="lbl">'+d.label+'</span><span class="rule"></span></div>';
      list.forEach(function(c){
        var assigned = assignedIds(c.id);
        listHtml += '<div class="class-row">' +
          '<div class="class-time">'+c.start+'–'+c.end+'</div>' +
          '<div class="class-main"><div class="name">'+escapeHtml(c.name)+(c.subject?' · '+escapeHtml(c.subject):'')+'</div>' +
          '<div class="meta">'+(c.location?escapeHtml(c.location)+' · ':'')+'Cần '+(c.needed||1)+' TNV · Đã xếp '+assigned.length+'</div>' +
          '<div class="class-tnv">'+assigned.map(function(uid){return '<span class="chip">'+escapeHtml(profileName(uid))+'</span>';}).join('')+'</div></div>' +
          '<div style="display:flex;gap:6px;">' +
            '<button class="btn btn-sm" data-action="edit-class" data-id="'+c.id+'">Sửa</button>' +
            '<button class="btn btn-sm btn-danger" data-action="delete-class" data-id="'+c.id+'">Xoá</button>' +
          '</div></div>';
      });
    });
  }
  listHtml += '</div>';
  return head + form + listHtml;
}
async function saveClass(data, id){
  try{
    if(id){ await S.db.doc('classes/'+id).set(data); } else { await S.db.collection('classes').add(data); logAudit('class_create', {name:data.name}); }
    toast('Đã lưu lớp học.');
  }catch(e){ toast('Không thể lưu lớp học.'); }
}
async function updateClassSubject(classId, subject){
  try{ await S.db.doc('classes/'+classId).update({subject:subject, updatedAt:Date.now()}); }
  catch(e){ toast('Không thể cập nhật môn học.'); }
}
async function deleteClass(id){
  var c = S.classesById[id];
  try{ await S.db.doc('classes/'+id).delete(); await S.db.doc('assignments/'+id).delete(); toast('Đã xoá lớp học.'); logAudit('class_delete', {name:c?c.name:id}); }
  catch(e){ toast('Không thể xoá.'); }
}

function bindClassesEvents(){
  // classes
  var classForm = document.getElementById('classForm');
  if(classForm) classForm.addEventListener('submit', function(ev){
    ev.preventDefault();
    var fd = new FormData(classForm);
    var data = { name:fd.get('name'), subject:fd.get('subject')||'', dayOfWeek:+fd.get('dow'), start:fd.get('start'), end:fd.get('end'), needed:+fd.get('needed')||1, location:fd.get('location')||'', notes:fd.get('notes')||'', updatedAt:Date.now() };
    if(data.start >= data.end){ toast('Giờ bắt đầu phải trước giờ kết thúc.'); return; }
    saveClass(data, editingClassId); editingClassId=null; classForm.reset();
  });
  document.querySelectorAll('[data-action="edit-class"]').forEach(function(el){
    el.addEventListener('click', function(){
      var c = S.classesById[el.getAttribute('data-id')]; if(!c) return;
      editingClassId = c.id;
      var f = document.getElementById('classForm');
      f.name.value=c.name||''; f.subject.value=c.subject||''; f.dow.value=c.dayOfWeek; f.start.value=c.start||''; f.end.value=c.end||''; f.needed.value=c.needed||1; f.location.value=c.location||''; f.notes.value=c.notes||'';
      f.scrollIntoView({behavior:'smooth', block:'center'});
      toast('Đang sửa "'+c.name+'" — lưu để cập nhật.');
    });
  });
  document.querySelectorAll('[data-action="delete-class"]').forEach(function(el){
    el.addEventListener('click', function(){ if(confirm('Xoá lớp học này? Thao tác không thể hoàn tác.')) deleteClass(el.getAttribute('data-id')); });
  });

}
