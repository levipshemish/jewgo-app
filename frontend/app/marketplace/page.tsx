'use client';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic'

import MarketplacePageClient from '@/components/marketplace/MarketplacePageClient';

export default function MarketplacePage() {
  return <MarketplacePageClient />;
}
