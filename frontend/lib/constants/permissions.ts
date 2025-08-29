export type Role = 'moderator' | 'data_admin' | 'system_admin' | 'super_admin';

export type Permission = 
  | 'restaurant:view' | 'restaurant:edit' | 'restaurant:delete' | 'restaurant:approve' | 'restaurant:reject' | 'restaurant:moderate'
  | 'review:view' | 'review:moderate' | 'review:delete'
  | 'user:view' | 'user:edit' | 'user:delete'
  | 'image:view' | 'image:edit' | 'image:delete'
  | 'system:settings' | 'system:view' | 'system:edit' | 'audit:view' | 'audit:delete'
  | 'bulk:operations' | 'data:export' | 'role:view' | 'role:edit' | 'role:delete'
  | 'synagogue:view' | 'kosher_place:view' | 'analytics:view';

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  'moderator': [
    'restaurant:view',
    'restaurant:approve',
    'restaurant:reject',
    'review:view',
    'review:moderate',
  ] as const,
  'data_admin': [
    'restaurant:view',
    'restaurant:edit',
    'restaurant:approve',
    'restaurant:reject',
    'review:view',
    'review:moderate',
    'user:view',
    'bulk:operations',
    'data:export',
    'analytics:view',
  ] as const,
  'system_admin': [
    'restaurant:view',
    'restaurant:edit',
    'restaurant:delete',
    'restaurant:approve',
    'restaurant:reject',
    'review:view',
    'review:moderate',
    'review:delete',
    'user:view',
    'user:edit',
    'system:settings',
    'audit:view',
    'bulk:operations',
    'data:export',
  ] as const,
  'super_admin': [
    // All permissions
    'restaurant:view', 'restaurant:edit', 'restaurant:delete', 'restaurant:approve', 'restaurant:reject', 'restaurant:moderate',
    'review:view', 'review:moderate', 'review:delete',
    'user:view', 'user:edit', 'user:delete',
    'image:view', 'image:edit', 'image:delete',
    'system:settings', 'system:view', 'system:edit', 'audit:view', 'audit:delete',
    'bulk:operations', 'data:export', 'role:view', 'role:edit', 'role:delete',
    'synagogue:view', 'kosher_place:view', 'analytics:view'
  ] as const,
} as const;
