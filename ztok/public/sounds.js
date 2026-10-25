// Sound pages: a "Use sound" button that opens Studio's upload with this sound picked.
(() => {
	let Timer;
	function Run() {
		const MusicId = /^\/music\/[^/]*?-?(\d{1,19})\/?$/.exec(location.pathname)?.[1];
		const Count = document.querySelector('[data-e2e="music-video-count"]');
		const Existing = document.querySelector('.ZtokUseSound');
		if (!MusicId || !Count) { Existing?.remove(); return; }
		if (Existing?.dataset.music === MusicId) return;
		Existing?.remove();
		const Link = Object.assign(document.createElement('a'), { className: 'ZtokUseSound', href: `/tiktokstudio/upload?sound=${MusicId}` });
		Link.dataset.music = MusicId;
		Link.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg><span>Use sound</span>';
		Count.after(Link);
	}
	new MutationObserver(() => { clearTimeout(Timer); Timer = setTimeout(Run, 200); }).observe(document.body, { childList: true, subtree: true });
	Run();
})();
