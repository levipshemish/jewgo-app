'use client';

import { useState } from 'react';
import CustomHoursSelector from '@/components/forms/CustomHoursSelector';

export default function TestHoursPage() {
  const [hoursValue, setHoursValue] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Custom Hours Selector Test</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Current Value</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {hoursValue || 'No value set'}
          </pre>
        </div>

        <CustomHoursSelector
          value={hoursValue}
          onChange={setHoursValue}
          testMode={true}
        />

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Open the browser console to see detailed logging</li>
            <li>Try clicking on the time dropdowns to see if they open and stay open</li>
            <li>Check if any global event listeners are interfering</li>
            <li>Look for any error messages in the console</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
