// Phones: the archived client is TikTok's desktop web app. A phone user agent sends it down mobile-only code
// paths that ztok can't serve (a half-drawn login page, missing modules), so it is shown a desktop user agent.
// The layout is fitted to small screens by responsive.css.
(() => {
	try {
		const Real = navigator.userAgent;
		if (!/Mobi|Android|iPhone|iPad|iPod/i.test(Real)) return;
		const Android = /Android/i.test(Real);
		const Desktop = Android ? 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
		const Define = (Name, Value) => { try { Object.defineProperty(Navigator.prototype, Name, { get: () => Value, configurable: true }); } catch {} };
		const Hints = navigator.userAgentData;
		Define('userAgent', Desktop);
		Define('appVersion', Desktop.slice('Mozilla/'.length));
		Define('platform', Android ? 'Linux x86_64' : 'MacIntel');
		if (Hints) Define('userAgentData', { brands: Hints.brands, mobile: false, platform: Android ? 'Linux' : 'macOS', toJSON: () => ({ brands: Hints.brands, mobile: false }), getHighEntropyValues: Wanted => Hints.getHighEntropyValues(Wanted).then(Values => ({ ...Values, mobile: false })) });
		document.documentElement.dataset.ztokPhone = '';
	} catch {}
})();
(() => {
	const Instance = JSON.parse(document.getElementById('ztok-instance')?.textContent ?? '{}');
	document.documentElement.style.setProperty('--ztok-name', JSON.stringify(Instance.name ?? 'ztok'));
	const AdminPage = Value => /^\/admin(?:\/|$)/.test(Value);
	if (Instance.account?.role === 'admin' && AdminPage(location.pathname)) {
		window.__ZtokAdminPath = location.pathname + location.search + location.hash;
		history.replaceState(null, '', '/tag/ztokadmin');
		addEventListener('popstate', Event => { if (AdminPage(location.pathname)) { Event.stopImmediatePropagation(); dispatchEvent(new Event('ztok-admin-route')); } });
	}
	let ShopPromo;
	function ShopPromoText() {
		if (ShopPromo) return ShopPromo;
		try { ShopPromo = JSON.parse(document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__').textContent).__DEFAULT_SCOPE__['webapp.i18n-translation'].Webapp.TTSweb_notif_inAppAnnounce_header; } catch {}
		return ShopPromo || 'TikTok Shop is now available on web';
	}
	const AdminIcon = '<svg fill="currentColor" viewBox="0 0 48 48" width="1em" height="1em" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M24 3 7 9.5V22c0 11 7.2 20.3 17 23 9.8-2.7 17-12 17-23V9.5L24 3Zm0 4.3 13 5v9.7c0 8.9-5.6 16.6-13 19.1-7.4-2.5-13-10.2-13-19.1v-9.7l13-5Zm7.3 9.3a1 1 0 0 1 1.4 0l1.4 1.4a1 1 0 0 1 0 1.4L22.4 31.1a1 1 0 0 1-1.4 0l-6.1-6.1a1 1 0 0 1 0-1.4l1.4-1.4a1 1 0 0 1 1.4 0l5 5 8.6-10.6Z"/></svg>';
	let UploadSlot;
	const UploadWatch = new MutationObserver(() => SyncAdmin());
	function SyncAdmin() {
		const Upload = document.querySelector('a[data-e2e="nav-upload"]');
		const Existing = document.querySelector('[data-e2e="nav-ztok-admin"]')?.closest('[data-ztok-admin]');
		if (!Upload) { Existing?.remove(); return; }
		const Slot = Upload.parentElement.parentElement;
		if (Slot !== UploadSlot) { UploadSlot = Slot; UploadWatch.disconnect(); UploadWatch.observe(Slot, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] }); }
		let Signature = 0;
		for (const Char of Slot.outerHTML.replace(/ aria-describedby="[^"]*"/g, '')) Signature = (Signature * 31 + Char.charCodeAt(0)) | 0;
		Signature = String(Signature);
		if (Existing?.dataset.ztokAdmin === Signature && Existing.previousElementSibling === Slot) return;
		Existing?.remove();
		const Item = Slot.cloneNode(true);
		Item.dataset.ztokAdmin = Signature;
		const Link = Item.querySelector('a');
		Link.href = '/admin'; Link.setAttribute('data-e2e', 'nav-ztok-admin');
		Item.querySelector('button')?.setAttribute('aria-label', 'Admin');
		const Label = Item.querySelector('.TUXButton-label'); if (Label) Label.textContent = 'Admin';
		const Icon = Item.querySelector('svg');
		if (Icon) Icon.outerHTML = AdminIcon;
		Slot.after(Item);
	}
	const LogoSize = new ResizeObserver(Entries => {
		for (const Entry of Entries) Entry.target.toggleAttribute('data-ztok-compact', Entry.contentRect.width > 0 && Entry.contentRect.width < 80);
	});
	function Brand() {
		document.querySelector('input[name="message_read_status"]')?.setAttribute('aria-label', 'Read status');
		document.querySelector('input[name="ztok_private_account"]')?.setAttribute('aria-label', 'Private account');
		for (const Radio of document.querySelectorAll('input[name^="comment_permission_item_"]')) Radio.setAttribute('aria-label', ({0:'Everyone',1:'Friends',2:'No one',3:'Followers'})[Radio.value] ?? 'Comment audience');
		const Settings = document.getElementById('main-content-setting');
		if (Settings && location.pathname.startsWith('/setting/') && !Settings.querySelector('[data-ztok-settings-back]')) {
			const Back = document.createElement('a'); Back.href = '/setting'; Back.textContent = '‹ Settings'; Back.setAttribute('data-ztok-settings-back', ''); Settings.prepend(Back);
		}
		const ChatHeader = document.querySelector('#main-content-messages [class*="--DivChatHeader"]');
		if (ChatHeader && !ChatHeader.querySelector('[data-ztok-chat-back]')) {
			const Back = document.createElement('button'); Back.type = 'button'; Back.textContent = '‹'; Back.setAttribute('data-ztok-chat-back', ''); Back.setAttribute('aria-label', 'Back to messages'); Back.addEventListener('click', () => { location.href = '/messages'; }); ChatHeader.prepend(Back);
		}
		if (document.title !== Instance.name) document.title = Instance.name;
		const LoginTitle = document.getElementById('login-modal-title');
		if (LoginTitle?.textContent === 'Log in to TikTok' && LoginTitle.firstChild?.nodeType === 3) LoginTitle.firstChild.nodeValue = `Log in to ${Instance.name}`;
		for (const Logo of document.querySelectorAll('a[data-e2e="tiktok-logo"]')) Logo.setAttribute('aria-label', `Go to ${Instance.name} feed`);
		for (const Channel of document.querySelectorAll('[data-e2e="channel-item"]')) {
			const Google = Boolean(Channel.querySelector('path[fill="#4285F4"]'));
			const Unavailable = Google || /^(Continue with |Use QR code)/.test(Channel.textContent.trim());
			if (Channel.hasAttribute('data-ztok-google') !== Google) {
				Channel.toggleAttribute('data-ztok-google', Google);
				if (Google) Channel.setAttribute('aria-label', 'Continue with Google'); else Channel.removeAttribute('aria-label');
			}
			if (Channel.hasAttribute('data-ztok-unavailable') !== Unavailable) {
				Channel.toggleAttribute('data-ztok-unavailable', Unavailable);
				if (Unavailable) { Channel.setAttribute('aria-disabled', 'true'); Channel.title = 'This sign-in method is not configured for this instance.'; }
				else { Channel.removeAttribute('aria-disabled'); Channel.removeAttribute('title'); }
			}
		}
		if (location.pathname === '/signup/phone-or-email/phone') document.querySelector('a[href="/signup/phone-or-email/email"]')?.click();
		const SendCode = !Instance.mail && location.pathname.startsWith('/signup') && document.querySelector('[data-e2e="send-code-button"]');
		const CodeInput = SendCode && SendCode.parentElement.querySelector('input');
		if (CodeInput) {
			SendCode.parentElement.style.display = 'none';
			if (CodeInput.value !== '000000') { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(CodeInput, '000000'); CodeInput.dispatchEvent(new Event('input', { bubbles: true })); }
		}
		if (Instance.registration === 'invite' && location.pathname.startsWith('/signup')) InviteField();
		for (const Frame of document.querySelectorAll('iframe[src^="https://www.tiktok.com/tpp/inapp/"], iframe[src^="http://localhost:3001/pns_product_poseidon/"]')) {
			const Source = new URL(Frame.src);
			Frame.src = location.origin + (Source.pathname.startsWith('/tpp/inapp/') ? Source.pathname : '/tpp/inapp' + Source.pathname) + Source.search;
		}
		if (Instance.account?.role === 'admin') SyncAdmin();
		for (const Logo of document.querySelectorAll('a[data-e2e="tiktok-logo"]:not([data-ztok-sized])')) { Logo.setAttribute('data-ztok-sized', ''); LogoSize.observe(Logo); }
		for (const Item of document.querySelectorAll('[data-e2e="notice-list-item"]')) {
			if (Item.querySelector('[data-e2e="notice-main"]')?.textContent.includes(ShopPromoText())) Item.remove();
		}
		if (document.body && !document.getElementById('ztok-source')) {
			const Source = document.createElement('a'); Source.id = 'ztok-source'; Source.href = '/about'; Source.textContent = 'ztok · Source'; document.body.append(Source);
		}
	}
	const LinkInvite = /[?&]invite=([^&#]*)/.exec(location.search ?? '')?.[1];
	if (LinkInvite) try { sessionStorage.setItem('ztok-invite', decodeURIComponent(LinkInvite).trim().slice(0, 200)); } catch {}
	function SaveInvite(Value) {
		try { sessionStorage.setItem('ztok-invite', Value); } catch {}
		document.cookie = `ztok_invite=${encodeURIComponent(Value)}; Path=/; SameSite=Lax; Max-Age=86400${location.protocol === 'https:' ? '; Secure' : ''}`;
	}
	function InviteField() {
		const Password = document.querySelector('form input[type="password"]');
		const Next = Password?.closest('form')?.querySelector('button[type="submit"]');
		if (!Next || Next.parentElement.querySelector('[data-ztok-invite]')) return;
		const Label = [...Next.parentElement.children].find(Child => /^Email/.test(Child.textContent.trim()));
		const Title = document.createElement('div'); Title.className = Label?.className ?? ''; Title.textContent = 'Invite code'; Title.setAttribute('data-ztok-invite', '');
		const Box = document.createElement('div'); Box.className = Password.parentElement.parentElement.className; Box.setAttribute('data-ztok-invite', '');
		const Wrap = document.createElement('div'); Wrap.className = Password.parentElement.className;
		const Input = document.createElement('input'); Input.className = Password.className; Input.type = 'text'; Input.placeholder = 'Invite code'; Input.autocomplete = 'off'; Input.spellcheck = false; Input.setAttribute('aria-label', 'Invite code');
		let Saved = ''; try { Saved = sessionStorage.getItem('ztok-invite') ?? ''; } catch {}
		Input.value = Saved; if (Saved) SaveInvite(Saved);
		Input.addEventListener('input', () => SaveInvite(Input.value.trim()));
		Wrap.append(Input); Box.append(Wrap);
		Next.before(Title, Box);
	}
	new MutationObserver(Brand).observe(document.documentElement, { childList: true, subtree: true });
	const NativeFetch = window.fetch.bind(window);
	const NativeOpen = XMLHttpRequest.prototype.open;
	function LocalUrl(Value) {
		const Url = new URL(Value, location.origin);
		if (Url.origin === location.origin || ['blob:', 'data:'].includes(Url.protocol)) return Url.href;
		if (Url.hostname === 'www.tiktok.com' && Url.pathname === '/module_meta/common-login/vmok-manifest.json') return location.origin + Url.pathname;
		if (/\/(?:api|passport|node-webapp|tiktok|tns-api|aweme|node)\//.test(Url.pathname)) return location.origin + Url.pathname + Url.search;
		return location.origin + '/_blocked?host=' + encodeURIComponent(Url.hostname);
	}
	window.fetch = (Input, Options) => {
		const IsRequest = Input instanceof Request;
		const Url = LocalUrl(IsRequest ? Input.url : String(Input));
		const RequestHeaders = new Headers(Options?.headers ?? (IsRequest ? Input.headers : undefined));
		if (Instance.csrfToken) RequestHeaders.set('x-csrf-token', Instance.csrfToken);
		const Sent = NativeFetch(IsRequest ? new Request(Url, Input) : Url, { ...Options, headers: RequestHeaders });
		if (new URL(Url).pathname === '/api/related/item_list/') {
			delete document.documentElement.dataset.ztokRelatedEmpty;
			Sent.then(Response => Response.clone().json()).then(Data => { if (!Data.itemList?.length && !Data.hasMore) document.documentElement.dataset.ztokRelatedEmpty = ''; }).catch(() => {});
		}
		return Sent;
	};
	XMLHttpRequest.prototype.open = function(Method, Url, ...Args) {
		const Result = NativeOpen.call(this, Method, LocalUrl(String(Url)), ...Args);
		if (Instance.csrfToken) this.setRequestHeader('x-csrf-token', Instance.csrfToken);
		return Result;
	};
	document.addEventListener('click', Event => {
		const Clicked = Event.target instanceof Element ? Event.target : null;
		const Target = Clicked?.closest('a,button,[role="link"]');
		if (!Target) return;
		if (Target.hasAttribute('data-ztok-unavailable')) { Event.preventDefault(); Event.stopImmediatePropagation(); return; }
		if (Instance.account && Target.matches('button[class*="StyledLogoutButton"]') && Target.closest('#login-modal') && Target === Target.parentElement.lastElementChild) {
			Event.preventDefault(); Event.stopImmediatePropagation();
			Target.disabled = true;
			window.fetch('/passport/web/logout/', { method: 'POST' }).then(Response => {
				if (!Response.ok) throw new Error('CouldntLogOut');
				location.href = '/';
			}).catch(() => { Target.disabled = false; Target.textContent = 'Try again'; });
			return;
		}
		const Href = Target.getAttribute('href');
		const Path = Href ? new URL(Href, location.origin).pathname : '';
		if (/^\/signup(?:\/|$)/.test(Path) && !document.getElementById('SIGI_STATE')) { Event.preventDefault(); Event.stopImmediatePropagation(); location.href = Href; return; }
		if (Path === '/@') { Event.preventDefault(); Event.stopImmediatePropagation(); location.href = Instance.account ? '/@' + Instance.account.username : '/login'; return; }
		if (Target.id === 'header-login-button' || Target.id === 'top-right-action-bar-login-button' || Target.matches('button[class*="SquareTUXButton"][aria-label="Log in"]') || Path === '/login') {
			Event.preventDefault(); Event.stopImmediatePropagation(); location.href = Instance.account ? '/account' : '/login'; return;
		}
		if (Path.startsWith('/tiktokstudio/upload')) {
			Event.preventDefault(); Event.stopImmediatePropagation(); location.href = '/upload';
		}
	}, true);
	document.addEventListener('keydown', Event => {
		if ((Event.key === 'Enter' || Event.key === ' ') && Event.target instanceof Element && Event.target.closest('[data-ztok-unavailable]')) { Event.preventDefault(); Event.stopImmediatePropagation(); }
	}, true);
	const Notice = Instance.announcement;
	let Dismissed = null;
	try { Dismissed = localStorage.getItem('ztok-announcement'); } catch {}
	if (Notice?.text && Dismissed !== String(Notice.version)) {
		const Show = () => {
			if (!document.body || document.getElementById('ztok-announcement')) return;
			const Bar = document.createElement('div'); Bar.id = 'ztok-announcement'; Bar.setAttribute('role', 'status');
			const Text = document.createElement('span'); Text.textContent = Notice.text; Bar.append(Text);
			if (Notice.link) { const Link = document.createElement('a'); Link.href = Notice.link; Link.textContent = 'Learn more'; Link.rel = 'noopener'; Bar.append(Link); }
			const Close = document.createElement('button'); Close.type = 'button'; Close.setAttribute('aria-label', 'Close announcement'); Close.textContent = '×';
			Close.addEventListener('click', () => { Bar.remove(); try { localStorage.setItem('ztok-announcement', String(Notice.version)); } catch {} });
			Bar.append(Close); document.body.append(Bar);
		};
		document.body ? Show() : document.addEventListener('DOMContentLoaded', Show);
	}
	const Viewed = new Set();
	document.addEventListener('playing', Event => {
		const Id = Event.target instanceof HTMLVideoElement ? Event.target.closest('[id^="xgwrapper-"]')?.id.match(/-(\d+)$/)?.[1] : null;
		if (!Id || Viewed.has(Id)) return;
		Viewed.add(Id);
		NativeFetch('/_ztok/view', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: Id }), keepalive: true }).catch(() => {});
	}, true);
	window.addEventListener('securitypolicyviolation', Event => {
		NativeFetch('/_debug/blocked', {
			method: 'POST', headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ directive: Event.effectiveDirective, blocked: Event.blockedURI }),
		}).catch(() => {});
	});
})();
