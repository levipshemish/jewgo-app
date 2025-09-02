"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Code, TestTube, Database, Settings } from "lucide-react"
import { useScrollDetection } from '@/lib/hooks/useScrollDetection';

export default function DevNavigation() {
  const { isScrolling } = useScrollDetection({ debounceMs: 150 });
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const devLinks = [
    {
      name: "UnifiedCard Test",
      href: "/test-unified-card",
      icon: TestTube,
      description: "Test the UnifiedCard component with real API data"
    },
    {
      name: "API Testing",
      href: "/api-testing",
      icon: Code,
      description: "Test API endpoints and data fetching"
    },
    {
      name: "Database Schema",
      href: "/database-schema",
      icon: Database,
      description: "View database schema and relationships"
    },
    {
      name: "Component Library",
      href: "/component-library",
      icon: Settings,
      description: "Browse all available components"
    }
  ]

  return (
    <>
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-black/80 text-white p-3 rounded-lg shadow-lg">
            <div className="text-xs font-mono space-y-1">
              <div>Scroll: {isScrolling ? '🔄' : '⏸️'}</div>
              {/* Floating Action Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                title="Development Tools"
              >
                <Code className="w-5 h-5" />
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Code className="w-4 h-4 mr-2" />
                      Development Tools
                    </h3>
                    <div className="space-y-2">
                      {devLinks.map((link) => {
                        const Icon = link.icon
                        return (
                          <button
                            key={link.href}
                            onClick={() => {
                              router.push(link.href)
                              setIsOpen(false)
                            }}
                            className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                          >
                            <div className="flex items-start space-x-3">
                              <Icon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                  {link.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {link.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Backdrop */}
              {isOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
