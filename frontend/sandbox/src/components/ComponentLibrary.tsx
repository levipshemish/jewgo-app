import React, { useState, useEffect } from 'react'
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live'
import { MagnifyingGlassIcon, FunnelIcon, ViewColumnsIcon, ListBulletIcon } from '@heroicons/react/24/outline'
import { componentExamples } from '../data/componentExamples.tsx'

interface ComponentLibraryProps {
  onComponentSelect: (componentName: string) => void
}

const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ onComponentSelect }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedComponent, setSelectedComponent] = useState<string>('')

  const categories = ['all', 'buttons', 'forms', 'navigation', 'cards', 'modals', 'layout']

  const filteredComponents = componentExamples.filter(component => {
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         component.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || component.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleComponentSelect = (componentName: string) => {
    setSelectedComponent(componentName)
    onComponentSelect(componentName)
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search components..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ViewColumnsIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ListBulletIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Component Grid/List */}
      <div className={viewMode === 'grid' ? 'component-grid' : 'space-y-4'}>
        {filteredComponents.map((component) => (
          <div
            key={component.name}
            className={`component-preview cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
              selectedComponent === component.name ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleComponentSelect(component.name)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{component.name}</h3>
                <p className="text-sm text-gray-600">{component.description}</p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {component.category}
              </span>
            </div>

            <div className="live-preview">
              <LiveProvider code={component.code} scope={component.scope} noInline={false}>
                <LivePreview />
                <LiveError className="text-red-500 text-sm mt-2" />
              </LiveProvider>
            </div>

            {selectedComponent === component.name && (
              <div className="mt-4">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    View Code
                  </summary>
                  <div className="mt-2">
                    <LiveProvider code={component.code} scope={component.scope} noInline={false}>
                      <LiveEditor className="code-editor" />
                    </LiveProvider>
                  </div>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredComponents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <MagnifyingGlassIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No components found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}

export default ComponentLibrary
