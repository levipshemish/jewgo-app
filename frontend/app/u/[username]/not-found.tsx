import Link from "next/link";
import { UserX } from "lucide-react";

export default function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <UserX className="w-16 h-16 text-gray-400" />
          </div>
          
          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            Profile Not Found
          </h1>
          
          <p className="mt-4 text-lg text-gray-600">
            Sorry, we couldn&apos;t find the profile you&apos;re looking for.
          </p>
          
          <p className="mt-2 text-sm text-gray-500">
            The profile may have been deleted, made private, or the username may be incorrect.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Link
            href="/"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Homepage
          </Link>
          
          <Link
            href="/auth/signin"
            className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Looking for something else?{" "}
            <Link href="/search" className="text-blue-600 hover:text-blue-700">
              Search for restaurants
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
