import { query } from '../config/database';
import type { PlayerStatsRow } from '../types';

export async function findByUserId(
  userId: string,
): Promise<PlayerStatsRow | null> {
  const result = await query(
    'SELECT * FROM player_stats WHERE user_id = $1',
    [userId],
  );
  return (result.rows[0] as PlayerStatsRow) ?? null;
}

export async function initialize(userId: string): Promise<void> {
  await query(
    `INSERT INTO player_stats (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
}
