'use strict';
/* ============================== Trang Phân quyền & TNV ============================== */

var expandedPersonId = null;

function renderPeople(){
  var head = '<div class="page-head"><h2>Phân quyền &amp; TNV</h2><div class="sub">Quản lý vai trò, trạng thái hoạt động và hồ sơ của mọi người đã mở trang này, hoặc tìm người trong tổ chức để thêm trước.</div></div>';

  var pending = pendingApprovals();
  var pendingCard = pending.length ? ('<div class="card"><div class="section-title">TNV mới chờ duyệt ('+pending.length+')</div>' +
    pending.map(function(uid){
      return '<div class="class-row" style="align-items:center;"><div class="class-main">'+(profileAvatar(uid)?'<img src="'+profileAvatar(uid)+'" style="width:24px;height:24px;border-radius:50%;margin-right:8px;">':'')+'<span class="name">'+escapeHtml(profileName(uid))+'</span></div>' +
        '<button class="btn btn-sm btn-primary" data-action="approve-volunteer" data-uid="'+uid+'">Duyệt làm TNV</button></div>';
    }).join('') + '</div>') : '';

  var rulesCard = '<div class="card"><div class="section-title">Nội quy tình nguyện viên</div>' +
    '<div class="hint" style="margin-top:0;">TNV mới (không phải Điều phối/Quản trị) sẽ phải đọc và xác nhận nội quy này trước khi sử dụng đầy đủ ứng dụng.</div>' +
    '<textarea id="rulesTextArea" placeholder="Nhập nội quy dành cho tình nguyện viên…">'+escapeHtml((S.rulesDoc&&S.rulesDoc.text)||'')+'</textarea>' +
    '<div style="margin-top:8px;"><button class="btn btn-sm" data-action="save-rules">Lưu nội quy</button></div>' +
  '</div>';

  var birthdays = birthdaysThisMonth();
  var bdayCard = birthdays.length ? '<div class="card"><div class="section-title">Sinh nhật trong tháng này</div>' +
    birthdays.map(function(b){ return '<div class="class-row"><div class="class-main"><span class="name">'+escapeHtml(profileName(b.uid))+'</span></div><span class="chip marigold">'+b.day+'/'+b.month+'</span></div>'; }).join('') +
  '</div>' : '';

  var exportCard = '<div class="card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
    '<div><div style="font-weight:700;">Danh bạ TNV đầy đủ</div><div class="hint" style="margin-top:2px;">Xuất file CSV có đủ liên hệ, ngày sinh, trường, tình trạng — dùng cho báo cáo hoặc giấy chứng nhận.</div></div>' +
    '<button class="btn btn-sm" data-action="export-tnv">Xuất CSV danh sách TNV</button>' +
  '</div>';

  var searchCard = '<div class="card"><div class="section-title">Tìm người trong tổ chức</div>' +
    '<input type="text" id="peopleSearch" placeholder="Nhập tên để tìm…" style="width:100%;border:1px solid var(--line-strong);border-radius:7px;padding:9px 11px;background:var(--paper);color:var(--ink);">' +
    '<div id="peopleSearchResults" style="margin-top:8px;"></div></div>';

  var ids = Object.keys(S.roles);
  ids.sort(function(a,b){ var ra=ROLE_ORDER[roleOf(a)]||0, rb=ROLE_ORDER[roleOf(b)]||0; if(ra!==rb) return rb-ra; return profileName(a).localeCompare(profileName(b)); });

  var from30 = addDays(todayStr(), -29);
  var stats = attendanceStatsInRange(from30, todayStr());

  var rows = ids.map(function(uid){
    var role = roleOf(uid);
    var paused = isPaused(uid);
    var vp = S.volunteerProfiles[uid] || {};
    var s = stats[uid] || {present:0, absent:0};
    var open = expandedPersonId===uid;
    return '<tr>' +
      '<td style="display:flex;align-items:center;gap:8px;">'+(profileAvatar(uid)?'<img src="'+profileAvatar(uid)+'" style="width:24px;height:24px;border-radius:50%;">':'')+escapeHtml(profileName(uid))+(uid===S.uid?' <span class="hint" style="margin:0;">(bạn)</span>':'')+(paused?' <span class="paused-badge">Tạm nghỉ</span>':'')+'</td>' +
      '<td><span class="role-badge '+role+'">'+ROLE_LABEL[role]+'</span></td>' +
      '<td><select data-action="set-role" data-uid="'+uid+'">'+['volunteer','coordinator','admin'].map(function(r){return '<option value="'+r+'" '+(r===role?'selected':'')+'>'+ROLE_LABEL[r]+'</option>';}).join('')+'</select></td>' +
      '<td>'+s.present+' buổi / 30 ngày</td>' +
      '<td><button class="btn btn-sm" data-action="toggle-person" data-uid="'+uid+'">'+(open?'Ẩn chi tiết':'Chi tiết')+'</button></td>' +
      '</tr>' +
      (open ? '<tr><td colspan="5"><div class="card" style="box-shadow:none;">' +
        '<form data-action="admin-profile-form" data-uid="'+uid+'">' +
        '<div class="row">' +
          '<div class="field"><label>Ngày sinh</label><input type="date" name="dob" value="'+escapeHtml(vp.dob||'')+'"></div>' +
          '<div class="field"><label>Trường / Nơi học - làm việc</label><input type="text" name="school" value="'+escapeHtml(vp.school||'')+'"></div>' +
        '</div>' +
        '<div class="row">' +
          '<div class="field"><label>Điện thoại</label><input type="tel" name="phone" value="'+escapeHtml(vp.phone||'')+'"></div>' +
          '<div class="field"><label>Môn sở trường</label><input type="text" name="subjects" value="'+escapeHtml(vp.subjects||'')+'"></div>' +
        '</div>' +
        '<div class="field"><label>Địa chỉ liên hệ</label><input type="text" name="address" value="'+escapeHtml(vp.address||'')+'"></div>' +
        '<div class="row">' +
          '<div class="field"><label>CCCD/CMND</label><input type="text" name="idNumber" value="'+escapeHtml(vp.idNumber||'')+'"></div>' +
          '<div class="field"><label>Ngày bắt đầu tham gia</label><input type="date" name="joinDate" value="'+escapeHtml(vp.joinDate||'')+'"></div>' +
        '</div>' +
        '<div class="field"><label>Liên hệ khẩn cấp</label><input type="text" name="emergencyContact" value="'+escapeHtml(vp.emergencyContact||'')+'"></div>' +
        '<div class="field"><label>Số lớp tối đa/tuần (0 = không giới hạn)</label><input type="number" name="maxClassesPerWeek" min="0" max="14" value="'+escapeHtml(vp.maxClassesPerWeek||'0')+'"></div>' +
        '<div class="field"><label>Ghi chú nội bộ (chỉ quản lý thấy)</label><textarea name="adminNote" placeholder="Ghi chú riêng của ban quản lý về TNV này…">'+escapeHtml(vp.adminNote||'')+'</textarea></div>' +
        '<button class="btn btn-sm btn-primary" type="submit">Lưu thông tin</button>' +
        '</form>' +
        (consecutiveAbsences(uid)>=2 ? '<div class="banner warn" style="margin-top:12px;">Đã vắng '+consecutiveAbsences(uid)+' buổi liên tiếp gần đây — nên chủ động liên hệ.</div>' : '') +
        '<div class="toggle-row" style="margin-top:12px;"><label class="switch"><input type="checkbox" data-action="toggle-paused" data-uid="'+uid+'" '+(paused?'checked':'')+'><span class="track"></span></label><span>Tạm nghỉ (không xếp lịch tự động)</span></div>' +
      '</div></td></tr>' : '');
  }).join('');

  var listCard = '<div class="card"><div class="section-title">Danh sách ('+ids.length+')</div>' +
    '<table><thead><tr><th>Người</th><th>Vai trò hiện tại</th><th>Đổi vai trò</th><th>Đóng góp (30 ngày)</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';

  return head + pendingCard + rulesCard + bdayCard + exportCard + searchCard + listCard;
}
async function setRole(uid, role){
  try{ await S.db.doc('roles/'+uid).set(Object.assign({}, S.roles[uid]||{}, {role:role, updatedAt:Date.now()})); toast('Đã cập nhật vai trò.'); logAudit('role_change', {targetUid:uid, toRole:role}); }
  catch(e){ toast('Không thể cập nhật vai trò.'); }
}
async function approveVolunteer(uid){
  try{ await S.db.doc('roles/'+uid).set(Object.assign({}, S.roles[uid]||{}, {approved:true, updatedAt:Date.now()})); toast('Đã duyệt TNV.'); logAudit('approve_volunteer', {targetUid:uid}); }
  catch(e){ toast('Không thể duyệt.'); }
}
async function setPaused(uid, paused){
  try{ await S.db.doc('volunteerProfiles/'+uid).set(Object.assign({}, S.volunteerProfiles[uid]||{}, {paused:paused, updatedAt:Date.now()})); toast(paused?'Đã đánh dấu tạm nghỉ.':'Đã bật lại hoạt động.'); logAudit('pause_toggle', {targetUid:uid, paused:paused}); }
  catch(e){ toast('Không thể cập nhật.'); }
}
async function saveVolunteerProfile(uid, data){
  try{ await S.db.doc('volunteerProfiles/'+uid).set(Object.assign({}, S.volunteerProfiles[uid]||{}, data, {updatedAt:Date.now(), updatedBy:S.uid})); toast('Đã lưu thông tin TNV.'); }
  catch(e){ toast('Không thể lưu.'); }
}
async function saveRulesText(text){
  try{ await S.db.doc('settings/rules').set({text:text, updatedAt:Date.now(), updatedBy:S.uid}); toast('Đã lưu nội quy.'); logAudit('rules_update', {}); }
  catch(e){ toast('Không thể lưu nội quy.'); }
}

function bindPeopleEvents(){
  // people
  document.querySelectorAll('[data-action="set-role"]').forEach(function(el){ el.addEventListener('change', function(){ setRole(el.getAttribute('data-uid'), el.value); }); });
  document.querySelectorAll('[data-action="toggle-person"]').forEach(function(el){
    el.addEventListener('click', function(){ var uid = el.getAttribute('data-uid'); expandedPersonId = expandedPersonId===uid ? null : uid; render(); });
  });
  document.querySelectorAll('[data-action="toggle-paused"]').forEach(function(el){
    el.addEventListener('change', function(){ setPaused(el.getAttribute('data-uid'), el.checked); });
  });
  document.querySelectorAll('[data-action="approve-volunteer"]').forEach(function(el){
    el.addEventListener('click', function(){ approveVolunteer(el.getAttribute('data-uid')); });
  });
  var saveRulesBtn = document.querySelector('[data-action="save-rules"]');
  if(saveRulesBtn) saveRulesBtn.addEventListener('click', function(){
    var ta = document.getElementById('rulesTextArea');
    saveRulesText(ta ? ta.value : '');
  });
  document.querySelectorAll('[data-action="admin-profile-form"]').forEach(function(el){
    el.addEventListener('submit', function(ev){
      ev.preventDefault();
      var uid = el.getAttribute('data-uid');
      var fd = new FormData(el);
      saveVolunteerProfile(uid, {
        dob:fd.get('dob')||'', school:fd.get('school')||'', phone:fd.get('phone')||'', subjects:fd.get('subjects')||'',
        address:fd.get('address')||'', idNumber:fd.get('idNumber')||'', joinDate:fd.get('joinDate')||'',
        emergencyContact:fd.get('emergencyContact')||'', adminNote:fd.get('adminNote')||'', maxClassesPerWeek:fd.get('maxClassesPerWeek')||'0'
      });
    });
  });
  var expTnv = document.querySelector('[data-action="export-tnv"]');
  if(expTnv) expTnv.addEventListener('click', function(){
    var ids = Object.keys(S.roles).sort(function(a,b){ return profileName(a).localeCompare(profileName(b)); });
    var rows = ids.map(function(uid){
      var vp = S.volunteerProfiles[uid]||{};
      return [profileName(uid), ROLE_LABEL[roleOf(uid)], isPaused(uid)?'Tạm nghỉ':'Hoạt động', vp.dob||'', vp.school||'', vp.phone||'', vp.subjects||'', vp.address||'', vp.idNumber||'', vp.joinDate||'', vp.emergencyContact||''];
    });
    downloadCSV('danh-sach-tnv.csv', ['Họ tên','Vai trò','Trạng thái','Ngày sinh','Trường/Nơi làm việc','Điện thoại','Môn sở trường','Địa chỉ','CCCD/CMND','Ngày tham gia','Liên hệ khẩn cấp'], rows);
  });

  var peopleSearch = document.getElementById('peopleSearch');
  if(peopleSearch){
    var searchTimer=null;
    peopleSearch.addEventListener('input', function(){
      clearTimeout(searchTimer);
      var q = peopleSearch.value;
      searchTimer = setTimeout(async function(){
        try{
          var hits = await S.userCap.search(q);
          var box = document.getElementById('peopleSearchResults');
          if(!hits.length){ box.innerHTML = '<div class="hint">Không tìm thấy.</div>'; return; }
          box.innerHTML = hits.map(function(h){
            var already = !!S.roles[h.id];
            return '<div class="search-hit" data-action="add-person" data-uid="'+h.id+'">'+(h.avatarUrl?'<img src="'+h.avatarUrl+'">':'')+'<span style="flex:1;">'+escapeHtml(h.name||'—')+'</span>'+(already?'<span class="hint" style="margin:0;">Đã có</span>':'<span class="chip marigold">Thêm là TNV</span>')+'</div>';
          }).join('');
          box.querySelectorAll('[data-action="add-person"]').forEach(function(el){
            el.addEventListener('click', async function(){
              var uid = el.getAttribute('data-uid'); if(S.roles[uid]) return;
              try{ await S.db.doc('roles/'+uid).set({role:'volunteer', approved:true, createdAt:Date.now(), updatedAt:Date.now(), addedBy:S.uid}); toast('Đã thêm vào danh sách TNV.'); logAudit('add_person', {targetUid:uid}); }
              catch(e){ toast('Không thể thêm.'); }
            });
          });
        }catch(e){}
      }, 250);
    });
  }
}
