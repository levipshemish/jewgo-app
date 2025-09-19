import Link from "next/link";

export default function MikvaPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Mikvah Locations
          </h1>
          <p className="text-xl text-gray-600">
            Find mikvah facilities and ritual bath locations in your area
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">
            🏊‍♀️ Coming Soon
          </h2>
          <p className="text-gray-600 mb-6">
            We&apos;re working on bringing you a comprehensive directory of mikvah facilities. 
            This feature will include:
          </p>
          
          <ul className="text-gray-600 mb-6 space-y-2">
            <li>• Mikvah locations and contact information</li>
            <li>• Operating hours and appointment scheduling</li>
            <li>• Facility amenities and accessibility</li>
            <li>• Kashrut certification and supervision</li>
            <li>• Private and community mikvah options</li>
            <li>• Directions and parking information</li>
            <li>• Special accommodations and services</li>
          </ul>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/shuls"
              className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              🏛️ Find Synagogues
            </Link>
            <Link
              href="/specials"
              className="inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            📊 Mikvah Facilities Data
          </h3>
          <p className="text-blue-800 mb-4">
            We have comprehensive data on mikvah facilities that will be integrated soon.
          </p>
          <p className="text-sm text-blue-700">
            Data includes: facility locations, operating hours, contact information, and special services.
          </p>
        </div>
      </div>
    </div>
  );
}
