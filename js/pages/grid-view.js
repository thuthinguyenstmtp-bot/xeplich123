'use strict';
/* ============================== Trang Thời khoá biểu (xem theo tuần) ============================== */

function renderGridView(){
  S.scheduleWeekStart = S.scheduleWeekStart || mondayOf(todayStr());
  var weekStart = S.scheduleWeekStart;
  var weekEnd = addDays(weekStart, 4);
  var weekdays = DAYS.filter(function(d){ return d.v>=1 && d.v<=5; });
  var today = todayStr();
  var mgr = canManage();

  var head = '<div class="page-head"><h2>Thời khoá biểu</h2><div class="sub">Xem lại lịch dạy theo tuần — dữ liệu lấy trực tiếp từ bảng xếp lịch ở tab Xếp lịch tự động.</div></div>';

  var weekBar = '<div class="card" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
    '<button class="btn btn-sm" data-action="sheet-week-prev">‹ Tuần trước</button>' +
    '<div style="font-weight:700;">Tuần '+fmtDateVN(weekStart)+' – '+fmtDateVN(weekEnd)+'</div>' +
    '<button class="btn btn-sm" data-action="sheet-week-next">Tuần sau ›</button>' +
    '<button class="btn btn-sm btn-ghost" data-action="sheet-week-today">Tuần này</button>' +
    '<button class="btn btn-sm btn-ghost" style="margin-left:auto;" data-action="grid-print">In thời khoá biểu</button>' +
  '</div>';

  var forceMineOnly = !mgr;

  var filterBar = mgr ? ('<div class="card" id="gridFilterBar" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">' +
    '<label style="display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:700;cursor:pointer;">' +
      '<input type="checkbox" id="gridFilterMine" '+(S.gridFilterMine?'checked':'')+' style="width:auto;"> Chỉ hiện buổi của tôi' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:7px;font-size:13.5px;">' +
      '<span class="hint" style="margin:0;font-weight:700;">Nơi dạy</span>' +
      '<select id="gridFilterLocation" style="font-size:12.5px;padding:4px 6px;">' +
        '<option value="" '+(!S.gridFilterLocation?'selected':'')+'>Tất cả</option>' +
        '<option '+(S.gridFilterLocation==='Nhà Nam'?'selected':'')+'>Nhà Nam</option>' +
        '<option '+(S.gridFilterLocation==='Nhà Nữ'?'selected':'')+'>Nhà Nữ</option>' +
      '</select>' +
    '</label>' +
  '</div>') : ('<div class="card" id="gridFilterBar" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">' +
    '<label style="display:flex;align-items:center;gap:7px;font-size:13.5px;">' +
      '<span class="hint" style="margin:0;font-weight:700;">Nơi dạy</span>' +
      '<select id="gridFilterLocation" style="font-size:12.5px;padding:4px 6px;">' +
        '<option value="" '+(!S.gridFilterLocation?'selected':'')+'>Tất cả</option>' +
        '<option '+(S.gridFilterLocation==='Nhà Nam'?'selected':'')+'>Nhà Nam</option>' +
        '<option '+(S.gridFilterLocation==='Nhà Nữ'?'selected':'')+'>Nhà Nữ</option>' +
      '</select>' +
    '</label>' +
  '</div>');

  var myCount = 0, totalCount = 0;
  var subjectsSeen = {};
  var grid = '<div class="grid-week" id="gridPrintArea">';
  weekdays.forEach(function(d){
    var dateForDay = addDays(weekStart, d.v-1);
    var isToday = dateForDay===today;
    var isPast = dateForDay<=today;
    var rawEntries = [];
    Object.keys(S.students).forEach(function(sid){
      var st = S.students[sid];
      if(st.active===false) return;
      var key = sid+'__'+weekStart;
      var sched = S.studentWeekSchedule[key] || {days:{}};
      var cell = sched.days[d.v] || {};
      if(!cell.subject && !cell.tnvUid) return;
      rawEntries.push({sid:sid, name:st.name, grade:st.grade||'', subject:cell.subject||'', tnvUid:cell.tnvUid||'', location:st.location||'', attended:cell.tnvStatus==='present'});
    });
    var teammates = {};
    rawEntries.forEach(function(e){ if(e.tnvUid) teammates[e.tnvUid] = true; });

    var entries = rawEntries.filter(function(e){
      if((forceMineOnly || S.gridFilterMine) && e.tnvUid!==S.uid) return false;
      if(S.gridFilterLocation && e.location!==S.gridFilterLocation) return false;
      return true;
    });
    entries.sort(function(a,b){ return (a.grade||'').localeCompare(b.grade||'', 'vi', {numeric:true}) || a.name.localeCompare(b.name); });
    totalCount += rawEntries.length;
    myCount += rawEntries.filter(function(e){ return e.tnvUid===S.uid; }).length;

    grid += '<div class="grid-day'+(isToday?' is-today':'')+'"><h4>'+d.label+'</h4><div class="grid-date">'+fmtDateVN(dateForDay)+'</div>';
    if(!entries.length){
      grid += '<div class="grid-empty">Chưa có lịch dạy</div>';
    }
    entries.forEach(function(e){
      var color = subjectColor(e.subject);
      if(e.subject) subjectsSeen[e.subject] = color || '#8a8a8a';
      var mine = e.tnvUid===S.uid;
      var teammateCount = Object.keys(teammates).filter(function(u){ return u!==e.tnvUid; }).length;
      var canTick = isPast && (mine || mgr);
      grid += '<div class="grid-block'+(mine?' mine':'')+'" style="'+(color&&!mine?('border-left-color:'+color+';'):'')+'">' +
        '<div class="t">' +
          '<button class="link-like" data-action="view-progress" data-sid="'+e.sid+'">'+escapeHtml(e.name)+'</button>' +
          (e.grade?' · Lớp '+escapeHtml(e.grade):'')+
          (mine?' <span class="chip marigold" style="margin-left:4px;">Bạn dạy</span>':'')+
        '</div>' +
        '<div class="m">'+(e.subject?escapeHtml(e.subject):'Chưa rõ môn')+' · '+(e.tnvUid?escapeHtml(profileName(e.tnvUid)):'Chưa có TNV')+(e.location?' · '+escapeHtml(e.location):'')+'</div>' +
        (mine && teammateCount>0 ? '<div class="m">+'+teammateCount+' đồng đội khác cùng dạy hôm đó</div>' : '') +
        '<div style="display:flex;align-items:center;gap:8px;margin-top:5px;flex-wrap:wrap;">' +
          (canTick ? ('<label style="display:flex;align-items:center;gap:4px;font-size:11.5px;cursor:pointer;" class="hint"><input type="checkbox" data-action="grid-tick" data-sid="'+e.sid+'" data-dow="'+d.v+'" '+(e.attended?'checked':'')+' style="width:auto;"> Đã dạy</label>') : (e.attended ? '<span class="hint" style="margin:0;">✓ Đã dạy</span>' : '')) +
          (mine ? '<button class="btn btn-sm btn-ghost" data-action="grid-quick-leave" data-sid="'+e.sid+'" data-dow="'+d.v+'" data-name="'+escapeHtml(e.name)+'">Xin nghỉ buổi này</button>' : '') +
        '</div>' +
      '</div>';
    });
    grid += '</div>';
  });
  grid += '</div>';

  var legend = Object.keys(subjectsSeen).length ? ('<div class="card" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">' +
    '<span class="hint" style="margin:0;font-weight:700;">Chú giải môn:</span>' +
    Object.keys(subjectsSeen).map(function(subj){
      return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:12.5px;"><span style="width:10px;height:10px;border-radius:3px;background:'+subjectsSeen[subj]+';display:inline-block;"></span>'+escapeHtml(subj)+'</span>';
    }).join('') +
  '</div>') : '';

  var mySummary = '<div class="card" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">' +
    '<div style="font-family:\'Fraunces\',serif;font-size:26px;font-weight:600;">'+myCount+'</div>' +
    '<div style="flex:1;min-width:160px;"><div style="font-weight:700;">buổi dạy của bạn tuần này</div><div class="hint" style="margin-top:2px;">'+(totalCount?('Cả mái ấm có '+totalCount+' buổi được xếp trong tuần.'):'Tuần này cả mái ấm chưa có buổi nào được xếp.')+'</div></div>' +
    (myCount===0 ? '<button class="btn btn-sm" data-action="go-tab" data-tab="availability">Đăng ký lịch rảnh</button>' : '<button class="btn btn-sm" data-action="go-tab" data-tab="my-schedule">Xem lịch của tôi</button>') +
  '</div>';

  var announcements = Object.keys(S.announcements).map(function(id){ return Object.assign({id:id}, S.announcements[id]); })
    .sort(function(a,b){ if(!!a.pinned!==!!b.pinned) return a.pinned?-1:1; return (b.createdAt||0)-(a.createdAt||0); }).slice(0,2);
  var announceCard = '<div class="card"><div class="section-title">Tin mới từ Bảng tin</div>' +
    (announcements.length ? announcements.map(function(a){
      return '<div class="class-row"><div class="class-main"><div class="name">'+(a.pinned?'📌 ':'')+escapeHtml(a.title)+'</div><div class="meta">'+escapeHtml((a.content||'').slice(0,90))+((a.content||'').length>90?'…':'')+'</div></div></div>';
    }).join('') : '<div class="empty">Chưa có thông báo nào.</div>') +
    '<div style="margin-top:8px;"><button class="btn btn-sm btn-ghost" data-action="go-tab" data-tab="announcements">Xem tất cả bảng tin</button></div>' +
  '</div>';

  return head + weekBar + filterBar + legend + grid + mySummary + announceCard;
}
async function markCellAttended(studentId, weekStart, dow, attended){
  var dateStr = addDays(weekStart, (+dow)-1);
  await setSessionTnvStatus(studentId, dateStr, attended?'present':'');
}
async function quickLeaveFromGrid(studentId, weekStart, dow){
  var key = studentId+'__'+weekStart;
  var cur = S.studentWeekSchedule[key] || {studentId:studentId, weekStart:weekStart, days:{}};
  var days = Object.assign({}, cur.days);
  var d = Object.assign({subject:'', tnvUid:''}, days[dow]);
  d.tnvUid = '';
  days[dow] = d;
  var st = S.students[studentId];
  var dateStr = addDays(weekStart, (+dow)-1);
  try{
    await S.db.doc('studentWeekSchedule/'+key).set({studentId:studentId, weekStart:weekStart, days:days, updatedAt:Date.now()});
    toast('Đã bỏ bạn khỏi buổi này — Điều phối viên sẽ cần xếp người thay.');
    notify(profileName(S.uid)+' xin nghỉ buổi dạy '+(st?st.name:'')+' ngày '+fmtDateVN(dateStr)+' (đã tự gỡ khỏi lịch).');
  }
  catch(e){ toast('Không thể cập nhật.'); }
}

function bindGridViewEvents(){
  var gridFilterMineEl = document.getElementById('gridFilterMine');
  if(gridFilterMineEl) gridFilterMineEl.addEventListener('change', function(){ S.gridFilterMine = gridFilterMineEl.checked; render(); });
  var gridFilterLocationEl = document.getElementById('gridFilterLocation');
  if(gridFilterLocationEl) gridFilterLocationEl.addEventListener('change', function(){ S.gridFilterLocation = gridFilterLocationEl.value; render(); });
  var gridPrintBtn = document.querySelector('[data-action="grid-print"]');
  if(gridPrintBtn) gridPrintBtn.addEventListener('click', function(){ window.print(); });
  document.querySelectorAll('[data-action="grid-tick"]').forEach(function(el){
    el.addEventListener('change', function(){ markCellAttended(el.getAttribute('data-sid'), S.scheduleWeekStart, el.getAttribute('data-dow'), el.checked); });
  });
  document.querySelectorAll('[data-action="grid-quick-leave"]').forEach(function(el){
    el.addEventListener('click', function(){
      if(confirm('Xin nghỉ buổi dạy '+el.getAttribute('data-name')+' hôm đó? Bạn sẽ được gỡ khỏi buổi này và Điều phối viên cần xếp người thay.')){
        quickLeaveFromGrid(el.getAttribute('data-sid'), S.scheduleWeekStart, el.getAttribute('data-dow'));
      }
    });
  });
}
