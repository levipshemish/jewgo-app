"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { Suspense } from "react";

function MarketplaceSearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Marketplace Search</h1>
            </div>
            
            {query ? (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Search results for: <span className="font-semibold">&ldquo;{query}&rdquo;</span>
                </p>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-yellow-800">
                    Search functionality is coming soon! You&apos;ll be able to find items in the JewGo marketplace.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 mb-6">
                Enter a search term to find items in the marketplace.
              </p>
            )}
            
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-blue-900 mb-2">Search features coming soon:</h2>
                <ul className="text-blue-800 space-y-1">
                  <li>• Search by item name or description</li>
                  <li>• Filter by category and price</li>
                  <li>• Sort by relevance, price, or date</li>
                  <li>• Save your favorite searches</li>
                  <li>• Get notifications for new items</li>
                </ul>
              </div>
              
              <div className="flex justify-center space-x-4">
                <Link
                  href="/marketplace"
                  className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
                >
                  Back to Marketplace
                </Link>
                <Link
                  href="/"
                  className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Go Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading search...</p>
        </div>
      </div>
    }>
      <MarketplaceSearchContent />
    </Suspense>
  );
}
