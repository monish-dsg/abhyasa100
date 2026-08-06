-- Delete all previous data
DELETE FROM chat_messages;
DELETE FROM habits;
DELETE FROM photos;
DELETE FROM daily_logs;
DELETE FROM attempts;

-- Add weekly tracking columns to habits
ALTER TABLE habits ADD COLUMN IF NOT EXISTS meals_count INT DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS steps_total INT DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS workouts_count INT DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS meditate_count INT DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS manifest_count INT DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS sleep_total_hours FLOAT DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS content_hours FLOAT DEFAULT 0;

-- Create fresh attempt - Week 1 starts today (Monday)
INSERT INTO attempts (attempt_number, start_date, status, notes) VALUES (1, CURRENT_DATE, 'active', '100 weeks - weekly tracking');
