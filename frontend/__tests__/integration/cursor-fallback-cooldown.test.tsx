import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

// Mock timers for cooldown
jest.useFakeTimers();

// Mock IntersectionObserver
let ioCallback: ((entries: any[]) => void) | null = null;
beforeAll(() => {
  // @ts-ignore
  global.IntersectionObserver = jest.fn().mockImplementation((cb) => {
    ioCallback = cb;
    return { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
  });
});

function FallbackHarness() {
  const FAILS_BEFORE_FALLBACK = 3;
  const COOLDOWN_MS = 120_000;
  const [cursorEnabled, setCursorEnabled] = React.useState(true);
  const [cursorFailCount, setCursorFailCount] = React.useState(0);
  const [mode, setMode] = React.useState<'cursor' | 'offset'>('cursor');
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  const cursorLoader = React.useCallback(async () => {
    setCursorFailCount((n) => n + 1);
    if (cursorFailCount + 1 >= FAILS_BEFORE_FALLBACK) {
      setCursorEnabled(false);
      setMode('offset');
      setTimeout(() => { setCursorFailCount(0); setCursorEnabled(true); setMode('cursor'); }, COOLDOWN_MS);
    }
    return { appended: 0 };
  }, [cursorFailCount]);

  const offsetLoader = React.useCallback(async () => {
    return { appended: 5 };
  }, []);

  const effectiveLoad = cursorEnabled ? cursorLoader : offsetLoader;
  const { actions } = useInfiniteScroll((args: any) => effectiveLoad(args), { limit: 5, reinitOnPageShow: false, isBot: false });

  React.useEffect(() => {
    if (sentinelRef.current) actions.attachSentinel(sentinelRef.current);
  }, [actions]);

  return (
    <div>
      <div ref={sentinelRef} />
      <div data-testid="mode">{mode}</div>
      <div data-testid="fails">{cursorFailCount}</div>
    </div>
  );
}

describe('Cursor fallback -> cooldown -> re-enable', () => {
  it('falls back after failures, then re-enables after cooldown', async () => {
    render(<FallbackHarness />);

    // Trigger 3 failures via cursor loader
    await act(async () => { void (ioCallback && ioCallback([{ isIntersecting: true }])); });
    await act(async () => { void (ioCallback && ioCallback([{ isIntersecting: true }])); });
    await act(async () => { void (ioCallback && ioCallback([{ isIntersecting: true }])); });

    expect(screen.getByTestId('mode').textContent).toBe('offset');
    // Advance time by cooldown
    await act(async () => { jest.advanceTimersByTime(120_000); });
    expect(screen.getByTestId('mode').textContent).toBe('cursor');
  });
});

