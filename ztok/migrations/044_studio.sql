-- ztok Studio: daily numbers for analytics, plus drafts and scheduled posts.
CREATE TABLE video_daily_stats (
	video_id bigint NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
	day date NOT NULL,
	views integer NOT NULL DEFAULT 0 CHECK (views >= 0),
	PRIMARY KEY (video_id, day)
);
CREATE INDEX video_daily_stats_day ON video_daily_stats(day);

CREATE TABLE user_daily_stats (
	user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	day date NOT NULL,
	profile_views integer NOT NULL DEFAULT 0 CHECK (profile_views >= 0),
	unfollows integer NOT NULL DEFAULT 0 CHECK (unfollows >= 0),
	PRIMARY KEY (user_id, day)
);

-- Profile views count once per viewer every 6 hours, like video views.
CREATE TABLE profile_views (
	user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	viewer text NOT NULL,
	viewed_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (user_id, viewer)
);
CREATE INDEX profile_views_age ON profile_views(viewed_at);

-- Drafts and scheduled posts are kept apart from videos until they are published,
-- so nothing that lists videos can show them by mistake.
CREATE TABLE video_drafts (
	id bigint GENERATED ALWAYS AS IDENTITY (START WITH 5000000000000000001) PRIMARY KEY,
	author_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2200),
	file_name text NOT NULL UNIQUE,
	cover_name text NOT NULL,
	width integer NOT NULL CHECK (width > 0),
	height integer NOT NULL CHECK (height > 0),
	duration double precision NOT NULL CHECK (duration > 0),
	bytes bigint NOT NULL CHECK (bytes > 0),
	visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'friends', 'only_me')),
	comment_permission text NOT NULL DEFAULT 'default' CHECK (comment_permission IN ('default', 'everyone', 'followers', 'friends', 'none')),
	category smallint NOT NULL DEFAULT -1,
	publish_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX video_drafts_author ON video_drafts(author_id, id DESC);
CREATE INDEX video_drafts_due ON video_drafts(publish_at) WHERE publish_at IS NOT NULL;
