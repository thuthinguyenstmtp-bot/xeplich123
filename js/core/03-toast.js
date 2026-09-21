'use strict';
var renderTimer = null;
function toast(msg){
  var wrap = document.getElementById('toastWrap');
  var el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(function(){ el.remove(); }, 3400);
}
function scheduleRender(){
  if(renderTimer) return;
  renderTimer = setTimeout(function(){ renderTimer=null; refreshProfilesAndRender(); }, 40);
}
