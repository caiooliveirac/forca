import { pool, query } from '../config/database';
import type { GameRoundRow, PlayerStatsRow, SaveRoundBody } from '../types';

const CEFR_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1']);

const difficultyWeight: Record<number, number> = {
  1: 0.85,
  2: 0.95,
  3: 1.05,
  4: 1.15,
  5: 1.3,
};

const cefrWeight: Record<string, number> = {
  A1: 0.9,
  A2: 1.0,
  B1: 1.1,
  B2: 1.2,
  C1: 1.3,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

function sanitizeCefrLevel(level: unknown, difficulty: number): 'A1' | 'A2' | 'B1' | 'B2' | 'C1' {
  if (typeof level === 'string' && CEFR_LEVELS.has(level)) {
    return level as 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  }

  if (difficulty <= 1) return 'A1';
  if (difficulty === 2) return 'A2';
  if (difficulty === 3) return 'B1';
  if (difficulty === 4) return 'B2';
  return 'C1';
}

export async function createRound(
  userId: string,
  data: SaveRoundBody,
): Promise<{ round: GameRoundRow; stats: PlayerStatsRow }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cefrLevel = sanitizeCefrLevel(data.cefrLevel, data.difficulty);
    const rawDifficultyWeight = difficultyWeight[data.difficulty] ?? 1.0;
    const rawCefrWeight = cefrWeight[cefrLevel] ?? 1.0;

    const recentLoadResult = await client.query(
      `SELECT COUNT(*)::int AS rounds_last_minute
       FROM game_rounds
       WHERE user_id = $1
         AND played_at >= NOW() - INTERVAL '60 seconds'`,
      [userId],
    );
    const roundsLastMinute = recentLoadResult.rows[0]?.rounds_last_minute ?? 0;

    const repeatedWordResult = await client.query(
      `SELECT COUNT(*)::int AS same_word_recent
       FROM game_rounds
       WHERE user_id = $1
         AND word_id = $2
         AND played_at >= NOW() - INTERVAL '10 minutes'`,
      [userId, data.wordId],
    );
    const sameWordRecent = repeatedWordResult.rows[0]?.same_word_recent ?? 0;

    let spamFactor = 1.0;
    let antiSpamFlag = false;
    if (roundsLastMinute >= 12) {
      spamFactor *= 0.25;
      antiSpamFlag = true;
    }
    if (sameWordRecent >= 2) {
      spamFactor *= 0.5;
      antiSpamFlag = true;
    }

    const weightedBaseScore = Math.round(data.score * rawDifficultyWeight * rawCefrWeight);
    const weightedCompetitiveScore = data.won
      ? Math.max(0, Math.round(weightedBaseScore * spamFactor))
      : 0;

    const globalBaselineResult = await client.query(
      `SELECT COALESCE(AVG(NULLIF(weighted_score, 0)), 600)::float AS baseline
       FROM game_rounds
       WHERE played_at >= NOW() - INTERVAL '14 days'`,
    );
    const baseline = Math.max(300, Number(globalBaselineResult.rows[0]?.baseline ?? 600));

    const statsLockResult = await client.query(
      'SELECT * FROM player_stats WHERE user_id = $1 FOR UPDATE',
      [userId],
    );
    const previousStats = statsLockResult.rows[0] as PlayerStatsRow | undefined;
    const currentRating = previousStats?.rating ?? 1000;

    const expectedPerformance = 1 / (1 + Math.pow(10, (1100 - currentRating) / 400));
    const observedPerformance = clamp((weightedCompetitiveScore / baseline) / 2, 0, 1);
    const gamesPlayedBefore = previousStats?.total_games ?? 0;
    const baseK = gamesPlayedBefore < 50 ? 28 : 18;
    const kFactor = antiSpamFlag ? baseK * 0.5 : baseK;
    const ratingDelta = Math.round(kFactor * (observedPerformance - expectedPerformance));
    const nextRating = clamp(currentRating + ratingDelta, 300, 3000);

    // 1. Insert round
    const roundResult = await client.query(
      `INSERT INTO game_rounds
         (user_id, word_id, word, cefr_level, won, score, weighted_score, anti_spam_flag,
          difficulty, wrong_guesses, time_seconds, hints_used, used_partial_umlauts, combo_at_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        userId,
        data.wordId,
        data.word,
        cefrLevel,
        data.won,
        data.score,
        weightedCompetitiveScore,
        antiSpamFlag,
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
          competitive_points, best_round_score, best_combo, current_combo, rating, last_competitive_at)
       VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         total_games   = player_stats.total_games + 1,
         total_wins    = player_stats.total_wins + $2,
         total_points  = player_stats.total_points + $3,
         competitive_points = player_stats.competitive_points + $4,
         best_round_score = GREATEST(player_stats.best_round_score, $5),
         best_combo    = GREATEST(player_stats.best_combo, $6),
         current_combo = $7,
         rating = $8,
         last_competitive_at = NOW()
       RETURNING *`,
      [
        userId,
        data.won ? 1 : 0,
        data.score,
        weightedCompetitiveScore,
        data.score,
        data.comboAtTime,
        data.won ? data.comboAtTime : 0,
        nextRating,
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
