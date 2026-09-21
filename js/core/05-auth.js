'use strict';
/* ============================== Auth & user directory (thay cho window.claude.use('user')) ============================== */
var parseUserCap = {
  id: function(){ var u = Parse.User.current(); return Promise.resolve(u ? u.id : null); },
  me: function(){
    var u = Parse.User.current();
    if(!u) return Promise.resolve(null);
    return Promise.resolve({ id:u.id, name:u.get('displayName')||u.get('username')||'Bạn', avatarUrl:'', canEdit:true });
  },
  profiles: async function(ids){
    if(!ids || !ids.length) return {};
    var q = new Parse.Query(Parse.User);
    q.containedIn('objectId', ids);
    q.limit(1000);
    var results = await q.find();
    var out = {};
    results.forEach(function(u){ out[u.id] = { id:u.id, name:u.get('displayName')||u.get('username')||'Thành viên', avatarUrl:'' }; });
    return out;
  },
  search: async function(text){
    if(!text) return [];
    var safe = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var q = new Parse.Query(Parse.User);
    q.matches('displayName', safe, 'i');
    q.limit(20);
    var results = await q.find();
    return results.map(function(u){ return { id:u.id, name:u.get('displayName')||u.get('username'), avatarUrl:'' }; });
  }
};
var parseDownloadsCap = {
  save: async function(opts){
    var blob = (opts.data instanceof Blob) ? opts.data : new Blob([opts.data], {type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = opts.filename;
    document.body.appendChild(a); a.click();
    setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); }, 1500);
  }
};

async function doSignUp(username, password, displayName){
  var u = new Parse.User();
  u.set('username', username);
  u.set('password', password);
  u.set('displayName', displayName);
  await u.signUp();
  await onLoggedIn(u);
}
async function doLogIn(username, password){
  var u = await Parse.User.logIn(username, password);
  await onLoggedIn(u);
}
async function doLogOut(){
  try{ await Parse.User.logOut(); }catch(e){}
  location.reload();
}
async function onLoggedIn(user){
  S.uid = user.id;
  S.me = { id:user.id, name:user.get('displayName')||user.get('username')||'Bạn', avatarUrl:'', canEdit:true };

  try{
    var roleSnap = await S.db.doc('roles/'+S.uid).get();
    if(!roleSnap.exists){
      var countQ = new Parse.Query(Parse.User);
      var totalUsers = await countQ.count();
      var isFirstUser = totalUsers<=1; // người đầu tiên đăng ký sẽ tự động là Quản trị viên
      var initialRole = isFirstUser ? 'admin' : 'volunteer';
      await S.db.doc('roles/'+S.uid).set({role:initialRole, approved:isFirstUser, createdAt:Date.now(), updatedAt:Date.now(), selfRegistered:true});
    }
  }catch(e){}

  subscribeAll();
  scheduleRender();
}
async function init(){
  if(typeof Parse==='undefined'){
    S.fatal = 'Không tải được thư viện Parse SDK (kiểm tra kết nối mạng rồi tải lại trang).';
    render(); return;
  }
  if(BACK4APP_APP_ID.indexOf('YOUR_')===0 || BACK4APP_JS_KEY.indexOf('YOUR_')===0){
    S.fatal = 'Chưa cấu hình Back4App: mở file này, tìm BACK4APP_APP_ID và BACK4APP_JS_KEY ở đầu phần <script>, điền Application ID và JavaScript Key lấy từ Back4App Dashboard > App Settings > Security & Keys.';
    render(); return;
  }
  S.db = createParseDB();
  S.userCap = parseUserCap;
  S.downloadsCap = parseDownloadsCap;
  S.ready = true;

  var current = Parse.User.current();
  if(current){ await onLoggedIn(current); }
  render();
}
function mkSub(name, cb){
  S.db.collection(name).onSnapshot(function(qs){
    var m = {};
    qs.docs.forEach(function(d){ m[d.id] = d.data(); });
    cb(m);
    scheduleRender();
  }, function(e){ console.warn(name, e); });
}
function subscribeAll(){
  var db = S.db;

  db.doc('roles/'+S.uid).onSnapshot(function(snap){
    S.myRoleDoc = snap.exists ? snap.data() : null;
    S.myRole = snap.exists ? (snap.data().role||'volunteer') : null;
    if(!TABS.some(function(t){return t.id===S.activeTab && roleAllowed(t);})){ S.activeTab = 'my-schedule'; }
    scheduleRender();
  }, function(e){ console.warn('roles/self', e); });

  db.doc('settings/rules').onSnapshot(function(snap){
    S.rulesDoc = snap.exists ? snap.data() : null;
    scheduleRender();
  }, function(e){ console.warn('settings/rules', e); });

  db.doc('settings/dayTimes').onSnapshot(function(snap){
    S.dayTimes = snap.exists ? snap.data() : {};
    scheduleRender();
  }, function(e){ console.warn('settings/dayTimes', e); });

  mkSub('studentWeekSchedule', function(m){ S.studentWeekSchedule = m; });

  db.doc('settings/locations').onSnapshot(function(snap){
    S.locationsInfo = snap.exists ? snap.data() : {};
    scheduleRender();
  }, function(e){ console.warn('settings/locations', e); });

  mkSub('emergencyContacts', function(m){ S.emergencyContacts = m; });

  mkSub('roles', function(m){ S.roles = m; });

  db.collection('classes').orderBy('dayOfWeek','asc').onSnapshot(function(qs){
    var arr=[], byId={};
    qs.docs.forEach(function(d){ var v=Object.assign({id:d.id}, d.data()); arr.push(v); byId[d.id]=v; });
    arr.sort(function(a,b){ if(a.dayOfWeek!==b.dayOfWeek) return dayOrderIdx(a.dayOfWeek)-dayOrderIdx(b.dayOfWeek); return (a.start||'').localeCompare(b.start||''); });
    S.classes = arr; S.classesById = byId;
    scheduleRender();
  }, function(e){ console.warn('classes', e); });

  mkSub('availability', function(m){ S.availability = m; });
  mkSub('assignments', function(m){ S.assignments = m; });
  mkSub('attendance', function(m){ S.attendance = m; });
  mkSub('volunteerProfiles', function(m){ S.volunteerProfiles = m; });
  mkSub('students', function(m){ S.students = m; });
  mkSub('studentAttendance', function(m){ S.studentAttendance = m; });
  mkSub('sessionNotes', function(m){ S.sessionNotes = m; });
  mkSub('leaveRequests', function(m){ S.leaveRequests = m; });
  mkSub('feedback', function(m){ S.feedback = m; });
  mkSub('materials', function(m){ S.materials = m; });
  mkSub('discussions', function(m){ S.discussions = m; });
  mkSub('announcements', function(m){ S.announcements = m; });
  mkSub('auditLog', function(m){ S.auditLog = m; });
  mkSub('notifications', function(m){ S.notifications = m; });
}
async function refreshProfilesAndRender(){
  var ids = {};
  ids[S.uid]=1;
  Object.keys(S.roles).forEach(function(id){ ids[id]=1; });
  Object.keys(S.availability).forEach(function(id){ ids[id]=1; });
  Object.values(S.assignments).forEach(function(a){ (a.tnvIds||[]).forEach(function(id){ ids[id]=1; }); });
  Object.values(S.attendance).forEach(function(a){ Object.keys(a.records||{}).forEach(function(id){ ids[id]=1; }); });
  Object.values(S.leaveRequests).forEach(function(r){ if(r.requestedBy) ids[r.requestedBy]=1; if(r.coveredBy) ids[r.coveredBy]=1; });
  Object.values(S.feedback).forEach(function(f){ if(f.uid) ids[f.uid]=1; });
  Object.values(S.materials).forEach(function(m){ if(m.addedBy) ids[m.addedBy]=1; });
  Object.values(S.discussions).forEach(function(d){ if(d.uid) ids[d.uid]=1; });
  Object.values(S.announcements).forEach(function(a){ if(a.createdBy) ids[a.createdBy]=1; });
  Object.values(S.auditLog).forEach(function(a){ if(a.actorUid) ids[a.actorUid]=1; if(a.targetUid) ids[a.targetUid]=1; });
  Object.values(S.notifications).forEach(function(n){ if(n.actorUid) ids[n.actorUid]=1; });
  var idList = Object.keys(ids);
  try{ S.profiles = await S.userCap.profiles(idList); }catch(e){}
  render();
}
