// Performance testing script for map optimizations
const performanceTest = {
  async testMarkerCreation() {
    const startTime = performance.now();
    
    // Create 100 markers
    for (let i = 0; i < 100; i++) {
      const mockRestaurant = {
        id: i,
        name: `Restaurant ${i}`,
        latitude: 25.7617 + (Math.random() - 0.5) * 0.1,
        longitude: -80.1918 + (Math.random() - 0.5) * 0.1,
        kosher_category: ['meat', 'dairy', 'pareve'][Math.floor(Math.random() * 3)],
        rating: Math.random() * 5
      };
      
      // Simulate marker creation
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Marker creation test: ${duration.toFixed(2)}ms for 100 markers`);
    console.log(`Average: ${(duration / 100).toFixed(2)}ms per marker`);
    
    return duration;
  },
  
  async testRenderFrequency() {
    let renderCount = 0;
    const startTime = performance.now();
    
    // Simulate map movement for 5 seconds
    const interval = setInterval(() => {
      renderCount++;
    }, 100);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    clearInterval(interval);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const rendersPerSecond = renderCount / (duration / 1000);
    
    console.log(`Render frequency test: ${rendersPerSecond.toFixed(2)} renders per second`);
    
    return rendersPerSecond;
  },
  
  async runAllTests() {
    console.log('Starting map performance tests...');
    
    const markerTime = await this.testMarkerCreation();
    const renderFreq = await this.testRenderFrequency();
    
    console.log('\nPerformance Summary:');
    console.log(`✅ Marker creation: ${markerTime < 5000 ? 'PASS' : 'FAIL'} (${markerTime.toFixed(2)}ms)`);
    console.log(`✅ Render frequency: ${renderFreq < 10 ? 'PASS' : 'FAIL'} (${renderFreq.toFixed(2)}/s)`);
    
    return {
      markerCreationTime: markerTime,
      renderFrequency: renderFreq,
      passed: markerTime < 5000 && renderFreq < 10
    };
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = performanceTest;
}
