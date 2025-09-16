// Re-export admin authentication functions from the server module
// This provides a stable import path for admin API routes

export { requireAdmin, requireAdminOrThrow } from '@/lib/server/admin-auth';
export type { AdminUser } from '@/lib/admin/types';
