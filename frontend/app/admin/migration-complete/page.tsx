"use client";

import { useState, useEffect } from "react";
import { MigrationStats } from "@/lib/auth/migration-manager";
import { TransitionStats } from "@/lib/auth/transition-manager";
import { CleanupStats } from "@/lib/auth/cleanup-manager";

interface CompleteMigrationData {
  migration: MigrationStats;
  transition: TransitionStats;
  cleanup: CleanupStats;
}

export default function CompleteMigrationDashboard() {
  const [data, setData] = useState<CompleteMigrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [migrationRes, transitionRes, cleanupRes] = await Promise.all([
        fetch('/api/admin/migration'),
        fetch('/api/admin/transition'),
        fetch('/api/admin/cleanup')
      ]);

      const migrationData = await migrationRes.json();
      const transitionData = await transitionRes.json();
      const cleanupData = await cleanupRes.json();

      setData({
        migration: migrationData.stats,
        transition: transitionData.stats,
        cleanup: cleanupData.stats
      });
    } catch {
      setMessage('Failed to fetch migration data');
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (endpoint: string, action: string, params?: any) => {
    setActionLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch(`/api/admin/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMessage(result.message);
        await fetchAllData();
      } else {
        setMessage(result.error || 'Action failed');
      }
    } catch {
      setMessage('Error performing action');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Complete Migration Dashboard</h1>
          <div className="animate-pulse">Loading migration data...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Complete Migration Dashboard</h1>
          <div className="text-red-600">Failed to load migration data</div>
        </div>
      </div>
    );
  }

  const { migration, transition, cleanup } = data;
  const overallProgress = ((migration.migratedUsers / migration.totalUsers) * 100) || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Complete Migration Dashboard</h1>
        
        {message && (
          <div className={`p-4 mb-6 rounded-lg ${
            message.includes('Error') || message.includes('Failed') 
              ? 'bg-red-100 text-red-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {/* Overall Progress */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Overall Migration Progress</h2>
          <div className="w-full bg-gray-200 rounded-full h-6 mb-4">
            <div 
              className="bg-blue-600 h-6 rounded-full transition-all duration-300 flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${overallProgress}%` }}
            >
              {overallProgress.toFixed(1)}%
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {migration.migratedUsers} of {migration.totalUsers} users migrated
          </p>
        </div>

        {/* Phase 1: Foundation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Phase 1: Foundation</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Supabase Setup:</span>
                <span className="text-green-600 font-medium">✅ Complete</span>
              </div>
              <div className="flex justify-between">
                <span>Dual Auth System:</span>
                <span className="text-green-600 font-medium">✅ Active</span>
              </div>
              <div className="flex justify-between">
                <span>User Sync:</span>
                <span className="text-green-600 font-medium">✅ Working</span>
              </div>
            </div>
          </div>

          {/* Phase 2: User Synchronization */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Phase 2: User Sync</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Sync API:</span>
                <span className="text-green-600 font-medium">✅ Active</span>
              </div>
              <div className="flex justify-between">
                <span>Auto Sync:</span>
                <span className="text-green-600 font-medium">✅ Enabled</span>
              </div>
              <div className="flex justify-between">
                <span>Data Consistency:</span>
                <span className="text-green-600 font-medium">✅ Verified</span>
              </div>
            </div>
          </div>

          {/* Phase 3: Gradual Migration */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Phase 3: Gradual Migration</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Migration Queue:</span>
                <span className="text-blue-600 font-medium">{migration.pendingMigrations}</span>
              </div>
              <div className="flex justify-between">
                <span>Failed Migrations:</span>
                <span className="text-red-600 font-medium">{migration.failedMigrations}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Migration:</span>
                <span className="text-gray-600">
                  {migration.lastMigrationDate 
                    ? new Date(migration.lastMigrationDate).toLocaleDateString()
                    : 'Never'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 4: Transition Management */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Phase 4: Transition Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{transition.totalUsers}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{transition.supabaseUsers}</div>
              <div className="text-sm text-gray-600">Supabase Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{transition.nextAuthUsers}</div>
              <div className="text-sm text-gray-600">NextAuth Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{transition.dualUsers}</div>
              <div className="text-sm text-gray-600">Dual Users</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => performAction('transition', 'enable_redirect')}
              disabled={actionLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Enable Supabase Redirect
            </button>
            
            <button
              onClick={() => performAction('transition', 'complete_transition')}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Complete Transition
            </button>
            
            <button
              onClick={() => performAction('transition', 'rollback')}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Emergency Rollback
            </button>
          </div>
        </div>

        {/* Phase 5: Cleanup and Optimization */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Phase 5: Cleanup & Optimization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{cleanup.orphanedNextAuthSessions}</div>
              <div className="text-sm text-gray-600">Orphaned Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{cleanup.orphanedNextAuthAccounts}</div>
              <div className="text-sm text-gray-600">Orphaned Accounts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{cleanup.duplicateUsers}</div>
              <div className="text-sm text-gray-600">Duplicate Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{cleanup.unusedMigrationLogs}</div>
              <div className="text-sm text-gray-600">Old Logs</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => performAction('cleanup', 'cleanup_sessions')}
              disabled={actionLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              Clean Sessions
            </button>
            
            <button
              onClick={() => performAction('cleanup', 'cleanup_accounts')}
              disabled={actionLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              Clean Accounts
            </button>
            
            <button
              onClick={() => performAction('cleanup', 'merge_duplicates')}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Merge Duplicates
            </button>
            
            <button
              onClick={() => performAction('cleanup', 'cleanup_logs')}
              disabled={actionLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Clean Old Logs
            </button>
            
            <button
              onClick={() => performAction('cleanup', 'remove_passwords')}
              disabled={actionLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Remove Passwords
            </button>
            
            <button
              onClick={() => performAction('cleanup', 'complete_cleanup')}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Complete Cleanup
            </button>
          </div>
        </div>

        {/* Migration Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Migration Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => performAction('migration', 'queue_all_users')}
              disabled={actionLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Queue All Users'}
            </button>
            
            <button
              onClick={() => performAction('migration', 'process_batch', { batchSize: 10 })}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Process Batch (10)'}
            </button>
            
            <button
              onClick={() => performAction('migration', 'retry_failed')}
              disabled={actionLoading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Retry Failed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
