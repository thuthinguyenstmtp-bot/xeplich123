'use strict';
/* ============================== Trang Điểm danh (thống nhất theo học sinh: điểm danh TNV/HS, lịch sử, nhật ký, nhật ký buổi học) ============================== */

function dowFromDate(dateStr){ return new Date(dateStr+'T00:00:00').getDay(); }
async function saveCellFields(studentId, date, fields){
  var ws = mondayOf(date);
  var dow = dowFromDate(date);
  var key = studentId+'__'+ws;
  var cur = S.studentWeekSchedule[key] || {studentId:studentId, weekStart:ws, days:{}};
  var days = Object.assign({}, cur.days);
  var d = Object.assign({subject:'', tnvUid:'', tnvStatus:'', tnvReason:'', studentStatus:'', note:''}, days[dow], fields);
  days[dow] = d;
  try{ await S.db.doc('studentWeekSchedule/'+key).set({studentId:studentId, weekStart:ws, days:days, updatedAt:Date.now()}); }
  catch(e){ toast('Không thể lưu.'); }
}
async function setSessionTnvStatus(studentId, date, status, reason){
  await saveCellFields(studentId, date, {tnvStatus:status, tnvReason: status==='absent'?(reason||''):'', tnvCheckedInAt: status==='present'?Date.now():null});
}
async function setSessionTnvReason(studentId, date, reason){
  await saveCellFields(studentId, date, {tnvReason:reason});
}
async function setSessionStudentStatus(studentId, date, status){
  await saveCellFields(studentId, date, {studentStatus:status});
}
async function setSessionNote(studentId, date, note){
  await saveCellFields(studentId, date, {note:note, noteUpdatedAt:Date.now()});
  toast('Đã lưu nhật ký buổi học.');
}
function isCheckinWindowOpen(date){
  var diffDays = daysBetween(date, todayStr());
  return diffDays >= 0 && diffDays <= 2;
}
function daysBetween(fromDateStr, toDateStr){
  var d1 = new Date(fromDateStr+'T00:00:00');
  var d2 = new Date(toDateStr+'T00:00:00');
  return Math.round((d2-d1)/86400000);
}
function sessionsForDate(date){
  var ws = mondayOf(date);
  var dow = dowFromDate(date);
  var mgr = canManage();
  var out = [];
  Object.keys(S.students).forEach(function(sid){
    var st = S.students[sid];
    if(st.active===false) return;
    var key = sid+'__'+ws;
    var sched = S.studentWeekSchedule[key] || {days:{}};
    var cell = sched.days[dow];
    if(!cell || (!cell.subject && !cell.tnvUid)) return;
    if(!mgr && cell.tnvUid!==S.uid) return;
    out.push({sid:sid, name:st.name, grade:st.grade||'', location:st.location||'', subject:cell.subject||'', tnvUid:cell.tnvUid||'', tnvStatus:cell.tnvStatus||'', tnvReason:cell.tnvReason||'', studentStatus:cell.studentStatus||'', note:cell.note||''});
  });
  out.sort(function(a,b){ return (a.grade||'').localeCompare(b.grade||'','vi',{numeric:true}) || a.name.localeCompare(b.name); });
  return out;
}
function renderAttendance(){
  var mgr = canManage();
  var head = '<div class="page-head"><h2>Điểm danh</h2><div class="sub">'+(mgr?'Điểm danh cho tất cả buổi học trong ngày đã chọn, kèm nhật ký buổi học và điểm danh học sinh.':'Bấm điểm danh cho buổi dạy của bạn — có hiệu lực trong vòng 2 ngày kể từ ngày buổi học diễn ra.')+'</div></div>';

  var dateBar = '<div class="card" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
    '<div class="field" style="margin:0;"><label>Ngày</label><input type="date" id="attDate" value="'+S.attendanceDate+'"></div>' +
  '</div>';

  var dow = dowFromDate(S.attendanceDate);
  var sessions = sessionsForDate(S.attendanceDate);

  var body;
  if(!sessions.length){
    body = '<div class="card"><div class="empty"><div class="big">Không có buổi nào</div>Không có học sinh nào được xếp lịch vào '+dayLabel(dow).toLowerCase()+' ('+fmtDateVN(S.attendanceDate)+').</div></div>';
  }else{
    body = '<div class="card">' + sessions.map(function(s){
      var isMe = s.tnvUid===S.uid;
      var canSelfCheckin = isMe && !mgr;
      var noteKey = s.sid+'__'+S.attendanceDate;
      var noteExpanded = !!S.expandedNotes[noteKey];

      var statusChip = '<span class="status-pill '+(s.tnvStatus||'pending')+'">'+(s.tnvStatus==='present'?'Có mặt':s.tnvStatus==='absent'?'Vắng':'Chưa điểm danh')+'</span>';
      var reasonHtml = '';
      if(s.tnvStatus==='absent'){
        if(mgr){
          reasonHtml = '<select data-action="sess-tnv-reason" data-sid="'+s.sid+'" style="font-size:12px;padding:3px 6px;">' +
            Object.keys(REASON_LABEL).map(function(k){ return '<option value="'+k+'" '+(s.tnvReason===k?'selected':'')+'>'+REASON_LABEL[k]+'</option>'; }).join('') + '</select>';
        }else{
          reasonHtml = '<span class="hint" style="margin:0;">'+(REASON_LABEL[s.tnvReason]||s.tnvReason||'')+'</span>';
        }
      }
      var controls = '';
      if(mgr){
        controls = '<button class="btn btn-sm" data-action="sess-tnv-status" data-sid="'+s.sid+'" data-status="present">Có mặt</button>' +
          '<button class="btn btn-sm" data-action="sess-tnv-status" data-sid="'+s.sid+'" data-status="absent">Vắng</button>';
      }else if(canSelfCheckin){
        var already = s.tnvStatus==='present';
        var open = isCheckinWindowOpen(S.attendanceDate);
        controls = already
          ? '<button class="checkin-btn" disabled title="Đã điểm danh, không thể thay đổi">Đã điểm danh ✓</button>'
          : '<button class="checkin-btn" '+(open?'':'disabled')+' data-action="sess-tnv-status" data-sid="'+s.sid+'" data-status="present">Điểm danh</button>';
      }

      var studChip = s.studentStatus ? '<span class="status-pill '+s.studentStatus+'">HS: '+(s.studentStatus==='present'?'Có mặt':'Vắng')+'</span>' : '';
      var studControls = mgr ? (
        '<button class="btn btn-sm" data-action="sess-stud-status" data-sid="'+s.sid+'" data-status="present">HS có mặt</button>' +
        '<button class="btn btn-sm" data-action="sess-stud-status" data-sid="'+s.sid+'" data-status="absent">HS vắng</button>'
      ) : '';

      var noteBlock;
      if(noteExpanded){
        noteBlock = '<div class="divider"></div>' +
          '<textarea data-note-sid="'+s.sid+'" placeholder="Nội dung đã dạy, tình hình học sinh…">'+escapeHtml(s.note)+'</textarea>' +
          '<div style="margin-top:8px;display:flex;gap:8px;"><button class="btn btn-sm btn-primary" data-action="sess-save-note" data-sid="'+s.sid+'">Lưu nhật ký</button>' +
          '<button class="btn btn-sm btn-ghost" data-action="toggle-note" data-key="'+noteKey+'">Đóng</button></div>';
      }else{
        noteBlock = '<div class="divider"></div>' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">' +
            '<div style="flex:1;min-width:180px;">' +
              (s.note ? '<div style="font-size:13px;white-space:pre-wrap;">'+escapeHtml(s.note)+'</div>' : '<div class="hint" style="margin:0;">Chưa có nhận xét nào.</div>') +
            '</div>' +
            '<button class="btn btn-sm" data-action="toggle-note" data-key="'+noteKey+'">'+(s.note?'Sửa nhận xét':'+ Nhận xét')+'</button>' +
          '</div>';
      }

      return '<div class="card" style="margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">' +
          '<div>' +
            '<div><span class="name" style="font-weight:700;font-size:14.5px;">'+escapeHtml(s.name)+'</span>'+(s.grade?' <span class="hint" style="margin:0;">· Lớp '+escapeHtml(s.grade)+'</span>':'')+'</div>' +
            '<div class="meta" style="margin-top:2px;">'+(s.subject?escapeHtml(s.subject):'Chưa rõ môn')+' · TNV: '+(s.tnvUid?escapeHtml(profileName(s.tnvUid)):'Chưa có')+(s.location?' · '+escapeHtml(s.location):'')+'</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'+statusChip+reasonHtml+controls+'</div>' +
        '</div>' +
        (studChip||studControls ? ('<div style="margin-top:8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'+studChip+studControls+'</div>') : '') +
        noteBlock +
      '</div>';
    }).join('') + '</div>';
  }

  return head + dateBar + renderHistoryCalendar() + body + renderAttendanceFeed();
}
function allActiveStudentsSorted(){
  return Object.keys(S.students).filter(function(id){ return S.students[id].active!==false; })
    .map(function(id){ return Object.assign({id:id}, S.students[id]); })
    .sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });
}
function studentProgressSessions(studentId){
  var out = [];
  Object.keys(S.studentWeekSchedule).forEach(function(key){
    var sched = S.studentWeekSchedule[key];
    if(sched.studentId!==studentId) return;
    Object.keys(sched.days||{}).forEach(function(dow){
      var cell = sched.days[dow];
      if(!cell || (!cell.subject && !cell.tnvUid && !cell.note)) return;
      var date = addDays(sched.weekStart, (+dow)-1);
      out.push({date:date, note:cell.note||'', studStatus:cell.studentStatus||null, teachers: cell.tnvUid?[cell.tnvUid]:[]});
    });
  });
  out.sort(function(a,b){ return b.date>a.date?1:(b.date<a.date?-1:0); });
  return out;
}
function renderProgressSection(){
  var students = allActiveStudentsSorted();
  if(!students.length) return '';
  var sid = S.progressStudentId && S.students[S.progressStudentId] ? S.progressStudentId : students[0].id;
  var sessions = studentProgressSessions(sid);

  var picker = '<select id="progressStudentSelect" style="margin-left:auto;">' + students.map(function(s){
    var c = S.classesById[s.classId];
    return '<option value="'+s.id+'" '+(s.id===sid?'selected':'')+'>'+escapeHtml(s.name)+(c?' — '+escapeHtml(c.name):'')+'</option>';
  }).join('') + '</select>';

  var items = sessions.length ? sessions.map(function(s){
    var statusLabel = s.studStatus==='present'?'Có mặt':s.studStatus==='absent'?'Vắng':'Chưa điểm danh';
    var statusClass = s.studStatus==='present'?'sage':s.studStatus==='absent'?'coral':'';
    var teacherNames = s.teachers.map(function(uid){ return escapeHtml(profileName(uid)); }).join(', ');
    return '<div class="class-row" style="align-items:flex-start;">' +
      '<div class="class-time">'+fmtDateVN(s.date)+'</div>' +
      '<div class="class-main">' +
        (s.note ? '<div style="font-size:13.5px;white-space:pre-wrap;">'+escapeHtml(s.note)+'</div>' : '<div class="hint" style="margin:0;">Chưa có nhật ký nội dung buổi học.</div>') +
        (teacherNames ? '<div class="meta" style="margin-top:4px;">TNV dạy hôm đó: '+teacherNames+'</div>' : '') +
      '</div>' +
      (statusClass ? '<span class="chip '+statusClass+'">'+statusLabel+'</span>' : '') +
    '</div>';
  }).join('') : '<div class="empty">Chưa có buổi học nào được ghi nhận cho học sinh này.</div>';

  return '<div class="card">' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">' +
      '<div class="section-title" style="margin:0;">Tiến độ học tập của học sinh</div>' + picker +
    '</div>' +
    '<div class="hint" style="margin-top:0;margin-bottom:10px;">Xem lại học sinh đã học tới bài nào — kể cả buổi đó do TNV khác dạy, giúp bàn giao dễ dàng khi đổi người phụ trách.</div>' +
    items +
  '</div>';
}
function feedSessions(ignoreFilter){
  var mgr = canManage();
  var arr = [];
  Object.keys(S.studentWeekSchedule).forEach(function(key){
    var sched = S.studentWeekSchedule[key];
    var sid = sched.studentId;
    if(!S.students[sid]) return;
    Object.keys(sched.days||{}).forEach(function(dow){
      var cell = sched.days[dow];
      if(!cell || (!cell.subject && !cell.tnvUid && !cell.note)) return;
      if(!mgr && cell.tnvUid!==S.uid) return;
      if(!ignoreFilter && S.feedStudentFilter && sid!==S.feedStudentFilter) return;
      var date = addDays(sched.weekStart, (+dow)-1);
      arr.push({sid:sid, date:date, subject:cell.subject||'', tnvUid:cell.tnvUid||'', tnvStatus:cell.tnvStatus||'', studentStatus:cell.studentStatus||'', note:cell.note||''});
    });
  });
  arr.sort(function(a,b){ return b.date===a.date ? 0 : (b.date>a.date?1:-1); });
  return arr;
}
function renderAttendanceFeed(){
  var sessions = feedSessions();
  var allCount = feedSessions(true).length;

  var studsInFeed = {};
  feedSessions(true).forEach(function(s){ if(S.students[s.sid]) studsInFeed[s.sid] = S.students[s.sid].name; });

  var headCard = '<div class="card" style="margin-top:26px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
      '<div>' +
        '<div style="font-family:\'Fraunces\',serif;font-size:17px;font-weight:600;">Nhật ký buổi học đã dạy</div>' +
        '<div class="hint" style="margin-top:2px;">Tổng cộng <strong style="color:var(--ink);">'+allCount+' buổi</strong>'+(S.feedStudentFilter?(' · đang lọc: '+sessions.length+' buổi'):'')+'</div>' +
      '</div>' +
      '<select id="feedStudentFilter" style="font-size:12.5px;padding:5px 7px;">' +
        '<option value="" '+(!S.feedStudentFilter?'selected':'')+'>Tất cả học sinh</option>' +
        Object.keys(studsInFeed).sort(function(a,b){ return studsInFeed[a].localeCompare(studsInFeed[b]); }).map(function(sid){ return '<option value="'+sid+'" '+(S.feedStudentFilter===sid?'selected':'')+'>'+escapeHtml(studsInFeed[sid])+'</option>'; }).join('') +
      '</select>' +
    '</div>' +
  '</div>';

  if(!sessions.length){
    return headCard + '<div class="card"><div class="empty">Chưa có buổi nào được điểm danh hoặc ghi chú.</div></div>';
  }

  var rows = sessions.map(function(s){
    var st = S.students[s.sid];
    var tnvBit = !s.tnvUid ? 'Chưa có TNV' :
      (s.tnvStatus==='present' ? ('Có mặt: '+escapeHtml(profileName(s.tnvUid))) :
       s.tnvStatus==='absent' ? ('Vắng: '+escapeHtml(profileName(s.tnvUid))) :
       ('TNV: '+escapeHtml(profileName(s.tnvUid))+' (chưa điểm danh)'));
    var studBit = s.studentStatus ? ('HS '+(s.studentStatus==='present'?'có mặt':'vắng')) : '';

    return '<div class="class-row" style="align-items:flex-start;">' +
      '<div class="class-time">'+fmtDateVN(s.date)+'</div>' +
      '<div class="class-main">' +
        '<div class="name" style="font-size:13.5px;">'+escapeHtml(st?st.name:'—')+(s.subject?' · '+escapeHtml(s.subject):'')+'</div>' +
        '<div class="meta">'+tnvBit+(studBit?(' · '+studBit):'')+'</div>' +
        (s.note ? '<div style="font-size:12.5px;margin-top:3px;white-space:pre-wrap;">'+escapeHtml(s.note)+'</div>' : '<div class="hint" style="margin:2px 0 0;">Chưa có nhận xét.</div>') +
      '</div>' +
    '</div>';
  }).join('');

  return headCard + '<div class="card">'+rows+'</div>';
}
function presentDaysSet(uid){
  var set = {};
  Object.keys(S.studentWeekSchedule).forEach(function(key){
    var sched = S.studentWeekSchedule[key];
    Object.keys(sched.days||{}).forEach(function(dow){
      var cell = sched.days[dow];
      if(cell && cell.tnvUid===uid && cell.tnvStatus==='present'){
        var date = addDays(sched.weekStart, (+dow)-1);
        set[date] = true;
      }
    });
  });
  return set;
}
function currentMonthStr(){ var d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1); }
function shiftMonth(monthStr, delta){
  var parts = monthStr.split('-'); var y=+parts[0], m=+parts[1];
  m += delta;
  while(m<1){ m+=12; y--; }
  while(m>12){ m-=12; y++; }
  return y+'-'+pad(m);
}
function monthLabelVN(monthStr){
  var parts = monthStr.split('-');
  return 'Tháng '+(+parts[1])+'/'+parts[0];
}
function renderHistoryCalendar(){
  var mgr = canManage();
  var uid = S.historyUid || S.uid;
  var monthStr = S.historyMonth || currentMonthStr();
  var presentSet = presentDaysSet(uid);

  var parts = monthStr.split('-'); var y=+parts[0], m=+parts[1];
  var firstDow = new Date(y, m-1, 1).getDay();
  var leading = firstDow===0 ? 6 : firstDow-1;
  var daysInMonth = new Date(y, m, 0).getDate();

  var totalCount = 0;
  Object.keys(presentSet).forEach(function(d){ if(d.indexOf(monthStr)===0) totalCount++; });

  var cells = '';
  DAYS.forEach(function(d){ cells += '<div class="cal-head">'+d.short+'</div>'; });
  for(var i=0;i<leading;i++) cells += '<div class="cal-cell empty"></div>';
  for(var day=1; day<=daysInMonth; day++){
    var dateStr = monthStr+'-'+pad(day);
    var present = !!presentSet[dateStr];
    var isToday = dateStr===todayStr();
    cells += '<div class="cal-cell'+(present?' present':'')+(isToday?' today':'')+'">'+day+'</div>';
  }

  var picker = mgr ? ('<select id="histUidSelect" style="margin-left:auto;">' +
    Object.keys(S.roles).sort(function(a,b){return profileName(a).localeCompare(profileName(b));}).map(function(id){
      return '<option value="'+id+'" '+(id===uid?'selected':'')+'>'+escapeHtml(profileName(id))+(id===S.uid?' (bạn)':'')+'</option>';
    }).join('') + '</select>') : '';

  return '<div class="card">' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">' +
      '<div class="section-title" style="margin:0;">Lịch sử dạy'+(mgr?'':' của tôi')+'</div>' + picker +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">' +
      '<button class="btn btn-sm" data-action="hist-prev">‹ Tháng trước</button>' +
      '<div style="font-weight:700;flex:1;text-align:center;">'+monthLabelVN(monthStr)+'</div>' +
      '<button class="btn btn-sm" data-action="hist-next">Tháng sau ›</button>' +
    '</div>' +
    '<div class="cal-grid">'+cells+'</div>' +
    '<div class="hint" style="text-align:center;">Tổng cộng <strong style="color:var(--ink);">'+totalCount+' ngày</strong> đã đi dạy trong '+monthLabelVN(monthStr).toLowerCase()+'.</div>' +
  '</div>';
}

function bindAttendanceEvents(){
  // attendance
  var attDate = document.getElementById('attDate');
  if(attDate) attDate.addEventListener('change', function(){ S.attendanceDate = attDate.value || todayStr(); render(); });
  document.querySelectorAll('[data-action="sess-tnv-status"]').forEach(function(el){ el.addEventListener('click', function(){ setSessionTnvStatus(el.getAttribute('data-sid'), S.attendanceDate, el.getAttribute('data-status')); }); });
  document.querySelectorAll('[data-action="sess-tnv-reason"]').forEach(function(el){ el.addEventListener('change', function(){ setSessionTnvReason(el.getAttribute('data-sid'), S.attendanceDate, el.value); }); });
  document.querySelectorAll('[data-action="sess-save-note"]').forEach(function(el){
    el.addEventListener('click', function(){
      var sid = el.getAttribute('data-sid');
      var ta = document.querySelector('textarea[data-note-sid="'+sid+'"]');
      setSessionNote(sid, S.attendanceDate, ta ? ta.value : '');
      S.expandedNotes[sid+'__'+S.attendanceDate] = false;
    });
  });
  document.querySelectorAll('[data-action="toggle-note"]').forEach(function(el){
    el.addEventListener('click', function(){
      var k = el.getAttribute('data-key');
      S.expandedNotes[k] = !S.expandedNotes[k];
      render();
    });
  });
  document.querySelectorAll('[data-action="sess-stud-status"]').forEach(function(el){
    el.addEventListener('click', function(){ setSessionStudentStatus(el.getAttribute('data-sid'), S.attendanceDate, el.getAttribute('data-status')); });
  });
  var histPrev = document.querySelector('[data-action="hist-prev"]');
  if(histPrev) histPrev.addEventListener('click', function(){ S.historyMonth = shiftMonth(S.historyMonth||currentMonthStr(), -1); render(); });
  var histNext = document.querySelector('[data-action="hist-next"]');
  if(histNext) histNext.addEventListener('click', function(){ S.historyMonth = shiftMonth(S.historyMonth||currentMonthStr(), 1); render(); });
  var histUidSelect = document.getElementById('histUidSelect');
  if(histUidSelect) histUidSelect.addEventListener('change', function(){ S.historyUid = histUidSelect.value; render(); });
  var progressSelect = document.getElementById('progressStudentSelect');
  if(progressSelect) progressSelect.addEventListener('change', function(){ S.progressStudentId = progressSelect.value; render(); });
  var feedStudentFilterEl = document.getElementById('feedStudentFilter');
  if(feedStudentFilterEl) feedStudentFilterEl.addEventListener('change', function(){ S.feedStudentFilter = feedStudentFilterEl.value; render(); });

}
