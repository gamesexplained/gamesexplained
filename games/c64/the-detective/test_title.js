#!/usr/bin/env node
// Hold the How it works page's title portraits against the game's own code. index.html's td-title
// block (tdTitleTables, tdTitleNew, tdTitleFrame) builds the title's tables and runs its cast
// introduction a frame at a time. Here the game's own routines run on the kit's simulator over the
// whole listing: title_tables ($8DC0) once, whose $0D00, $0E00 and $0F00-$117F must equal the page's;
// then, for 5,200 frames (all ten characters and the start of the eleventh), title_cast_step ($8CC8),
// the frame counters ($2AA8 with the game state 0) and title_cast_frame ($8B31), in the order the
// interrupt runs them. After every frame the phase, the character, the delay, the talking counters,
// the frame counter $1E69, the height $013D, the portrait buffer $58C0-$593E, and the sprites as the
// game leaves them (the enable bits, the two shape pointers, the two heights, the colour and the
// first multicolour) must be the same. It exits 1 on any difference.
//   node games/c64/the-detective/test_title.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { tdTitleTables, tdTitleNew, tdTitleFrame } = g.run('index.html', 'td-title', 'tdTitleTables', 'tdTitleNew', 'tdTitleFrame');
const L = g.listing();
let bad = 0, checks = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const vic = new Uint8Array(0x40);
const io = {
  read(a) { throw new Error('read $' + a.toString(16)); },
  write(a, v) { if (a >= 0xD000 && a < 0xD040) vic[a - 0xD000] = v; else throw new Error('write $' + a.toString(16)); },
};
const m = L.ram.slice(), cpu = new CPU(m, { port: 0x35, io });
m.fill(0, 0x0C00, 0x1200);
cpu.call(0x8DC0, {}, { maxSteps: 2000000 });
const T = tdTitleTables(L.ram);
for (let i = 0; i < 256; i++) {
  if (m[0x0D00 + i] !== T.d00[i]) fail('$0D00 +', i, 'game', m[0x0D00 + i], 'page', T.d00[i]);
  if (m[0x0E00 + i] !== T.e00[i]) fail('$0E00 +', i, 'game', m[0x0E00 + i], 'page', T.e00[i]);
}
for (let i = 0; i < 640; i++) if (m[0x0F00 + i] !== T.f00[i]) fail('$0F00 +', i, 'game', m[0x0F00 + i], 'page', T.f00[i]);
checks++;
// the start: no portrait yet, the counter $1E69 at 8 so that the first starts at once
const s = tdTitleNew();
m.fill(0, 0x0C00, 0x0D00); m.fill(0, 0x58C0, 0x5940);
m[0x1E66] = s.ph; m[0x1E67] = s.who; m[0x02A1] = s.d; m[0x1E4E] = s.e4e; m[0x1E4F] = s.e4f;
m[0x1E68] = s.e68; m[0x1E69] = s.e69; m[0x013D] = s.y; m[0x0F] = 0;
vic[0x15] = s.vic.en; vic[0x27] = s.vic.col; vic[0x25] = s.vic.mc0;
const seen = new Set();
for (let f = 0; f < 5200; f++) {
  cpu.call(0x8CC8, {}, { maxSteps: 100000 });
  cpu.call(0x2AA8, { x: 0 }, { maxSteps: 1000 });
  cpu.call(0x8B31, {}, { maxSteps: 100000 });
  tdTitleFrame(L.ram, T, s);
  const want = { ph: m[0x1E66], who: m[0x1E67], d: m[0x02A1], e4e: m[0x1E4E], e4f: m[0x1E4F], e69: m[0x1E69], y: m[0x013D] };
  for (const k in want) if (want[k] !== s[k]) fail('frame', f, k, 'game', want[k], 'page', s[k]);
  for (let i = 0; i < 0x7F; i++) if (m[0x58C0 + i] !== s.buf[i]) { fail('frame', f, 'buffer +', i, 'game', m[0x58C0 + i], 'page', s.buf[i]); break; }
  const v = s.vic, en = vic[0x15];
  if (en !== v.en) fail('frame', f, 'sprites on', 'game', en, 'page', v.en);
  if (en) {
    if (m[0x7FF8] !== v.p0 || vic[0x01] !== v.y0 || (vic[0x27] & 15) !== v.col || (vic[0x25] & 15) !== v.mc0)
      fail('frame', f, 'sprite 0', 'game', [m[0x7FF8], vic[0x01], vic[0x27], vic[0x25]], 'page', [v.p0, v.y0, v.col, v.mc0]);
    if (en & 2 && (m[0x7FF9] !== v.p1 || vic[0x03] !== v.y1 || (vic[0x28] & 15) !== v.col))
      fail('frame', f, 'sprite 1', 'game', [m[0x7FF9], vic[0x03], vic[0x28]], 'page', [v.p1, v.y1, v.col]);
  }
  seen.add(s.who + '/' + s.ph);
  checks++;
}
const whoSeen = new Set([...seen].map((k) => k.split('/')[0]).filter((w) => w !== '255'));
if (whoSeen.size < 10) fail('only', whoSeen.size, 'characters reached');
if (bad) { console.log(bad, 'difference(s)'); process.exit(1); }
console.log(checks - 1 + ' frames, ' + whoSeen.size + ' characters and ' + seen.size + ' phases: the tables, the portrait and the sprites match the game\'s own code at every one');
