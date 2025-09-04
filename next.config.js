  // Backend API URL for development
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL 
    ? (isProduction ? null : process.env.NEXT_PUBLIC_BACKEND_URL)
    : (isProduction ? null : 'https://api.jewgo.app'); // Use production API
