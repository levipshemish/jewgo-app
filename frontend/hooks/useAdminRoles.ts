import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'react-hot-toast';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  role_level?: number;
  assigned_at?: string;
  expires_at?: string;
  notes?: string;
}

interface RoleData {
  users: User[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

interface RoleParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  user_id?: string;
}

interface AssignRoleParams {
  user_id: string;
  role: string;
  expires_at?: string;
  notes?: string;
}

interface RevokeRoleParams {
  user_id: string;
  role: string;
}

// API functions
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.');
    error.message = await response.text();
    throw error;
  }
  return response.json();
};

const roleApiCall = async (url: string, options: RequestInit) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${response.status}`);
  }
  
  return response.json();
};

// Main data fetching hook
export function useAdminRoles(params: RoleParams = {}, initialData?: RoleData) {
  const { page = 1, limit = 50, search = '', role = '', user_id = '' } = params;
  
  // Build query string
  const queryParams = new URLSearchParams();
  if (page) queryParams.set('page', page.toString());
  if (limit) queryParams.set('limit', limit.toString());
  if (search) queryParams.set('search', search);
  if (role) queryParams.set('role', role);
  if (user_id) queryParams.set('user_id', user_id);
  
  const url = `/api/admin/roles?${queryParams.toString()}`;
  
  const { data, error, isLoading, mutate: swrMutate } = useSWR<{ success: boolean; data: RoleData; message: string }>(
    url,
    fetcher,
    {
      fallbackData: initialData ? { success: true, data: initialData, message: 'Success' } : undefined,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
    }
  );
  
  return {
    data: data?.data,
    error,
    isLoading,
    mutate: swrMutate,
  };
}

// Role assignment hook
export function useAssignRole() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const assignRole = async (params: AssignRoleParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Optimistic update
      const optimisticData = {
        action: 'assign',
        ...params,
      };
      
      // Update cache optimistically
      await mutate(
        '/api/admin/roles',
        (currentData: any) => {
          if (!currentData?.data?.users) return currentData;
          
          const updatedUsers = currentData.data.users.map((user: User) => {
            if (user.id === params.user_id) {
              return {
                ...user,
                role: params.role,
                role_level: getRoleLevel(params.role),
                assigned_at: new Date().toISOString(),
                expires_at: params.expires_at,
                notes: params.notes,
              };
            }
            return user;
          });
          
          return {
            ...currentData,
            data: {
              ...currentData.data,
              users: updatedUsers,
            },
          };
        },
        false // Don't revalidate immediately
      );
      
      // Make API call
      const result = await roleApiCall('/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify(optimisticData),
      });
      
      // Revalidate to get fresh data
      await mutate('/api/admin/roles');
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      
      // Revert optimistic update on error
      await mutate('/api/admin/roles');
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    mutateAsync: assignRole,
    isLoading,
    error,
  };
}

// Role revocation hook
export function useRevokeRole() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const revokeRole = async (params: RevokeRoleParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Optimistic update
      const optimisticData = {
        action: 'revoke',
        ...params,
      };
      
      // Update cache optimistically
      await mutate(
        '/api/admin/roles',
        (currentData: any) => {
          if (!currentData?.data?.users) return currentData;
          
          const updatedUsers = currentData.data.users.map((user: User) => {
            if (user.id === params.user_id && user.role === params.role) {
              return {
                ...user,
                role: undefined,
                role_level: undefined,
                assigned_at: undefined,
                expires_at: undefined,
                notes: undefined,
              };
            }
            return user;
          });
          
          return {
            ...currentData,
            data: {
              ...currentData.data,
              users: updatedUsers,
            },
          };
        },
        false // Don't revalidate immediately
      );
      
      // Make API call
      const result = await roleApiCall('/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify(optimisticData),
      });
      
      // Revalidate to get fresh data
      await mutate('/api/admin/roles');
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      
      // Revert optimistic update on error
      await mutate('/api/admin/roles');
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    mutateAsync: revokeRole,
    isLoading,
    error,
  };
}

// Available roles hook
export function useAvailableRoles() {
  const { data, error, isLoading } = useSWR<{ success: boolean; data: any[]; message: string }>(
    '/api/admin/roles/available',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes - roles don't change often
    }
  );
  
  return {
    roles: data?.data || [],
    error,
    isLoading,
  };
}

// Utility functions
function getRoleLevel(role: string): number {
  const roleLevels: Record<string, number> = {
    moderator: 1,
    data_admin: 2,
    system_admin: 3,
    super_admin: 4,
  };
  
  return roleLevels[role] || 0;
}

// Cache management utilities
export const updateUserRoleInCache = async (userId: string, roleData: Partial<User>) => {
  await mutate(
    '/api/admin/roles',
    (currentData: any) => {
      if (!currentData?.data?.users) return currentData;
      
      const updatedUsers = currentData.data.users.map((user: User) => {
        if (user.id === userId) {
          return { ...user, ...roleData };
        }
        return user;
      });
      
      return {
        ...currentData,
        data: {
          ...currentData.data,
          users: updatedUsers,
        },
      };
    },
    false
  );
};

export const removeUserRoleFromCache = async (userId: string, role: string) => {
  await mutate(
    '/api/admin/roles',
    (currentData: any) => {
      if (!currentData?.data?.users) return currentData;
      
      const updatedUsers = currentData.data.users.map((user: User) => {
        if (user.id === userId && user.role === role) {
          return {
            ...user,
            role: undefined,
            role_level: undefined,
            assigned_at: undefined,
            expires_at: undefined,
            notes: undefined,
          };
        }
        return user;
      });
      
      return {
        ...currentData,
        data: {
          ...currentData.data,
          users: updatedUsers,
        },
      };
    },
    false
  );
};

export const addUserRoleToCache = async (userId: string, roleData: User) => {
  await mutate(
    '/api/admin/roles',
    (currentData: any) => {
      if (!currentData?.data?.users) return currentData;
      
      const updatedUsers = currentData.data.users.map((user: User) => {
        if (user.id === userId) {
          return { ...user, ...roleData };
        }
        return user;
      });
      
      return {
        ...currentData,
        data: {
          ...currentData.data,
          users: updatedUsers,
        },
      };
    },
    false
  );
};

export const rollbackCacheUpdate = async () => {
  await mutate('/api/admin/roles');
};
