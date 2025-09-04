import { useAuth } from '@/hooks/useAuth';

// Mock admin user for testing
export const mockAdmin = () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  mockUseAuth.mockReturnValue({
    user: {
      id: 'test-admin-id',
      email: 'admin@jewgo.com',
      name: 'Admin User',
      full_name: 'Admin User',
      email_verified: true,
      roles: [
        { role: 'admin', level: 3, granted_at: '2024-01-01T00:00:00Z' }
      ]
    },
    loading: false,
    error: null,
    isAuthenticated: jest.fn(() => true),
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
      full_name: 'Regular User',
      email_verified: true,
      roles: [
        { role: 'user', level: 1, granted_at: '2024-01-01T00:00:00Z' }
      ]
    },
    loading: false,
    error: null,
    isAuthenticated: jest.fn(() => true),
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
    loading: false,
    error: null,
    isAuthenticated: jest.fn(() => false),
    signOut: jest.fn(),
    refreshUser: jest.fn(),
    signInAnonymously: jest.fn(),
    verifyTokenRotationStatus: jest.fn(),
    hasPermission: jest.fn(() => false),
    hasMinimumRoleLevel: jest.fn(() => false)
  });
};
