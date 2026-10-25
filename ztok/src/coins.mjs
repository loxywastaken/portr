// Free coins and gifts. Everyone gets a welcome bonus and can claim coins once a day (UTC). Coins buy gifts
// for videos (and LIVE), which show on the post as a comment from the sender. Nothing here involves money.
import { HttpError, Id } from './http.mjs';
import { Transaction } from './db.mjs';
import { AssertVideoVisible, PairBlockedSql } from './privacy.mjs';
import { AddComment } from './store.mjs';

export const Welcome = 1000, Daily = 100, MaxCoins = 1000000;
export const GiftCatalog = [
	['rose', '🌹', 'Rose', 1], ['heart', '💗', 'Heart', 5], ['donut', '🍩', 'Donut', 10], ['star', '⭐', 'Star', 20], ['kitty', '🐱', 'Kitty', 30],
	['crown', '👑', 'Crown', 99], ['rocket', '🚀', 'Rocket', 299], ['unicorn', '🦄', 'Unicorn', 499], ['planet', '🪐', 'Planet', 999],
].map(([key, emoji, name, coins]) => ({ key, emoji, name, coins }));
export const Gift = Key => GiftCatalog.find(Item => Item.key === Key);
const Today = "(now() AT TIME ZONE 'UTC')::date";

export async function Wallet(Pool, UserId) {
	const Row = (await Pool.query(`SELECT coins, coins_welcomed, coins_claimed_on IS NULL OR coins_claimed_on < ${Today} AS claimable FROM users WHERE id = $1`, [UserId])).rows[0];
	const Now = new Date(), Next = new Date(Date.UTC(Now.getUTCFullYear(), Now.getUTCMonth(), Now.getUTCDate() + 1));
	return { balance: Row.coins, claimable: Row.claimable, claim: Row.claimable ? Daily + (Row.coins_welcomed ? 0 : Welcome) : 0, nextClaimAt: Row.claimable ? null : Next.toISOString(), daily: Daily, welcome: Welcome, catalog: GiftCatalog };
}

export async function Claim(Pool, UserId) {
	return Transaction(Pool, async Client => {
		const Row = (await Client.query(`SELECT coins, coins_welcomed, coins_claimed_on IS NULL OR coins_claimed_on < ${Today} AS claimable FROM users WHERE id = $1 FOR UPDATE`, [UserId])).rows[0];
		if (!Row.claimable) throw new HttpError(409, 'AlreadyClaimed');
		const Bonus = Row.coins_welcomed ? 0 : Math.min(Welcome, MaxCoins - Row.coins), Day = Math.min(Daily, MaxCoins - Row.coins - Bonus);
		await Client.query(`UPDATE users SET coins = coins + $2, coins_welcomed = true, coins_claimed_on = ${Today} WHERE id = $1`, [UserId, Bonus + Day]);
		if (Bonus) await Client.query("INSERT INTO coin_events(user_id, amount, reason) VALUES ($1, $2, 'welcome')", [UserId, Bonus]);
		if (Day) await Client.query("INSERT INTO coin_events(user_id, amount, reason) VALUES ($1, $2, 'daily')", [UserId, Day]);
		return { balance: Row.coins + Bonus + Day, added: Bonus + Day, welcome: Bonus };
	});
}

export async function SendGift(Pool, Sender, { video, gift, message = '' }) {
	const Item = Gift(String(gift ?? ''));
	if (!Item) throw new HttpError(400, 'InvalidGift');
	const Note = String(message ?? '').trim();
	if (Note.length > 150) throw new HttpError(400, 'MessageTooLong');
	const VideoId = Id(video);
	await AssertVideoVisible(Pool, VideoId, Sender.id);
	const Video = (await Pool.query(`SELECT v.author_id, v.story_expires_at, ${PairBlockedSql('$2', 'v.author_id')} AS blocked FROM videos v WHERE v.id = $1`, [VideoId, Sender.id])).rows[0];
	if (!Video) throw new HttpError(404, 'VideoNotFound');
	if (Video.author_id === Sender.id) throw new HttpError(400, 'CannotGiftYourself');
	if (Video.blocked) throw new HttpError(403, 'BlockedRelationship');
	const Sent = await Transaction(Pool, async Client => {
		const Left = (await Client.query('UPDATE users SET coins = coins - $2 WHERE id = $1 AND coins >= $2 RETURNING coins', [Sender.id, Item.coins])).rows[0];
		if (!Left) throw new HttpError(402, 'NotEnoughCoins');
		const Row = (await Client.query('INSERT INTO gifts(sender_id, recipient_id, video_id, gift, coins) VALUES ($1, $2, $3, $4, $5) RETURNING id', [Sender.id, Video.author_id, VideoId, Item.key, Item.coins])).rows[0];
		await Client.query("INSERT INTO coin_events(user_id, amount, reason, gift_id) VALUES ($1, $2, 'gift', $3)", [Sender.id, -Item.coins, Row.id]);
		return { id: Row.id, balance: Left.coins };
	});
	// The gift shows on the post as the sender's comment, like TikTok's gift comments. If comments are off
	// for this post (or the sender can't comment), the gift still goes through.
	if (!Video.story_expires_at) {
		const Comment = await AddComment(Pool, VideoId, Sender.id, `${Item.emoji} Sent a ${Item.name}${Note ? ` · ${Note}` : ''}`).catch(() => null);
		if (Comment) await Pool.query('UPDATE gifts SET comment_id = $2 WHERE id = $1', [Sent.id, Comment.id]);
	}
	return { ...Sent, gift: Item };
}

export async function GiftSummary(Pool, UserId, Days = 28) {
	const [Totals, Top, Recent, Mine, History] = await Promise.all([
		Pool.query(`SELECT count(*)::int AS gifts, coalesce(sum(coins), 0)::int AS coins, count(*) FILTER (WHERE created_at > now() - make_interval(days => $2))::int AS recent_gifts,
			coalesce(sum(coins) FILTER (WHERE created_at > now() - make_interval(days => $2)), 0)::int AS recent_coins FROM gifts WHERE recipient_id = $1`, [UserId, Days]),
		Pool.query(`SELECT u.username, u.display_name, u.avatar_name, sum(g.coins)::int AS coins, count(*)::int AS gifts FROM gifts g JOIN users u ON u.id = g.sender_id
			WHERE g.recipient_id = $1 AND u.suspended_at IS NULL AND u.deactivated_at IS NULL GROUP BY u.id ORDER BY coins DESC LIMIT 5`, [UserId]),
		Pool.query(`SELECT g.gift, g.coins, g.created_at, g.video_id, v.cover_name, u.username, u.display_name, u.avatar_name FROM gifts g LEFT JOIN users u ON u.id = g.sender_id LEFT JOIN videos v ON v.id = g.video_id
			WHERE g.recipient_id = $1 ORDER BY g.id DESC LIMIT 20`, [UserId]),
		Pool.query(`SELECT g.gift, g.coins, g.created_at, g.video_id, u.username, u.display_name FROM gifts g JOIN users u ON u.id = g.recipient_id WHERE g.sender_id = $1 ORDER BY g.id DESC LIMIT 10`, [UserId]),
		Pool.query('SELECT amount, reason, created_at FROM coin_events WHERE user_id = $1 ORDER BY id DESC LIMIT 15', [UserId]),
	]);
	return { totals: Totals.rows[0], top: Top.rows, recent: Recent.rows, sent: Mine.rows, history: History.rows };
}
