'use strict';
/* ============================== Trang Nhật ký hoạt động ============================== */

function renderAuditLog(){
  var head = '<div class="page-head"><h2>Nhật ký hoạt động</h2><div class="sub">Lịch sử các thay đổi quản trị quan trọng — ai làm gì và khi nào.</div></div>';
  var list = auditLogList().slice(0, 150);
  var listCard = '<div class="card">' +
    (list.length ? list.map(function(a){
      var target = a.meta && a.meta.targetUid ? ' — '+escapeHtml(profileName(a.meta.targetUid)) : (a.meta && a.meta.name ? ' — '+escapeHtml(a.meta.name) : '');
      return '<div class="class-row"><div class="class-main"><span class="name">'+(AUDIT_LABEL[a.action]||a.action)+target+'</span><div class="meta">Thực hiện bởi '+escapeHtml(profileName(a.actorUid))+' · '+new Date(a.createdAt||0).toLocaleString('vi-VN')+'</div></div></div>';
    }).join('') : '<div class="empty">Chưa có hoạt động nào được ghi nhận.</div>') +
  '</div>';
  return head + listCard;
}
