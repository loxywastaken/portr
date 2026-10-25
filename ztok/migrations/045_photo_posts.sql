-- Photo posts: up to 35 photos shown as a swipeable carousel. Each post also gets a slideshow MP4 in
-- file_name, so every place that plays videos (feeds, downloads, stories) keeps working.
ALTER TABLE videos ADD COLUMN images jsonb CHECK (images IS NULL OR (jsonb_typeof(images) = 'array' AND jsonb_array_length(images) BETWEEN 1 AND 35));
ALTER TABLE video_drafts ADD COLUMN images jsonb CHECK (images IS NULL OR (jsonb_typeof(images) = 'array' AND jsonb_array_length(images) BETWEEN 1 AND 35));
CREATE INDEX videos_images ON videos USING gin (images jsonb_path_ops) WHERE images IS NOT NULL;
CREATE INDEX video_drafts_images ON video_drafts USING gin (images jsonb_path_ops) WHERE images IS NOT NULL;

-- Photos uploaded one by one before the post is made. Unused ones are deleted after a day.
CREATE TABLE photo_uploads (
	name text PRIMARY KEY,
	owner_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	width integer NOT NULL CHECK (width > 0),
	height integer NOT NULL CHECK (height > 0),
	created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX photo_uploads_owner ON photo_uploads(owner_id, created_at);
