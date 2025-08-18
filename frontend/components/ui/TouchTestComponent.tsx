'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTouchFeedback, useEnhancedTouch } from '@/lib/hooks/useTouchFeedback';
import { useMobileTouch } from '@/lib/hooks/useMobileTouch';
import { isMobileDevice } from '@/lib/utils/touchUtils';

export const TouchTestComponent: React.FC = () => {
  const router = useRouter();
  const [clickCount, setClickCount] = useState(0);
  const [touchCount, setTouchCount] = useState(0);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const { handleTouch } = useEnhancedTouch();
  const { handleImmediateTouch } = useMobileTouch();
  const {
    touchStyles,
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel,
    ref
  } = useTouchFeedback();

  const addDebugLog = (message: string) => {
    setDebugLog(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Test 1: Direct function call
  const handleDirectClick = () => {
    setClickCount(prev => prev + 1);
    addDebugLog('Direct click - counter incremented');
  };

  // Test 2: With handleImmediateTouch
  const handleTouchClick = handleImmediateTouch(() => {
    setClickCount(prev => prev + 1);
    addDebugLog('Touch click - counter incremented');
  });

  // Test 3: Navigation test
  const handleNavigationTest = handleImmediateTouch(() => {
    addDebugLog('Navigation test - would navigate to /eatery');
    // Uncomment to test actual navigation
    // router.push('/eatery');
  });

  // Test 4: State update test
  const handleStateUpdateTest = handleImmediateTouch(() => {
    setClickCount(prev => prev + 1);
    addDebugLog('State update test - counter incremented');
  });

  // Test 5: Simple function call
  const handleSimpleFunction = () => {
    addDebugLog('Simple function called');
  };

  const handleSimpleFunctionWithTouch = handleImmediateTouch(() => {
    handleSimpleFunction();
  });

  // Test 6: Alert test
  const handleAlertTest = handleImmediateTouch(() => {
    addDebugLog('Alert test - would show alert');
    // Uncomment to test alert
    // alert('Touch handler working!');
  });

  return (
    <div className="p-4 space-y-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold">Touch Test Component</h3>
      
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Device: {isMobileDevice() ? 'Mobile' : 'Desktop'}
        </p>
        <p className="text-sm text-gray-600">
          Click Count: {clickCount}
        </p>
        <p className="text-sm text-gray-600">
          Touch Count: {touchCount}
        </p>
      </div>

      <div className="space-y-4">
        {/* Test 1: Direct Click */}
        <button
          onClick={handleDirectClick}
          className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-medium"
          style={touchStyles}
        >
          Direct Click (Click Count: {clickCount})
        </button>

        {/* Test 2: Touch Click */}
        <button
          onClick={handleTouchClick}
          className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-medium"
          style={touchStyles}
        >
          Touch Click (Click Count: {clickCount})
        </button>

        {/* Test 3: Navigation Test */}
        <button
          onClick={handleNavigationTest}
          className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg font-medium"
          style={touchStyles}
        >
          Navigation Test
        </button>

        {/* Test 4: State Update Test */}
        <button
          onClick={handleStateUpdateTest}
          className="w-full px-4 py-3 bg-teal-500 text-white rounded-lg font-medium"
          style={touchStyles}
        >
          State Update Test (Click Count: {clickCount})
        </button>

        {/* Test 5: Simple Function Test */}
        <button
          onClick={handleSimpleFunctionWithTouch}
          className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg font-medium"
          style={touchStyles}
        >
          Simple Function Test
        </button>

        {/* Test 6: Alert Test */}
        <button
          onClick={handleAlertTest}
          className="w-full px-4 py-3 bg-red-500 text-white rounded-lg font-medium"
          style={touchStyles}
        >
          Alert Test
        </button>

        {/* Test 7: Touch Feedback */}
        <button
          ref={ref as React.RefObject<HTMLButtonElement>}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onClick={() => {
            setTouchCount(prev => prev + 1);
            addDebugLog('Touch feedback test triggered!');
          }}
          className="w-full px-4 py-3 bg-indigo-500 text-white rounded-lg font-medium"
          style={touchStyles}
        >
          Touch Feedback Button (Touch Count: {touchCount})
        </button>
      </div>

      {/* Debug Log */}
      <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded">
        <h4 className="font-medium mb-2">Debug Log:</h4>
        <div className="space-y-1 text-xs">
          {debugLog.map((log, index) => (
            <div key={index} className="text-gray-700">{log}</div>
          ))}
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
        <p className="text-sm text-yellow-800">
          <strong>Instructions:</strong> Test these buttons on a mobile device or with touch simulation in browser dev tools.
          Compare the &quot;Direct Click&quot; vs &quot;Touch Click&quot; buttons to see if the touch handler is working.
        </p>
      </div>
    </div>
  );
};