-- Calendar events: user-created goals, tasks, notes and reminders
-- shown in the MonthlyCalendar planner widget

CREATE TABLE IF NOT EXISTS calendar_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  title      TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'task',  -- goal | task | note | reminder
  done       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_events_user_date_idx ON calendar_events(user_id, date);
