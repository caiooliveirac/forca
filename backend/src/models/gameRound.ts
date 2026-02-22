import { pool, query } from '../config/database';
import type { GameRoundRow, PlayerStatsRow, SaveRoundBody } from '../types';

export async function createRound(
  userId: string,
  data: SaveRoundBody,
): Promise<{ round: GameRoundRow; stats: PlayerStatsRow }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert round
    const roundResult = await client.query(
      `INSERT INTO game_rounds
         (user_id, word_id, word, won, score, difficulty, wrong_guesses,
          time_seconds, hints_used, used_partial_umlauts, combo_at_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        userId,
        data.wordId,
        data.word,
        data.won,
        data.score,
        data.difficulty,
        data.wrongGuesses,
        data.timeSeconds,
        JSON.stringify(data.hintsUsed),
        data.usedPartialUmlauts,
        data.comboAtTime,
      ],
    );

    // 2. Update player_stats (increment totals, update combo, best scores)
    const statsResult = await client.query(
      `INSERT INTO player_stats
         (user_id, total_games, total_wins, total_points,
          best_round_score, best_combo, current_combo)
       VALUES ($1, 1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         total_games   = player_stats.total_games + 1,
         total_wins    = player_stats.total_wins + $2,
         total_points  = player_stats.total_points + $3,
         best_round_score = GREATEST(player_stats.best_round_score, $4),
         best_combo    = GREATEST(player_stats.best_combo, $5),
         current_combo = $6
       RETURNING *`,
      [
        userId,
        data.won ? 1 : 0,
        data.score,
        data.score,
        data.comboAtTime,
        data.won ? data.comboAtTime : 0,
      ],
    );

    // 3. Upsert word_errors
    await client.query(
      `INSERT INTO word_errors
         (user_id, word_id, word, times_seen, times_correct, times_wrong, last_seen_at)
       VALUES ($1, $2, $3, 1, $4, $5, NOW())
       ON CONFLICT (user_id, word_id) DO UPDATE SET
         times_seen    = word_errors.times_seen + 1,
         times_correct = word_errors.times_correct + $4,
         times_wrong   = word_errors.times_wrong + $5,
         last_seen_at  = NOW()`,
      [userId, data.wordId, data.word, data.won ? 1 : 0, data.won ? 0 : 1],
    );

    await client.query('COMMIT');
    return {
      round: roundResult.rows[0] as GameRoundRow,
      stats: statsResult.rows[0] as PlayerStatsRow,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function findByUserId(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<GameRoundRow[]> {
  const result = await query(
    `SELECT * FROM game_rounds
     WHERE user_id = $1
     ORDER BY played_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows as GameRoundRow[];
}

export async function countByUserId(userId: string): Promise<number> {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM game_rounds WHERE user_id = $1',
    [userId],
  );
  return result.rows[0].count;
}
