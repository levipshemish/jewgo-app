interface DbUser {
  id: string;
  email: string;
  name?: string | null;
  issuperadmin?: boolean | null;
  createdat?: Date | string | null;
  updatedat?: Date | string | null;
}

export function mapUsersToApiResponse(dbUsers: DbUser[]) {
  return dbUsers.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name || undefined,
    isSuperAdmin: Boolean(u.issuperadmin),
    createdAt: u.createdat ? new Date(u.createdat) : undefined,
    updatedAt: u.updatedat ? new Date(u.updatedat) : undefined,
  }));
}

export function mapApiRequestToUser(dto: any) {
  const payload: Record<string, any> = {};
  if (dto.email) payload.email = String(dto.email);
  if (dto.name !== undefined) payload.name = dto.name === null ? null : String(dto.name);
  if (dto.isSuperAdmin !== undefined) payload.issuperadmin = Boolean(dto.isSuperAdmin);
  return payload;
}

