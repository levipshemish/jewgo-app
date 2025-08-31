import { describe, it, expect } from '@jest/globals';
import * as route from '@/app/api/admin/roles/available/route';

describe('API Route: /api/admin/roles/available', () => {
  it('exports runtime and GET handler', () => {
    expect(typeof (route as any).runtime).toBe('string');
    expect(typeof (route as any).GET).toBe('function');
  });
});

