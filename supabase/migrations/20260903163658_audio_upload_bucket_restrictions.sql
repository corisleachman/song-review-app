-- Reject oversized or unexpected Content-Type values at the Storage boundary.
-- The application independently validates the extension, stored MIME metadata,
-- actual object size, and an initial audio/container signature before finalizing.

UPDATE storage.buckets
SET
  file_size_limit = 209715200,
  allowed_mime_types = ARRAY[
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/vnd.wave',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/aac',
    'audio/aacp',
    'audio/x-aac',
    'audio/flac',
    'audio/x-flac',
    'audio/ogg',
    'application/ogg',
    'audio/aiff',
    'audio/x-aiff'
  ]::text[]
WHERE id = 'song-files';
