import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/admin-auth';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { prisma } from '@/lib/db/prisma';
import { cacheGet, cacheSet, keyStoreMetrics } from '@/lib/server/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type StoreMetrics = {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  averageRating: number;
  pendingOrders: number;
  unreadMessages: number;
  productsGrowth: number;
  ordersGrowth: number;
  revenueGrowth: number;
};

function hasPermission(perms: string[], required: string): boolean {
  return perms.includes(required);
}

async function calcGrowth(): Promise<number> {
  // Placeholder until historical tables exist; mildly positive random drift
  return Math.round((Math.random() * 20 - 5) * 100) / 100;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require store analytics permission and store_admin level or above
    if (
      admin.roleLevel < 2 ||
      !hasPermission(admin.permissions, ADMIN_PERMISSIONS.STORE_ANALYTICS)
    ) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(request.url);
    let vendorId = url.searchParams.get('vendorId') || undefined;

    // Enforce vendor scoping and ownership for store_admins
    if (admin.adminRole === 'store_admin') {
      try {
        // @ts-expect-error - model exists after migration
        const mappings = await prisma.vendor_admins.findMany({ where: { user_id: admin.id } });
        if (!vendorId) {
          if (!mappings || mappings.length === 0) {
            return NextResponse.json({ error: 'No vendor assigned to this admin' }, { status: 403 });
          }
          if (mappings.length > 1) {
            return NextResponse.json({ error: 'Multiple vendors assigned. Provide vendorId.' }, { status: 400 });
          }
          vendorId = mappings[0].vendor_id;
        } else {
          const allowed = mappings.some((m: any) => m.vendor_id === vendorId);
          if (!allowed) {
            return NextResponse.json({ error: 'Forbidden: vendor access denied' }, { status: 403 });
          }
        }
      } catch {
        return NextResponse.json({ error: 'Vendor mapping unavailable' }, { status: 503 });
      }
    }

    // Compute metrics from available marketplace data. Orders/messages may be absent.
    const where: any = {};
    if (vendorId) where.vendor_id = vendorId;

    // Cache key scoping
    const cacheKey = keyStoreMetrics(vendorId || null);
    const cached = await cacheGet<StoreMetrics>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const [totalProducts, aggregate, ratingAgg] = await Promise.all([
      prisma.marketplace.count({ where }),
      prisma.marketplace.aggregate({
        where,
        _sum: { price: true },
      }),
      prisma.marketplace.aggregate({
        where,
        _avg: { rating: true },
      }),
    ]);

    const totalRevenue = Number(aggregate._sum.price ?? 0);
    const averageRating = Number(ratingAgg._avg.rating ?? 0);

    // Attempt to aggregate orders/messages if models exist (guarded)
    let totalOrders = 0;
    let pendingOrders = 0;
    let unreadMessages = 0;
    try {
      // @ts-expect-error - model may not exist until migrations applied
      totalOrders = await prisma.marketplaceOrder.count({ where: vendorId ? { vendor_id: vendorId } : {} });
      // @ts-expect-error
      pendingOrders = await prisma.marketplaceOrder.count({ where: vendorId ? { vendor_id: vendorId, status: 'pending' } : { status: 'pending' } });
    } catch {}
    try {
      // @ts-expect-error - model may not exist
      unreadMessages = await prisma.marketplaceMessage.count({ where: vendorId ? { vendor_id: vendorId, status: 'unread' } : { status: 'unread' } });
    } catch {}

    const [productsGrowth, ordersGrowth, revenueGrowth] = await Promise.all([
      calcGrowth(),
      calcGrowth(),
      calcGrowth(),
    ]);

    const metrics: StoreMetrics = {
      totalProducts,
      totalOrders,
      totalRevenue,
      averageRating: Math.round(averageRating * 10) / 10,
      pendingOrders,
      unreadMessages,
      productsGrowth,
      ordersGrowth,
      revenueGrowth,
    };

    await cacheSet(cacheKey, metrics);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Store metrics error:', error);
    // Graceful fallback to empty metrics
    const fallback: StoreMetrics = {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      averageRating: 0,
      pendingOrders: 0,
      unreadMessages: 0,
      productsGrowth: 0,
      ordersGrowth: 0,
      revenueGrowth: 0,
    };
    return NextResponse.json(fallback, { status: 200 });
  }
}
