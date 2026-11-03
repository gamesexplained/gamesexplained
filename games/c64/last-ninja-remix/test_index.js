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
// - lnr-blow, in each of the seven levels, the engine's listing under the level's: lnrMove against
//   InterpretNormalizedControls for every weapon value 0-7, stick direction and heading; lnrAnim
//   against AnimationInterpreter, record by record, for each of the player's 36 animations; lnrFrame
//   against ComposeSprites for every frame those animations show, with each weapon, mirrored and
//   not, at positions that reach past the play window's right edge and with and without a depth
//   line; lnrBlow against TestActorCombatOverlap over a sweep of distances across and up and down
//   the screen for every attack mode and weapon, and against EventResolveCombatFromActorState's
//   damage for random placings, modes, weapons and blocks. Then the page's two tables, damage and
//   reach, against each level's tables, and the 44 a star takes in each level's UpdateProjectiles.
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
globalThis.lnrUnpack = lnrUnpack;            // the page's lnr-blow calls lnr-sprite's unpacker
const { lnrTables, lnrMove, lnrAnim, lnrFrame, lnrBlow } = g.run(page, 'lnr-blow', 'lnrTables', 'lnrMove', 'lnrAnim', 'lnrFrame', 'lnrBlow');
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

// --- the weapons
const LEVEL_IDS = ['central-park', 'street', 'sewers', 'basement', 'office', 'mansion', 'final-battle'];
const NO_IO = { read: (a) => { throw new Error('read of ' + a.toString(16)); }, write: (a) => { throw new Error('write to ' + a.toString(16)); } };
let seed = 0x2545F491;
const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
const word = (m, a) => m[a] | m[a + 1] << 8;
let moves = 0, anims = 0, frames = 0, overlaps = 0, damages = 0, hits = 0, blocked = 0, hurt = 0;
const tables = [];
for (const id of LEVEL_IDS) {
  const T = L(id + '-title'), Q = L(id), base = new Uint8Array(0x10000);
  for (let a = 0; a < 0x10000; a++) base[a] = E.has[a] ? E.ram[a] : 0;
  for (let a = 0; a < 0x4E00; a++) if (T.has[a]) base[a] = T.ram[a];
  for (let a = 0x4E00; a < 0x10000; a++) if (Q.has[a]) base[a] = Q.ram[a];
  const S = lnrTables(base, Q), cpuOf = (m) => new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: NO_IO });
  // the move each stick direction starts, with fire held
  const inc = Q.sym('InterpretNormalizedControls'), dirs = word(base, inc + 6);
  for (let w = 0; w < 8; w++) for (let d = 0; d < 8; d++) for (let h = 0; h < 8; h++) {
    const m = base.slice(), x = [...Array(16).keys()].find((k) => base[dirs + k] === d);
    Object.assign(m, { [0x7C]: x, [0x84]: d, [0x88]: 0xFF, [0x85]: 0, [0xE2]: 8, [0x70]: w, [0x69]: h, [0x68]: h });
    cpuOf(m).call(inc, Z, { maxSteps: 1000 });
    const mv = lnrMove(base, S, w, d, h);
    if (m[0x6D] !== mv.mode || word(m, 0x60) !== mv.anim || m[0x5D] !== mv.mirror) fail(id, 'move', w, d, h, m[0x6D], mv.mode, word(m, 0x60).toString(16), mv.anim.toString(16));
    else moves++;
  }
  // the player's animations, record by record, and the frames they show
  const somersault = new Set(), moving = new Set(), shown = new Set(), stop = { [Q.sym('ComposeSprites')]: () => true, [Q.sym('MovePlayer')]: () => true };
  for (let k = 0; k < 36; k++) {
    const at = word(base, S.anims + 2 * k), steps = lnrAnim(base, at), m = base.slice(), cpu = cpuOf(m);
    m[0x60] = at & 0xFF; m[0x61] = at >> 8;
    let ok = true;
    steps.forEach((st, i) => {
      if (!ok) return;
      m[0x58] = 0; m[0x64] = 0; m[0x54] = 100; m[0x55] = 100;
      cpu.call(Q.sym('AnimationInterpreter'), Z, { maxSteps: 100000, hooks: stop });
      const last = i === steps.length - 1;
      if (m[0x5C] !== st.control || (st.delay !== null && m[0x59] !== st.delay) || m[0x65] !== st.frame || m[0x64] !== st.event ||
          ((m[0x54] - 100) & 0xFF) !== (st.dx & 0xFF) || ((m[0x55] - 100) & 0xFF) !== (st.dy & 0xFF) || (m[0x61] === 0) !== last) {
        fail(id, 'animation', k, at.toString(16), 'record', i); ok = false;
      }
      shown.add(st.frame);
      if (k < 4) somersault.add(st.frame); else moving.add(st.frame);
    });
    if (ok) anims++;
  }
  for (const f of shown) for (let w = 0; w < 5; w++) for (const mirror of [0, 2])
    for (const [x, y, clip] of [[100, 100, 0xFF], [0xF4, 100, 0xFF], [0xFC, 90, 0xFF], [4, 120, 0x9C], [0xE8, 200, 0xD0]]) {
      const m = base.slice(), F = lnrFrame(base, S, f, w, mirror, x, y, clip);
      Object.assign(m, { [0x54]: x, [0x55]: y, [0x9E]: clip, [0x7D]: 0, [0x70]: w, [0x0280]: 0 });
      m.fill(0, 0x0218, 0x0220); m.fill(0x77, 0x0210, 0x0214);
      cpuOf(m).call(Q.sym('ComposeSprites'), { a: mirror, x: 0, y: f, n: 0, v: 0, d: 0, z: 0, c: 0 }, { maxSteps: 100000 });
      if (!F) {           // the somersaults' frames, which lnrFrame leaves out: no move the page shows has one
        const hdr = base[word(base, S.frames + 2 * f)];
        if (!(hdr & 0xA0) || moving.has(f)) fail(id, 'frame', f, 'not ported');
        continue;
      }
      let ok = true;
      for (let s = 0; ok && s < 4; s++) {
        const p = F.parts.find((q) => q.slot === s), buf = m[0x169D + s] | m[0x16A5 + s] << 8 | (m[0x0218 + s] & 1) << 9;
        if (!p) { if (!(F.hdr & 0x40) && m[0x0210 + s] !== 0) ok = false; continue; }
        if (m[0x0200 + s] !== (p.x & 0xFF) || m[0x0208 + s] !== p.x >> 8 || m[0x0210 + s] !== p.y || m[0x0220 + s] !== p.colour ||
            m[0x0238 + s] !== (p.colour & 0x80) || m.subarray(buf, buf + 63).join() !== p.bytes.join()) ok = false;
      }
      if (!ok) fail(id, 'frame', f, 'weapon', w, 'mirror', mirror, 'at', x, y, clip);
      else frames++;
    }
  // whether a blow lands: a sweep across and up and down the screen, then random placings
  const m = base.slice(), cpu = cpuOf(m), test = Q.sym('TestActorCombatOverlap');
  const overlap = (a, v, cb, t) => {
    Object.assign(m, { [0x54]: a.x, [0x55]: a.y, [0x6D]: a.mode, [0x70]: a.w, [0x56]: v.x, [0x57]: v.y, [0x6F]: v.mode, [0xCB]: cb, [0x02BD]: t, [0x1F]: 0xEE });
    cpu.call(test, Z, { maxSteps: 1000 });
    const r = lnrBlow(base, S, a, v, cb, t);
    if ((cpu.a === 0xFF) !== r.hit || (r.index >= 0 && m[0x1F] !== r.index)) fail(id, 'overlap', JSON.stringify([a, v, cb, t]), cpu.a, m[0x1F], JSON.stringify(r));
    else { overlaps++; if (r.hit) hits++; if (r.blocked) blocked++; }
  };
  for (let mode = 0x14; mode < 0x24; mode++) for (let w = 0; w < 5; w++) {
    for (let dx = -52; dx <= 52; dx++) for (const dy of [0, 6, -6]) overlap({ x: 120, y: 100, mode, w }, { x: 120 + dx, y: 100 + dy, mode: 0x08 }, 0x80, 0);
    for (let dy = -30; dy <= 30; dy++) for (const dx of [-20, 20]) overlap({ x: 120, y: 100, mode, w }, { x: 120 + dx, y: 100 + dy, mode: 0x08 }, 0x80, 0);
    for (let vm = 0x10; vm < 0x14; vm++) for (let t = 0; t < 8; t++) overlap({ x: 120, y: 100, mode, w }, { x: (mode & 3) < 2 ? 136 : 106, y: 100, mode: vm }, 0x80, t);   // blocks
  }
  const VICTIM = [0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0E, 0x10, 0x11, 0x12, 0x13, 0x14, 0x19, 0x24, 0x26, 0x28];
  for (let k = 0; k < 4000; k++) {
    const a = { x: rnd(256), y: rnd(256), mode: rnd(4) ? 0x14 + rnd(16) : rnd(256), w: rnd(8) };
    const near = rnd(4) > 0, v = { x: near ? (a.x + rnd(110) - 55) & 0xFF : rnd(256), y: near ? (a.y + rnd(60) - 30) & 0xFF : rnd(256), mode: VICTIM[rnd(VICTIM.length)] };
    overlap(a, v, [0x80, 0xFF, 0x00, 0x7F][rnd(4)], rnd(8));
  }
  const resolve = Q.sym('EventResolveCombatFromActorState');
  for (let k = 0; k < 600; k++) {
    const a = { x: 120, y: 100, mode: 0x14 + rnd(16), w: rnd(5) }, ahead = (a.mode & 3) < 2 ? 2 + rnd(46) : -rnd(46);   // mostly in front
    const v = { x: 120 + (rnd(5) ? ahead : rnd(100) - 50), y: 100 + rnd(30) - 15, mode: VICTIM[rnd(VICTIM.length)] };
    const mm = base.slice(), t = rnd(8);
    Object.assign(mm, { [0x54]: a.x, [0x55]: a.y, [0x6D]: a.mode, [0x69]: (a.mode & 3) * 2, [0x70]: a.w, [0x56]: v.x, [0x57]: v.y, [0x6F]: v.mode, [0x6B]: (v.mode & 3) * 2,
      [0xCB]: 0x80, [0x02BD]: t, [0x022A]: 44, [0x0229]: 44, [0xA2]: 3, [0xD6]: 5 });
    new CPU(mm, { port: { dir: 0x2F, data: 0x35 } }).call(resolve, { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 }, { maxSteps: 100000 });
    const r = lnrBlow(base, S, a, v, 0x80, t);
    if (44 - mm[0x022A] !== r.damage) fail(id, 'damage', JSON.stringify([a, v, t]), 44 - mm[0x022A], JSON.stringify(r));
    else { damages++; if (r.damage) hurt++; }
  }
  // the page's tables: a row for each weapon, a column for each stick direction, from the move and the weapon's row of tables
  const cell = (w, d, f) => { const mv = lnrMove(base, S, w, d, 1), i = (mv.mode - 0x14 & 0xFF) >> 2 | (w < 4 ? w : 0) << 2; return f(i); };
  tables.push({ id,
    damage: [0, 1, 2, 3].map((w) => [0, 2, 4, 6].map((d) => cell(w, d, (i) => String(base[S.damage + i])))),
    reach: [0, 1, 2, 3].map((w) => [0, 2, 4, 6].map((d) => cell(w, d, (i) => `${base[S.hmin + i] + 2} to ${base[S.hmax + i] + 1}`))) });
  // a thrown star: UpdateProjectiles passes 44 ($2C) to DamageEnemy
  const de = Q.sym('DamageEnemy'), up = Q.sym('UpdateProjectiles');
  let star = false;
  for (let a = up; a < up + 0x200; a++) if (base[a] === 0xA9 && base[a + 1] === 0x2C && base[a + 2] === 0x20 && word(base, a + 3) === de) star = true;
  if (!star) fail(id, 'no star of 44');
}
const html = g.read(page), rows = (tid) => {
  const t = html.split(`id="${tid}"`)[1].split('</table>')[0];
  return [...t.matchAll(/<tr>(.*?)<\/tr>/g)].map((r) => [...r[1].matchAll(/<t([dh])[^>]*>(.*?)<\/t[dh]>/g)].map((c) => c[2])).filter((r) => r.length);
};
const damageRows = rows('ln-wpn-damage').slice(1), GROUPS = [[0, 1, 2, 3], [4, 5], [6]];
GROUPS.forEach((levels, k) => {
  const shown = damageRows.slice(5 * k + 1, 5 * k + 5).map((r) => r.slice(1).join());
  for (const i of levels) if (tables[i].damage.map((r) => r.join()).join('|') !== shown.join('|')) fail('damage table', LEVEL_IDS[i], tables[i].damage.join('|'), shown.join('|'));
});
const reachRows = rows('ln-wpn-reach').slice(1).map((r) => r.slice(1).join());
for (const t of tables) if (t.reach.map((r) => r.join()).join('|') !== reachRows.join('|')) fail('reach table', t.id, t.reach.join('|'));

console.log(`${cards} title cards, ${sprites} sprites (${packed} packed bytes), ${meters} meter cases, ${spirals} spirals, ${codes} codes, ${moves} moves, ${anims} animations, ${frames} frames, ${overlaps} placings (${hits} hits, ${blocked} blocked), ${damages} blows (${hurt} that hurt): ` +
  (bad ? bad + ' differences' : 'all agree with the game'));
process.exit(bad ? 1 : 0);
