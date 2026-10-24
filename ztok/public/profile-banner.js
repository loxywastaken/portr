// Profile banners: a wide background image behind the profile header (avatar, name, stats, bio),
// like the banner TikTok has been rolling out. Set from Edit profile → Banner.
(() => {
	const Instance = JSON.parse(document.getElementById('ztok-instance')?.textContent ?? '{}');
	const Handle = Value => /^\/@([a-z0-9_]{3,24})\/?$/i.exec(Value)?.[1].toLowerCase();
	const Cache = new Map();
	let Timer;

	const Lookup = Username => {
		if (!Cache.has(Username)) Cache.set(Username, fetch(`/_ztok/badges?users=${encodeURIComponent(Username)}`).then(Response => Response.ok ? Response.json() : {}).then(Data => Data.banners?.[Username] ?? null).catch(() => { Cache.delete(Username); return null; }));
		return Cache.get(Username);
	};

	function Host() {
		const Header = document.querySelector('[data-e2e="user-page"] .user-profile-header') ?? document.querySelector('[data-e2e="user-avatar"]')?.closest('[class*="DivShareLayoutHeader"]');
		return Header?.parentElement ?? null;
	}

	function Clear(Except) {
		for (const Old of document.querySelectorAll('.ZtokBannerHost')) {
			if (Old === Except) continue;
			Old.classList.remove('ZtokBannerHost'); delete Old.dataset.ztokBanner;
			Old.querySelector(':scope > .ZtokBanner')?.remove();
		}
	}

	function Paint(Target, Url) {
		Clear(Target);
		if (!Url) { if (Target) Clear(); return; }
		if (Target.dataset.ztokBanner === Url) return;
		let Layer = Target.querySelector(':scope > .ZtokBanner');
		if (!Layer) { Layer = document.createElement('div'); Layer.className = 'ZtokBanner'; Layer.setAttribute('aria-hidden', 'true'); Target.prepend(Layer); }
		const Probe = new Image();
		Probe.onload = () => { if (Target.dataset.ztokBanner !== Url) return; Layer.style.backgroundImage = `url("${Url.replace(/"/g, '%22')}")`; Target.classList.add('ZtokBannerHost'); };
		Probe.onerror = () => { if (Target.dataset.ztokBanner === Url) { Target.classList.remove('ZtokBannerHost'); Layer.remove(); } };
		Target.dataset.ztokBanner = Url;
		Probe.src = Url;
	}

	async function Profile() {
		const Username = Handle(location.pathname);
		if (!Username) return Clear();
		const Target = Host();
		if (!Target) return;
		const Url = await Lookup(Username);
		if (Handle(location.pathname) !== Username || !Target.isConnected) return;
		Paint(Target, Url);
	}

	// Edit profile → Banner row
	async function Send(Method, Body) {
		const Response = await fetch('/api/v1/profile/banner', { method: Method, headers: { 'x-csrf-token': Instance.csrfToken, ...(Body ? { 'content-type': Body.type } : {}) }, body: Body ?? undefined });
		const Data = await Response.json().catch(() => ({}));
		if (!Response.ok) throw new Error(Data.error ?? Data.message ?? (Response.status === 413 ? 'ImageTooLarge' : 'CouldntSave'));
		return Data.banner ?? null;
	}

	function EditRow(Modal) {
		if (Modal.querySelector('.ZtokBannerRow')) return;
		const Photo = Modal.querySelector('[data-e2e="edit-profile-photo"]');
		const PhotoRow = Photo?.parentElement;
		if (!PhotoRow) return;
		const Row = document.createElement('div'); Row.className = `${PhotoRow.className} ZtokBannerRow`;
		const Label = document.createElement('div'); Label.className = Photo.className; Label.textContent = 'Banner';
		const Body = document.createElement('div'); Body.className = 'ZtokBannerEdit';
		const Preview = document.createElement('div'); Preview.className = 'ZtokBannerPreview'; Preview.setAttribute('role', 'img'); Preview.setAttribute('aria-label', 'Banner preview');
		const Empty = document.createElement('span'); Empty.className = 'ZtokBannerEmpty'; Empty.textContent = 'No banner';
		Preview.append(Empty);
		const Buttons = document.createElement('div'); Buttons.className = 'ZtokBannerButtons';
		const Input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true });
		const Change = Object.assign(document.createElement('button'), { type: 'button', className: 'ZtokBannerButton', textContent: 'Change background' });
		const Remove = Object.assign(document.createElement('button'), { type: 'button', className: 'ZtokBannerButton Secondary', textContent: 'Remove' });
		const Help = document.createElement('p'); Help.className = 'ZtokBannerHelp'; Help.textContent = 'Shown behind your profile photo, name and bio. 16:9 works best (1920×1080), keep the important part in the middle. PNG, JPG or WebP, up to 8 MB.';
		const Status = document.createElement('p'); Status.className = 'ZtokBannerStatus'; Status.setAttribute('role', 'status');
		Buttons.append(Change, Remove);
		Body.append(Preview, Buttons, Input, Help, Status);
		Row.append(Label, Body);
		PhotoRow.after(Row);

		const Show = Url => {
			Preview.style.backgroundImage = Url ? `url("${Url.replace(/"/g, '%22')}")` : '';
			Preview.classList.toggle('Filled', Boolean(Url)); Empty.hidden = Boolean(Url); Remove.hidden = !Url;
			Change.textContent = Url ? 'Change background' : 'Add background';
		};
		const Busy = On => { Change.disabled = Remove.disabled = On; Row.classList.toggle('Busy', On); };
		const Apply = Url => { Show(Url); const Me = Instance.account?.username; if (Me) { Cache.set(Me, Promise.resolve(Url)); for (const Host_ of document.querySelectorAll('[data-ztok-banner]')) delete Host_.dataset.ztokBanner; Schedule(); } };
		Show(null);
		const Me = Instance.account?.username;
		if (Me) Lookup(Me).then(Url => { if (Row.isConnected && !Row.classList.contains('Busy')) Show(Url); });

		Change.addEventListener('click', () => Input.click());
		Input.addEventListener('change', async () => {
			const File = Input.files?.[0]; Input.value = '';
			if (!File) return;
			if (File.size > 8 * 1024 * 1024) { Status.textContent = 'That image is over 8 MB.'; return; }
			Busy(true); Status.textContent = 'Uploading…';
			try { Apply(await Send('POST', File)); Status.textContent = 'Banner saved.'; }
			catch (Failure) { Status.textContent = Failure.message === 'InvalidImage' ? 'That file isn’t a PNG, JPG or WebP image.' : `Couldn’t save the banner (${Failure.message}).`; }
			finally { Busy(false); }
		});
		Remove.addEventListener('click', async () => {
			Busy(true); Status.textContent = 'Removing…';
			try { Apply(await Send('DELETE')); Status.textContent = 'Banner removed.'; }
			catch (Failure) { Status.textContent = `Couldn’t remove the banner (${Failure.message}).`; }
			finally { Busy(false); }
		});
	}

	function Run() {
		Profile();
		const Modal = Instance.account && document.querySelector('[data-e2e="edit-profile-popup"]');
		if (Modal) EditRow(Modal);
	}
	function Schedule() { clearTimeout(Timer); Timer = setTimeout(Run, 120); }
	new MutationObserver(Schedule).observe(document.body, { childList: true, subtree: true });
	addEventListener('popstate', Schedule);
	Schedule();
})();
