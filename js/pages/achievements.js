'use strict';
var DAYS = [
  {v:1,label:'Thứ 2',short:'T2'},{v:2,label:'Thứ 3',short:'T3'},{v:3,label:'Thứ 4',short:'T4'},
  {v:4,label:'Thứ 5',short:'T5'},{v:5,label:'Thứ 6',short:'T6'},{v:6,label:'Thứ 7',short:'T7'},
  {v:0,label:'Chủ nhật',short:'CN'}
];
function dayLabel(v){ for(var i=0;i<DAYS.length;i++) if(DAYS[i].v===v) return DAYS[i].label; return '?'; }
function dayShort(v){ for(var i=0;i<DAYS.length;i++) if(DAYS[i].v===v) return DAYS[i].short; return '?'; }
function dayOrderIdx(v){ for(var i=0;i<DAYS.length;i++) if(DAYS[i].v===v) return i; return 99; }

var ROLE_LABEL = {admin:'Quản trị viên', coordinator:'Điều phối viên', volunteer:'Tình nguyện viên'};
var ROLE_ORDER = {admin:3, coordinator:2, volunteer:1};
var REASON_LABEL = {planned:'Xin nghỉ trước', sudden:'Báo bận đột xuất', noshow:'Không báo trước', other:'Khác'};

var TABS = [
  {id:'dashboard', label:'Tổng quan', group:'chung', roles:['admin','coordinator']},
  {id:'announcements', label:'Bảng tin', group:'chung', roles:['admin','coordinator','volunteer']},
  {id:'my-schedule', label:'Lịch của tôi', group:'chung', roles:['admin','coordinator','volunteer']},
  {id:'mystudents', label:'Học sinh của tôi', group:'chung', roles:['admin','coordinator','volunteer']},
  {id:'gridview', label:'Thời khoá biểu', group:'chung', roles:['admin','coordinator','volunteer']},
  {id:'availability', label:'Lịch rảnh & Hồ sơ', group:'chung', roles:['admin','coordinator','volunteer']},
  {id:'attendance', label:'Điểm danh', group:'chung', roles:['admin','coordinator','volunteer']},
  {id:'swap', label:'Đổi ca / Xin nghỉ', group:'chung', roles:['admin','coordinator','volunteer']},
  {id:'materials', label:'Tài liệu & Thảo luận', group:'chung', roles:['admin','coordinator','volunteer']},
  {id:'achievements', label:'Thành tích', group:'chung', roles:['admin','coordinator','volunteer']},
  {id:'utilities', label:'Tiện ích', group:'chung', roles:['admin','coordinator','volunteer']},
  {id:'feedback', label:'Góp ý', group:'chung', roles:['admin','coordinator','volunteer']},
  {id:'classes', label:'Lớp học', group:'quan-ly', roles:['admin','coordinator']},
  {id:'students', label:'Học sinh', group:'quan-ly', roles:['admin','coordinator']},
  {id:'autoschedule', label:'Xếp lịch tự động', group:'quan-ly', roles:['admin','coordinator']},
  {id:'reports', label:'Báo cáo', group:'quan-ly', roles:['admin','coordinator']},
  {id:'people', label:'Phân quyền & TNV', group:'quan-ly', roles:['admin']},
  {id:'profile360', label:'Hồ sơ 360° TNV', group:'quan-ly', roles:['admin','coordinator']},
  {id:'auditlog', label:'Nhật ký hoạt động', group:'quan-ly', roles:['admin']}
];
