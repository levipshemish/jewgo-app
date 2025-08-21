'use client';

import React, { useState, useEffect } from 'react';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

interface TestItem {
  id: number;
  title: string;
  content: string;
}

export default function InfiniteScrollTest() {
  const [items, setItems] = useState<TestItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);

  // Simulate loading more data
  const loadMoreData = async () => {
    console.log('Test: Loading more data, page:', page);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate mock data
    const newItems: TestItem[] = [];
    for (let i = 0; i < 5; i++) {
      const id = (page - 1) * 5 + i + 1;
      newItems.push({
        id,
        title: `Item ${id}`,
        content: `This is the content for item ${id}. Page ${page}.`
      });
    }
    
    setItems(prev => [...prev, ...newItems]);
    setPage(prev => prev + 1);
    
    // Stop after 5 pages
    if (page >= 5) {
      setHasMoreData(false);
    }
  };

  // Initialize with first page
  useEffect(() => {
    loadMoreData();
  }, []);

  const { loadMore, hasMore, isLoadingMore, loadingRef } = useInfiniteScroll(
    loadMoreData,
    {
      threshold: 0.1,
      rootMargin: '100px',
      disabled: false
    }
  );

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Infinite Scroll Test</h2>
      <p>Scroll down to test infinite scroll functionality</p>
      
      <div style={{ marginBottom: '20px' }}>
        <p>Total items: {items.length}</p>
        <p>Current page: {page - 1}</p>
        <p>Has more: {hasMoreData ? 'Yes' : 'No'}</p>
        <p>Loading: {isLoadingMore ? 'Yes' : 'No'}</p>
      </div>

      <div style={{ height: '400px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
        {items.map(item => (
          <div 
            key={item.id} 
            style={{ 
              padding: '10px', 
              margin: '10px 0', 
              backgroundColor: '#f5f5f5',
              borderRadius: '4px'
            }}
          >
            <h3>{item.title}</h3>
            <p>{item.content}</p>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoadingMore && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Loading more items...</p>
          </div>
        )}
        
        {/* End of content */}
        {!hasMoreData && items.length > 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            <p>You've reached the end of the content!</p>
          </div>
        )}
        
        {/* Infinite scroll trigger */}
        {hasMoreData && (
          <div 
            ref={loadingRef}
            style={{ 
              height: '20px', 
              width: '100%',
              margin: '20px 0'
            }}
          />
        )}
      </div>
    </div>
  );
}
