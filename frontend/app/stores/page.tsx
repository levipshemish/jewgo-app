import Link from "next/link";

export default function StoresPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Kosher Stores & Markets
          </h1>
          <p className="text-xl text-gray-600">
            Find kosher grocery stores, markets, and specialty food shops in your area
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">
            🛒 Coming Soon
          </h2>
          <p className="text-gray-600 mb-6">
            We&apos;re working on bringing you a comprehensive directory of kosher stores and markets. 
            This feature will include:
          </p>
          
          <ul className="text-gray-600 mb-6 space-y-2">
            <li>• Kosher grocery stores and supermarkets</li>
            <li>• Specialty kosher food markets</li>
            <li>• Butcher shops and delis</li>
            <li>• Wine and spirits stores</li>
            <li>• Online kosher food delivery services</li>
            <li>• Store hours and contact information</li>
            <li>• Product availability and special orders</li>
          </ul>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/eatery"
              className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              🍽️ Explore Kosher Eateries
            </Link>
            <Link
              href="/"
              className="inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            📊 Kosher Stores Data
          </h3>
          <p className="text-blue-800 mb-4">
            We have comprehensive data on kosher stores and markets that will be integrated soon.
          </p>
          <p className="text-sm text-blue-700">
            Data includes: grocery stores, specialty markets, butcher shops, and online delivery services.
          </p>
        </div>
      </div>
    </div>
  );
}
