'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function TestAuthPage() {
  const { user, loading, login, logout, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('admin@jewgo.com');
  const [password, setPassword] = useState('Admin123!');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    try {
      await login(email, password);
      setMessage('Login successful!');
    } catch (error: any) {
      setMessage(`Login failed: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setMessage('Logout successful!');
    } catch (error: any) {
      setMessage(`Logout failed: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Authentication Test Page</h1>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Status</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p><strong>Authenticated:</strong> {isAuthenticated() ? 'Yes' : 'No'}</p>
              <p><strong>User:</strong> {user ? user.email : 'None'}</p>
              <p><strong>Roles:</strong> {user ? user.roles.join(', ') : 'None'}</p>
            </div>
          </div>

          {!isAuthenticated() ? (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Login Test</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={handleLogin}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Test Login
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Logout Test</h2>
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Test Logout
              </button>
            </div>
          )}

          {message && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Message</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">{message}</p>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">Test Instructions</h2>
            <ul className="text-yellow-800 space-y-1">
              <li>• Use the login form above to test authentication</li>
              <li>• Check the browser console for any errors</li>
              <li>• Verify that the user state updates correctly</li>
              <li>• Test the logout functionality</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
