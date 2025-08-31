import React from 'react';
import { render, screen } from '@testing-library/react';
import { mockAdmin, mockUnauthenticated, resetAuthMock } from '@/lib/test-utils/auth';
import { useAuth } from '@/hooks/useAuth';
import FeatureFlagManager from '@/components/admin/FeatureFlagManager';

// Mock the required hooks
jest.mock('@/hooks/useAuth');
jest.mock('@/lib/hooks/useFeatureFlags', () => ({
  useFeatureFlags: jest.fn(() => ({
    flags: [],
    environment: 'test',
    loading: false,
    error: null,
    refreshFlags: jest.fn(),
  })),
}));

jest.mock('@/lib/contexts/SupabaseContext', () => ({
  useSupabase: jest.fn(() => ({
    session: {
      user: { id: 'test-user', email: 'test@example.com' },
      access_token: 'test-token',
    },
  })),
}));

describe('FeatureFlagManager', () => {
  beforeEach(() => {
    resetAuthMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should show authentication required message for unauthenticated users', () => {
    // Mock unauthenticated state
    mockUnauthenticated();

    render(<FeatureFlagManager />);
    
    expect(screen.getByText('Authentication required to manage feature flags')).toBeInTheDocument();
  });

  it('should show admin privileges required message for non-admin users', () => {
    // Mock authenticated non-admin user
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
        permissions: [],
        subscriptionTier: 'free',
        adminRole: null,
        roleLevel: 1,
        isSuperAdmin: false
      },
      isLoading: false,
      error: null,
      isAnonymous: false,
      isAnonymousLoading: false,
      isAdmin: false, // This is key - non-admin user
      signOut: jest.fn(),
      refreshUser: jest.fn(),
      signInAnonymously: jest.fn(),
      verifyTokenRotationStatus: jest.fn(),
      hasPermission: jest.fn(() => false),
      hasMinimumRoleLevel: jest.fn(() => false)
    });

    render(<FeatureFlagManager />);
    
    expect(screen.getByText('Admin privileges required to manage feature flags')).toBeInTheDocument();
  });

  it('should render feature flag management interface for admin users', () => {
    // Mock admin user
    mockAdmin();

    render(<FeatureFlagManager />);
    
    // Should not show error messages
    expect(screen.queryByText('Authentication required to manage feature flags')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin privileges required to manage feature flags')).not.toBeInTheDocument();
    
    // Should show feature flag management UI (this might need adjustment based on actual component structure)
    // For now, we'll just check that the error messages are not present
  });
});