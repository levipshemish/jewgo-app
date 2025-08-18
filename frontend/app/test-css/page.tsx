'use client';

import { useState, useEffect } from 'react';

export default function TestCSSPage() {
  const [cssStatus, setCssStatus] = useState<string>('Checking...');
  const [mimeTypeErrors, setMimeTypeErrors] = useState<string[]>([]);
  const [cssFiles, setCssFiles] = useState<string[]>([]);
  
  useEffect(() => {
    // Test CSS loading and MIME type issues
    const testCSSLoading = () => {
      try {
        const styleSheets = Array.from(document.styleSheets);
        const cssSheets = styleSheets.filter(sheet => {
          try {
            return sheet.href && sheet.href.includes('.css');
          } catch (_e) {
            return false;
          }
        });
        
        const cssFileUrls = cssSheets.map(sheet => sheet.href || 'inline').filter(Boolean);
        setCssFiles(cssFileUrls);
        
        if (cssSheets.length > 0) {
          setCssStatus('✅ CSS files loaded correctly');
        } else {
          setCssStatus('⚠️ No CSS files detected');
        }
      } catch {
        setCssStatus('❌ CSS loading error');
      }
    };

    // Check for MIME type errors in console
    const checkMimeTypeErrors = () => {
      const originalError = console.error;
      const errors: string[] = [];
      
      console.error = (...args) => {
        const errorMessage = args.join(' ');
        if (errorMessage.includes('MIME type') || errorMessage.includes('text/css') || errorMessage.includes('executable')) {
          errors.push(errorMessage);
          setMimeTypeErrors([...errors]);
        }
        originalError.apply(console, args);
      };

      // Restore console.error after a delay
      setTimeout(() => {
        console.error = originalError;
      }, 5000);
    };

    testCSSLoading();
    checkMimeTypeErrors();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">CSS MIME Type Test</h1>
        
        <div className="grid gap-6">
          {/* CSS Status */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">CSS Loading Status</h2>
            <p className="text-lg">{cssStatus}</p>
          </div>

          {/* CSS Files */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Loaded CSS Files</h2>
            {cssFiles.length > 0 ? (
              <ul className="space-y-2">
                {cssFiles.map((file, index) => (
                  <li key={index} className="text-sm font-mono bg-gray-100 p-2 rounded">
                    {file}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No CSS files detected</p>
            )}
          </div>

          {/* MIME Type Errors */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">MIME Type Errors</h2>
            {mimeTypeErrors.length > 0 ? (
              <div className="space-y-2">
                {mimeTypeErrors.map((error, index) => (
                  <div key={index} className="text-red-600 text-sm font-mono bg-red-50 p-3 rounded border border-red-200">
                    {error}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-green-600">✅ No MIME type errors detected</p>
            )}
          </div>

          {/* Visual Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Visual CSS Test</h2>
            <div className="space-y-4">
              <div className="bg-blue-500 text-white p-4 rounded">
                This should be blue with white text (Tailwind CSS test)
              </div>
              <div className="bg-green-500 text-white p-4 rounded">
                This should be green with white text (Tailwind CSS test)
              </div>
              <div className="bg-red-500 text-white p-4 rounded">
                This should be red with white text (Tailwind CSS test)
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">Test Instructions</h2>
            <ol className="list-decimal list-inside space-y-2 text-blue-700">
              <li>Check that all CSS files are loaded without MIME type errors</li>
              <li>Verify that the colored boxes above display correctly</li>
              <li>Open browser console and look for any CSS-related errors</li>
              <li>If you see MIME type errors, they will appear in the &quot;MIME Type Errors&quot; section</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
