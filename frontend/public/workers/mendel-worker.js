/* Minimal fallback build in case import.meta.url worker URL fails */
self.onmessage = function(e){
  const data = e.data || {};
  if (data.type !== 'FILTER_RESTAURANTS') {return;}
  const payload = data.payload || {};
  const restaurants = Array.isArray(payload.restaurants) ? payload.restaurants : [];
  const searchQuery = (payload.searchQuery || '').toString().toLowerCase().trim();
  const activeFilters = payload.activeFilters || {};
  const userLocation = payload.userLocation || null;
  function toLower(_v){return typeof v === 'string' ? v.toLowerCase() : ''}
  function dist(lat1, lon1, lat2, lon2){
    const R=3959;const dLat=(lat2-lat1)*Math.PI/180;const dLon=(lon2-lon1)*Math.PI/180;
    const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));return R*c;
  }
  function timeToMinute_s(s){
    const m=(s||'').toString().toLowerCase().trim().match(/(\d+):?(\d*)\s*(am|pm)/);if(!m||!m[1]||!m[3]){return -1;}let h=parseInt(m[1],10);const min=m[2]?parseInt(m[2],10):0;const p=m[3];if(p==='pm'&&h!==12){h+=12;}if(p==='am'&&h===12){h=0;}return h*60+min;
  }
  function openNow(_r){
    const raw=r.hours_of_operation;if(!raw) {return false;}let hours;try{hours=typeof raw==='string'?JSON.parse(raw):raw;}catch(e){return false}
    if(!Array.isArray(hours)){return false;}const now=new Date();const day=now.toLocaleDateString('en-US',{weekday:'long'}).toLowerCase();const t=now.getHours()*60+now.getMinutes();const today=hours.find((h) =>{return h&&toLower(h.day)===day});if(!today){return false;}const o=timeToMinute_s(today.open||'');const c=timeToMinute_s(today.close||'');if(o===-1||c===-1){return false;}return c<o?(t>=o||t<=c):(t>=o&&t<=c);
  }
  const agency = toLower(activeFilters.agency);
  const dietary = toLower(activeFilters.dietary);
  const category = toLower(activeFilters.category);
  const limitDistance = activeFilters.distanceMi || activeFilters.maxDistanceMi || activeFilters.distanceRadius || activeFilters.maxDistance;
  const filtered = restaurants.filter((r) =>{
    if(!r||typeof r!=='object'){return false;}
    if (searchQuery) {
      const name=toLower(r.name), addr=toLower(r.address), city=toLower(r.city), state=toLower(r.state);
      const lt=toLower((r.listing_type||'')); const cert=toLower(r.certifying_agency);
      if(!(name.includes(searchQuery)||addr.includes(searchQuery)||city.includes(searchQuery)||state.includes(searchQuery)||lt.includes(searchQuery)||cert.includes(searchQuery))) {return false;}
    }
    if (agency) {
      if (!toLower(r.certifying_agency).includes(agency)) {return false;}
    }
    if (dietary) {
      const k=toLower(r.kosher_category);
      if((dietary==='meat'||dietary==='dairy'||dietary==='pareve')&&k!==dietary) {return false;}
    }
    if (category) {
      if (!toLower(r.listing_type||'').includes(category)) {return false;}
    }
    if (activeFilters.openNow) {
      if (!openNow(r)) {return false;}
    }
    if (activeFilters.nearMe && userLocation && r.latitude && r.longitude && limitDistance) {
      const d=dist(userLocation.latitude,userLocation.longitude,Number(r.latitude),Number(r.longitude));
      if (d>limitDistance) {return false;}
    }
    return true;
  });
  if (userLocation) {
    filtered.sort((a,b) =>{
      if(!(a.latitude&&a.longitude)&& (b.latitude&&b.longitude)) {return 1;}
      if((a.latitude&&a.longitude)&& !(b.latitude&&b.longitude)) {return -1;}
      if(!(a.latitude&&a.longitude)&& !(b.latitude&&b.longitude)) {return 0;}
      const da=dist(userLocation.latitude,userLocation.longitude,Number(a.latitude),Number(a.longitude));
      const db=dist(userLocation.latitude,userLocation.longitude,Number(b.latitude),Number(b.longitude));
      return da-db;
    });
  }
  self.postMessage({ type:'FILTER_RESTAURANTS_RESULT', payload:{ restaurants: filtered } });
};
