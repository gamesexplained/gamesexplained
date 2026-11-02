#!/usr/bin/env node
// Hold the How it works page's flight over the theatres to the game. index.html's gs-fly block
// (gsFlyMemory, gsFlyView) runs the flight's own view_frame ($8F01) on the kit's 6502. With the
// flight's listing, Western Europe's bytes and the eye where the recorded cockpit frame
// (GS_COCKPIT) had it (x $3F00, y $B000, height $09E4, heading, pitch and roll 0), the window it
// draws into the bitmap at $6000 must be the frame's window byte for byte: the 12 rows of 32
// cells, 3,072 bytes, that clear_window clears. Each of the five theatres must then draw a view at
// its start with the helicopter's square among the nine drawn; facing each eighth of the compass
// the nine squares must make a block of three by three around it; and the gs-levels block the page
// carries for its map must be the Maps page's (levels.html). It exits 1 on any difference.
//   node games/c64/gunship/test_fly.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
const f = g.run(page, 'gs-fly', 'gsFlyMemory', 'gsFlyView', 'GS_COCKPIT', 'GS_VIEWS');
const { GS_THEATRES } = g.run(page, 'gs-levels', 'GS_THEATRES');
g.sameBlock('gs-levels', page, 'levels.html');
const L = g.listing('parts/flight/listing.json');
const shown = new Uint8Array(0x10000);
for (const x of f.GS_COCKPIT.ram) shown.set(Uint8Array.from(Buffer.from(x.b, 'base64')), x.a);
const io = () => { const r = new Uint8Array(0x1000); return { read: (a) => r[a & 0xFFF], write: (a, v) => { r[a & 0xFFF] = v; } }; };
const WINDOW = [];
for (let row = 1; row <= 12; row++) for (let i = 0; i < 256; i++) WINDOW.push(0x6000 + row * 320 + 32 + i);
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const view = (id) => { const t = GS_THEATRES.find((x) => x.id === id); return f.gsFlyMemory(L.ram, f.GS_COCKPIT, t, f.GS_VIEWS.find((v) => v.id === id)); };
const we = view('we');
for (const a of WINDOW) we.m[a] = 0x55;
f.gsFlyView(new kit.CPU(we.m, { port: 0x35, io: io() }), we.m, { x: 0x3F00, y: 0xB000, height: 0x09E4, heading: 0, pitch: 0, roll: 0 });
for (const a of WINDOW) if (we.m[a] !== shown[a]) fail('bitmap byte', a.toString(16), we.m[a], 'where the frame has', shown[a]);
if (f.GS_VIEWS.length !== GS_THEATRES.length) fail(f.GS_VIEWS.length, 'views for', GS_THEATRES.length, 'theatres');
for (const t of GS_THEATRES) {
  // drawn twice, over a window of $00 and one of $FF: every byte must come out the same
  const drawn = [0x00, 0xFF].map((fill) => {
    const w = view(t.id);
    for (const a of WINDOW) w.m[a] = fill;
    const r = f.gsFlyView(new kit.CPU(w.m, { port: 0x35, io: io() }), w.m, { ...w.start, height: 0, pitch: 0, roll: 0 });
    const sq = ((w.start.y + 0x800) >> 12) << 4 | (w.start.x + 0x800) >> 12;
    if (!r.squares.includes(sq)) fail(t.id, 'the start square', sq.toString(16), 'is not among', r.squares.map((s) => s.toString(16)).join(' '));
    return WINDOW.map((a) => w.m[a]);
  });
  const left = drawn[0].filter((v, i) => v !== drawn[1][i]).length;
  if (left) fail(t.id, left, 'bytes of the window left undrawn');
}
// facing each eighth of the compass, the nine squares are a block of three by three with the
// helicopter's square in it (the listing's tables at $8281 and $82D9 hold all eight lists of nine)
for (let e = 0; e < 8; e++) {
  const w = view('we'), at = { x: 0x7000, y: 0x7000, height: 30, heading: e * 32, pitch: 0, roll: 0 };
  const sq = f.gsFlyView(new kit.CPU(w.m, { port: 0x35, io: io() }), w.m, at).squares;
  const rows = sq.map((s) => s >> 4), cols = sq.map((s) => s & 15);
  const block = new Set(sq).size === 9 && Math.max(...rows) - Math.min(...rows) === 2 && Math.max(...cols) - Math.min(...cols) === 2;
  if (!block || !sq.includes(0x77)) fail('heading', e * 32, 'draws the squares', sq.map((s) => s.toString(16)).join(' '));
}
console.log(`${WINDOW.length} window bytes against the recorded frame, ${GS_THEATRES.length} theatres: ` + (bad ? bad + ' differences' : 'view_frame draws the frame\'s view byte for byte'));
process.exit(bad ? 1 : 0);
