'use strict';
// A machine's (or a port's) screen as a PNG, through site/lib/c64.js's renderFrame.
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const REPO = path.resolve(__dirname, '../../../..');
require(path.join(REPO, 'site/lib/c64.js'));
const C64 = globalThis.C64;
function png(file, w, h, rgba) {
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xFFFFFFFF; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
function frame(ram, vic, colour) {
  const v = Array.from(vic.slice(0, 47));
  return C64.renderFrame({ vic: v, cia2: [0xC7, 0x3F], writes: [], ram: [{ a: 0, b: ram }], colour });
}
function shot(file, ram, vic, colour) {
  const r = frame(ram, vic, colour), rgb = C64.PAL.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
  const out = new Uint8Array(r.w * r.h * 4);
  for (let i = 0; i < r.w * r.h; i++) { const c = rgb[r.px[i]]; out.set([c[0], c[1], c[2], 255], i * 4); }
  png(file, r.w, r.h, out);
}
module.exports = { shot, frame, png };
