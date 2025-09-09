import React from 'react';
import { render, act } from '@testing-library/react';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

let ioCallback: ((entries: any[]) => void) | null = null;

beforeAll(() => {
  // @ts-ignore
  global.IntersectionObserver = jest.fn().mockImplementation((cb) => {
    ioCallback = cb;
    return { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
  });
});

function BFCacheHarness() {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const callsRef = React.useRef<number>(0);

  const loadMore = React.useCallback(async () => {
    callsRef.current += 1;
    return { appended: 5 };
  }, []);

  const { actions } = useInfiniteScroll((args: any) => loadMore(args), {
    limit: 5,
    reinitOnPageShow: true,
    isBot: false,
  });

  React.useEffect(() => {
    if (sentinelRef.current) actions.attachSentinel(sentinelRef.current);
  }, [actions]);

  // expose call count for assertion
  // @ts-ignore
  (window as any).__LOAD_CALLS__ = callsRef;

  return <div ref={sentinelRef} data-testid="sentinel" />;
}

describe('BFCache back/forward does not double-append', () => {
  it('dispatching pageshow (persisted) does not trigger extra load by itself', async () => {
    render(<BFCacheHarness />);

    // Trigger once
    await act(async () => { void (ioCallback && ioCallback([{ isIntersecting: true }])); });
    let calls = (window as any).__LOAD_CALLS__.current as number;
    expect(calls).toBe(1);

    // Simulate BFCache restoration
    const evt: any = new Event('pageshow');
    (evt as any).persisted = true;
    window.dispatchEvent(evt);

    // Ensure no automatic extra call
    calls = (window as any).__LOAD_CALLS__.current as number;
    expect(calls).toBe(1);

    // Trigger again explicitly
    await act(async () => { void (ioCallback && ioCallback([{ isIntersecting: true }])); });
    calls = (window as any).__LOAD_CALLS__.current as number;
    expect(calls).toBe(2);
  });
});

