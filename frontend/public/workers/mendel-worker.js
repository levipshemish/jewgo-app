/* Minimal fallback build in case import.meta.url worker URL fails */
self.onmessage = function(e){
  var data = e.data || {};
  if (data.type !== 'FILTER_RESTAURANTS') return;
  var payload = data.payload || {};
  var restaurants = Array.isArray(payload.restaurants) ? payload.restaurants : [];
  var searchQuery = (payload.searchQuery || '').toString().toLowerCase().trim();
  var activeFilters = payload.activeFilters || {};
  var userLocation = payload.userLocation || null;
  function toLower(_v){return typeof v === 'string' ? v.toLowerCase() : ''}
  function dist(lat1, lon1, lat2, lon2){
    var R=3959;var dLat=(lat2-lat1)*Math.PI/180;var dLon=(lon2-lon1)*Math.PI/180;
    var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    var c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));return R*c;
  }
  function timeToMinute_s(s){
    var m=(s||'').toString().toLowerCase().trim().match(/(\d+):?(\d*)\s*(am|pm)/);if(!m||!m[1]||!m[3])return -1;var h=parseInt(m[1],10);var min=m[2]?parseInt(m[2],10):0;var p=m[3];if(p==='pm'&&h!==12)h+=12;if(p==='am'&&h===12)h=0;return h*60+min;
  }
  function openNow(_r){
    var raw=r.hours_of_operation;if(!raw) return false;var hours;try{hours=typeof raw==='string'?JSON.parse(raw):raw;}catch(e){return false}
    if(!Array.isArray(hours))return false;var now=new Date();var day=now.toLocaleDateString('en-US',{weekday:'long'}).toLowerCase();var t=now.getHours()*60+now.getMinutes();var today=hours.find(function(h){return h&&toLower(h.day)===day});if(!today)return false;var o=timeToMinutes(today.open||'');var c=timeToMinutes(today.close||'');if(o===-1||c===-1)return false;return c<o?(t>=o||t<=c):(t>=o&&t<=c);
  }
  var agency = toLower(activeFilters.agency);
  var dietary = toLower(activeFilters.dietary);
  var category = toLower(activeFilters.category);
  var limitDistance = activeFilters.distanceRadius || activeFilters.maxDistance;
  var filtered = restaurants.filter(function(r){
    if(!r||typeof r!=='object')return false;
    if (searchQuery) {
      var name=toLower(r.name), addr=toLower(r.address), city=toLower(r.city), state=toLower(r.state);
      var lt=toLower((r.listing_type||'')); var cert=toLower(r.certifying_agency);
      if(!(name.includes(searchQuery)||addr.includes(searchQuery)||city.includes(searchQuery)||state.includes(searchQuery)||lt.includes(searchQuery)||cert.includes(searchQuery))) return false;
    }
    if (agency) {
      if (!toLower(r.certifying_agency).includes(agency)) return false;
    }
    if (dietary) {
      var k=toLower(r.kosher_category);
      if((dietary==='meat'||dietary==='dairy'||dietary==='pareve')&&k!==dietary) return false;
    }
    if (category) {
      if (!toLower(r.listing_type||'').includes(category)) return false;
    }
    if (activeFilters.openNow) {
      if (!openNow(r)) return false;
    }
    if (activeFilters.nearMe && userLocation && r.latitude && r.longitude && limitDistance) {
      var d=dist(userLocation.latitude,userLocation.longitude,Number(r.latitude),Number(r.longitude));
      if (d>limitDistance) return false;
    }
    return true;
  });
  if (userLocation) {
    filtered.sort(function(a,b){
      if(!(a.latitude&&a.longitude)&& (b.latitude&&b.longitude)) return 1;
      if((a.latitude&&a.longitude)&& !(b.latitude&&b.longitude)) return -1;
      if(!(a.latitude&&a.longitude)&& !(b.latitude&&b.longitude)) return 0;
      var da=dist(userLocation.latitude,userLocation.longitude,Number(a.latitude),Number(a.longitude));
      var db=dist(userLocation.latitude,userLocation.longitude,Number(b.latitude),Number(b.longitude));
      return da-db;
    });
  }
  self.postMessage({ type:'FILTER_RESTAURANTS_RESULT', payload:{ restaurants: filtered } });
};

