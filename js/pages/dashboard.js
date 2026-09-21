'use strict';
/* ============================== Trang Tổng quan (Dashboard) ============================== */

function renderDashboard(){
  var head = '<div class="page-head"><h2>Tổng quan</h2><div class="sub">Tình hình hoạt động dạy học tình nguyện hiện tại.</div></div>';

  var activeVol = Object.keys(S.roles).filter(function(id){ return !isPaused(id); }).length;
  var us = understaffedClasses();
  var from7 = addDays(todayStr(), -6);
  var stats = attendanceStatsInRange(from7, todayStr());
  var totalP=0, totalA=0;
  Object.values(stats).forEach(function(s){ totalP+=s.present; totalA+=s.absent; });
  var rate = (totalP+totalA)>0 ? Math.round(100*totalP/(totalP+totalA)) : null;

  var stat = '<div class="stat-grid">' +
    '<div class="stat-card"><div class="num">'+S.classes.length+'</div><div class="lbl">Lớp học đang mở</div></div>' +
    '<div class="stat-card"><div class="num">'+activeVol+'</div><div class="lbl">TNV đang hoạt động</div></div>' +
    '<div class="stat-card"><div class="num" style="color:'+(us.length?'var(--coral)':'inherit')+';">'+us.length+'</div><div class="lbl">Lớp đang thiếu TNV</div></div>' +
    '<div class="stat-card"><div class="num">'+(rate==null?'—':rate+'%')+'</div><div class="lbl">Tỷ lệ có mặt (7 ngày qua)</div></div>' +
  '</div>';

  var usCard = '<div class="card"><div class="section-title">Lớp đang thiếu TNV</div>' +
    (us.length ? us.map(function(c){
      return '<div class="class-row"><div class="class-time">'+dayShort(c.dayOfWeek)+' '+c.start+'</div><div class="class-main"><div class="name">'+escapeHtml(c.name)+'</div><div class="meta">Cần '+(c.needed||1)+' · Đã có '+assignedIds(c.id).length+'</div></div>' +
      '<button class="btn btn-sm" data-action="go-tab" data-tab="autoschedule">Xếp thêm</button></div>';
    }).join('') : '<div class="empty">Tất cả các lớp đã đủ TNV. Tuyệt vời!</div>') +
  '</div>';

  var curWeek = S.scheduleWeekStart || mondayOf(todayStr());
  var emptyCells = cellsNeedingTnv(curWeek);
  var noSched = studentsWithNoScheduleThisWeek(curWeek);
  var sheetWarnCard = (emptyCells.length || noSched.length) ? ('<div class="card"><div class="section-title">Bảng xếp lịch tuần '+fmtDateVN(curWeek)+' — cần chú ý</div>' +
    (emptyCells.length ? '<div class="class-row"><div class="class-main"><span class="name">'+emptyCells.length+' ô đã có môn nhưng chưa có TNV</span></div><button class="btn btn-sm" data-action="go-tab" data-tab="autoschedule">Xếp ngay</button></div>' : '') +
    (noSched.length ? '<div class="class-row"><div class="class-main"><span class="name">'+noSched.length+' học sinh chưa có lịch nào tuần này</span><div class="meta">'+noSched.slice(0,8).map(function(sid){return escapeHtml(S.students[sid].name);}).join(', ')+(noSched.length>8?'…':'')+'</div></div><button class="btn btn-sm" data-action="go-tab" data-tab="autoschedule">Xem bảng</button></div>' : '') +
  '</div>') : '';

  var openReqs = allOpenLeaveRequests();
  var reqCard = '<div class="card"><div class="section-title">Yêu cầu xin nghỉ đang chờ người thay ('+openReqs.length+')</div>' +
    (openReqs.length ? openReqs.slice(0,6).map(function(r){
      var c = S.classesById[r.classId];
      return '<div class="class-row"><div class="class-main"><div class="name">'+escapeHtml(profileName(r.requestedBy))+' — '+(c?escapeHtml(c.name):'')+'</div>' +
        '<div class="meta">'+fmtDateVN(r.date)+' · '+(REASON_LABEL[r.reason]||r.reason)+'</div></div>' +
        '<button class="btn btn-sm" data-action="go-tab" data-tab="swap">Xem</button></div>';
    }).join('') : '<div class="empty">Không có yêu cầu nào đang chờ.</div>') +
  '</div>';

  var pending = pendingApprovals();
  var pendingCard = pending.length ? ('<div class="card"><div class="section-title">TNV mới chờ duyệt ('+pending.length+')</div>' +
    pending.map(function(uid){
      return '<div class="class-row"><div class="class-main"><span class="name">'+escapeHtml(profileName(uid))+'</span></div>' +
        '<button class="btn btn-sm btn-primary" data-action="approve-volunteer" data-uid="'+uid+'">Duyệt</button></div>';
    }).join('') + '</div>') : '';

  var flagged = flaggedForAbsences();
  var flaggedCard = flagged.length ? ('<div class="card"><div class="section-title">TNV vắng liên tục cần lưu ý ('+flagged.length+')</div>' +
    flagged.map(function(uid){
      return '<div class="class-row"><div class="class-main"><span class="name">'+escapeHtml(profileName(uid))+'</span><div class="meta">Đã vắng '+consecutiveAbsences(uid)+' buổi liên tiếp gần đây</div></div>' +
        '<button class="btn btn-sm" data-action="go-tab" data-tab="people">Xem chi tiết</button></div>';
    }).join('') + '</div>') : '';

  var newFb = Object.values(S.feedback).filter(function(f){ return f.status==='new'; }).length;
  var fbCard = newFb ? '<div class="card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;"><div><div style="font-weight:700;">'+newFb+' góp ý mới chưa xem</div></div><button class="btn btn-sm" data-action="go-tab" data-tab="feedback">Xem góp ý</button></div>' : '';

  var noAvail = Object.keys(S.roles).filter(function(uid){ return !isPaused(uid) && !(S.availability[uid] && (S.availability[uid].slots||[]).length); });
  var noAvailCard = noAvail.length ? ('<div class="card"><div class="section-title">TNV chưa đăng ký lịch rảnh ('+noAvail.length+')</div>' +
    '<div class="hint" style="margin-top:0;">Lịch rảnh là đăng ký cố định một lần, không cần cập nhật lại hàng tuần — nhưng những TNV dưới đây chưa đăng ký lần nào nên sẽ không được xếp lịch tự động.</div>' +
    noAvail.map(function(uid){
      return '<div class="class-row"><div class="class-main"><span class="name">'+escapeHtml(profileName(uid))+'</span></div></div>';
    }).join('') +
  '</div>') : '';

  return head + stat + sheetWarnCard + pendingCard + flaggedCard + noAvailCard + usCard + reqCard + fbCard;
}
