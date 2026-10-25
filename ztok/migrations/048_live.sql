-- LIVE: one row per broadcast. The stream itself is only kept in memory and temporary HLS files while live.
CREATE TABLE lives (
	id bigint GENERATED ALWAYS AS IDENTITY (START WITH 7000000000000000001) PRIMARY KEY,
	host_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 100),
	started_at timestamptz NOT NULL DEFAULT now(),
	ended_at timestamptz,
	peak_viewers integer NOT NULL DEFAULT 0,
	viewers integer NOT NULL DEFAULT 0,
	likes integer NOT NULL DEFAULT 0,
	chat_messages integer NOT NULL DEFAULT 0
);
CREATE INDEX lives_host ON lives(host_id, started_at DESC);
CREATE UNIQUE INDEX lives_one_per_host ON lives(host_id) WHERE ended_at IS NULL;
ALTER TABLE gifts ADD CONSTRAINT gifts_live FOREIGN KEY (live_id) REFERENCES lives(id) ON DELETE SET NULL;
CREATE INDEX gifts_live_id ON gifts(live_id) WHERE live_id IS NOT NULL;
-- A restart ends every broadcast that was running.
