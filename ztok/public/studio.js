// ztok Studio: local times, chart hover, cover pickers, scheduling and the upload flow.
(() => {
	const Pad = Value => String(Value).padStart(2, '0');
	const LocalInput = Date_ => `${Date_.getFullYear()}-${Pad(Date_.getMonth() + 1)}-${Pad(Date_.getDate())}T${Pad(Date_.getHours())}:${Pad(Date_.getMinutes())}`;

	// Times arrive in UTC; show them in the reader's own time zone.
	for (const Time of document.querySelectorAll('time[data-local]')) {
		const Value = new Date(Time.dateTime);
		Time.textContent = Time.dataset.local === 'date' ? Value.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : Value.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
	}

	// Charts: a crosshair snaps to the nearest day; arrow keys move it too.
	for (const Figure of document.querySelectorAll('.chart')) {
		const Data = JSON.parse(Figure.querySelector('.chart-data').textContent);
		const Area = Figure.querySelector('.chart-area'), Cross = Figure.querySelector('.chart-cross'), Tip = Figure.querySelector('.chart-tip'), Dot = Figure.querySelector('.chart-dot');
		const Top = Data.top || 1;
		let Index = Data.values.length - 1;
		const Show = Value => {
			Index = Math.min(Math.max(Value, 0), Data.values.length - 1);
			const X = Data.values.length < 2 ? 50 : Index / (Data.values.length - 1) * 100;
			Cross.hidden = Tip.hidden = false; Cross.style.left = `${X}%`;
			Dot.style.left = `${X}%`; Dot.style.bottom = `${Math.min(100, Data.values[Index] / Top * 100)}%`;
			Tip.replaceChildren();
			const Strong = document.createElement('strong'); Strong.textContent = Data.values[Index].toLocaleString();
			const Label = document.createElement('span'); const Key = document.createElement('span'); Key.className = 'key'; Label.append(Key, document.createTextNode(Data.label));
			const Day = document.createElement('div'); Day.textContent = new Date(`${Data.days[Index]}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
			Tip.append(Strong, Label, Day);
			const Width = Area.clientWidth, Half = Tip.offsetWidth / 2, Pixel = X / 100 * Width;
			Tip.style.left = `${Math.min(Math.max(Pixel, Half), Width - Half)}px`;
		};
		const Hide = () => { Cross.hidden = Tip.hidden = true; Index = Data.values.length - 1; Dot.style.left = `${Data.values.length < 2 ? 50 : 100}%`; Dot.style.bottom = `${Math.min(100, (Data.values.at(-1) ?? 0) / Top * 100)}%`; };
		Area.addEventListener('pointermove', Event => { const Box = Area.getBoundingClientRect(); Show(Math.round((Event.clientX - Box.left) / Box.width * (Data.values.length - 1))); });
		Area.addEventListener('pointerleave', Hide);
		Figure.addEventListener('keydown', Event => {
			if (Event.key === 'ArrowLeft' || Event.key === 'ArrowRight') { Event.preventDefault(); Show(Cross.hidden ? Data.values.length - 1 : Index + (Event.key === 'ArrowLeft' ? -1 : 1)); }
			if (Event.key === 'Escape') Hide();
		});
		Figure.addEventListener('blur', Hide);
	}

	// Caption counters.
	for (const Text of document.querySelectorAll('textarea[data-count]')) {
		const Count = Text.parentElement.querySelector('.count');
		const Update = () => { if (Count) Count.textContent = `${Text.value.length} / ${Text.maxLength}`; };
		Text.addEventListener('input', Update); Update();
	}

	// Destructive forms ask first.
	for (const Form of document.querySelectorAll('form[data-confirm]')) Form.addEventListener('submit', Event => { if (!confirm(Form.dataset.confirm)) Event.preventDefault(); });
	for (const Select of document.querySelectorAll('select[data-autosubmit]')) Select.addEventListener('change', () => Select.form.requestSubmit(Select.form.querySelector('[name="filter"][aria-current]') ?? undefined));

	// Cover pickers scrub the video to the chosen frame.
	for (const Range of document.querySelectorAll('input[data-cover-for]')) {
		Range.addEventListener('input', () => { const Video = document.querySelector(Range.dataset.coverFor); if (Video?.readyState) { Video.pause(); Video.currentTime = Number(Range.value); } });
	}

	// Scheduling: show the date field only when Schedule is picked, and send the time as UTC.
	function When(Form) {
		const Local = Form.querySelector('input[name="publish_local"]'), Hidden = Form.querySelector('input[name="publish_at"]');
		if (!Local) return () => null;
		const Soonest = () => new Date(Date.now() + 16 * 60000);
		Local.min = LocalInput(Soonest()); Local.max = LocalInput(new Date(Date.now() + 30 * 86400000));
		if (Local.dataset.iso) Local.value = LocalInput(new Date(Local.dataset.iso));
		const Sync = () => {
			const Mode = Form.querySelector('input[name="when"]:checked')?.value;
			Local.hidden = Mode !== 'schedule'; Local.required = Mode === 'schedule';
			if (Mode === 'schedule' && !Local.value) Local.value = LocalInput(new Date(Soonest().getTime() + 45 * 60000));
			for (const Note of Form.querySelectorAll('small[data-for]')) Note.hidden = Note.dataset.for !== Mode;
		};
		for (const Radio of Form.querySelectorAll('input[name="when"]')) Radio.addEventListener('change', Sync);
		Sync();
		const Iso = () => Local.value ? new Date(Local.value).toISOString() : '';
		Form.addEventListener('submit', () => { if (Hidden) Hidden.value = Iso(); });
		return Iso;
	}
	for (const Form of document.querySelectorAll('.details-form')) When(Form);

	// Upload
	const Form = document.getElementById('upload');
	if (!Form) return;
	const Status = document.getElementById('status'), Config = JSON.parse(document.getElementById('upload-config').textContent);
	const Input = Form.elements.video, Zone = document.getElementById('drop-zone'), Preview = document.getElementById('video-preview');
	const Progress = document.getElementById('upload-progress'), Posted = document.getElementById('posted-link'), Picker = document.getElementById('cover-picker');
	const Change = document.getElementById('change-video'), Name = document.getElementById('file-name'), Cover = Form.elements.cover_time, PostButton = document.getElementById('post-button');
	const Iso = When(Form);
	let Selected, PreviewUrl, Busy = false;
	const Label = () => { const Mode = Form.querySelector('input[name="when"]:checked')?.value; PostButton.textContent = Mode === 'schedule' ? 'Schedule' : Mode === 'story' ? 'Share to story' : 'Post'; document.getElementById('save-draft').hidden = Mode === 'story'; };
	for (const Radio of Form.querySelectorAll('input[name="when"]')) Radio.addEventListener('change', Label);
	Label();
	function SetFile(File) {
		if (!File) return;
		if (!File.type.startsWith('video/') && !/\.(mp4|mov|webm|m4v)$/i.test(File.name)) { Status.textContent = 'That isn’t a video file.'; return; }
		if (Config.maxBytes && File.size > Config.maxBytes) { Status.textContent = `This video is over ${Math.round(Config.maxBytes / 1048576)} MB.`; return; }
		Selected = File;
		if (PreviewUrl) URL.revokeObjectURL(PreviewUrl);
		PreviewUrl = URL.createObjectURL(File); Preview.src = PreviewUrl; Preview.hidden = false; Zone.hidden = true; Change.hidden = false; Input.required = false;
		Name.textContent = File.name; Status.textContent = ''; Posted.hidden = true;
	}
	Preview.addEventListener('loadedmetadata', () => {
		if (Preview.duration > Config.maxSeconds + 1) Status.textContent = `This video is longer than ${Math.floor(Config.maxSeconds / 60)}:${String(Config.maxSeconds % 60).padStart(2, '0')}; the rest will be cut.`;
		Cover.max = Math.max(0, Math.min(Preview.duration, Config.maxSeconds) - 0.1).toFixed(2); Cover.value = 0; Picker.hidden = false;
	});
	Input.addEventListener('change', () => SetFile(Input.files[0]));
	Zone.addEventListener('keydown', Event => { if (['Enter', ' '].includes(Event.key)) { Event.preventDefault(); Input.click(); } });
	Zone.addEventListener('dragover', Event => { Event.preventDefault(); if (!Busy) Zone.classList.add('drag-over'); });
	Zone.addEventListener('dragleave', () => Zone.classList.remove('drag-over'));
	Zone.addEventListener('drop', Event => { Event.preventDefault(); Zone.classList.remove('drag-over'); if (!Busy) SetFile(Event.dataTransfer.files[0]); });
	Change.addEventListener('click', () => Input.click());
	function Reset() {
		if (PreviewUrl) URL.revokeObjectURL(PreviewUrl); PreviewUrl = null; Selected = null;
		Preview.removeAttribute('src'); Preview.hidden = true; Zone.hidden = false; Change.hidden = true; Picker.hidden = true; Input.required = true; Name.textContent = '';
		Progress.hidden = true; Progress.value = 0;
		setTimeout(() => { Form.querySelector('textarea[data-count]').dispatchEvent(new Event('input')); Form.querySelector('input[name="when"]:checked')?.dispatchEvent(new Event('change')); });
	}
	Form.addEventListener('reset', Event => { if (Busy) { Event.preventDefault(); return; } Reset(); Status.textContent = ''; Posted.hidden = true; });
	function Send(Mode) {
		if (Busy) return;
		const File = Selected ?? Input.files[0];
		if (!File) { Status.textContent = 'Select a video first.'; return; }
		const When_ = Form.querySelector('input[name="when"]:checked')?.value ?? 'now';
		if (Mode === 'post' && When_ === 'schedule') {
			const At = Iso();
			if (!At) { Status.textContent = 'Pick a date and time to schedule.'; return; }
			if (new Date(At).getTime() - Date.now() < 15 * 60000) { Status.textContent = 'Scheduled posts need to be at least 15 minutes from now.'; return; }
			Mode = 'schedule';
		}
		const Story = Mode === 'post' && When_ === 'story';
		Busy = true; const Controls = [...Form.querySelectorAll('button,input,textarea,select')]; Controls.forEach(Control => { Control.disabled = true; });
		Status.textContent = 'Uploading…'; Progress.hidden = false; Progress.value = 0;
		const Query = new URLSearchParams({ description: Form.elements.description.value, visibility: Form.elements.visibility.value, comments: Form.elements.comments.value, category: Form.elements.category.value, story: Story ? '1' : '0', cover_time: Cover.value || '0', mode: Mode, ...(Mode === 'schedule' ? { publish_at: Iso() } : {}) });
		const Request = new XMLHttpRequest(); Request.open('POST', '/api/v1/videos?' + Query);
		Request.setRequestHeader('content-type', File.type || 'video/mp4'); Request.setRequestHeader('x-csrf-token', Config.csrf);
		Request.upload.onprogress = Event => { if (Event.lengthComputable) Progress.value = Event.loaded / Event.total * 100; if (Event.loaded === Event.total) Status.textContent = 'Processing video…'; };
		Request.onload = () => {
			let Result; try { Result = JSON.parse(Request.responseText); } catch {}
			if (Request.status < 200 || Request.status >= 300 || !(Result?.id || Result?.draft)) {
				Status.textContent = ({ VideoTooLarge: 'This video is too large.', UnsupportedVideo: 'This video format or length isn’t supported.', UploadsBusy: 'Lots of uploads right now. Try again in a minute.', ScheduleTooSoon: 'Scheduled posts need to be at least 15 minutes from now.', ScheduleTooLate: 'You can schedule up to 30 days ahead.', TryLater: 'You’ve uploaded a lot this hour. Try again later.' })[Result?.error] ?? Result?.error ?? 'Couldn’t upload. Try again.';
				return;
			}
			Busy = false; Form.reset();
			if (Result.draft) {
				Status.textContent = Mode === 'schedule' ? 'Scheduled. It will post at the time you picked.' : 'Saved to drafts.';
				Posted.href = Mode === 'schedule' ? '/tiktokstudio/content?tab=scheduled' : `/tiktokstudio/drafts/${Result.draft}`; Posted.textContent = Mode === 'schedule' ? 'See scheduled posts' : 'Open draft';
			} else {
				Status.textContent = Story ? 'Your story has been posted. It disappears after 24 hours.' : 'Your video has been posted.';
				Posted.href = Story ? `/@${Config.username}` : `/@${Config.username}/video/${Result.id}`; Posted.textContent = Story ? 'View profile' : 'View video';
			}
			Posted.hidden = false;
		};
		Request.onerror = () => { Status.textContent = 'Connection lost. Try again.'; };
		Request.onloadend = () => { Busy = false; Controls.forEach(Control => { Control.disabled = false; }); };
		Request.send(File);
	}
	Form.addEventListener('submit', Event => { Event.preventDefault(); Send('post'); });
	document.getElementById('save-draft').addEventListener('click', () => Send('draft'));
	window.addEventListener('beforeunload', Event => { if (Busy) { Event.preventDefault(); Event.returnValue = ''; } });
})();
