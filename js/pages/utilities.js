'use strict';
/* ============================== Trang Tiện ích (địa chỉ nơi dạy, liên hệ khẩn cấp) ============================== */

function renderUtilities(){
  var mgr = canManage();
  var head = '<div class="page-head"><h2>Tiện ích</h2><div class="sub">Địa chỉ nơi dạy và số liên hệ khẩn cấp — luôn sẵn khi bạn cần.</div></div>';

  var addrNam = (S.locationsInfo['Nhà Nam']) || '';
  var addrNu = (S.locationsInfo['Nhà Nữ']) || '';

  var addrEditForm = mgr ? ('<form id="locationsForm">' +
    '<div class="field"><label>Địa chỉ Nhà Nam</label><input type="text" name="Nhà Nam" value="'+escapeHtml(addrNam)+'" placeholder="Số nhà, đường, phường/xã, quận/huyện…"></div>' +
    '<div class="field"><label>Địa chỉ Nhà Nữ</label><input type="text" name="Nhà Nữ" value="'+escapeHtml(addrNu)+'" placeholder="Số nhà, đường, phường/xã, quận/huyện…"></div>' +
    '<button class="btn btn-sm btn-primary" type="submit">Lưu địa chỉ</button>' +
  '</form>') : '';

  function mapsLink(addr){ return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(addr); }
  var locCard = '<div class="card"><div class="section-title">Địa chỉ nơi dạy</div>' +
    ['Nhà Nam','Nhà Nữ'].map(function(loc){
      var addr = S.locationsInfo[loc];
      return '<div class="class-row" style="align-items:center;"><div class="class-main"><div class="name">'+loc+'</div>'+(addr?'<div class="meta">'+escapeHtml(addr)+'</div>':'<div class="meta">Chưa có địa chỉ.</div>')+'</div>' +
        (addr ? '<a class="btn btn-sm" href="'+mapsLink(addr)+'" target="_blank" rel="noopener">Chỉ đường</a>' : '') +
      '</div>';
    }).join('') +
    (mgr ? '<div class="divider"></div>'+addrEditForm : '') +
  '</div>';

  var contacts = Object.keys(S.emergencyContacts).map(function(id){ return Object.assign({id:id}, S.emergencyContacts[id]); })
    .sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });

  var contactForm = mgr ? ('<form id="contactForm" style="margin-top:10px;"><div class="row">' +
    '<div class="field"><label>Tên liên hệ</label><input type="text" name="label" placeholder="VD: Cô quản lý mái ấm" required></div>' +
    '<div class="field"><label>Số điện thoại</label><input type="tel" name="phone" required></div>' +
  '</div><button class="btn btn-sm btn-primary" type="submit">Thêm liên hệ</button></form>') : '';

  var contactCard = '<div class="card"><div class="section-title">Liên hệ khẩn cấp</div>' +
    (contacts.length ? contacts.map(function(c){
      return '<div class="class-row" style="align-items:center;"><div class="class-main"><div class="name">'+escapeHtml(c.label)+'</div><div class="meta">'+escapeHtml(c.phone)+'</div></div>' +
        '<div style="display:flex;gap:6px;"><a class="btn btn-sm btn-primary" href="tel:'+escapeHtml(c.phone)+'">Gọi ngay</a>' +
        (mgr ? '<button class="btn btn-sm btn-danger" data-action="delete-contact" data-id="'+c.id+'">Xoá</button>' : '') +
        '</div></div>';
    }).join('') : '<div class="empty">Chưa có số liên hệ nào.</div>') +
    contactForm +
  '</div>';

  return head + locCard + contactCard;
}
async function saveLocationsInfo(addresses){
  try{ await S.db.doc('settings/locations').set(Object.assign({}, addresses, {updatedAt:Date.now()})); toast('Đã lưu địa chỉ.'); }
  catch(e){ toast('Không thể lưu địa chỉ.'); }
}
async function addEmergencyContact(label, phone){
  if(!label || !phone){ toast('Vui lòng nhập đủ tên và số điện thoại.'); return; }
  try{ await S.db.collection('emergencyContacts').add({label:label, phone:phone, createdAt:Date.now()}); toast('Đã thêm liên hệ.'); }
  catch(e){ toast('Không thể thêm.'); }
}
async function deleteEmergencyContact(id){
  try{ await S.db.doc('emergencyContacts/'+id).delete(); toast('Đã xoá.'); }
  catch(e){ toast('Không thể xoá.'); }
}

function bindUtilitiesEvents(){
  // utilities
  var locationsForm = document.getElementById('locationsForm');
  if(locationsForm) locationsForm.addEventListener('submit', function(ev){
    ev.preventDefault(); var fd = new FormData(locationsForm);
    saveLocationsInfo({'Nhà Nam':fd.get('Nhà Nam')||'', 'Nhà Nữ':fd.get('Nhà Nữ')||''});
  });
  var contactForm = document.getElementById('contactForm');
  if(contactForm) contactForm.addEventListener('submit', function(ev){
    ev.preventDefault(); var fd = new FormData(contactForm);
    addEmergencyContact(fd.get('label'), fd.get('phone'));
    contactForm.reset();
  });
  document.querySelectorAll('[data-action="delete-contact"]').forEach(function(el){
    el.addEventListener('click', function(){ if(confirm('Xoá liên hệ này?')) deleteEmergencyContact(el.getAttribute('data-id')); });
  });

}
