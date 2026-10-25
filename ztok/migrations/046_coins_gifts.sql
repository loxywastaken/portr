-- Coins and gifts. Coins are free (a welcome bonus and a daily claim), can't be bought, and can't be cashed out.
ALTER TABLE users ADD COLUMN coins integer NOT NULL DEFAULT 0 CHECK (coins BETWEEN 0 AND 1000000);
ALTER TABLE users ADD COLUMN coins_claimed_on date;
ALTER TABLE users ADD COLUMN coins_welcomed boolean NOT NULL DEFAULT false;

CREATE TABLE gifts (
	id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	sender_id bigint REFERENCES users(id) ON DELETE SET NULL,
	recipient_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	video_id bigint REFERENCES videos(id) ON DELETE SET NULL,
	live_id bigint,
	gift text NOT NULL,
	coins integer NOT NULL CHECK (coins > 0),
	comment_id bigint REFERENCES comments(id) ON DELETE SET NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gifts_recipient ON gifts(recipient_id, created_at DESC);
CREATE INDEX gifts_sender ON gifts(sender_id, created_at DESC);
CREATE INDEX gifts_video ON gifts(video_id) WHERE video_id IS NOT NULL;

CREATE TABLE coin_events (
	id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	amount integer NOT NULL,
	reason text NOT NULL CHECK (reason IN ('welcome', 'daily', 'gift')),
	gift_id bigint REFERENCES gifts(id) ON DELETE SET NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coin_events_user ON coin_events(user_id, id DESC);
