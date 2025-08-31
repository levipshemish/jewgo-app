import { useAuth } from '@/hooks/useAuth';
import { Permission } from '@/lib/constants/permissions';

// Mock admin user for testing
export const mockAdmin = () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  mockUseAuth.mockReturnValue({
    user: {
      id: 'test-admin-id',
      email: 'admin@jewgo.com',
      name: 'Admin User',
      username: 'admin',
      provider: 'email' as const,
      avatar_url: null,
      providerInfo: {
        name: 'email',
        icon: '📧',
        color: '#007bff',
        displayName: 'Email'
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      isEmailVerified: true,
      isPhoneVerified: false,
      role: 'admin',
      permissions: ['restaurant:edit', 'restaurant:delete', 'user:manage'] as Permission[],
      subscriptionTier: 'admin',
      adminRole: 'system_admin',
      roleLevel: 3,
      isSuperAdmin: true
    },
    isLoading: false,
    error: null,
    isAnonymous: false,
    isAnonymousLoading: false,
    isAdmin: true,
    signOut: jest.fn(),
    refreshUser: jest.fn(),
    signInAnonymously: jest.fn(),
    verifyTokenRotationStatus: jest.fn(),
    hasPermission: jest.fn(() => true),
    hasMinimumRoleLevel: jest.fn(() => true)
  });
};

// Mock regular user for testing
export const mockUser = () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  mockUseAuth.mockReturnValue({
    user: {
      id: 'test-user-id',
      email: 'user@example.com',
      name: 'Regular User',
      username: 'user',
      provider: 'email' as const,
      avatar_url: null,
      providerInfo: {
        name: 'email',
        icon: '📧',
        color: '#007bff',
        displayName: 'Email'
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      isEmailVerified: true,
      isPhoneVerified: false,
      role: 'user',
      permissions: ['restaurant:view'] as Permission[],
      subscriptionTier: 'free',
      adminRole: null,
      roleLevel: 1,
      isSuperAdmin: false
    },
    isLoading: false,
    error: null,
    isAnonymous: false,
    isAnonymousLoading: false,
    isAdmin: false,
    signOut: jest.fn(),
    refreshUser: jest.fn(),
    signInAnonymously: jest.fn(),
    verifyTokenRotationStatus: jest.fn(),
    hasPermission: jest.fn(() => false),
    hasMinimumRoleLevel: jest.fn(() => false)
  });
};

// Mock unauthenticated user for testing
export const mockUnauthenticated = () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  mockUseAuth.mockReturnValue({
    user: null,
    isLoading: false,
    error: null,
    isAnonymous: false,
    isAnonymousLoading: false,
    isAdmin: false,
    signOut: jest.fn(),
    refreshUser: jest.fn(),
    signInAnonymously: jest.fn(),
    verifyTokenRotationStatus: jest.fn(),
    hasPermission: jest.fn(() => false),
    hasMinimumRoleLevel: jest.fn(() => false)
  });
};

// Mock loading state for testing
export const mockLoading = () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  mockUseAuth.mockReturnValue({
    user: null,
    isLoading: true,
    error: null,
    isAnonymous: false,
    isAnonymousLoading: false,
    isAdmin: false,
    signOut: jest.fn(),
    refreshUser: jest.fn(),
    signInAnonymously: jest.fn(),
    verifyTokenRotationStatus: jest.fn(),
    hasPermission: jest.fn(() => false),
    hasMinimumRoleLevel: jest.fn(() => false)
  });
};

// Reset mock to default state
export const resetAuthMock = () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  mockUseAuth.mockReturnValue({
    user: null,
    isLoading: false,
    error: null,
    isAnonymous: false,
    isAnonymousLoading: false,
    isAdmin: false,
    signOut: jest.fn(),
    refreshUser: jest.fn(),
    signInAnonymously: jest.fn(),
    verifyTokenRotationStatus: jest.fn(),
    hasPermission: jest.fn(() => false),
    hasMinimumRoleLevel: jest.fn(() => false)
  });
};
