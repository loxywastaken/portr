// LIVE pages and API: the LIVE hub (/live), a LIVE room (/@user/live), and the endpoints the host and
// viewers use. Going LIVE happens in Studio (/tiktokstudio/live).
import { Escape, HttpError, Json, ReadBody, RequireMethod } from '../http.mjs';
import { RequireCsrf } from '../auth.mjs';
import { AssertAllowed } from '../moderation.mjs';
import { AvatarUrl, FindUser } from '../store.mjs';
import { Public } from '../client/shell.mjs';
import { EndLive, LiveOf, LiveSummary, Room, ServeLive, StartLive, VisibleLives } from '../live.mjs';

function Page(Config, Title, Body, Scripts = []) {
	return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#000"><title>${Escape(Title)} · ${Escape(Config.Name)}</title><link rel="icon" href="/brand/favicon"><link rel="stylesheet" href="${Public('live.css')}">
	<body class="live-app">${Body}${Scripts.map(Name => `<script src="${Public(Name)}" defer></script>`).join('')}</body></html>`;
}
const Top = (Config, User) => `<header class="live-top"><a class="live-brand" href="/"><img src="/brand/icon" alt=""><span>${Escape(Config.Name)} <b>LIVE</b></span></a><nav><a href="/live">LIVE</a>${User ? '<a class="go" href="/tiktokstudio/live"><span class="dot" aria-hidden="true"></span>Go LIVE</a>' : '<a href="/login?redirect_url=%2Flive">Log in</a>'}</nav></header>`;
const Boot = Value => `<script id="live-boot" type="application/json">${JSON.stringify(Value).replaceAll('<', '\\u003c')}</script>`;

export async function LiveRoutes(Context) {
	const { Request, Response, Url, Pool, Config, User } = Context;
	const Path = Url.pathname;

	if (Path === '/api/v1/live') {
		if (Request.method === 'GET') { Json(Response, { lives: await VisibleLives(Pool, User) }); return true; }
		RequireMethod(Request, ['POST']); RequireCsrf(Request, User);
		await AssertAllowed(Pool, User, 'upload');
		const Body = await ReadBody(Request);
		Json(Response, { live: await StartLive(Pool, Config, User, Body.title) }, 201); return true;
	}
	const UserLive = /^\/api\/v1\/live\/user\/([a-z0-9_]{3,24})$/i.exec(Path);
	if (UserLive) {
		RequireMethod(Request, ['GET']);
		const Found = LiveOf((await FindUser(Pool, UserLive[1]).catch(() => null))?.id);
		Json(Response, { live: Found && (await VisibleLives(Pool, User)).find(Live => Live.id === String(Found.Id)) || null }); return true;
	}
	const Action = /^\/api\/v1\/live\/(\d{1,19})\/(end|summary)$/.exec(Path);
	if (Action) {
		if (Action[2] === 'summary') { RequireMethod(Request, ['GET']); if (!User) throw new HttpError(401, 'NotLoggedIn'); Json(Response, { summary: await LiveSummary(Pool, User.id, Action[1]) }); return true; }
		RequireMethod(Request, ['POST']); RequireCsrf(Request, User);
		const Found = Room(Action[1]);
		if (!Found || Found.Host.id !== User.id) throw new HttpError(404, 'LiveNotFound');
		await EndLive(Found, 'Ended');
		Json(Response, { ok: true }); return true;
	}
	const File = /^\/live\/(\d{1,19})\/([a-z0-9.]+)$/.exec(Path);
	if (File) { RequireMethod(Request, ['GET', 'HEAD']); await ServeLive(Pool, Request, Response, File[1], File[2], User); return true; }

	if (Path === '/live' || Path === '/live/') {
		RequireMethod(Request, ['GET']);
		const Items = await VisibleLives(Pool, User);
		Response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
		Response.end(Page(Config, 'LIVE', `${Top(Config, User)}<main class="live-hub"><h1>LIVE now</h1>
			<ul class="live-grid" id="live-grid">${Items.map(Item => `<li><a href="/@${Item.host.username}/live"><span class="thumb" style="background-image:url('${Item.ready ? `/live/${Item.id}/thumb.jpg` : Item.host.avatar}')"><span class="badge">LIVE</span><span class="count">${Item.viewers} watching</span></span><span class="who"><img src="${Item.host.avatar}" alt=""><span><strong>${Escape(Item.host.name)}</strong><small>${Escape(Item.title || `@${Item.host.username}`)}</small></span></span></a></li>`).join('')}</ul>
			${Items.length ? '' : `<div class="live-empty"><h2>No one is LIVE right now</h2><p>When people you can watch go LIVE, they show up here.</p>${User ? '<a class="button" href="/tiktokstudio/live">Go LIVE</a>' : ''}</div>`}</main>`, ['live-hub.js']));
		return true;
	}

	const Watch = /^\/@([a-z0-9_]{3,24})\/live\/?$/i.exec(Path);
	if (Watch) {
		RequireMethod(Request, ['GET']);
		const Host = await FindUser(Pool, Watch[1]).catch(() => null);
		const Found = Host && LiveOf(Host.id);
		const Live = Found && (await VisibleLives(Pool, User)).find(Item => Item.id === String(Found.Id));
		Response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
		if (!Live) {
			Response.end(Page(Config, 'LIVE has ended', `${Top(Config, User)}<main class="live-hub"><div class="live-empty">${Host ? `<img class="big-avatar" src="${AvatarUrl(Host, Config.Origin)}" alt="">` : ''}<h2>${Host ? `${Escape(Host.display_name)} isn’t LIVE right now` : 'This LIVE isn’t available'}</h2><p>${Host ? 'Follow them to see their next LIVE and new posts.' : 'It may have ended.'}</p>${Host ? `<a class="button" href="/@${Host.username}">View profile</a>` : ''}<p><a href="/live">See who’s LIVE</a></p></div></main>`));
			return true;
		}
		Response.end(Page(Config, `${Live.host.name} is LIVE`, `<main class="room" id="room" data-live="${Live.id}">
			<section class="stage"><video id="stream" playsinline autoplay muted></video><div class="stage-wait" id="wait">Starting…</div>
				<div class="stage-top"><a class="host" href="/@${Live.host.username}"><img src="${Live.host.avatar}" alt=""><span><strong>${Escape(Live.host.name)}</strong><small id="likes-count">${Live.likes} likes</small></span></a>
					${User && User.id !== Live.host.id ? '<button class="follow" id="follow" type="button" hidden>Follow</button>' : ''}<span class="viewers" id="viewers" aria-live="polite"><span aria-hidden="true">👤</span> ${Live.viewers}</span>
					<a class="close" href="/live" aria-label="Leave LIVE">×</a></div>
				<button class="unmute" id="unmute" type="button">🔇 Tap to unmute</button>
				<div class="hearts" id="hearts" aria-hidden="true"></div><div class="gift-banner" id="gift-banner" aria-live="polite"></div>
				<h1 class="stage-title">${Escape(Live.title)}</h1></section>
			<aside class="side"><div class="chat" id="chat" role="log" aria-label="LIVE chat"></div>
				<form class="say" id="say">${User ? '<input id="say-text" maxlength="150" placeholder="Add comment…" aria-label="Comment" autocomplete="off"><button type="button" id="gift-open" class="icon-btn" aria-label="Send a gift">🎁</button><button type="button" id="like" class="icon-btn like" aria-label="Like">❤</button>' : `<a class="login" href="/login?redirect_url=${encodeURIComponent(Path)}">Log in to comment and send gifts</a>`}</form></aside>
			<dialog class="gifts" id="gifts" aria-labelledby="gifts-title"><div class="gifts-head"><h2 id="gifts-title">Send a gift</h2><button type="button" class="x" id="gifts-close" aria-label="Close">×</button></div><div class="gift-grid" id="gift-grid" role="radiogroup" aria-label="Gifts"></div><div class="gifts-foot"><a href="/coin" target="_blank" rel="noopener"><span class="coin" aria-hidden="true"></span><strong id="balance">…</strong> coins</a><button type="button" id="gift-send" disabled>Send</button></div><p class="gifts-status" id="gifts-status" role="status"></p></dialog>
		</main>${Boot({ live: Live, me: User ? { username: User.username, csrf: User.csrf_token, id: String(User.id) } : null })}`, ['hls-light.js', 'live-room.js']));
		return true;
	}
	return false;
}
