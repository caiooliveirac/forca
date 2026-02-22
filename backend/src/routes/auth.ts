import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as User from '../models/user';
import * as PlayerStats from '../models/playerStats';
import { hashPassword, comparePassword } from '../utils/hash';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import type { RegisterBody, LoginBody } from '../types';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (userId: string, email: string): string => {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ userId, email }, secret, { expiresIn: '7d' });
};

// POST /api/auth/register
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, displayName } = req.body as RegisterBody;

    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'Alle Felder sind erforderlich' });
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Ungültiges E-Mail-Format' });
      return;
    }

    if (password.length < 8) {
      res
        .status(400)
        .json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
      return;
    }

    if (displayName.length < 2 || displayName.length > 30) {
      res
        .status(400)
        .json({ error: 'Anzeigename muss zwischen 2 und 30 Zeichen lang sein' });
      return;
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'E-Mail bereits registriert' });
      return;
    }

    const hash = await hashPassword(password);
    const user = await User.create(email, hash, displayName);

    // Create empty stats row
    await PlayerStats.initialize(user.id);

    const token = generateToken(user.id, user.email);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body as LoginBody;

    if (!email || !password) {
      res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
      return;
    }

    const user = await User.findByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'E-Mail oder Passwort falsch' });
      return;
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'E-Mail oder Passwort falsch' });
      return;
    }

    const token = generateToken(user.id, user.email);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Anmeldung fehlgeschlagen' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Benutzer nicht gefunden' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Fehler beim Abrufen des Profils' });
  }
});

// PUT /api/auth/me
router.put('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { displayName } = req.body;

    if (displayName !== undefined) {
      if (typeof displayName !== 'string' || displayName.length < 2 || displayName.length > 30) {
        res.status(400).json({ error: 'Anzeigename muss zwischen 2 und 30 Zeichen lang sein' });
        return;
      }
    }

    const user = await User.updateById(req.userId!, { displayName });
    if (!user) {
      res.status(404).json({ error: 'Benutzer nicht gefunden' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error('Update me error:', err);
    res.status(500).json({ error: 'Profil konnte nicht aktualisiert werden' });
  }
});

export default router;
