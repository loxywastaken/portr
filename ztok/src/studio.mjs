// ztok Studio data: drafts and scheduled posts, deleting posts, and the numbers behind Analytics.
import { HttpError, Id } from './http.mjs';
import { RemoveMedia } from './media.mjs';
import { RemovedSql } from './moderation.mjs';

const Columns = 'author_id, description, file_name, cover_name, width, height, duration, bytes, visibility, comment_permission, category';
const Today = "(now() AT TIME ZONE 'UTC')::date";
export const Ranges = [7, 28, 60, 365];
export const Range = Value => Ranges.includes(Number(Value)) ? Number(Value) : 28;

// Scheduled posts go out 15 minutes to 30 days from now, like TikTok Studio.
export function ScheduleTime(Value) {
	const When = new Date(String(Value ?? ''));
	const Ahead = When.getTime() - Date.now();
	if (!Number.isFinite(Ahead)) throw new HttpError(400, 'InvalidScheduleTime');
	if (Ahead < 14 * 60000) throw new HttpError(400, 'ScheduleTooSoon');
	if (Ahead > 30 * 86400000) throw new HttpError(400, 'ScheduleTooLate');
	return When.toISOString();
}

// Publishing moves the draft into videos in one statement, so a post is never both or neither.
async function Publish(Pool, Where, Values) {
	return (await Pool.query(`WITH Due AS (DELETE FROM video_drafts WHERE ${Where} RETURNING *)
		INSERT INTO videos(${Columns}) SELECT ${Columns} FROM Due ORDER BY id RETURNING id, author_id`, Values)).rows;
}
export const PublishDue = Pool => Publish(Pool, 'publish_at <= now()', []);
export async function PublishDraft(Pool, UserId, DraftId) {
	const [Row] = await Publish(Pool, 'id = $1 AND author_id = $2', [Id(DraftId), UserId]);
	if (!Row) throw new HttpError(404, 'DraftNotFound');
	return Row.id;
}

export async function Drafts(Pool, UserId) {
	return (await Pool.query('SELECT * FROM video_drafts WHERE author_id = $1 ORDER BY publish_at NULLS LAST, id DESC LIMIT 100', [UserId])).rows;
}
export async function Draft(Pool, UserId, DraftId) {
	const Row = (await Pool.query('SELECT * FROM video_drafts WHERE id = $1 AND author_id = $2', [Id(DraftId), UserId])).rows[0];
	if (!Row) throw new HttpError(404, 'DraftNotFound');
	return Row;
}

const RemoveFiles = (Config, Rows) => Promise.all(Rows.flatMap(Row => [Row.file_name, Row.cover_name, Row.download_name].filter(Boolean).map(Name => RemoveMedia(Config, Name).catch(() => {}))));
export async function DeleteDraft(Pool, Config, UserId, DraftId) {
	const Rows = (await Pool.query('DELETE FROM video_drafts WHERE id = $1 AND author_id = $2 RETURNING file_name, cover_name', [Id(DraftId), UserId])).rows;
	if (!Rows.length) throw new HttpError(404, 'DraftNotFound');
	await RemoveFiles(Config, Rows);
}
export async function DeletePost(Pool, Config, UserId, VideoId) {
	const Rows = (await Pool.query('DELETE FROM videos WHERE id = $1 AND author_id = $2 RETURNING file_name, cover_name, download_name', [Id(VideoId), UserId])).rows;
	if (!Rows.length) throw new HttpError(404, 'VideoNotFound');
	await RemoveFiles(Config, Rows);
}
export async function DeleteAllDrafts(Pool, Config, UserId) {
	await RemoveFiles(Config, (await Pool.query('DELETE FROM video_drafts WHERE author_id = $1 RETURNING file_name, cover_name', [UserId])).rows);
}

// Daily series for the last `Days` days and the same span before it, so every total can show its change.
// Day boundaries are UTC. Video views are counted per day from the day Studio was added.
const Metrics = {
	views: `SELECT s.day, sum(s.views)::int AS n FROM video_daily_stats s JOIN videos v ON v.id = s.video_id WHERE v.author_id = $1 AND $Video GROUP BY 1`,
	profile_views: `SELECT day, profile_views AS n FROM user_daily_stats WHERE user_id = $1 AND $NoVideo`,
	likes: `SELECT (l.created_at AT TIME ZONE 'UTC')::date AS day, count(*)::int AS n FROM likes l JOIN videos v ON v.id = l.video_id WHERE v.author_id = $1 AND $Video GROUP BY 1`,
	comments: `SELECT (c.created_at AT TIME ZONE 'UTC')::date AS day, count(*)::int AS n FROM comments c JOIN videos v ON v.id = c.video_id WHERE v.author_id = $1 AND c.author_id <> $1 AND NOT ${RemovedSql('comment', 'c.id')} AND $Video GROUP BY 1`,
	saves: `SELECT (f.created_at AT TIME ZONE 'UTC')::date AS day, count(*)::int AS n FROM favorites f JOIN videos v ON v.id = f.video_id WHERE v.author_id = $1 AND $Video GROUP BY 1`,
	reposts: `SELECT (r.created_at AT TIME ZONE 'UTC')::date AS day, count(*)::int AS n FROM reposts r JOIN videos v ON v.id = r.video_id WHERE v.author_id = $1 AND $Video GROUP BY 1`,
	followers: `SELECT (created_at AT TIME ZONE 'UTC')::date AS day, count(*)::int AS n FROM follows WHERE following_id = $1 AND $NoVideo GROUP BY 1`,
	unfollows: `SELECT day, unfollows AS n FROM user_daily_stats WHERE user_id = $1 AND $NoVideo`,
};
export const MetricLabels = { views: 'Post views', profile_views: 'Profile views', likes: 'Likes', comments: 'Comments', saves: 'Saves', reposts: 'Reposts', followers: 'New followers', unfollows: 'Unfollows' };

export async function Series(Pool, UserId, Days, VideoId = null) {
	const Names = VideoId ? ['views', 'likes', 'comments', 'saves', 'reposts'] : Object.keys(Metrics);
	const Parts = Names.map(Name => `SELECT '${Name}' AS metric, day, n FROM (${Metrics[Name].replace('$Video', VideoId ? 'v.id = $3' : 'true').replace('$NoVideo', 'true')}) m WHERE day > ${Today} - $2::int * 2`);
	const Rows = (await Pool.query(Parts.join(' UNION ALL '), VideoId ? [UserId, Days, Id(VideoId)] : [UserId, Days])).rows;
	const Now = new Date(), Start = Date.UTC(Now.getUTCFullYear(), Now.getUTCMonth(), Now.getUTCDate()) - (Days - 1) * 86400000;
	const DayKey = Offset => new Date(Start + Offset * 86400000).toISOString().slice(0, 10);
	const Result = { days: Array.from({ length: Days }, (_, Index) => DayKey(Index)), metrics: {} };
	for (const Name of Names) Result.metrics[Name] = { series: Result.days.map(() => 0), total: 0, previous: 0 };
	for (const Row of Rows) {
		const Key = (Row.day instanceof Date ? Row.day.toISOString() : String(Row.day)).slice(0, 10);
		const Offset = Math.round((Date.parse(Key) - Start) / 86400000), Metric = Result.metrics[Row.metric];
		if (Offset >= 0 && Offset < Days) { Metric.series[Offset] += Row.n; Metric.total += Row.n; }
		else if (Offset < 0) Metric.previous += Row.n;
	}
	return Result;
}

export async function Totals(Pool, UserId) {
	return (await Pool.query(`SELECT
		(SELECT count(*)::int FROM follows WHERE following_id = $1) AS followers,
		(SELECT count(*)::int FROM videos WHERE author_id = $1 AND story_expires_at IS NULL) AS posts,
		(SELECT coalesce(sum(view_count), 0)::bigint FROM videos WHERE author_id = $1) AS views,
		(SELECT count(*)::int FROM likes l JOIN videos v ON v.id = l.video_id WHERE v.author_id = $1) AS likes,
		(SELECT min(day) FROM video_daily_stats s JOIN videos v ON v.id = s.video_id WHERE v.author_id = $1) AS tracked_since,
		(SELECT count(*)::int FROM video_drafts WHERE author_id = $1 AND publish_at IS NULL) AS drafts,
		(SELECT count(*)::int FROM video_drafts WHERE author_id = $1 AND publish_at IS NOT NULL) AS scheduled`, [UserId])).rows[0];
}

// Posts with their lifetime numbers, plus views in the chosen range for ranking.
export async function Posts(Pool, UserId, { query = '', visibility = '', sort = 'newest', days = 0, before = 0, limit = 30 } = {}) {
	const Values = [UserId, days, `%${String(query).slice(0, 100).replace(/[\\%_]/g, '\\$&')}%`];
	const Order = { newest: 'v.id DESC', oldest: 'v.id ASC', views: 'v.view_count DESC, v.id DESC', likes: 'likes DESC, v.id DESC', comments: 'comments DESC, v.id DESC', range: 'range_views DESC, v.view_count DESC, v.id DESC' }[sort] ?? 'v.id DESC';
	const Filters = ['v.author_id = $1', 'v.story_expires_at IS NULL', "v.description ILIKE $3 ESCAPE '\\'"];
	if (['public', 'followers', 'friends', 'only_me'].includes(visibility)) { Values.push(visibility); Filters.push(`v.visibility = $${Values.length}`); }
	Values.push(Math.min(Math.max(Number(limit) || 30, 1), 100), Math.max(0, Number(before) || 0));
	return (await Pool.query(`SELECT v.id, v.description, v.cover_name, v.visibility, v.comment_permission, v.category, v.pinned_at, v.created_at, v.duration, v.view_count::int AS views,
		(SELECT count(*)::int FROM likes l WHERE l.video_id = v.id) AS likes,
		(SELECT count(*)::int FROM comments c WHERE c.video_id = v.id AND NOT ${RemovedSql('comment', 'c.id')}) AS comments,
		(SELECT count(*)::int FROM favorites f WHERE f.video_id = v.id) AS saves,
		(SELECT count(*)::int FROM reposts r WHERE r.video_id = v.id) AS reposts,
		(SELECT coalesce(sum(s.views), 0)::int FROM video_daily_stats s WHERE s.video_id = v.id AND s.day > ${Today} - $2::int) AS range_views,
		${RemovedSql('video', 'v.id')} AS removed
		FROM videos v WHERE ${Filters.join(' AND ')} ORDER BY ${Order} LIMIT $${Values.length - 1} OFFSET $${Values.length}`, Values)).rows;
}

export async function Post(Pool, UserId, VideoId) {
	const [Row] = (await Pool.query(`SELECT v.*, v.view_count::int AS views,
		(SELECT count(*)::int FROM likes l WHERE l.video_id = v.id) AS likes,
		(SELECT count(*)::int FROM comments c WHERE c.video_id = v.id AND NOT ${RemovedSql('comment', 'c.id')}) AS comments,
		(SELECT count(*)::int FROM favorites f WHERE f.video_id = v.id) AS saves,
		(SELECT count(*)::int FROM reposts r WHERE r.video_id = v.id) AS reposts
		FROM videos v WHERE v.id = $1 AND v.author_id = $2 AND v.story_expires_at IS NULL`, [Id(VideoId), UserId])).rows;
	if (!Row) throw new HttpError(404, 'VideoNotFound');
	return Row;
}

export async function NewFollowers(Pool, UserId, Limit = 8) {
	return (await Pool.query(`SELECT u.id, u.username, u.display_name, u.avatar_name, f.created_at,
		EXISTS (SELECT 1 FROM follows b WHERE b.follower_id = $1 AND b.following_id = u.id) AS following_back
		FROM follows f JOIN users u ON u.id = f.follower_id WHERE f.following_id = $1 AND u.suspended_at IS NULL AND u.deactivated_at IS NULL ORDER BY f.created_at DESC LIMIT $2`, [UserId, Limit])).rows;
}

// Comments manager: comments other people left on your posts, newest first.
export async function StudioComments(Pool, UserId, { filter = 'all', query = '', video = null, before = null, limit = 30 } = {}) {
	const Values = [UserId, `%${String(query).slice(0, 100).replace(/[\\%_]/g, '\\$&')}%`];
	const Filters = ['v.author_id = $1', 'c.author_id <> $1', `NOT ${RemovedSql('comment', 'c.id')}`, "c.body ILIKE $2 ESCAPE '\\'", 'u.suspended_at IS NULL'];
	if (filter === 'unreplied') Filters.push('NOT EXISTS (SELECT 1 FROM comments r WHERE r.parent_id = coalesce(c.parent_id, c.id) AND r.author_id = $1 AND r.id > c.id)');
	if (filter === 'followers') Filters.push('EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = c.author_id AND f.following_id = $1)');
	if (video) { Values.push(Id(video)); Filters.push(`v.id = $${Values.length}`); }
	if (before) { Values.push(Id(before)); Filters.push(`c.id < $${Values.length}`); }
	Values.push(Math.min(Math.max(Number(limit) || 30, 1), 100));
	return (await Pool.query(`SELECT c.id, c.body, c.created_at, c.parent_id, c.video_id, v.description AS video_description, v.cover_name,
		u.id AS author_id, u.username, u.display_name, u.avatar_name,
		(SELECT count(*)::int FROM comment_likes cl WHERE cl.comment_id = c.id) AS likes,
		EXISTS (SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $1) AS liked,
		EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = c.author_id AND f.following_id = $1) AS follower,
		(SELECT body FROM comments p WHERE p.id = c.parent_id) AS parent_body,
		(SELECT json_agg(json_build_object('id', r.id, 'body', r.body) ORDER BY r.id) FROM comments r WHERE r.parent_id = coalesce(c.parent_id, c.id) AND r.author_id = $1 AND r.id > c.id) AS my_replies
		FROM comments c JOIN videos v ON v.id = c.video_id JOIN users u ON u.id = c.author_id
		WHERE ${Filters.join(' AND ')} ORDER BY c.id DESC LIMIT $${Values.length}`, Values)).rows;
}
