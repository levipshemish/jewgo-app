'use client';

import React, { useState } from 'react';
import { UnifiedCategoryNav, CATEGORY_SETS } from '@/components/ui/UnifiedCategoryNav';

export default function TestCategoryNavPage() {
  const [activeTab, setActiveTab] = useState('eatery');
  const [marketplaceCategory, setMarketplaceCategory] = useState('all');
  const [customCategory, setCustomCategory] = useState('custom1');
  const [scrollableCategory, setScrollableCategory] = useState('mikvahs');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">UnifiedCategoryNav Test Page</h1>
          <p className="mt-2 text-gray-600">
            Test all variants and configurations of the unified category navigation component
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Example 1: Main navigation with auto layout */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Main Navigation (Auto Layout)</h2>
            <p className="text-gray-600 mt-1">
              Responsive layout that switches between mobile and desktop automatically. 
              Try resizing your browser window to see the difference.
            </p>
            <div className="mt-2 text-sm text-gray-500">
              Active tab: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{activeTab}</span>
            </div>
          </div>
          
          <UnifiedCategoryNav
            categorySet="main"
            value={activeTab}
            onValueChange={setActiveTab}
            variant="auto"
            showBorder={true}
            aria-label="Main navigation"
          />
        </section>

        {/* Example 2: Marketplace categories with mobile layout */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Marketplace Categories (Mobile)</h2>
            <p className="text-gray-600 mt-1">
              Mobile-optimized layout for filtering content. Navigation is disabled.
            </p>
            <div className="mt-2 text-sm text-gray-500">
              Selected category: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{marketplaceCategory}</span>
            </div>
          </div>
          
          <UnifiedCategoryNav
            categorySet="marketplace"
            value={marketplaceCategory}
            onValueChange={setMarketplaceCategory}
            variant="mobile"
            enableNavigation={false}
            aria-label="Marketplace filters"
          />
        </section>

        {/* Example 3: Scrollable layout with all categories */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Scrollable Layout (All Categories)</h2>
            <p className="text-gray-600 mt-1">
              Horizontal scrolling with overflow controls. Perfect for many categories.
            </p>
            <div className="mt-2 text-sm text-gray-500">
              Selected category: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{scrollableCategory}</span>
            </div>
          </div>
          
          <UnifiedCategoryNav
            categorySet="main"
            value={scrollableCategory}
            onValueChange={setScrollableCategory}
            variant="scrollable"
            showScrollControls={true}
            enableNavigation={false}
            aria-label="Scrollable navigation"
          />
        </section>

        {/* Example 4: Desktop-only layout */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Desktop Layout</h2>
            <p className="text-gray-600 mt-1">
              Desktop-optimized layout with equal-width items. Hidden on mobile.
            </p>
          </div>
          
          <div className="hidden sm:block">
            <UnifiedCategoryNav
              categorySet="main"
              value={activeTab}
              onValueChange={setActiveTab}
              variant="desktop"
              showBorder={true}
              aria-label="Desktop navigation"
            />
          </div>
          <div className="sm:hidden text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <p>Desktop layout - resize window to see</p>
          </div>
        </section>

        {/* Example 5: Mobile-only layout */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Mobile Layout</h2>
            <p className="text-gray-600 mt-1">
              Mobile-optimized layout with horizontal scrolling. Hidden on desktop.
            </p>
          </div>
          
          <div className="block sm:hidden">
            <UnifiedCategoryNav
              categorySet="marketplace"
              value={marketplaceCategory}
              onValueChange={setMarketplaceCategory}
              variant="mobile"
              enableNavigation={false}
              aria-label="Mobile filters"
            />
          </div>
          <div className="hidden sm:block text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <p>Mobile layout - resize window to see</p>
          </div>
        </section>

        {/* Example 6: Custom styling */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Custom Styling</h2>
            <p className="text-gray-600 mt-1">
              With custom CSS classes, gradients, and enhanced styling.
            </p>
          </div>
          
          <UnifiedCategoryNav
            categorySet="main"
            value={activeTab}
            onValueChange={setActiveTab}
            variant="auto"
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg"
            itemClassName="hover:scale-105 transition-transform duration-200"
            activeItemClassName="ring-2 ring-blue-500 ring-offset-2 shadow-lg"
            aria-label="Styled navigation"
          />
        </section>

        {/* Example 7: Custom items */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Custom Items</h2>
            <p className="text-gray-600 mt-1">
              Using custom items instead of predefined category sets.
            </p>
            <div className="mt-2 text-sm text-gray-500">
              Selected custom: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{customCategory}</span>
            </div>
          </div>
          
          <UnifiedCategoryNav
            customItems={[
              { id: 'custom1', label: 'Custom 1', icon: () => <span className="text-lg">🚀</span> },
              { id: 'custom2', label: 'Custom 2', icon: () => <span className="text-lg">⭐</span> },
              { id: 'custom3', label: 'Custom 3', icon: () => <span className="text-lg">🎯</span> },
              { id: 'custom4', label: 'Custom 4', icon: () => <span className="text-lg">💡</span> },
              { id: 'custom5', label: 'Custom 5', icon: () => <span className="text-lg">🔥</span> },
              { id: 'custom6', label: 'Custom 6', icon: () => <span className="text-lg">✨</span> },
              { id: 'custom7', label: 'Custom 7', icon: () => <span className="text-lg">🌟</span> },
              { id: 'custom8', label: 'Custom 8', icon: () => <span className="text-lg">🎨</span> },
              { id: 'custom9', label: 'Custom 9', icon: () => <span className="text-lg">🎪</span> },
              { id: 'custom10', label: 'Custom 10', icon: () => <span className="text-lg">🎭</span> },
              { id: 'custom11', label: 'Custom 11', icon: () => <span className="text-lg">🎪</span> },
              { id: 'custom12', label: 'Custom 12', icon: () => <span className="text-lg">🎨</span> },
            ]}
            value={customCategory}
            onValueChange={setCustomCategory}
            variant="scrollable"
            enableNavigation={false}
            showScrollControls={true}
            aria-label="Custom categories"
          />
        </section>

        {/* Example 8: No border variant */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">No Border Variant</h2>
            <p className="text-gray-600 mt-1">
              Navigation without bottom border for seamless integration.
            </p>
          </div>
          
          <UnifiedCategoryNav
            categorySet="main"
            value={activeTab}
            onValueChange={setActiveTab}
            variant="auto"
            showBorder={false}
            aria-label="Borderless navigation"
          />
        </section>

        {/* Debug Information */}
        <section className="bg-gray-100 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Debug Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Available Category Sets:</h3>
              <ul className="space-y-1 text-gray-600">
                {Object.keys(CATEGORY_SETS).map(set => (
                  <li key={set} className="font-mono">
                    {set}: {CATEGORY_SETS[set as keyof typeof CATEGORY_SETS].length} items
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Current States:</h3>
              <ul className="space-y-1 text-gray-600">
                <li>Main Tab: <span className="font-mono">{activeTab}</span></li>
                <li>Marketplace: <span className="font-mono">{marketplaceCategory}</span></li>
                <li>Scrollable: <span className="font-mono">{scrollableCategory}</span></li>
                <li>Custom: <span className="font-mono">{customCategory}</span></li>
              </ul>
            </div>
          </div>
        </section>

        {/* Instructions */}
        <section className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Testing Instructions</h2>
          <div className="text-blue-800 space-y-2">
            <p>• <strong>Responsive Testing:</strong> Resize your browser window to see how layouts adapt</p>
            <p>• <strong>Scrollable Testing:</strong> Try the scrollable variant with many categories</p>
            <p>• <strong>Accessibility:</strong> Test keyboard navigation (Tab, Arrow keys, Enter)</p>
            <p>• <strong>Touch Testing:</strong> On mobile, test touch interactions and scrolling</p>
            <p>• <strong>State Management:</strong> Click different categories to see state changes</p>
          </div>
        </section>
      </div>
    </div>
  );
}
