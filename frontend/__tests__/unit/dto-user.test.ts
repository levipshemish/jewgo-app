import { mapUsersToApiResponse, mapApiRequestToUser } from '@/lib/admin/dto/user';

describe('user DTO mappers', () => {
  test('mapUsersToApiResponse maps fields and dates', () => {
    const dbUsers = [{
      id: 'u1',
      email: 'test@example.com',
      name: 'Test User',
      issuperadmin: true,
      createdat: new Date('2024-01-01T00:00:00Z'),
      updatedat: '2024-01-02T00:00:00Z',
    } as any];
    const api = mapUsersToApiResponse(dbUsers);
    expect(api[0].id).toBe('u1');
    expect(api[0].email).toBe('test@example.com');
    expect(api[0].name).toBe('Test User');
    expect(api[0].isSuperAdmin).toBe(true);
    expect(api[0].createdAt).toBeInstanceOf(Date);
    expect(api[0].updatedAt).toBeInstanceOf(Date);
  });

  test('mapApiRequestToUser maps API to prisma payload', () => {
    const dto = { email: 'user@example.com', name: null, isSuperAdmin: true };
    const db = mapApiRequestToUser(dto);
    expect(db.email).toBe('user@example.com');
    expect(db.name).toBeNull();
    expect(db.issuperadmin).toBe(true);
  });
});

