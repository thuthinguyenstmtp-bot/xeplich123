'use strict';
function profileName(uid){ var p=S.profiles[uid]; if(uid===S.uid) return (p&&p.name)||'Bạn'; return (p&&p.name)||'Thành viên'; }
function profileAvatar(uid){ var p=S.profiles[uid]; return (p&&p.avatarUrl)||''; }
function roleOf(uid){ return (S.roles[uid]&&S.roles[uid].role)||'volunteer'; }
function roleAllowed(tab){ return S.myRole && tab.roles.indexOf(S.myRole)!==-1; }
function isPaused(uid){ return !!(S.volunteerProfiles[uid] && S.volunteerProfiles[uid].paused); }
function canManage(){ return S.myRole==='admin' || S.myRole==='coordinator'; }
function classesForDay(dow){ return S.classes.filter(function(c){ return c.dayOfWeek===dow; }); }
function assignedIds(classId){ var a=S.assignments[classId]; return a?(a.tnvIds||[]):[]; }
function myAssignedClasses(){ return S.classes.filter(function(c){ return assignedIds(c.id).indexOf(S.uid)!==-1; }); }
function eligibleForClass(cls, excludeIds){
  excludeIds = excludeIds || [];
  var out = [];
  Object.keys(S.availability).forEach(function(uid){
    if(isPaused(uid)) return;
    if(excludeIds.indexOf(uid)!==-1) return;
    var slots = (S.availability[uid].slots)||[];
    var ok = slots.some(function(s){ return s.dayOfWeek===cls.dayOfWeek && timeOverlap(s.start,s.end,cls.start,cls.end); });
    if(ok) out.push(uid);
  });
  return out;
}
function attendanceKey(classId, date){ return classId+'__'+date; }
function leaveRequestsFor(classId, date){
  return Object.keys(S.leaveRequests).map(function(id){ return Object.assign({id:id}, S.leaveRequests[id]); })
    .filter(function(r){ return r.classId===classId && r.date===date && r.status!=='cancelled'; });
}
function effectiveAssignedForDate(classId, date){
  var ids = assignedIds(classId).slice();
  var subs = {}; // uid(coveredBy) -> originalUid
  leaveRequestsFor(classId, date).forEach(function(r){
    var idx = ids.indexOf(r.requestedBy);
    if(idx!==-1) ids.splice(idx,1);
    if(r.status==='covered' && r.coveredBy && ids.indexOf(r.coveredBy)===-1){
      ids.push(r.coveredBy);
      subs[r.coveredBy] = r.requestedBy;
    }
  });
  return {ids:ids, subs:subs};
}
function allOpenLeaveRequests(){
  return Object.keys(S.leaveRequests).map(function(id){ return Object.assign({id:id}, S.leaveRequests[id]); })
    .filter(function(r){ return r.status==='open'; })
    .sort(function(a,b){ return (a.date||'').localeCompare(b.date||''); });
}
function myLeaveRequests(){
  return Object.keys(S.leaveRequests).map(function(id){ return Object.assign({id:id}, S.leaveRequests[id]); })
    .filter(function(r){ return r.requestedBy===S.uid; })
    .sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
}
function attendanceStatsInRange(fromDate, toDate){
  var stats = {}; // uid -> {present,absent}
  Object.keys(S.studentWeekSchedule).forEach(function(key){
    var sched = S.studentWeekSchedule[key];
    Object.keys(sched.days||{}).forEach(function(dow){
      var cell = sched.days[dow];
      if(!cell || !cell.tnvUid) return;
      if(cell.tnvStatus!=='present' && cell.tnvStatus!=='absent') return;
      var date = addDays(sched.weekStart, (+dow)-1);
      if(date<fromDate || date>toDate) return;
      stats[cell.tnvUid] = stats[cell.tnvUid] || {present:0, absent:0};
      stats[cell.tnvUid][cell.tnvStatus]++;
    });
  });
  return stats;
}
function birthdaysThisMonth(){
  var nowMonth = new Date().getMonth()+1;
  var out = [];
  Object.keys(S.volunteerProfiles).forEach(function(uid){
    var dob = S.volunteerProfiles[uid].dob;
    if(!dob) return;
    var parts = dob.split('-');
    if(parts.length!==3) return;
    var m = +parts[1], d = +parts[2];
    if(m===nowMonth) out.push({uid:uid, month:pad(m), day:pad(d)});
  });
  out.sort(function(a,b){ return (+a.day)-(+b.day); });
  return out;
}
function understaffedClasses(){
  return S.classes.filter(function(c){ return assignedIds(c.id).length < (c.needed||1); });
}
function isApproved(uid){
  var r = S.roles[uid];
  if(!r) return true;
  if(r.role!=='volunteer') return true;
  return r.approved!==false;
}
function pendingApprovals(){
  return Object.keys(S.roles).filter(function(uid){ return S.roles[uid].role==='volunteer' && S.roles[uid].approved===false; })
    .sort(function(a,b){ return (S.roles[a].createdAt||0)-(S.roles[b].createdAt||0); });
}

var AUDIT_LABEL = {
  role_change:'Đổi vai trò', approve_volunteer:'Duyệt TNV mới', pause_toggle:'Đổi trạng thái tạm nghỉ',
  class_delete:'Xoá lớp học', class_create:'Tạo lớp học', add_person:'Thêm người vào hệ thống', rules_update:'Cập nhật nội quy'
};
async function logAudit(action, meta){
  try{ await S.db.collection('auditLog').add({actorUid:S.uid, action:action, meta:meta||{}, createdAt:Date.now()}); }
  catch(e){}
}
function auditLogList(){
  return Object.keys(S.auditLog).map(function(id){ return Object.assign({id:id}, S.auditLog[id]); })
    .sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
}

function presentSessionsAll(uid){
  var out = [];
  Object.keys(S.studentWeekSchedule).forEach(function(key){
    var sched = S.studentWeekSchedule[key];
    Object.keys(sched.days||{}).forEach(function(dow){
      var cell = sched.days[dow];
      if(cell && cell.tnvUid===uid && (cell.tnvStatus==='present' || cell.tnvStatus==='absent')){
        var date = addDays(sched.weekStart, (+dow)-1);
        out.push({date:date, status:cell.tnvStatus});
      }
    });
  });
  out.sort(function(x,y){ return x.date<y.date?-1:(x.date>y.date?1:0); });
  return out;
}
function presentCountAll(uid){
  return presentSessionsAll(uid).filter(function(s){ return s.status==='present'; }).length;
}
function totalHoursAll(uid){
  var count = presentSessionsAll(uid).filter(function(s){ return s.status==='present'; }).length;
  return Math.round(count*1.5*10)/10; // ước tính 1.5 giờ/buổi
}
function currentStreak(uid){
  var sessions = presentSessionsAll(uid);
  var streak = 0;
  for(var i=sessions.length-1;i>=0;i--){
    if(sessions[i].status==='present') streak++;
    else break;
  }
  return streak;
}
function consecutiveAbsences(uid){
  var sessions = presentSessionsAll(uid);
  var streak = 0;
  for(var i=sessions.length-1;i>=0;i--){
    if(sessions[i].status==='absent') streak++;
    else break;
  }
  return streak;
}
function flaggedForAbsences(){
  return Object.keys(S.roles).filter(function(uid){ return consecutiveAbsences(uid) >= 2; });
}

var BADGE_DEFS = [
  {id:'first', label:'Buổi đầu tiên', desc:'Hoàn thành buổi dạy đầu tiên', test:function(uid){ return presentCountAll(uid)>=1; }},
  {id:'ten', label:'10 buổi dạy', desc:'Đã dạy đủ 10 buổi', test:function(uid){ return presentCountAll(uid)>=10; }},
  {id:'fifty', label:'50 buổi dạy', desc:'Đã dạy đủ 50 buổi — một hành trình bền bỉ', test:function(uid){ return presentCountAll(uid)>=50; }},
  {id:'hundred', label:'100 buổi dạy', desc:'Cột mốc 100 buổi dạy tình nguyện', test:function(uid){ return presentCountAll(uid)>=100; }},
  {id:'streak5', label:'Chuỗi 5 buổi', desc:'5 buổi liên tiếp không vắng', test:function(uid){ return currentStreak(uid)>=5; }},
  {id:'streak10', label:'Chuỗi 10 buổi', desc:'10 buổi liên tiếp không vắng', test:function(uid){ return currentStreak(uid)>=10; }}
];
function badgesForUid(uid){
  return BADGE_DEFS.map(function(b){ return {id:b.id, label:b.label, desc:b.desc, earned:b.test(uid)}; });
}
function monthlyLeaderboard(){
  var from = addDays(todayStr(), -29);
  var stats = attendanceStatsInRange(from, todayStr());
  return Object.keys(S.roles).map(function(uid){
    var s = stats[uid]||{present:0,absent:0};
    return {uid:uid, present:s.present};
  }).filter(function(x){ return x.present>0; }).sort(function(a,b){ return b.present-a.present; });
}
function celebrationsToday(){
  var out = [];
  var t = new Date();
  var tm = pad(t.getMonth()+1), td = pad(t.getDate());
  Object.keys(S.volunteerProfiles).forEach(function(uid){
    var vp = S.volunteerProfiles[uid];
    if(vp.dob){
      var p = vp.dob.split('-');
      if(p.length===3 && p[1]===tm && p[2]===td) out.push({uid:uid, type:'birthday'});
    }
    if(vp.joinDate){
      var p2 = vp.joinDate.split('-');
      if(p2.length===3 && p2[1]===tm && p2[2]===td && p2[0]!==(''+t.getFullYear())){
        out.push({uid:uid, type:'anniversary', years: t.getFullYear()-(+p2[0])});
      }
    }
  });
  return out;
}
function monthsSince(dateStr){
  if(!dateStr) return null;
  var d = new Date(dateStr+'T00:00:00');
  var now = new Date();
  return Math.max(0, (now.getFullYear()-d.getFullYear())*12 + (now.getMonth()-d.getMonth()));
}

async function notify(message){
  try{ await S.db.collection('notifications').add({actorUid:S.uid, message:message, createdAt:Date.now()}); }
  catch(e){}
}
