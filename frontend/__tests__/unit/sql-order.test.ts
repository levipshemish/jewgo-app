import { safeOrderExpr } from '../../lib/admin/sql';

describe('safeOrderExpr', () => {
  const allowed = ['created_at', 'name', 'city'];

  test('accepts valid sort and order', () => {
    const sql = safeOrderExpr(allowed, 'name', 'asc');
    expect(String((sql as any).values?.[0] ?? sql)).toContain('name ASC');
  });

  test('falls back for invalid column', () => {
    const sql = safeOrderExpr(allowed, 'drop table', 'desc');
    const str = String((sql as any).values?.[0] ?? sql);
    expect(str).toContain('created_at');
  });

  test('defaults to DESC for invalid order', () => {
    const sql = safeOrderExpr(allowed, 'city', 'wat');
    const str = String((sql as any).values?.[0] ?? sql);
    expect(str).toContain('city DESC');
  });
});

