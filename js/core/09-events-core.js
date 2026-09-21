'use strict';
/* ============================== Gắn sự kiện: phần dùng chung + gọi hàm gắn sự kiện của từng trang ============================== */

function bindEvents(){
  document.querySelectorAll('[data-action="go-tab"]').forEach(function(el){
    el.addEventListener('click', function(){ S.activeTab = el.getAttribute('data-tab'); S.mobileNavOpen=false; editingClassId=null; render(); });
  });
  var openBtn = document.querySelector('[data-action="open-mobile-nav"]'); if(openBtn) openBtn.addEventListener('click', function(){ S.mobileNavOpen=true; render(); });
  var closeBtn = document.querySelector('[data-action="close-mobile-nav"]'); if(closeBtn) closeBtn.addEventListener('click', function(){ S.mobileNavOpen=false; render(); });
  document.querySelectorAll('[data-action="cycle-theme"]').forEach(function(el){
    el.addEventListener('click', function(){
      var order = ['system','light','dark'];
      var idx = order.indexOf(S.themeMode);
      S.themeMode = order[(idx+1)%order.length];
      try{ localStorage.setItem('tnv-theme-mode', S.themeMode); }catch(e){}
      applyTheme(); render();
    });
  });
  document.querySelectorAll('[data-action="do-logout"]').forEach(function(el){
    el.addEventListener('click', function(){ if(confirm('Đăng xuất khỏi ứng dụng?')) doLogOut(); });
  });
  document.querySelectorAll('[data-action="dismiss-banner"]').forEach(function(el){
    el.addEventListener('click', function(){ S.bannerDismissed[el.getAttribute('data-banner')] = true; render(); });
  });
  document.querySelectorAll('[data-action="toggle-notif-panel"]').forEach(function(el){
    el.addEventListener('click', function(){
      S.notifPanelOpen = !S.notifPanelOpen;
      if(S.notifPanelOpen) markNotifsSeen();
      render();
    });
  });

  bindAvailabilityEvents();
  bindAttendanceEvents();
  bindClassesEvents();
  bindStudentsEvents();
  bindAutoScheduleEvents();
  bindGridViewEvents();
  bindProfile360Events();
  bindSwapEvents();
  bindMyStudentsEvents();
  bindUtilitiesEvents();
  bindFeedbackEvents();
  bindAnnouncementsEvents();
  bindMaterialsEvents();
  bindAchievementsEvents();
  bindReportsEvents();
  bindPeopleEvents();
}
