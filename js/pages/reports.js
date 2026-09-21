'use strict';
/* ============================== Trang Báo cáo ============================== */

function renderReports(){
  var head = '<div class="page-head"><h2>Báo cáo</h2><div class="sub">Thống kê điểm danh và xuất dữ liệu ra file CSV (mở được bằng Excel).</div></div>';

  var fromV = S.reportFrom || addDays(todayStr(), -29);
  var toV = S.reportTo || todayStr();

  var rangeCard = '<div class="card"><div class="row">' +
    '<div class="field"><label>Từ ngày</label><input type="date" id="repFrom" value="'+fromV+'"></div>' +
    '<div class="field"><label>Đến ngày</label><input type="date" id="repTo" value="'+toV+'"></div>' +
  '</div>' +
  '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
    '<button class="btn btn-primary btn-sm" data-action="export-attendance">Xuất CSV điểm danh</button>' +
    '<button class="btn btn-sm" data-action="export-schedule">Xuất CSV thời khoá biểu</button>' +
  '</div></div>';

  var stats = attendanceStatsInRange(fromV, toV);
  var ids = Object.keys(S.roles).sort(function(a,b){ return profileName(a).localeCompare(profileName(b)); });
  var rows = ids.map(function(uid){
    var s = stats[uid] || {present:0, absent:0};
    var total = s.present+s.absent;
    var rate = total>0 ? Math.round(100*s.present/total) : null;
    return '<tr><td>'+escapeHtml(profileName(uid))+'</td><td>'+s.present+'</td><td>'+s.absent+'</td><td>'+(rate==null?'—':rate+'%')+'</td></tr>';
  }).join('');

  var tableCard = '<div class="card"><div class="section-title">Tỷ lệ điểm danh theo TNV (trong khoảng đã chọn)</div>' +
    '<table><thead><tr><th>TNV</th><th>Có mặt</th><th>Vắng</th><th>Tỷ lệ có mặt</th></tr></thead><tbody>'+(rows||'<tr><td colspan="4" style="color:var(--ink-soft);">Chưa có dữ liệu điểm danh.</td></tr>')+'</tbody></table></div>';

  return head + rangeCard + tableCard;
}

function bindReportsEvents(){
  // reports
  var repFrom = document.getElementById('repFrom'); var repTo = document.getElementById('repTo');
  if(repFrom) repFrom.addEventListener('change', function(){ S.reportFrom = repFrom.value; render(); });
  if(repTo) repTo.addEventListener('change', function(){ S.reportTo = repTo.value; render(); });
  var expBtn = document.querySelector('[data-action="export-attendance"]');
  if(expBtn) expBtn.addEventListener('click', function(){
    var fromV = S.reportFrom || addDays(todayStr(), -29), toV = S.reportTo || todayStr();
    var rows = [];
    Object.keys(S.studentWeekSchedule).forEach(function(key){
      var sched = S.studentWeekSchedule[key];
      var st = S.students[sched.studentId];
      Object.keys(sched.days||{}).forEach(function(dow){
        var cell = sched.days[dow];
        if(!cell || !cell.tnvUid) return;
        var date = addDays(sched.weekStart, (+dow)-1);
        if(date<fromV || date>toV) return;
        rows.push([date, st?st.name:sched.studentId, cell.subject||'', profileName(cell.tnvUid), cell.tnvStatus==='present'?'Có mặt':cell.tnvStatus==='absent'?'Vắng':'', cell.tnvStatus==='absent'?(REASON_LABEL[cell.tnvReason]||cell.tnvReason||''):'']);
      });
    });
    rows.sort(function(x,y){ return x[0].localeCompare(y[0]); });
    downloadCSV('diem-danh_'+fromV+'_den_'+toV+'.csv', ['Ngày','Học sinh','Môn','TNV','Trạng thái','Lý do'], rows);
  });
  var expSched = document.querySelector('[data-action="export-schedule"]');
  if(expSched) expSched.addEventListener('click', function(){
    var rows = [];
    var ws = S.scheduleWeekStart || mondayOf(todayStr());
    Object.keys(S.students).forEach(function(sid){
      var st = S.students[sid];
      if(st.active===false) return;
      var key = sid+'__'+ws;
      var sched = S.studentWeekSchedule[key] || {days:{}};
      [1,2,3,4,5].forEach(function(dow){
        var cell = sched.days[dow];
        if(!cell || (!cell.subject && !cell.tnvUid)) return;
        rows.push([dayLabel(dow), st.name, st.grade||'', cell.subject||'', cell.tnvUid?profileName(cell.tnvUid):'', st.location||'']);
      });
    });
    downloadCSV('thoi-khoa-bieu_tuan_'+ws+'.csv', ['Thứ','Học sinh','Lớp','Môn','TNV','Nơi dạy'], rows);
  });

}
