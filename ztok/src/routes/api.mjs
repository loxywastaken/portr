import { AssertVideoVisible, PostSettings, SetPrivateAccount } from '../privacy.mjs';
import { rm } from 'node:fs/promises';
import { HttpError, Id, Json, ReadBody, ReadRaw, RequireMethod } from '../http.mjs';
import { CreateUser, Login, RequireCsrf, SessionCookie, ClientInfo, RecordEvent, AccountsCookie, CookieValue, DeviceAccounts, DeviceTokens } from '../auth.mjs';
import { AvatarUrl, UserShape, UserStats, FindUser, Videos, SetRelation, AddComment, SetBlock } from '../store.mjs';
import { DownloadCopy, ImportVideo, InsertPost, PhotoSlideshow, SavePhoto, ReceiveVideo, RemoveMedia, SaveBanner, ServeMedia, WarmDownloads } from '../media.mjs';
import { AssertAllowed, RemovedSql } from '../moderation.mjs';
import { BadgeCatalog, BadgeSvg, PrideFlag, PublicBadges } from '../badges.mjs';
import { AvatarDecoration, DecorationCatalog, DecorationImage, Nameplate, NameplateCatalog, NameplateFile, NameStyle, PublicDecoration, PublicNameplate, PublicNameStyle } from '../decorations.mjs';
import { SetIpConsent } from '../ips.mjs';
import { Misc } from '../settings.mjs';
import { Category } from '../categories.mjs';
import { UnsendMessage } from './im.mjs';
import { ScheduleTime } from '../studio.mjs';

export async function Api(Context) {
	const { Request, Response, Url, Pool, Config, User, Limiter } = Context;
	const Path = Url.pathname;
	const MessageAction = /^\/api\/v1\/messages\/(\d+)(\/actions)?$/.exec(Path);
	if (MessageAction) {
		if (!User) throw new HttpError(401, 'NotLoggedIn');
		if (MessageAction[2]) {
			RequireMethod(Request, ['GET']);
			const Row = (await Pool.query(`SELECT m.sender_id = $2 AND m.recalled_at IS NULL AND m.created_at >= now() - interval '3 minutes' AS can_unsend
				FROM messages m JOIN conversation_members me ON me.conversation_id = m.conversation_id AND me.user_id = $2 WHERE m.id = $1 AND m.index_in_conversation > me.min_index AND NOT $2 = ANY(m.hidden_for)`, [Id(MessageAction[1]), User.id])).rows[0];
			if (!Row) throw new HttpError(404, 'MessageNotFound');
			Json(Response, { canUnsend: Row.can_unsend }); return true;
		}
		RequireMethod(Request, ['DELETE']); RequireCsrf(Request, User);
		if (Config.Features?.messages === false) throw new HttpError(403, 'MessagesDisabled');
		await UnsendMessage(Context, Id(MessageAction[1]));
		Json(Response, { ok: true }); return true;
	}
	if (Path === '/_ztok/badges/catalog') {
		RequireMethod(Request, ['GET']); Json(Response, BadgeCatalog); return true;
	}
	const BadgeIcon = Path.match(/^\/_ztok\/badges\/icon\/([a-z_]+)\.svg$/);
	if (BadgeIcon) {
		RequireMethod(Request, ['GET', 'HEAD']);
		const Svg = BadgeSvg(BadgeIcon[1]);
		Response.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400' });
		Response.end(Request.method === 'HEAD' ? undefined : Svg); return true;
	}
	if (Path === '/_ztok/badges') {
		RequireMethod(Request, ['GET']);
		const Names = [...new Set((Url.searchParams.get('users') ?? '').split(','))];
		if (Names.length > 50 || Names.some(Name => !/^[a-z0-9_]{3,24}$/.test(Name))) throw new HttpError(400, 'InvalidUsernames');
		const Rows = (await Pool.query('SELECT username, display_name, pride_flag, user_badges, verified, avatar_decoration, name_style, nameplate, banner_name FROM users WHERE username = ANY($1::text[]) AND suspended_at IS NULL', [Names])).rows;
		const Banned = (await Pool.query('SELECT username FROM users WHERE username = ANY($1::text[]) AND suspended_at IS NOT NULL AND deactivated_at IS NULL', [Names])).rows.map(Row => Row.username);
		Json(Response, { banned: Banned, banners: Object.fromEntries(Rows.map(Row => [Row.username, Row.banner_name ? `${Config.Origin}/media/${Row.banner_name}` : null])), users: Object.fromEntries(Rows.map(Row => [Row.username, PublicBadges(Row)])), verified: Misc.verifiedBadges ? Rows.filter(Row => Row.verified).map(Row => Row.username) : [], decorations: Object.fromEntries(Rows.map(Row => [Row.username, PublicDecoration(Row)]).filter(Pair => Pair[1])),
			styles: Object.fromEntries(Rows.filter(Row => PublicNameStyle(Row)).map(Row => [Row.username, { ...PublicNameStyle(Row), name: Row.display_name }])), nameplates: Object.fromEntries(Rows.map(Row => [Row.username, PublicNameplate(Row)]).filter(Pair => Pair[1])) }); return true;
	}
	if (Path === '/_ztok/nameplates/catalog') {
		RequireMethod(Request, ['GET']);
		if (!Misc.nameplates) throw new HttpError(404, 'NameplatesDisabled');
		Response.setHeader('cache-control', 'public, max-age=3600'); Json(Response, NameplateCatalog()); return true;
	}
	const PlateArt = Path.match(/^\/_ztok\/nameplates\/(\d{17,20})\.(png|webm)$/);
	if (PlateArt) {
		RequireMethod(Request, ['GET', 'HEAD']);
		const Data = await NameplateFile(Config, PlateArt[1], PlateArt[2]);
		Response.writeHead(200, { 'content-type': PlateArt[2] === 'png' ? 'image/png' : 'video/webm', 'content-length': Data.length, 'cache-control': 'public, max-age=31536000, immutable' });
		Response.end(Request.method === 'HEAD' ? undefined : Data); return true;
	}
	if (Path === '/_ztok/dm-partners') {
		RequireMethod(Request, ['GET']);
		if (!User) throw new HttpError(401, 'NotLoggedIn');
		const Rows = (await Pool.query(`SELECT c.conversation_key, u.username FROM conversation_members me JOIN conversations c ON c.id = me.conversation_id AND c.conversation_type = 1
			JOIN conversation_members o ON o.conversation_id = me.conversation_id AND o.user_id <> me.user_id JOIN users u ON u.id = o.user_id WHERE me.user_id = $1 AND u.suspended_at IS NULL LIMIT 1000`, [User.id])).rows;
		Json(Response, { partners: Object.fromEntries(Rows.map(Row => [Row.conversation_key, Row.username])) }); return true;
	}
	if (Path === '/api/v1/profile/ip-consent') {
		RequireMethod(Request, ['PATCH']); RequireCsrf(Request, User);
		Json(Response, { allow: await SetIpConsent(Pool, User.id, (await ReadBody(Request)).allow) }); return true;
	}
	if (Path === '/api/v1/profile/banner') {
		RequireMethod(Request, ['POST', 'DELETE']);
		if (!User) throw new HttpError(401, 'NotLoggedIn');
		RequireCsrf(Request, User);
		await AssertAllowed(Pool, User, 'profile');
		let Name = null;
		if (Request.method === 'POST') {
			Limiter.Hit(`banner:${User.id}`, 20, 3600000);
			if (!/^image\/(png|jpeg|webp)$/.test(String(Request.headers['content-type'] ?? '').split(';')[0].trim())) throw new HttpError(415, 'InvalidImage');
			Name = await SaveBanner(Config, User.id, await ReadRaw(Request, 8 * 1024 * 1024));
		}
		const Previous = (await Pool.query('UPDATE users u SET banner_name = $2 FROM (SELECT banner_name FROM users WHERE id = $1) Old WHERE u.id = $1 RETURNING Old.banner_name AS previous', [User.id, Name])).rows[0]?.previous;
		if (Previous && Previous !== Name) await RemoveMedia(Config, Previous);
		await RecordEvent(Pool, User.id, 'profile_change', ClientInfo(Request, Config), Name ? 'Changed banner' : 'Removed banner');
		Json(Response, { banner: Name ? `${Config.Origin}/media/${Name}` : null }); return true;
	}
	if (Path === '/api/v1/profile/name-style' || Path === '/api/v1/profile/nameplate') {
		RequireMethod(Request, ['PATCH']); RequireCsrf(Request, User);
		const Style = Path.endsWith('name-style');
		if (!(Style ? Misc.nameStyles : Misc.nameplates)) throw new HttpError(403, Style ? 'NameStylesDisabled' : 'NameplatesDisabled');
		await AssertAllowed(Pool, User, 'profile');
		const Body = await ReadBody(Request);
		if (Style) {
			const Chosen = NameStyle(Body.style ?? null);
			await Pool.query('UPDATE users SET name_style = $2 WHERE id = $1', [User.id, Chosen]);
			Json(Response, { style: Chosen && { ...Chosen, name: User.display_name } });
		} else {
			const Chosen = Nameplate(Body.nameplate);
			await Pool.query('UPDATE users SET nameplate = $2 WHERE id = $1', [User.id, Chosen]);
			Json(Response, { nameplate: PublicNameplate({ nameplate: Chosen }) });
		}
		return true;
	}
	if (Path === '/_ztok/decorations/catalog') {
		RequireMethod(Request, ['GET']);
		if (!Misc.avatarDecorations) throw new HttpError(404, 'AvatarDecorationsDisabled');
		Response.setHeader('cache-control', 'public, max-age=3600'); Json(Response, DecorationCatalog()); return true;
	}
	const Decoration = Path.match(/^\/_ztok\/decorations\/((?:a_)?[0-9a-f]{32})\.png$/);
	if (Decoration) {
		RequireMethod(Request, ['GET', 'HEAD']);
		const Data = await DecorationImage(Config, Decoration[1], Url.searchParams.has('static'));
		Response.writeHead(200, { 'content-type': 'image/png', 'content-length': Data.length, 'cache-control': 'public, max-age=31536000, immutable' });
		Response.end(Request.method === 'HEAD' ? undefined : Data); return true;
	}
	const PinMatch = /^\/api\/v1\/videos\/(\d+)\/pin$/.exec(Path);
	if (PinMatch) {
		RequireMethod(Request, ['POST']); RequireCsrf(Request, User);
		const Pinned = (await ReadBody(Request)).pinned === true;
		const Row = (await Pool.query('SELECT pinned_at FROM videos WHERE id = $1 AND author_id = $2', [Id(PinMatch[1]), User.id])).rows[0];
		if (!Row) throw new HttpError(404, 'VideoNotFound');
		if (Pinned && !Row.pinned_at && (await Pool.query('SELECT count(*)::int AS pinned FROM videos WHERE author_id = $1 AND pinned_at IS NOT NULL', [User.id])).rows[0].pinned >= 3) throw new HttpError(409, 'PinLimit');
		await Pool.query('UPDATE videos SET pinned_at = CASE WHEN $3 THEN coalesce(pinned_at, now()) END WHERE id = $1 AND author_id = $2', [Id(PinMatch[1]), User.id, Pinned]);
		Json(Response, { pinned: Pinned }); return true;
	}
	if (Path === '/api/v1/profile/decoration') {
		RequireMethod(Request, ['PATCH']); RequireCsrf(Request, User);
		if (!Misc.avatarDecorations) throw new HttpError(403, 'AvatarDecorationsDisabled');
		await AssertAllowed(Pool, User, 'profile');
		const Chosen = AvatarDecoration((await ReadBody(Request)).decoration);
		await Pool.query('UPDATE users SET avatar_decoration=$2 WHERE id=$1', [User.id, Chosen]);
		Json(Response, { decoration: PublicDecoration({ avatar_decoration: Chosen }) }); return true;
	}
	if (Path === '/api/v1/profile/badges') {
		RequireMethod(Request, ['PATCH']); RequireCsrf(Request, User);
		if (!Misc.profileBadges) throw new HttpError(403, 'ProfileBadgesDisabled');
		await AssertAllowed(Pool, User, 'profile');
		const Flag = PrideFlag((await ReadBody(Request)).prideFlag);
		await Pool.query('UPDATE users SET pride_flag=$2 WHERE id=$1', [User.id, Flag]);
		Json(Response, { prideFlag: Flag, ztokBadges: PublicBadges({ ...User, pride_flag: Flag }) }); return true;
	}
	if (Path === '/api/v1/instance') {
		RequireMethod(Request, ['GET']);
		Json(Response, { name: Config.Name, description: Config.Description, version: '0.1.0', registration: Config.Registration, origin: Config.Origin, source: Config.SourceUrl });
		return true;
	}
	if (Path === '/api/v1/accounts' || Path === '/api/v1/accounts/add' || Path === '/api/v1/accounts/switch') {
		const Current = User ? CookieValue(Request, 'ztok_session') : '';
		const Saved = (await DeviceAccounts(Pool, DeviceTokens(Request))).filter(Entry => Entry.Row.id !== User?.id);
		const Shape = (Row, Here) => ({ username: Row.username, displayName: Row.display_name, avatar: AvatarUrl(Row, Config.Origin), current: Here });
		if (Path === '/api/v1/accounts') {
			RequireMethod(Request, ['GET']);
			Response.setHeader('set-cookie', AccountsCookie(Config, Saved.map(Entry => Entry.Token)));
			Json(Response, { accounts: [...(User ? [Shape(User, true)] : []), ...Saved.map(Entry => Shape(Entry.Row, false))], max: 5 }); return true;
		}
		RequireMethod(Request, ['POST']);
		if (User) RequireCsrf(Request, User);
		if (Path === '/api/v1/accounts/add') {
			if (!User) throw new HttpError(401, 'NotLoggedIn');
			if (Saved.length >= 4) throw new HttpError(409, 'TooManyAccounts');
			Response.setHeader('set-cookie', [AccountsCookie(Config, [Current, ...Saved.map(Entry => Entry.Token)]), SessionCookie(Config, '', true)]);
			Json(Response, { ok: true }); return true;
		}
		const Wanted = String((await ReadBody(Request, 1024)).username ?? '').toLowerCase();
		const Target = Saved.find(Entry => Entry.Row.username === Wanted);
		if (!Target) throw new HttpError(404, 'AccountNotOnThisDevice');
		const Rest = [...(User ? [Current] : []), ...Saved.filter(Entry => Entry !== Target).map(Entry => Entry.Token)];
		Response.setHeader('set-cookie', [SessionCookie(Config, Target.Token), AccountsCookie(Config, Rest)]);
		Json(Response, { ok: true, username: Target.Row.username }); return true;
	}
	if (Path === '/api/v1/session') {
		if (Request.method === 'GET') { Json(Response, { user: User ? UserShape(User, Config.Origin) : null, csrfToken: User?.csrf_token ?? null }); return true; }
		if (Request.method === 'DELETE') {
			RequireCsrf(Request, User);
			await Pool.query('DELETE FROM sessions WHERE token_hash = $1', [User.token_hash]);
			Response.setHeader('set-cookie', SessionCookie(Config, '', true));
			Json(Response, { ok: true }); return true;
		}
		RequireMethod(Request, ['POST']);
		Limiter.Hit(`auth:${Request.socket.remoteAddress}`, 10);
		const Body = await ReadBody(Request);
		const Session = await Login(Pool, Body.username, Body.password, ClientInfo(Request, Config));
		Response.setHeader('set-cookie', SessionCookie(Config, Session.Token));
		Json(Response, { user: UserShape(Session.User, Config.Origin), csrfToken: Session.Csrf });
		return true;
	}
	if (Path === '/api/v1/users') {
		RequireMethod(Request, ['POST']);
		Limiter.Hit(`register:${Request.socket.remoteAddress}`, 5);
		const Created = await CreateUser(Pool, await ReadBody(Request), Config.Registration, false, ClientInfo(Request, Config));
		Json(Response, { user: UserShape(Created, Config.Origin) }, 201); return true;
	}
	if (Path === '/api/v1/videos') {
		if (Request.method === 'GET') {
			Json(Response, await Videos(Pool, Config.Origin, { before: Url.searchParams.get('cursor'), viewer: User?.id })); return true;
		}
		RequireMethod(Request, ['POST']); RequireCsrf(Request, User);
		if (Config.Features?.upload === false) throw new HttpError(403, 'UploadsDisabled');
		await AssertAllowed(Pool, User, 'upload');
		Limiter.Hit(`upload:${User.id}`, 5, 3600000);
		if (!Request.headers['content-type']?.startsWith('video/')) throw new HttpError(415, 'ExpectedVideoBody');
		if (Number(Request.headers['content-length']) > Config.MaxVideoBytes) throw new HttpError(413, 'VideoTooLarge');
		if (Context.Uploading.value >= 2) throw new HttpError(503, 'UploadsBusy');
		const Settings = { ...PostSettings(Url.searchParams.get('visibility') ?? 'public', Url.searchParams.get('comments') ?? 'default'), category: Category(Url.searchParams.get('category')), story: Url.searchParams.get('story') === '1', coverTime: Number(Url.searchParams.get('cover_time')) || 0 };
		// Studio: save as a draft, or schedule (publish_at, 15 minutes to 30 days ahead) instead of posting now.
		const Mode = Url.searchParams.get('mode') ?? 'post';
		if (!['post', 'draft', 'schedule'].includes(Mode) || (Mode !== 'post' && Settings.story)) throw new HttpError(400, 'InvalidPostMode');
		if (Mode !== 'post') Settings.draft = true;
		if (Mode === 'schedule') Settings.publishAt = ScheduleTime(Url.searchParams.get('publish_at'));
		Context.Uploading.value++;
		let File;
		try {
			File = await ReceiveVideo(Request, Config);
			const Created = await ImportVideo(Pool, Config, User.id, File, Url.searchParams.get('description') ?? '', Settings);
			Json(Response, Created?.draft ? { draft: Created.draft, scheduled: Boolean(Settings.publishAt) } : { id: Created }, 201);
			WarmDownloads(Pool, Config).catch(() => {});
		} finally { Context.Uploading.value--; if (File) await rm(File, { force: true }); }
		return true;
	}
	// Photo posts: photos are uploaded one at a time (stage), then posted together in order.
	if (Path === '/api/v1/photos/stage') {
		RequireMethod(Request, ['POST']); RequireCsrf(Request, User);
		if (Config.Features?.upload === false) throw new HttpError(403, 'UploadsDisabled');
		await AssertAllowed(Pool, User, 'upload');
		if (!/^image\/(?:png|jpeg|webp)$/.test(Request.headers['content-type'] ?? '')) throw new HttpError(415, 'ExpectedImageBody');
		if (Number(Request.headers['content-length']) > 20 * 1024 * 1024) throw new HttpError(413, 'ImageTooLarge');
		Limiter.Hit(`photo:${User.id}`, 120, 3600000);
		if ((await Pool.query("SELECT count(*)::int AS n FROM photo_uploads WHERE owner_id = $1 AND created_at > now() - interval '1 day'", [User.id])).rows[0].n >= 300) throw new HttpError(429, 'TryLater');
		const Photo = await SavePhoto(Config, await ReadRaw(Request, 20 * 1024 * 1024));
		await Pool.query('INSERT INTO photo_uploads(name, owner_id, width, height) VALUES ($1, $2, $3, $4)', [Photo.name, User.id, Photo.width, Photo.height]);
		Json(Response, { ...Photo, url: `${Config.Origin}/media/${Photo.name}` }, 201); return true;
	}
	if (Path === '/api/v1/photos') {
		RequireMethod(Request, ['POST']); RequireCsrf(Request, User);
		if (Config.Features?.upload === false) throw new HttpError(403, 'UploadsDisabled');
		await AssertAllowed(Pool, User, 'upload');
		const Body = await ReadBody(Request, 65536);
		const Names = Array.isArray(Body.images) ? Body.images.map(String) : [];
		if (!Names.length || Names.length > 35 || new Set(Names).size !== Names.length) throw new HttpError(400, 'InvalidPhotos');
		const Staged = new Map((await Pool.query('SELECT name, width, height FROM photo_uploads WHERE owner_id = $1 AND name = ANY($2::text[])', [User.id, Names])).rows.map(Row => [Row.name, Row]));
		if (Staged.size !== Names.length) throw new HttpError(400, 'InvalidPhotos');
		const Description = String(Body.description ?? '');
		if (Description.length > 2200) throw new HttpError(400, 'DescriptionTooLong');
		const Mode = Body.mode ?? 'post', Story = Body.story === true || Body.story === '1';
		if (!['post', 'draft', 'schedule'].includes(Mode) || (Mode !== 'post' && Story)) throw new HttpError(400, 'InvalidPostMode');
		const Settings = { ...PostSettings(Body.visibility ?? 'public', Body.comments ?? 'default'), category: Category(Body.category), story: Story, draft: Mode !== 'post', publishAt: Mode === 'schedule' ? ScheduleTime(Body.publish_at) : null };
		Limiter.Hit(`upload:${User.id}`, 5, 3600000);
		if (Context.Uploading.value >= 2) throw new HttpError(503, 'UploadsBusy');
		Context.Uploading.value++;
		try {
			const Show = await PhotoSlideshow(Config, Names.map(Name => Staged.get(Name)));
			const Created = await InsertPost(Pool, Config, User.id, Show, Description, Settings);
			await Pool.query('DELETE FROM photo_uploads WHERE name = ANY($1::text[])', [Names]);
			Json(Response, Created?.draft ? { draft: Created.draft, scheduled: Boolean(Settings.publishAt) } : { id: Created }, 201);
			if (!Created?.draft) WarmDownloads(Pool, Config).catch(() => {});
		} finally { Context.Uploading.value--; }
		return true;
	}
	if (Path === '/api/v1/profile/privacy') {
		RequireMethod(Request, ['PATCH']); RequireCsrf(Request, User);
		const Body = await ReadBody(Request);
		if (!['everyone','followers','friends','none'].includes(Body.comments) || typeof Body.privateAccount !== 'boolean') throw new HttpError(400, 'InvalidAccountPrivacy');
		await SetPrivateAccount(Pool, User.id, Body.privateAccount);
		await Pool.query('UPDATE users SET comment_permission = $2 WHERE id = $1', [User.id, Body.comments]);
		Json(Response, { ok: true }); return true;
	}
	const Download = Path.match(/^\/api\/v1\/videos\/(\d+)\/download$/);
	if (Download) {
		RequireMethod(Request, ['GET', 'HEAD']);
		const VideoId = Id(Download[1]);
		await AssertVideoVisible(Pool, VideoId, User?.id);
		const Row = (await Pool.query('SELECT v.id, v.file_name, v.duration, v.download_name, v.author_id, u.username, u.private_account, u.allow_downloads FROM videos v JOIN users u ON u.id = v.author_id WHERE v.id = $1', [VideoId])).rows[0];
		if (!Row) throw new HttpError(404, 'VideoNotFound');
		if (Row.author_id !== User?.id && (Row.private_account || !Row.allow_downloads)) throw new HttpError(403, 'DownloadsOff');
		Limiter.Hit(`download:${User?.id ?? Request.socket.remoteAddress}`, 30, 600000);
		const Name = await DownloadCopy(Pool, Config, Row);
		Response.setHeader('content-disposition', `attachment; filename="${Row.username}_${Row.id}.mp4"`);
		await ServeMedia(Request, Response, Config, Name, true); return true;
	}
	const Post = Path.match(/^\/api\/v1\/videos\/(\d+)$/);
	if (Post) {
		RequireMethod(Request, ['PATCH']); RequireCsrf(Request, User);
		const Body = await ReadBody(Request), Settings = PostSettings(Body.visibility, Body.comments);
		const Updated = await Pool.query('UPDATE videos SET visibility = $3, comment_permission = $4 WHERE id = $1 AND author_id = $2 RETURNING id', [Id(Post[1]), User.id, Settings.visibility, Settings.comment_permission]);
		if (!Updated.rowCount) throw new HttpError(404, 'VideoNotFound');
		Json(Response, { ok: true }); return true;
	}
	const Match = Path.match(/^\/api\/v1\/videos\/(\d+)\/(like|favorite|comments)$/);
	if (Match) {
		const VideoId = Id(Match[1]);
		if (Match[2] === 'comments') {
			if (Request.method === 'GET') {
				await AssertVideoVisible(Pool, VideoId, User?.id);
				const Result = await Pool.query(`SELECT c.id, c.body, c.created_at, u.id AS user_id, u.username, u.display_name FROM comments c JOIN users u ON u.id = c.author_id
					WHERE c.video_id = $1 AND NOT ${RemovedSql('comment', 'c.id')} AND u.suspended_at IS NULL ORDER BY c.id DESC LIMIT 50`, [VideoId]);
				Json(Response, { comments: Result.rows }); return true;
			}
			RequireMethod(Request, ['POST']); RequireCsrf(Request, User);
			if (Config.Features?.comments === false) throw new HttpError(403, 'CommentsDisabled');
			await AssertAllowed(Pool, User, 'comment');
			Limiter.Hit(`comment:${User.id}`, 30);
			const { id, body, created_at } = await AddComment(Pool, VideoId, User.id, (await ReadBody(Request)).text);
			Json(Response, { id, body, created_at }, 201); return true;
		}
		RequireMethod(Request, ['PUT', 'DELETE']); RequireCsrf(Request, User);
		await SetRelation(Pool, Match[2] === 'like' ? 'likes' : 'favorites', ['user_id', 'video_id'], [User.id, VideoId], Request.method === 'PUT');
		Json(Response, { ok: true }); return true;
	}
	const Follow = Path.match(/^\/api\/v1\/users\/([a-z0-9_]+)\/(follow|block)$/);
	if (Follow) {
		RequireMethod(Request, ['PUT', 'DELETE']); RequireCsrf(Request, User);
		const Target = await FindUser(Pool, Follow[1]);
		if (Follow[2] === 'follow' && Request.method === 'PUT') {
			if ((await Pool.query('SELECT 1 FROM users WHERE id = $1 AND suspended_at IS NOT NULL', [Target.id])).rowCount) throw new HttpError(404, 'UserNotFound');
			await AssertAllowed(Pool, User, 'follow');
		}
		if (Follow[2] === 'block') await SetBlock(Pool, User.id, Target.id, Request.method === 'PUT');
		else await SetRelation(Pool, 'follows', ['follower_id', 'following_id'], [User.id, Target.id], Request.method === 'PUT');
		Json(Response, { ok: true }); return true;
	}
	return false;
}
