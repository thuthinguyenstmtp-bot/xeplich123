'use strict';
/* ============================== Trang Xếp lịch tự động (bảng xếp lịch theo học sinh, dạng Excel) ============================== */

function studentIdsTaughtBy(uid){
  var out = {};
  Object.values(S.studentWeekSchedule).forEach(function(sched){
    Object.values(sched.days||{}).forEach(function(cell){
      if(cell && cell.tnvUid===uid && sched.studentId) out[sched.studentId]=true;
    });
  });
  return Object.keys(out);
}
function isAvailableOnDay(uid, dow){
  var slots = (S.availability[uid] && S.availability[uid].slots) || [];
  return slots.some(function(s){ return s.dayOfWeek===dow; });
}
function cellsNeedingTnv(weekStart){
  var out = [];
  Object.keys(S.students).forEach(function(sid){
    var st = S.students[sid];
    if(st.active===false) return;
    var key = sid+'__'+weekStart;
    var sched = S.studentWeekSchedule[key] || {days:{}};
    [1,2,3,4,5].forEach(function(dow){
      var cell = sched.days[dow] || {};
      if(cell.subject && !cell.tnvUid) out.push({sid:sid, dow:dow});
    });
  });
  return out;
}
function studentsWithNoScheduleThisWeek(weekStart){
  var out = [];
  Object.keys(S.students).forEach(function(sid){
    var st = S.students[sid];
    if(st.active===false) return;
    var key = sid+'__'+weekStart;
    var sched = S.studentWeekSchedule[key] || {days:{}};
    var hasAny = [1,2,3,4,5].some(function(dow){ var c = sched.days[dow]; return c && (c.subject || c.tnvUid); });
    if(!hasAny) out.push(sid);
  });
  return out;
}
async function copyWeekToNextWeek(){
  var weekStart = S.scheduleWeekStart || mondayOf(todayStr());
  var nextWeek = addDays(weekStart, 7);
  var keys = Object.keys(S.studentWeekSchedule).filter(function(k){ return S.studentWeekSchedule[k].weekStart===weekStart; });
  if(!keys.length){ toast('Tuần này chưa có lịch để sao chép.'); return; }
  if(!confirm('Sao chép lịch tuần '+fmtDateVN(weekStart)+' sang tuần '+fmtDateVN(nextWeek)+'? Dữ liệu đã có ở tuần sau (nếu có) sẽ bị ghi đè.')) return;
  for(var i=0;i<keys.length;i++){
    var sched = S.studentWeekSchedule[keys[i]];
    var sid = sched.studentId;
    var newKey = sid+'__'+nextWeek;
    try{ await S.db.doc('studentWeekSchedule/'+newKey).set({studentId:sid, weekStart:nextWeek, days:sched.days, updatedAt:Date.now(), copiedFrom:weekStart}); }
    catch(e){}
  }
  toast('Đã sao chép lịch sang tuần sau.');
}
async function autoFillWeekTnv(){
  var weekStart = S.scheduleWeekStart || mondayOf(todayStr());
  var weekdays = [1,2,3,4,5];
  var volunteers = Object.keys(S.roles).filter(function(uid){ return !isPaused(uid); });
  var assignedCount = {};

  var cellsToFill = [];
  var localDaysBySid = {};
  Object.keys(S.students).forEach(function(sid){
    var st = S.students[sid];
    if(st.active===false) return;
    var key = sid+'__'+weekStart;
    var sched = S.studentWeekSchedule[key] || {days:{}};
    localDaysBySid[sid] = Object.assign({}, sched.days);
  });
  cellsNeedingTnv(weekStart).forEach(function(c){ cellsToFill.push(c); });
  if(!cellsToFill.length){ toast('Không có ô nào cần gợi ý TNV (hãy điền Môn học trước).'); return; }

  var touchedSids = {};
  for(var i=0;i<cellsToFill.length;i++){
    var cellRef = cellsToFill[i];
    var eligible = volunteers.filter(function(uid){ return isAvailableOnDay(uid, cellRef.dow); });
    var pool = eligible.length ? eligible : volunteers;
    pool = pool.slice().sort(function(a,b){
      var ca = assignedCount[a]||0, cb = assignedCount[b]||0;
      if(ca!==cb) return ca-cb;
      return presentCountAll(b)-presentCountAll(a);
    });
    if(!pool.length) continue;
    var uid = pool[0];
    assignedCount[uid] = (assignedCount[uid]||0)+1;
    var d = Object.assign({subject:'', tnvUid:''}, localDaysBySid[cellRef.sid][cellRef.dow]);
    d.tnvUid = uid;
    localDaysBySid[cellRef.sid][cellRef.dow] = d;
    touchedSids[cellRef.sid] = true;
  }

  var sidsToSave = Object.keys(touchedSids);
  for(var j=0;j<sidsToSave.length;j++){
    var sid2 = sidsToSave[j];
    var key2 = sid2+'__'+weekStart;
    try{ await S.db.doc('studentWeekSchedule/'+key2).set({studentId:sid2, weekStart:weekStart, days:localDaysBySid[sid2], updatedAt:Date.now()}); }
    catch(e){}
  }
  toast('Đã gợi ý TNV cho '+cellsToFill.length+' ô.');
}
function renderScheduleSheet(){
  S.scheduleWeekStart = S.scheduleWeekStart || mondayOf(todayStr());
  var weekStart = S.scheduleWeekStart;
  var weekEnd = addDays(weekStart, 4);
  var weekdays = DAYS.filter(function(d){ return d.v>=1 && d.v<=5; }); // Mon–Fri, matching the template

  var weekBar = '<div class="card" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
    '<button class="btn btn-sm" data-action="sheet-week-prev">‹ Tuần trước</button>' +
    '<div style="font-weight:700;">Tuần '+fmtDateVN(weekStart)+' – '+fmtDateVN(weekEnd)+'</div>' +
    '<button class="btn btn-sm" data-action="sheet-week-next">Tuần sau ›</button>' +
    '<button class="btn btn-sm btn-ghost" data-action="sheet-week-today">Tuần này</button>' +
    '<button class="btn btn-sm btn-ghost" style="margin-left:auto;" data-action="sheet-copy-next">Sao chép sang tuần sau</button>' +
    '<button class="btn btn-primary btn-sm" data-action="sheet-autofill-tnv">Xếp tự động TNV (còn trống)</button>' +
  '</div>';

  var emptyCells = cellsNeedingTnv(weekStart);
  var noSchedule = studentsWithNoScheduleThisWeek(weekStart);
  var warnBar = '';
  if(emptyCells.length || noSchedule.length){
    warnBar = '<div class="banner warn"><span>' +
      (emptyCells.length ? emptyCells.length+' ô đã có môn nhưng chưa có TNV' : '') +
      (emptyCells.length && noSchedule.length ? ' · ' : '') +
      (noSchedule.length ? noSchedule.length+' học sinh chưa có lịch nào tuần này' : '') +
      '</span></div>';
  }

  var volunteers = Object.keys(S.roles).sort(function(a,b){ return profileName(a).localeCompare(profileName(b)); });

  // group active students by grade
  var byGrade = {};
  Object.keys(S.students).forEach(function(id){
    var st = S.students[id];
    if(st.active===false) return;
    var g = st.grade || 'Chưa phân lớp';
    (byGrade[g]=byGrade[g]||[]).push(id);
  });
  var gradeKeys = Object.keys(byGrade).sort(function(a,b){
    var na=parseInt(a,10), nb=parseInt(b,10);
    if(!isNaN(na) && !isNaN(nb)) return na-nb;
    if(!isNaN(na)) return -1; if(!isNaN(nb)) return 1;
    return a.localeCompare(b);
  });
  gradeKeys.forEach(function(g){ byGrade[g].sort(function(a,b){ return (S.students[a].name||'').localeCompare(S.students[b].name||''); }); });

  if(!gradeKeys.length){
    return weekBar + '<div class="card"><div class="empty">Chưa có học sinh nào. Thêm học sinh (kèm Lớp/khối) ở tab Học sinh trước.</div></div>';
  }

  // header rows — show the actual calendar date for each weekday of the selected week
  var thead = '<thead><tr>' +
    '<th rowspan="2">Lớp</th><th rowspan="2">Học sinh</th>' +
    weekdays.map(function(d){
      var dateForDay = addDays(weekStart, d.v-1);
      return '<th colspan="2">'+d.label+'<br><span style="font-weight:400;color:var(--ink-soft);">'+fmtDateVN(dateForDay)+'</span></th>';
    }).join('') +
    '<th rowspan="2">Nơi dạy</th>' +
  '</tr><tr>' +
    weekdays.map(function(){ return '<th>Môn</th><th>TNV</th>'; }).join('') +
  '</tr></thead>';

  var rows = '';
  gradeKeys.forEach(function(g){
    var studs = byGrade[g];
    studs.forEach(function(sid, i){
      var st = S.students[sid];
      var key = sid+'__'+weekStart;
      var sched = S.studentWeekSchedule[key] || {days:{}};
      rows += '<tr>';
      if(i===0) rows += '<td class="sheet-grade-cell" rowspan="'+studs.length+'">'+escapeHtml(g)+'</td>';
      rows += '<td>'+escapeHtml(st.name)+'</td>';
      weekdays.forEach(function(d){
        var cell = sched.days[d.v] || {};
        var color = subjectColor(cell.subject);
        rows += '<td style="'+(color?('background:'+color+'26;'):'')+'">' +
          '<input type="text" class="sheet-select" list="subjList2" data-action="sheet-subject" data-student="'+sid+'" data-dow="'+d.v+'" value="'+escapeHtml(cell.subject||'')+'" placeholder="—">' +
        '</td>';
        var avail = volunteers.filter(function(uid){ return isAvailableOnDay(uid, d.v); }).sort(function(a,b){ return presentCountAll(b)-presentCountAll(a); });
        var busy = volunteers.filter(function(uid){ return avail.indexOf(uid)===-1; });
        rows += '<td>' +
          '<select class="sheet-select" data-action="sheet-tnv" data-student="'+sid+'" data-dow="'+d.v+'">' +
            '<option value="">—</option>' +
            (avail.length ? '<optgroup label="Gợi ý (rảnh thứ này)">'+avail.map(function(uid,i2){ return '<option value="'+uid+'" '+(cell.tnvUid===uid?'selected':'')+'>'+(i2===0?'★ ':'')+escapeHtml(profileName(uid))+' ('+presentCountAll(uid)+' buổi)</option>'; }).join('')+'</optgroup>' : '') +
            (busy.length ? '<optgroup label="Khác">'+busy.map(function(uid){ return '<option value="'+uid+'" '+(cell.tnvUid===uid?'selected':'')+'>'+escapeHtml(profileName(uid))+'</option>'; }).join('')+'</optgroup>' : '') +
          '</select>' +
        '</td>';
      });
      rows += '<td><select class="sheet-select" data-action="edit-student-location" data-id="'+sid+'">' +
        '<option value="" '+(!st.location?'selected':'')+'>—</option>' +
        '<option '+(st.location==='Nhà Nam'?'selected':'')+'>Nhà Nam</option>' +
        '<option '+(st.location==='Nhà Nữ'?'selected':'')+'>Nhà Nữ</option>' +
      '</select></td>';
      rows += '</tr>';
    });
  });

  var datalist = '<datalist id="subjList2"><option value="Toán"><option value="Văn"><option value="Anh"><option value="Lý"><option value="Hoá"><option value="Sinh"><option value="Kỹ năng sống"><option value="Âm nhạc"><option value="Mỹ thuật"></datalist>';

  return weekBar + warnBar + datalist + '<div class="sheet-wrap"><table class="sheet-table">'+thead+'<tbody>'+rows+'</tbody></table></div>' +
    '<div class="hint">Ngày ở đầu mỗi cột là ngày thật của tuần đang xem. Danh sách TNV được sắp theo gợi ý (★ = rảnh thứ đó, dạy nhiều buổi nhất) lên đầu. Nút "Xếp tự động TNV" tự điền TNV cho các ô đã có Môn học nhưng còn trống TNV.</div>';
}
function renderAutoSchedule(){
  var head = '<div class="page-head"><h2>Xếp lịch tự động</h2><div class="sub">Bảng xếp lịch theo học sinh — chọn môn và TNV cho từng ngày, lọc theo tuần.</div></div>';
  return head + renderScheduleSheet();
}
async function setStudentDayField(studentId, weekStart, dow, field, value){
  var key = studentId+'__'+weekStart;
  var cur = S.studentWeekSchedule[key] || {studentId:studentId, weekStart:weekStart, days:{}};
  var days = Object.assign({}, cur.days);
  var d = Object.assign({subject:'', tnvUid:''}, days[dow]);
  d[field] = value;
  days[dow] = d;
  try{ await S.db.doc('studentWeekSchedule/'+key).set({studentId:studentId, weekStart:weekStart, days:days, updatedAt:Date.now()}); }
  catch(e){ toast('Không thể lưu.'); }
}
async function saveDayTime(dow, start, end){
  var updated = Object.assign({}, S.dayTimes||{});
  updated[dow] = {start:start, end:end};
  try{ await S.db.doc('settings/dayTimes').set(updated); toast('Đã lưu giờ học.'); }
  catch(e){ toast('Không thể lưu giờ học.'); }
}
async function removeFromAssignment(classId, uid){
  var a = S.assignments[classId] || {tnvIds:[]};
  var ids = (a.tnvIds||[]).filter(function(x){ return x!==uid; });
  try{ await S.db.doc('assignments/'+classId).set({classId:classId, tnvIds:ids, generatedAt:(a.generatedAt||Date.now())}); }
  catch(e){ toast('Không thể cập nhật.'); }
}
async function addToAssignment(classId, uid){
  var a = S.assignments[classId] || {tnvIds:[]};
  if((a.tnvIds||[]).indexOf(uid)!==-1) return;
  var ids = (a.tnvIds||[]).concat([uid]);
  try{ await S.db.doc('assignments/'+classId).set({classId:classId, tnvIds:ids, generatedAt:(a.generatedAt||Date.now())}); }
  catch(e){ toast('Không thể cập nhật.'); }
}
async function runAutoSchedule(){
  if(S.scheduling) return;
  S.scheduling = true; render();
  try{
    var classes = S.classes.slice();
    var elig = {};
    classes.forEach(function(c){ elig[c.id] = eligibleForClass(c); });
    classes.sort(function(a,b){ return elig[a.id].length - elig[b.id].length; });

    var assignedCount = {}, usedRanges = {}, result = {};
    classes.forEach(function(c){
      var need = Math.max(1, c.needed||1);
      var candidates = elig[c.id].slice();
      candidates.sort(function(x,y){ return (assignedCount[x]||0)-(assignedCount[y]||0); });
      var picked = [];
      candidates.forEach(function(uid){
        if(picked.length>=need) return;
        var cap = (S.volunteerProfiles[uid] && S.volunteerProfiles[uid].maxClassesPerWeek) ? +S.volunteerProfiles[uid].maxClassesPerWeek : 0;
        if(cap>0 && (assignedCount[uid]||0)>=cap) return;
        var ranges = usedRanges[uid]||[];
        var conflict = ranges.some(function(r){ return r.d===c.dayOfWeek && timeOverlap(r.s,r.e,c.start,c.end); });
        if(conflict) return;
        picked.push(uid);
        assignedCount[uid] = (assignedCount[uid]||0)+1;
        usedRanges[uid] = ranges.concat([{d:c.dayOfWeek,s:c.start,e:c.end}]);
      });
      result[c.id] = picked;
    });

    for(var i=0;i<classes.length;i++){
      var c = classes[i];
      await S.db.doc('assignments/'+c.id).set({classId:c.id, tnvIds:result[c.id], generatedAt:Date.now()});
    }
    toast('Đã xếp lịch tự động cho '+classes.length+' lớp.');
  }catch(e){ toast('Có lỗi khi xếp lịch.'); }
  S.scheduling = false; render();
}

function bindAutoScheduleEvents(){
  // autoschedule
  var runBtn = document.querySelector('[data-action="run-autoschedule"]'); if(runBtn) runBtn.addEventListener('click', runAutoSchedule);
  document.querySelectorAll('[data-action="edit-subject-inline"]').forEach(function(el){
    el.addEventListener('change', function(){ updateClassSubject(el.getAttribute('data-class'), el.value); });
  });
  var sheetPrev = document.querySelector('[data-action="sheet-week-prev"]');
  if(sheetPrev) sheetPrev.addEventListener('click', function(){ S.scheduleWeekStart = addDays(S.scheduleWeekStart||mondayOf(todayStr()), -7); render(); });
  var sheetNext = document.querySelector('[data-action="sheet-week-next"]');
  if(sheetNext) sheetNext.addEventListener('click', function(){ S.scheduleWeekStart = addDays(S.scheduleWeekStart||mondayOf(todayStr()), 7); render(); });
  var sheetToday = document.querySelector('[data-action="sheet-week-today"]');
  if(sheetToday) sheetToday.addEventListener('click', function(){ S.scheduleWeekStart = mondayOf(todayStr()); render(); });
  var sheetAutofill = document.querySelector('[data-action="sheet-autofill-tnv"]');
  if(sheetAutofill) sheetAutofill.addEventListener('click', function(){ autoFillWeekTnv(); });
  var sheetCopyNext = document.querySelector('[data-action="sheet-copy-next"]');
  if(sheetCopyNext) sheetCopyNext.addEventListener('click', function(){ copyWeekToNextWeek(); });
  document.querySelectorAll('[data-action="sheet-subject"]').forEach(function(el){
    el.addEventListener('change', function(){ setStudentDayField(el.getAttribute('data-student'), S.scheduleWeekStart, el.getAttribute('data-dow'), 'subject', el.value); });
  });
  document.querySelectorAll('[data-action="sheet-tnv"]').forEach(function(el){
    el.addEventListener('change', function(){ setStudentDayField(el.getAttribute('data-student'), S.scheduleWeekStart, el.getAttribute('data-dow'), 'tnvUid', el.value); });
  });
  document.querySelectorAll('[data-action="unassign"]').forEach(function(el){ el.addEventListener('click', function(){ removeFromAssignment(el.getAttribute('data-class'), el.getAttribute('data-uid')); }); });
  document.querySelectorAll('[data-action="assign-select"]').forEach(function(el){ el.addEventListener('change', function(){ if(el.value) addToAssignment(el.getAttribute('data-class'), el.value); el.value=''; }); });
}
