'use strict';
/* ============================== CONFIG — điền thông tin ứng dụng Back4App của bạn ============================== */
var BACK4APP_APP_ID = 'VC26pNJh2lPiR6rfQ8hqRpicalMKB7yZWuMTnHjU';
var BACK4APP_JS_KEY  = 'Lhg4RayAPL7ChFQ7VxcykVanFMPSgD2nztax2dXo';
var BACK4APP_SERVER_URL = 'https://parseapi.back4app.com/';
// Tuỳ chọn: bật Live Query trong Back4App Dashboard (App Settings > Server Settings > Live Query),
// rồi dán URL Live Query vào đây (dạng wss://...). Để trống vẫn chạy được — app sẽ tự làm mới
// dữ liệu định kỳ (polling) thay vì cập nhật tức thời.
var BACK4APP_LIVE_QUERY_URL = '';
var POLL_INTERVAL_MS = 12000;

if(typeof Parse !== 'undefined'){
  Parse.initialize(BACK4APP_APP_ID, BACK4APP_JS_KEY);
  Parse.serverURL = BACK4APP_SERVER_URL;
  if(BACK4APP_LIVE_QUERY_URL){ Parse.liveQueryServerURL = BACK4APP_LIVE_QUERY_URL; }
}

function pdbApplyData(obj, data){
  Object.keys(data).forEach(function(k){
    var v = data[k];
    var key = (k==='createdAt') ? 'createdAtMs' : (k==='updatedAt') ? 'updatedAtMs' : k;
    if(v===null || v===undefined) obj.unset(key);
    else obj.set(key, v);
  });
}
function pdbToData(obj){
  var attrs = {};
  var raw = obj.attributes || {};
  Object.keys(raw).forEach(function(k){ attrs[k] = raw[k]; });
  if('createdAtMs' in attrs){ attrs.createdAt = attrs.createdAtMs; delete attrs.createdAtMs; }
  if('updatedAtMs' in attrs){ attrs.updatedAt = attrs.updatedAtMs; delete attrs.updatedAtMs; }
  delete attrs.docId;
  return attrs;
}
async function pdbFindByDocId(className, docId){
  var Cls = Parse.Object.extend(className);
  var q = new Parse.Query(Cls);
  q.equalTo('docId', docId);
  return await q.first();
}
function pdbLiveSubscribe(query, onChange){
  try{
    query.subscribe().then(function(sub){
      ['create','update','delete','enter','leave'].forEach(function(ev){ sub.on(ev, onChange); });
    }).catch(function(){ /* Live Query chưa bật/khả dụng — vẫn chạy nhờ polling */ });
  }catch(e){}
}
function createParseDB(){
  return {
    doc: function(path){
      var i = path.indexOf('/');
      var className = path.slice(0,i), docId = path.slice(i+1);
      return {
        get: async function(){
          var obj = await pdbFindByDocId(className, docId);
          return { exists: !!obj, data: function(){ return obj ? pdbToData(obj) : null; } };
        },
        set: async function(data){
          var obj = await pdbFindByDocId(className, docId);
          if(!obj){ var Cls = Parse.Object.extend(className); obj = new Cls(); obj.set('docId', docId); }
          pdbApplyData(obj, data);
          await obj.save();
        },
        update: async function(data){
          var obj = await pdbFindByDocId(className, docId);
          if(!obj){ var Cls = Parse.Object.extend(className); obj = new Cls(); obj.set('docId', docId); }
          pdbApplyData(obj, data);
          await obj.save();
        },
        delete: async function(){
          var obj = await pdbFindByDocId(className, docId);
          if(obj) await obj.destroy();
        },
        onSnapshot: function(cb, errCb){
          var stopped = false;
          function refresh(){
            if(stopped) return;
            pdbFindByDocId(className, docId).then(function(obj){
              cb({ exists: !!obj, data: function(){ return obj ? pdbToData(obj) : null; } });
            }).catch(function(e){ if(errCb) errCb(e); });
          }
          refresh();
          var poll = setInterval(refresh, POLL_INTERVAL_MS);
          var Cls = Parse.Object.extend(className);
          var q = new Parse.Query(Cls); q.equalTo('docId', docId);
          pdbLiveSubscribe(q, refresh);
          return function unsubscribe(){ stopped = true; clearInterval(poll); };
        }
      };
    },
    collection: function(name){
      var orderField = null, orderDir = 'asc';
      var ref = {
        orderBy: function(field, dir){ orderField = field; orderDir = dir; return ref; },
        add: async function(data){
          var Cls = Parse.Object.extend(name);
          var obj = new Cls();
          pdbApplyData(obj, data);
          await obj.save();
          return { id: obj.id };
        },
        onSnapshot: function(cb, errCb){
          var stopped = false;
          function refresh(){
            if(stopped) return;
            var Cls = Parse.Object.extend(name);
            var q = new Parse.Query(Cls);
            q.limit(2000);
            if(orderField){ if(orderDir==='desc') q.descending(orderField); else q.ascending(orderField); }
            q.find().then(function(results){
              var docs = results.map(function(o){
                var d = pdbToData(o);
                var docId = o.get('docId') || o.id;
                return { id: docId, data: function(){ return d; } };
              });
              cb({ docs: docs });
            }).catch(function(e){ if(errCb) errCb(e); });
          }
          refresh();
          var poll = setInterval(refresh, POLL_INTERVAL_MS);
          var Cls2 = Parse.Object.extend(name);
          var q2 = new Parse.Query(Cls2);
          pdbLiveSubscribe(q2, refresh);
          return function unsubscribe(){ stopped = true; clearInterval(poll); };
        }
      };
      return ref;
    }
  };
}
