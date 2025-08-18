"use client";

import { useState, useEffect } from "react";
import { MigrationStats, MigrationLog } from "@/lib/auth/migration-manager";

interface MigrationData {
  stats: MigrationStats;
  recentLogs: MigrationLog[];
}

export default function MigrationDashboard() {
  const [migrationData, setMigrationData] = useState<MigrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMigrationData();
  }, []);

  const fetchMigrationData = async () => {
    try {
      const response = await fetch('/api/admin/migration');
      if (response.ok) {
        const data = await response.json();
        setMigrationData(data);
      } else {
        setMessage('Failed to fetch migration data');
      }
    } catch {
      setMessage('Error fetching migration data');
    } finally {
      setLoading(false);
    }
  };

  const performMigrationAction = async (action: string, batchSize?: number) => {
    setActionLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/admin/migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, batchSize })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMessage(result.message);
        await fetchMigrationData(); // Refresh data
      } else {
        setMessage(result.error || 'Action failed');
      }
    } catch {
      setMessage('Error performing migration action');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Migration Dashboard</h1>
          <div className="animate-pulse">Loading migration data...</div>
        </div>
      </div>
    );
  }

  if (!migrationData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Migration Dashboard</h1>
          <div className="text-red-600">Failed to load migration data</div>
        </div>
      </div>
    );
  }

  const { stats, recentLogs } = migrationData;
  const migrationProgress = stats.totalUsers > 0 ? (stats.migratedUsers / stats.totalUsers) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Migration Dashboard</h1>
        
        {message && (
          <div className={`p-4 mb-6 rounded-lg ${
            message.includes('Error') || message.includes('Failed') 
              ? 'bg-red-100 text-red-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {/* Migration Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Migrated Users</h3>
            <p className="text-3xl font-bold text-green-600">{stats.migratedUsers}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Failed Migrations</h3>
            <p className="text-3xl font-bold text-red-600">{stats.failedMigrations}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Pending Migrations</h3>
            <p className="text-3xl font-bold text-yellow-600">{stats.pendingMigrations}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Migration Progress</h3>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${migrationProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {migrationProgress.toFixed(1)}% complete ({stats.migratedUsers} of {stats.totalUsers} users)
          </p>
        </div>

        {/* Migration Actions */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Migration Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => performMigrationAction('queue_all_users')}
              disabled={actionLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Queue All Users'}
            </button>
            
            <button
              onClick={() => performMigrationAction('process_batch', 10)}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Process Batch (10)'}
            </button>
            
            <button
              onClick={() => performMigrationAction('retry_failed')}
              disabled={actionLoading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Retry Failed'}
            </button>
          </div>
        </div>

        {/* Recent Migration Logs */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Migration Logs</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Migrated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' :
                        log.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.migratedAt ? new Date(log.migratedAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
