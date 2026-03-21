-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  image         TEXT,
  password_hash TEXT,                          -- null for OAuth users
  university    TEXT,                          -- TAU | Technion | HUJI | BGU | Bar Ilan | Other
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Subscriptions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                TEXT NOT NULL DEFAULT 'free',  -- free | pro | max | whatsapp
  status              TEXT NOT NULL DEFAULT 'active', -- active | cancelled | past_due
  stripe_customer_id  TEXT,
  stripe_sub_id       TEXT,
  payplus_sub_id      TEXT,
  current_period_end  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);

-- ─── Courses ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  name_hebrew   TEXT,
  university    TEXT NOT NULL,
  department    TEXT,
  professor     TEXT,
  course_number TEXT,
  semester      TEXT,                          -- 2025a | 2025b | 2025s
  exam_date     DATE,
  credits       INTEGER,
  user_level    TEXT,                          -- beginner | some | strong
  goal          TEXT,                          -- pass | good | excellent
  hours_per_week INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS courses_user_id_idx ON courses(user_id);

-- ─── Study Paths ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_paths (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan        JSONB NOT NULL DEFAULT '{}',     -- week-by-week plan
  current_week INTEGER NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'active',  -- active | exam_prep | completed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS study_paths_course_user_idx ON study_paths(course_id, user_id);

-- ─── Chat Sessions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID REFERENCES courses(id) ON DELETE SET NULL,
  title       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON chat_sessions(user_id);

-- ─── Chat Messages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,                   -- user | assistant
  content     TEXT NOT NULL,
  sources     JSONB,                           -- [{filename, type, professor, score}]
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_session_id_idx ON chat_messages(session_id);

-- ─── Flashcards ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  front           TEXT NOT NULL,
  back            TEXT NOT NULL,
  next_review_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  interval_days   FLOAT NOT NULL DEFAULT 1,
  ease_factor     FLOAT NOT NULL DEFAULT 2.5,
  review_count    INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flashcards_user_course_idx ON flashcards(user_id, course_id);
CREATE INDEX IF NOT EXISTS flashcards_review_idx ON flashcards(user_id, next_review_at);

-- ─── Usage Tracking ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  questions   INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

-- ─── Technion Course Cache (cheesefork) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS technion_courses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_number TEXT NOT NULL,
  name          TEXT NOT NULL,
  name_hebrew   TEXT,
  lecturer      TEXT,
  credits       INTEGER,
  semester      TEXT NOT NULL,
  exam_date     DATE,
  exam_type     TEXT,
  prerequisites TEXT[],
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_number, semester)
);

CREATE INDEX IF NOT EXISTS technion_courses_semester_idx ON technion_courses(semester);

-- ─── NextAuth required tables ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL,
  provider            TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          INTEGER,
  token_type          TEXT,
  scope               TEXT,
  id_token            TEXT,
  session_state       TEXT,
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier  TEXT NOT NULL,
  token       TEXT UNIQUE NOT NULL,
  expires     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(identifier, token)
);
