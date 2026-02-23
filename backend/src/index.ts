import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import { errorHandler } from './middleware/errorHandler';
import { ensureCompetitiveSchema } from './config/database';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

async function startServer() {
  await ensureCompetitiveSchema();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Galgenspiel API running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('❌ Failed to start Galgenspiel API:', err);
  process.exit(1);
});

export default app;
