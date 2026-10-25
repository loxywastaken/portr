// The LIVE hub refreshes itself so new LIVEs show up without reloading.
(() => {
	const Grid = document.getElementById('live-grid');
	const Esc = Value => String(Value).replace(/[&<>"']/g, Char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[Char]);
	setInterval(async () => {
		const Data = await fetch('/api/v1/live', { cache: 'no-store' }).then(Response => Response.json()).catch(() => null);
		if (!Data) return;
		if (!Data.lives.length) { if (Grid.children.length) location.reload(); return; }
		if (!Grid.children.length) { location.reload(); return; }
		Grid.innerHTML = Data.lives.map(Item => `<li><a href="/@${Esc(Item.host.username)}/live"><span class="thumb" style="background-image:url('${Item.ready ? `/live/${Item.id}/thumb.jpg?t=${Date.now()}` : Esc(Item.host.avatar)}')"><span class="badge">LIVE</span><span class="count">${Item.viewers} watching</span></span><span class="who"><img src="${Esc(Item.host.avatar)}" alt=""><span><strong>${Esc(Item.host.name)}</strong><small>${Esc(Item.title || `@${Item.host.username}`)}</small></span></span></a></li>`).join('');
	}, 15000);
})();
