'use strict';
/* ============================== Trang Bảng tin ============================== */

function renderAnnouncements(){
  var mgr = canManage();
  var head = '<div class="page-head"><h2>Bảng tin</h2><div class="sub">Thông báo nội bộ từ ban quản lý — lịch nghỉ, sự kiện, thay đổi quy định.</div></div>';

  var form = mgr ? '<div class="card"><div class="section-title">Đăng thông báo mới</div>' +
    '<form id="announceForm">' +
      '<div class="field"><label>Tiêu đề</label><input type="text" name="title" required></div>' +
      '<div class="field"><label>Nội dung</label><textarea name="content" required></textarea></div>' +
      '<div class="toggle-row" style="margin-bottom:12px;"><label class="switch"><input type="checkbox" name="pinned"><span class="track"></span></label><span>Ghim lên đầu</span></div>' +
      '<button class="btn btn-primary" type="submit">Đăng thông báo</button>' +
    '</form></div>' : '';

  var list = Object.keys(S.announcements).map(function(id){ return Object.assign({id:id}, S.announcements[id]); })
    .sort(function(a,b){ if(!!a.pinned!==!!b.pinned) return a.pinned?-1:1; return (b.createdAt||0)-(a.createdAt||0); });

  var listCard = '<div class="card"><div class="section-title">Thông báo ('+list.length+')</div>' +
    (list.length ? list.map(function(a){
      return '<div class="card" style="margin:0 0 10px;'+(a.pinned?'border-color:var(--marigold);':'')+'">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;">' +
          '<div class="name" style="font-weight:700;">'+(a.pinned?'📌 ':'')+escapeHtml(a.title)+'</div>' +
          '<span class="hint" style="margin:0;">'+escapeHtml(profileName(a.createdBy))+' · '+new Date(a.createdAt||0).toLocaleDateString('vi-VN')+'</span>' +
        '</div>' +
        '<div style="font-size:13.5px;white-space:pre-wrap;margin-top:6px;">'+escapeHtml(a.content)+'</div>' +
        (mgr ? '<div style="margin-top:8px;display:flex;gap:8px;">' +
          '<button class="btn btn-sm" data-action="pin-announcement" data-id="'+a.id+'" data-pinned="'+(a.pinned?'false':'true')+'">'+(a.pinned?'Bỏ ghim':'Ghim')+'</button>' +
          '<button class="btn btn-sm btn-danger" data-action="delete-announcement" data-id="'+a.id+'">Xoá</button>' +
        '</div>' : '') +
      '</div>';
    }).join('') : '<div class="empty">Chưa có thông báo nào.</div>') +
  '</div>';

  return head + form + listCard;
}
async function postAnnouncement(title, content, pinned){
  if(!title || !content){ toast('Vui lòng nhập đủ tiêu đề và nội dung.'); return; }
  try{ await S.db.collection('announcements').add({title:title, content:content, pinned:!!pinned, createdBy:S.uid, createdAt:Date.now()}); toast('Đã đăng bảng tin.'); }
  catch(e){ toast('Không thể đăng.'); }
}
async function deleteAnnouncement(id){
  try{ await S.db.doc('announcements/'+id).delete(); toast('Đã xoá thông báo.'); }
  catch(e){ toast('Không thể xoá.'); }
}
async function togglePinAnnouncement(id, pinned){
  try{ await S.db.doc('announcements/'+id).update({pinned:pinned}); }
  catch(e){}
}

function bindAnnouncementsEvents(){
  // announcements
  var announceForm = document.getElementById('announceForm');
  if(announceForm) announceForm.addEventListener('submit', function(ev){
    ev.preventDefault(); var fd = new FormData(announceForm);
    postAnnouncement(fd.get('title'), fd.get('content'), fd.get('pinned')==='on');
    announceForm.reset();
  });
  document.querySelectorAll('[data-action="pin-announcement"]').forEach(function(el){
    el.addEventListener('click', function(){ togglePinAnnouncement(el.getAttribute('data-id'), el.getAttribute('data-pinned')==='true'); });
  });
  document.querySelectorAll('[data-action="delete-announcement"]').forEach(function(el){
    el.addEventListener('click', function(){ if(confirm('Xoá thông báo này?')) deleteAnnouncement(el.getAttribute('data-id')); });
  });

}
