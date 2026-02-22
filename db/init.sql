-- Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stats do jogador
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_points BIGINT DEFAULT 0,
  best_round_score INTEGER DEFAULT 0,
  best_combo INTEGER DEFAULT 0,
  current_combo INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico de rodadas
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  word_id TEXT NOT NULL,
  word TEXT NOT NULL,
  won BOOLEAN NOT NULL,
  score INTEGER DEFAULT 0,
  difficulty INTEGER NOT NULL,
  wrong_guesses INTEGER NOT NULL,
  time_seconds INTEGER NOT NULL,
  hints_used JSONB DEFAULT '{}',
  used_partial_umlauts BOOLEAN DEFAULT FALSE,
  combo_at_time INTEGER DEFAULT 0,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

-- Erros por palavra (base SRS)
CREATE TABLE IF NOT EXISTS word_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  word_id TEXT NOT NULL,
  word TEXT NOT NULL,
  times_seen INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  times_wrong INTEGER DEFAULT 0,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  next_review_at TIMESTAMPTZ,
  ease_factor REAL DEFAULT 2.5,
  UNIQUE(user_id, word_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rounds_user ON game_rounds(user_id);
CREATE INDEX IF NOT EXISTS idx_rounds_played ON game_rounds(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_word_errors_user ON word_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_word_errors_review ON word_errors(next_review_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER player_stats_updated_at
  BEFORE UPDATE ON player_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
