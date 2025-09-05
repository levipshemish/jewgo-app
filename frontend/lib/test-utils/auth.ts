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
    isLoading: false,
    loading: false,
    error: null,
    isAnonymous: false,
    isAuthenticated: true,
    signOut: jest.fn(),
    refreshUser: jest.fn(),
    signInAnonymously: jest.fn(),
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
    isLoading: false,
    loading: false,
    error: null,
    isAnonymous: false,
    isAuthenticated: true,
    signOut: jest.fn(),
    refreshUser: jest.fn(),
    signInAnonymously: jest.fn(),
  });
};

// Mock unauthenticated user for testing
export const mockUnauthenticated = () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  mockUseAuth.mockReturnValue({
    user: null,
    isLoading: false,
    loading: false,
    error: null,
    isAnonymous: false,
    isAuthenticated: false,
    signOut: jest.fn(),
    refreshUser: jest.fn(),
    signInAnonymously: jest.fn(),
  });
};
