-- MentorMind SQLite schema (SQLite 3)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  settings_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  embedding_hint TEXT,
  importance REAL NOT NULL DEFAULT 0.5,
  session_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS memory_extractions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mem_ext_user ON memory_extractions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_user_session ON chat_messages(user_id, session_id, created_at);

-- Alias for analytics / parity with documented table name (`chat_history`); app writes use `chat_messages`.
CREATE VIEW IF NOT EXISTS chat_history AS
  SELECT * FROM chat_messages;

CREATE TABLE IF NOT EXISTS study_plans (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user ON study_plans(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quizzes_user ON quizzes(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quiz_history (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  quiz_id TEXT,
  score_percent INTEGER,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_history_user ON quiz_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS progress_events (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  score_delta INTEGER NOT NULL DEFAULT 0,
  minutes_studied INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON progress_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS coding_mistakes (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  language TEXT NOT NULL,
  mistake_type TEXT NOT NULL,
  snippet TEXT,
  context TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  topic TEXT DEFAULT 'General',
  problem_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mistakes_user ON coding_mistakes(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS problem_progress (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  solved_at INTEGER,
  last_code TEXT,
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, problem_id)
);

CREATE INDEX IF NOT EXISTS idx_problem_progress_user ON problem_progress(user_id);

CREATE TABLE IF NOT EXISTS coding_problems (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  topic TEXT NOT NULL,
  starter_code TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coding_problems_topic ON coding_problems(topic);

CREATE TABLE IF NOT EXISTS coding_submissions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  code TEXT NOT NULL,
  feedback TEXT,
  score INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(problem_id) REFERENCES coding_problems(id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON coding_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_problem ON coding_submissions(problem_id);

CREATE TABLE IF NOT EXISTS coding_mistakes_new (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  problem_id TEXT,
  mistake_type TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(problem_id) REFERENCES coding_problems(id)
);

CREATE INDEX IF NOT EXISTS idx_mistakes_new_user ON coding_mistakes_new(user_id, created_at DESC);
