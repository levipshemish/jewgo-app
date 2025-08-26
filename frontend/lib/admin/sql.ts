import { Prisma } from '@prisma/client';

/**
 * Build a safe ORDER BY expression limited to allowed columns and order.
 * Falls back to first allowed column when invalid; defaults to DESC.
 */
export function safeOrderExpr(
  allowedColumns: string[],
  sortBy: string | undefined | null,
  sortOrder: string | undefined | null
): Prisma.Sql {
  const col = (sortBy && allowedColumns.includes(sortBy)) ? sortBy : allowedColumns[0];
  const ord = (sortOrder || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return Prisma.raw(`${col} ${ord}`);
}

