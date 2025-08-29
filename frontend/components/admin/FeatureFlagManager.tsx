'use client';

import { ToggleLeft, ToggleRight, Plus, Trash2, Edit, Save, AlertCircle, CheckCircle } from 'lucide-react';
import React from 'react';
import { useState } from 'react';

import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { useSupabase } from '@/lib/contexts/SupabaseContext';
import { useAuth } from '@/hooks/useAuth';
import { getBackendUrl } from '@/lib/utils/apiRouteUtils';

interface FeatureFlagFormData {
  name: string;
  enabled: boolean;
  description: string;
  version: string;
  rollout_percentage: number;
  target_environments: string[];
  expires_at?: string;
}

export default function FeatureFlagManager() {
  const { flags, environment, loading, error, refreshFlags } = useFeatureFlags({ autoRefresh: true });
  const { session } = useSupabase();
  const { isAdmin } = useAuth();
  const [editingFlag, setEditingFlag] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<FeatureFlagFormData>({
    name: '',
    enabled: false,
    description: '',
    version: '1.0',
    rollout_percentage: 0,
    target_environments: []
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const environments = ['development', 'staging', 'production'];

  // Check if user is authenticated and has admin privileges
  if (!session) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-800">Authentication required to manage feature flags</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-800">Admin privileges required to manage feature flags</span>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setFormData({
      name: '',
      enabled: false,
      description: '',
      version: '1.0',
      rollout_percentage: 0,
      target_environments: []
    });
  };

  const handleCreateFlag = () => {
    setShowCreateForm(true);
    setEditingFlag(null);
    resetForm();
  };

  const handleEditFlag = (flagName: string) => {
    const flag = flags[flagName];
    if (flag) {
      setFormData({
        name: flagName,
        enabled: flag.enabled,
        description: flag.description,
        version: flag.version,
        rollout_percentage: flag.rollout_percentage,
        target_environments: flag.target_environments,
        expires_at: flag.expires_at
      });
      setEditingFlag(flagName);
      setShowCreateForm(false);
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingFlag(null);
    resetForm();
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const backendUrl = getBackendUrl();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('Authentication required');
      }

      const url = editingFlag 
        ? `${backendUrl}/api/feature-flags/${editingFlag}`
        : `${backendUrl}/api/feature-flags`;

      const response = await fetch(url, {
        method: editingFlag ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save feature flag');
      }

      setMessage({ type: 'success', text: `Feature flag ${editingFlag ? 'updated' : 'created'} successfully` });
      handleCancel();
      refreshFlags();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFlag = async (flagName: string) => {
    if (!confirm(`Are you sure you want to delete the feature flag "${flagName}"?`)) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const backendUrl = getBackendUrl();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${backendUrl}/api/feature-flags/${flagName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete feature flag');
      }

      setMessage({ type: 'success', text: 'Feature flag deleted successfully' });
      refreshFlags();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFlag = async (flagName: string, enabled: boolean) => {
    setSaving(true);
    setMessage(null);

    try {
      const backendUrl = getBackendUrl();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${backendUrl}/api/feature-flags/${flagName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ enabled })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update feature flag');
      }

      setMessage({ type: 'success', text: `Feature flag ${enabled ? 'enabled' : 'disabled'} successfully` });
      refreshFlags();
    } catch (_err) {
      const error = _err instanceof Error ? _err : new Error('Unknown error');
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-800">Error loading feature flags: {error.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Feature Flags</h2>
          <p className="text-gray-600">Manage feature flags and rollouts</p>
        </div>
        <button
          onClick={handleCreateFlag}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Flag
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          )}
          <span className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </span>
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingFlag) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingFlag ? 'Edit Feature Flag' : 'Create New Feature Flag'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                disabled={!!editingFlag}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rollout Percentage</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.rollout_percentage}
                onChange={(e) => setFormData({ ...formData, rollout_percentage: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
              <input
                type="datetime-local"
                value={formData.expires_at || ''}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Environments</label>
              <div className="flex flex-wrap gap-2">
                {environments.map((env) => (
                  <label key={env} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.target_environments.includes(env)}
                      onChange={(e) => {
                        const newEnvs = e.target.checked
                          ? [...formData.target_environments, env]
                          : formData.target_environments.filter(envItem => envItem !== env);
                        setFormData({ ...formData, target_environments: newEnvs });
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{env}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.name}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Feature Flags List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Current Flags</h3>
          <p className="text-sm text-gray-600">Environment: {environment}</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {Object.entries(flags).map(([flagName, flag]) => (
            <div key={flagName} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-lg font-medium text-gray-900">{flagName}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      flag.enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      v{flag.version}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">{flag.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>Rollout: {flag.rollout_percentage}%</span>
                    {flag.target_environments.length > 0 && (
                      <span>Environments: {flag.target_environments.join(', ')}</span>
                    )}
                    {flag.expires_at && (
                      <span>Expires: {new Date(flag.expires_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleFlag(flagName, !flag.enabled)}
                    disabled={saving}
                    className={`p-2 rounded-md ${
                      flag.enabled 
                        ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {flag.enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  
                  <button
                    onClick={() => handleEditFlag(flagName)}
                    disabled={saving}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteFlag(flagName)}
                    disabled={saving}
                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-100 rounded-md"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 