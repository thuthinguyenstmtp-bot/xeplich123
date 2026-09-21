'use strict';
/* ============================== Trang Lịch rảnh & Hồ sơ cá nhân ============================== */

function renderAvailability(){
  var head = '<div class="page-head"><h2>Lịch rảnh &amp; Hồ sơ</h2><div class="sub">Đăng ký khung giờ bạn có thể dạy và thông tin liên hệ để ban điều phối dễ sắp xếp.</div></div>';

  var vp = S.volunteerProfiles[S.uid] || {};
  var pausedNote = vp.paused ? '<div class="banner warn">Bạn hiện được đánh dấu tạm nghỉ — sẽ không được xếp lịch tự động cho đến khi ban quản trị bật lại.</div>' : '';

  var profileCard;
  if(!S.editingMyProfile){
    var infoRow = function(label, val){
      return '<div class="field" style="margin-bottom:8px;"><label>'+label+'</label><div style="font-size:13.5px;">'+(val?escapeHtml(val):'<span class="hint" style="margin:0;">Chưa cập nhật</span>')+'</div></div>';
    };
    var filledCount = ['dob','phone','school','subjects','address','emergencyContact'].filter(function(k){ return !!vp[k]; }).length;
    profileCard = '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;">' +
        '<div class="section-title" style="margin:0;">Hồ sơ của tôi</div>' +
        '<button class="btn btn-sm" data-action="edit-my-profile">Chỉnh sửa</button>' +
      '</div>' +
      pausedNote +
      '<div style="margin-top:10px;">' +
        '<div class="row">' + infoRow('Ngày sinh', vp.dob?fmtDateVN(vp.dob):'') + infoRow('Số điện thoại', vp.phone) + '</div>' +
        '<div class="row">' + infoRow('Trường / Nơi học - làm việc', vp.school) + infoRow('Môn sở trường', vp.subjects) + '</div>' +
        infoRow('Địa chỉ liên hệ', vp.address) +
        '<div class="row">' + infoRow('CCCD/CMND', vp.idNumber) + infoRow('Ngày bắt đầu tham gia', vp.joinDate?fmtDateVN(vp.joinDate):'') + '</div>' +
        infoRow('Liên hệ khẩn cấp', vp.emergencyContact) +
      '</div>' +
      '<div class="hint" style="margin-top:0;">'+filledCount+'/6 mục thông tin đã điền · Thông tin này chỉ hiển thị cho Quản trị viên và Điều phối viên.</div>' +
    '</div>';
  }else{
    profileCard = '<div class="card">' +
      '<div class="section-title">Chỉnh sửa hồ sơ của tôi</div>' +
      pausedNote +
      '<form id="profileForm">' +
        '<div class="row">' +
          '<div class="field"><label>Ngày sinh</label><input type="date" name="dob" value="'+escapeHtml(vp.dob||'')+'"></div>' +
          '<div class="field"><label>Số điện thoại</label><input type="tel" name="phone" value="'+escapeHtml(vp.phone||'')+'" placeholder="09xx xxx xxx"></div>' +
        '</div>' +
        '<div class="row">' +
          '<div class="field"><label>Trường / Nơi học - làm việc</label><input type="text" name="school" value="'+escapeHtml(vp.school||'')+'" placeholder="VD: THPT Nguyễn Huệ, ĐH Kinh tế…"></div>' +
          '<div class="field"><label>Môn sở trường</label><input type="text" name="subjects" value="'+escapeHtml(vp.subjects||'')+'" placeholder="VD: Toán, Tiếng Anh"></div>' +
        '</div>' +
        '<div class="field"><label>Địa chỉ liên hệ</label><input type="text" name="address" value="'+escapeHtml(vp.address||'')+'" placeholder="Số nhà, đường, phường/xã, quận/huyện"></div>' +
        '<div class="row">' +
          '<div class="field"><label>CCCD/CMND (không bắt buộc)</label><input type="text" name="idNumber" value="'+escapeHtml(vp.idNumber||'')+'"></div>' +
          '<div class="field"><label>Ngày bắt đầu tham gia</label><input type="date" name="joinDate" value="'+escapeHtml(vp.joinDate||'')+'"></div>' +
        '</div>' +
        '<div class="field"><label>Liên hệ khẩn cấp</label><input type="text" name="emergencyContact" value="'+escapeHtml(vp.emergencyContact||'')+'" placeholder="Tên và số điện thoại người thân"></div>' +
        '<div class="hint" style="margin-top:0;margin-bottom:10px;">Thông tin này chỉ hiển thị cho Quản trị viên và Điều phối viên, dùng để liên hệ và quản lý hồ sơ TNV.</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="btn btn-primary" type="submit">Lưu hồ sơ</button>' +
          '<button class="btn btn-ghost" type="button" data-action="cancel-edit-my-profile">Huỷ</button>' +
        '</div>' +
      '</form>' +
    '</div>';
  }

  var mySlots = (S.availability[S.uid]&&S.availability[S.uid].slots) || [];
  var mode = S.availFormMode; // null | 'add' | index number (editing)
  var isEditing = (typeof mode === 'number');
  var editingSlot = isEditing ? mySlots[mode] : null;

  var form;
  if(mode===null || mode===undefined){
    form = '<div class="card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
      '<div class="section-title" style="margin:0;">Khung giờ rảnh</div>' +
      '<button class="btn btn-sm btn-primary" data-action="open-avail-form" data-mode="add">+ Thêm khung giờ rảnh</button>' +
    '</div>';
  }else{
    form = '<div class="card">' +
      '<div class="section-title">'+(isEditing?'Sửa khung giờ rảnh':'Thêm khung giờ rảnh')+'</div>' +
      '<form id="availForm">' +
        '<div class="row">' +
          '<div class="field"><label>Thứ</label><select name="dow">'+DAYS.map(function(d){return '<option value="'+d.v+'" '+(editingSlot&&editingSlot.dayOfWeek===d.v?'selected':'')+'>'+d.label+'</option>';}).join('')+'</select></div>' +
          '<div class="field"><label>Từ</label><input type="time" name="start" value="'+(editingSlot?editingSlot.start:'08:00')+'" required></div>' +
          '<div class="field"><label>Đến</label><input type="time" name="end" value="'+(editingSlot?editingSlot.end:'10:00')+'" required></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="btn btn-primary" type="submit">'+(isEditing?'Cập nhật':'Thêm khung giờ')+'</button>' +
          '<button class="btn btn-ghost" type="button" data-action="cancel-avail-form">Huỷ</button>' +
        '</div>' +
      '</form>' +
    '</div>';
  }

  var list = '<div class="card"><div class="section-title">Các khung giờ đã đăng ký</div>' +
    (mySlots.length ? mySlots.map(function(s,i){
      return '<div class="avail-slot"><span class="d">'+dayLabel(s.dayOfWeek)+'</span><span class="t">'+s.start+' – '+s.end+'</span>' +
        '<div style="display:flex;gap:6px;">' +
          '<button class="btn btn-ghost btn-sm" data-action="open-avail-form" data-mode="'+i+'">Sửa</button>' +
          '<button class="btn btn-ghost btn-sm" data-action="remove-avail" data-idx="'+i+'">Xoá</button>' +
        '</div></div>';
    }).join('') : '<div class="empty">Chưa có khung giờ nào.</div>') +
  '</div>';

  return head + profileCard + form + list;
}
async function saveMyProfile(data){
  try{
    await S.db.doc('volunteerProfiles/'+S.uid).set(Object.assign({}, S.volunteerProfiles[S.uid]||{}, data, {updatedAt:Date.now()}));
    toast('Đã lưu hồ sơ.');
    if(!data.onboardingDone) notify(profileName(S.uid)+' đã cập nhật hồ sơ cá nhân.');
  }
  catch(e){ toast('Không thể lưu hồ sơ.'); }
}
async function agreeToRules(){
  try{ await S.db.doc('volunteerProfiles/'+S.uid).set(Object.assign({}, S.volunteerProfiles[S.uid]||{}, {agreedRulesAt:Date.now()})); toast('Cảm ơn bạn đã xác nhận nội quy!'); }
  catch(e){ toast('Không thể xác nhận. Thử lại nhé.'); }
}
async function saveAvailabilitySlot(dow, start, end){
  if(!start || !end || start>=end){ toast('Giờ bắt đầu phải trước giờ kết thúc.'); return; }
  var cur = S.availability[S.uid] || {slots:[]};
  var slots = (cur.slots||[]).slice();
  slots.push({dayOfWeek:dow, start:start, end:end});
  try{ await S.db.doc('availability/'+S.uid).set({uid:S.uid, slots:slots, updatedAt:Date.now()}); toast('Đã thêm khung giờ rảnh.'); notify(profileName(S.uid)+' đã thêm khung giờ rảnh ('+dayLabel(dow)+' '+start+'–'+end+').'); }
  catch(e){ toast('Không thể lưu.'); }
}
async function removeAvailabilitySlot(idx){
  var cur = S.availability[S.uid] || {slots:[]};
  var slots = (cur.slots||[]).slice(); slots.splice(idx,1);
  try{ await S.db.doc('availability/'+S.uid).set({uid:S.uid, slots:slots, updatedAt:Date.now()}); notify(profileName(S.uid)+' đã xoá một khung giờ rảnh.'); }
  catch(e){ toast('Không thể xoá.'); }
}
async function updateAvailabilitySlot(idx, dow, start, end){
  if(!start || !end || start>=end){ toast('Giờ bắt đầu phải trước giờ kết thúc.'); return; }
  var cur = S.availability[S.uid] || {slots:[]};
  var slots = (cur.slots||[]).slice();
  slots[idx] = {dayOfWeek:dow, start:start, end:end};
  try{ await S.db.doc('availability/'+S.uid).set({uid:S.uid, slots:slots, updatedAt:Date.now()}); toast('Đã cập nhật khung giờ.'); notify(profileName(S.uid)+' đã sửa lịch rảnh ('+dayLabel(dow)+' '+start+'–'+end+').'); }
  catch(e){ toast('Không thể lưu.'); }
}

function bindAvailabilityEvents(){
  // profile
  var profileForm = document.getElementById('profileForm');
  if(profileForm) profileForm.addEventListener('submit', function(ev){
    ev.preventDefault();
    var fd = new FormData(profileForm);
    saveMyProfile({
      subjects:fd.get('subjects')||'', phone:fd.get('phone')||'', emergencyContact:fd.get('emergencyContact')||'',
      dob:fd.get('dob')||'', school:fd.get('school')||'', address:fd.get('address')||'',
      idNumber:fd.get('idNumber')||'', joinDate:fd.get('joinDate')||''
    });
    S.editingMyProfile = false;
  });
  var editMyProfileBtn = document.querySelector('[data-action="edit-my-profile"]');
  if(editMyProfileBtn) editMyProfileBtn.addEventListener('click', function(){ S.editingMyProfile = true; render(); });
  var cancelEditMyProfileBtn = document.querySelector('[data-action="cancel-edit-my-profile"]');
  if(cancelEditMyProfileBtn) cancelEditMyProfileBtn.addEventListener('click', function(){ S.editingMyProfile = false; render(); });

  // availability
  var availForm = document.getElementById('availForm');
  if(availForm) availForm.addEventListener('submit', function(ev){
    ev.preventDefault();
    var fd = new FormData(availForm);
    if(typeof S.availFormMode === 'number'){
      updateAvailabilitySlot(S.availFormMode, +fd.get('dow'), fd.get('start'), fd.get('end'));
    }else{
      saveAvailabilitySlot(+fd.get('dow'), fd.get('start'), fd.get('end'));
    }
    S.availFormMode = null;
  });
  document.querySelectorAll('[data-action="open-avail-form"]').forEach(function(el){
    el.addEventListener('click', function(){
      var m = el.getAttribute('data-mode');
      S.availFormMode = (m==='add') ? 'add' : +m;
      render();
    });
  });
  var cancelAvailBtn = document.querySelector('[data-action="cancel-avail-form"]');
  if(cancelAvailBtn) cancelAvailBtn.addEventListener('click', function(){ S.availFormMode = null; render(); });
  document.querySelectorAll('[data-action="remove-avail"]').forEach(function(el){ el.addEventListener('click', function(){ S.availFormMode = null; removeAvailabilitySlot(+el.getAttribute('data-idx')); }); });

}
