import React from 'react';
import { render, screen } from '@testing-library/react';
import { GenericPageLayout } from '@/components/layout';

describe('GenericPageLayout', () => {
  it('renders items in the grid', () => {
    const items = [1, 2];
    render(
      <GenericPageLayout
        items={items}
        renderItem={(item) => <div data-testid={`item-${item}`}>{item}</div>}
        pageTitle="Test Items"
      />
    );

    expect(screen.getByTestId('gpl-grid')).toBeInTheDocument();
    expect(screen.getByTestId('item-1')).toBeInTheDocument();
    expect(screen.getByTestId('item-2')).toBeInTheDocument();
  });

  it('shows sentinel when infinite scroll has next page', () => {
    render(
      <GenericPageLayout
        items={[]}
        renderItem={() => null}
        pageTitle="Sentinel"
        enableInfiniteScroll
        hasNextPage
      />
    );

    expect(screen.getByTestId('gpl-sentinel')).toBeInTheDocument();
  });

  it('merges grid class and applies min column width', () => {
    render(
      <GenericPageLayout
        items={[1]}
        renderItem={(item) => <div data-testid={`item-${item}`}>{item}</div>}
        pageTitle="Class test"
        gridClassName="custom-grid"
        minColumnWidth="250px"
      />
    );

    const grid = screen.getByTestId('gpl-grid');
    expect(grid).toHaveClass('custom-grid');
    expect(grid.getAttribute('style')).toContain('--min-col: 250px');
  });

  it('uses getItemKey when provided', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const keyFn = jest.fn((item: any) => item.id);

    render(
      <GenericPageLayout
        items={items}
        renderItem={(item) => <div data-testid={`item-${item.id}`}>{item.id}</div>}
        getItemKey={keyFn}
      />
    );

    expect(keyFn).toHaveBeenNthCalledWith(1, items[0], 0);
    expect(keyFn).toHaveBeenNthCalledWith(2, items[1], 1);
  });

  it('omits sentinel when flags are false', () => {
    const { rerender } = render(
      <GenericPageLayout
        items={[]}
        renderItem={() => null}
        pageTitle="No sentinel"
        enableInfiniteScroll={false}
        hasNextPage
      />
    );
    expect(screen.queryByTestId('gpl-sentinel')).toBeNull();

    rerender(
      <GenericPageLayout
        items={[]}
        renderItem={() => null}
        pageTitle="No sentinel"
        enableInfiniteScroll
        hasNextPage={false}
      />
    );
    expect(screen.queryByTestId('gpl-sentinel')).toBeNull();
  });

  it('sets appropriate aria attributes', () => {
    render(
      <GenericPageLayout
        items={[1]}
        renderItem={(item) => <div data-testid={`item-${item}`}>{item}</div>}
        pageTitle="A11y"
        isLoading
        listLabel="Custom label"
      />
    );

    const grid = screen.getByTestId('gpl-grid');
    expect(grid).toHaveAttribute('role', 'grid');
    expect(grid).toHaveAttribute('aria-busy', 'true');
    expect(grid).toHaveAttribute('aria-label', 'Custom label');
  });

  it('renders emptyRenderer when there are no items', () => {
    const empty = jest.fn(() => <div data-testid="empty">No items</div>);
    render(
      <GenericPageLayout
        items={[]}
        renderItem={() => null}
        emptyRenderer={empty}
      />
    );

    expect(empty).toHaveBeenCalled();
    expect(screen.getByTestId('empty')).toBeInTheDocument();
  });

  it('marks grid busy when loading more items', () => {
    render(
      <GenericPageLayout
        items={[1]}
        renderItem={(item) => <div data-testid={`item-${item}`}>{item}</div>}
        isLoadingMore
      />
    );

    const grid = screen.getByTestId('gpl-grid');
    expect(grid).toHaveAttribute('aria-busy', 'true');
  });
});

