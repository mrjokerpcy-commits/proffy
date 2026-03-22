-- Track every processed file to enable skip-already-processed logic
CREATE TABLE IF NOT EXISTS processed_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_file_id   TEXT NOT NULL,
  drive_type      TEXT NOT NULL CHECK (drive_type IN ('google_drive', 'onedrive')),
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  course_id       UUID REFERENCES courses(id) ON DELETE SET NULL,
  university      TEXT,
  faculty         TEXT,
  course_number   TEXT,
  course_name     TEXT,
  professor       TEXT,
  semester        TEXT,
  chunk_count     INT NOT NULL DEFAULT 0,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(drive_file_id, drive_type)
);

-- Directory tree — maps drive sources to canonical course namespaces
CREATE TABLE IF NOT EXISTS directories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university    TEXT NOT NULL,
  faculty       TEXT,
  course_number TEXT,
  course_name   TEXT NOT NULL,
  professor     TEXT,
  semester      TEXT,
  path          TEXT NOT NULL UNIQUE,  -- e.g. "Technion/CS/234218 - Data Structures/Cohen/2025-A"
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_files_drive_id ON processed_files (drive_file_id, drive_type);
CREATE INDEX IF NOT EXISTS idx_directories_path ON directories (path);
