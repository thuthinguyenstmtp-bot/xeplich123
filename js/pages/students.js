'use strict';
/* ============================== Trang Học sinh (danh sách học sinh theo lớp/khối) ============================== */

var expandedStudentId = null;

function renderStudents(){
  var head = '<div class="page-head"><h2>Học sinh</h2><div class="sub">Quản lý danh sách học sinh theo từng lớp để điểm danh song song với TNV.</div></div>';

  if(!S.classes.length){
    return head + '<div class="card"><div class="empty">Chưa có lớp học nào. Hãy thêm lớp ở tab Lớp học trước.</div></div>';
  }
  var filter = S.studentsClassFilter || S.classes[0].id;
  var picker = '<div class="card"><div class="row"><div class="field" style="margin:0;"><label>Chọn lớp</label>' +
    '<select id="studClassPicker">'+S.classes.map(function(c){return '<option value="'+c.id+'" '+(c.id===filter?'selected':'')+'>'+escapeHtml(c.name)+' ('+dayLabel(c.dayOfWeek)+')</option>';}).join('')+'</select></div></div></div>';

  var form = '<div class="card"><div class="section-title">Thêm học sinh</div>' +
    '<form id="studentForm"><div class="row">' +
      '<div class="field"><label>Tên học sinh</label><input type="text" name="name" required></div>' +
      '<div class="field"><label>Lớp (khối)</label><input type="text" name="grade" placeholder="VD: 6, 7, 8…"></div>' +
      '<div class="field"><label>Nơi ở</label><select name="location"><option value="">— Chọn —</option><option>Nhà Nam</option><option>Nhà Nữ</option></select></div>' +
    '</div><div class="field"><label>Ghi chú</label><input type="text" name="note" placeholder="Không bắt buộc"></div>' +
    '<button class="btn btn-primary" type="submit">Thêm học sinh</button></form></div>';

  var list = Object.keys(S.students).filter(function(id){ return S.students[id].classId===filter; })
    .sort(function(a,b){ return (S.students[a].name||'').localeCompare(S.students[b].name||''); });
  var listCard = '<div class="card"><div class="section-title">Danh sách học sinh ('+list.length+')</div>' +
    (list.length ? list.map(function(id){
      var st = S.students[id];
      var open = expandedStudentId===id;
      return '<div class="class-row" style="align-items:center;flex-wrap:wrap;"><div class="class-main"><div class="name">'+escapeHtml(st.name)+(st.active===false?' <span class="paused-badge">Ngưng học</span>':'')+'</div>'+(st.note?'<div class="meta">'+escapeHtml(st.note)+'</div>':'')+'</div>' +
        '<input type="text" data-action="edit-student-grade" data-id="'+id+'" value="'+escapeHtml(st.grade||'')+'" placeholder="Khối" style="width:56px;font-size:12px;padding:4px 6px;border:1px solid var(--line-strong);border-radius:6px;background:var(--paper);color:var(--ink);">' +
        '<select data-action="edit-student-location" data-id="'+id+'" style="font-size:12px;padding:4px 6px;"><option value="" '+(!st.location?'selected':'')+'>Nơi ở…</option><option '+(st.location==='Nhà Nam'?'selected':'')+'>Nhà Nam</option><option '+(st.location==='Nhà Nữ'?'selected':'')+'>Nhà Nữ</option></select>' +
        '<div style="display:flex;gap:6px;">' +
          '<button class="btn btn-sm" data-action="toggle-student-detail" data-id="'+id+'">'+(open?'Ẩn hồ sơ':'Hồ sơ')+'</button>' +
          '<button class="btn btn-sm" data-action="stud-toggle" data-id="'+id+'" data-active="'+(st.active===false?'true':'false')+'">'+(st.active===false?'Kích hoạt lại':'Ngưng học')+'</button>' +
          '<button class="btn btn-sm btn-danger" data-action="stud-delete" data-id="'+id+'">Xoá</button>' +
        '</div>' +
        (open ? ('<form data-action="student-profile-form" data-id="'+id+'" style="width:100%;margin-top:10px;">' +
          '<div class="field"><label>Ghi chú</label><input type="text" name="note" value="'+escapeHtml(st.note||'')+'" placeholder="Ghi chú cho TNV tham khảo"></div>' +
          '<div class="field"><label>Sở thích</label><input type="text" name="interests" value="'+escapeHtml(st.interests||'')+'" placeholder="VD: vẽ, đá bóng, đọc truyện tranh…"></div>' +
          '<div class="row">' +
            '<div class="field"><label>Điểm mạnh</label><input type="text" name="strengths" value="'+escapeHtml(st.strengths||'')+'" placeholder="VD: tính nhẩm nhanh"></div>' +
            '<div class="field"><label>Cần hỗ trợ thêm</label><input type="text" name="weaknesses" value="'+escapeHtml(st.weaknesses||'')+'" placeholder="VD: còn yếu phần đọc hiểu"></div>' +
          '</div>' +
          '<button class="btn btn-sm btn-primary" type="submit">Lưu hồ sơ</button>' +
        '</form>') : '') +
      '</div>';
    }).join('') : '<div class="empty">Chưa có học sinh nào trong lớp này.</div>') +
  '</div>';

  return head + picker + form + listCard;
}
async function addStudent(classId, name, note, grade, location){
  try{ await S.db.collection('students').add({classId:classId||'', name:name, note:note||'', grade:grade||'', location:location||'', active:true, createdAt:Date.now()}); toast('Đã thêm học sinh.'); }
  catch(e){ toast('Không thể thêm học sinh.'); }
}
async function setStudentLocation(studentId, location){
  try{ await S.db.doc('students/'+studentId).update({location:location}); }
  catch(e){ toast('Không thể cập nhật nơi dạy.'); }
}
async function setStudentGrade(studentId, grade){
  try{ await S.db.doc('students/'+studentId).update({grade:grade}); }
  catch(e){ toast('Không thể cập nhật lớp.'); }
}
async function toggleStudentActive(id, active){
  try{ await S.db.doc('students/'+id).set(Object.assign({}, S.students[id], {active:active})); }
  catch(e){}
}
async function deleteStudent(id){
  try{ await S.db.doc('students/'+id).delete(); toast('Đã xoá học sinh.'); }
  catch(e){ toast('Không thể xoá.'); }
}

function bindStudentsEvents(){
  // students
  var studPicker = document.getElementById('studClassPicker');
  if(studPicker) studPicker.addEventListener('change', function(){ S.studentsClassFilter = studPicker.value; render(); });
  var studentForm = document.getElementById('studentForm');
  if(studentForm) studentForm.addEventListener('submit', function(ev){
    ev.preventDefault(); var fd = new FormData(studentForm);
    var cid = S.studentsClassFilter || (S.classes[0]&&S.classes[0].id);
    if(!cid){ toast('Chưa có lớp học.'); return; }
    addStudent(cid, fd.get('name'), fd.get('note'), fd.get('grade'), fd.get('location')); studentForm.reset();
  });
  document.querySelectorAll('[data-action="stud-toggle"]').forEach(function(el){
    el.addEventListener('click', function(){ toggleStudentActive(el.getAttribute('data-id'), el.getAttribute('data-active')==='true'); });
  });
  document.querySelectorAll('[data-action="stud-delete"]').forEach(function(el){
    el.addEventListener('click', function(){ if(confirm('Xoá học sinh này?')) deleteStudent(el.getAttribute('data-id')); });
  });
  document.querySelectorAll('[data-action="edit-student-grade"]').forEach(function(el){
    el.addEventListener('change', function(){ setStudentGrade(el.getAttribute('data-id'), el.value); });
  });
  document.querySelectorAll('[data-action="edit-student-location"]').forEach(function(el){
    el.addEventListener('change', function(){ setStudentLocation(el.getAttribute('data-id'), el.value); });
  });
  document.querySelectorAll('[data-action="toggle-student-detail"]').forEach(function(el){
    el.addEventListener('click', function(){ var id = el.getAttribute('data-id'); expandedStudentId = expandedStudentId===id ? null : id; render(); });
  });
  document.querySelectorAll('[data-action="student-profile-form"]').forEach(function(el){
    el.addEventListener('submit', function(ev){
      ev.preventDefault();
      var sid = el.getAttribute('data-id');
      var fd = new FormData(el);
      saveStudentProfileNotes(sid, {note:fd.get('note')||'', interests:fd.get('interests')||'', strengths:fd.get('strengths')||'', weaknesses:fd.get('weaknesses')||''});
    });
  });

}
