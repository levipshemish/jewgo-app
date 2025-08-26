import { User } from '@prisma/client';

// API response shape for User
export interface UserApiResponse {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  provider: 'apple' | 'google' | 'unknown';
  isSuperAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API request shape for User
export interface UserApiRequest {
  id?: string;
  email: string;
  name?: string;
  avatar_url?: string;
  provider?: 'apple' | 'google' | 'unknown';
  isSuperAdmin?: boolean;
}

/**
 * Map Prisma User model to API response format
 */
export function mapUserToApiResponse(user: User): UserApiResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    avatar_url: user.image || undefined,
    provider: 'unknown', // Default since provider is not in the schema
    isSuperAdmin: user.issuperadmin,
    createdAt: user.createdat,
    updatedAt: user.updatedat,
  };
}

/**
 * Map API request to Prisma User model format
 */
export function mapApiRequestToUser(data: UserApiRequest): Partial<User> {
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    image: data.avatar_url,
    issuperadmin: data.isSuperAdmin || false,
  };
}

/**
 * Map multiple users to API response format
 */
export function mapUsersToApiResponse(users: User[]): UserApiResponse[] {
  return users.map(mapUserToApiResponse);
}
