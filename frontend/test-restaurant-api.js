#!/usr/bin/env node

// Test script to check restaurant API endpoints

async function testBackendAPI() {
  console.log('Testing Backend API directly...');
  try {
    const response = await fetch('https://api.jewgo.app/api/restaurants?limit=5');
    const data = await response.json();
    console.log('Backend API Status:', response.status);
    console.log('Total restaurants:', data.total);
    console.log('First restaurant:', data.restaurants[0]?.name);
    console.log('Image URL:', data.restaurants[0]?.image_url);
  } catch (error) {
    console.error('Backend API Error:', error.message);
  }
}

async function testFrontendAPI(port = 3000) {
  console.log('\nTesting Frontend API route...');
  try {
    const response = await fetch(`http://localhost:${port}/api/restaurants-with-images?limit=5`);
    const data = await response.json();
    console.log('Frontend API Status:', response.status);
    console.log('Success:', data.success);
    console.log('Total restaurants:', data.total);
    console.log('Restaurants returned:', data.data?.length);
    if (data.data?.length > 0) {
      console.log('First restaurant:', data.data[0]?.name);
      console.log('Image URL:', data.data[0]?.image_url);
    }
    console.log('Message:', data.message);
  } catch (error) {
    console.error('Frontend API Error:', error.message);
  }
}

// Run tests
(async () => {
  await testBackendAPI();
  await testFrontendAPI();
})();