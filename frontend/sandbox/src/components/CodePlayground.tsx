import React, { useState, useEffect } from 'react'
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live'
import { PlayIcon, StopIcon, ArrowPathIcon, DocumentDuplicateIcon, CheckIcon } from '@heroicons/react/24/outline'
import { componentExamples } from '../data/componentExamples'

interface CodePlaygroundProps {
  selectedComponent: string
}

const CodePlayground: React.FC<CodePlaygroundProps> = ({ selectedComponent }) => {
  const [code, setCode] = useState('')
  const [isRunning, setIsRunning] = useState(true)
  const [copied, setCopied] = useState(false)

  // Default code template
  const defaultCode = `import React from 'react'

function MyComponent() {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Hello Sandbox!</h2>
      <p className="text-gray-600">Start coding your component here...</p>
    </div>
  )
}

render(<MyComponent />)`

  useEffect(() => {
    if (selectedComponent) {
      const component = componentExamples.find(c => c.name === selectedComponent)
      if (component) {
        setCode(component.code)
      }
    } else {
      setCode(defaultCode)
    }
  }, [selectedComponent])

  const handleRun = () => {
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    if (selectedComponent) {
      const component = componentExamples.find(c => c.name === selectedComponent)
      if (component) {
        setCode(component.code)
      }
    } else {
      setCode(defaultCode)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const scope = {
    React,
    // Add common components and utilities here
    ...componentExamples.reduce((acc, comp) => ({ ...acc, ...comp.scope }), {})
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Code Playground</h2>
            <p className="text-sm text-gray-600">Live code editing and testing environment</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {copied ? (
                <>
                  <CheckIcon className="h-4 w-4 text-green-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <DocumentDuplicateIcon className="h-4 w-4" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Reset</span>
            </button>
            {isRunning ? (
              <button
                onClick={handleStop}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
              >
                <StopIcon className="h-4 w-4" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={handleRun}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
              >
                <PlayIcon className="h-4 w-4" />
                <span>Run</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Code Editor and Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Editor */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-medium text-gray-900">Code Editor</h3>
          </div>
          <div className="p-4">
            <LiveProvider code={code} scope={scope} noInline={false}>
              <LiveEditor
                className="code-editor min-h-[400px]"
                onChange={setCode}
                disabled={!isRunning}
              />
              <LiveError className="text-red-500 text-sm mt-2 bg-red-50 p-2 rounded" />
            </LiveProvider>
          </div>
        </div>

        {/* Live Preview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-medium text-gray-900">Live Preview</h3>
          </div>
          <div className="p-4">
            {isRunning ? (
              <LiveProvider code={code} scope={scope} noInline={false}>
                <div className="live-preview min-h-[400px] flex items-center justify-center">
                  <LivePreview />
                </div>
                <LiveError className="text-red-500 text-sm mt-2 bg-red-50 p-2 rounded" />
              </LiveProvider>
            ) : (
              <div className="live-preview min-h-[400px] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <StopIcon className="h-12 w-12 mx-auto mb-2" />
                  <p>Preview stopped</p>
                  <p className="text-sm">Click "Run" to start the preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Available Components */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Components</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {componentExamples.map((component) => (
            <button
              key={component.name}
              onClick={() => setCode(component.code)}
              className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h4 className="font-medium text-gray-900 text-sm">{component.name}</h4>
              <p className="text-xs text-gray-600 mt-1">{component.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CodePlayground
