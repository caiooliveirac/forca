import { query } from '../config/database';
import type { LeaderboardEntry, PlayerStatsRow } from '../types';

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

const LEAGUE_LEVELS: Array<{ min: number; name: string }> = [
  { min: 2200, name: 'Diamant' },
  { min: 1850, name: 'Platin' },
  { min: 1550, name: 'Gold' },
  { min: 1300, name: 'Silber' },
  { min: 0, name: 'Bronze' },
];

export function getLeagueByRating(rating: number): string {
  const found = LEAGUE_LEVELS.find((item) => rating >= item.min);
  return found?.name ?? 'Bronze';
}

type CompetitionWindow = 'weekly' | 'monthly' | 'all';

function windowToSql(window: CompetitionWindow): string {
  if (window === 'weekly') return "NOW() - INTERVAL '7 days'";
  if (window === 'monthly') return "NOW() - INTERVAL '30 days'";
  return "TO_TIMESTAMP(0)";
}

export async function getLeaderboard(
  window: CompetitionWindow,
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | null,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const windowExpr = windowToSql(window);

  const params: unknown[] = [limit];
  let levelFilter = '';
  if (cefrLevel) {
    params.push(cefrLevel);
    levelFilter = ` AND gr.cefr_level = $2 `;
  }

  const result = await query(
    `SELECT
      u.id AS user_id,
      u.display_name,
      ps.rating,
      ps.competitive_points,
      COUNT(gr.id)::int AS rounds_in_window,
      SUM(CASE WHEN gr.won THEN 1 ELSE 0 END)::int AS wins_in_window,
      COALESCE(AVG(gr.weighted_score), 0)::float AS avg_round_score
     FROM users u
     JOIN player_stats ps ON ps.user_id = u.id
     LEFT JOIN game_rounds gr
       ON gr.user_id = u.id
      AND gr.played_at >= ${windowExpr}
      ${levelFilter}
     GROUP BY u.id, u.display_name, ps.rating, ps.competitive_points
     HAVING COUNT(gr.id) > 0
     ORDER BY SUM(gr.weighted_score) DESC, ps.rating DESC, u.display_name ASC
     LIMIT $1`,
    params,
  );

  return result.rows.map((row) => {
    const rating = Number(row.rating ?? 1000);
    return {
      userId: String(row.user_id),
      displayName: String(row.display_name),
      league: getLeagueByRating(rating),
      rating,
      competitivePoints: Number(row.competitive_points ?? 0),
      roundsInWindow: Number(row.rounds_in_window ?? 0),
      winsInWindow: Number(row.wins_in_window ?? 0),
      avgRoundScore: Math.round(Number(row.avg_round_score ?? 0)),
    };
  });
}
