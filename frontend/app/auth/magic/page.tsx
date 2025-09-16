import React, { Suspense } from "react";
import MagicLinkHandler from "./MagicLinkHandler";

export default function MagicLinkPage() {
  return (
    <Suspense fallback={<MagicLinkLoadingUI />}>
      <MagicLinkHandler />
    </Suspense>
  );
}

function MagicLinkLoadingUI() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <h1 className="mt-6 text-2xl font-semibold text-gray-900">Loading…</h1>
          <p className="mt-2 text-gray-600">
            Preparing your magic link verification.
          </p>
        </div>
      </div>
    </div>
  );
}

