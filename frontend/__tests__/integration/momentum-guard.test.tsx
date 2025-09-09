import React from 'react';
import { render, act } from '@testing-library/react';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

let ioCallback: ((entries: any[]) => void) | null = null;

beforeAll(() => {
  // @ts-ignore
  Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  // @ts-ignore
  global.IntersectionObserver = jest.fn().mockImplementation((cb) => {
    ioCallback = cb;
    return { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
  });
});

function MomentumHarness() {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const callsRef = React.useRef<number>(0);

  const loadMore = React.useCallback(async () => {
    callsRef.current += 1;
    return { appended: 5 };
  }, []);

  const { actions } = useInfiniteScroll((args: any) => loadMore(args), {
    limit: 5,
    reinitOnPageShow: false,
    isBot: false,
  });

  React.useEffect(() => {
    if (sentinelRef.current) actions.attachSentinel(sentinelRef.current);
  }, [actions]);

  // @ts-ignore
  (window as any).__CALLS__ = callsRef;

  return <div ref={sentinelRef} />;
}

describe('Momentum guard limits consecutive auto-loads without scroll delta', () => {
  it('does not spam loadMore when scrollY unchanged', async () => {
    render(<MomentumHarness />);

    // Simulate multiple IO triggers without scroll delta
    for (let i = 0; i < 5; i++) {
      await act(async () => { void (ioCallback && ioCallback([{ isIntersecting: true }])); });
    }
    const callsNoDelta = (window as any).__CALLS__.current as number;
    expect(callsNoDelta).toBeLessThanOrEqual(2); // IS_MAX_CONSEC_AUTOLOADS=2

    // Change scroll position enough to satisfy delta and allow loading again
    // @ts-ignore
    window.scrollY = 100;
    await act(async () => { void (ioCallback && ioCallback([{ isIntersecting: true }])); });
    const callsAfterDelta = (window as any).__CALLS__.current as number;
    expect(callsAfterDelta).toBeGreaterThan(callsNoDelta);
  });
});

