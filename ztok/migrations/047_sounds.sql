-- Sounds: any public video's audio can be reused. A sound's id is the id of the video it came from, which is
-- also the music id the client already shows for that video ("original sound - Name"). The audio is copied
-- into its own file the first time someone uses it, so it stays if the original video is deleted.
CREATE TABLE sounds (
	id bigint PRIMARY KEY,
	author_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
	file_name text NOT NULL UNIQUE,
	duration double precision NOT NULL CHECK (duration > 0),
	created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE videos ADD COLUMN sound_id bigint REFERENCES sounds(id) ON DELETE SET NULL;
ALTER TABLE video_drafts ADD COLUMN sound_id bigint REFERENCES sounds(id) ON DELETE SET NULL;
CREATE INDEX videos_sound ON videos(sound_id, id DESC) WHERE sound_id IS NOT NULL;
