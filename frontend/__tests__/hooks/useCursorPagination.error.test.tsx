import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';

function TestComp() {
  const hook = useCursorPagination(10);
  React.useEffect(() => {
    // Trigger a fetch with an invalid/expired cursor
    hook.fetchWithCursor('bad-cursor', '', {}, false);
  }, []);
  return (
    <div>
      <div data-testid="error">{hook.error || ''}</div>
      <div data-testid="hasMore">{String(hook.hasMore)}</div>
      <div data-testid="cursor">{hook.currentCursor || ''}</div>
    </div>
  );
}

describe('useCursorPagination error handling', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('clears cursor and hasMore on expired/invalid cursor', async () => {
    // Mock fetch to simulate 410 Gone
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 410,
      statusText: 'Gone',
      json: async () => ({ success: false, error: 'Cursor expired' }),
    });

    render(<TestComp />);

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent || '').toMatch(/HTTP 410|Cursor expired/i);
      expect(screen.getByTestId('hasMore').textContent).toBe('false');
      expect(screen.getByTestId('cursor').textContent).toBe('');
    });
  });
});

