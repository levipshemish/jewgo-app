'use client';

import { useState } from 'react';
import { MapPin, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { batchGeocodeShuls, type BatchGeocodeResponse } from '@/lib/utils/geocoding';

interface GeocodingPanelProps {
  className?: string;
}

export default function GeocodingPanel({ className = '' }: GeocodingPanelProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [results, setResults] = useState<BatchGeocodeResponse | null>(null);
  const [limit, setLimit] = useState(25);
  const [forceUpdate, setForceUpdate] = useState(false);

  const handleStartGeocoding = async () => {
    setIsGeocoding(true);
    setResults(null);

    try {
      const response = await batchGeocodeShuls({
        limit,
        force_update: forceUpdate,
      });

      setResults(response);
    } catch (error) {
      setResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <MapPin className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Shul Geocoding</h2>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-2">
            Number of shuls to process
          </label>
          <input
            id="limit"
            type="number"
            min="1"
            max="100"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 25)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isGeocoding}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="forceUpdate"
            type="checkbox"
            checked={forceUpdate}
            onChange={(e) => setForceUpdate(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={isGeocoding}
          />
          <label htmlFor="forceUpdate" className="text-sm text-gray-700">
            Force update existing coordinates
          </label>
        </div>
      </div>

      <button
        onClick={handleStartGeocoding}
        disabled={isGeocoding}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
      >
        {isGeocoding ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Geocoding shuls...
          </>
        ) : (
          <>
            <MapPin className="w-4 h-4" />
            Start Geocoding
          </>
        )}
      </button>

      {results && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Results</h3>

          {results.success ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-md text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {results.data?.processed || 0}
                  </div>
                  <div className="text-sm text-gray-600">Processed</div>
                </div>
                <div className="bg-green-50 p-3 rounded-md text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.data?.successful || 0}
                  </div>
                  <div className="text-sm text-gray-600">Successful</div>
                </div>
                <div className="bg-red-50 p-3 rounded-md text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {results.data?.failed || 0}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>

              {/* Success Rate */}
              {results.data && results.data.processed > 0 && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-sm text-gray-600">Success Rate</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {((results.data.successful / results.data.processed) * 100).toFixed(1)}%
                  </div>
                </div>
              )}

              {/* Detailed Results */}
              {results.data?.results && results.data.results.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Detailed Results</h4>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {results.data.results.map((result, index) => (
                      <div
                        key={`${result.shul_id}-${index}`}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <span className="font-medium">{result.name}</span>
                          <span className="text-gray-500">(ID: {result.shul_id})</span>
                        </div>
                        <div className="text-right">
                          {result.status === 'success' && result.latitude && result.longitude ? (
                            <span className="text-green-600 text-xs">
                              {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                            </span>
                          ) : result.error ? (
                            <span className="text-red-600 text-xs">{result.error}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.message && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-md">
                  <p className="text-green-800 text-sm">{results.message}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 p-3 rounded-md">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-800 font-medium">Error</span>
              </div>
              <p className="text-red-700 text-sm mt-1">{results.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
