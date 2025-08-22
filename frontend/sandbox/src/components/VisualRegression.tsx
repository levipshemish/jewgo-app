import React, { useState } from 'react'
import { CameraIcon, ArrowPathIcon, DocumentMagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const VisualRegression: React.FC = () => {
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImages, setCapturedImages] = useState<Array<{
    id: string
    name: string
    timestamp: string
    url: string
    diff?: number
  }>>([])

  const handleCapture = async () => {
    setIsCapturing(true)
    
    // Simulate screenshot capture
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const newImage = {
      id: Date.now().toString(),
      name: `Screenshot ${capturedImages.length + 1}`,
      timestamp: new Date().toISOString(),
      url: `data:image/svg+xml;base64,${btoa('<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="16">Screenshot Preview</text></svg>')}`,
      diff: Math.random() * 100
    }
    
    setCapturedImages(prev => [...prev, newImage])
    setIsCapturing(false)
  }

  const handleCompare = (id1: string, id2: string) => {
    // Simulate comparison
    console.log(`Comparing ${id1} with ${id2}`)
  }

  const handleDelete = (id: string) => {
    setCapturedImages(prev => prev.filter(img => img.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Visual Regression Testing</h2>
            <p className="text-sm text-gray-600">Capture and compare screenshots to detect visual changes</p>
          </div>
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCapturing ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <CameraIcon className="h-4 w-4" />
            )}
            <span>{isCapturing ? 'Capturing...' : 'Capture Screenshot'}</span>
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use Visual Regression Testing</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-1">1. Capture Baseline</h4>
            <p>Take screenshots of your components in their current state</p>
          </div>
          <div>
            <h4 className="font-medium mb-1">2. Make Changes</h4>
            <p>Modify your components and capture new screenshots</p>
          </div>
          <div>
            <h4 className="font-medium mb-1">3. Compare & Analyze</h4>
            <p>Compare screenshots to detect visual regressions</p>
          </div>
        </div>
      </div>

      {/* Screenshot Gallery */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Screenshots ({capturedImages.length})</h3>
          {capturedImages.length > 1 && (
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Compare All
            </button>
          )}
        </div>

        {capturedImages.length === 0 ? (
          <div className="text-center py-12">
            <CameraIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No screenshots yet</h4>
            <p className="text-gray-600">Capture your first screenshot to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capturedImages.map((image) => (
              <div key={image.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="relative">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-48 object-cover"
                  />
                  {image.diff && image.diff > 5 && (
                    <div className="absolute top-2 right-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                      <ExclamationTriangleIcon className="h-3 w-3" />
                      <span>{image.diff.toFixed(1)}% diff</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{image.name}</h4>
                    <button
                      onClick={() => handleDelete(image.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    {new Date(image.timestamp).toLocaleString()}
                  </p>
                  <div className="flex space-x-2">
                    <button className="flex-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors">
                      View Details
                    </button>
                    {capturedImages.length > 1 && (
                      <button className="flex-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                        Compare
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comparison Tools */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparison Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Side-by-Side Comparison</h4>
            <p className="text-sm text-gray-600 mb-3">
              Compare two screenshots side by side to spot differences
            </p>
            <button className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
              Start Comparison
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Diff Analysis</h4>
            <p className="text-sm text-gray-600 mb-3">
              Automated diff detection with percentage change calculation
            </p>
            <button className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors">
              Analyze Diffs
            </button>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Regression Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Diff Threshold (%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="5"
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>5%</span>
              <span>100%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Screenshot Quality
            </label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="high">High Quality</option>
              <option value="medium">Medium Quality</option>
              <option value="low">Low Quality</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VisualRegression
