'use strict';
/* ============================== Trang Lịch của tôi ============================== */

function renderMySchedule(){
  var mine = myAssignedClasses();
  var byDay = {};
  mine.forEach(function(c){ (byDay[c.dayOfWeek]=byDay[c.dayOfWeek]||[]).push(c); });

  var head = '<div class="page-head"><h2>Lịch của tôi</h2><div class="sub">Lịch dạy hằng tuần bạn được xếp. Lịch lặp lại theo thứ trong tuần cho đến khi có thay đổi.</div></div>';

  if(!mine.length){
    return head + '<div class="card"><div class="empty"><div class="big">Chưa có lịch dạy nào</div>Hãy đăng ký lịch rảnh, ban điều phối sẽ xếp lịch cho bạn.</div></div>';
  }

  var body = '<div class="card">';
  DAYS.forEach(function(d){
    var list = (byDay[d.v]||[]).slice().sort(function(a,b){return (a.start||'').localeCompare(b.start||'');});
    if(!list.length) return;
    body += '<div class="day-band"><span class="lbl">'+d.label+'</span><span class="rule"></span></div>';
    list.forEach(function(c){
      var today = new Date().getDay()===c.dayOfWeek;
      body += '<div class="class-row">' +
        '<div class="class-time">'+c.start+'–'+c.end+'</div>' +
        '<div class="class-main"><div class="name">'+escapeHtml(c.name)+(c.subject?' · '+escapeHtml(c.subject):'')+'</div>' +
        '<div class="meta">'+(c.location?escapeHtml(c.location):'Chưa rõ địa điểm')+'</div></div>' +
        '<div style="display:flex;gap:6px;">' +
        (today ? '<button class="btn btn-sm" data-action="go-tab" data-tab="attendance">Điểm danh hôm nay</button>' : '') +
        '<button class="btn btn-sm btn-ghost" data-action="quick-leave" data-class="'+c.id+'">Xin nghỉ buổi này</button>' +
        '</div>' +
      '</div>';
    });
  });
  body += '</div>';
  return head + body;
}
