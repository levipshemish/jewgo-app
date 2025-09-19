import Link from "next/link";

export default function MarketplaceMessagesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Marketplace Messages</h1>
            <p className="text-gray-600 mb-6">
              This feature is coming soon! You&apos;ll be able to communicate with buyers and sellers in the JewGo marketplace.
            </p>
            
            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-green-900 mb-2">What you&apos;ll be able to do:</h2>
                <ul className="text-green-800 space-y-1">
                  <li>• Send messages to buyers/sellers</li>
                  <li>• Negotiate prices</li>
                  <li>• Arrange meetups</li>
                  <li>• Ask questions about items</li>
                  <li>• Get notifications for new messages</li>
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
                  href="/specials"
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
