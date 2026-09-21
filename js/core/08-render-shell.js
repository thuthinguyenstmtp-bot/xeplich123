'use strict';
var authMode = 'login';
var authError = '';

function render(){
  var app = document.getElementById('app');
  applyTheme();
  if(S.fatal){ app.innerHTML = renderGate(S.fatal); return; }
  if(!S.ready){ app.innerHTML = renderLoading(); return; }
  if(!Parse.User.current()){ app.innerHTML = renderAuthGate(); bindAuthEvents(); return; }
  if(S.myRole===undefined || S.myRole===null){ app.innerHTML = renderLoading(); return; }
  if(S.myRole==='volunteer' && S.myRoleDoc && S.myRoleDoc.approved===false){ app.innerHTML = renderPendingGate(); return; }
  if(S.myRole==='volunteer' && !isOnboarded(S.uid)){
    app.innerHTML = renderOnboarding();
    bindOnboardingEvents();
    return;
  }
  if(S.myRole==='volunteer' && S.rulesDoc && S.rulesDoc.text && S.rulesDoc.text.trim() && !(S.volunteerProfiles[S.uid] && S.volunteerProfiles[S.uid].agreedRulesAt)){
    app.innerHTML = renderRulesGate();
    var agreeBtn = document.getElementById('agreeRulesBtn');
    if(agreeBtn) agreeBtn.addEventListener('click', function(){ agreeToRules(); });
    return;
  }
  app.innerHTML = renderShell();
  bindEvents();
}
function renderAuthGate(){
  return '<div class="gate"><div class="gate-box" style="max-width:340px;">' +
    '<div class="brand" style="margin-bottom:18px;"><span class="mark" style="display:inline-block;background:var(--marigold);width:34px;height:34px;border-radius:8px;"></span></div>' +
    '<h2 style="font-size:20px;margin-bottom:4px;">Lịch Dạy Học TNV</h2>' +
    '<div class="hint" style="margin-top:0;margin-bottom:16px;">'+(authMode==='login'?'Đăng nhập để tiếp tục':'Tạo tài khoản tình nguyện viên mới')+'</div>' +
    (authError ? '<div class="banner warn" style="text-align:left;">'+escapeHtml(authError)+'</div>' : '') +
    '<form id="authForm" style="text-align:left;">' +
      (authMode==='signup' ? '<div class="field"><label>Họ tên hiển thị</label><input type="text" name="displayName" required></div>' : '') +
      '<div class="field"><label>Tên đăng nhập</label><input type="text" name="username" autocomplete="username" required></div>' +
      '<div class="field"><label>Mật khẩu</label><input type="password" name="password" autocomplete="'+(authMode==='login'?'current-password':'new-password')+'" required minlength="6"></div>' +
      '<button class="btn btn-primary" type="submit" style="width:100%;justify-content:center;">'+(authMode==='login'?'Đăng nhập':'Đăng ký')+'</button>' +
    '</form>' +
    '<div class="hint" style="margin-top:14px;">' +
      (authMode==='login' ? 'Chưa có tài khoản? <a href="#" id="authSwitch" style="color:var(--marigold-dark);font-weight:700;">Đăng ký ngay</a>' : 'Đã có tài khoản? <a href="#" id="authSwitch" style="color:var(--marigold-dark);font-weight:700;">Đăng nhập</a>') +
    '</div>' +
  '</div></div>';
}
function bindAuthEvents(){
  var f = document.getElementById('authForm');
  if(f) f.addEventListener('submit', async function(ev){
    ev.preventDefault();
    var fd = new FormData(f);
    var username = (fd.get('username')||'').trim();
    var password = fd.get('password')||'';
    authError = '';
    try{
      if(authMode==='signup'){
        await doSignUp(username, password, (fd.get('displayName')||'').trim() || username);
      }else{
        await doLogIn(username, password);
      }
    }catch(e){
      authError = (e && e.message) ? e.message : 'Có lỗi xảy ra, vui lòng thử lại.';
      render(); bindAuthEvents();
    }
  });
  var sw = document.getElementById('authSwitch');
  if(sw) sw.addEventListener('click', function(ev){ ev.preventDefault(); authMode = authMode==='login'?'signup':'login'; authError=''; render(); bindAuthEvents(); });
}
function isOnboarded(uid){
  var vp = S.volunteerProfiles[uid] || {};
  if(vp.onboardingDone) return true;
  if(vp.agreedRulesAt) return true;
  if(vp.phone || vp.dob || vp.school) return true;
  if(S.availability[uid] && (S.availability[uid].slots||[]).length) return true;
  return false;
}
function renderOnboarding(){
  var hasRules = !!(S.rulesDoc && S.rulesDoc.text && S.rulesDoc.text.trim());
  var totalSteps = hasRules ? 3 : 2;
  var step = S.onboardStep || 1;
  if(step>totalSteps) step = totalSteps;
  var vp = S.volunteerProfiles[S.uid] || {};

  var progress = '<div class="hint" style="text-align:center;margin-bottom:14px;">Bước '+step+'/'+totalSteps+'</div>';
  var body = '';

  if(step===1){
    body = '<h2 style="font-size:19px;margin-bottom:4px;text-align:center;">Chào mừng bạn đến với đội tình nguyện!</h2>' +
      '<div class="hint" style="text-align:center;margin-bottom:16px;">Điền vài thông tin cơ bản để ban điều phối liên hệ khi cần.</div>' +
      '<form id="onboardStep1">' +
        '<div class="field"><label>Số điện thoại</label><input type="tel" name="phone" value="'+escapeHtml(vp.phone||'')+'" placeholder="09xx xxx xxx"></div>' +
        '<div class="field"><label>Môn sở trường</label><input type="text" name="subjects" value="'+escapeHtml(vp.subjects||'')+'" placeholder="VD: Toán, Tiếng Anh"></div>' +
        '<div class="field"><label>Trường / Nơi học - làm việc</label><input type="text" name="school" value="'+escapeHtml(vp.school||'')+'" placeholder="Không bắt buộc"></div>' +
        '<button class="btn btn-primary" type="submit" style="width:100%;justify-content:center;">Tiếp tục</button>' +
      '</form>';
  }else if(step===2){
    var mySlots = (S.availability[S.uid]&&S.availability[S.uid].slots) || [];
    body = '<h2 style="font-size:19px;margin-bottom:4px;text-align:center;">Đăng ký lịch rảnh</h2>' +
      '<div class="hint" style="text-align:center;margin-bottom:16px;">Đây là lịch rảnh <strong style="color:var(--ink);">cố định</strong> — đăng ký một lần, không cần cập nhật lại hàng tuần.</div>' +
      '<form id="onboardAvailForm">' +
        '<div class="row">' +
          '<div class="field"><label>Thứ</label><select name="dow">'+DAYS.map(function(d){return '<option value="'+d.v+'">'+d.label+'</option>';}).join('')+'</select></div>' +
          '<div class="field"><label>Từ</label><input type="time" name="start" value="08:00"></div>' +
          '<div class="field"><label>Đến</label><input type="time" name="end" value="10:00"></div>' +
        '</div>' +
        '<button class="btn btn-sm btn-primary" type="submit">+ Thêm khung giờ</button>' +
      '</form>' +
      (mySlots.length ? ('<div style="margin-top:12px;">'+mySlots.map(function(s,i){ return '<div class="avail-slot"><span class="d">'+dayLabel(s.dayOfWeek)+'</span><span class="t">'+s.start+' – '+s.end+'</span><button class="btn btn-ghost btn-sm" data-action="onboard-remove-avail" data-idx="'+i+'">Xoá</button></div>'; }).join('')+'</div>') : '<div class="empty" style="margin-top:10px;">Chưa có khung giờ nào.</div>') +
      '<button class="btn btn-primary" data-action="onboard-next" style="width:100%;justify-content:center;margin-top:14px;" '+(mySlots.length?'':'disabled')+'>Tiếp tục</button>' +
      (mySlots.length?'':'<div class="hint" style="text-align:center;">Thêm ít nhất 1 khung giờ để tiếp tục.</div>');
  }else{
    body = '<h2 style="font-size:19px;margin-bottom:8px;text-align:center;">Nội quy tình nguyện viên</h2>' +
      '<div class="card" style="white-space:pre-wrap;font-size:13.5px;max-height:280px;overflow-y:auto;margin-bottom:14px;">'+escapeHtml(S.rulesDoc.text)+'</div>' +
      '<button class="btn btn-primary" data-action="onboard-finish" style="width:100%;justify-content:center;">Tôi đã đọc và đồng ý, bắt đầu sử dụng</button>';
  }

  var backBtn = step>1 ? '<div style="text-align:center;margin-top:10px;"><button class="btn btn-ghost btn-sm" data-action="onboard-back">‹ Quay lại</button></div>' : '';

  return '<div class="gate"><div class="gate-box" style="max-width:420px;text-align:left;">' + progress + body + backBtn + '</div></div>';
}
function bindOnboardingEvents(){
  var hasRules = !!(S.rulesDoc && S.rulesDoc.text && S.rulesDoc.text.trim());
  var s1 = document.getElementById('onboardStep1');
  if(s1) s1.addEventListener('submit', function(ev){
    ev.preventDefault();
    var fd = new FormData(s1);
    saveMyProfile({phone:fd.get('phone')||'', subjects:fd.get('subjects')||'', school:fd.get('school')||''});
    S.onboardStep = 2;
    render();
  });
  var avForm = document.getElementById('onboardAvailForm');
  if(avForm) avForm.addEventListener('submit', function(ev){
    ev.preventDefault();
    var fd = new FormData(avForm);
    saveAvailabilitySlot(+fd.get('dow'), fd.get('start'), fd.get('end'));
  });
  document.querySelectorAll('[data-action="onboard-remove-avail"]').forEach(function(el){
    el.addEventListener('click', function(){ removeAvailabilitySlot(+el.getAttribute('data-idx')); });
  });
  var nextBtn = document.querySelector('[data-action="onboard-next"]');
  if(nextBtn) nextBtn.addEventListener('click', function(){
    if(hasRules){ S.onboardStep = 3; render(); }
    else{ saveMyProfile({onboardingDone:true}); }
  });
  var finishBtn = document.querySelector('[data-action="onboard-finish"]');
  if(finishBtn) finishBtn.addEventListener('click', function(){ saveMyProfile({onboardingDone:true, agreedRulesAt:Date.now()}); });
  var backBtn = document.querySelector('[data-action="onboard-back"]');
  if(backBtn) backBtn.addEventListener('click', function(){ S.onboardStep = Math.max(1, (S.onboardStep||1)-1); render(); });
}
function renderPendingGate(){
  return '<div class="gate"><div class="gate-box">' +
    '<h2 style="font-size:19px;margin-bottom:8px;">Đang chờ duyệt</h2>' +
    '<div style="color:var(--ink-soft);font-size:14px;line-height:1.6;">Tài khoản của bạn đã được ghi nhận là tình nguyện viên mới. Vui lòng chờ Quản trị viên duyệt để bắt đầu sử dụng đầy đủ ứng dụng — bạn sẽ tự động vào được ngay khi được duyệt.</div>' +
  '</div></div>';
}
function renderRulesGate(){
  return '<div class="gate"><div class="gate-box" style="max-width:460px;text-align:left;">' +
    '<h2 style="font-size:19px;margin-bottom:8px;text-align:center;">Nội quy tình nguyện viên</h2>' +
    '<div class="card" style="white-space:pre-wrap;font-size:13.5px;max-height:320px;overflow-y:auto;margin-bottom:14px;">'+escapeHtml(S.rulesDoc.text)+'</div>' +
    '<button class="btn btn-primary" id="agreeRulesBtn" style="width:100%;justify-content:center;">Tôi đã đọc và đồng ý</button>' +
  '</div></div>';
}
function renderLoading(){ return '<div class="gate"><div class="gate-box"><div class="gate-mark"></div><div style="color:var(--ink-soft);font-size:13.5px;">Đang tải dữ liệu lịch dạy học…</div></div></div>'; }
function renderGate(msg){
  return '<div class="gate"><div class="gate-box"><h2 style="font-size:19px;margin-bottom:8px;">Chưa thể mở trang</h2><div style="color:var(--ink-soft);font-size:14px;line-height:1.55;">'+escapeHtml(msg)+'</div></div></div>';
}
function unreadNotifCount(){
  var lastSeen = (S.volunteerProfiles[S.uid] && S.volunteerProfiles[S.uid].notifLastSeenAt) || 0;
  return Object.values(S.notifications).filter(function(n){ return (n.createdAt||0)>lastSeen && n.actorUid!==S.uid; }).length;
}
async function markNotifsSeen(){
  try{ await S.db.doc('volunteerProfiles/'+S.uid).set(Object.assign({}, S.volunteerProfiles[S.uid]||{}, {notifLastSeenAt:Date.now()})); }
  catch(e){}
}
function renderNotifSection(){
  if(!canManage()) return '';
  var unread = unreadNotifCount();
  var html = '<button class="tab-btn" data-action="toggle-notif-panel" style="justify-content:space-between;">' +
    '<span><span class="dot"></span>🔔 Thông báo</span>' + (unread?('<span class="badge-count">'+unread+'</span>'):'') +
  '</button>';
  if(S.notifPanelOpen){
    var recent = Object.keys(S.notifications).map(function(id){ return Object.assign({id:id}, S.notifications[id]); })
      .sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); }).slice(0,25);
    html += '<div style="background:rgba(239,233,214,0.07);border-radius:8px;padding:6px 8px;margin:2px 0 8px;max-height:260px;overflow-y:auto;">' +
      (recent.length ? recent.map(function(n){
        return '<div style="padding:6px 2px;border-bottom:1px solid rgba(239,233,214,0.1);font-size:12px;color:rgba(239,233,214,0.9);line-height:1.4;">'+escapeHtml(n.message)+
          '<div style="font-size:10.5px;color:rgba(239,233,214,0.45);margin-top:2px;">'+new Date(n.createdAt||0).toLocaleString('vi-VN')+'</div></div>';
      }).join('') : '<div style="font-size:12px;color:rgba(239,233,214,0.5);padding:6px 2px;">Chưa có thông báo nào.</div>') +
    '</div>';
  }
  return html;
}
function renderShell(){
  var visibleTabs = TABS.filter(roleAllowed);
  var groupChung = visibleTabs.filter(function(t){return t.group==='chung';});
  var groupQL = visibleTabs.filter(function(t){return t.group==='quan-ly';});
  var openReqCount = allOpenLeaveRequests().length;

  var navHtml = navGroup('Chung', groupChung, openReqCount) + (groupQL.length ? navGroup('Quản lý', groupQL, openReqCount) : '');

  var meRow = '<div class="me-row">' + (S.me.avatarUrl?'<img src="'+S.me.avatarUrl+'">':'') +
    '<div><div class="me-name">'+escapeHtml(S.me.name||'Bạn')+'</div><div class="me-role">'+escapeHtml(ROLE_LABEL[S.myRole]||'—')+'</div></div></div>';

  var themeLabel = S.themeMode==='light' ? 'Sáng' : (S.themeMode==='dark' ? 'Tối' : 'Theo hệ thống');
  var themeRow = '<button class="tab-btn" data-action="cycle-theme" style="margin-top:8px;"><span class="dot"></span>Giao diện: '+themeLabel+'</button>' +
    '<button class="tab-btn" data-action="do-logout"><span class="dot"></span>Đăng xuất</button>';

  var currentTab = TABS.find(function(t){return t.id===S.activeTab;}) || TABS[0];

  return '' +
  '<div class="shell">' +
    '<aside class="sidebar">' +
      '<div class="brand"><span class="mark"></span><h1>Lịch Dạy Học TNV</h1><p>Xếp lịch &amp; điểm danh mái ấm</p></div>' +
      '<nav class="tabs">'+navHtml+'</nav>' +
      renderNotifSection() +
      '<div class="side-foot">'+meRow+themeRow+'</div>' +
    '</aside>' +
    '<div class="topbar"><h1>'+escapeHtml(currentTab.label)+'</h1><button data-action="open-mobile-nav">Menu</button></div>' +
    '<div class="mobile-nav'+(S.mobileNavOpen?' open':'')+'">' +
      '<div class="close-row"><button data-action="close-mobile-nav">Đóng</button></div>' +
      '<div class="brand" style="margin-bottom:10px;"><h1>Lịch Dạy Học TNV</h1></div>' +
      '<nav class="tabs">'+navHtml+'</nav>' +
      renderNotifSection() +
      '<div class="side-foot" style="border-top:1px solid rgba(239,233,214,0.14);">'+meRow+themeRow+'</div>' +
    '</div>' +
    '<main class="main"><div class="content">'+renderBanners()+renderTab(currentTab.id)+'</div></main>' +
  '</div>';
}
function navGroup(label, tabs, openReqCount){
  if(!tabs.length) return '';
  var html = '<div class="tab-group-label">'+escapeHtml(label)+'</div>';
  tabs.forEach(function(t){
    var badge = '';
    if(t.id==='swap' && openReqCount>0) badge = '<span class="badge-count">'+openReqCount+'</span>';
    if(t.id==='feedback' && canManage()){
      var newFb = Object.values(S.feedback).filter(function(f){ return f.status==='new'; }).length;
      if(newFb>0) badge = '<span class="badge-count">'+newFb+'</span>';
    }
    if(t.id==='dashboard' && understaffedClasses().length>0) badge = '<span class="badge-count">'+understaffedClasses().length+'</span>';
    if(t.id==='people'){
      var pend = pendingApprovals().length;
      if(pend>0) badge = '<span class="badge-count">'+pend+'</span>';
    }
    if(t.id==='autoschedule'){
      var emptyN = cellsNeedingTnv(S.scheduleWeekStart||mondayOf(todayStr())).length;
      if(emptyN>0) badge = '<span class="badge-count">'+emptyN+'</span>';
    }
    html += '<button class="tab-btn'+(t.id===S.activeTab?' active':'')+'" data-action="go-tab" data-tab="'+t.id+'"><span class="dot"></span>'+escapeHtml(t.label)+badge+'</button>';
  });
  return html;
}
function renderBanners(){
  var html = '';
  var today = todayStr();
  var now = new Date(); var nowMin = now.getHours()*60+now.getMinutes();
  // birthdays / anniversaries today, shown to everyone
  if(!S.bannerDismissed.celebrate){
    var cel = celebrationsToday().filter(function(c){ return c.uid!==S.uid; });
    if(cel.length){
      var msgs = cel.map(function(c){
        return c.type==='birthday' ? ('🎂 Hôm nay là sinh nhật của '+escapeHtml(profileName(c.uid))) : ('🎉 '+escapeHtml(profileName(c.uid))+' tròn '+c.years+' năm đồng hành hôm nay');
      });
      html += '<div class="banner"><span>'+msgs.join(' · ')+'</span><button class="x" data-action="dismiss-banner" data-banner="celebrate">✕</button></div>';
    }
  }
  // upcoming class today within 2h
  if(!S.bannerDismissed.upcoming){
    var upcoming = myAssignedClasses().filter(function(c){ return c.dayOfWeek===now.getDay(); })
      .map(function(c){ return {c:c, sm:toMin(c.start)}; })
      .filter(function(x){ return x.sm - nowMin <= 120 && x.sm - nowMin >= -20; })
      .sort(function(a,b){ return a.sm-b.sm; });
    if(upcoming.length){
      var u = upcoming[0].c;
      html += '<div class="banner"><span>Bạn có lớp "'+escapeHtml(u.name)+'" lúc '+u.start+' hôm nay'+(u.location?' tại '+escapeHtml(u.location):'')+'.</span><button class="x" data-action="dismiss-banner" data-banner="upcoming">✕</button></div>';
    }
  }
  // no availability registered
  if(!S.bannerDismissed.noavail && !(S.availability[S.uid] && (S.availability[S.uid].slots||[]).length)){
    html += '<div class="banner warn"><span>Bạn chưa đăng ký lịch rảnh — đây là đăng ký cố định một lần (không cần cập nhật lại hàng tuần), hãy vào "Lịch rảnh &amp; Hồ sơ" để đăng ký ngay.</span><button class="x" data-action="dismiss-banner" data-banner="noavail">✕</button></div>';
  }
  // understaffed classes, for managers, shown outside dashboard too as a nudge
  if(canManage() && S.activeTab!=='dashboard' && !S.bannerDismissed.understaffed){
    var us = understaffedClasses();
    if(us.length){
      html += '<div class="banner warn"><span>'+us.length+' lớp đang thiếu TNV. Xem ở tab Tổng quan hoặc Xếp lịch tự động.</span><button class="x" data-action="dismiss-banner" data-banner="understaffed">✕</button></div>';
    }
  }
  return html;
}
function renderTab(id){
  switch(id){
    case 'dashboard': return renderDashboard();
    case 'my-schedule': return renderMySchedule();
    case 'gridview': return renderGridView();
    case 'availability': return renderAvailability();
    case 'attendance': return renderAttendance();
    case 'swap': return renderSwap();
    case 'feedback': return renderFeedback();
    case 'mystudents': return renderMyStudents();
    case 'utilities': return renderUtilities();
    case 'announcements': return renderAnnouncements();
    case 'materials': return renderMaterials();
    case 'achievements': return renderAchievements();
    case 'auditlog': return renderAuditLog();
    case 'profile360': return renderProfile360();
    case 'classes': return renderClasses();
    case 'students': return renderStudents();
    case 'autoschedule': return renderAutoSchedule();
    case 'reports': return renderReports();
    case 'people': return renderPeople();
    default: return '';
  }
}
