#!/usr/bin/env node
// Hold index.html's widgets against the game's own code, run on the kit's 6502 over the listings.
// - lnr-title: each level's title card, drawn by its own DrawTitleCard ($4E00) and painted by
//   C64.renderFrame, against the emulator. The fingerprints below are of the pixels VICE's state
//   gives with each card on show (the level's title.vsf: memory, colour RAM and the video chip's
//   registers, painted the same way): the play window for every level, and the whole screen for
//   Central Park, the first card of a new game, where the panel still shows what a new game starts
//   with. Later cards show the score, clock and energy of the game that was played to reach them.
// - lnr-sprite: every packed sprite of Central Park, the main pool and the two weapon groups,
//   unpacked by the port and by DecodeSpriteMaskRle63 ($BF3F), byte for byte, with the count of
//   packed bytes read.
// - lnr-meter: lnrMeter against RebuildEnemyMeterFromElapsedTicks ($B3D6) for the tick now and the
//   tick the enemy fell, over every boundary of the result and the counter's wrap; lnrSpiral against
//   the engine's interrupt code ($1E67-$1EC1) for every energy, counted up from 0 and down from 44.
// - lnr-code: lnrCode against The Basement's CopyClockToCode ($B9B2) for all 3,600 minutes and
//   seconds.
// It exits 1 on any difference.
//   node games/c64/last-ninja-remix/test_index.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
g.lib('cpu6502');
g.lib('c64');
const { lnrTitle } = g.run(page, 'lnr-title', 'lnrTitle');
const { lnrUnpack, lnrSprites } = g.run(page, 'lnr-sprite', 'lnrUnpack', 'lnrSprites');
const { lnrMeter, lnrSpiral } = g.run(page, 'lnr-meter', 'lnrMeter', 'lnrSpiral');
const { lnrSetClock, lnrCode } = g.run(page, 'lnr-code', 'lnrSetClock', 'lnrCode');
const L = (part) => g.listing(`parts/${part}/listing.json`);
const E = L('engine');
const Z = { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 };
let bad = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };

// --- the title cards
const WINDOW = {
  'central-park': '80d6fa39', street: '36e13ee5', sewers: 'f0eeee93', basement: 'bc425563',
  office: 'e5775d7f', mansion: '41b0e577', 'final-battle': 'f904c2b3' };
const SCREEN = { 'central-park': 'cccffcbd' };
const fnv = (px) => { let h = 0x811c9dc5; for (const v of px) { h ^= v; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, '0'); };
function picture(F, w, h) {      // palette indices of the top left w by h pixels of the screen
  const r = C64.renderFrame(F), o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y * w + x] = r.px[(y + 35) * r.w + x + 32];
  return o;
}
let cards = 0;
for (const [id, want] of Object.entries(WINDOW)) {
  const F = lnrTitle(E, L(id + '-title'));
  F.vic[0x15] = 0;
  const got = fnv(picture(F, 240, 144)), screen = SCREEN[id] && fnv(picture(F, 320, 200));
  if (got !== want) fail('title card', id, 'window', got, 'where the emulator gives', want);
  else if (screen && screen !== SCREEN[id]) fail('title card', id, 'screen', screen, 'where the emulator gives', SCREEN[id]);
  else cards++;
}

// --- the sprites
const P = L('central-park'), list = lnrSprites(P.ram, P);
if (list.length !== 242) fail('sprites', list.length, 'listed, 242 expected');
let sprites = 0, packed = 0;
for (const s of list) {
  const m = P.ram.slice();
  m[0x06] = s.at & 0xFF; m[0x07] = s.at >> 8;
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x34 } });     // RAM under the I/O, where some sprites are
  cpu.call(P.sym('DecodeSpriteMaskRle63'), Z, { maxSteps: 10000 });
  const u = lnrUnpack(P.ram, s.at), want = m.subarray(0x02C0, 0x02FF);
  if (want.join() !== u.bytes.join() || cpu.y !== (u.used & 0xFF) || m[0x02FF] !== P.ram[0x02FF]) fail('sprite', s.group, s.n, 'at', s.at.toString(16));
  else sprites++;
  packed += u.used;
}

// --- the enemy's energy
const meter = P.sym('RebuildEnemyMeterFromElapsedTicks');
const ticks = new Set();
for (let k = 0; k < 64; k++) for (const d of [0, 1, 31]) ticks.add(32 * k + d);
for (const d of [8191, 8192, 8193, 32767, 32768, 65503, 65535]) ticks.add(d);
let meters = 0;
for (const d of ticks) for (const then of [0, 0x00FF, 0x0100, 0x7FE0, 0xFFE0, 0xFFFF, 0x1234, 0xABCD, 0x5555, 0xC0DE, 0x0F0F, 0xF00F, 0x8000, 0x7FFF, 0x00F0, 0xFF00, 0x0001, 0x4321, 0x9999, 0xEEEE, 0x2222, 0x3333]) {
  const now = (then + d) & 0xFFFF, m = P.ram.slice(), x = 7;
  m[0xA2] = x; m[0xE2] = now & 0xFF; m[0xF0] = now >> 8; m[0x0175 + x] = then & 0xFF; m[0x0187 + x] = then >> 8;
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 } });
  cpu.call(meter, Z, { maxSteps: 1000 });
  const v = lnrMeter(now, then);
  if (m[0x022A] !== v || cpu.a !== v) fail('meter', 'now', now, 'then', then, 'game', m[0x022A], 'port', v);
  meters++;
}
const cells = E.bytes(E.sym('enemy_energy_spiral_cells'), 44), both = E.ram[0x1E8F], dim = E.ram[0x1EB0];
let spirals = 0;
for (const from of [0, 44]) for (let v = 0; v <= 44; v++) {
  const m = E.ram.slice();
  for (const [off, b] of lnrSpiral(from, cells, dim, both)) m[0x06FA + off] = b;
  m[0x022B] = m[0x0229] = 44; m[0x022C] = from; m[0x022A] = v;      // the player's spiral full and still
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 } });
  for (let k = 0; k < 50; k++) cpu.call(0x1E67, Z, { maxSteps: 1000, hooks: { 0x1EC2: () => true } });
  const got = lnrSpiral(v, cells, dim, both);
  if (m[0x022C] !== v || got.some(([off, b]) => m[0x06FA + off] !== b)) fail('spiral from', from, 'to', v);
  else spirals++;
}

// --- the lock code
const B = L('basement'), copy = B.sym('CopyClockToCode');
let codes = 0;
for (let mi = 0; mi < 60; mi++) for (let s = 0; s < 60; s++) {
  const m = B.ram.slice();
  for (let a = 0x1C00; a < 0x1E00; a++) m[a] = E.ram[a];
  lnrSetClock(m, mi % 24, mi, s);
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 } });
  cpu.call(copy, Z, { maxSteps: 1000 });
  const want = [0, 1, 2, 3].map((k) => m[0x0297 + k] - 0x1B).join(), got = lnrCode(m).join();
  const digits = [mi / 10 | 0, mi % 10, s / 10 | 0, s % 10].join();
  if (want !== got || got !== digits) fail('code', mi, s, want, got);
  else codes++;
}

console.log(`${cards} title cards, ${sprites} sprites (${packed} packed bytes), ${meters} meter cases, ${spirals} spirals, ${codes} codes: ` +
  (bad ? bad + ' differences' : 'all agree with the game'));
process.exit(bad ? 1 : 0);
