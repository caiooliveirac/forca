import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import * as GameRound from '../models/gameRound';
import * as PlayerStats from '../models/playerStats';
import * as WordError from '../models/wordError';
import type { SaveRoundBody } from '../types';

const router = Router();

// All game routes require auth
router.use(authMiddleware);

// POST /api/game/rounds — save a completed round (transactional)
router.post('/rounds', async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body as SaveRoundBody;
    const userId = req.userId!;

    if (!data.wordId || !data.word || data.score == null || data.difficulty == null) {
      res.status(400).json({ error: 'Pflichtfelder fehlen' });
      return;
    }

    const { round, stats } = await GameRound.createRound(userId, data);
    res.status(201).json({ round, stats });
  } catch (err) {
    console.error('Save round error:', err);
    res.status(500).json({ error: 'Runde konnte nicht gespeichert werden' });
  }
});

// GET /api/game/rounds?limit=20&offset=0 — round history
router.get('/rounds', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const [rounds, total] = await Promise.all([
      GameRound.findByUserId(req.userId!, limit, offset),
      GameRound.countByUserId(req.userId!),
    ]);

    res.json({ rounds, total });
  } catch (err) {
    console.error('Get rounds error:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Runden' });
  }
});

// GET /api/game/stats — player stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await PlayerStats.findByUserId(req.userId!);
    res.json(stats ?? {
      totalGames: 0,
      totalWins: 0,
      totalPoints: 0,
      bestRoundScore: 0,
      bestCombo: 0,
      currentCombo: 0,
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

// GET /api/game/word-errors?sort=times_wrong&limit=20
router.get('/word-errors', async (req: AuthRequest, res: Response) => {
  try {
    const sort = (req.query.sort as string) || 'times_wrong';
    if (!WordError.isValidSort(sort)) {
      res.status(400).json({ error: 'Ungültiger sort-Parameter' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const [words, total] = await Promise.all([
      WordError.findByUserId(req.userId!, sort, limit),
      WordError.countByUserId(req.userId!),
    ]);

    res.json({ words, total });
  } catch (err) {
    console.error('Word errors error:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Wortfehler' });
  }
});

export default router;
