(() => {
	const Instance = JSON.parse(document.getElementById('ztok-instance')?.textContent ?? '{}');
	const Account = Instance.account;
	const Cookie = /(?:^|;\s*)ztok_ip_consent=([01])/.exec(document.cookie)?.[1];
	const Remember = Allow => { document.cookie = `ztok_ip_consent=${Allow ? 1 : 0}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; };
	const Save = Allow => fetch('/api/v1/profile/ip-consent', { method: 'PATCH', headers: { 'content-type': 'application/json', 'x-csrf-token': Instance.csrfToken }, body: JSON.stringify({ allow: Allow }) });
	if (Account && typeof Account.ipConsent === 'boolean') { if (Cookie !== (Account.ipConsent ? '1' : '0')) Remember(Account.ipConsent); return; }
	if (Account && Cookie) { Save(Cookie === '1').catch(() => {}); return; }
	if (!Account && Cookie) return;
	function Ask() {
		if (document.querySelector('.ZtokIpDialog')) return;
		const Dialog = document.createElement('dialog');
		Dialog.className = 'ZtokBadgeDialog ZtokIpDialog';
		Dialog.setAttribute('aria-labelledby', 'ztok-ip-title');
		const Title = Object.assign(document.createElement('h2'), { id: 'ztok-ip-title', textContent: 'Your IP address' });
		const Text = Object.assign(document.createElement('p'), { textContent: 'Do you mind this instance having access to your plaintext IP address? You may choose not to permit this, but they will still have access to your linked alternate accounts on your IP. They just won’t have your IP.' });
		const Status = Object.assign(document.createElement('p'), { className: 'ZtokIpStatus' }); Status.setAttribute('role', 'status');
		const Buttons = Object.assign(document.createElement('div'), { className: 'ZtokBadgeButtons' });
		const Choice = (Label, Allow) => {
			const Button = Object.assign(document.createElement('button'), { type: 'button', textContent: Label });
			Button.addEventListener('click', async () => {
				for (const Item of Buttons.children) Item.disabled = true;
				try {
					if (Account && !(await Save(Allow)).ok) throw new Error('CouldntSave');
					Remember(Allow); Dialog.close();
				} catch { Status.textContent = 'CouldntSave'; for (const Item of Buttons.children) Item.disabled = false; }
			});
			return Button;
		};
		Buttons.append(Choice('I mind', false), Choice('I don’t mind', true));
		Dialog.append(Title, Text, Status, Buttons);
		Dialog.addEventListener('close', () => Dialog.remove());
		document.body.append(Dialog);
		Dialog.showModal();
	}
	if (document.readyState === 'complete') setTimeout(Ask, 600);
	else addEventListener('load', () => setTimeout(Ask, 600), { once: true });
})();
