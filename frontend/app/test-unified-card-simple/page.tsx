'use client';

import React from 'react';
import UnifiedCard from '@/components/ui/UnifiedCard';

// Simple test data
const testData = {
  id: 'test-1',
  imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
  imageTag: 'Kosher',
  title: 'Test Restaurant',
  badge: '4.5',
  subtitle: '$$$',
  additionalText: '0.5 mi',
  showHeart: true,
  isLiked: false,
  kosherCategory: 'Dairy',
  city: 'Miami'
};

export default function TestUnifiedCardSimple() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f4f4f4', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>UnifiedCard Simple Test</h1>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <UnifiedCard
          data={testData}
          variant="default"
          showStarInBadge={true}
          onCardClick={() => {/* console.log('Card clicked') */}}
        />
        
        <UnifiedCard
          data={{...testData, id: 'test-2', title: 'Another Restaurant'}}
          variant="default"
          showStarInBadge={true}
          onCardClick={() => {/* console.log('Card clicked') */}}
        />
        
        <UnifiedCard
          data={{...testData, id: 'test-3', title: 'Third Restaurant'}}
          variant="default"
          showStarInBadge={true}
          onCardClick={() => {/* console.log('Card clicked') */}}
        />
      </div>
      
      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#fff', borderRadius: '8px' }}>
        <h2 style={{ color: '#333', marginBottom: '10px' }}>Test Instructions:</h2>
        <ul style={{ color: '#666', lineHeight: '1.6' }}>
          <li>Check if cards have transparent backgrounds</li>
          <li>Verify heart button functionality</li>
          <li>Test hover effects</li>
          <li>Check if cards blend with the gray background</li>
        </ul>
      </div>
    </div>
  );
}
