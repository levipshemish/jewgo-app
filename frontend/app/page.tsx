'use client';

import Link from "next/link";

import AuthStatus from "@/components/auth/AuthStatus";
import { Header } from "@/components/layout";
import ActionButtons from "@/components/layout/ActionButtons";
import { CategoryTabs, BottomNavigation } from "@/components/navigation/ui";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Search Header */}
      <Header
        onSearch={(_query) => {
          // Handle search
        }}
        placeholder="Search restaurants..."
        showFilters={true}
        onShowFilters={() => {
          // Handle show filters
        }}
      />

      {/* Category Tabs */}
      <CategoryTabs activeTab="eatery" onTabChange={(_tab) => {
        // Handle tab change
      }} />

      {/* Action Buttons */}
      <ActionButtons
        onShowFilters={() => {
          // Handle show filters
        }}
        onShowMap={() => {
          // Handle show map
        }}
        onAddEatery={() => {
          // Handle add eatery
        }}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Welcome to JewGo
          </h1>
          
          {/* Authentication Status */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication Status</h2>
            <AuthStatus />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link
              href="/eatery"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Restaurants</h3>
              <p className="text-gray-600">Discover kosher restaurants in your area</p>
            </Link>

            <Link
              href="/favorites"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">My Favorites</h3>
              <p className="text-gray-600">View and manage your favorite restaurants</p>
            </Link>

            <Link
              href="/add-eatery"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Add Restaurant</h3>
              <p className="text-gray-600">Submit a new restaurant to our database</p>
            </Link>

            <Link
              href="/live-map"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Map</h3>
              <p className="text-gray-600">Explore restaurants on an interactive map</p>
            </Link>

            <Link
              href="/shuls"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Synagogues</h3>
              <p className="text-gray-600">Find synagogues and prayer services</p>
            </Link>

            <Link
              href="/marketplace"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Marketplace</h3>
              <p className="text-gray-600">Browse kosher products and services</p>
            </Link>
          </div>

          {/* Authentication System Info */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication System</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Current Implementation</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ Supabase Auth (Primary)</li>
                  <li>✅ Supabase Auth (Primary)</li>
                  <li>✅ Protected Routes</li>
                  <li>✅ Admin Authentication</li>
                  <li>✅ Google OAuth</li>
                  <li>✅ Email/Password Auth</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Protected Routes</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>🔒 /favorites</li>
                  <li>🔒 /add-eatery</li>
                  <li>🔒 /admin/*</li>
                  <li>🔒 /profile</li>
                  <li>🔒 /reviews</li>
                  <li>🔒 /account</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Testing Links */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Testing & Development</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Auth Testing</h3>
                <div className="space-y-2">
                  <Link
                    href="/auth/signin"
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    → Unified Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    → Unified Sign Up
                  </Link>
                  <Link
                    href="/auth/supabase-signin"
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    → Supabase Sign In
                  </Link>
                  <Link
                    href="/test-supabase"
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    → Test Supabase Config
                  </Link>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Admin Access</h3>
                <div className="space-y-2">
                  <Link
                    href="/admin/migration"
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    → Migration Dashboard
                  </Link>
                  <Link
                    href="/admin/migration-complete"
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    → Migration Complete
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
} 