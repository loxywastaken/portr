// Profiles of people who are LIVE get a LIVE button next to their name that opens the LIVE room.
(() => {
	let Timer, Checked = '', Live = null;
	async function Run() {
		const Username = /^\/@([a-z0-9_]{3,24})\/?$/i.exec(location.pathname)?.[1]?.toLowerCase();
		const Title = document.querySelector('[data-e2e="user-title"]');
		const Existing = document.querySelector('.ZtokLiveBadge');
		if (!Username || !Title) { Existing?.remove(); return; }
		if (Checked !== Username) {
			Checked = Username; Live = null;
			Live = await fetch(`/api/v1/live/user/${Username}`, { cache: 'no-store' }).then(Response => Response.json()).then(Data => Data.live).catch(() => null);
		}
		if (!Live || Existing?.dataset.user === Username) return;
		Existing?.remove();
		const Link = Object.assign(document.createElement('a'), { className: 'ZtokLiveBadge', href: `/@${Username}/live`, textContent: 'LIVE' });
		Link.dataset.user = Username; Link.setAttribute('aria-label', `Watch ${Username}’s LIVE`);
		Title.before(Link);
	}
	new MutationObserver(() => { clearTimeout(Timer); Timer = setTimeout(Run, 250); }).observe(document.body, { childList: true, subtree: true });
	Run();
})();
