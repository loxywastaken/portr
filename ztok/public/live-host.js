// Studio → LIVE: preview the camera or screen, then record it in 1-second chunks and send them to the server.
(() => {
	const Config = JSON.parse(document.getElementById('live-config').textContent);
	const $ = Id => document.getElementById(Id);
	const Preview = $('live-preview'), Status = $('live-status'), Mic = $('live-mic'), Flip = $('live-flip');
	let Stream = null, Recorder = null, Socket = null, Live = null, Started = 0, Clock = null, Facing = 'user', Ending = false, Retries = 0, Gifts = 0;
	const Source = () => document.querySelector('input[name="source"]:checked')?.value ?? 'camera';
	const Mime = () => ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=h264,opus', 'video/webm', 'video/mp4'].find(Type => window.MediaRecorder?.isTypeSupported?.(Type)) ?? '';
	const Stop = () => { for (const Track of Stream?.getTracks() ?? []) Track.stop(); Stream = null; };

	async function Open() {
		if (Live) return;
		Stop();
		try {
			if (Source() === 'screen') {
				Stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 30 } }, audio: true });
				if (Mic.checked) { const Voice = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null); for (const Track of Voice?.getAudioTracks() ?? []) Stream.addTrack(Track); }
			} else {
				Stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: Facing, width: { ideal: 720 }, height: { ideal: 1280 }, frameRate: { ideal: 30, max: 30 } }, audio: Mic.checked });
				Flip.hidden = (await navigator.mediaDevices.enumerateDevices()).filter(Device => Device.kind === 'videoinput').length < 2;
			}
			Preview.srcObject = Stream; Preview.style.transform = Source() === 'camera' && Facing === 'user' ? 'scaleX(-1)' : 'none'; $('live-off').hidden = true; Status.textContent = '';
		} catch (Failure) {
			$('live-off').hidden = false;
			Status.textContent = Failure?.name === 'NotAllowedError' ? 'Allow camera and microphone access in your browser to go LIVE.' : 'Couldn’t open your camera. Check that no other app is using it.';
		}
	}
	for (const Radio of document.querySelectorAll('input[name="source"]')) Radio.addEventListener('change', () => { if (Source() === 'camera') Open(); else { Stop(); Preview.srcObject = null; $('live-off').hidden = false; $('live-off').textContent = 'Your screen is picked when you go LIVE'; } });
	Mic.addEventListener('change', () => { if (Source() === 'camera') Open(); });
	Flip.addEventListener('click', () => { Facing = Facing === 'user' ? 'environment' : 'user'; Open(); });
	if (navigator.mediaDevices?.getUserMedia) Open(); else Status.textContent = 'This browser can’t go LIVE. Try a recent Chrome, Edge, Firefox or Safari.';

	const Chat = $('live-chat');
	function Line(Message) {
		const Row = document.createElement('p'); Row.className = Message.type === 'chat' ? 'msg' : 'note';
		if (Message.type === 'chat') { const Name = document.createElement('strong'); Name.textContent = Message.user.host ? `${Message.user.name} (you)` : Message.user.name; Row.append(Name, document.createTextNode(` ${Message.text}`)); }
		else Row.textContent = Message.text;
		Chat.append(Row); while (Chat.children.length > 150) Chat.firstChild.remove();
		Chat.scrollTop = Chat.scrollHeight;
	}
	function Record() {
		const Type = Mime();
		Recorder = new MediaRecorder(Stream, { ...(Type ? { mimeType: Type } : {}), videoBitsPerSecond: 2500000, audioBitsPerSecond: 96000 });
		Recorder.ondataavailable = Event => { if (Event.data.size && Socket?.readyState === 1) Socket.send(Event.data); };
		Recorder.start(1000);
	}
	function Connect() {
		Socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/live/${Live.id}?role=host`);
		Socket.onopen = () => { Retries = 0; if (Recorder?.state === 'recording') { Recorder.ondataavailable = null; Recorder.stop(); } Record(); Status.textContent = ''; };
		Socket.onmessage = Event => {
			let Message; try { Message = JSON.parse(Event.data); } catch { return; }
			if (Message.type === 'state') { $('live-viewers').textContent = Message.live.viewers; $('live-likes').textContent = Message.live.likes; for (const Item of Message.chat) Line(Item); }
			else if (Message.type === 'viewers') $('live-viewers').textContent = Message.count;
			else if (Message.type === 'likes') $('live-likes').textContent = Message.total.toLocaleString();
			else if (Message.type === 'chat') Line(Message);
			else if (Message.type === 'join') Line({ type: 'note', text: `${Message.user.name} joined` });
			else if (Message.type === 'gift') { Gifts += Message.gift.coins; $('live-gifts').textContent = Gifts.toLocaleString(); Line({ type: 'note', text: `${Message.gift.emoji} ${Message.user.name} sent a ${Message.gift.name}` }); }
			else if (Message.type === 'ready') Status.textContent = 'Viewers can see you now.';
			else if (Message.type === 'end') Finish(Message.reason);
		};
		Socket.onclose = () => {
			if (Ending || !Live) return;
			if (Retries++ < 4) { Status.textContent = 'Connection lost. Reconnecting…'; setTimeout(Connect, 1500 * Retries); }
			else Finish('HostLeft');
		};
	}
	$('live-start').addEventListener('click', async () => {
		if (!window.MediaRecorder) { Status.textContent = 'This browser can’t go LIVE. Try a recent Chrome, Edge, Firefox or Safari.'; return; }
		if (Source() === 'screen' || !Stream) await Open();
		if (!Stream) return;
		$('live-start').disabled = true; Status.textContent = 'Starting…';
		const Response = await fetch('/api/v1/live', { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': Config.csrf }, body: JSON.stringify({ title: $('live-title').value }) }).catch(() => null);
		const Data = await Response?.json().catch(() => ({}));
		if (!Response?.ok) { $('live-start').disabled = false; Status.textContent = ({ TooManyLives: 'Too many people are LIVE right now. Try again in a few minutes.', FeatureRestricted: 'Your account can’t go LIVE right now.' })[Data?.error] ?? 'Couldn’t start your LIVE. Try again.'; return; }
		Live = Data.live; Started = Date.now(); Ending = false;
		$('live-setup').hidden = true; $('live-on').hidden = false; $('live-badge').hidden = false; $('live-clock').hidden = false;
		$('live-watch').href = `/@${Config.username}/live`;
		for (const Input of document.querySelectorAll('input[name="source"], #live-mic')) Input.disabled = true;
		Clock = setInterval(() => { const Seconds = Math.floor((Date.now() - Started) / 1000); $('live-clock').textContent = `${Math.floor(Seconds / 3600) ? `${Math.floor(Seconds / 3600)}:` : ''}${String(Math.floor(Seconds / 60) % 60).padStart(Seconds >= 3600 ? 2 : 1, '0')}:${String(Seconds % 60).padStart(2, '0')}`; }, 1000);
		for (const Track of Stream.getVideoTracks()) Track.addEventListener('ended', () => End());
		Connect();
	});
	$('live-say').addEventListener('submit', Event => {
		Event.preventDefault();
		const Input = $('live-say-text');
		if (Input.value.trim() && Socket?.readyState === 1) { Socket.send(JSON.stringify({ type: 'chat', text: Input.value })); Input.value = ''; }
	});
	async function End() {
		if (!Live || Ending) return;
		Ending = true;
		try { Socket?.send(JSON.stringify({ type: 'end' })); } catch {}
		await fetch(`/api/v1/live/${Live.id}/end`, { method: 'POST', headers: { 'x-csrf-token': Config.csrf } }).catch(() => {});
		Finish('Ended');
	}
	$('live-end').addEventListener('click', () => { if (confirm('End your LIVE?')) End(); });
	async function Finish(Reason) {
		if (!Live) return;
		const Id = Live.id; Ending = true; Live = null;
		clearInterval(Clock);
		if (Recorder?.state === 'recording') { Recorder.ondataavailable = null; Recorder.stop(); }
		try { Socket?.close(); } catch {}
		Stop(); Preview.srcObject = null;
		$('live-on').hidden = true; $('live-badge').hidden = true; $('live-clock').hidden = true;
		const Summary = await fetch(`/api/v1/live/${Id}/summary`).then(Response => Response.json()).then(Data => Data.summary).catch(() => null);
		const Done = $('live-done'); Done.hidden = false; Done.replaceChildren();
		const Title = document.createElement('h2'); Title.textContent = Reason === 'HostLeft' ? 'Your LIVE ended because the connection was lost' : Reason === 'TooSlow' ? 'Your LIVE ended because your connection was too slow' : 'Your LIVE has ended';
		Done.append(Title);
		if (Summary) {
			const Tiles = document.createElement('div'); Tiles.className = 'tiles compact';
			for (const [Label, Value] of [['Length', `${Math.floor(Summary.seconds / 60)}:${String(Summary.seconds % 60).padStart(2, '0')}`], ['Viewers', Summary.viewers], ['Peak viewers', Summary.peak_viewers], ['Likes', Summary.likes], ['Gift coins', Summary.gift_coins], ['New followers', Summary.new_followers]]) {
				const Tile = document.createElement('div'); Tile.className = 'tile';
				Tile.append(Object.assign(document.createElement('span'), { className: 'tile-label', textContent: Label }), Object.assign(document.createElement('strong'), { textContent: typeof Value === 'number' ? Value.toLocaleString() : Value }));
				Tiles.append(Tile);
			}
			Done.append(Tiles);
		}
		const Again = Object.assign(document.createElement('a'), { className: 'button', href: '/tiktokstudio/live', textContent: 'Done' });
		Done.append(Again); Status.textContent = '';
	}
	window.addEventListener('beforeunload', Event => { if (Live && !Ending) { Event.preventDefault(); Event.returnValue = ''; } });
})();
