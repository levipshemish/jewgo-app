import type { ReactNode } from "react"

interface AuthLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  showLogo?: boolean
}

export function AuthLayout({ children, title, subtitle, showLogo = true }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {showLogo && (
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-1">
                <span className="text-4xl font-bold text-white">Jew</span>
                <div className="bg-green-500 rounded-2xl p-2 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">g</span>
                </div>
                <span className="text-4xl font-bold text-white">o</span>
              </div>
            </div>
          </div>
        )}

        {title && (
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
            {subtitle && <p className="text-gray-400">{subtitle}</p>}
          </div>
        )}

        <div className="bg-white rounded-3xl p-6">{children}</div>
      </div>
    </div>
  )
}
