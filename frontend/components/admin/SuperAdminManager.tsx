'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, Shield, CheckCircle, XCircle } from 'lucide-react';

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

  const handlePromoteUser = async () => {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/promote-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetEmail: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setEmail('');
        // Optionally refresh the admin list here
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to promote user' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Super Admin Management
        </CardTitle>
        <CardDescription>
          Promote users to super admin status. Only existing super admins can perform this action.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Super Admins */}
        <div>
          <h3 className="text-sm font-medium mb-2">Current Super Admins ({currentAdmins.length})</h3>
          <div className="space-y-2">
            {currentAdmins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No super admins found</p>
            ) : (
              currentAdmins.map((admin) => (
                <div key={admin.id} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{admin.name || 'No name'}</p>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
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
            <Input
              type="email"
              placeholder="Enter user email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={handlePromoteUser} 
              disabled={isLoading || !email.trim()}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Promote
            </Button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            {message.type === 'error' ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Only existing super admins can promote new super admins</p>
          <p>• The user must already have an account in the system</p>
          <p>• Super admins have full access to all admin features</p>
        </div>
      </CardContent>
    </Card>
  );
}
