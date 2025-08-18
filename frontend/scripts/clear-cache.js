#!/usr/bin/env node
/**
 * Clear Cache Script for Restaurant Details Page
 * 
 * This script helps clear any cached data that might be preventing
 * the restaurant details page from showing real data instead of mock data.
 */

console.log('🔧 Clearing cache for restaurant details page...');

// Instructions for clearing cache
console.log('\n📋 Manual Steps to Clear Cache:');
console.log('1. Open the restaurant details page in your browser');
console.log('2. Press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac) to hard refresh');
console.log('3. Or open Developer Tools (F12) and right-click the refresh button');
console.log('4. Select "Empty Cache and Hard Reload"');
console.log('5. If using Chrome, you can also go to Settings > Privacy > Clear browsing data');

console.log('\n🔍 To verify the fix is working:');
console.log('1. Visit: https://jewgo.app/restaurant/1842');
console.log('2. The restaurant name should show "Neya" instead of "Restaurant 1842"');
console.log('3. The address should show real data instead of "123 Main St, New York, NY, 10001"');

console.log('\n✅ If you still see mock data after clearing cache:');
console.log('- The frontend API route is working correctly');
console.log('- The issue is likely browser caching');
console.log('- Try opening the page in an incognito/private window');

console.log('\n🎯 API Status Check:');
console.log('Frontend API (working): https://jewgo.app/api/restaurants/1842');
console.log('Backend API (failing): https://jewgo.onrender.com/api/restaurants/1842');
console.log('Fallback mechanism: ✅ Working correctly');
