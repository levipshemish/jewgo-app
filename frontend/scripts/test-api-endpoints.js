const fetch = require('node-fetch');

async function testAPIEndpoints() {
  const baseUrl = 'http://localhost:3000'
  
  try {
    // Test password reset request
    const resetResponse = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: process.env.SMTP_USER || 'test@example.com'
      })
    })
    
    const resetData = await resetResponse.json()
    console.log(`Password reset response: ${JSON.stringify(resetData)}`)
    
    if (resetResponse.ok) {
      console.log('✅ Password reset request successful');
    } else {
      console.log('❌ Password reset request failed');
    }
    
  } catch (error) {
    console.error('❌ API test failed:');
    console.error(error.message);
  }
}

testAPIEndpoints()
