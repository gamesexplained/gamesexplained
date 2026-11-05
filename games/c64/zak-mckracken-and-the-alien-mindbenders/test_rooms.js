'use strict';
// Holds the Maps tab's room decoder (the zk-room block of levels.html) against the game's own
// decoder, decode_start ($0104) and decode_byte ($0122), run in the kit's 6502 simulator on the
// listing's memory: every byte of every stream the page carries, each room's character set, its
// characters, colours, mask and mask characters, and every object's picture. Then draws room 1
// with the objects drawn in the bedroom frame graphics.html carries (zk-frame-data) and compares each
// cell's character, colour and character shape with the screen the emulator recorded.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
const { zkDecoder, zkBytes, zkRoomCells } = g.run('levels.html', 'zk-room', 'zkDecoder', 'zkBytes', 'zkRoomCells');
g.lib('cpu6502');
const C64Cpu = globalThis.C64Cpu;
const L = g.listing();
const page = g.read('levels.html');
const m = /<script type="application\/json" id="zk-rooms">([\s\S]*?)<\/script>/.exec(page);
if (!m) throw new Error('levels.html has no zk-rooms data');
const ROOMS = JSON.parse(m[1]);
if (ROOMS.length !== 58) throw new Error(`levels.html carries ${ROOMS.length} rooms, not 58`);

const AT = 0x8000;                       // where the stream is put: RAM, clear of the decoder's page and zero page
let streams = 0, bytes = 0;
function check(what, s, n, from) {
  const b = zkBytes(s), mem = L.ram.slice();
  mem.set(b, AT);
  const cpu = new C64Cpu.CPU(mem, { port: 0x35, io: { read(a) { throw new Error(`read $${a.toString(16)}`); }, write(a) { throw new Error(`write $${a.toString(16)}`); } } });
  const at = AT + (from || 0);
  mem[0x26] = at & 255; mem[0x27] = at >> 8;
  cpu.call(0x0104, {}, { maxSteps: 100 });
  const d = zkDecoder(b, from || 0);
  for (let i = 0; i < n; i++) {
    cpu.call(0x0122, { y: i & 255 }, { maxSteps: 200 });
    const want = cpu.a, got = d();
    if (want !== got) throw new Error(`${what}: byte ${i} of ${n} is $${got.toString(16)} on the page and $${want.toString(16)} from decode_byte`);
    if (cpu.y !== (i & 255)) throw new Error(`${what}: decode_byte changed Y`);
  }
  const used = (mem[0x26] | mem[0x27] << 8) - at;
  if (used > b.length - (from || 0)) throw new Error(`${what}: decode_byte read ${used} bytes, past the ${b.length} the page carries`);
  streams++; bytes += n;
}
for (const R of ROOMS) {
  const n = R.w * R.h;
  check(`room ${R.n} character set`, R.cs, 2048);
  check(`room ${R.n} characters`, R.pic, n);
  check(`room ${R.n} colours`, R.col, n);
  check(`room ${R.n} mask`, R.mask, n);
  check(`room ${R.n} mask characters`, R.mch, R.mn, 2);
  for (const o of R.objs) if (o[4] && o[5]) check(`room ${R.n} object ${o[0]}`, o[9], 3 * o[4] * o[5]);
}
console.log(`zk-room: ${streams} streams, ${bytes.toLocaleString('en')} bytes, decoded as decode_byte decodes them`);

// The bedroom as the emulator showed it: the frame graphics.html draws
const gp = g.read('graphics.html');
const f = /<script type="application\/json" id="zk-frame-data">([\s\S]*?)<\/script>/.exec(gp);
if (!f) throw new Error('graphics.html has no zk-frame-data');
const F = JSON.parse(f[1]);
const ram = new Uint8Array(65536);
for (const r of F.ram) ram.set(zkBytes(r.b), r.a);
const colour = zkBytes(F.colour);         // colour RAM, $D800-$DBFF, a byte a cell
const R = ROOMS[0];
const drawn = R.objs.map((o) => F.drawn.includes(o[0]));
const c = zkRoomCells(R, drawn);
const SCREEN = 0xC800, ROW = 2;          // the room's 16 rows start on the screen's third row ($C850)
let cells = 0;
for (let y = 0; y < 16; y++) for (let x = 0; x < 40; x++) {
  const o = (ROW + y) * 40 + x, ch = c.chr[y * 40 + x];
  if (ram[SCREEN + o] !== ch) throw new Error(`bedroom: cell ${x},${y} is character ${ch} on the page and ${ram[SCREEN + o]} on the screen`);
  if ((colour[o] & 15) !== (c.col[y * 40 + x] & 15)) throw new Error(`bedroom: cell ${x},${y}'s colour is ${c.col[y * 40 + x] & 15} on the page and ${colour[o] & 15} on the screen`);
  for (let r = 0; r < 8; r++) if (ram[0xD800 + ch * 8 + r] !== c.cs[ch * 8 + r]) throw new Error(`bedroom: character ${ch} row ${r} differs from the screen's character set`);
  cells++;
}
console.log(`zk-room: the bedroom's ${cells} cells, their colours and their characters' shapes match the frame the emulator recorded, with objects ${F.drawn.join(', ')} drawn`);
