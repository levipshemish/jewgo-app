'use client';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic'

import ProductDetailPage from '@/components/marketplace/ProductDetailPage';

export default function ProductPage() {
  return <ProductDetailPage />;
}
