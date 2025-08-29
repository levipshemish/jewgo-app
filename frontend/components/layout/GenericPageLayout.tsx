import React, { useRef } from 'react';
import styles from './GenericPageLayout.module.css';

interface GenericPageLayoutProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T, index: number) => React.Key;
  pageTitle?: string;
  enableInfiniteScroll?: boolean;
  hasNextPage?: boolean;
  gridClassName?: string;
  minColumnWidth?: string;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  listLabel?: string;
  sentinelRef?: React.RefObject<HTMLDivElement>;
  emptyRenderer?: () => React.ReactNode;
  header?: React.ReactNode;
  navigation?: React.ReactNode;
  actions?: React.ReactNode;
  beforeItems?: React.ReactNode;
  afterItems?: React.ReactNode;
  footer?: React.ReactNode;
  as?: React.ElementType;
  containerClassName?: string;
  ariaColCount?: number;
  ariaRowCount?: number;
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
    minColumnWidth = '150px',
    isLoading = false,
    isLoadingMore = false,
    listLabel,
    sentinelRef,
    emptyRenderer,
    header,
    navigation,
    actions,
    beforeItems,
    afterItems,
    footer,
    as: Wrapper = 'section',
    containerClassName,
    ariaColCount,
    ariaRowCount,
  } = props;

  const internalSentinelRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = sentinelRef ?? internalSentinelRef;

  return (
    <Wrapper className={containerClassName ?? ''}>
      {(header || navigation || actions) && (
        <div className={styles.stickyTop}>
          {header}
          {navigation}
          {actions}
        </div>
      )}

      <div className={styles.pageContainer}>
        {pageTitle && <h1 className={styles.pageTitle}>{pageTitle}</h1>}

        {beforeItems}

        {items.length > 0 || isLoading ? (
          <div
            className={`${styles.grid} ${gridClassName ?? ''}`}
            style={{ ['--min-col' as any]: minColumnWidth }}
            data-testid="gpl-grid"
            role="grid"
            aria-busy={isLoading || isLoadingMore}
            aria-label={listLabel || pageTitle}
            aria-colcount={ariaColCount}
            aria-rowcount={ariaRowCount}
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

        {afterItems}
      </div>

      {footer}

      <div className={styles.srOnly} aria-live="polite">
        {isLoadingMore ? 'Loading more…' : ''}
      </div>
    </Wrapper>
  );
}

