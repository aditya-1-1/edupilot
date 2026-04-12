-- MentorMind — run in Supabase SQL Editor (Postgres).
-- Uses auth.users for identity; app data is scoped by user_id = auth.uid() via RLS.

-- ---------------------------------------------------------------------------
-- public.users (profile mirror for dashboard; Supabase Auth owns passwords)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- user_settings (JSON preferences)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON public.user_settings(user_id);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings_select_own" ON public.user_settings;
CREATE POLICY "user_settings_select_own" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_settings_insert_own" ON public.user_settings;
CREATE POLICY "user_settings_insert_own" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_settings_update_own" ON public.user_settings;
CREATE POLICY "user_settings_update_own" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_settings_delete_own" ON public.user_settings;
CREATE POLICY "user_settings_delete_own" ON public.user_settings FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- memories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  summary TEXT,
  embedding_hint TEXT,
  importance REAL NOT NULL DEFAULT 0.5,
  session_id TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON public.memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_created ON public.memories(user_id, created_at DESC);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memories_all_own" ON public.memories;
CREATE POLICY "memories_all_own" ON public.memories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- memory_extractions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memory_extractions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mem_ext_user ON public.memory_extractions(user_id, created_at DESC);

ALTER TABLE public.memory_extractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memory_extractions_all_own" ON public.memory_extractions;
CREATE POLICY "memory_extractions_all_own" ON public.memory_extractions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- chat_history (was chat_messages in SQLite)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_user_session ON public.chat_history(user_id, session_id, created_at);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_history_all_own" ON public.chat_history;
CREATE POLICY "chat_history_all_own" ON public.chat_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- study_plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_plans (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user ON public.study_plans(user_id, created_at DESC);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_plans_all_own" ON public.study_plans;
CREATE POLICY "study_plans_all_own" ON public.study_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- quizzes + quiz_history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quizzes_user ON public.quizzes(user_id, created_at DESC);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quizzes_all_own" ON public.quizzes;
CREATE POLICY "quizzes_all_own" ON public.quizzes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.quiz_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  quiz_id TEXT,
  score_percent INTEGER,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_history_user ON public.quiz_history(user_id, created_at DESC);

ALTER TABLE public.quiz_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_history_all_own" ON public.quiz_history;
CREATE POLICY "quiz_history_all_own" ON public.quiz_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- progress_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progress_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  score_delta INTEGER NOT NULL DEFAULT 0,
  minutes_studied INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON public.progress_events(user_id, created_at DESC);

ALTER TABLE public.progress_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_events_all_own" ON public.progress_events;
CREATE POLICY "progress_events_all_own" ON public.progress_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- coding_mistakes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coding_mistakes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  mistake_type TEXT NOT NULL,
  snippet TEXT,
  context TEXT,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  topic TEXT DEFAULT 'General',
  problem_id TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mistakes_user ON public.coding_mistakes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mistakes_topic ON public.coding_mistakes(user_id, topic);

ALTER TABLE public.coding_mistakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coding_mistakes_all_own" ON public.coding_mistakes;
CREATE POLICY "coding_mistakes_all_own" ON public.coding_mistakes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- problem_progress
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.problem_progress (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  solved_at BIGINT,
  last_code TEXT,
  updated_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE(user_id, problem_id)
);

CREATE INDEX IF NOT EXISTS idx_problem_progress_user ON public.problem_progress(user_id);

ALTER TABLE public.problem_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "problem_progress_all_own" ON public.problem_progress;
CREATE POLICY "problem_progress_all_own" ON public.problem_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- coding_submissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coding_submissions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  code TEXT NOT NULL,
  feedback TEXT,
  score INTEGER,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON public.coding_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_problem ON public.coding_submissions(problem_id);

ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coding_submissions_all_own" ON public.coding_submissions;
CREATE POLICY "coding_submissions_all_own" ON public.coding_submissions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- coding_problems (catalog; read-only for authenticated users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coding_problems (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  topic TEXT NOT NULL,
  starter_code TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coding_problems_read_auth" ON public.coding_problems;
CREATE POLICY "coding_problems_read_auth" ON public.coding_problems FOR SELECT TO authenticated USING (true);
