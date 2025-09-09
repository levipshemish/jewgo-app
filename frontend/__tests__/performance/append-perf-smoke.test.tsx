import React from 'react';
import { render, act } from '@testing-library/react';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

// Mock IntersectionObserver
let ioCallback: ((entries: any[]) => void) | null = null;
beforeAll(() => {
  // @ts-ignore
  global.IntersectionObserver = jest.fn().mockImplementation((cb) => {
    ioCallback = cb;
    return { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
  });
});

function PerfHarness() {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const timesRef = React.useRef<number[]>([]);
  const [_appends, setAppends] = React.useState(0);

  const loader = React.useCallback(async () => {
    const t0 = performance.now();
    // Simulate minimal work
    for (let i = 0; i < 1000; i++) {}
    const dt = performance.now() - t0;
    timesRef.current.push(dt);
    setAppends((n) => n + 1);
    return { appended: 5 };
  }, []);

  const { actions } = useInfiniteScroll((args: any) => loader(args), { limit: 5, reinitOnPageShow: false, isBot: false });

  React.useEffect(() => {
    if (sentinelRef.current) actions.attachSentinel(sentinelRef.current);
  }, [actions]);

  React.useEffect(() => {
    // expose stats to global for assertions
    // @ts-ignore
    (window as any).__APPEND_TIMES__ = timesRef.current;
  });

  return <div ref={sentinelRef} data-testid="sentinel" />;
}

describe('Append performance smoke', () => {
  it('collects append durations and computes a p95', async () => {
    render(<PerfHarness />);

    // Trigger 5 appends
    for (let i = 0; i < 5; i++) {
      await act(async () => { void (ioCallback && ioCallback([{ isIntersecting: true }])); });
    }

    const values: number[] = (window as any).__APPEND_TIMES__ || [];
    expect(values.length).toBeGreaterThanOrEqual(5);
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.floor(0.95 * (sorted.length - 1));
    const p95 = sorted[idx];
    // P95 is finite and positive
    expect(Number.isFinite(p95)).toBe(true);
    expect(p95).toBeGreaterThanOrEqual(0);
    // Soft bound to catch pathological slowness in CI without flaking
    expect(p95).toBeLessThan(100);
    // Log for visibility in CI artifacts
    // eslint-disable-next-line no-console
    console.log('Append durations:', values, 'p95=', p95.toFixed(2), 'ms');
  });
});

