// Gifts: a Gift button on posts (feed action bar and the post popup) opens a picker; gifts cost free coins.
// "Get Coins" in the top bar opens the Coins & gifts page.
(() => {
	const Instance = JSON.parse(document.getElementById('ztok-instance')?.textContent ?? '{}');
	const Me = Instance.account?.username;
	const GiftIcon = Size => `<svg width="${Size}" height="${Size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="9" width="17" height="11.5" rx="1.5"/><path d="M2.5 9h19v-3h-19zM12 6v14.5M12 6S10.5 2.5 8 3.2C6 3.8 7 6 9 6M12 6s1.5-3.5 4-2.8C18 3.8 17 6 15 6"/></svg>`;
	let Wallet = null, Timer;

	const Load = () => fetch('/api/v1/coins', { cache: 'no-store' }).then(Response => Response.json()).then(Data => (Wallet = Data));
	const Number_ = Value => Number(Value ?? 0).toLocaleString();
	function Toast(Text) {
		document.querySelector('.ZtokGiftToast')?.remove();
		const Toast_ = Object.assign(document.createElement('div'), { className: 'ZtokGiftToast', textContent: Text }); Toast_.setAttribute('role', 'status');
		document.body.append(Toast_); setTimeout(() => Toast_.remove(), 3200);
	}
	function Burst(Emoji) {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const Layer = Object.assign(document.createElement('div'), { className: 'ZtokGiftBurst', textContent: Emoji }); Layer.setAttribute('aria-hidden', 'true');
		document.body.append(Layer); setTimeout(() => Layer.remove(), 1800);
	}

	async function Open(VideoId, Author) {
		if (!Me) { location.href = `/login?redirect_url=${encodeURIComponent(location.pathname)}`; return; }
		document.querySelector('.ZtokGiftDialog')?.remove();
		const Dialog = document.createElement('dialog'); Dialog.className = 'ZtokGiftDialog'; Dialog.setAttribute('aria-labelledby', 'ztok-gift-title');
		Dialog.innerHTML = `<div class="ZtokGiftHead"><h2 id="ztok-gift-title">Send a gift</h2><button type="button" class="ZtokGiftClose" aria-label="Close">×</button></div>
			<p class="ZtokGiftTo"></p><div class="ZtokGiftGrid" role="radiogroup" aria-label="Gifts"></div>
			<label class="ZtokGiftNote"><span>Message <small>(optional)</small></span><input maxlength="150" placeholder="Say something nice"></label>
			<div class="ZtokGiftFoot"><a href="/coin" class="ZtokGiftBalance"><span class="ZtokCoin" aria-hidden="true"></span><strong>…</strong><span> coins</span><span class="ZtokGiftGet">Get coins</span></a><button type="button" class="ZtokGiftSend" disabled>Send</button></div>
			<p class="ZtokGiftStatus" role="status"></p>`;
		Dialog.querySelector('.ZtokGiftTo').textContent = Author ? `To @${Author}` : '';
		const Close = () => Dialog.close();
		Dialog.querySelector('.ZtokGiftClose').addEventListener('click', Close);
		Dialog.addEventListener('click', Event => { if (Event.target === Dialog) Close(); });
		Dialog.addEventListener('close', () => Dialog.remove());
		document.body.append(Dialog); Dialog.showModal();
		const Data = await Load().catch(() => null);
		const Status = Dialog.querySelector('.ZtokGiftStatus'), Send = Dialog.querySelector('.ZtokGiftSend'), Balance = Dialog.querySelector('.ZtokGiftBalance strong');
		if (!Data) { Status.textContent = 'Couldn’t load gifts. Try again.'; return; }
		Balance.textContent = Number_(Data.balance);
		if (Data.claimable) Dialog.querySelector('.ZtokGiftGet').textContent = `Claim ${Number_(Data.claim)} free`;
		let Picked = null;
		const Grid = Dialog.querySelector('.ZtokGiftGrid');
		for (const Item of Data.catalog) {
			const Button = document.createElement('button'); Button.type = 'button'; Button.className = 'ZtokGiftItem'; Button.setAttribute('role', 'radio'); Button.setAttribute('aria-checked', 'false');
			Button.setAttribute('aria-label', `${Item.name}, ${Item.coins} coin${Item.coins === 1 ? '' : 's'}`);
			const Emoji = Object.assign(document.createElement('span'), { className: 'ZtokGiftEmoji', textContent: Item.emoji }); Emoji.setAttribute('aria-hidden', 'true');
			Button.append(Emoji, Object.assign(document.createElement('strong'), { textContent: Item.name }), Object.assign(document.createElement('small'), { textContent: `${Number_(Item.coins)}` }));
			if (Item.coins > Data.balance) Button.classList.add('Short');
			Button.addEventListener('click', () => {
				Picked = Item; for (const Other of Grid.children) Other.setAttribute('aria-checked', String(Other === Button));
				Send.disabled = false; Send.textContent = `Send ${Item.name}`;
				Status.textContent = Item.coins > Data.balance ? `You need ${Number_(Item.coins - Data.balance)} more coins.` : '';
			});
			Grid.append(Button);
		}
		Send.addEventListener('click', async () => {
			if (!Picked) return;
			if (Picked.coins > Data.balance) { location.href = '/coin'; return; }
			Send.disabled = true; Status.textContent = 'Sending…';
			try {
				const Response = await fetch('/api/v1/gifts', { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': Instance.csrfToken }, body: JSON.stringify({ video: VideoId, gift: Picked.key, message: Dialog.querySelector('.ZtokGiftNote input').value }) });
				const Result = await Response.json().catch(() => ({}));
				if (!Response.ok) throw new Error(Result.error);
				Close(); Burst(Picked.emoji); Toast(`${Picked.emoji} You sent a ${Picked.name}`);
			} catch (Failure) {
				Status.textContent = ({ NotEnoughCoins: 'Not enough coins.', CannotGiftYourself: 'You can’t send gifts to yourself.', BlockedRelationship: 'You can’t send gifts to this account.', TryLater: 'Slow down a little and try again.' })[Failure.message] ?? 'Couldn’t send the gift. Try again.';
				Send.disabled = false;
			}
		});
	}

	// Feed and full-page posts: a Gift button under Share in the action bar.
	function FeedButtons() {
		for (const Bar of document.querySelectorAll('section[class*="SectionActionBarContainer"]')) {
			const Share = Bar.querySelector('[data-e2e="share-icon"]');
			const Unit = Share?.closest('[class*="DivActionItemAvailability"]') ?? Share;
			const Scope = Bar.closest('article') ?? Bar.parentElement;
			const VideoId = Scope?.querySelector('[data-more-menu-item-id]')?.dataset.moreMenuItemId ?? /\/(?:video|photo)\/(\d+)/.exec(location.pathname)?.[1];
			const Author = /^\/@([^/?]+)/.exec(Scope?.querySelector('a[data-e2e="video-author-avatar"]')?.getAttribute('href') ?? '')?.[1];
			if (!Unit || !VideoId || Bar.dataset.ztokGift === VideoId) continue;
			Bar.dataset.ztokGift = VideoId; Bar.querySelector('.ZtokGiftUnit')?.remove();
			if (Author && Author === Me) continue;
			const Copy = Unit.cloneNode(true); Copy.classList.add('ZtokGiftUnit');
			const Button = Copy.matches('[data-e2e]') ? Copy : Copy.querySelector('[data-e2e="share-icon"]');
			Button.setAttribute('data-e2e', 'ztok-gift-icon'); Button.setAttribute('aria-label', 'Send a gift'); Button.removeAttribute('aria-expanded'); Button.removeAttribute('data-key-interaction');
			const Svg = Copy.querySelector('svg'); if (Svg) Svg.outerHTML = GiftIcon(Svg.getAttribute('width') ?? '24');
			const Count = Copy.querySelector('strong'); if (Count) Count.textContent = 'Gift';
			const Go = Event => { Event.preventDefault(); Event.stopPropagation(); Open(VideoId, Author); };
			Copy.addEventListener('click', Go, true);
			Copy.addEventListener('keydown', Event => { if (Event.key === 'Enter' || Event.key === ' ') Go(Event); }, true);
			Unit.after(Copy);
		}
	}

	// The post popup (from a profile grid): a Gift button after Favorites.
	function PopupButton() {
		const Favorite = document.querySelector('[data-e2e="browse-favorite-icon"]');
		const Row = Favorite?.closest('[class*="DivFlexCenterRowWithGap"]');
		const VideoId = /\/(?:video|photo)\/(\d+)/.exec(location.pathname)?.[1], Author = /^\/@([^/]+)/.exec(location.pathname)?.[1];
		if (!Row || !VideoId) return;
		const Existing = Row.querySelector('.ZtokGiftBrowse');
		if (Existing?.dataset.video === VideoId) return;
		Existing?.remove();
		if (Author === Me) return;
		const Template = Favorite.closest('button');
		const Button = Template.cloneNode(true); Button.classList.add('ZtokGiftBrowse'); Button.dataset.video = VideoId; Button.setAttribute('aria-label', 'Send a gift'); Button.removeAttribute('aria-pressed');
		Button.querySelector('[data-e2e]')?.setAttribute('data-e2e', 'browse-ztok-gift-icon');
		const Svg = Button.querySelector('svg'); if (Svg) Svg.outerHTML = GiftIcon(Svg.getAttribute('width') ?? '20');
		const Count = Button.querySelector('strong'); if (Count) { Count.textContent = 'Gift'; Count.removeAttribute('data-e2e'); }
		Button.addEventListener('click', Event => { Event.preventDefault(); Event.stopPropagation(); Open(VideoId, Author); }, true);
		Row.append(Button);
	}

	document.addEventListener('click', Event => {
		const Coins = Event.target instanceof Element && Event.target.closest('[data-e2e="top-right-action-bar-get-coin"], #top-right-get-coins-button, a[href^="/coin"]:not(.ZtokGiftBalance)');
		if (Coins) { Event.preventDefault(); Event.stopImmediatePropagation(); location.href = Me ? '/coin' : '/login?redirect_url=%2Fcoin'; }
	}, true);

	function Run() { FeedButtons(); PopupButton(); }
	new MutationObserver(() => { clearTimeout(Timer); Timer = setTimeout(Run, 200); }).observe(document.body, { childList: true, subtree: true });
	Run();
})();
