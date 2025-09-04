import React from 'react';
import { render, screen } from '@testing-library/react';
import { useUrlScrollState } from '@/lib/hooks/useUrlScrollState';

function SaveComp() {
  const { saveScrollState } = useUrlScrollState();
  React.useEffect(() => {
    saveScrollState('c-123', 'restaurant-42', 250, 48, 'pizza', { category: 'dairy' } as any, 'ver-1');
  }, [saveScrollState]);
  return <div data-testid="saved">saved</div>;
}

function RestoreComp() {
  const { restoreScrollState } = useUrlScrollState();
  const [state, setState] = React.useState<any>(null);
  React.useEffect(() => {
    setState(restoreScrollState('pizza', { category: 'dairy' } as any, 'ver-1'));
  }, [restoreScrollState]);
  return (
    <>
      <div data-testid="cursor">{state?.cursor || ''}</div>
      <div data-testid="anchor">{state?.anchorId || ''}</div>
      <div data-testid="scrollY">{state?.scrollY ?? ''}</div>
      <div data-testid="itemCount">{state?.itemCount ?? ''}</div>
      <div data-testid="dataVersion">{state?.dataVersion || ''}</div>
    </>
  );
}

describe('useUrlScrollState save/restore', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('saves and restores scroll state including anchor and cursor', async () => {
    render(<SaveComp />);
    render(<RestoreComp />);

    expect(screen.getByTestId('cursor').textContent).toBe('c-123');
    expect(screen.getByTestId('anchor').textContent).toBe('restaurant-42');
    expect(screen.getByTestId('scrollY').textContent).toBe('250');
    expect(screen.getByTestId('itemCount').textContent).toBe('48');
    expect(screen.getByTestId('dataVersion').textContent).toBe('ver-1');
  });
});

