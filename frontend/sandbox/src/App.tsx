import React, { useState } from 'react'
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live'
import { BeakerIcon, CodeBracketIcon, EyeIcon, DevicePhoneMobileIcon, DeviceTabletIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'
import ComponentLibrary from './components/ComponentLibrary'
import ResponsivePreview from './components/ResponsivePreview'
import CodePlayground from './components/CodePlayground'
import VisualRegression from './components/VisualRegression'

type ViewMode = 'library' | 'playground' | 'responsive' | 'regression'

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewMode>('library')
  const [selectedComponent, setSelectedComponent] = useState<string>('')

  const navigation = [
    {
      name: 'Component Library',
      value: 'library' as ViewMode,
      icon: BeakerIcon,
      description: 'Browse and test individual components'
    },
    {
      name: 'Code Playground',
      value: 'playground' as ViewMode,
      icon: CodeBracketIcon,
      description: 'Live code editing and testing'
    },
    {
      name: 'Responsive Preview',
      value: 'responsive' as ViewMode,
      icon: EyeIcon,
      description: 'Test components across different screen sizes'
    },
    {
      name: 'Visual Regression',
      value: 'regression' as ViewMode,
      icon: EyeIcon,
      description: 'Compare visual changes and detect regressions'
    }
  ]

  const renderActiveView = () => {
    switch (activeView) {
      case 'library':
        return <ComponentLibrary onComponentSelect={setSelectedComponent} />
      case 'playground':
        return <CodePlayground selectedComponent={selectedComponent} />
      case 'responsive':
        return <ResponsivePreview selectedComponent={selectedComponent} />
      case 'regression':
        return <VisualRegression />
      default:
        return <ComponentLibrary onComponentSelect={setSelectedComponent} />
    }
  }

  return (
    <div className="sandbox-container">
      {/* Header */}
      <header className="sandbox-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BeakerIcon className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">JewGo Sandbox</h1>
            </div>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              Visual Testing Environment
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Pre-production testing
            </span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="px-6 py-3">
          <div className="flex space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.value}
                  onClick={() => setActiveView(item.value)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeView === item.value
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="sandbox-main">
        {renderActiveView()}
      </main>
    </div>
  )
}

export default App
