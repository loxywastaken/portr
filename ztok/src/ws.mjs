// A small WebSocket server endpoint (RFC 6455) for LIVE: text frames for chat and events, binary frames for
// the host's camera stream. Returns { Text, Binary, Close } to send on the socket.
import { createHash } from 'node:crypto';

const Guid = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function Frame(Opcode, Payload) {
	const Length = Payload.length;
	const Header = Length < 126 ? Buffer.from([0x80 | Opcode, Length]) : Length < 65536 ? Buffer.from([0x80 | Opcode, 126, Length >> 8, Length & 255])
		: Buffer.concat([Buffer.from([0x80 | Opcode, 127]), (() => { const Size = Buffer.alloc(8); Size.writeBigUInt64BE(BigInt(Length)); return Size; })()]);
	return Buffer.concat([Header, Payload]);
}

export function Accept(Request, Socket, { MaxPayload = 65536, Timeout = 60000, OnText = () => {}, OnBinary = () => {}, OnClose = () => {} }) {
	const Key = Request.headers['sec-websocket-key'];
	if (!Key || Request.headers.upgrade?.toLowerCase() !== 'websocket') { Socket.end('HTTP/1.1 400 Bad Request\r\nconnection: close\r\n\r\n'); return null; }
	Socket.write(['HTTP/1.1 101 Switching Protocols', 'upgrade: websocket', 'connection: Upgrade', `sec-websocket-accept: ${createHash('sha1').update(Key + Guid).digest('base64')}`, '', ''].join('\r\n'));
	Socket.setNoDelay(true);
	let Buffered = Buffer.alloc(0), Fragments = [], FragmentOpcode = 0, Closed = false;
	const Send = (Opcode, Payload) => { if (!Closed && !Socket.destroyed && Socket.writable) Socket.write(Frame(Opcode, Payload)); };
	const Close = () => { if (Closed) return; Closed = true; Socket.destroy(); OnClose(); };
	const Api = {
		Text: Value => Send(1, Buffer.from(typeof Value === 'string' ? Value : JSON.stringify(Value))),
		Binary: Bytes => Send(2, Bytes),
		Close: (Code = 1000) => { const Payload = Buffer.alloc(2); Payload.writeUInt16BE(Code); Send(8, Payload); Close(); },
		get Pending() { return Socket.writableLength; },
	};
	Socket.setTimeout(Timeout, Close);
	Socket.on('error', Close);
	Socket.on('close', Close);
	Socket.on('data', Chunk => {
		Buffered = Buffered.length ? Buffer.concat([Buffered, Chunk]) : Chunk;
		while (Buffered.length >= 2) {
			const Fin = Buffered[0] & 0x80, Opcode = Buffered[0] & 0x0f, Masked = Buffered[1] & 0x80;
			let Length = Buffered[1] & 0x7f, Offset = 2;
			if (Length === 126) { if (Buffered.length < 4) return; Length = Buffered.readUInt16BE(2); Offset = 4; }
			else if (Length === 127) { if (Buffered.length < 10) return; const Big = Buffered.readBigUInt64BE(2); if (Big > BigInt(MaxPayload)) return Close(); Length = Number(Big); Offset = 10; }
			if (!Masked || Length > MaxPayload) return Close();
			if (Buffered.length < Offset + 4 + Length) return;
			const Mask = Buffered.subarray(Offset, Offset + 4);
			const Payload = Buffer.from(Buffered.subarray(Offset + 4, Offset + 4 + Length));
			for (let Index = 0; Index < Payload.length; Index++) Payload[Index] ^= Mask[Index & 3];
			Buffered = Buffered.subarray(Offset + 4 + Length);
			if (Opcode === 8) { Send(8, Payload.subarray(0, 2)); return Close(); }
			if (Opcode === 9) { Send(10, Payload); continue; }
			if (Opcode === 10) continue;
			if (Opcode === 0 || !Fin) {
				if (Opcode !== 0) FragmentOpcode = Opcode;
				Fragments.push(Payload);
				if (Fragments.reduce((Sum, Part) => Sum + Part.length, 0) > MaxPayload) return Close();
				if (!Fin) continue;
			}
			const Message = Fragments.length ? Buffer.concat(Fragments) : Payload;
			const Kind = Fragments.length ? FragmentOpcode : Opcode;
			Fragments = [];
			try {
				if (Kind === 1) { let Value; try { Value = JSON.parse(Message.toString('utf8')); } catch { continue; } OnText(Value); }
				else if (Kind === 2) OnBinary(Message);
			} catch { Close(); return; }
		}
	});
	return Api;
}
