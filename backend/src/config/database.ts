import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);

export const getClient = () => pool.connect();

export async function ensureCompetitiveSchema(): Promise<void> {
  await query(`
    ALTER TABLE player_stats
      ADD COLUMN IF NOT EXISTS competitive_points BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 1000,
      ADD COLUMN IF NOT EXISTS last_competitive_at TIMESTAMPTZ;
  `);

  await query(`
    ALTER TABLE game_rounds
      ADD COLUMN IF NOT EXISTS cefr_level TEXT DEFAULT 'A1',
      ADD COLUMN IF NOT EXISTS weighted_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS anti_spam_flag BOOLEAN DEFAULT FALSE;
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_rounds_cefr_level ON game_rounds(cefr_level);
  `);
}

export default pool;
