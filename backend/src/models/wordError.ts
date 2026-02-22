import { query } from '../config/database';
import type { WordErrorRow } from '../types';

const ALLOWED_SORTS = ['times_wrong', 'times_seen', 'last_seen_at'] as const;
type SortField = (typeof ALLOWED_SORTS)[number];

export function isValidSort(s: string): s is SortField {
  return (ALLOWED_SORTS as readonly string[]).includes(s);
}

export async function findByUserId(
  userId: string,
  sort: SortField = 'times_wrong',
  limit = 20,
): Promise<WordErrorRow[]> {
  const result = await query(
    `SELECT * FROM word_errors
     WHERE user_id = $1
     ORDER BY ${sort} DESC
     LIMIT $2`,
    [userId, limit],
  );
  return result.rows as WordErrorRow[];
}

export async function countByUserId(userId: string): Promise<number> {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM word_errors WHERE user_id = $1',
    [userId],
  );
  return result.rows[0].count;
}
