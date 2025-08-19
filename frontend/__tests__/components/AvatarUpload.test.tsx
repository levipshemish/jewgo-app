import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvatarUpload from '@/components/profile/AvatarUpload';

// Mock the server actions
jest.mock('@/app/actions/upload-avatar', () => ({
  uploadAvatar: jest.fn(),
  deleteAvatar: jest.fn(),
}));

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false,
    isDragReject: false,
  }),
}));

describe('AvatarUpload', () => {
  const mockOnAvatarChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onAvatarChange={mockOnAvatarChange}
      />
    );

    expect(screen.getByText('Upload avatar')).toBeInTheDocument();
  });

  it('displays current avatar when provided', () => {
    const avatarUrl = 'https://example.com/avatar.jpg';
    
    render(
      <AvatarUpload
        currentAvatarUrl={avatarUrl}
        onAvatarChange={mockOnAvatarChange}
      />
    );

    const avatarImage = screen.getByAltText('Profile avatar');
    expect(avatarImage).toHaveAttribute('src');
    expect(avatarImage.getAttribute('src')).toContain('example.com');
  });

  it('shows placeholder when no avatar is provided', () => {
    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onAvatarChange={mockOnAvatarChange}
      />
    );

    // Should show the placeholder SVG icon
    const placeholder = document.querySelector('svg');
    expect(placeholder).toBeInTheDocument();
  });

  it('displays file type and size information', () => {
    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onAvatarChange={mockOnAvatarChange}
      />
    );

    expect(screen.getByText('PNG, JPG, WebP, or GIF up to 5MB')).toBeInTheDocument();
  });

  it('has browse button for file selection', () => {
    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onAvatarChange={mockOnAvatarChange}
      />
    );

    expect(screen.getByText('browse')).toBeInTheDocument();
  });
});
