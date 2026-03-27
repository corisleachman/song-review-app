-- Create songs table
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create song_versions table
CREATE TABLE song_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  label TEXT,
  notes TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK (created_by IN ('Coris', 'Al')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(song_id, version_number)
);

-- Create comment_threads table
CREATE TABLE comment_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_version_id UUID NOT NULL REFERENCES song_versions(id) ON DELETE CASCADE,
  timestamp_seconds INTEGER NOT NULL,
  created_by TEXT NOT NULL CHECK (created_by IN ('Coris', 'Al')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES comment_threads(id) ON DELETE CASCADE,
  author TEXT NOT NULL CHECK (author IN ('Coris', 'Al')),
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_song_versions_song_id ON song_versions(song_id);
CREATE INDEX idx_comment_threads_version_id ON comment_threads(song_version_id);
CREATE INDEX idx_comment_threads_timestamp ON comment_threads(song_version_id, timestamp_seconds);
CREATE INDEX idx_comments_thread_id ON comments(thread_id);

-- Enable RLS (optional, but recommended for security)
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access (since this is a shared password app)
CREATE POLICY "Allow all" ON songs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON song_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON comment_threads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON comments FOR ALL USING (true) WITH CHECK (true);

-- Existing projects can add version notes with:
-- ALTER TABLE song_versions ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─── Song Tasks (added for per-song admin task tracking) ───────────────────
CREATE TABLE IF NOT EXISTS song_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_song_tasks_song_id ON song_tasks(song_id, sort_order);

ALTER TABLE song_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON song_tasks FOR ALL USING (true) WITH CHECK (true);
