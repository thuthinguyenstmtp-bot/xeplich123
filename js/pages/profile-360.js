'use strict';
/* ============================== Trang Hồ sơ 360° TNV ============================== */

function renderProfile360(){
  var head = '<div class="page-head"><h2>Hồ sơ 360° TNV</h2><div class="sub">Xem gộp toàn bộ thông tin của một TNV — hồ sơ, điểm danh, thành tích, yêu cầu nghỉ, góp ý — ở một nơi.</div></div>';

  var ids = Object.keys(S.roles).sort(function(a,b){ return profileName(a).localeCompare(profileName(b)); });
  if(!ids.length) return head + '<div class="card"><div class="empty">Chưa có ai đăng ký.</div></div>';
  var uid = S.profile360Uid && S.roles[S.profile360Uid] ? S.profile360Uid : ids[0];
  var picker = '<div class="card"><div class="field" style="margin:0;"><label>Chọn TNV</label><select id="profile360Select">' +
    ids.map(function(id){ return '<option value="'+id+'" '+(id===uid?'selected':'')+'>'+escapeHtml(profileName(id))+' ('+ROLE_LABEL[roleOf(id)]+')</option>'; }).join('') +
  '</select></div></div>';

  var vp = S.volunteerProfiles[uid] || {};
  var role = roleOf(uid);
  var paused = isPaused(uid);
  var sessions = presentCountAll(uid), hours = totalHoursAll(uid), streak = currentStreak(uid), absStreak = consecutiveAbsences(uid);
  var months = monthsSince(vp.joinDate);

  var infoCard = '<div class="card">' +
    '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
      (profileAvatar(uid)?'<img src="'+profileAvatar(uid)+'" style="width:52px;height:52px;border-radius:50%;">':'') +
      '<div><div style="font-family:\'Fraunces\',serif;font-size:19px;font-weight:600;">'+escapeHtml(profileName(uid))+'</div>' +
      '<div style="display:flex;gap:6px;align-items:center;margin-top:3px;"><span class="role-badge '+role+'">'+ROLE_LABEL[role]+'</span>'+(paused?'<span class="paused-badge">Tạm nghỉ</span>':'')+'</div></div>' +
    '</div>' +
    '<div class="divider"></div>' +
    '<div class="row">' +
      '<div class="field"><label>Ngày sinh</label><div>'+(vp.dob?fmtDateVN(vp.dob):'—')+'</div></div>' +
      '<div class="field"><label>Điện thoại</label><div>'+escapeHtml(vp.phone||'—')+'</div></div>' +
      '<div class="field"><label>Trường/Nơi làm việc</label><div>'+escapeHtml(vp.school||'—')+'</div></div>' +
    '</div>' +
    '<div class="row">' +
      '<div class="field"><label>Địa chỉ</label><div>'+escapeHtml(vp.address||'—')+'</div></div>' +
      '<div class="field"><label>Liên hệ khẩn cấp</label><div>'+escapeHtml(vp.emergencyContact||'—')+'</div></div>' +
      '<div class="field"><label>Ngày tham gia</label><div>'+(vp.joinDate?fmtDateVN(vp.joinDate)+(months!=null?' ('+months+' tháng)':''):'—')+'</div></div>' +
    '</div>' +
    (vp.adminNote ? '<div class="field"><label>Ghi chú nội bộ</label><div style="white-space:pre-wrap;">'+escapeHtml(vp.adminNote)+'</div></div>' : '') +
  '</div>';

  var statCard = '<div class="stat-grid">' +
    '<div class="stat-card"><div class="num">'+sessions+'</div><div class="lbl">Buổi đã dạy</div></div>' +
    '<div class="stat-card"><div class="num">'+hours+'</div><div class="lbl">Giờ đã dạy</div></div>' +
    '<div class="stat-card"><div class="num">'+streak+'</div><div class="lbl">Chuỗi buổi liên tiếp</div></div>' +
    '<div class="stat-card"><div class="num" style="color:'+(absStreak>=2?'var(--coral)':'inherit')+';">'+absStreak+'</div><div class="lbl">Vắng liên tiếp gần đây</div></div>' +
  '</div>';

  var badges = badgesForUid(uid).filter(function(b){ return b.earned; });
  var badgeCard = '<div class="card"><div class="section-title">Huy hiệu đã đạt ('+badges.length+')</div>' +
    (badges.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap;">'+badges.map(function(b){ return '<span class="chip marigold">🏅 '+escapeHtml(b.label)+'</span>'; }).join('')+'</div>' : '<div class="empty">Chưa có huy hiệu nào.</div>') +
  '</div>';

  var myReqs = Object.keys(S.leaveRequests).map(function(id){ return Object.assign({id:id}, S.leaveRequests[id]); })
    .filter(function(r){ return r.requestedBy===uid; }).sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); }).slice(0,8);
  var reqCard = '<div class="card"><div class="section-title">Yêu cầu xin nghỉ gần đây ('+myReqs.length+')</div>' +
    (myReqs.length ? myReqs.map(function(r){
      var c = S.classesById[r.classId];
      var statusLabel = r.status==='open'?'Đang chờ':r.status==='covered'?'Đã có người thay':'Đã huỷ';
      return '<div class="class-row"><div class="class-main"><div class="name">'+(c?escapeHtml(c.name):'')+' · '+fmtDateVN(r.date)+'</div><div class="meta">'+(REASON_LABEL[r.reason]||r.reason)+'</div></div><span class="chip">'+statusLabel+'</span></div>';
    }).join('') : '<div class="empty">Chưa có yêu cầu nào.</div>') +
  '</div>';

  var myFb = Object.keys(S.feedback).map(function(id){ return Object.assign({id:id}, S.feedback[id]); })
    .filter(function(f){ return f.uid===uid; }).sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); }).slice(0,8);
  var fbCard2 = '<div class="card"><div class="section-title">Góp ý đã gửi ('+myFb.length+')</div>' +
    (myFb.length ? myFb.map(function(f){
      return '<div class="class-row"><div class="class-main"><div class="name">'+escapeHtml(FEEDBACK_CATEGORY[f.category]||f.category)+'</div><div class="meta">'+escapeHtml(f.content.slice(0,80))+(f.content.length>80?'…':'')+'</div></div></div>';
    }).join('') : '<div class="empty">Chưa gửi góp ý nào.</div>') +
  '</div>';

  return head + picker + infoCard + statCard + badgeCard + reqCard + fbCard2;
}

function bindProfile360Events(){
  var profile360Select = document.getElementById('profile360Select');
  if(profile360Select) profile360Select.addEventListener('change', function(){ S.profile360Uid = profile360Select.value; render(); });
}
