'use strict';
/* ============================== Trang Góp ý ============================== */

var FEEDBACK_CATEGORY = {general:'Góp ý chung', schedule:'Lịch dạy', students:'Học sinh', app:'Ứng dụng / kỹ thuật', other:'Khác'};

function feedbackList(){
  var mgr = canManage();
  var arr = Object.keys(S.feedback).map(function(id){ return Object.assign({id:id}, S.feedback[id]); });
  if(!mgr) arr = arr.filter(function(f){ return f.uid===S.uid; });
  arr.sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
  return arr;
}
function renderFeedback(){
  var mgr = canManage();
  var head = '<div class="page-head"><h2>Góp ý</h2><div class="sub">'+(mgr?'Xem và phản hồi các góp ý, đề xuất từ TNV.':'Gửi góp ý, đề xuất hoặc phản ánh cho ban điều phối. Ban quản lý sẽ xem và phản hồi tại đây.')+'</div></div>';

  var form = '<div class="card"><div class="section-title">Gửi góp ý mới</div>' +
    '<form id="feedbackForm">' +
      '<div class="field"><label>Chủ đề</label><select name="category">'+Object.keys(FEEDBACK_CATEGORY).map(function(k){return '<option value="'+k+'">'+FEEDBACK_CATEGORY[k]+'</option>';}).join('')+'</select></div>' +
      '<div class="field"><label>Nội dung</label><textarea name="content" placeholder="Chia sẻ ý kiến, đề xuất hoặc vấn đề bạn gặp phải…" required></textarea></div>' +
      '<button class="btn btn-primary" type="submit">Gửi góp ý</button>' +
    '</form></div>';

  var list = feedbackList();
  var listCard = '<div class="card"><div class="section-title">'+(mgr?'Tất cả góp ý':'Góp ý của tôi')+' ('+list.length+')</div>' +
    (list.length ? list.map(function(f){
      var statusLabel = f.status==='new'?'Chưa xem':f.status==='reviewed'?'Đã phản hồi':'Đã xử lý';
      var statusClass = f.status==='new'?'coral':f.status==='reviewed'?'marigold':'sage';
      return '<div class="card" style="margin:0 0 10px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;">' +
          '<div><span class="name" style="font-weight:700;">'+escapeHtml(FEEDBACK_CATEGORY[f.category]||f.category)+'</span>' +
          (mgr ? ' <span class="hint" style="margin:0;">— '+escapeHtml(profileName(f.uid))+'</span>' : '') +
          '</div><span class="chip '+statusClass+'">'+statusLabel+'</span>' +
        '</div>' +
        '<div style="font-size:13.5px;white-space:pre-wrap;margin-top:6px;">'+escapeHtml(f.content)+'</div>' +
        '<div class="hint" style="margin-top:6px;">'+new Date(f.createdAt||0).toLocaleString('vi-VN')+'</div>' +
        (f.response ? '<div class="divider"></div><div class="section-title" style="margin-bottom:4px;">Phản hồi từ ban quản lý</div><div style="font-size:13.5px;white-space:pre-wrap;">'+escapeHtml(f.response)+'</div>' : '') +
        (mgr ? (
          '<div class="divider"></div>' +
          '<textarea data-fb-response="'+f.id+'" placeholder="Viết phản hồi cho TNV…">'+escapeHtml(f.response||'')+'</textarea>' +
          '<div style="margin-top:8px;display:flex;gap:8px;">' +
            '<button class="btn btn-sm btn-primary" data-action="fb-respond" data-id="'+f.id+'">Lưu phản hồi</button>' +
            (f.status!=='resolved' ? '<button class="btn btn-sm" data-action="fb-resolve" data-id="'+f.id+'">Đánh dấu đã xử lý</button>' : '') +
          '</div>'
        ) : '') +
      '</div>';
    }).join('') : '<div class="empty">'+(mgr?'Chưa có góp ý nào.':'Bạn chưa gửi góp ý nào.')+'</div>') +
  '</div>';

  return head + form + listCard;
}
async function submitFeedback(category, content){
  if(!content || !content.trim()){ toast('Vui lòng nhập nội dung góp ý.'); return; }
  try{
    await S.db.collection('feedback').add({uid:S.uid, category:category, content:content.trim(), status:'new', createdAt:Date.now(), response:'', respondedAt:null});
    toast('Đã gửi góp ý. Cảm ơn bạn!');
  }catch(e){ toast('Không thể gửi góp ý.'); }
}
async function respondFeedback(id, response){
  try{ await S.db.doc('feedback/'+id).update({response:response, status:'reviewed', respondedAt:Date.now(), respondedBy:S.uid}); toast('Đã lưu phản hồi.'); }
  catch(e){ toast('Không thể lưu phản hồi.'); }
}
async function markFeedbackResolved(id){
  try{ await S.db.doc('feedback/'+id).update({status:'resolved'}); toast('Đã đánh dấu đã xử lý.'); }
  catch(e){ toast('Không thể cập nhật.'); }
}

function bindFeedbackEvents(){
  // feedback
  var feedbackForm = document.getElementById('feedbackForm');
  if(feedbackForm) feedbackForm.addEventListener('submit', function(ev){
    ev.preventDefault(); var fd = new FormData(feedbackForm);
    submitFeedback(fd.get('category'), fd.get('content'));
    feedbackForm.reset();
  });
  document.querySelectorAll('[data-action="fb-respond"]').forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-id');
      var ta = document.querySelector('[data-fb-response="'+id+'"]');
      respondFeedback(id, ta ? ta.value : '');
    });
  });
  document.querySelectorAll('[data-action="fb-resolve"]').forEach(function(el){
    el.addEventListener('click', function(){ markFeedbackResolved(el.getAttribute('data-id')); });
  });

}
