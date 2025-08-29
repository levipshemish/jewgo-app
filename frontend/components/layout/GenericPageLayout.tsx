import React, { useRef } from 'react';
import styles from './GenericPageLayout.module.css';

interface GenericPageLayoutProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T, index: number) => React.Key;
  pageTitle?: string;
  enableInfiniteScroll?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  enablePagination?: boolean;
  gridClassName?: string;
  minColumnWidth?: string;
  activeTab?: unknown;
  onTabChange?: (tab: unknown) => void;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  listLabel?: string;
  sentinelRef?: React.RefObject<HTMLDivElement>;
  emptyRenderer?: () => React.ReactNode;
  as?: React.ElementType;
}

export function GenericPageLayout<T>(props: GenericPageLayoutProps<T>) {
  const {
    items,
    renderItem,
    getItemKey,
    pageTitle,
    enableInfiniteScroll,
    hasNextPage,
    gridClassName,
    minColumnWidth = '200px',
    isLoading = false,
    isLoadingMore = false,
    listLabel,
    sentinelRef,
    emptyRenderer,
    as: Wrapper = 'section',
  } = props;

  const internalSentinelRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = sentinelRef ?? internalSentinelRef;

  return (
    <Wrapper className={styles.pageContainer}>
      {pageTitle && <h1 className={styles.pageTitle}>{pageTitle}</h1>}

      {items.length > 0 || isLoading ? (
        <div
          className={`${styles.grid} ${gridClassName ?? ''}`}
          style={{ ['--min-col' as any]: minColumnWidth }}
          data-testid="gpl-grid"
          role="grid"
          aria-busy={isLoading || isLoadingMore}
          aria-label={listLabel || pageTitle}
        >
          {items.map((item, index) => (
            <div key={getItemKey ? getItemKey(item, index) : index} role="gridcell">
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      ) : (
        emptyRenderer ? emptyRenderer() : null
      )}

      {enableInfiniteScroll && hasNextPage && (
        <div ref={mergedRef} className={styles.sentinel} data-testid="gpl-sentinel" />
      )}

      <div className={styles.srOnly} aria-live="polite">
        {isLoadingMore ? 'Loading more…' : ''}
      </div>
    </Wrapper>
  );
}

