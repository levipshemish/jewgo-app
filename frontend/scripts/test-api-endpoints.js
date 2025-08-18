const fetch = require('node-fetch')

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
    }`)
    
    if (resetResponse.ok) {
      } else {
      }
    
  } catch (error) {
    // console.error('❌ API test failed:')
    // console.error(error.message)
    }
}

testAPIEndpoints()
