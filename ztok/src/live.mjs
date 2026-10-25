// LIVE: the host's browser records its camera (or screen) with MediaRecorder and sends the chunks over a
// WebSocket. ffmpeg turns them into a short HLS playlist that viewers play (natively on iPhone, with hls.js
// elsewhere). Chat, likes, gifts and the viewer count go over the same WebSocket. Nothing is recorded: the
// HLS files live in a temporary folder only while the broadcast runs.
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Accept } from './ws.mjs';
import { HttpError, Id } from './http.mjs';
import { AvatarUrl } from './store.mjs';
import { Transaction } from './db.mjs';
import { Gift } from './coins.mjs';
import { PairBlockedSql } from './privacy.mjs';

const Rooms = new Map();
const Root = join(tmpdir(), 'ztok-live');
export const MaxLives = Math.max(1, Number(process.env.MAX_LIVE_STREAMS) || 2);
const Grace = 15000;

const Person = Row => Row && ({ id: String(Row.id), username: Row.username, name: Row.display_name, avatar: Row.avatarUrl });
const Public = Room => ({ id: String(Room.Id), title: Room.Title, startedAt: Room.StartedAt, viewers: Room.Viewers.size, likes: Room.Likes, ready: Room.Ready,
	host: { id: String(Room.Host.id), username: Room.Host.username, name: Room.Host.display_name, avatar: Room.Host.avatarUrl } });

export async function EndAbandonedLives(Pool) {
	await Pool.query('UPDATE lives SET ended_at = now() WHERE ended_at IS NULL');
	await rm(Root, { recursive: true, force: true });
}

// Who may watch: anyone, unless they're blocked either way; a private account's LIVE is for approved followers.
async function CanWatch(Pool, Room, Viewer) {
	if (Viewer?.id === Room.Host.id) return true;
	const Key = Viewer?.id ?? 'anon';
	const Cached = Room.Access.get(Key);
	if (Cached && Cached.Until > Date.now()) return Cached.Allowed;
	const Row = (await Pool.query(`SELECT u.private_account, u.suspended_at IS NOT NULL AS suspended, ${PairBlockedSql('$2::bigint', 'u.id')} AS blocked,
		EXISTS (SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id) AS follows FROM users u WHERE u.id = $1`, [Room.Host.id, Viewer?.id ?? null])).rows[0];
	const Allowed = Boolean(Row && !Row.suspended && !Row.blocked && (!Row.private_account || Row.follows));
	Room.Access.set(Key, { Allowed, Until: Date.now() + 60000 });
	return Allowed;
}

export async function StartLive(Pool, Config, User, Title = '') {
	const Clean = String(Title ?? '').trim().slice(0, 100);
	const Existing = [...Rooms.values()].find(Room => Room.Host.id === User.id && !Room.Ended);
	if (Existing) { if (Clean) Existing.Title = Clean; return Public(Existing); }
	if ([...Rooms.values()].filter(Room => !Room.Ended).length >= MaxLives) throw new HttpError(503, 'TooManyLives');
	const Row = (await Pool.query('INSERT INTO lives(host_id, title) VALUES ($1, $2) RETURNING id, started_at', [User.id, Clean])).rows[0];
	const Dir = join(Root, String(Row.id));
	await mkdir(Dir, { recursive: true });
	const Room = { Id: Row.id, Host: { ...User, avatarUrl: AvatarUrl(User, Config.Origin) }, Title: Clean, StartedAt: Row.started_at, Dir, Config, Pool,
		Ffmpeg: null, HostSocket: null, Viewers: new Map(), Seen: new Set(), Chat: [], Likes: 0, Peak: 0, Messages: 0, PendingLikes: 0, LikeTimer: null,
		Ready: false, Ended: false, LastData: Date.now(), EndTimer: null, Access: new Map(), Spoke: new Map() };
	Rooms.set(String(Row.id), Room);
	Room.EndTimer = setTimeout(() => { if (!Room.HostSocket) EndLive(Room, 'NoStream'); }, 60000);
	return Public(Room);
}

export function Lives() { return [...Rooms.values()].filter(Room => !Room.Ended); }
export const LiveOf = HostId => Lives().find(Room => Room.Host.id === String(HostId));
export const Room = LiveId => Rooms.get(String(LiveId));

function Broadcast(Room, Message, Except = null) {
	const Text = JSON.stringify(Message);
	for (const [Socket] of Room.Viewers) if (Socket !== Except && Socket.Pending < 1048576) Socket.Text(Text);
	if (Room.HostSocket && Room.HostSocket !== Except) Room.HostSocket.Text(Text);
}

export async function EndLive(Room, Reason = 'Ended') {
	if (Room.Ended) return;
	Room.Ended = true;
	clearTimeout(Room.EndTimer); clearInterval(Room.LikeTimer);
	try { Room.Ffmpeg?.stdin.end(); } catch {}
	setTimeout(() => { try { Room.Ffmpeg?.kill('SIGKILL'); } catch {} }, 3000).unref();
	Broadcast(Room, { type: 'end', reason: Reason });
	for (const [Socket] of Room.Viewers) Socket.Close();
	Room.HostSocket?.Close();
	await Room.Pool.query('UPDATE lives SET ended_at = now(), peak_viewers = $2, viewers = $3, likes = $4, chat_messages = $5 WHERE id = $1', [Room.Id, Room.Peak, Room.Seen.size, Room.Likes, Room.Messages]).catch(() => {});
	setTimeout(() => { Rooms.delete(String(Room.Id)); rm(Room.Dir, { recursive: true, force: true }).catch(() => {}); }, 30000).unref();
}

function StartEncoder(Room) {
	const Config = Room.Config, Out = File => join(Room.Dir, File);
	const Process = spawn(Config.FFmpeg, ['-hide_banner', '-loglevel', 'error', '-fflags', '+genpts', '-probesize', '4000000', '-analyzeduration', '2000000', '-i', 'pipe:0',
		'-map', '0:v:0', '-map', '0:a:0?', '-vf', "scale='min(720,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30",
		'-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-b:v', '1500k', '-maxrate', '2000k', '-bufsize', '3000k', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0', '-pix_fmt', 'yuv420p',
		'-c:a', 'aac', '-b:a', '96k', '-ar', '44100', '-ac', '2', '-threads', '2',
		'-f', 'hls', '-hls_time', '2', '-hls_list_size', '6', '-hls_flags', 'delete_segments+independent_segments+omit_endlist+append_list+discont_start', '-hls_segment_filename', Out('s%05d.ts'), Out('index.m3u8'),
		'-map', '0:v:0', '-vf', 'fps=1/4,scale=360:-2', '-update', '1', '-q:v', '6', Out('thumb.jpg')], { stdio: ['pipe', 'ignore', 'pipe'] });
	Process.stderr.resume();
	Process.stdin.on('error', () => {});
	Process.once('exit', () => { if (Room.Ffmpeg === Process) Room.Ffmpeg = null; });
	Room.Ffmpeg = Process;
	const Watch = setInterval(async () => {
		if (Room.Ended || Room.Ffmpeg !== Process) return clearInterval(Watch);
		if (!Room.Ready && (await stat(Out('index.m3u8')).catch(() => null))) { Room.Ready = true; Broadcast(Room, { type: 'ready' }); clearInterval(Watch); }
	}, 500);
}

// The host's socket: binary frames are the recording, {type:'end'} ends the LIVE. If the host drops, the LIVE
// waits a few seconds for them to come back (a new recording starts a new encoder, continuing the playlist).
function Host(Room, Request, Socket) {
	const Api = Accept(Request, Socket, {
		MaxPayload: 8 * 1048576, Timeout: 30000,
		OnBinary: Bytes => {
			Room.LastData = Date.now();
			if (!Room.Ffmpeg) StartEncoder(Room);
			if (Room.Ffmpeg.stdin.writableLength > 32 * 1048576) return EndLive(Room, 'TooSlow');
			Room.Ffmpeg.stdin.write(Bytes);
		},
		OnText: Message => {
			if (Message?.type === 'end') EndLive(Room, 'Ended');
			else if (Message?.type === 'restart') { try { Room.Ffmpeg?.stdin.end(); } catch {} Room.Ffmpeg = null; }
			else if (Message?.type === 'chat') Say(Room, Room.Host, Message.text, Api);
		},
		OnClose: () => {
			if (Room.HostSocket !== Api || Room.Ended) return;
			Room.HostSocket = null;
			try { Room.Ffmpeg?.stdin.end(); } catch {}
			Room.Ffmpeg = null;
			Broadcast(Room, { type: 'paused' });
			Room.EndTimer = setTimeout(() => { if (!Room.HostSocket) EndLive(Room, 'HostLeft'); }, Grace);
		},
	});
	if (!Api) return;
	clearTimeout(Room.EndTimer);
	Room.HostSocket?.Close();
	Room.HostSocket = Api;
	Api.Text({ type: 'state', live: Public(Room), chat: Room.Chat.slice(-30), host: true });
}

function Say(Room, User, Text, From) {
	const Clean = String(Text ?? '').replace(/\s+/g, ' ').trim().slice(0, 150);
	if (!Clean) return;
	const Last = Room.Spoke.get(User.id) ?? 0;
	if (Date.now() - Last < 1000) { From?.Text({ type: 'error', error: 'SlowDown' }); return; }
	Room.Spoke.set(User.id, Date.now());
	const Message = { type: 'chat', id: `${Date.now()}${Math.random().toString(36).slice(2, 6)}`, user: { username: User.username, name: User.display_name, avatar: User.avatarUrl ?? AvatarUrl(User, Room.Config.Origin), host: User.id === Room.Host.id }, text: Clean, at: Date.now() };
	Room.Chat.push(Message); if (Room.Chat.length > 100) Room.Chat.shift();
	Room.Messages++;
	Broadcast(Room, Message);
}

async function SendLiveGift(Room, User, Key) {
	const Item = Gift(String(Key ?? ''));
	if (!Item || User.id === Room.Host.id) throw new HttpError(400, 'InvalidGift');
	return Transaction(Room.Pool, async Client => {
		const Left = (await Client.query('UPDATE users SET coins = coins - $2 WHERE id = $1 AND coins >= $2 RETURNING coins', [User.id, Item.coins])).rows[0];
		if (!Left) throw new HttpError(402, 'NotEnoughCoins');
		const Row = (await Client.query('INSERT INTO gifts(sender_id, recipient_id, live_id, gift, coins) VALUES ($1, $2, $3, $4, $5) RETURNING id', [User.id, Room.Host.id, Room.Id, Item.key, Item.coins])).rows[0];
		await Client.query("INSERT INTO coin_events(user_id, amount, reason, gift_id) VALUES ($1, $2, 'gift', $3)", [User.id, -Item.coins, Row.id]);
		return { item: Item, balance: Left.coins };
	});
}

function Viewer(Room, Request, Socket, User) {
	const Who = User && { ...User, avatarUrl: AvatarUrl(User, Room.Config.Origin) };
	let Liked = 0;
	const Api = Accept(Request, Socket, {
		MaxPayload: 4096, Timeout: 90000,
		OnText: async Message => {
			if (Message?.type === 'ping') return Api.Text({ type: 'pong' });
			if (!Who) return Api.Text({ type: 'error', error: 'LogInFirst' });
			if (Message?.type === 'chat') return Say(Room, Who, Message.text, Api);
			if (Message?.type === 'like') {
				const Count = Math.min(Math.max(Math.floor(Number(Message.count) || 1), 1), 15);
				if (Liked > 2000) return;
				Liked += Count; Room.Likes += Count; Room.PendingLikes += Count; return;
			}
			if (Message?.type === 'gift') {
				try {
					const Sent = await SendLiveGift(Room, Who, Message.gift);
					Api.Text({ type: 'balance', balance: Sent.balance });
					Broadcast(Room, { type: 'gift', user: { username: Who.username, name: Who.display_name, avatar: Who.avatarUrl }, gift: Sent.item });
				} catch (Failure) { Api.Text({ type: 'error', error: Failure.message }); }
			}
		},
		OnClose: () => {
			Room.Viewers.delete(Api);
			if (!Room.Ended) Broadcast(Room, { type: 'viewers', count: Room.Viewers.size });
		},
	});
	if (!Api) return;
	Room.Viewers.set(Api, Who);
	if (Who) Room.Seen.add(Who.id); else Room.Seen.add(`anon:${Room.Viewers.size}:${Date.now()}`);
	Room.Peak = Math.max(Room.Peak, Room.Viewers.size);
	Api.Text({ type: 'state', live: Public(Room), chat: Room.Chat.slice(-30), me: Who ? { username: Who.username } : null });
	Broadcast(Room, { type: 'viewers', count: Room.Viewers.size }, Api);
	if (Who) Broadcast(Room, { type: 'join', user: { username: Who.username, name: Who.display_name } }, Api);
	if (!Room.LikeTimer) Room.LikeTimer = setInterval(() => { if (Room.PendingLikes) { Broadcast(Room, { type: 'likes', total: Room.Likes, added: Room.PendingLikes }); Room.PendingLikes = 0; } }, 1000);
}

export async function LiveUpgrade(Pool, Config, Request, Socket, User) {
	const Url = new URL(Request.url, Config.Origin);
	const Match = /^\/ws\/live\/(\d{1,19})$/.exec(Url.pathname);
	const Found = Match && Room(Match[1]);
	if (!Found || Found.Ended) { Socket.end('HTTP/1.1 404 Not Found\r\nconnection: close\r\n\r\n'); return; }
	if (Url.searchParams.get('role') === 'host') {
		if (User?.id !== Found.Host.id) { Socket.end('HTTP/1.1 403 Forbidden\r\nconnection: close\r\n\r\n'); return; }
		return Host(Found, Request, Socket);
	}
	if (!(await CanWatch(Pool, Found, User))) { Socket.end('HTTP/1.1 403 Forbidden\r\nconnection: close\r\n\r\n'); return; }
	if (Found.Viewers.size >= 500) { Socket.end('HTTP/1.1 503 Service Unavailable\r\nconnection: close\r\n\r\n'); return; }
	Viewer(Found, Request, Socket, User);
}

// HLS playlist, segments and the thumbnail.
export async function ServeLive(Pool, Request, Response, LiveId, File, User) {
	const Found = Room(LiveId);
	if (!Found || Found.Ended || !/^(?:index\.m3u8|s\d{5,8}\.ts|thumb\.jpg)$/.test(File)) throw new HttpError(404, 'LiveNotFound');
	if (!(await CanWatch(Pool, Found, User))) throw new HttpError(404, 'LiveNotFound');
	const Path = join(Found.Dir, File), Info = await stat(Path).catch(() => null);
	if (!Info) throw new HttpError(404, 'NotReady');
	Response.writeHead(200, { 'content-type': File.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : File.endsWith('.ts') ? 'video/mp2t' : 'image/jpeg', 'content-length': Info.size,
		'cache-control': File.endsWith('.ts') ? 'private, max-age=60' : 'no-cache, no-store' });
	if (Request.method === 'HEAD') return Response.end();
	await pipeline(createReadStream(Path), Response).catch(() => {});
}

export async function VisibleLives(Pool, User) {
	const Out = [];
	for (const Found of Lives()) if (await CanWatch(Pool, Found, User)) Out.push(Public(Found));
	return Out.sort((A, B) => B.viewers - A.viewers);
}

export async function LiveSummary(Pool, HostId, LiveId) {
	const Row = (await Pool.query(`SELECT l.*, extract(epoch FROM coalesce(l.ended_at, now()) - l.started_at)::int AS seconds,
		(SELECT coalesce(sum(coins), 0)::int FROM gifts g WHERE g.live_id = l.id) AS gift_coins, (SELECT count(*)::int FROM gifts g WHERE g.live_id = l.id) AS gifts,
		(SELECT count(*)::int FROM follows f WHERE f.following_id = l.host_id AND f.created_at BETWEEN l.started_at AND coalesce(l.ended_at, now())) AS new_followers
		FROM lives l WHERE l.id = $1 AND l.host_id = $2`, [Id(LiveId), HostId])).rows[0];
	if (!Row) throw new HttpError(404, 'LiveNotFound');
	return Row;
}
