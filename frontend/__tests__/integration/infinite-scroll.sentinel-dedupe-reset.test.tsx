import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

type Item = { id: number; name: string };

// Mock IntersectionObserver
let ioCallback: ((entries: any[]) => void) | null = null;
beforeAll(() => {
  // @ts-ignore
  global.IntersectionObserver = jest.fn().mockImplementation((cb) => {
    ioCallback = cb;
    return { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
  });
});

function DummyList() {
  const [items, setItems] = React.useState<Item[]>([]);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  const loadMore = React.useCallback(async ({ offset, limit: _limit }: { signal: AbortSignal; offset: number; limit: number }) => {
    // Return 5 items per page with overlap: last id repeats to test dedupe
    const base = offset;
    const newItems: Item[] = Array.from({ length: 5 }).map((_, i) => ({ id: base + i, name: `R${base + i}` }));
    // Add overlap when not first page
    if (offset > 0) newItems[0] = { id: base - 1, name: `R${base - 1}` };
    // Dedupe before commit
    setItems(prev => {
      const seen = new Set(prev.map(x => x.id));
      const uniq = newItems.filter(x => !seen.has(x.id));
      return [...prev, ...uniq];
    });
    return { appended: newItems.length };
  }, []);

  const { state: _state, actions } = useInfiniteScroll(loadMore as any, { limit: 5, reinitOnPageShow: false, isBot: false });

  React.useEffect(() => {
    if (sentinelRef.current) actions.attachSentinel(sentinelRef.current);
  }, [actions]);

  return (
    <div>
      <div data-testid="count">{items.length}</div>
      <div ref={sentinelRef} />
      <button data-testid="reset" onClick={() => { actions.resetForFilters(); setItems([]); }}>reset</button>
    </div>
  );
}

describe('Infinite scroll sentinel + dedupe + reset', () => {
  it('appends on sentinel, dedupes overlapping ids, and resets on filter change', async () => {
    render(<DummyList />);

    // First IO trigger
    await act(async () => {
      void (ioCallback && ioCallback([{ isIntersecting: true }]));
    });
    expect(screen.getByTestId('count').textContent).toBe('5');

    // Second IO trigger (overlap on first id)
    await act(async () => {
      void (ioCallback && ioCallback([{ isIntersecting: true }]));
    });
    // We appended 5 but deduped 1 overlap => +4 => total 9
    expect(screen.getByTestId('count').textContent).toBe('9');

    // Reset for filters
    await act(async () => {
      screen.getByTestId('reset').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(screen.getByTestId('count').textContent).toBe('0');
  });
});

