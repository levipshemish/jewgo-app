import React from 'react';
import { render } from '@testing-library/react';
import MagicLinkPage from '../../app/auth/magic/page';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: () => ({ replace: jest.fn() }),
}));

describe('Magic Link Page', () => {
  const mockSearchParams = { get: jest.fn() };
  const originalLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    delete (window as any).location;
    // @ts-ignore replace with mockable object
    (window as any).location = { replace: jest.fn() };
    (require('next/navigation').useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.jewgo.app';
  });

  afterAll(() => {
    // @ts-ignore restore
    window.location = originalLocation;
  });

  it('redirects to backend consume endpoint when params present', () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'token') return 'sig.payload';
      if (key === 'email') return 'user@example.com';
      if (key === 'rt') return '/eatery';
      return null;
    });

    render(<MagicLinkPage />);

    expect((window.location as any).replace).toHaveBeenCalled();
    const calledWith = (window.location as any).replace.mock.calls[0][0] as string;
    expect(calledWith).toContain('/api/v5/auth/magic/consume');
    expect(calledWith).toContain('token=');
    expect(calledWith).toContain('email=');
  });
});

