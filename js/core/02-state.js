'use strict';
var S = {
  ready:false, fatal:null, uid:null, me:null, myRole:null, db:null, userCap:null, downloadsCap:null,
  activeTab:'my-schedule',
  classes:[], classesById:{},
  availability:{},
  assignments:{},
  roles:{},
  profiles:{},
  attendance:{},           // ALL attendance docs, key classId__date
  volunteerProfiles:{},
  students:{},
  studentAttendance:{},
  sessionNotes:{},
  leaveRequests:{},
  feedback:{},
  materials:{},
  discussions:{},
  announcements:{},
  auditLog:{},
  notifications:{},
  notifPanelOpen:false,
  rulesDoc:null,
  attendanceDate: todayStr(),
  mobileNavOpen:false,
  scheduling:false,
  bannerDismissed:{},
  studentsClassFilter:null,
  gridFilterMine:false,
  gridFilterLocation:'',
  editingMyProfile:false,
  availFormMode:null,
  expandedNotes:{},
  feedStudentFilter:'',
  progressStudentId:null,
  materialsClassFilter:null,
  scheduleWeekStart: null,
  dayTimes:{},
  studentWeekSchedule:{},
  locationsInfo:{},
  emergencyContacts:{},
  profile360Uid:null,
  leaderboardVisible: (localStorage.getItem('tnv-leaderboard-hide')!=='1'),
  themeMode: localStorage.getItem('tnv-theme-mode') || 'system'
};

function todayStr(){ var d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function pad(n){ return n<10?'0'+n:''+n; }
function escapeHtml(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function timeOverlap(aS,aE,bS,bE){ return aS < bE && bS < aE; }
function toMin(hhmm){ var p=(hhmm||'0:0').split(':'); return (+p[0])*60+(+p[1]); }
function addDays(dateStr, n){ var d = new Date(dateStr+'T00:00:00'); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function fmtDateVN(dateStr){ var d=new Date(dateStr+'T00:00:00'); return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear(); }
function mondayOf(dateStr){
  var d = new Date(dateStr+'T00:00:00');
  var dow = d.getDay();
  var diff = dow===0 ? -6 : (1-dow);
  d.setDate(d.getDate()+diff);
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}

var SUBJECT_COLORS = {
  'Toán':'#5B8C5A', 'Tiếng Việt':'#C97A9A', 'Văn':'#C97A9A', 'Tiếng Anh':'#E2A63B', 'Anh':'#E2A63B',
  'Lý':'#4E7FB5', 'Vật lý':'#4E7FB5', 'Hoá':'#8B6FB0', 'Hóa':'#8B6FB0', 'Sinh':'#4FA37A',
  'Kỹ năng sống':'#B0793F', 'Âm nhạc':'#B0578A', 'Mỹ thuật':'#7A8FB0'
};
function subjectColor(subj){ return SUBJECT_COLORS[(subj||'').trim()] || null; }
function applyTheme(){
  try{
    if(S.themeMode==='light') document.documentElement.setAttribute('data-theme','light');
    else if(S.themeMode==='dark') document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
  }catch(e){}
}
applyTheme();

