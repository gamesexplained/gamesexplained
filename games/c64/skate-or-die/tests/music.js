// Checks reference/sod-music.js against the game: an event runs in kit/c64/machine.js from a snapshot
// with no input and its music playing; the page's driver starts from the same memory and runs once a
// frame. Every SID write, in order, must match.
// node tests/music.js <event> <snapshot.vsf> [frames] [--listing]
//   highjump: work/highjump-play.vsf, the skater waiting on the platform
//   ramp, downhill, jam, joust: the event a moment after its music starts, in practice
//   (the joust's after Poseur Pete is chosen)
const kit = __dirname + '/../../../../kit/c64/';
const { Machine } = require(kit + 'machine.js');
const { readSnapshot } = require(kit + 'cpu6502.js');
const SODMUSIC = require(__dirname + '/../reference/sod-music.js');
const [ev, snap, nfA] = process.argv.slice(2).filter(a => a !== '--listing'), nf = +(nfA || 9000);
if (!SODMUSIC.at[ev] || !snap) { console.log('usage: node tests/music.js <event> <snapshot.vsf> [frames]; events: ' + Object.keys(SODMUSIC.at).join(', ')); process.exit(2); }
const s = readSnapshot(snap);
const m = new Machine({ ram: s.ram, pc: s.regs.pc, port: { dir: s.port.dir, data: s.port.data }, cia: true, vic: ev === 'highjump' ? undefined : s.vic });
m.cpu.setRegs(s.regs); m.sidLog = [];
if (ev === 'highjump') { m.enable = 1; m.cmp = 0; }
// The Jam's band 0 rewrites $D011 from its own read ($22E7). The simulator's interrupts come later in
// the frame than VICE's, the read can catch raster bit 8 set, and the compare line goes past the frame
// and every band stops. In VICE the bands keep running, so bit 7 is kept out of those writes here.
if (ev === 'jam') { const w = m.ioWrite.bind(m); m.ioWrite = (a, v) => w(a, a === 0xD011 ? v & 0x7F : v); }
// A snapshot stopped on the game's own queue_sound_id call starts the page there too, with the same ID.
const atQueue = s.regs.pc === SODMUSIC.at[ev].queue;
// With --listing, the page's driver starts as music.html starts it: from the part's listing with the
// random state put back to the disk's, through init_sound_driver and queue_sound_id.
const L = process.argv.includes('--listing') && ev !== 'highjump';
const SEEDS = { ramp: [0xE13B, 0x99, 0xC1, 0x03], downhill: [0x7638, 0x38, 0xF4, 0x01], jam: [0xAB3E, 0x0B, 0x11, 0x4C], joust: [0x3493, 0x00, 0xFF, 0x00] };
let bytes = s.ram.slice(0);
if (L) {
  bytes = new Uint8Array(0x10000);
  for (const r of require(__dirname + '/../parts/' + ev + '/listing.json').records) (r.b || []).forEach((b, i) => { bytes[r.a + i] = b; });
  const [a, ...v] = SEEDS[ev]; bytes.set(v, a);
}
const d = SODMUSIC.createDriver({ base: 0, bytes, ids: [atQueue ? s.regs.a : 1], resume: L ? false : atQueue ? 'queue' : true, at: SODMUSIC.at[ev] });
d.init(0);
const game = [], page = [];
for (let f = 0; f < nf; f++) {
  m.joy1 = 0x1F; m.joy = 0x1F; m.runFrames(1);
  d.play(); const w = d.writes; for (let i = 0; i < w.length; i += 2) page.push(w[i] << 8 | w[i + 1]);
}
for (const [, reg, val] of m.sidLog) if (reg <= 0x18) game.push(reg << 8 | val);
let n = Math.min(game.length, page.length), bad = -1;
for (let i = 0; i < n; i++) if (game[i] !== page[i]) { bad = i; break; }
console.log(`${ev}, ${nf} frames: game ${game.length} SID writes, page ${page.length}; ` +
  (bad < 0 ? `the first ${n} match` : `first difference at write ${bad}: game ${game[bad].toString(16)} page ${page[bad].toString(16)}`));
process.exit(bad < 0 && n > 1000 && (ev === 'jam' || Math.abs(game.length - page.length) < 40) ? 0 : 1);
