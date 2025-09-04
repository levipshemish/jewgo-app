import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import RoleManagementTable from '@/components/admin/RoleManagementTable';

// Mock the custom hooks
jest.mock('@/hooks/useAdminRoles', () => ({
  useAdminRoles: jest.fn(),
  useAssignRole: jest.fn(),
  useRevokeRole: jest.fn(),
  useAvailableRoles: jest.fn(),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

const mockInitialData = {
  users: [
    {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'moderator',
      role_level: 1,
      assigned_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'data_admin',
      role_level: 2,
      assigned_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'user-3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      role: undefined,
      role_level: undefined,
    },
  ],
  total: 3,
  page: 1,
  limit: 50,
  has_more: false,
};

const mockUseAdminRoles = {
  data: mockInitialData,
  isLoading: false,
  error: null,
  mutate: jest.fn(),
};

const mockUseAssignRole = {
  mutateAsync: jest.fn(),
  isLoading: false,
  error: null,
};

const mockUseRevokeRole = {
  mutateAsync: jest.fn(),
  isLoading: false,
  error: null,
};

const mockUseAvailableRoles = {
  roles: [
    { id: '1', name: 'moderator', display_name: 'Moderator' },
    { id: '2', name: 'data_admin', display_name: 'Data Admin' },
    { id: '3', name: 'system_admin', display_name: 'System Admin' },
    { id: '4', name: 'super_admin', display_name: 'Super Admin' },
  ],
  isLoading: false,
  error: null,
};

const renderWithSWR = (component: React.ReactElement) => {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      {component}
    </SWRConfig>
  );
};

describe('RoleManagementTable', () => {
  const { useAdminRoles, useAssignRole, useRevokeRole, useAvailableRoles } = require('@/hooks/useAdminRoles');

  beforeEach(() => {
    jest.clearAllMocks();
    useAdminRoles.mockReturnValue(mockUseAdminRoles);
    useAssignRole.mockReturnValue(mockUseAssignRole);
    useRevokeRole.mockReturnValue(mockUseRevokeRole);
    useAvailableRoles.mockReturnValue(mockUseAvailableRoles);
  });

  describe('Rendering', () => {
    it('renders user list correctly', () => {
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('displays role badges with correct colors', () => {
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      const moderatorBadge = screen.getByText('MODERATOR');
      const dataAdminBadge = screen.getByText('DATA ADMIN');
      
      expect(moderatorBadge).toHaveClass('bg-blue-100', 'text-blue-800');
      expect(dataAdminBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('shows role level indicators', () => {
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      // Should show role level dots for users with roles
      const roleLevelIndicators = document.querySelectorAll('[class*="bg-indigo-600"]');
      expect(roleLevelIndicators.length).toBeGreaterThan(0);
    });

    it('handles empty state', () => {
      const emptyData = { ...mockInitialData, users: [] };
      useAdminRoles.mockReturnValue({ ...mockUseAdminRoles, data: emptyData });
      
      renderWithSWR(<RoleManagementTable initialData={emptyData} />);
      
      expect(screen.getByText('No users found')).toBeInTheDocument();
      expect(screen.getByText('No users with admin roles found.')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      useAdminRoles.mockReturnValue({ ...mockUseAdminRoles, isLoading: true });
      
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      expect(screen.getByText('Loading users...')).toBeInTheDocument();
    });

    it('shows error state', () => {
      const error = new Error('Failed to load users');
      useAdminRoles.mockReturnValue({ ...mockUseAdminRoles, error });
      
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      expect(screen.getByText('Error loading users')).toBeInTheDocument();
      expect(screen.getByText('Failed to load users')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('handles search functionality', async () => {
      const user = userEvent.setup();
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      const searchInput = screen.getByPlaceholderText('Search users by name or email...');
      await user.type(searchInput, 'john');
      
      expect(searchInput).toHaveValue('john');
    });

    it('handles role filtering', async () => {
      const user = userEvent.setup();
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      const roleFilter = screen.getByDisplayValue('All Roles');
      await user.selectOptions(roleFilter, 'moderator');
      
      expect(roleFilter).toHaveValue('moderator');
    });
  });

  describe('Role Assignment', () => {
    it('opens assignment modal on button click', async () => {
      const user = userEvent.setup();
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      const assignButton = screen.getByText('Assign Role');
      await user.click(assignButton);
      
      expect(screen.getByText('Assign Role')).toBeInTheDocument();
      expect(screen.getByText('Select a role')).toBeInTheDocument();
    });

    it('opens assignment modal for specific user', async () => {
      const user = userEvent.setup();
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]); // Click first user's edit button
      
      expect(screen.getByText('Assign Role to John Doe')).toBeInTheDocument();
    });

    it('submits role assignment successfully', async () => {
      const user = userEvent.setup();
      mockUseAssignRole.mutateAsync.mockResolvedValue({ success: true });
      
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      // Open assignment modal
      const assignButton = screen.getByText('Assign Role');
      await user.click(assignButton);
      
      // Select a user before submitting (UI requires selection)
      const userSelect = screen.getByLabelText('Select User');
      await user.selectOptions(userSelect, 'user-3');
      
      // Fill form
      const roleSelect = screen.getByDisplayValue('Select a role');
      await user.selectOptions(roleSelect, 'system_admin');
      
      // Submit form
      const submitButton = screen.getByText('Assign Role');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockUseAssignRole.mutateAsync).toHaveBeenCalledWith({
          user_id: 'user-3',
          role: 'system_admin',
          expires_at: undefined,
          notes: undefined,
        });
      });
    });

    it('handles assignment errors', async () => {
      const user = userEvent.setup();
      const error = new Error('Assignment failed');
      mockUseAssignRole.mutateAsync.mockRejectedValue(error);
      
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      // Open assignment modal
      const assignButton = screen.getByText('Assign Role');
      await user.click(assignButton);
      
      // Fill and submit form
      const roleSelect = screen.getByDisplayValue('Select a role');
      await user.selectOptions(roleSelect, 'moderator');
      
      const submitButton = screen.getByText('Assign Role');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockUseAssignRole.mutateAsync).toHaveBeenCalled();
      });
    });
  });

  describe('Role Revocation', () => {
    it('opens revocation confirmation for user with role', async () => {
      const user = userEvent.setup();
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      const revokeButtons = screen.getAllByText('Revoke');
      await user.click(revokeButtons[0]); // Click first user's revoke button
      
      expect(screen.getByText('Revoke Role')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to revoke the moderator role from John Doe/)).toBeInTheDocument();
    });

    it('does not show revoke button for users without roles', () => {
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      const revokeButtons = screen.getAllByText('Revoke');
      expect(revokeButtons).toHaveLength(2); // Only 2 users have roles
    });

    it('submits role revocation successfully', async () => {
      const user = userEvent.setup();
      mockUseRevokeRole.mutateAsync.mockResolvedValue({ success: true });
      
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      // Open revocation modal
      const revokeButtons = screen.getAllByText('Revoke');
      await user.click(revokeButtons[0]);
      
      // Confirm revocation
      const confirmButton = screen.getByText('Revoke Role');
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(mockUseRevokeRole.mutateAsync).toHaveBeenCalledWith({
          user_id: 'user-1',
          role: 'moderator',
        });
      });
    });

    it('cancels role revocation', async () => {
      const user = userEvent.setup();
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      // Open revocation modal
      const revokeButtons = screen.getAllByText('Revoke');
      await user.click(revokeButtons[0]);
      
      // Cancel revocation
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(screen.queryByText('Revoke Role')).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('shows pagination controls when needed', () => {
      const paginatedData = { ...mockInitialData, total: 100, has_more: true };
      useAdminRoles.mockReturnValue({ ...mockUseAdminRoles, data: paginatedData });
      
      renderWithSWR(<RoleManagementTable initialData={paginatedData} />);
      
      expect(screen.getByText('Showing 1 to 3 of 100 users')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('handles pagination navigation', async () => {
      const user = userEvent.setup();
      const paginatedData = { ...mockInitialData, total: 100, has_more: true };
      useAdminRoles.mockReturnValue({ ...mockUseAdminRoles, data: paginatedData });
      
      renderWithSWR(<RoleManagementTable initialData={paginatedData} />);
      
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);
      
      expect(mockUseAdminRoles.mutate).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('validates required fields in assignment form', async () => {
      const user = userEvent.setup();
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      // Open assignment modal
      const assignButton = screen.getByText('Assign Role');
      await user.click(assignButton);
      
      // Try to submit without selecting role
      const submitButton = screen.getByText('Assign Role');
      await user.click(submitButton);
      
      // Button should be disabled
      expect(submitButton).toBeDisabled();
    });

    it('validates date inputs', async () => {
      const user = userEvent.setup();
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      // Open assignment modal
      const assignButton = screen.getByText('Assign Role');
      await user.click(assignButton);
      
      // Fill form with role
      const roleSelect = screen.getByDisplayValue('Select a role');
      await user.selectOptions(roleSelect, 'moderator');
      
      // Add expiration date
      const expiresInput = screen.getByLabelText('Expires At (UTC, Optional)');
      await user.type(expiresInput, '2024-12-31T23:59');
      
      expect(expiresInput).toHaveValue('2024-12-31T23:59');
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByPlaceholderText('Search users by name or email...')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByDisplayValue('All Roles')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Assign Role')).toHaveFocus();
    });

    it('provides screen reader support', () => {
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      // Check for proper labels and descriptions
      expect(screen.getByLabelText('Search users by name or email...')).toBeInTheDocument();
      expect(screen.getByLabelText('Expires At (UTC, Optional)')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      const networkError = new Error('Network error');
      mockUseAssignRole.mutateAsync.mockRejectedValue(networkError);
      
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      // Open assignment modal and submit
      const assignButton = screen.getByText('Assign Role');
      await user.click(assignButton);
      
      const roleSelect = screen.getByDisplayValue('Select a role');
      await user.selectOptions(roleSelect, 'moderator');
      
      const submitButton = screen.getByText('Assign Role');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockUseAssignRole.mutateAsync).toHaveBeenCalled();
      });
    });

    it('reverts optimistic updates on error', async () => {
      const user = userEvent.setup();
      const error = new Error('Assignment failed');
      mockUseAssignRole.mutateAsync.mockRejectedValue(error);
      
      renderWithSWR(<RoleManagementTable initialData={mockInitialData} />);
      
      // Open assignment modal and submit
      const assignButton = screen.getByText('Assign Role');
      await user.click(assignButton);
      
      const roleSelect = screen.getByDisplayValue('Select a role');
      await user.selectOptions(roleSelect, 'super_admin');
      
      const submitButton = screen.getByText('Assign Role');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockUseAdminRoles.mutate).toHaveBeenCalled(); // Should revert cache
      });
    });
  });

  describe('Performance', () => {
    it('handles large user lists efficiently', () => {
      const largeData = {
        ...mockInitialData,
        users: Array.from({ length: 100 }, (_, i) => ({
          id: `user-${i}`,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          role: i % 2 === 0 ? 'moderator' : undefined,
          role_level: i % 2 === 0 ? 1 : undefined,
        })),
        total: 100,
      };
      
      useAdminRoles.mockReturnValue({ ...mockUseAdminRoles, data: largeData });
      
      const startTime = performance.now();
      renderWithSWR(<RoleManagementTable initialData={largeData} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
