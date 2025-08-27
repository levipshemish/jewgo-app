interface DbUser {
  id: string;
  email: string;
  name?: string | null;
  issuperadmin?: boolean | null;
  createdat?: Date | string | null;
  updatedat?: Date | string | null;
  emailverified?: boolean | null;
  avatar_url?: string | null;
  provider?: string | null;
}

interface ApiUser {
  id: string;
  email: string;
  name?: string;
  isSuperAdmin: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  emailVerified?: boolean;
  avatarUrl?: string;
  provider?: string;
}

export function mapUsersToApiResponse(dbUsers: DbUser[]): ApiUser[] {
  return dbUsers.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name || undefined,
    isSuperAdmin: Boolean(u.issuperadmin),
    createdAt: u.createdat ? new Date(u.createdat) : undefined,
    updatedAt: u.updatedat ? new Date(u.updatedat) : undefined,
    emailVerified: Boolean(u.emailverified),
    avatarUrl: u.avatar_url || undefined,
    provider: u.provider || undefined,
  }));
}

export function mapApiRequestToUser(dto: Partial<ApiUser>): Record<string, any> {
  const payload: Record<string, any> = {};
  
  if (dto.email !== undefined) {
    payload.email = String(dto.email);
  }
  
  if (dto.name !== undefined) {
    payload.name = dto.name === null ? null : String(dto.name);
  }
  
  if (dto.isSuperAdmin !== undefined) {
    payload.issuperadmin = Boolean(dto.isSuperAdmin);
  }
  
  if (dto.emailVerified !== undefined) {
    payload.emailverified = Boolean(dto.emailVerified);
  }
  
  if (dto.avatarUrl !== undefined) {
    payload.avatar_url = dto.avatarUrl === null ? null : String(dto.avatarUrl);
  }
  
  if (dto.provider !== undefined) {
    payload.provider = String(dto.provider);
  }
  
  return payload;
}

