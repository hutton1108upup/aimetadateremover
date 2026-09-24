CREATE TABLE IF NOT EXISTS feedback_submission (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  rate_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at INTEGER,
  next_attempt_at INTEGER NOT NULL,
  provider_id TEXT,
  last_error TEXT
);
CREATE INDEX IF NOT EXISTS feedback_rate ON feedback_submission(rate_key, created_at);
CREATE INDEX IF NOT EXISTS feedback_created ON feedback_submission(created_at);
CREATE INDEX IF NOT EXISTS feedback_pending ON feedback_submission(status, next_attempt_at);
