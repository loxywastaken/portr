// ztok Studio, modeled on TikTok Studio: Home, Posts (with drafts and scheduled posts), Analytics, Comments
// and Upload, in one app with a sidebar. Pages are rendered here; public/studio.js only adds charts' hover,
// local times and the upload flow.
import { Escape, HttpError, Id, ReadBody, RequireMethod } from '../http.mjs';
import { Categories, Category, GuessCategory } from '../categories.mjs';
import { RequireCsrf } from '../auth.mjs';
import { AvatarUrl, AddComment, SetRelation } from '../store.mjs';
import { PostSettings, SetPrivateAccount, DecideFollowRequest, FollowRequests } from '../privacy.mjs';
import { CoverFromFrame, RemoveMedia } from '../media.mjs';
import { Public } from '../client/shell.mjs';
import { Claim, GiftCatalog, GiftSummary, Wallet } from '../coins.mjs';
import { DeleteDraft, DeletePost, Draft, Drafts, MetricLabels, NewFollowers, Post, Posts, PublishDraft, Range, Ranges, ScheduleTime, Series, StudioComments, Totals } from '../studio.mjs';

const Visibility = (Private, Current = 'public') => [['public', Private ? 'Followers (approved)' : 'Everyone'], ['followers', 'Followers'], ['friends', 'Friends (followers you follow back)'], ['only_me', 'Only you']].filter(([Value]) => !Private || Value !== (Current === 'followers' ? 'public' : 'followers'));
const VisibilityLabel = (Private, Value) => Visibility(Private, Value).find(([Key]) => Key === Value)?.[1] ?? 'Everyone';
const Comments = [['default', 'Use account settings'], ['everyone', 'Everyone'], ['followers', 'Followers'], ['friends', 'Friends'], ['none', 'No one']];
const CategoryOptions = [['', 'Automatic from hashtags'], ...Categories.map(([Type, Label]) => [String(Type), Label]), ['0', 'None']];
const Select = (Name, Title, Options, Value, Extra = '') => `<label class="field">${Title}<select name="${Name}"${Extra}>${Options.map(([Key, Text]) => `<option value="${Escape(Key)}"${String(Key) === String(Value) ? ' selected' : ''}>${Escape(Text)}</option>`).join('')}</select></label>`;
const Csrf = User => `<input type="hidden" name="csrf" value="${Escape(User.csrf_token)}">`;
const Redirect = (Response, To) => { Response.writeHead(303, { location: To }); Response.end(); return true; };
const Number_ = Value => { const N = Number(Value) || 0; return N >= 1e6 ? `${(N / 1e6).toFixed(N >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M` : N >= 1e4 ? `${(N / 1e3).toFixed(N >= 1e5 ? 0 : 1).replace(/\.0$/, '')}K` : N.toLocaleString('en-US'); };
const Day = Value => new Date(Value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
// Times are printed in UTC and rewritten to the reader's own time zone by studio.js.
const When = (Value, Style = 'datetime') => `<time datetime="${new Date(Value).toISOString()}" data-local="${Style}">${Style === 'date' ? Day(Value) : `${Day(Value)}, ${new Date(Value).toISOString().slice(11, 16)} UTC`}</time>`;
const Clock = Seconds => `${Math.floor(Seconds / 60)}:${String(Math.round(Seconds % 60)).padStart(2, '0')}`;
const Caption = Text => Escape(Text || 'No caption');
const Media = Name => `/media/${encodeURIComponent(Name)}`;
const Errors = { InvalidScheduleTime: 'Pick a date and time to schedule.', ScheduleTooSoon: 'Scheduled posts need to be at least 15 minutes from now.', ScheduleTooLate: 'You can schedule up to 30 days ahead.', pins: 'You can pin up to 3 videos. Unpin one first.',
	InvalidComment: 'Write a reply first (up to 1500 characters).', CommentsNotAllowed: 'Comments are turned off for that post.', BlockedRelationship: 'You can’t reply to someone you’ve blocked.', DescriptionTooLong: 'Captions can be up to 2200 characters.',
	VideoNotFound: 'That post doesn’t exist anymore.', DraftNotFound: 'That draft doesn’t exist anymore.', CommentNotFound: 'That comment was deleted.', InvalidVideo: 'Couldn’t read a frame there. Try another spot.' };
const Notice = Url => {
	const Error = Url.searchParams.get('error'), Saved = Url.searchParams.get('saved');
	if (Error) return `<p class="notice error" role="alert">${Escape(Errors[Error] ?? 'Something went wrong. Try again.')}</p>`;
	return Saved ? `<p class="notice" role="status">${Escape({ deleted: 'Post deleted.', published: 'Posted.', draft: 'Draft deleted.', scheduled: 'Scheduled.', cover: 'Cover updated.' }[Saved] ?? 'Saved.')}</p>` : '';
};
const Icons = {
	home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
	content: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M10 9.5v5l4-2.5z"/>',
	analytics: '<path d="M5 20V11M12 20V5M19 20v-7"/>',
	comments: '<path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-7l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
	privacy: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
	sound: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
	live: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3"/>',
	coins: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.5-1 1.3-2.5 1.5-2.5.6-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5"/>',
	requests: '<circle cx="10" cy="8" r="4"/><path d="M3 20a7 7 0 0 1 14 0M19 8v6M16 11h6"/>',
	back: '<path d="M15 5l-7 7 7 7"/>',
	plus: '<path d="M12 5v14M5 12h14"/>',
};
const Icon = Name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${Icons[Name]}</svg>`;

// One chart per metric: a single series as a 2px line over a light area, recessive grid, crosshair + tooltip
// in studio.js, and a data table for anyone who can't or doesn't want to hover.
function Chart(Days, Values, Label) {
	const W = 640, H = 200, Max = Math.max(...Values, 0);
	const Step = 10 ** Math.floor(Math.log10(Math.max(Max, 1))), Top = Max <= 4 ? 4 : [1, 2, 2.5, 5, 10].map(F => F * Step).find(V => V >= Max) ?? Max;
	const X = Index => Values.length < 2 ? W / 2 : Index / (Values.length - 1) * W, Y = Value => H - Value / Top * H;
	const Points = Values.map((Value, Index) => `${X(Index).toFixed(1)},${Y(Value).toFixed(1)}`);
	const Ticks = [0, Top / 2, Top].map(Value => `<span style="bottom:${Value / Top * 100}%">${Number_(Value)}</span>`).join('');
	const Short = Value => new Date(`${Value}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
	const Data = JSON.stringify({ label: Label, days: Days, values: Values, top: Top }).replaceAll('<', '\\u003c');
	return `<figure class="chart" tabindex="0" aria-label="${Escape(Label)} by day, ${Short(Days[0])} to ${Short(Days.at(-1))}. Total ${Values.reduce((A, B) => A + B, 0)}.">
		<div class="chart-plot"><div class="chart-y" aria-hidden="true">${Ticks}</div><div class="chart-area"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
		${[0.5, 1].map(F => `<line class="grid" x1="0" x2="${W}" y1="${H - F * H}" y2="${H - F * H}"/>`).join('')}<line class="base" x1="0" x2="${W}" y1="${H}" y2="${H}"/>
		<path class="fill" d="M0,${H} L${Points.join(' L')} L${W},${H} Z"/><polyline class="line" points="${Points.join(' ')}"/></svg>
		<span class="chart-dot" style="left:${X(Values.length - 1) / W * 100}%;bottom:${(1 - Y(Values.at(-1) ?? 0) / H) * 100}%"></span><div class="chart-cross" hidden></div><div class="chart-tip" role="status" hidden></div></div></div>
		<div class="chart-x" aria-hidden="true"><span>${Short(Days[0])}</span><span>${Short(Days.at(-1))}</span></div>
		<script type="application/json" class="chart-data">${Data}</script>
		<details class="chart-table"><summary>Show as table</summary><table><thead><tr><th scope="col">Day</th><th scope="col">${Escape(Label)}</th></tr></thead><tbody>${Days.map((Day_, Index) => `<tr><td>${Short(Day_)}</td><td>${Values[Index].toLocaleString('en-US')}</td></tr>`).reverse().join('')}</tbody></table></details></figure>`;
}

function Change(Total, Previous) {
	if (!Previous) return Total ? '<span class="delta up"><span aria-hidden="true">▲</span> New</span>' : '<span class="delta flat">No change</span>';
	const Percent = Math.round((Total - Previous) / Previous * 100);
	if (!Percent) return '<span class="delta flat">No change</span>';
	return `<span class="delta ${Percent > 0 ? 'up' : 'down'}"><span aria-hidden="true">${Percent > 0 ? '▲' : '▼'}</span> ${Math.abs(Percent)}%<span class="sr"> ${Percent > 0 ? 'more' : 'less'} than the previous period</span></span>`;
}

function Tile(Name, Metric, Href, Selected = false) {
	const Inner = `<span class="tile-label">${MetricLabels[Name]}</span><strong>${Number_(Metric.total)}</strong>${Change(Metric.total, Metric.previous)}`;
	return Href ? `<a class="tile${Selected ? ' selected' : ''}" href="${Href}"${Selected ? ' aria-current="true"' : ''}>${Inner}</a>` : `<div class="tile">${Inner}</div>`;
}

const RangeLabel = Days => Days === 365 ? 'Last 365 days' : `Last ${Days} days`;
const RangePicker = (Days, Href) => `<div class="segmented" role="group" aria-label="Date range">${Ranges.map(Value => `<a href="${Href(Value)}"${Value === Days ? ' aria-current="true"' : ''}>${Value === 365 ? '365 days' : `${Value} days`}</a>`).join('')}</div>`;
const Tracked = Since => `<p class="footnote">Day-by-day views are counted from ${Since ? Day(Since) : 'today'} on. Totals include every view.</p>`;

function PostRow(Row, Private) {
	return `<tr>
		<td><a class="post-cell" href="/tiktokstudio/content/${Row.id}"><img src="${Media(Row.cover_name)}" alt="" loading="lazy"><span><span class="caption">${Caption(Row.description)}</span><small>${Row.photos ? `Photos · ${Row.photos}` : Clock(Row.duration)}${Row.pinned_at ? ' · <span class="pill">Pinned</span>' : ''}${Row.removed ? ' · <span class="pill warn">Removed</span>' : ''}</small></span></a></td>
		<td data-label="Posted">${When(Row.created_at, 'date')}</td><td data-label="Privacy">${Escape(VisibilityLabel(Private, Row.visibility))}</td>
		<td data-label="Views" class="num">${Number_(Row.views)}</td><td data-label="Likes" class="num">${Number_(Row.likes)}</td><td data-label="Comments" class="num">${Number_(Row.comments)}</td>
		<td class="row-actions"><a href="/tiktokstudio/content/${Row.id}">Edit</a><a href="/tiktokstudio/analytics/${Row.id}">Analytics</a></td></tr>`;
}

function DraftCard(Row) {
	return `<article class="draft-card"><a href="/tiktokstudio/drafts/${Row.id}"><img src="${Media(Row.cover_name)}" alt="" loading="lazy"></a><div><a href="/tiktokstudio/drafts/${Row.id}" class="caption">${Caption(Row.description)}</a>
		<small>${Row.publish_at ? `<span class="pill">Scheduled</span> ${When(Row.publish_at)}` : `Saved ${When(Row.updated_at, 'date')}`}</small></div>
		<a class="button small secondary" href="/tiktokstudio/drafts/${Row.id}">Edit</a></article>`;
}

// Edit post / edit draft share one form: preview + cover picker on the left, details on the right.
function Editor(User, Row, { Draft: IsDraft }) {
	const Action = IsDraft ? `/tiktokstudio/drafts/${Row.id}` : `/tiktokstudio/content/${Row.id}`;
	const Schedule = IsDraft ? `<fieldset class="field when"><legend>When to post</legend>
		<label class="radio"><input type="radio" name="when" value="draft"${Row.publish_at ? '' : ' checked'}> Keep as draft</label>
		<label class="radio"><input type="radio" name="when" value="schedule"${Row.publish_at ? ' checked' : ''}> Schedule</label>
		<input type="datetime-local" name="publish_local" data-iso="${Row.publish_at ? new Date(Row.publish_at).toISOString() : ''}" aria-label="Date and time to post"><input type="hidden" name="publish_at">
		<small data-for="schedule">15 minutes to 30 days from now, in your time zone.</small></fieldset>` : '';
	return `<div class="editor">
		${Row.images?.length ? `<section class="card editor-media"><ol class="photo-strip" aria-label="Photos">${Row.images.map((Image, Index) => `<li><img src="${Media(Image.name)}" alt="Photo ${Index + 1} of ${Row.images.length}" loading="lazy"><span class="photo-index">${Index + 1}</span></li>`).join('')}</ol>
			<p class="field-help">${Row.images.length} photo${Row.images.length === 1 ? '' : 's'}. The first photo is the cover, and each one shows for 3 seconds.</p></section>`
		: `<section class="card editor-media"><video src="${Media(Row.file_name)}" poster="${Media(Row.cover_name)}" controls playsinline preload="metadata" class="cover-video"></video>
			<form method="post" action="${Action}" class="cover-form">${Csrf(User)}<input type="hidden" name="action" value="cover">
				<label class="field">Cover<input type="range" name="cover_time" min="0" max="${Math.max(0, Row.duration - 0.1).toFixed(2)}" step="0.1" value="0" data-cover-for=".cover-video"></label>
				<p class="field-help">Drag to pick a frame, then save it as the cover.</p><button class="secondary">Set as cover</button></form></section>`}
		<section class="card editor-details"><form method="post" action="${Action}" class="details-form">${Csrf(User)}
			<label class="field">Caption<textarea name="description" maxlength="2200" rows="5" data-count>${Escape(Row.description)}</textarea><span class="count">${Row.description.length} / 2200</span></label>
			${Select('visibility', 'Who can watch', Visibility(User.private_account, Row.visibility), Row.visibility)}
			${Select('comments', 'Who can comment', Comments, Row.comment_permission)}
			${Select('category', 'Explore category', CategoryOptions, Row.category >= 0 ? String(Row.category) : '')}
			${IsDraft ? Schedule : `<label class="check"><input type="checkbox" name="pinned" value="1"${Row.pinned_at ? ' checked' : ''}> Pin to the top of your profile</label>`}
			<p class="field-help">Your account’s privacy and comment settings also apply.</p>
			<div class="form-actions">${IsDraft ? '<button name="action" value="publish" class="secondary">Post now</button>' : ''}<button name="action" value="save">Save</button></div></form>
			<form method="post" action="${Action}" class="danger-zone" data-confirm="${IsDraft ? 'Delete this draft? This can’t be undone.' : 'Delete this post? Its views, likes and comments go with it. This can’t be undone.'}">${Csrf(User)}<button name="action" value="delete" class="danger">${IsDraft ? 'Delete draft' : 'Delete post'}</button></form>
		</section></div>`;
}

async function Pinnable(Pool, User, Row, Pin) {
	return !Pin || Row.pinned_at || (await Pool.query('SELECT count(*)::int AS pinned FROM videos WHERE author_id = $1 AND pinned_at IS NOT NULL', [User.id])).rows[0].pinned < 3;
}

async function ReplaceCover(Pool, Config, Table, Row, Seconds, User) {
	const Name = await CoverFromFrame(Config, Row.file_name, Math.min(Number(Seconds) || 0, Math.max(0, Row.duration - 0.1)));
	const Old = (await Pool.query(`UPDATE ${Table} t SET cover_name = $3 FROM (SELECT cover_name FROM ${Table} WHERE id = $1 AND author_id = $2) old WHERE t.id = $1 AND t.author_id = $2 RETURNING old.cover_name`, [Row.id, User.id, Name])).rows[0];
	if (!Old) { await RemoveMedia(Config, Name); throw new HttpError(404, 'VideoNotFound'); }
	await RemoveMedia(Config, Old.cover_name).catch(() => {});
}

async function Handle(Context, Path) {
	const { Request, Response, Url, Pool, Config, User } = Context;
	const Here = Url.pathname;
	if (Request.method === 'POST' && !/^(?:content\/\d+|drafts\/\d+|comments|coins|privacy|requests)$/.test(Path)) throw new HttpError(405, 'MethodNotAllowed');
	const Totals_ = await Totals(Pool, User.id);
	let Title, Content, Section;

	if (Path === 'home') {
		Section = 'home'; Title = 'Home';
		const [Data, Recent, Followers, Pending] = await Promise.all([Series(Pool, User.id, 7), Posts(Pool, User.id, { limit: 3 }), NewFollowers(Pool, User.id, 5), Drafts(Pool, User.id)]);
		const M = Data.metrics, Net = { total: M.followers.total - M.unfollows.total, previous: M.followers.previous - M.unfollows.previous };
		Content = `<header class="page-head"><div class="hello"><img src="${AvatarUrl(User, Config.Origin)}" alt=""><div><h1>Welcome back, ${Escape(User.display_name)}</h1><p>@${Escape(User.username)} · ${Number_(Totals_.followers)} followers · ${Number_(Totals_.likes)} likes</p></div></div><a class="button" href="/tiktokstudio/upload">${Icon('plus')} Upload</a></header>
		<section class="card"><div class="card-head"><h2>Key metrics</h2><span class="muted">Last 7 days</span><a href="/tiktokstudio/analytics">View all</a></div>
			<div class="tiles">${Tile('views', M.views, '/tiktokstudio/analytics?range=7&metric=views', true)}${Tile('profile_views', M.profile_views, '/tiktokstudio/analytics?range=7&metric=profile_views')}${Tile('likes', M.likes, '/tiktokstudio/analytics?range=7&metric=likes')}${Tile('comments', M.comments, '/tiktokstudio/analytics?range=7&metric=comments')}
			<a class="tile" href="/tiktokstudio/analytics?tab=followers&range=7"><span class="tile-label">Net followers</span><strong>${Net.total > 0 ? '+' : ''}${Number_(Net.total)}</strong>${Change(Net.total, Net.previous)}</a></div>
			${Chart(Data.days, M.views.series, 'Post views')}${Tracked(Totals_.tracked_since)}</section>
		<div class="columns"><section class="card"><div class="card-head"><h2>Recent posts</h2><a href="/tiktokstudio/content">Manage posts</a></div>
			${Recent.length ? `<ul class="recent">${Recent.map(Row => `<li><a href="/tiktokstudio/analytics/${Row.id}"><img src="${Media(Row.cover_name)}" alt="" loading="lazy"><span><span class="caption">${Caption(Row.description)}</span><small>${When(Row.created_at, 'date')}</small><span class="stats"><span>${Number_(Row.views)} views</span><span>${Number_(Row.likes)} likes</span><span>${Number_(Row.comments)} comments</span></span></span></a></li>`).join('')}</ul>` : '<div class="empty"><h3>No posts yet</h3><p>Upload your first video and its numbers show up here.</p><a class="button" href="/tiktokstudio/upload">Upload</a></div>'}</section>
		<div class="stack">${Pending.length ? `<section class="card"><div class="card-head"><h2>Drafts and scheduled</h2><a href="/tiktokstudio/content?tab=drafts">See all</a></div>${Pending.slice(0, 3).map(DraftCard).join('')}</section>` : ''}
			<section class="card"><div class="card-head"><h2>New followers</h2><a href="/tiktokstudio/analytics?tab=followers">Followers</a></div>${Followers.length ? `<ul class="people">${Followers.map(Row => `<li><a href="/@${Row.username}"><img src="${AvatarUrl(Row, Config.Origin)}" alt=""><span><strong>${Escape(Row.display_name)}</strong><small>@${Row.username} · ${When(Row.created_at, 'date')}</small></span></a>${Row.following_back ? '<span class="pill">Friends</span>' : ''}</li>`).join('')}</ul>` : '<p class="muted">New followers show up here.</p>'}</section></div></div>`;
	}

	else if (Path === 'analytics') {
		Section = 'analytics'; Title = 'Analytics';
		const Days = Range(Url.searchParams.get('range')), Tab = ['overview', 'content', 'followers'].includes(Url.searchParams.get('tab')) ? Url.searchParams.get('tab') : 'overview';
		const Link = (Changes = {}) => `/tiktokstudio/analytics?${new URLSearchParams({ tab: Tab, range: Days, ...Changes })}`;
		const Tabs = `<nav class="tabs" aria-label="Analytics">${[['overview', 'Overview'], ['content', 'Content'], ['followers', 'Followers']].map(([Key, Label]) => `<a href="${Link({ tab: Key })}"${Key === Tab ? ' aria-current="page"' : ''}>${Label}</a>`).join('')}</nav>`;
		const Data = await Series(Pool, User.id, Days), M = Data.metrics;
		let Body;
		if (Tab === 'overview') {
			const Metric = ['views', 'profile_views', 'likes', 'comments', 'saves', 'reposts', 'gifts'].includes(Url.searchParams.get('metric')) ? Url.searchParams.get('metric') : 'views';
			Body = `<section class="card"><div class="tiles">${['views', 'profile_views', 'likes', 'comments', 'saves', 'reposts', 'gifts'].map(Name => Tile(Name, M[Name], Link({ metric: Name }), Name === Metric)).join('')}</div>${Chart(Data.days, M[Metric].series, MetricLabels[Metric])}${Tracked(Totals_.tracked_since)}</section>`;
		} else if (Tab === 'content') {
			const Top = await Posts(Pool, User.id, { sort: 'range', days: Days, limit: 20 });
			Body = `<section class="card"><div class="card-head"><h2>Top posts</h2><span class="muted">By views, ${RangeLabel(Days).toLowerCase()}</span></div>${Top.length ? `<ol class="ranked">${Top.map((Row, Index) => `<li><span class="rank">${Index + 1}</span><a href="/tiktokstudio/analytics/${Row.id}"><img src="${Media(Row.cover_name)}" alt="" loading="lazy"><span><span class="caption">${Caption(Row.description)}</span><small>${When(Row.created_at, 'date')}</small></span></a><span class="num"><strong>${Number_(Row.range_views)}</strong><small>views in range</small></span><span class="num"><strong>${Number_(Row.views)}</strong><small>all-time views</small></span><span class="num"><strong>${Number_(Row.likes)}</strong><small>likes</small></span></li>`).join('')}</ol>` : '<div class="empty"><h3>No posts yet</h3><p>Your best posts are ranked here.</p></div>'}</section>`;
		} else {
			const Net = { total: M.followers.total - M.unfollows.total, previous: M.followers.previous - M.unfollows.previous };
			const Followers = await NewFollowers(Pool, User.id, 12);
			Body = `<section class="card"><div class="tiles"><div class="tile"><span class="tile-label">Followers</span><strong>${Number_(Totals_.followers)}</strong><span class="delta flat">All time</span></div>${Tile('followers', M.followers)}${Tile('unfollows', M.unfollows)}<div class="tile"><span class="tile-label">Net followers</span><strong>${Net.total > 0 ? '+' : ''}${Number_(Net.total)}</strong>${Change(Net.total, Net.previous)}</div></div>${Chart(Data.days, M.followers.series, 'New followers')}</section>
			<section class="card"><div class="card-head"><h2>Newest followers</h2></div>${Followers.length ? `<ul class="people grid">${Followers.map(Row => `<li><a href="/@${Row.username}"><img src="${AvatarUrl(Row, Config.Origin)}" alt=""><span><strong>${Escape(Row.display_name)}</strong><small>@${Row.username} · ${When(Row.created_at, 'date')}</small></span></a>${Row.following_back ? '<span class="pill">Friends</span>' : ''}</li>`).join('')}</ul>` : '<p class="muted">No followers yet.</p>'}</section>`;
		}
		Content = `<header class="page-head"><h1>Analytics</h1></header><div class="filters">${Tabs}${RangePicker(Days, Value => Link({ range: Value }))}</div>${Body}`;
	}

	else if (Path.startsWith('analytics/')) {
		Section = 'analytics'; Title = 'Post analytics';
		const Row = await Post(Pool, User.id, Path.slice(10));
		const Age = Math.ceil((Date.now() - new Date(Row.created_at).getTime()) / 86400000);
		const Days = Url.searchParams.has('range') ? Range(Url.searchParams.get('range')) : Ranges.find(Value => Value >= Age) ?? 365;
		const Metric = ['views', 'likes', 'comments', 'saves', 'reposts', 'gifts'].includes(Url.searchParams.get('metric')) ? Url.searchParams.get('metric') : 'views';
		const Link = (Changes = {}) => `/tiktokstudio/analytics/${Row.id}?${new URLSearchParams({ range: Days, metric: Metric, ...Changes })}`;
		const Data = await Series(Pool, User.id, Days, Row.id);
		const Engagement = Row.views ? ((Row.likes + Row.comments + Row.saves + Row.reposts) / Row.views * 100).toFixed(1) : '0.0';
		Content = `<p class="crumbs"><a href="/tiktokstudio/analytics?tab=content">${Icon('back')} Analytics</a></p>
		<header class="page-head post-head"><img src="${Media(Row.cover_name)}" alt=""><div><h1 class="caption">${Caption(Row.description)}</h1><p>Posted ${When(Row.created_at)} · ${Escape(VisibilityLabel(User.private_account, Row.visibility))} · ${Clock(Row.duration)}</p><p class="links"><a href="/@${User.username}/video/${Row.id}">View post</a><a href="/tiktokstudio/content/${Row.id}">Edit</a></p></div></header>
		<section class="card"><div class="card-head"><h2>All time</h2></div><div class="tiles">${[['Views', Row.views], ['Likes', Row.likes], ['Comments', Row.comments], ['Saves', Row.saves], ['Reposts', Row.reposts], ['Gift coins', Row.gift_coins]].map(([Label, Value]) => `<div class="tile"><span class="tile-label">${Label}</span><strong>${Number_(Value)}</strong></div>`).join('')}<div class="tile"><span class="tile-label">Engagement rate</span><strong>${Engagement}%</strong><span class="delta flat">Likes, comments, saves and reposts per view</span></div></div></section>
		<section class="card"><div class="card-head"><h2>By day</h2>${RangePicker(Days, Value => Link({ range: Value }))}</div><div class="tiles compact">${['views', 'likes', 'comments', 'saves', 'reposts', 'gifts'].map(Name => Tile(Name, Data.metrics[Name], Link({ metric: Name }), Name === Metric)).join('')}</div>${Chart(Data.days, Data.metrics[Metric].series, MetricLabels[Metric])}${Tracked(Totals_.tracked_since)}</section>`;
	}

	else if (Path === 'content') {
		Section = 'content'; Title = 'Posts';
		const Tab = ['drafts', 'scheduled'].includes(Url.searchParams.get('tab')) ? Url.searchParams.get('tab') : 'posts';
		const Tabs = `<nav class="tabs" aria-label="Posts">${[['posts', `Posts <span class="count-badge">${Totals_.posts}</span>`], ['drafts', `Drafts <span class="count-badge">${Totals_.drafts}</span>`], ['scheduled', `Scheduled <span class="count-badge">${Totals_.scheduled}</span>`]].map(([Key, Label]) => `<a href="/tiktokstudio/content${Key === 'posts' ? '' : `?tab=${Key}`}"${Key === Tab ? ' aria-current="page"' : ''}>${Label}</a>`).join('')}</nav>`;
		let Body;
		if (Tab === 'posts') {
			const Query = Url.searchParams.get('q') ?? '', Privacy = Url.searchParams.get('privacy') ?? '', Sort = Url.searchParams.get('sort') ?? 'newest', Page_ = Math.max(1, Number(Url.searchParams.get('page')) || 1);
			const Rows = await Posts(Pool, User.id, { query: Query, visibility: Privacy, sort: Sort, before: (Page_ - 1) * 30, limit: 31 });
			const More = (Changes) => `/tiktokstudio/content?${new URLSearchParams({ q: Query, privacy: Privacy, sort: Sort, ...Changes })}`;
			Body = `<form class="toolbar" method="get" role="search"><label class="search"><span class="sr">Search captions</span><input type="search" name="q" value="${Escape(Query)}" placeholder="Search captions"></label>
				${Select('privacy', '<span class="sr">Privacy</span>', [['', 'All privacy'], ['public', 'Everyone'], ['followers', 'Followers'], ['friends', 'Friends'], ['only_me', 'Only you']], Privacy)}
				${Select('sort', '<span class="sr">Sort</span>', [['newest', 'Newest'], ['oldest', 'Oldest'], ['views', 'Most views'], ['likes', 'Most likes'], ['comments', 'Most comments']], Sort)}<button class="secondary">Apply</button></form>
				<section class="card flush">${Rows.length ? `<table class="posts"><thead><tr><th scope="col">Post</th><th scope="col">Posted</th><th scope="col">Privacy</th><th scope="col" class="num">Views</th><th scope="col" class="num">Likes</th><th scope="col" class="num">Comments</th><th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody>${Rows.slice(0, 30).map(Row => PostRow(Row, User.private_account)).join('')}</tbody></table>`
					: Query || Privacy ? '<div class="empty"><h3>No matching posts</h3><p>Try another search or filter.</p></div>' : '<div class="empty"><h3>No posts yet</h3><p>Your videos will appear here.</p><a class="button" href="/tiktokstudio/upload">Upload</a></div>'}</section>
				<nav class="pager">${Page_ > 1 ? `<a class="button secondary small" href="${More({ page: Page_ - 1 })}">Previous</a>` : ''}${Rows.length > 30 ? `<a class="button secondary small" href="${More({ page: Page_ + 1 })}">Next</a>` : ''}</nav>`;
		} else {
			const Rows = (await Drafts(Pool, User.id)).filter(Row => Tab === 'drafts' ? !Row.publish_at : Row.publish_at);
			Body = `<section class="card">${Rows.length ? Rows.map(DraftCard).join('') : `<div class="empty"><h3>${Tab === 'drafts' ? 'No drafts' : 'Nothing scheduled'}</h3><p>${Tab === 'drafts' ? 'Choose Save draft when uploading to finish a post later.' : 'Choose Schedule when uploading to post at a set time.'}</p><a class="button" href="/tiktokstudio/upload">Upload</a></div>`}</section>`;
		}
		Content = `<header class="page-head"><h1>Posts</h1><a class="button" href="/tiktokstudio/upload">${Icon('plus')} Upload</a></header>${Tabs}${Body}`;
	}

	else if (/^content\/\d+$/.test(Path) || /^drafts\/\d+$/.test(Path)) {
		const IsDraft = Path.startsWith('drafts/'), ItemId = Path.split('/')[1];
		Section = 'content'; Title = IsDraft ? 'Edit draft' : 'Edit post';
		const Back = IsDraft ? '/tiktokstudio/content?tab=drafts' : '/tiktokstudio/content';
		if (Request.method === 'POST') {
			const Body = await ReadBody(Request); RequireCsrf(Request, User, Body.csrf);
			const Row = IsDraft ? await Draft(Pool, User.id, ItemId) : (await Pool.query('SELECT * FROM videos WHERE id = $1 AND author_id = $2', [Id(ItemId), User.id])).rows[0];
			if (!Row) throw new HttpError(404, 'VideoNotFound');
			try {
				if (Body.action === 'delete') { if (IsDraft) await DeleteDraft(Pool, Config, User.id, Row.id); else await DeletePost(Pool, Config, User.id, Row.id); return Redirect(Response, `${Back}${Back.includes('?') ? '&' : '?'}saved=${IsDraft ? 'draft' : 'deleted'}`); }
				if (Body.action === 'cover') { await ReplaceCover(Pool, Config, IsDraft ? 'video_drafts' : 'videos', Row, Body.cover_time, User); return Redirect(Response, `${Here}?saved=cover`); }
				const Description = String(Body.description ?? Row.description);
				if (Description.length > 2200) throw new HttpError(400, 'DescriptionTooLong');
				const Settings = PostSettings(Body.visibility, Body.comments);
				const Chosen = Category(Body.category) ?? GuessCategory(Description);
				if (IsDraft) {
					const PublishAt = Body.action !== 'publish' && Body.when === 'schedule' ? ScheduleTime(Body.publish_at) : null;
					await Pool.query('UPDATE video_drafts SET description = $3, visibility = $4, comment_permission = $5, category = $6, publish_at = $7, updated_at = now() WHERE id = $1 AND author_id = $2', [Row.id, User.id, Description, Settings.visibility, Settings.comment_permission, Chosen, PublishAt]);
					if (Body.action === 'publish') return Redirect(Response, `/tiktokstudio/content/${await PublishDraft(Pool, User.id, Row.id)}?saved=published`);
					return Redirect(Response, PublishAt ? '/tiktokstudio/content?tab=scheduled&saved=scheduled' : `${Here}?saved=1`);
				}
				const Pin = Body.pinned === '1';
				if (!await Pinnable(Pool, User, Row, Pin)) return Redirect(Response, `${Here}?error=pins`);
				await Pool.query('UPDATE videos SET description = $3, visibility = $4, comment_permission = $5, category = $6, pinned_at = CASE WHEN $7 THEN coalesce(pinned_at, now()) END WHERE id = $1 AND author_id = $2', [Row.id, User.id, Description, Settings.visibility, Settings.comment_permission, Chosen, Pin]);
				return Redirect(Response, `${Here}?saved=1`);
			} catch (Failure) {
				if (Failure instanceof HttpError && Errors[Failure.message]) return Redirect(Response, `${Here}?error=${Failure.message}`);
				throw Failure;
			}
		}
		RequireMethod(Request, ['GET']);
		const Row = IsDraft ? await Draft(Pool, User.id, ItemId) : await Post(Pool, User.id, ItemId);
		Content = `<p class="crumbs"><a href="${Back}">${Icon('back')} ${IsDraft ? 'Drafts' : 'Posts'}</a></p><header class="page-head"><h1>${Title}</h1>${IsDraft ? '' : `<p class="links"><a href="/@${User.username}/video/${Row.id}">View post</a><a href="/tiktokstudio/analytics/${Row.id}">Analytics</a></p>`}</header>${Notice(Url)}${Editor(User, Row, { Draft: IsDraft })}`;
	}

	else if (Path === 'comments') {
		Section = 'comments'; Title = 'Comments';
		const Filter = ['unreplied', 'followers'].includes(Url.searchParams.get('filter')) ? Url.searchParams.get('filter') : 'all';
		const Query = Url.searchParams.get('q') ?? '', Video = /^\d+$/.test(Url.searchParams.get('post') ?? '') ? Url.searchParams.get('post') : '', Before = /^\d+$/.test(Url.searchParams.get('before') ?? '') ? Url.searchParams.get('before') : null;
		const Back = `/tiktokstudio/comments?${new URLSearchParams({ filter: Filter, q: Query, post: Video })}`;
		if (Request.method === 'POST') {
			const Body = await ReadBody(Request); RequireCsrf(Request, User, Body.csrf);
			const Comment = (await Pool.query('SELECT c.id, c.video_id FROM comments c JOIN videos v ON v.id = c.video_id WHERE c.id = $1 AND v.author_id = $2', [Id(Body.comment), User.id])).rows[0];
			const Return = String(Body.return ?? '').startsWith('/tiktokstudio/comments') ? String(Body.return) : Back;
			try {
				if (!Comment) throw new HttpError(404, 'CommentNotFound');
				if (Body.action === 'reply') await AddComment(Pool, Comment.video_id, User.id, String(Body.text ?? ''), Comment.id);
				else if (Body.action === 'like' || Body.action === 'unlike') await SetRelation(Pool, 'comment_likes', ['user_id', 'comment_id'], [User.id, Comment.id], Body.action === 'like');
				else if (Body.action === 'delete') await Pool.query('DELETE FROM comments WHERE id = $1', [Comment.id]);
				else throw new HttpError(400, 'InvalidAction');
			} catch (Failure) {
				if (Failure instanceof HttpError && Errors[Failure.message]) return Redirect(Response, `${Return}${Return.includes('?') ? '&' : '?'}error=${Failure.message}`);
				throw Failure;
			}
			return Redirect(Response, `${Return}${Body.action === 'delete' ? '' : `#c${Comment.id}`}`);
		}
		RequireMethod(Request, ['GET']);
		const [Rows, Choices] = await Promise.all([StudioComments(Pool, User.id, { filter: Filter, query: Query, video: Video || null, before: Before, limit: 31 }), Posts(Pool, User.id, { limit: 100 })]);
		const Self = Before ? `${Back}&before=${Before}` : Back;
		const Item = Row => `<article class="comment" id="c${Row.id}"><a href="/@${Row.username}"><img class="avatar" src="${AvatarUrl(Row, Config.Origin)}" alt=""></a>
			<div class="comment-body"><p class="who"><a href="/@${Row.username}"><strong>${Escape(Row.display_name)}</strong></a> <span class="muted">@${Row.username}</span>${Row.follower ? ' <span class="pill">Follower</span>' : ''} <span class="muted">· ${When(Row.created_at)}</span></p>
				${Row.parent_body ? `<p class="replying muted">Replying to: ${Escape(Row.parent_body.slice(0, 120))}</p>` : ''}<p class="text">${Escape(Row.body)}</p>
				${(Row.my_replies ?? []).map(Reply => `<p class="my-reply"><span class="pill">You</span> ${Escape(Reply.body)}</p>`).join('')}
				<div class="comment-actions">
					<details class="reply"><summary>Reply</summary><form method="post" action="/tiktokstudio/comments">${Csrf(User)}<input type="hidden" name="comment" value="${Row.id}"><input type="hidden" name="return" value="${Escape(Self)}"><label class="sr" for="r${Row.id}">Reply to ${Escape(Row.display_name)}</label><textarea id="r${Row.id}" name="text" rows="2" maxlength="1500" required placeholder="Add a reply…">@${Row.username} </textarea><button name="action" value="reply">Reply</button></form></details>
					<form method="post" action="/tiktokstudio/comments">${Csrf(User)}<input type="hidden" name="comment" value="${Row.id}"><input type="hidden" name="return" value="${Escape(Self)}"><button class="link${Row.liked ? ' liked' : ''}" name="action" value="${Row.liked ? 'unlike' : 'like'}" aria-pressed="${Row.liked}"><span aria-hidden="true">${Row.liked ? '♥' : '♡'}</span> ${Row.likes ? Number_(Row.likes) : ''}<span class="sr">${Row.liked ? 'Unlike' : 'Like'}</span></button></form>
					<form method="post" action="/tiktokstudio/comments" data-confirm="Delete this comment?">${Csrf(User)}<input type="hidden" name="comment" value="${Row.id}"><input type="hidden" name="return" value="${Escape(Self)}"><button class="link danger-text" name="action" value="delete">Delete</button></form>
				</div></div>
			<a class="comment-post" href="/@${User.username}/video/${Row.video_id}" title="${Escape(Row.video_description || 'Post')}"><img src="${Media(Row.cover_name)}" alt="On: ${Escape((Row.video_description || 'your post').slice(0, 60))}" loading="lazy"></a></article>`;
		Content = `<header class="page-head"><h1>Comments</h1></header>${Notice(Url)}
			<form class="toolbar" method="get" role="search"><div class="segmented" role="group" aria-label="Show">${[['all', 'All'], ['unreplied', 'Not replied'], ['followers', 'From followers']].map(([Key, Label]) => `<button name="filter" value="${Key}"${Key === Filter ? ' aria-current="true"' : ''}>${Label}</button>`).join('')}</div>
				<label class="search"><span class="sr">Search comments</span><input type="search" name="q" value="${Escape(Query)}" placeholder="Search comments"></label>
				${Select('post', '<span class="sr">Post</span>', [['', 'All posts'], ...Choices.map(Row => [String(Row.id), (Row.description || 'No caption').slice(0, 50)])], Video, ' data-autosubmit')}</form>
			<section class="card">${Rows.length ? Rows.slice(0, 30).map(Item).join('') : `<div class="empty"><h3>${Filter === 'unreplied' ? 'You’re all caught up' : 'No comments yet'}</h3><p>${Query ? 'Try another search.' : 'Comments people leave on your posts show up here.'}</p></div>`}</section>
			${Rows.length > 30 ? `<nav class="pager"><a class="button secondary small" href="${Back}&before=${Rows[29].id}">Older comments</a></nav>` : ''}`;
	}

	else if (Path === 'upload') {
		Section = 'upload'; Title = 'Upload';
		if (Config.Features?.upload === false) throw new HttpError(403, 'UploadsDisabled');
		Content = `<header class="page-head"><h1>Upload</h1><a href="/tiktokstudio/content?tab=drafts">Drafts (${Totals_.drafts})</a></header>
		<form id="upload" class="editor upload">
			<section class="card editor-media"><div class="segmented kind" role="radiogroup" aria-label="What to post"><label><input type="radio" name="kind" value="video" checked> Video</label><label><input type="radio" name="kind" value="photos"> Photos</label></div>
				<div id="photo-mode" hidden><label id="photo-drop" class="drop" tabindex="0"><span class="upload-symbol" aria-hidden="true">${Icon('plus')}</span><strong>Select photos</strong><span>Or drag and drop them here</span><span class="file-help">JPG, PNG or WebP · up to 35 photos · 20 MB each</span><input name="photos" type="file" accept="image/png,image/jpeg,image/webp" multiple><span class="button">Select photos</span></label>
					<ol id="photo-list" class="photo-grid" aria-label="Photos, in posting order"></ol><p id="photo-help" class="field-help" hidden>The first photo is the cover. Drag photos, or use the arrows, to change the order. Each one shows for 3 seconds.</p></div>
				<div id="video-mode"><label id="drop-zone" tabindex="0"><span class="upload-symbol" aria-hidden="true">${Icon('plus')}</span><strong>Select video to upload</strong><span>Or drag and drop it here</span><span class="file-help">MP4, MOV or WebM · up to ${Math.round(Config.MaxVideoBytes / 1024 / 1024)} MB · up to ${Clock(Config.MaxVideoSeconds)} long</span><input required name="video" type="file" accept="video/*"><span class="button">Select video</span></label>
				<video id="video-preview" class="cover-video" controls playsinline hidden></video><p id="file-name" class="muted"></p>
				<div id="cover-picker" hidden><label class="field">Cover<input type="range" name="cover_time" min="0" max="0" step="0.1" value="0" data-cover-for="#video-preview"></label><p class="field-help">Drag to pick the frame shown before people tap play.</p></div>
				<button id="change-video" class="secondary" type="button" hidden>Change video</button></div></section>
			<section class="card editor-details"><label class="field">Caption<textarea name="description" maxlength="2200" rows="5" placeholder="Describe your video. Add #hashtags and @mentions." data-count></textarea><span class="count">0 / 2200</span></label>
				<div class="field sound-field"><span>Sound</span>
					<div id="sound-chosen" class="sound-row" hidden><img alt=""><span><strong></strong><small></small></span><button type="button" id="sound-remove" class="secondary small">Remove</button></div>
					<button type="button" id="sound-pick" class="secondary">${Icon('sound')} Add sound</button>
					<div id="sound-levels" class="sound-levels" hidden><label>Added sound<input type="range" name="sound_volume" min="0" max="200" value="100" aria-valuetext="100%"></label><label data-video-only>Original sound<input type="range" name="original_volume" min="0" max="200" value="0" aria-valuetext="0%"></label></div></div>
				${Select('visibility', 'Who can watch', Visibility(User.private_account), 'public')}${Select('comments', 'Who can comment', Comments, 'default')}${Select('category', 'Explore category', CategoryOptions, '')}
				<fieldset class="field when"><legend>When to post</legend><label class="radio"><input type="radio" name="when" value="now" checked> Now</label><label class="radio"><input type="radio" name="when" value="schedule"> Schedule</label><label class="radio"><input type="radio" name="when" value="story"> Story (24 hours)</label>
					<input type="datetime-local" name="publish_local" aria-label="Date and time to post" hidden><small data-for="schedule" hidden>15 minutes to 30 days from now, in your time zone.</small><small data-for="story" hidden>Shows in the stories tray for 24 hours instead of on your profile.</small></fieldset>
				<p class="field-help">Your account’s privacy and comment settings also apply.</p>
				<div class="form-actions"><button type="reset" class="secondary">Discard</button><button type="button" id="save-draft" class="secondary">Save draft</button><button type="submit" id="post-button">Post</button></div>
				<progress id="upload-progress" max="100" value="0" hidden></progress><p id="status" role="status" aria-live="polite"></p><a id="posted-link" class="button secondary small" hidden>View</a></section></form>
		<dialog id="sound-dialog" class="sound-dialog" aria-labelledby="sound-title"><div class="sound-head"><h2 id="sound-title">Add sound</h2><button type="button" class="sound-close" aria-label="Close">×</button></div>
			<label class="search"><span class="sr">Search sounds</span><input type="search" id="sound-search" placeholder="Search by creator"></label><ul id="sound-results" class="sound-results" aria-live="polite"></ul><audio id="sound-preview" preload="none"></audio></dialog>
		<script id="upload-config" type="application/json">${JSON.stringify({ csrf: User.csrf_token, maxBytes: Config.MaxVideoBytes, maxSeconds: Config.MaxVideoSeconds, username: User.username, sound: /^\d{1,19}$/.test(Url.searchParams.get('sound') ?? '') ? Url.searchParams.get('sound') : null }).replaceAll('<', '\\u003c')}</script>`;
	}

	else if (Path === 'live') {
		Section = 'live'; Title = 'LIVE';
		const Past = (await Pool.query(`SELECT id, title, started_at, ended_at, peak_viewers, viewers, likes, extract(epoch FROM ended_at - started_at)::int AS seconds,
			(SELECT coalesce(sum(coins), 0)::int FROM gifts g WHERE g.live_id = l.id) AS gift_coins FROM lives l WHERE host_id = $1 AND ended_at IS NOT NULL ORDER BY id DESC LIMIT 10`, [User.id])).rows;
		Content = `<header class="page-head"><div><h1>LIVE</h1><p class="muted">Go LIVE from your camera or share your screen. Nothing is recorded.</p></div><a href="/live">Watch LIVE</a></header>
		<div class="editor go-live" id="go-live">
			<section class="card editor-media"><div class="live-preview"><video id="live-preview" playsinline autoplay muted></video><span class="live-badge" id="live-badge" hidden>LIVE</span><span class="live-clock" id="live-clock" hidden>0:00</span>
				<p class="live-off" id="live-off">Your camera preview shows here</p></div>
				<div class="segmented kind" role="radiogroup" aria-label="Source"><label><input type="radio" name="source" value="camera" checked> Camera</label><label><input type="radio" name="source" value="screen"> Screen</label></div>
				<label class="check"><input type="checkbox" id="live-mic" checked> Microphone</label><button type="button" class="secondary" id="live-flip" hidden>Switch camera</button></section>
			<section class="card editor-details"><div id="live-setup"><label class="field">Title<input id="live-title" maxlength="100" placeholder="What’s your LIVE about?"></label>
					<p class="field-help">Everyone who can see your posts can watch${User.private_account ? ' (your account is private, so only approved followers)' : ''}. Viewers can comment, like and send gifts.</p>
					<div class="form-actions"><button type="button" id="live-start">${Icon('live')} Go LIVE</button></div></div>
				<div id="live-on" hidden><div class="tiles compact"><div class="tile"><span class="tile-label">Viewers</span><strong id="live-viewers">0</strong></div><div class="tile"><span class="tile-label">Likes</span><strong id="live-likes">0</strong></div><div class="tile"><span class="tile-label">Gift coins</span><strong id="live-gifts">0</strong></div></div>
					<div class="live-chat" id="live-chat" role="log" aria-label="LIVE chat"></div><form class="live-say" id="live-say"><input id="live-say-text" maxlength="150" placeholder="Say something to viewers" aria-label="Comment"><button>Send</button></form>
					<div class="form-actions"><a class="button secondary" id="live-watch" target="_blank" rel="noopener">Open viewer page</a><button type="button" class="danger" id="live-end">End LIVE</button></div></div>
				<div id="live-done" hidden></div><p id="live-status" class="field-help" role="status"></p></section></div>
		${Past.length ? `<section class="card"><div class="card-head"><h2>Past LIVEs</h2></div><table class="posts"><thead><tr><th scope="col">LIVE</th><th scope="col">Length</th><th scope="col" class="num">Viewers</th><th scope="col" class="num">Peak</th><th scope="col" class="num">Likes</th><th scope="col" class="num">Gift coins</th></tr></thead><tbody>${Past.map(Row => `<tr><td>${Escape(Row.title || 'LIVE')}<br><small class="muted">${When(Row.started_at)}</small></td><td data-label="Length">${Clock(Row.seconds)}</td><td data-label="Viewers" class="num">${Number_(Row.viewers)}</td><td data-label="Peak" class="num">${Number_(Row.peak_viewers)}</td><td data-label="Likes" class="num">${Number_(Row.likes)}</td><td data-label="Gift coins" class="num">${Number_(Row.gift_coins)}</td></tr>`).join('')}</tbody></table></section>` : ''}
		<script id="live-config" type="application/json">${JSON.stringify({ csrf: User.csrf_token, username: User.username }).replaceAll('<', '\\u003c')}</script><script src="${Public('live-host.js')}" defer></script>`;
	}

	else if (Path === 'coins') {
		Section = 'coins'; Title = 'Coins & gifts';
		if (Request.method === 'POST') {
			const Body = await ReadBody(Request); RequireCsrf(Request, User, Body.csrf);
			const Claimed = await Claim(Pool, User.id).catch(Failure => { if (Failure.message === 'AlreadyClaimed') return null; throw Failure; });
			return Redirect(Response, Claimed ? `${Here}?claimed=${Claimed.added}` : Here);
		}
		const [Wallet_, Gifts] = await Promise.all([Wallet(Pool, User.id), GiftSummary(Pool, User.id)]);
		const GiftOf = Key => GiftCatalog.find(Item => Item.key === Key) ?? { emoji: '🎁', name: 'Gift' };
		const Reasons = { welcome: 'Welcome bonus', daily: 'Daily coins', gift: 'Gift sent' };
		const Claimed = Number(Url.searchParams.get('claimed')) || 0;
		Content = `<header class="page-head"><div><h1>Coins & gifts</h1><p class="muted">Coins are free. You can’t buy them or cash them out.</p></div></header>
		${Claimed ? `<p class="notice" role="status">You got ${Number_(Claimed)} coins.</p>` : ''}
		<div class="columns"><section class="card wallet"><div class="card-head"><h2>Your coins</h2></div>
			<p class="balance"><span class="coin" aria-hidden="true"></span><strong>${Number_(Wallet_.balance)}</strong><span class="sr"> coins</span></p>
			${Wallet_.claimable ? `<form method="post">${Csrf(User)}<button>${Icon('plus')} Claim ${Number_(Wallet_.claim)} coins</button></form><p class="field-help">${Wallet_.claim > Wallet_.daily ? `Includes your ${Number_(Wallet_.welcome)}-coin welcome bonus. ` : ''}You can claim ${Wallet_.daily} free coins every day.</p>`
				: `<p class="muted">You’ve claimed today’s coins. Come back ${When(Wallet_.nextClaimAt)} for ${Wallet_.daily} more.</p>`}
			<h3>Recent activity</h3>${Gifts.history.length ? `<ul class="ledger">${Gifts.history.map(Row => `<li><span>${Reasons[Row.reason]}</span><small>${When(Row.created_at)}</small><strong class="${Row.amount > 0 ? 'up' : ''}">${Row.amount > 0 ? '+' : '−'}${Number_(Math.abs(Row.amount))}</strong></li>`).join('')}</ul>` : '<p class="muted">Nothing yet.</p>'}</section>
		<div class="stack"><section class="card"><div class="card-head"><h2>Gifts you received</h2></div>
			<div class="tiles"><div class="tile"><span class="tile-label">Last 28 days</span><strong>${Number_(Gifts.totals.recent_coins)}</strong><span class="delta flat">coins from ${Number_(Gifts.totals.recent_gifts)} gift${Gifts.totals.recent_gifts === 1 ? '' : 's'}</span></div><div class="tile"><span class="tile-label">All time</span><strong>${Number_(Gifts.totals.coins)}</strong><span class="delta flat">coins from ${Number_(Gifts.totals.gifts)} gift${Gifts.totals.gifts === 1 ? '' : 's'}</span></div></div>
			${Gifts.top.length ? `<h3>Top gifters</h3><ul class="people">${Gifts.top.map(Row => `<li><a href="/@${Row.username}"><img src="${AvatarUrl(Row, Config.Origin)}" alt=""><span><strong>${Escape(Row.display_name)}</strong><small>@${Row.username} · ${Row.gifts} gift${Row.gifts === 1 ? '' : 's'}</small></span></a><span class="pill">${Number_(Row.coins)} coins</span></li>`).join('')}</ul>` : '<p class="muted">Gifts people send on your posts show up here.</p>'}
			${Gifts.recent.length ? `<h3>Latest</h3><ul class="gift-feed">${Gifts.recent.map(Row => `<li><span class="gift-emoji" aria-hidden="true">${GiftOf(Row.gift).emoji}</span><span><strong>${Row.username ? `<a href="/@${Row.username}">${Escape(Row.display_name)}</a>` : 'Someone'}</strong> sent a ${GiftOf(Row.gift).name}<small>${When(Row.created_at)} · ${Number_(Row.coins)} coin${Row.coins === 1 ? '' : 's'}</small></span>${Row.cover_name ? `<a href="/@${User.username}/video/${Row.video_id}"><img src="${Media(Row.cover_name)}" alt="On your post" loading="lazy"></a>` : ''}</li>`).join('')}</ul>` : ''}</section>
			<section class="card"><div class="card-head"><h2>Gifts</h2><span class="muted">Send them from the gift button on any post</span></div><ul class="gift-catalog">${GiftCatalog.map(Item => `<li><span class="gift-emoji" aria-hidden="true">${Item.emoji}</span><strong>${Item.name}</strong><small>${Number_(Item.coins)} coin${Item.coins === 1 ? '' : 's'}</small></li>`).join('')}</ul>
			${Gifts.sent.length ? `<h3>Gifts you sent</h3><ul class="gift-feed">${Gifts.sent.map(Row => `<li><span class="gift-emoji" aria-hidden="true">${GiftOf(Row.gift).emoji}</span><span>${GiftOf(Row.gift).name} to <a href="/@${Row.username}">${Escape(Row.display_name)}</a><small>${When(Row.created_at)}</small></span></li>`).join('')}</ul>` : ''}</section></div></div>`;
	}

	else if (Path === 'privacy') {
		Section = 'privacy'; Title = 'Privacy';
		if (Request.method === 'POST') {
			const Body = await ReadBody(Request); RequireCsrf(Request, User, Body.csrf);
			if (!['0', '1'].includes(Body.private_account) || !['everyone', 'followers', 'friends', 'none'].includes(Body.comments)) throw new HttpError(400, 'InvalidAccountPrivacy');
			await SetPrivateAccount(Pool, User.id, Body.private_account);
			await Pool.query('UPDATE users SET comment_permission = $2 WHERE id = $1', [User.id, Body.comments]);
			return Redirect(Response, `${Here}?saved=1`);
		}
		RequireMethod(Request, ['GET']);
		Content = `<header class="page-head"><h1>Privacy</h1></header>${Notice(Url)}<section class="card narrow"><form method="post">${Csrf(User)}${Select('private_account', 'Account visibility', [['0', 'Public account'], ['1', 'Private account']], User.private_account ? '1' : '0')}<p class="field-help">With a private account, only approved followers can view your posts. Your name, photo and bio stay public. Existing followers remain approved. Switching to public accepts pending follow requests.</p>${Select('comments', 'Who can comment on your posts', Comments.filter(([Value]) => Value !== 'default'), User.comment_permission)}<div class="form-actions"><button>Save</button></div></form>
			<p class="links"><a href="/account/requests">Follow requests</a><a href="/setting/privacy/direct-messages">Direct messages</a><a href="/tiktokstudio/content">Post privacy</a></p></section>`;
	}

	else if (Path === 'requests') {
		Section = 'requests'; Title = 'Follow requests';
		if (Request.method === 'POST') {
			const Body = await ReadBody(Request); RequireCsrf(Request, User, Body.csrf);
			if (!['accept', 'delete'].includes(Body.action)) throw new HttpError(400, 'InvalidFollowAction');
			await DecideFollowRequest(Pool, User.id, Id(Body.user), Body.action === 'accept');
			return Redirect(Response, Here);
		}
		RequireMethod(Request, ['GET']);
		const Rows = await FollowRequests(Pool, User.id);
		Content = `<header class="page-head"><div><h1>Follow requests</h1><p class="muted">People asking to follow your private account</p></div></header><section class="card">${Rows.map(Row => `<article class="follow-request"><img src="${AvatarUrl(Row, Config.Origin)}" alt=""><a href="/@${Row.username}"><strong>${Escape(Row.display_name)}</strong><span>@${Row.username}</span></a><form method="post">${Csrf(User)}<input type="hidden" name="user" value="${Row.id}"><button name="action" value="accept">Confirm</button><button name="action" value="delete" class="secondary">Delete</button></form></article>`).join('') || '<div class="empty"><h3>No follow requests</h3><p>New requests will appear here.</p></div>'}</section>`;
	}

	else throw new HttpError(404, 'NotFound');

	const Nav = [['home', '/tiktokstudio', 'Home'], ['content', '/tiktokstudio/content', 'Posts'], ['analytics', '/tiktokstudio/analytics', 'Analytics'], ['comments', '/tiktokstudio/comments', 'Comments'], ['live', '/tiktokstudio/live', 'LIVE'], ['coins', '/coin', 'Coins & gifts']];
	const Settings = [['privacy', '/account/privacy', 'Privacy'], ['requests', '/account/requests', 'Follow requests']];
	const Link = ([Key, Href, Label]) => `<a href="${Href}"${Key === Section ? ' aria-current="page"' : ''}>${Icon(Key)}<span>${Label}</span></a>`;
	Response.setHeader('content-type', 'text/html; charset=utf-8');
	Response.setHeader('cache-control', 'no-store');
	Response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${Escape(Title)} · ${Escape(Config.Name)} Studio</title><link rel="icon" href="/brand/favicon"><link rel="stylesheet" href="${Public('studio.css')}">
	<body class="studio-app"><a class="skip" href="#main">Skip to content</a><aside class="side"><a class="logo" href="/tiktokstudio"><img src="/brand/icon" alt=""><span>${Escape(Config.Name)} <b>Studio</b></span></a>
	<a class="button upload-button" href="/tiktokstudio/upload"${Section === 'upload' ? ' aria-current="page"' : ''}>${Icon('plus')}<span>Upload</span></a>
	<nav class="side-nav" aria-label="Studio">${Nav.map(Link).join('')}<hr>${Settings.map(Link).join('')}<a href="/">${Icon('back')}<span>Back to ${Escape(Config.Name)}</span></a></nav></aside>
	<main id="main" class="main">${Section === 'content' && !Path.includes('/') || Section === 'home' ? Notice(Url) : ''}${Content}</main><script src="${Public('studio.js')}" defer></script></body></html>`);
	return true;
}

const Routes = [
	[/^\/tiktokstudio\/?$/, 'home'], [/^\/(?:tiktokstudio\/)?upload\/?$/, 'upload'], [/^\/tiktokstudio\/content\/?$/, 'content'], [/^\/tiktokstudio\/analytics\/?$/, 'analytics'],
	[/^\/tiktokstudio\/comments\/?$/, 'comments'], [/^\/(?:coin|tiktokstudio\/coins)\/?$/, 'coins'], [/^\/tiktokstudio\/live\/?$/, 'live'], [/^\/account\/privacy$/, 'privacy'], [/^\/account\/requests$/, 'requests'],
	[/^\/(?:tiktokstudio\/content|account\/posts)\/(\d+)$/, Match => `content/${Match[1]}`], [/^\/tiktokstudio\/drafts\/(\d+)$/, Match => `drafts/${Match[1]}`], [/^\/tiktokstudio\/analytics\/(\d+)$/, Match => `analytics/${Match[1]}`],
];

export async function Studio(Context) {
	const { Response, Url, User, Request } = Context;
	if (Url.pathname === '/account/posts' || Url.pathname === '/studio') {
		if (!User) return Redirect(Response, '/login');
		return Redirect(Response, Url.pathname === '/studio' ? '/tiktokstudio' : '/tiktokstudio/content');
	}
	for (const [Pattern, Name] of Routes) {
		const Match = Pattern.exec(Url.pathname);
		if (!Match) continue;
		if (!User) return Redirect(Response, `/login?redirect_url=${encodeURIComponent(Url.pathname)}`);
		if (Request.method !== 'GET' && Request.method !== 'HEAD' && Request.method !== 'POST') throw new HttpError(405, 'MethodNotAllowed');
		return Handle(Context, typeof Name === 'function' ? Name(Match) : Name);
	}
	return false;
}
