import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error('[ERROR]', err.message, err.stack);

  const isDev = process.env.NODE_ENV !== 'production';

  res.status(500).json({
    error: isDev ? err.message : 'Interner Serverfehler',
    ...(isDev && { stack: err.stack }),
  });
};
