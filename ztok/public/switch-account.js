// Switch account, like the TikTok app: a ▾ next to your name on your own profile opens a sheet with every
// account signed in on this browser, plus Add account. The login page also offers saved accounts.
(() => {
	const Instance = JSON.parse(document.getElementById('ztok-instance')?.textContent ?? '{}');
	const Me = Instance.account?.username;
	const Handle = Value => /^\/@([a-z0-9_]{3,24})\/?$/i.exec(Value)?.[1].toLowerCase();
	let Timer;

	const Load = () => fetch('/api/v1/accounts', { cache: 'no-store' }).then(Response => Response.ok ? Response.json() : { accounts: [] }).catch(() => ({ accounts: [] }));
	async function Post(Path, Body) {
		const Response = await fetch(Path, { method: 'POST', headers: { 'content-type': 'application/json', ...(Instance.csrfToken ? { 'x-csrf-token': Instance.csrfToken } : {}) }, body: JSON.stringify(Body ?? {}) });
		const Data = await Response.json().catch(() => ({}));
		if (!Response.ok) throw new Error(Data.error ?? 'CouldntSwitch');
		return Data;
	}
	const Switch = async Username => { const Data = await Post('/api/v1/accounts/switch', { username: Username }); location.href = `/@${Data.username}`; };
	const Add = async () => { await Post('/api/v1/accounts/add'); location.href = '/login'; };

	function Avatar(Url) { const Image = Object.assign(document.createElement('img'), { src: Url, alt: '', className: 'ZtokAccountAvatar', loading: 'lazy' }); return Image; }

	function Row(Account, Status) {
		const Button = Object.assign(document.createElement('button'), { type: 'button', className: 'ZtokAccountRow' });
		const Names = document.createElement('span'); Names.className = 'ZtokAccountNames';
		Names.append(Object.assign(document.createElement('strong'), { textContent: Account.displayName || Account.username }), Object.assign(document.createElement('span'), { textContent: `@${Account.username}` }));
		Button.append(Avatar(Account.avatar), Names);
		if (Account.current) {
			Button.setAttribute('aria-current', 'true'); Button.disabled = true;
			const Check = document.createElement('span'); Check.className = 'ZtokAccountCheck'; Check.setAttribute('aria-label', 'Current account'); Check.textContent = '✓';
			Button.append(Check);
		} else Button.addEventListener('click', async () => {
			Button.disabled = true; Status.textContent = 'Switching…';
			try { await Switch(Account.username); } catch (Failure) { Status.textContent = Failure.message === 'AccountNotOnThisDevice' ? 'That account was signed out. Log in to it again.' : 'Couldn’t switch. Try again.'; Button.disabled = false; }
		});
		return Button;
	}

	async function Open() {
		document.querySelector('.ZtokAccountsDialog')?.remove();
		const Dialog = document.createElement('dialog'); Dialog.className = 'ZtokAccountsDialog'; Dialog.setAttribute('aria-labelledby', 'ztok-accounts-title');
		const Head = document.createElement('div'); Head.className = 'ZtokAccountsHead';
		const Title = Object.assign(document.createElement('h2'), { id: 'ztok-accounts-title', textContent: 'Switch account' });
		const Close = Object.assign(document.createElement('button'), { type: 'button', className: 'ZtokAccountsClose', textContent: '×' }); Close.setAttribute('aria-label', 'Close');
		Close.addEventListener('click', () => Dialog.close());
		Head.append(Title, Close);
		const List = document.createElement('div'); List.className = 'ZtokAccountsList';
		const Status = document.createElement('p'); Status.className = 'ZtokAccountsStatus'; Status.setAttribute('role', 'status'); Status.textContent = 'Loading…';
		Dialog.append(Head, List, Status);
		Dialog.addEventListener('close', () => Dialog.remove());
		Dialog.addEventListener('click', Event => { if (Event.target === Dialog) Dialog.close(); });
		document.body.append(Dialog); Dialog.showModal();
		const Data = await Load();
		Status.textContent = '';
		for (const Account of Data.accounts) List.append(Row(Account, Status));
		const AddButton = Object.assign(document.createElement('button'), { type: 'button', className: 'ZtokAccountRow ZtokAccountAdd' });
		const Plus = document.createElement('span'); Plus.className = 'ZtokAccountPlus'; Plus.textContent = '+';
		AddButton.append(Plus, Object.assign(document.createElement('strong'), { textContent: 'Add account' }));
		if (Data.accounts.length >= (Data.max ?? 5)) { AddButton.disabled = true; AddButton.title = `Up to ${Data.max ?? 5} accounts`; }
		AddButton.addEventListener('click', async () => {
			AddButton.disabled = true; Status.textContent = 'Opening log in…';
			try { await Add(); } catch (Failure) { Status.textContent = Failure.message === 'TooManyAccounts' ? `You can add up to ${Data.max ?? 5} accounts.` : 'Couldn’t add an account. Try again.'; AddButton.disabled = false; }
		});
		List.append(AddButton);
	}

	function ProfileChevron() {
		const Title = Me && Handle(location.pathname) === Me && document.querySelector('[data-e2e="user-title"]');
		if (!Title || Title.parentElement.querySelector('.ZtokAccountSwitch')) return;
		const Button = Object.assign(document.createElement('button'), { type: 'button', className: 'ZtokAccountSwitch', innerHTML: '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path fill="currentColor" d="M6.7 9.3a1 1 0 0 1 1.4 0L12 13.2l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.7a1 1 0 0 1 0-1.4Z"/></svg>' });
		Button.setAttribute('aria-label', 'Switch account'); Button.title = 'Switch account';
		Button.addEventListener('click', Event => { Event.preventDefault(); Event.stopPropagation(); Open(); });
		Title.after(Button);
	}

	let LoginChecked = false;
	async function LoginSaved() {
		if (Me || LoginChecked || !/^\/login(?:\/|$)/.test(location.pathname)) return;
		const Anchor = document.querySelector('[class*="--DivLoginOptionContainer"]');
		if (!Anchor) return;
		LoginChecked = true;
		const Data = await Load();
		if (!Data.accounts.length || document.querySelector('.ZtokSavedAccounts')) return;
		const Box = document.createElement('section'); Box.className = 'ZtokSavedAccounts';
		Box.append(Object.assign(document.createElement('h2'), { textContent: 'Continue as' }));
		const Status = document.createElement('p'); Status.className = 'ZtokAccountsStatus'; Status.setAttribute('role', 'status');
		for (const Account of Data.accounts) Box.append(Row(Account, Status));
		Box.append(Status);
		Anchor.before(Box);
	}

	function Run() { ProfileChevron(); LoginSaved(); }
	function Schedule() { clearTimeout(Timer); Timer = setTimeout(Run, 150); }
	new MutationObserver(Schedule).observe(document.body, { childList: true, subtree: true });
	addEventListener('popstate', () => { LoginChecked = false; Schedule(); });
	Schedule();
})();
