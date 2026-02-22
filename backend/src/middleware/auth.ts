import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Declaration merging so req.userId is available everywhere
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export type AuthRequest = Request;

interface JwtPayload {
  userId: string;
  email: string;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token nicht vorhanden' });
    return;
  }

  const token = header.slice(7);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ error: 'Server-Konfigurationsfehler' });
      return;
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Ungültiges Token' });
  }
};
