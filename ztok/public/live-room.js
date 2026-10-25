// A LIVE room: plays the HLS stream, and runs chat, likes, gifts and the viewer count over a WebSocket.
(() => {
	const Boot = JSON.parse(document.getElementById('live-boot').textContent);
	const $ = Id => document.getElementById(Id);
	const Live = Boot.live, Me = Boot.me, Video = $('stream'), Wait = $('wait'), Chat = $('chat');
	const Source = `/live/${Live.id}/index.m3u8`;
	let Socket = null, Player = null, Ended = false, Playing = false, Retries = 0, PendingLikes = 0, Catalog = null, Picked = null;

	function Play() {
		if (Playing || Ended) return;
		Playing = true; Wait.textContent = 'Loading…';
		if (Video.canPlayType('application/vnd.apple.mpegurl')) { Video.src = Source; Video.play().catch(() => {}); }
		else if (window.Hls?.isSupported()) {
			Player = new Hls({ liveSyncDurationCount: 2, liveMaxLatencyDurationCount: 5, manifestLoadingMaxRetry: 30, levelLoadingMaxRetry: 30, fragLoadingMaxRetry: 10 });
			Player.loadSource(Source); Player.attachMedia(Video);
			Player.on(Hls.Events.MANIFEST_PARSED, () => Video.play().catch(() => {}));
			Player.on(Hls.Events.ERROR, (_, Data) => { if (Data.fatal && !Ended) { Player.destroy(); Player = null; Playing = false; setTimeout(Play, 2000); } });
		} else Wait.textContent = 'This browser can’t play LIVE video.';
	}
	Video.addEventListener('playing', () => { Wait.hidden = true; });
	Video.addEventListener('waiting', () => { if (!Ended) { Wait.hidden = false; Wait.textContent = 'Loading…'; } });
	$('unmute').addEventListener('click', () => { Video.muted = false; Video.play().catch(() => {}); $('unmute').hidden = true; });

	function Line(Message) {
		const Row = document.createElement('div');
		if (Message.type === 'chat') {
			Row.className = `msg${Message.user.host ? ' host' : ''}`;
			const Avatar = Object.assign(document.createElement('img'), { src: Message.user.avatar, alt: '' });
			const Body = document.createElement('p'); const Name = document.createElement('a'); Name.href = `/@${Message.user.username}`; Name.textContent = Message.user.name;
			Body.append(Name);
			if (Message.user.host) Body.append(Object.assign(document.createElement('span'), { className: 'tag', textContent: 'Host' }));
			Body.append(document.createElement('br'), document.createTextNode(Message.text));
			Row.append(Avatar, Body);
		} else { Row.className = `note${Message.gift ? ' gift' : ''}`; Row.textContent = Message.text; }
		const Stick = Chat.scrollHeight - Chat.scrollTop - Chat.clientHeight < 60;
		Chat.append(Row); while (Chat.children.length > 200) Chat.firstChild.remove();
		if (Stick) Chat.scrollTop = Chat.scrollHeight;
	}
	function Heart(Count = 1) {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		for (let Index = 0; Index < Math.min(Count, 6); Index++) {
			const Item = Object.assign(document.createElement('span'), { textContent: ['❤', '💗', '💖', '💕'][Math.floor(Math.random() * 4)] });
			Item.style.left = `${20 + Math.random() * 60}%`; Item.style.animationDelay = `${Index * 120}ms`;
			$('hearts').append(Item); setTimeout(() => Item.remove(), 2400);
		}
	}
	function Banner(Message) {
		const Banner_ = $('gift-banner'); Banner_.textContent = `${Message.gift.emoji} ${Message.user.name} sent a ${Message.gift.name}`;
		Banner_.classList.remove('show'); void Banner_.offsetWidth; Banner_.classList.add('show');
	}
	function Over(Reason) {
		Ended = true; Player?.destroy(); Video.removeAttribute('src'); Video.load();
		Wait.hidden = false; Wait.replaceChildren();
		const Title = Object.assign(document.createElement('strong'), { textContent: 'LIVE has ended' });
		const Link = Object.assign(document.createElement('a'), { href: `/@${Live.host.username}`, textContent: `View ${Live.host.name}’s profile` });
		Wait.append(Title, Link); Wait.classList.add('over');
		for (const Control of document.querySelectorAll('#say input, #say button')) Control.disabled = true;
		void Reason;
	}
	function Connect() {
		Socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/live/${Live.id}`);
		Socket.onopen = () => { Retries = 0; };
		Socket.onmessage = Event => {
			let Message; try { Message = JSON.parse(Event.data); } catch { return; }
			if (Message.type === 'state') { Chat.replaceChildren(); for (const Item of Message.chat) Line(Item); $('viewers').lastChild.textContent = ` ${Message.live.viewers}`; $('likes-count').textContent = `${Message.live.likes.toLocaleString()} likes`; if (Message.live.ready) Play(); else Wait.textContent = 'Starting…'; }
			else if (Message.type === 'ready') Play();
			else if (Message.type === 'chat') Line(Message);
			else if (Message.type === 'join') Line({ type: 'note', text: `${Message.user.name} joined` });
			else if (Message.type === 'viewers') $('viewers').lastChild.textContent = ` ${Message.count}`;
			else if (Message.type === 'likes') { $('likes-count').textContent = `${Message.total.toLocaleString()} likes`; Heart(Math.min(3, Message.added)); }
			else if (Message.type === 'gift') { Banner(Message); Line({ type: 'note', gift: true, text: `${Message.gift.emoji} ${Message.user.name} sent a ${Message.gift.name}` }); }
			else if (Message.type === 'balance') { if ($('balance')) $('balance').textContent = Message.balance.toLocaleString(); if (Catalog) Catalog.balance = Message.balance; }
			else if (Message.type === 'paused') { Wait.hidden = false; Wait.textContent = 'The host is reconnecting…'; }
			else if (Message.type === 'error') Line({ type: 'note', text: ({ SlowDown: 'You’re sending comments too fast.', NotEnoughCoins: 'Not enough coins for that gift.', LogInFirst: 'Log in to join in.' })[Message.error] ?? 'Something went wrong.' });
			else if (Message.type === 'end') Over(Message.reason);
		};
		Socket.onclose = () => { if (!Ended && Retries++ < 20) setTimeout(Connect, Math.min(1000 * Retries, 8000)); };
	}
	Connect();
	setInterval(() => { if (Socket?.readyState === 1) Socket.send(JSON.stringify({ type: 'ping' })); }, 30000);

	if (Me) {
		$('say').addEventListener('submit', Event => {
			Event.preventDefault();
			const Input = $('say-text');
			if (Input.value.trim() && Socket?.readyState === 1) { Socket.send(JSON.stringify({ type: 'chat', text: Input.value })); Input.value = ''; }
		});
		const Like = () => { PendingLikes++; Heart(1); };
		$('like').addEventListener('click', Like);
		Video.addEventListener('dblclick', Like);
		setInterval(() => { if (PendingLikes && Socket?.readyState === 1) { Socket.send(JSON.stringify({ type: 'like', count: Math.min(PendingLikes, 15) })); PendingLikes = 0; } }, 1000);
		// Follow the host from the room.
		const Follow = $('follow');
		if (Follow) fetch(`/api/user/detail/?uniqueId=${Live.host.username}`).then(Response => Response.json()).then(Data => {
			if ([0, 6].includes(Data.userInfo?.user?.relation)) Follow.hidden = false;
		}).catch(() => {});
		Follow?.addEventListener('click', async () => {
			Follow.disabled = true;
			const Response = await fetch(`/api/commit/follow/user/?type=1&user_id=${Live.host.id}`, { method: 'POST', headers: { 'x-csrf-token': Me.csrf } }).catch(() => null);
			if (Response?.ok) Follow.hidden = true; else Follow.disabled = false;
		});
		// Gifts
		const Dialog = $('gifts'), Grid = $('gift-grid'), Send = $('gift-send'), Status = $('gifts-status');
		$('gift-open').addEventListener('click', async () => {
			Dialog.showModal(); Status.textContent = '';
			Catalog = await fetch('/api/v1/coins', { cache: 'no-store' }).then(Response => Response.json()).catch(() => null);
			if (!Catalog) { Status.textContent = 'Couldn’t load gifts.'; return; }
			$('balance').textContent = Catalog.balance.toLocaleString();
			Grid.replaceChildren(...Catalog.catalog.map(Item => {
				const Button = document.createElement('button'); Button.type = 'button'; Button.setAttribute('role', 'radio'); Button.setAttribute('aria-checked', 'false');
				Button.setAttribute('aria-label', `${Item.name}, ${Item.coins} coin${Item.coins === 1 ? '' : 's'}`);
				Button.append(Object.assign(document.createElement('span'), { className: 'e', textContent: Item.emoji }), Object.assign(document.createElement('strong'), { textContent: Item.name }), Object.assign(document.createElement('small'), { textContent: Item.coins.toLocaleString() }));
				Button.addEventListener('click', () => { Picked = Item; for (const Other of Grid.children) Other.setAttribute('aria-checked', String(Other === Button)); Send.disabled = false; Send.textContent = `Send ${Item.name}`; Status.textContent = Item.coins > Catalog.balance ? `You need ${Item.coins - Catalog.balance} more coins.` : ''; });
				return Button;
			}));
		});
		$('gifts-close').addEventListener('click', () => Dialog.close());
		Dialog.addEventListener('click', Event => { if (Event.target === Dialog) Dialog.close(); });
		Send.addEventListener('click', () => {
			if (!Picked || Socket?.readyState !== 1) return;
			if (Picked.coins > (Catalog?.balance ?? 0)) { window.open('/coin', '_blank', 'noopener'); return; }
			Socket.send(JSON.stringify({ type: 'gift', gift: Picked.key })); Dialog.close();
		});
	}
})();
