import React, { useState, useEffect } from 'react'
import { LiveProvider, LiveError, LivePreview } from 'react-live'
import { DevicePhoneMobileIcon, DeviceTabletIcon, ComputerDesktopIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline'
import { componentExamples } from '../data/componentExamples'

interface ResponsivePreviewProps {
  selectedComponent: string
}

type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'custom'

const ResponsivePreview: React.FC<ResponsivePreviewProps> = ({ selectedComponent }) => {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop')
  const [customWidth, setCustomWidth] = useState(1024)
  const [componentCode, setComponentCode] = useState('')

  useEffect(() => {
    if (selectedComponent) {
      const component = componentExamples.find(c => c.name === selectedComponent)
      if (component) {
        setComponentCode(component.code)
      }
    } else {
      setComponentCode(`import React from 'react'

function DefaultComponent() {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Responsive Preview</h2>
      <p className="text-gray-600">Select a component to preview it across different screen sizes.</p>
    </div>
  )
}

render(<DefaultComponent />)`)
    }
  }, [selectedComponent])

  const getDeviceWidth = () => {
    switch (deviceType) {
      case 'mobile':
        return 375
      case 'tablet':
        return 768
      case 'desktop':
        return 1024
      case 'custom':
        return customWidth
      default:
        return 1024
    }
  }

  const getDeviceClass = () => {
    switch (deviceType) {
      case 'mobile':
        return 'mobile-frame'
      case 'tablet':
        return 'tablet-frame'
      case 'desktop':
        return 'desktop-frame'
      case 'custom':
        return 'responsive-preview'
      default:
        return 'desktop-frame'
    }
  }

  const scope = {
    React,
    ...componentExamples.reduce((acc, comp) => ({ ...acc, ...comp.scope }), {})
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Responsive Preview</h2>
            <p className="text-sm text-gray-600">Test components across different screen sizes</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              Width: {getDeviceWidth()}px
            </span>
          </div>
        </div>
      </div>

      {/* Device Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Preview</h3>
        <div className="flex flex-wrap items-center gap-4">
          {/* Device Type Buttons */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDeviceType('mobile')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                deviceType === 'mobile' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <DevicePhoneMobileIcon className="h-4 w-4" />
              <span>Mobile</span>
            </button>
            <button
              onClick={() => setDeviceType('tablet')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                deviceType === 'tablet' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <DeviceTabletIcon className="h-4 w-4" />
              <span>Tablet</span>
            </button>
            <button
              onClick={() => setDeviceType('desktop')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                deviceType === 'desktop' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ComputerDesktopIcon className="h-4 w-4" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setDeviceType('custom')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                deviceType === 'custom' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ArrowsPointingOutIcon className="h-4 w-4" />
              <span>Custom</span>
            </button>
          </div>

          {/* Custom Width Input */}
          {deviceType === 'custom' && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Width:</label>
              <input
                type="range"
                min="320"
                max="1920"
                value={customWidth}
                onChange={(e) => setCustomWidth(parseInt(e.target.value))}
                className="w-32"
              />
              <span className="text-sm text-gray-600 w-16">{customWidth}px</span>
            </div>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-center">
          <div
            className={getDeviceClass()}
            style={deviceType === 'custom' ? { width: `${customWidth}px` } : {}}
          >
            <div className="bg-white">
              <LiveProvider code={componentCode} scope={scope} noInline={false}>
                <LivePreview />
                <LiveError className="text-red-500 text-sm mt-2 bg-red-50 p-2 rounded" />
              </LiveProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Component Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Component</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {componentExamples.map((component) => (
            <button
              key={component.name}
              onClick={() => setComponentCode(component.code)}
              className={`text-left p-3 border rounded-lg transition-colors ${
                selectedComponent === component.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <h4 className="font-medium text-gray-900 text-sm">{component.name}</h4>
              <p className="text-xs text-gray-600 mt-1">{component.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Guidelines */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Responsive Testing Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-1">Mobile (375px)</h4>
            <p>Test touch interactions, text readability, and navigation patterns</p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Tablet (768px)</h4>
            <p>Check layout adaptations and touch-friendly elements</p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Desktop (1024px+)</h4>
            <p>Verify full layout, hover states, and desktop interactions</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResponsivePreview
