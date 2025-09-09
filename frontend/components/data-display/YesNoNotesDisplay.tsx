"use client"

import React, { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface DataField {
  field: string;
  value: 'Yes' | 'No' | string;
  notes?: string;
  category: string;
}

interface YesNoNotesDisplayProps {
  dataFields: DataField[];
  title?: string;
  showCategories?: boolean;
  collapsible?: boolean;
  maxItems?: number;
}

export function YesNoNotesDisplay({ 
  dataFields, 
  title = "Details", 
  showCategories = true,
  collapsible = true,
  maxItems = 50
}: YesNoNotesDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(!collapsible)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Group fields by category
  const groupedFields = dataFields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = []
    }
    acc[field.category].push(field)
    return acc
  }, {} as Record<string, DataField[]>)

  const categories = Object.keys(groupedFields)
  const totalFields = dataFields.length
  const displayedFields = isExpanded ? dataFields : dataFields.slice(0, maxItems)

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const getValueColor = (value: string) => {
    switch (value.toLowerCase()) {
      case 'yes':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'no':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getValueIcon = (value: string) => {
    switch (value.toLowerCase()) {
      case 'yes':
        return '✓'
      case 'no':
        return '✗'
      default:
        return 'ℹ'
    }
  }

  if (dataFields.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-gray-500 text-center">No data available</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div 
        className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between cursor-pointer"
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">({totalFields} items)</span>
        </div>
        {collapsible && (
          <div className="flex items-center space-x-2">
            {!isExpanded && totalFields > maxItems && (
              <span className="text-sm text-gray-500">
                Showing {maxItems} of {totalFields}
              </span>
            )}
            {isExpanded ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {showCategories ? (
            // Grouped by categories
            <div className="space-y-4">
              {categories.map((category) => {
                const categoryFields = groupedFields[category]
                const isCategoryExpanded = expandedCategories.has(category)
                
                return (
                  <div key={category} className="border border-gray-200 rounded-lg">
                    <div 
                      className="px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-pointer flex items-center justify-between"
                      onClick={() => toggleCategory(category)}
                    >
                      <h4 className="font-medium text-gray-900">{category}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">({categoryFields.length})</span>
                        {isCategoryExpanded ? (
                          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    
                    {isCategoryExpanded && (
                      <div className="p-3 space-y-2">
                        {categoryFields.map((field, index) => (
                          <div key={index} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium">
                              <span className={getValueColor(field.value).split(' ')[0]}>
                                {getValueIcon(field.value)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {field.field}
                                </span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getValueColor(field.value)}`}>
                                  {field.value}
                                </span>
                              </div>
                              {field.notes && (
                                <p className="text-xs text-gray-600 mt-1 italic">
                                  {field.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            // Flat list
            <div className="space-y-2">
              {displayedFields.map((field, index) => (
                <div key={index} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium">
                    <span className={getValueColor(field.value).split(' ')[0]}>
                      {getValueIcon(field.value)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {field.field}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getValueColor(field.value)}`}>
                        {field.value}
                      </span>
                      {showCategories && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {field.category}
                        </span>
                      )}
                    </div>
                    {field.notes && (
                      <p className="text-xs text-gray-600 mt-1 italic">
                        {field.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default YesNoNotesDisplay
