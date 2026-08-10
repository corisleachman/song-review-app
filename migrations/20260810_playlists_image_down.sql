-- Reverse: remove the custom playlist cover column.
ALTER TABLE playlists DROP COLUMN IF EXISTS image_url;
