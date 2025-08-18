import Link from "next/link";

export default function ShulsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Synagogues & Jewish Centers
          </h1>
          <p className="text-xl text-gray-600">
            Find synagogues, mikvahs, and Jewish community centers in your area
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">
            🏛️ Coming Soon
          </h2>
          <p className="text-gray-600 mb-6">
            We&apos;re working on bringing you a comprehensive directory of synagogues and Jewish centers. 
            This feature will include:
          </p>
          
          <ul className="text-gray-600 mb-6 space-y-2">
            <li>• Synagogue listings with contact information</li>
            <li>• Prayer times and service schedules</li>
            <li>• Mikvah locations and hours</li>
            <li>• Jewish community centers and organizations</li>
            <li>• Kosher restaurants and food establishments</li>
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
            📊 Florida Synagogues Data
          </h3>
          <p className="text-blue-800 mb-4">
            We have comprehensive data on Florida synagogues that will be integrated soon.
          </p>
          <p className="text-sm text-blue-700">
            Data includes: 500+ synagogues, contact information, service times, and community details.
          </p>
        </div>
      </div>
    </div>
  );
}

