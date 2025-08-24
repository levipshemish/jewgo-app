/**
 * Debug script to test location storage functionality
 * Run this in browser console to diagnose location storage issues
 */

(function() {
  console.log('🔍 Starting Location Storage Diagnostic...');
  
  // Check if localStorage is available
  function checkLocalStorageAvailable() {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      console.log('✅ localStorage is available');
      return true;
    } catch (e) {
      console.error('❌ localStorage is not available:', e);
      return false;
    }
  }
  
  // Check current location data in localStorage
  function checkLocationData() {
    console.log('\n📍 Checking location data in localStorage...');
    
    const locationKey = 'jewgo_location_data';
    const locationData = localStorage.getItem(locationKey);
    
    if (locationData) {
      try {
        const parsed = JSON.parse(locationData);
        console.log('✅ Location data found:', parsed);
        
        if (parsed.userLocation && parsed.userLocation.timestamp) {
          const age = Date.now() - parsed.userLocation.timestamp;
          const ageMinutes = Math.floor(age / (1000 * 60));
          console.log(`📅 Location age: ${ageMinutes} minutes`);
          
          if (age > 60 * 60 * 1000) {
            console.log('⚠️ Location data is older than 1 hour and may be expired');
          }
        }
      } catch (e) {
        console.error('❌ Error parsing location data:', e);
        console.log('Raw data:', locationData);
      }
    } else {
      console.log('❌ No location data found in localStorage');
    }
  }
  
  // Check geolocation API availability and permissions
  async function checkGeolocationAPI() {
    console.log('\n🌍 Checking Geolocation API...');
    
    if (!navigator.geolocation) {
      console.error('❌ Geolocation API not supported');
      return;
    }
    
    console.log('✅ Geolocation API is available');
    
    // Check permissions API if available
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({name: 'geolocation'});
        console.log(`📋 Permission status: ${permission.state}`);
        
        permission.addEventListener('change', () => {
          console.log(`📋 Permission changed to: ${permission.state}`);
        });
      } catch (e) {
        console.log('⚠️ Could not check permission status:', e.message);
      }
    }
  }
  
  // Test location storage and retrieval
  function testLocationStorage() {
    console.log('\n🧪 Testing location storage...');
    
    const testLocation = {
      latitude: 25.7617,
      longitude: -80.1918,
      timestamp: Date.now()
    };
    
    const testData = {
      userLocation: testLocation,
      permissionStatus: 'granted',
      lastUpdated: new Date().toISOString()
    };
    
    try {
      localStorage.setItem('jewgo_location_data', JSON.stringify(testData));
      console.log('✅ Test location data stored successfully');
      
      const retrieved = localStorage.getItem('jewgo_location_data');
      const parsed = JSON.parse(retrieved);
      
      if (parsed.userLocation.latitude === testLocation.latitude) {
        console.log('✅ Test location data retrieved successfully');
      } else {
        console.error('❌ Retrieved data does not match stored data');
      }
    } catch (e) {
      console.error('❌ Error testing location storage:', e);
    }
  }
  
  // Check for conflicting localStorage keys
  function checkConflictingKeys() {
    console.log('\n🔍 Checking for conflicting localStorage keys...');
    
    const keys = Object.keys(localStorage);
    const locationKeys = keys.filter(key => 
      key.includes('location') || 
      key.includes('geo') || 
      key.includes('position')
    );
    
    console.log('Location-related keys found:', locationKeys);
    
    locationKeys.forEach(key => {
      console.log(`  ${key}: ${localStorage.getItem(key)?.substring(0, 100)}...`);
    });
  }
  
  // Monitor localStorage changes
  function monitorStorageChanges() {
    console.log('\n👀 Monitoring localStorage changes...');
    
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    
    localStorage.setItem = function(key, value) {
      if (key.includes('location')) {
        console.log(`📝 Setting localStorage[${key}]:`, value.substring(0, 100) + '...');
      }
      return originalSetItem.call(this, key, value);
    };
    
    localStorage.removeItem = function(key) {
      if (key.includes('location')) {
        console.log(`🗑️ Removing localStorage[${key}]`);
      }
      return originalRemoveItem.call(this, key);
    };
    
    console.log('✅ localStorage monitoring enabled');
  }
  
  // Main diagnostic function
  async function runDiagnostic() {
    console.log('=' .repeat(50));
    console.log('🏥 Location Storage Health Check');
    console.log('=' .repeat(50));
    
    checkLocalStorageAvailable();
    checkLocationData();
    await checkGeolocationAPI();
    checkConflictingKeys();
    testLocationStorage();
    monitorStorageChanges();
    
    console.log('\n🎯 Diagnostic complete!');
    console.log('💡 If issues persist, check:');
    console.log('   - Browser privacy/incognito mode');
    console.log('   - Storage quota limits');
    console.log('   - Third-party cookies disabled');
    console.log('   - Browser extensions blocking storage');
  }
  
  // Run the diagnostic
  runDiagnostic();
  
  // Make functions available globally for manual testing
  window.locationDiagnostic = {
    checkLocationData,
    testLocationStorage,
    checkGeolocationAPI,
    checkConflictingKeys
  };
  
  console.log('\n🛠️ Manual testing functions available at window.locationDiagnostic');
})();
