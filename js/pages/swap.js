'use strict';
/* ============================== Trang Đổi ca / Xin nghỉ ============================== */

function renderSwap(){
  var head = '<div class="page-head"><h2>Đổi ca / Xin nghỉ</h2><div class="sub">Xin nghỉ một buổi dạy cụ thể và tìm người dạy thay, hoặc nhận dạy thay cho người khác.</div></div>';

  var requestForm = '<div class="card"><div class="section-title">Xin nghỉ một buổi</div>' +
    '<form id="leaveForm">' +
      '<div class="row">' +
        '<div class="field"><label>Lớp</label><select name="classId" required>'+
          S.classes.filter(function(c){ return mgrCanPickAny() || assignedIds(c.id).indexOf(S.uid)!==-1; })
            .map(function(c){ return '<option value="'+c.id+'">'+escapeHtml(c.name)+' ('+dayLabel(c.dayOfWeek)+' '+c.start+')</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>Ngày</label><input type="date" name="date" value="'+todayStr()+'" required></div>' +
      '</div>' +
      '<div class="row">' +
        '<div class="field"><label>Lý do</label><select name="reason">'+Object.keys(REASON_LABEL).map(function(k){return '<option value="'+k+'">'+REASON_LABEL[k]+'</option>';}).join('')+'</select></div>' +
      '</div>' +
      '<div class="field"><label>Ghi chú (không bắt buộc)</label><textarea name="note" placeholder="Ghi chú thêm"></textarea></div>' +
      '<button class="btn btn-primary" type="submit">Gửi yêu cầu xin nghỉ</button>' +
    '</form></div>';

  var open = allOpenLeaveRequests();
  var openCard = '<div class="card"><div class="section-title">Yêu cầu đang chờ người dạy thay ('+open.length+')</div>' +
    (open.length ? open.map(function(r){
      var c = S.classesById[r.classId];
      if(!c) return '';
      var elig = eligibleForClass(c, [r.requestedBy]).filter(function(uid){ return assignedIds(c.id).indexOf(uid)===-1 || uid===r.requestedBy===false; });
      var canCoverSelf = elig.indexOf(S.uid)!==-1 && S.uid!==r.requestedBy;
      return '<div class="card swap-card" style="margin:0 0 10px;">' +
        '<div class="name" style="font-weight:700;">'+escapeHtml(c.name)+' · '+fmtDateVN(r.date)+' · '+c.start+'–'+c.end+'</div>' +
        '<div class="hint" style="margin-top:2px;">'+escapeHtml(profileName(r.requestedBy))+' — '+(REASON_LABEL[r.reason]||r.reason)+(r.note?' — '+escapeHtml(r.note):'')+'</div>' +
        '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
          (canCoverSelf ? '<button class="btn btn-primary btn-sm" data-action="cover-leave" data-req="'+r.id+'">Tôi nhận dạy thay</button>' : '') +
          (mgrCanPickAny() ? '<select data-action="assign-cover-select" data-req="'+r.id+'"><option value="">Xếp người dạy thay…</option>'+elig.map(function(uid){return '<option value="'+uid+'">'+escapeHtml(profileName(uid))+'</option>';}).join('')+'</select>' : '') +
          ((r.requestedBy===S.uid || mgrCanPickAny()) ? '<button class="btn btn-sm btn-danger" data-action="cancel-leave" data-req="'+r.id+'">Huỷ yêu cầu</button>' : '') +
        '</div>' +
      '</div>';
    }).join('') : '<div class="empty">Không có yêu cầu nào đang chờ.</div>') +
  '</div>';

  var mine = myLeaveRequests();
  var mineCard = '<div class="card"><div class="section-title">Yêu cầu của tôi</div>' +
    (mine.length ? mine.map(function(r){
      var c = S.classesById[r.classId];
      var statusLabel = r.status==='open'?'Đang chờ':r.status==='covered'?'Đã có người thay: '+escapeHtml(profileName(r.coveredBy)):'Đã huỷ';
      var chipClass = r.status==='open'?'coral':r.status==='covered'?'sage':'';
      return '<div class="class-row"><div class="class-main"><div class="name">'+(c?escapeHtml(c.name):'')+' · '+fmtDateVN(r.date)+'</div><div class="meta">'+(REASON_LABEL[r.reason]||r.reason)+'</div></div><span class="chip '+chipClass+'">'+statusLabel+'</span></div>';
    }).join('') : '<div class="empty">Bạn chưa có yêu cầu nào.</div>') +
  '</div>';

  return head + requestForm + openCard + mineCard;
}
function mgrCanPickAny(){ return canManage(); }
async function requestLeave(classId, date, reason, note){
  try{
    await S.db.collection('leaveRequests').add({classId:classId, date:date, requestedBy:S.uid, reason:reason, note:note||'', status:'open', coveredBy:null, createdAt:Date.now()});
    toast('Đã gửi yêu cầu xin nghỉ.');
    var c = S.classesById[classId];
    notify(profileName(S.uid)+' xin nghỉ buổi '+(c?c.name:'')+' ngày '+fmtDateVN(date)+' ('+(REASON_LABEL[reason]||reason)+').');
  }catch(e){ toast('Không thể gửi yêu cầu.'); }
}
async function coverLeave(reqId, uid){
  try{
    await S.db.doc('leaveRequests/'+reqId).update({status:'covered', coveredBy:uid, resolvedAt:Date.now()});
    toast('Bạn đã nhận dạy thay.');
  }catch(e){ toast('Không thể nhận dạy thay.'); }
}
async function cancelLeaveRequest(reqId){
  try{ await S.db.doc('leaveRequests/'+reqId).update({status:'cancelled', resolvedAt:Date.now()}); toast('Đã huỷ yêu cầu.'); }
  catch(e){ toast('Không thể huỷ.'); }
}
async function assignCoverManually(reqId, uid){
  try{ await S.db.doc('leaveRequests/'+reqId).update({status:'covered', coveredBy:uid, resolvedAt:Date.now()}); toast('Đã xếp người dạy thay.'); }
  catch(e){ toast('Không thể cập nhật.'); }
}

function bindSwapEvents(){
  // swap
  var leaveForm = document.getElementById('leaveForm');
  if(leaveForm) leaveForm.addEventListener('submit', function(ev){
    ev.preventDefault(); var fd = new FormData(leaveForm);
    requestLeave(fd.get('classId'), fd.get('date'), fd.get('reason'), fd.get('note'));
    leaveForm.reset();
  });
  document.querySelectorAll('[data-action="cover-leave"]').forEach(function(el){ el.addEventListener('click', function(){ coverLeave(el.getAttribute('data-req'), S.uid); }); });
  document.querySelectorAll('[data-action="cancel-leave"]').forEach(function(el){ el.addEventListener('click', function(){ if(confirm('Huỷ yêu cầu này?')) cancelLeaveRequest(el.getAttribute('data-req')); }); });
  document.querySelectorAll('[data-action="assign-cover-select"]').forEach(function(el){ el.addEventListener('change', function(){ if(el.value) assignCoverManually(el.getAttribute('data-req'), el.value); el.value=''; }); });
  document.querySelectorAll('[data-action="quick-leave"]').forEach(function(el){
    el.addEventListener('click', function(){
      S.activeTab = 'swap'; render();
      setTimeout(function(){
        var sel = document.querySelector('#leaveForm select[name="classId"]');
        if(sel) sel.value = el.getAttribute('data-class');
      }, 0);
    });
  });

}
