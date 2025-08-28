'use client';

import { useEffect, useState } from 'react';

export default function EnvCheck() {
  const [envVars, setEnvVars] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    // Check environment variables
    const vars = {
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
    };
    
    setEnvVars(vars);
    
    // console.log('Environment variables check:', vars);
  }, []);

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">Environment Variables Debug</h3>
      <div className="space-y-1">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="text-gray-300">{key}:</span>
            <span className={value ? 'text-green-400' : 'text-red-400'}>
              {value ? `${value.substring(0, 10)}...` : 'undefined'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
