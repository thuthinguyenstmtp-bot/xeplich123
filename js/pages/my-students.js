'use strict';
/* ============================== Trang Học sinh của tôi (hồ sơ nhỏ, gắn kết TNV–học sinh) ============================== */

function renderMyStudents(){
  var head = '<div class="page-head"><h2>Học sinh của tôi</h2><div class="sub">Những học sinh bạn từng dạy — xem nhanh thông tin từ điều phối, sở thích, điểm mạnh/yếu và tiến độ các buổi trước, giúp buổi dạy tiếp theo gắn kết hơn.</div></div>';

  var ids = studentIdsTaughtBy(S.uid).filter(function(sid){ return S.students[sid]; });
  ids.sort(function(a,b){ return (S.students[a].name||'').localeCompare(S.students[b].name||''); });

  if(!ids.length){
    return head + '<div class="card"><div class="empty"><div class="big">Chưa có học sinh nào</div>Khi bạn được xếp dạy một học sinh trong bảng xếp lịch, học sinh đó sẽ xuất hiện ở đây.</div></div>';
  }

  var cards = ids.map(function(sid){
    var st = S.students[sid];
    var sessions = studentProgressSessions(sid).slice(0, 6);

    var coordInfo = '<div class="hint" style="margin-top:2px;margin-bottom:10px;">' +
      (st.note ? 'Ghi chú từ điều phối: '+escapeHtml(st.note) : 'Chưa có ghi chú từ điều phối.') +
    '</div>';

    var progress = sessions.length ? sessions.map(function(s){
      var statusLabel = s.studStatus==='present' ? 'Có mặt' : (s.studStatus==='absent' ? 'Vắng' : '');
      var statusClass = s.studStatus==='present' ? 'sage' : (s.studStatus==='absent' ? 'coral' : '');
      var teacherNames = s.teachers.map(function(uid){ return escapeHtml(profileName(uid)); }).join(', ');
      return '<div class="class-row" style="align-items:flex-start;">' +
        '<div class="class-time">'+fmtDateVN(s.date)+'</div>' +
        '<div class="class-main">' +
          (s.note ? '<div style="font-size:13px;white-space:pre-wrap;">'+escapeHtml(s.note)+'</div>' : '<div class="hint" style="margin:0;">Chưa có nhật ký buổi học.</div>') +
          (teacherNames ? '<div class="meta">TNV: '+teacherNames+'</div>' : '') +
        '</div>' +
        (statusLabel ? '<span class="chip '+statusClass+'">'+statusLabel+'</span>' : '') +
      '</div>';
    }).join('') : '<div class="empty">Chưa có buổi học nào được ghi nhận cho học sinh này.</div>';

    var infoRow = function(label, val){
      return '<div class="field" style="margin-bottom:8px;"><label>'+label+'</label><div style="font-size:13.5px;">'+(val?escapeHtml(val):'<span class="hint" style="margin:0;">Chưa có thông tin.</span>')+'</div></div>';
    };
    var studentInfo = '<div class="card" style="box-shadow:none;margin:0 0 12px;">' +
        infoRow('Sở thích', st.interests) +
        '<div class="row">' + infoRow('Điểm mạnh', st.strengths) + infoRow('Cần hỗ trợ thêm', st.weaknesses) + '</div>' +
        '<div class="hint" style="margin-top:0;">Thông tin này do Điều phối viên/Quản trị viên cập nhật ở tab Học sinh.</div>' +
      '</div>';

    return '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;">' +
        '<div class="name" style="font-weight:700;font-size:15px;">'+escapeHtml(st.name)+(st.grade?' <span class="hint" style="margin:0;">· Lớp '+escapeHtml(st.grade)+'</span>':'')+'</div>' +
        (st.location?'<span class="chip">'+escapeHtml(st.location)+'</span>':'') +
      '</div>' +
      coordInfo +
      studentInfo +
      '<div class="divider"></div>' +
      '<div class="section-title">Tiến độ học tập các buổi trước</div>' +
      progress +
    '</div>';
  }).join('');

  return head + cards;
}
async function saveStudentProfileNotes(studentId, data){
  try{ await S.db.doc('students/'+studentId).update(data); toast('Đã lưu hồ sơ học sinh.'); }
  catch(e){ toast('Không thể lưu.'); }
}

function bindMyStudentsEvents(){
  // my students
  document.querySelectorAll('[data-action="view-progress"]').forEach(function(el){
    el.addEventListener('click', function(){
      S.progressStudentId = el.getAttribute('data-sid');
      S.activeTab = 'mystudents';
      render();
    });
  });

}
