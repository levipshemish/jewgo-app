'use client';

import { _useState} from 'react';
import { _LoadingButton} from '@/components/ui/LoadingStates';
import { _Loader2, _UserPlus, _Shield, _CheckCircle, _XCircle} from 'lucide-react';

interface SuperAdminManagerProps {
  currentAdmins: Array<{
    id: string;
    email: string;
    name?: string;
    issuperadmin: boolean;
  }>;
}

export function SuperAdminManager({ currentAdmins }: SuperAdminManagerProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const _handlePromoteUser = async () => {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const _response = await fetch('/api/admin/promote-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetEmail: email.trim() }),
      });

      const _data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setEmail('');
        // Optionally refresh the admin list here
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to promote user' });
      }
    } catch (_error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl border rounded-lg p-6 bg-white shadow-sm">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-2">
          <Shield className="h-5 w-5" />
          Super Admin Management
        </h2>
        <p className="text-gray-600">
          Promote users to super admin status. Only existing super admins can perform this action.
        </p>
      </div>
      <div className="space-y-4">
        {/* Current Super Admins */}
        <div>
          <h3 className="text-sm font-medium mb-2">Current Super Admins ({currentAdmins.length})</h3>
          <div className="space-y-2">
            {currentAdmins.length === 0 ? (
              <p className="text-sm text-gray-500">No super admins found</p>
            ) : (
              currentAdmins.map((admin) => (
                <div key={admin.id} className="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{admin.name || 'No name'}</p>
                    <p className="text-xs text-gray-500">{admin.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Promote New Admin */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Promote New Super Admin</h3>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter user email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <LoadingButton
              onClick={handlePromoteUser}
              loading={isLoading}
              disabled={!email.trim()}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Promote
            </LoadingButton>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className={`p-3 rounded-md border flex items-center gap-2 ${
            message.type === 'error' 
              ? 'border-red-200 bg-red-50 text-red-800' 
              : 'border-green-200 bg-green-50 text-green-800'
          }`}>
            {message.type === 'error' ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Only existing super admins can promote new super admins</p>
          <p>• The user must already have an account in the system</p>
          <p>• Super admins have full access to all admin features</p>
        </div>
      </div>
    </div>
  );
}
