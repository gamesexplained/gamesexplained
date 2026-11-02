#!/usr/bin/env node
'use strict';
// Hold the Enemies and Levels pages against the game's own code.
//
// Every picture of the plain on those pages is drawn by the enc-view block, which runs the game's
// own view routines on the kit's 6502 from the bytes it carries (ENC_VIEW_MEM), and every moving
// picture replays a recording in the enc-clips block (ENC_CLIPS): the game's object table and the
// variables the view and the panels read, pass by pass. The recordings are made here, by running
// the whole game from listing.json on the kit's C64 (kit/c64/machine.js) with a scripted stick, so
// they come out the same on every machine. This checks:
// - each page's enc-clips block is what the recorder makes now, clip for clip;
// - every byte enc-view carries is the listing's, and the pages share one enc-view block;
// - enc-view, given a recorded pass, draws the frame the game drew in that pass: the screen codes,
//   the dynamic characters, the colour memory of the view, the sprites' places, colours and images;
// - nothing enc-view's routines read lies outside what it carries, what it was given and what they
//   wrote themselves.
// It exits 1 on any difference.
//   node games/c64/encounter/test_enemies.js            check
//   node games/c64/encounter/test_enemies.js --write    record again and write both blocks
const path = require('path'), fs = require('fs'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const { Machine, KEY } = require(path.join(ROOT, 'kit/c64/machine.js'));

const g = game(__dirname);
const hex = (a, w = 4) => '$' + a.toString(16).toUpperCase().padStart(w, '0');

// ---- the recorder -------------------------------------------------------------------------
const JOY = { up: 1, down: 2, left: 4, right: 8, fire: 16 };
// the zero page each pass keeps: the view's ($63 scene, $83 gate, $90 last object, $75, $C0), the
// object colour pair $A7, the range code $31 and the enemy handlers' counters
const ZPV = ['63', '83', '90', '75', 'C0', 'A7', '31', '44', '45', '46', '47', '4D', '78', '36', '37', '38', '3B', '56', '4C', '7A', '91', '92', '5E', '7B', '40', '69'];
function boot() {
  const L = g.listing();
  const m = new Machine({ ram: L.ram, pc: 0x9C3E, passAt: 0xA103, port: { dir: 0x2F, data: 0x37 }, dma: true, collide: true });
  m.hooks[0xFF84] = (c) => { c.rts(); return false; };                                    // IOINIT: nothing is kept of it
  m.key = 0x40; m.hooks[0xFF9F] = (c) => { m.ram[0xC5] = m.key; c.rts(); return false; };  // SCNKEY: $C5 = the key held
  // $9FFD, EOR ($3A,X) in the seven junk bytes the level start runs, reads the KERNAL ROM, which
  // the model does not hold; A is replaced at $A000 and the flags before they are read, so it is skipped
  m.hooks[0x9FFD] = (c) => { c.pc = 0x9FFF; return false; };
  return m;
}
// the title screen: the skill in $62, the level's key, then fire
function startGame(m, level, skill, wait) {
  m.runFrames(30 + wait); m.ram[0x62] = skill;
  m.key = KEY[String(level)]; m.runFrames(4); m.key = 0x40; m.runFrames(4);
  m.joy = 0x1F & ~JOY.fire; m.runFrames(4); m.joy = 0x1F;
  for (let n = 0; m.passes === 0 && n < 400; n++) m.runFrames(1);
}
const heading = (r, k) => ((r[0x84A0 + k] & 7) << 8) | r[0x84C0 + k];
// the bearing from the player to object k ($2F:$39 holds the one from the enemy to the player)
const toEnemy = (r) => ((((r[0x2F] & 7) << 8) | r[0x39]) + 1024) % 2048;
function turn(r, br, dead) {
  const rel = (br - heading(r, 0) + 2048) % 2048;
  return rel > dead && rel < 1024 ? JOY.right : (rel >= 1024 && rel < 2048 - dead ? JOY.left : 0);
}
const facing = (r, within) => { const rel = (toEnemy(r) - heading(r, 0) + 2048) % 2048; return rel < within || rel > 2048 - within; };
// The players: face the enemy and close to a range code, never firing; face it and stand; face it,
// back away and shoot once it is nearer than a range code.
const PLAYERS = {
  close(r, o) { if (!r[0x83E2]) return 0; let j = turn(r, toEnemy(r), 10); if (facing(r, 128) && r[0x31] > o.range) j |= JOY.up; return j; },
  stand(r) { if (!r[0x83E2]) return 0; return turn(r, toEnemy(r), 10); },
  back(r, o) { if (!r[0x83E2]) return 0; let j = turn(r, toEnemy(r), 10); if (facing(r, 64)) { j |= JOY.down; if (r[0x31] < o.fireAt) j |= JOY.fire; } return j; },
  still() { return 0; },
};
// spec: level, skill, player (and its range or fireAt), wait (frames on the title screen), from and
// passes (the window kept), type (every saucer forced to it at spawn, $A441), missile (one pending
// at the first chance, $33), warp (the stargate entered at pass warp). frames: keep each pass's frame.
function record(spec) {
  const m = boot(); startGame(m, spec.level, spec.skill, spec.wait || 0);
  if (spec.type !== undefined) m.hooks[0xA441] = (c) => { c.a = spec.type; return false; };
  if (spec.missile) { let once = true; m.hooks[0xA37F] = () => { if (once) { m.ram[0x33] = 2; once = false; } return false; }; }
  const S = [];
  let cur = null;
  m.onPass = (mm) => {
    const r = mm.ram, o = { f: mm.frames, obj: [], zp: {} };
    if (spec.warp !== undefined && mm.passes === spec.warp) {
      r[0xA3] = 0x13; r[0xA4] = 0xA7; r[0x83E3] = 1;   // state_warp_travel ($A713), the gate's lifetime at 1: the warp starts
    }
    for (let k = 0; k < 32; k++) {
      o.obj.push(r[0x83E0 + k] || k == 0 ? [r[0x8260 + k] << 16 | r[0x82C0 + k] << 8 | r[0x15C0 + k], r[0x8320 + k] << 16 | r[0x8380 + k] << 8 | r[0x15E0 + k], r[0x8440 + k]] : null);
    }
    o.hd = heading(r, 0); o.vec = r[0xA3] | r[0xA4] << 8; o.f1b = r[0x1B];
    for (const z of ZPV) o.zp[z] = r[parseInt(z, 16)];
    o.lamps = [0, 0x50, 0xA0].map((x) => mm.colour[0x2FF + x] & 15);     // $AA70's three rows, read at their first cell
    o.status = Buffer.from(r.slice(0x6000, 0x6050)).toString('base64');
    o.radar = [mm.vic[0], mm.vic[1], mm.vic[0x15] & 1];
    S.push(o); cur = spec.frames ? o : null;
    mm.joy = 0x1F & ~PLAYERS[spec.player](r, spec);
  };
  // the frame the pass drew, as it stands when the main loop has drawn it ($A10F), and the
  // sprites shown with it, which the pass places just before it shows the frame ($A18E)
  if (spec.frames) {
    m.hooks[0xA10F] = () => {
      if (cur) {
        const r = m.ram, b = r[0x08] & 1, sb = b ? 0x6400 : 0x6000, cb = b ? 0x5000 : 0x4000;
        cur.frame = { scr: r.slice(sb + 80, sb + 720), ch: r.slice(cb, cb + 0x1000), col: m.colour.slice(80, 720), sb };
      }
      return false;
    };
    m.hooks[0xA18E] = () => {
      if (cur && cur.frame) { cur.frame.vic = m.vic.slice(); cur.frame.ptr = m.ram.slice(cur.frame.sb + 0x3F8, cur.frame.sb + 0x400); cur = null; }
      return false;
    };
  }
  m.runPasses(spec.from + spec.passes);
  return S.slice(spec.from, spec.from + spec.passes);
}

// ---- a clip: runs that rebuild every recorded value exactly ----------------------------------
function stepRuns(vals, eq = (a, b) => a === b) {
  const out = [];
  vals.forEach((v, p) => { if (!out.length || !eq(out[out.length - 1][1], v)) out.push([p, v]); });
  return out;
}
function slopeRuns(vals, mod) {
  const out = [];
  let i = 0;
  while (i < vals.length) {
    let s = 0;
    if (i + 1 < vals.length) s = ((vals[i + 1] - vals[i]) % mod + mod) % mod;
    if (s > mod / 2) s -= mod;
    let j = i + 1;
    while (j < vals.length && ((vals[i] + (j - i) * s) % mod + mod) % mod === vals[j]) j++;
    out.push(s ? [i, vals[i], s] : [i, vals[i]]); i = j;
  }
  return out;
}
const M24 = 1 << 24;
// an object's positions as runs of constant velocity: [first pass, passes, X0, Z0, dX, dZ]
function tracks(S, k) {
  const out = [];
  let i = 0;
  while (i < S.length) {
    if (!S[i].obj[k]) { i++; continue; }
    const [x0, z0] = S[i].obj[k];
    let dx = 0, dz = 0;
    if (i + 1 < S.length && S[i + 1].obj[k]) {
      dx = ((S[i + 1].obj[k][0] - x0) % M24 + M24) % M24; dz = ((S[i + 1].obj[k][1] - z0) % M24 + M24) % M24;
      if (dx > M24 / 2) dx -= M24;
      if (dz > M24 / 2) dz -= M24;
    }
    let j = i + 1;
    while (j < S.length && S[j].obj[k] && ((x0 + (j - i) * dx) % M24 + M24) % M24 === S[j].obj[k][0] && ((z0 + (j - i) * dz) % M24 + M24) % M24 === S[j].obj[k][1]) j++;
    out.push(dx || dz ? [i, j - i, x0, z0, dx, dz] : [i, j - i, x0, z0]); i = j;
  }
  return out;
}
function clip(spec, S) {
  const c = { level: spec.level, skill: spec.skill, passes: S.length, f1b: S[0].f1b, tr: {}, ty: {} };
  for (let k = 0; k < 32; k++) {
    const t = tracks(S, k);
    if (!t.length) continue;
    c.tr[k] = t;
    if (k) c.ty[k] = stepRuns(S.map((s) => s.obj[k] ? s.obj[k][2] : -1)).filter(([, v]) => v >= 0);
  }
  c.hd = slopeRuns(S.map((s) => s.hd), 2048);
  c.vec = stepRuns(S.map((s) => s.vec));
  c.dt = stepRuns(S.map((s, i) => i + 1 < S.length ? S[i + 1].f - s.f : 2));
  c.zp = {};
  for (const z of ZPV) c.zp[z] = slopeRuns(S.map((s) => s.zp[z]), 256);
  c.lamps = stepRuns(S.map((s) => s.lamps), (a, b) => a.join() === b.join());
  c.status = stepRuns(S.map((s) => s.status));
  c.radar = stepRuns(S.map((s) => s.radar), (a, b) => a.join() === b.join());
  return c;
}

// ---- what the pages show ------------------------------------------------------------------
// Under fire: each saucer type, forced at every spawn, on the first level that has it (level 2
// for types 0 and 1: on level 1 at Novice a saucer rarely attacks), against a player who turns to
// face it and closes to a medium range code ($C8) without firing. The window is the stretch of
// play with the most shots fired at that range.
const UNDER_FIRE = [
  [0, 63, 730], [1, 63, 730], [2, 42, 80], [3, 42, 240], [4, 70, 440], [5, 63, 520], [6, 42, 90], [7, 21, 360],
  [8, 42, 140], [9, 49, 150], [10, 0, 360], [11, 49, 160], [12, 7, 160], [13, 21, 360], [14, 70, 550], [15, 28, 540],
];
const SPECS = {};
for (const [type, wait, from] of UNDER_FIRE) {
  SPECS['type' + type] = { level: Math.max(2, (type >> 1) + 1), skill: 2, type, player: 'close', range: 0xC8, wait, from, passes: 360 };
}
// The missile: one forced at the first chance on level 1, met by a player who backs away and shoots,
// and by one who only turns to face it.
SPECS.missile = { level: 1, skill: 2, missile: true, player: 'back', fireAt: 0xB8, wait: 0, from: 30, passes: 190 };
SPECS.missileStand = { level: 1, skill: 2, missile: true, player: 'stand', wait: 0, from: 30, passes: 130 };
const LEVELS = {};
for (let level = 1; level <= 8; level++) LEVELS['level' + level] = { level, skill: 2, player: 'still', wait: 0, from: 1, passes: 1 };
// the warp, entered at the start of level 1 as stargate_timeout enters it, kept from the first spheres
LEVELS.warp = { level: 1, skill: 2, player: 'still', warp: 2, wait: 0, from: 100, passes: 300 };

// the bytes enc-view carries besides the ones its routines read: the parts of the screen the
// pictures show (the status row, the console and its sprite pointers, the sprite images, the
// font), the bytes of code the death flash writes into the background colour, and the tables the
// pages print (points, fire scripts and saucer colours, missile and skill tables, the warp's
// spheres and speeds, the behaviour handlers)
const COMPOSE = [[0x6000, 0x604F], [0x62D0, 0x63FF], [0x6400, 0x643F], [0x6700, 0x67FF], [0x7000, 0x7FFF], [0xA800, 0xA8FF],
  [0x8BA0, 0x8BFF], [0x8C00, 0x8CFF], [0x8E00, 0x8EFF], [0x8F80, 0x8F9F], [0xA7E0, 0xA7EF], [0xAAA5, 0xAAC4]];
const VIEW_ROUTINES = [0xB920, 0xB9A5, 0xB1A1, 0xB77F, 0xB829, 0xB868, 0xB1EC];
const START_PIECES = [[0x9EE5, 0x9EEA], [0x9F25, 0x9F6E]];

// The state a pass gives the view, as the page's player rebuilds it from a clip.
const viewState = (s) => ({ obj: s.obj, hd: s.hd, scene: s.zp['63'], gate: s.zp['83'], last: s.zp['90'], size: s.zp['75'], shift: s.zp.C0 });

// The bytes the view's routines need: run them over the whole listing on every pass recorded
// and keep every byte read or executed that the state does not supply.
function carriedRanges(states) {
  const L = g.listing(), mem = L.ram.slice(), reads = new Uint8Array(65536), executed = new Uint8Array(65536);
  const cpu = new C64Cpu.CPU(mem, { port: 0x35, io: { read(a) { throw new Error('reads ' + hex(a)); }, write() {} } });
  for (const [a, b] of START_PIECES) { cpu.pc = a; cpu.run({ until: b, reads, executed }); }
  const input = new Uint8Array(65536);
  for (let k = 0; k < 32; k++) for (const b of [0x83E0, 0x8260, 0x82C0, 0x8320, 0x8380, 0x8440]) input[b + k] = 1;
  for (const a of [0x84A0, 0x84C0, 0x63, 0x83, 0x90, 0x75, 0xC0, 0x08]) input[a] = 1;
  for (const st of states) {
    for (let k = 0; k < 32; k++) {
      const e = st.obj[k];
      mem[0x83E0 + k] = e ? (k ? 1 : 0xFF) : 0;
      if (!e) continue;
      mem[0x8260 + k] = e[0] >>> 16; mem[0x82C0 + k] = e[0] >>> 8 & 255; mem[0x8320 + k] = e[1] >>> 16; mem[0x8380 + k] = e[1] >>> 8 & 255; mem[0x8440 + k] = e[2];
    }
    mem[0x84A0] = st.hd >> 8; mem[0x84C0] = st.hd & 255;
    mem[0x63] = st.scene; mem[0x83] = st.gate; mem[0x90] = st.last; mem[0x75] = st.size; mem[0xC0] = st.shift; mem[0x08] = 1;
    for (const e of VIEW_ROUTINES) cpu.call(e, {}, { reads, executed, maxSteps: 4e6 });
  }
  const need = new Uint8Array(65536), code = new Map(L.listing.records.filter((r) => r.t === 'code').map((r) => [r.a, r.b.length]));
  for (let a = 0; a < 65536; a++) {
    if (executed[a]) for (let i = 0; i < (code.get(a) || 1); i++) need[a + i] = 1;
    if (reads[a] && !input[a] && L.has[a] && !(a >= 0x4000 && a < 0x6000)) need[a] = 1;
  }
  for (const [a, b] of COMPOSE) for (let i = a; i <= b; i++) need[i] = 1;
  // runs, joined across gaps of up to 24 bytes the listing holds
  const runs = [];
  let s = -1;
  for (let a = 0; a <= 65536; a++) {
    if (a < 65536 && need[a] && !(a >= 0x6050 && a < 0x62D0)) { if (s < 0) s = a; } else if (s >= 0) { runs.push([s, a - 1]); s = -1; }
  }
  const merged = [];
  for (const r of runs) {
    const l = merged[merged.length - 1];
    let ok = l && r[0] - l[1] <= 24;
    if (ok) for (let a = l[1] + 1; a < r[0]; a++) if (!L.has[a]) ok = false;
    if (ok) l[1] = r[1]; else merged.push(r.slice());
  }
  return merged.map(([a, b]) => [a, Buffer.from(L.ram.slice(a, b + 1)).toString('base64')]);
}

// The data blocks, as they are written into the pages.
function writeBlock(file, name, text) {
  const p = path.join(__dirname, file), src = fs.readFileSync(p, 'utf8');
  const start = src.indexOf('/* ' + name + ' */\n'), end = src.indexOf('// end of ' + name + '\n');
  if (start < 0 || end < 0) throw new Error(file + ' has no block ' + name);
  fs.writeFileSync(p, src.slice(0, start) + '/* ' + name + ' */\n' + text + '\n' + src.slice(end));
}
const clipsText = (clips) => 'const ENC_CLIPS = {\n' + Object.entries(clips).map(([k, c]) => JSON.stringify(k) + ': ' + JSON.stringify(c)).join(',\n') + '\n};';

function main() {
  const write = process.argv.includes('--write');
  let bad = 0;
  const fail = (...w) => { if (bad++ < 30) console.log('DIFFERS', ...w); };
  const recs = {}, clips = { enemies: {}, levels: {} };
  for (const [page, specs] of [['enemies', SPECS], ['levels', LEVELS]]) {
    for (const [name, spec] of Object.entries(specs)) {
      const S = record(Object.assign({ frames: true }, spec));
      recs[name] = S; clips[page][name] = clip(spec, S);
    }
  }
  if (write) {
    const states = [];
    for (const S of Object.values(recs)) for (const s of S) states.push(viewState(s));
    const mem = carriedRanges(states);
    const viewMem = 'const ENC_VIEW_MEM = [\n' + mem.map(([a, b]) => '  [0x' + a.toString(16).toUpperCase() + ', "' + b + '"]').join(',\n') + '\n];';
    for (const f of ['enemies.html', 'levels.html']) writeBlock(f, 'enc-view-mem', viewMem);
    writeBlock('enemies.html', 'enc-clips', clipsText(clips.enemies));
    writeBlock('levels.html', 'enc-clips', clipsText(clips.levels));
    console.log('written:', mem.length, 'runs carried,', Object.keys(recs).length, 'clips');
    return 0;
  }
  // the clips in the pages are the recorder's
  for (const page of ['enemies', 'levels']) {
    const { ENC_CLIPS } = g.run(page + '.html', 'enc-clips', 'ENC_CLIPS');
    for (const name of new Set([...Object.keys(ENC_CLIPS), ...Object.keys(clips[page])])) {
      if (JSON.stringify(ENC_CLIPS[name]) !== JSON.stringify(clips[page][name])) fail(page + '.html: clip', name, 'is not what the recorder makes');
    }
  }
  // one enc-view block, which carries only the listing's bytes
  g.sameBlock('enc-view-mem', 'enemies.html', 'levels.html');
  g.sameBlock('enc-view', 'enemies.html', 'levels.html');
  const { ENC_VIEW_MEM } = g.run('enemies.html', 'enc-view-mem', 'ENC_VIEW_MEM');
  const { encViewer } = g.run('enemies.html', 'enc-view', 'encViewer');
  const L = g.listing(), carried = new Uint8Array(65536);
  for (const [a, b] of ENC_VIEW_MEM) {
    const bytes = Buffer.from(b, 'base64');
    for (let i = 0; i < bytes.length; i++) {
      carried[a + i] = 1;
      if (!L.has[a + i]) fail('ENC_VIEW_MEM carries', hex(a + i), 'which the listing does not hold');
      else if (L.ram[a + i] !== bytes[i]) fail('ENC_VIEW_MEM has', bytes[i].toString(16), 'at', hex(a + i), 'and the listing', L.ram[a + i].toString(16));
    }
  }
  globalThis.ENC_VIEW_MEM = ENC_VIEW_MEM;
  // every frame the game drew, drawn again by the block
  const reads = new Uint8Array(65536), executed = new Uint8Array(65536), writes = new Uint8Array(65536);
  const V = encViewer(C64Cpu, { reads, executed, writes });
  let frames = 0;
  const kinds = {};
  for (const [name, S] of Object.entries(recs)) {
    for (let i = 0; i < S.length; i++) {
      const s = S[i], fr = s.frame;
      if (!fr) continue;
      frames++;
      const f = V.render(viewState(s)), m = f.mem;
      let d = null;
      for (let c = 0; c < 640 && !d; c++) if (m[0x6050 + c] !== fr.scr[c]) d = 'screen cell ' + c;
      for (let c = 0; c < 640 && !d; c++) {
        const code = fr.scr[c], base = c < 320 ? 0 : 0x800;
        for (let y = 0; y < 8; y++) if (m[0x4000 + base + code * 8 + y] !== fr.ch[base + code * 8 + y]) { d = 'character ' + code + (base ? ' (ground)' : '') + ' row ' + y; break; }
      }
      for (let c = 0; c < 640 && !d; c++) if ((f.col[80 + c] & 15) !== (fr.col[c] & 15)) d = 'colour of cell ' + c;
      for (const r of fr.vic ? [0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x15, 0x17, 0x1B, 0x1D, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E] : []) {
        if (d) break;
        const en = fr.vic[0x15] & 0xFE, n = r >= 0x27 ? r - 0x27 : r >> 1;
        if (r < 0x10 && !(en & (1 << n))) continue;           // the place of a sprite that is off does not show
        if ((f.vic[r] & (r >= 0x27 ? 15 : 255)) !== (fr.vic[r] & (r >= 0x27 ? 15 : 255)) && !(r === 0x15 && (f.vic[r] & 0xFE) === en)) d = 'video chip register ' + hex(0xD000 + r);
      }
      if (!d && fr.vic && ((f.vic[0x10] ^ fr.vic[0x10]) & fr.vic[0x15] & 0xFE)) d = 'sprite X bit 8 ($D010)';
      for (let n = 1; n < 8 && !d && fr.vic; n++) if ((fr.vic[0x15] >> n & 1) && m[0x63F8 + n] !== fr.ptr[n]) d = 'sprite ' + n + ' pointer';
      if (d) { fail(name, 'pass', i, d); kinds[d] = (kinds[d] || 0) + 1; }
    }
  }
  // what the routines read: carried, given, or written by them first
  const given = new Uint8Array(65536);
  for (let k = 0; k < 32; k++) for (const b of [0x83E0, 0x8260, 0x82C0, 0x8320, 0x8380, 0x8440]) given[b + k] = 1;
  for (const a of [0x84A0, 0x84C0, 0x63, 0x83, 0x90, 0x75, 0xC0, 0x08]) given[a] = 1;
  // The character buffers at $4000-$5FFF are the routines' own working memory: an edge cell can
  // read a character left from an earlier frame before it is built again. $3EED lies past the
  // one-byte shape script at $3EEB (explosion fragment C, size step 0), in the tail the listing
  // does not hold; the routines read it there, and the game runs here with it 0.
  const KNOWN = new Set([0x3EED]);
  for (let a = 0; a < 65536; a++) {
    if ((reads[a] || executed[a]) && !carried[a] && !given[a] && !writes[a] && !(a >= 0x4000 && a < 0x6000) && !KNOWN.has(a)) fail('the view reads', hex(a), 'which enc-view does not carry');
  }
  console.log(frames, 'frames drawn again,', Object.keys(recs).length, 'clips');
  for (const [k, n] of Object.entries(kinds)) console.log('  ' + n + ' frames differ first in the', k);
  if (bad) { console.log(bad, 'differences'); return 1; }
  console.log('ok: the pages draw what the game drew');
  return 0;
}
module.exports = { record, clip, SPECS, LEVELS, PLAYERS, JOY, viewState };
if (require.main === module) process.exitCode = main();
