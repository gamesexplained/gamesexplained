#!/usr/bin/env python3
"""Hold the page's two ports against the game's own code.

music.html plays the music and effects through a port of the sound driver
($0E23), and how-it-works.html and levels.html draw the Dreadnoughts with a port of
build_message ($2415), index_pieces ($2C66) and build_map ($2CB2). A port is a
claim about the game, so this runs both sides and compares them:

  the game   the routines in the kit's 6502 simulator (kit/cpu/cpu6502.js), on
             the bytes in the committed listing.json
  the pages  createDriver and buildMap cut from the pages, run by node

Sound: the title tune from its start past its end, every one of the 46
effects on each voice with and without the force bit, and 300 runs of random
requests; every SID write, the driver's zero page and its data compared call
by call. Then every effect button on the music page is rendered through the
site's SID model and must make a sound. Maps: all fifteen Dreadnoughts and
the title message, the map, the piece index and the generator ports compared
byte for byte, and the piece placements the port records for the page must
rebuild each map exactly.

Then the ports on the How it works tab, each against the game's routines in the simulator: the
take-off's vaporising ($173B, $16D2) on every Dreadnought with the same noise, compared at four
points of its run; the fighters ($1A98, $1C73) on all 57 wave records, both entry sides and two
Manta heights, every position frame by frame; the shots ($2A17, $2AE9) over random volleys on
every Dreadnought; the stars ($2ED7) on random screens; and the homing mines ($1F62, $2021,
$205F) over 600 random launches, every frame from materialising to the burst.

Everything it needs is committed: no game image, no snapshot, no emulator.
It needs node; with KIT_REQUIRE_TOOLS set it fails without it.

  python3 games/c64/uridium/test_ports.py
"""
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = HERE
while not os.path.isfile(os.path.join(ROOT, "kit", "cpu", "cpu6502.js")):
    parent = os.path.dirname(ROOT)
    if parent == ROOT:
        sys.exit("test_ports.py must run from inside the repository")
    ROOT = parent
# music.html carries the driver; how-it-works.html and levels.html each carry a copy of the map builder
PAGES = ["music.html"] + [p for p in ("how-it-works.html", "levels.html") if os.path.isfile(os.path.join(HERE, p))]

JS = r"""'use strict';
// Written out and run by test_ports.py; see there.
const fs = require('fs'), path = require('path');
const GAME = process.argv[2], ROOT = process.argv[3], PAGES = process.argv.slice(4);
globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(GAME, url), 'utf8')) });
require(path.join(ROOT, 'site/lib/c64.js')); require(path.join(ROOT, 'site/lib/sid.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
function grab(src, name, end) {
  const a = src.indexOf('function ' + name), b = src.indexOf(end);
  if (a < 0 || b < a) throw new Error(name + ' not found');
  return src.slice(a, b);
}
const texts = PAGES.map(p => fs.readFileSync(path.join(GAME, p), 'utf8'));
const mapSrc = texts.slice(1).map(t => grab(t, 'buildMap(', '// end of buildMap'));
if (mapSrc.some(t => t !== mapSrc[0])) { console.log('the pages carry different copies of buildMap'); process.exit(1); }
const createDriver = new Function(grab(texts[0], 'createDriver(D)', '// end of createDriver') + '\nreturn createDriver;')();
const buildMap = new Function(mapSrc[0] + '\nreturn buildMap;')();
(async () => {
  const ram = (await C64.load('listing.json')).ram;
  const MEM = Array.from(ram.slice(0x3900, 0x3F00));
  let fail = 0, calls = 0, nw = 0;
  function machine() {
    let w = [];
    const io = { write(ad, v) { if (ad >= 0xD400 && ad <= 0xD418) w.push(ad - 0xD400, v); else throw new Error('write ' + ad.toString(16)); },
                 read(ad) { throw new Error('read ' + ad.toString(16)); } };
    const m = Uint8Array.from(ram);
    for (let r = 0x90; r <= 0xFF; r++) m[r] = 0;
    m[0x0F5F] = 0x80;
    const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x25 }, io });
    return { cpu, call() { w = []; cpu.call(0x0E23); return w; } };
  }
  const ZP = []; for (let r = 0x90; r <= 0xFE; r++) if (r !== 0x94) ZP.push(r);
  function compare(what, M, d) {
    const w0 = M.call(); d.play(); const w1 = d.writes.slice();
    calls++; nw += w0.length / 2;
    if (w0.join() !== w1.join()) { if (fail++ < 5) console.log('DIFFERS', what, '\n game', w0.join(), '\n port', w1.join()); return false; }
    for (const r of ZP) if (M.cpu.m[r] !== d.z[r]) { if (fail++ < 5) console.log('DIFFERS', what, 'zp $' + r.toString(16), M.cpu.m[r], d.z[r]); return false; }
    for (let k = 0; k < MEM.length; k++) if (M.cpu.m[0x3900 + k] !== d.mem[k]) { if (fail++ < 5) console.log('DIFFERS', what, 'mem $' + (0x3900 + k).toString(16)); return false; }
    if (M.cpu.m[0x0F5F] !== d.op0F5F) { if (fail++ < 5) console.log('DIFFERS', what, '$0F5F'); return false; }
    return true;
  }
  { // the title tune from $11 to the end of the song and past it
    const M = machine(), d = createDriver({ kind: 'tune', mem: MEM });
    d.init(0); M.cpu.m[0x90] = 0x11; M.cpu.m[0x95] = 5;
    let k = 0;
    for (; k < 6000; k++) { if (!compare('tune call ' + k, M, d)) break; }
    console.log('tune: song row', d.rd(0x3E99), 'state', d.rd(0x3E9A).toString(16), 'after', k, 'calls');
  }
  for (let n = 1; n <= 46; n++) for (let v = 0; v < 3; v++) for (const f of [0, 0x80]) {
    const M = machine(), d = createDriver({ kind: 'fx', mem: MEM, requests: [[]] });
    d.init(0); M.cpu.m[0x90] = 0x12; M.cpu.m[0x95] = 5;
    compare('setup', M, d);
    M.cpu.m[0x91 + v] = d.z[0x91 + v] = n | f;
    for (let k = 0; k < 600; k++) {
      if (!compare(`effect ${(n | f).toString(16)} voice ${v} call ${k}`, M, d)) break;
      if (!M.cpu.m[0xC6] && !M.cpu.m[0xD5] && !M.cpu.m[0xE4] && !M.cpu.m[0x91] && !M.cpu.m[0x92] && !M.cpu.m[0x93]) break;
    }
  }
  let seed = 20261010;
  const rnd = n => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
  for (let run = 0; run < 300; run++) {
    const M = machine(), d = createDriver({ kind: 'fx', mem: MEM, requests: [[]] });
    d.init(0); M.cpu.m[0x90] = 0x12; M.cpu.m[0x95] = 5; compare('setup', M, d);
    for (let k = 0; k < 150; k++) {
      for (let v = 0; v < 3; v++) if (rnd(8) === 0) { const n = (1 + rnd(46)) | (rnd(3) === 0 ? 0x80 : 0); M.cpu.m[0x91 + v] = d.z[0x91 + v] = n; }
      if (!compare(`random ${run} call ${k}`, M, d)) break;
    }
  }
  console.log(`sound: ${calls} calls compared, ${nw} SID writes; ${fail ? fail + ' FAILED' : 'all match'}`);
  const ram2 = ram;
  let mfail = 0;
  for (let lv = 0; lv < 16; lv++) {
    const m = Uint8Array.from(ram2);
    const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: { write() { throw new Error('io'); }, read() { throw new Error('io'); } } });
    cpu.call(0x2415);                                  // build_message
    cpu.m[0x26] = lv;
    cpu.call(0x2C66); cpu.call(0x2CB2);
    const r = buildMap(ram2, lv);
    let diff = 0, first = -1;
    for (let a = 0x8000; a < 0xA400; a++) if (cpu.m[a] !== r.m[a]) { diff++; if (first < 0) first = a; }
    for (let a = 0x0200; a < 0x0250; a++) if (cpu.m[a] !== r.m[a]) { diff++; if (first < 0) first = a; }
    for (let a = 0xA400; a < 0xA600; a++) if (cpu.m[a] !== r.m[a]) { diff++; if (first < 0) first = a; }
    if (cpu.m[0x54] !== r.m[0x54]) diff++;
    if (diff) { mfail++; console.log('level', lv, diff, 'bytes differ, first $' + first.toString(16)); }
    else console.log('level', lv, 'matches, ports', r.m[0x54] + 1 & 255);
  }
  // every effect button of the page, rendered through the site's SID model, must make a sound
  const FXT = texts[0].slice(texts[0].indexOf('const FX = ') + 11);
  const FX = new Function('return ' + FXT.slice(0, FXT.indexOf('];') + 1))();
  const E = C64Sid.engine(); let silent = 0;
  FX.forEach(([name], k) => {
    const d = createDriver({ kind: 'fx', mem: MEM, requests: FX.map(f => f[1]), length: 250 });
    const P = E.createPlayer(d, 48000); P.command({ cmd: 'start', tune: k });
    const out = new Float32Array(48000 * 5); P.render(out, out.length, 0);
    let e = 0; for (const v of out) e += v * v;
    if (Math.sqrt(e / out.length) < 1e-3) { silent++; console.log('SILENT effect button', name); }
  });
  console.log(`effect buttons: ${FX.length - silent} of ${FX.length} sound`);
  // the piece placements the map builder records rebuild each map exactly
  let ufail = 0;
  for (let lv = 0; lv < 16; lv++) {
    const R = buildMap(ram2, lv), m = R.m, g = new Uint8Array(17 * 512).fill(0x20);
    for (const u of R.uses) {
      const src = m[0xA400 + u.n] | m[0xA500 + u.n] << 8; let y = 1;
      for (let c = 0; c < m[src]; c++) {
        const col = u.col + c, k = m[src + y] & 31; y++;
        for (let r = 0; r < k; r++) { const v = m[src + y]; y++; const row = u.row - r; if (row >= 0 && col < 512 && (!u.over || v !== 0x20)) g[row * 512 + col] = v; }
        if (!u.over && col < 512) for (let row = u.row - k; row >= 0; row--) g[row * 512 + col] = 0x20;
      }
    }
    let d = 0; for (let r = 0; r < 17; r++) for (let c = 0; c < 512; c++) if (g[r * 512 + c] !== m[0x8200 + r * 0x200 + c]) d++;
    if (d) { ufail++; console.log('level', lv, 'placements leave', d, 'cells different'); }
  }
  console.log(`piece placements: ${16 - ufail} of 16 maps rebuilt exactly`);
  process.exit(fail || mfail || silent || ufail ? 1 : 0);
})().catch(e => { console.log(e.stack || e); process.exit(1); });
"""


# the ports of the How it works page: the take-off's vaporising, the fighters, the shots and the stars
EXTRA_VAPOUR = r"""'use strict';
// Written out and run by test_ports.py; see there.
const fs = require('fs'), path = require('path');
const GAME = process.argv[2], ROOT = process.argv[3];
globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(GAME, url), 'utf8')) });
require(path.join(ROOT, 'site/lib/c64.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const PAGE = fs.readFileSync(path.join(GAME, 'how-it-works.html'), 'utf8');
const grab = (f, a, b) => { const i = PAGE.indexOf(a), j = PAGE.indexOf(b); if (i < 0 || j < i) throw new Error(a + ' not found in how-it-works.html'); return PAGE.slice(i, j); };
const buildMap = new Function(grab('map.js', 'function buildMap', '// end of buildMap') + '\nreturn buildMap;')();
const V = new Function(grab('vapour.js', 'function vapourStart', '// end of vapour') + '\nreturn { vapourStart, vapourStep };')();
(async () => {
  const ram = (await C64.load('listing.json')).ram;
  let fail = 0;
  for (let lv = 1; lv <= 15; lv++) {
    const base = buildMap(ram, lv).m;
    let s1 = lv * 7919, s2 = s1;
    const gen = s => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return s; };
    const m1 = Uint8Array.from(base);
    const cpu = new CPU(m1, { port: { dir: 0x2F, data: 0x35 }, io: { write(a) { throw new Error('write ' + a.toString(16)); },
      read(a) { if (a !== 0xD41B) throw new Error('read ' + a.toString(16)); s1 = gen(s1); return (s1 >>> 0) & 255; } } });
    const m2 = Uint8Array.from(base), rnd = () => { s2 = gen(s2); return (s2 >>> 0) & 255; };
    cpu.call(0x173B); V.vapourStart(m2, rnd);
    let d = 0, first = -1, wreckMax = 0;
    const span = [[0x8200, 0xA400], [0x89, 0x8B], [0xA4D0, 0xA4E2]];   // the map, the column, the offsets
    for (let f = 1; f <= 600; f++) {
      cpu.call(0x16D2); V.vapourStep(m2, rnd);
      if (f === 50 || f === 150 || f === 300 || f === 600) {
        for (const [x, y] of span) for (let a = x; a < y; a++) if (cpu.m[a] !== m2[a]) { d++; if (first < 0) first = a; }
        let w = 0; for (let a = 0x8200; a < 0xA400; a++) if (m2[a] >= 0xF9 && m2[a] <= 0xFE) w++;
        wreckMax = Math.max(wreckMax, w);
      }
    }
    const wreck = wreckMax;
    if (d) { fail++; console.log('level', lv, d, 'bytes differ, first $' + first.toString(16)); }
    else console.log('level', lv, 'matches at frames 50, 150, 300 and 600; wreckage cells at most', wreck);
  }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log(e.stack || e); process.exit(1); });
"""

EXTRA_FIGHTERS = r"""'use strict';
// Written out and run by test_ports.py; see there.
const fs = require('fs'), path = require('path');
const GAME = process.argv[2], ROOT = process.argv[3];
globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(GAME, url), 'utf8')) });
require(path.join(ROOT, 'site/lib/c64.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const PAGE = fs.readFileSync(path.join(GAME, 'how-it-works.html'), 'utf8');
const grab = (f, a, b) => { const i = PAGE.indexOf(a), j = PAGE.indexOf(b); if (i < 0 || j < i) throw new Error(a + ' not found in how-it-works.html'); return PAGE.slice(i, j); };
const src = PAGE;
const flyWave = new Function(src.slice(src.indexOf('function flyWave'), src.indexOf('// end of flyWave')) + '\nreturn flyWave;')();
(async () => {
  const ram = (await C64.load('listing.json')).ram;
  let fail = 0, cmp = 0, removed = 0, onScreen = 0, steerSeen = 0;
  for (let w = 0; w < 57; w++) for (const noise of [0x7F, 0xFF]) for (const mantaY of [0x98, 0x62]) {
    const m = Uint8Array.from(ram);
    for (let a = 0x4800; a < 0x4BE8; a++) m[a] = 0x20;                       // an empty screen: no shots to hit
    m[0x2E] = m[0x2D] = 0; m[0x33] = mantaY; m[0x25] = 3; m[0x26] = 1; m[0x28] = 0; m[0x4F] = 8; m[0x24] = 0;
    m[0x0300] = w; m[0x6D] = 0x00; m[0x6E] = 0x03;
    const vic = new Uint8Array(0x2F);
    const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: {
      write(a, v) { if (a >= 0xD000 && a < 0xD02F) vic[a - 0xD000] = v; else if (!(a >= 0xD400 && a <= 0xD418)) throw new Error('write ' + a.toString(16)); },
      read(a) { if (a >= 0xD000 && a < 0xD02F) return vic[a - 0xD000]; if (a === 0xD41B) return noise; throw new Error('read ' + a.toString(16)); } } });
    cpu.call(0x1A98);                                                         // new_wave
    const P = flyWave(ram, w, { mantaY, noise, frames: 600 });
    let bad = null;
    for (let f = 1; f <= 600 && !bad; f++) {
      cpu.m[0x62] = (cpu.m[0x62] + 1) & 255; cpu.call(0x1BFD);                // enemies_frame
      for (let s = 0; s < 6; s++) {
        const T = P.slots[s]; if (!T) continue;
        const on = f <= T.length && (f < T.length || T.length === 600 || false);
        const gameOn = cpu.m[0xA490 + s] === 2;
        const portOn = f < T.length || (f === T.length && f === 600) || (f === T.length && T.length === 600);
        if (f === T.length && T.length < 600) { if (gameOn) bad = `wave ${w} slot ${s} frame ${f}: the port switched it off, the game did not`; else removed++; continue; }
        if (f > T.length) { if (gameOn) bad = `wave ${w} slot ${s} frame ${f}: still flying in the game`; continue; }
        if (!gameOn) { bad = `wave ${w} slot ${s} frame ${f}: the game switched it off, the port did not`; continue; }
        const gx = vic[2 * s] | ((vic[0x10] >> s) & 1) << 8, gy = vic[2 * s + 1], [px, py, pe] = T[f - 1];
        cmp++; if (pe === 0x80) onScreen++;
        if (gx !== px || gy !== py || cpu.m[0xA4E8 + s] !== pe) bad = `wave ${w} slot ${s} frame ${f}: game ${gx},${gy},${cpu.m[0xA4E8 + s].toString(16)} port ${px},${py},${pe.toString(16)}`;
      }
    }
    if (bad) { fail++; if (fail < 8) console.log('DIFFERS noise', noise.toString(16), 'mantaY', mantaY.toString(16), bad); }
  }
  console.log(`${cmp} fighter-frames compared (${onScreen} on screen), ${removed} fighters switched off in both; ${fail ? fail + ' runs differ' : 'all match'}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log(e.stack || e); process.exit(1); });
"""

EXTRA_SHOTS = r"""'use strict';
// Written out and run by test_ports.py; see there.
const fs = require('fs'), path = require('path');
const GAME = process.argv[2], ROOT = process.argv[3];
globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(GAME, url), 'utf8')) });
require(path.join(ROOT, 'site/lib/c64.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const PAGE = fs.readFileSync(path.join(GAME, 'how-it-works.html'), 'utf8');
const grab = (f, a, b) => { const i = PAGE.indexOf(a), j = PAGE.indexOf(b); if (i < 0 || j < i) throw new Error(a + ' not found in how-it-works.html'); return PAGE.slice(i, j); };
const buildMap = new Function(grab('map.js', 'function buildMap', '// end of buildMap') + '\nreturn buildMap;')();
const shotsFrame = new Function(grab('shots.js', 'function shotsFrame', '// end of shots') + '\nreturn shotsFrame;')();
(async () => {
  const ram = (await C64.load('listing.json')).ram;
  let seed = 20261015; const rnd = n => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
  let fail = 0, frames = 0; const seen = {};
  for (let lv = 1; lv <= 15; lv++) {
    const base = buildMap(ram, lv).m;
    const cs = base[0xE040 + lv] << 8; base.set(base.subarray(cs, cs + 0x400), 0x7C00);   // the level's tiles in place
    for (let trial = 0; trial < 40; trial++) {
      const m1 = Uint8Array.from(base);
      const c0 = 64 + rnd(400);                                         // a window of 40 columns
      m1[0x50] = c0 >> 1; m1[0x51] = (c0 + 40) >> 1; m1[0x2A7F] = rnd(2) ? 0x80 : 0; m1[0x2AA0] = m1[0x2A7F] ? 0x10 : 0;
      for (let x = 0; x < 6; x++) {
        if (rnd(3) === 0) { m1[0xA460 + x] = 0; continue; }
        const a = 0x8200 + rnd(17) * 0x200 + c0 + 4 + rnd(32);
        m1[0xA460 + x] = rnd(2) ? 2 : 0xFE; m1[0xA430 + x] = a & 255; m1[0xA440 + x] = a >> 8; m1[0xA450 + x] = m1[a]; m1[0xA470 + x] = rnd(7);
      }
      const m2 = Uint8Array.from(m1);
      const cpu = new CPU(m1, { port: { dir: 0x2F, data: 0x35 }, io: { write(a) { if (!(a >= 0xD400 && a <= 0xD418)) throw new Error('write ' + a.toString(16)); }, read(a) { throw new Error('read ' + a.toString(16)); } } });
      for (let f = 0; f < 30; f++) {
        cpu.call(0x2A17); const ev = shotsFrame(m2); frames++;
        for (const e of ev) if (e) seen[e] = (seen[e] || 0) + 1;
        let d = -1;
        for (const [x, y] of [[0x8200, 0xA400], [0x7800, 0x8000], [0xA430, 0xA478], [0x2A7F, 0x2A80], [0x2AA0, 0x2AA1]])
          for (let a = x; a < y && d < 0; a++) if (cpu.m[a] !== m2[a]) d = a;
        if (d >= 0) { fail++; if (fail < 6) console.log('level', lv, 'trial', trial, 'frame', f, 'differs at $' + d.toString(16), cpu.m[d], m2[d]); break; }
      }
    }
  }
  console.log(`${frames} frames compared; shot outcomes ${JSON.stringify(seen)}; ${fail ? fail + ' runs differ' : 'all match'}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log(e.stack || e); process.exit(1); });
"""

EXTRA_STARS = r"""'use strict';
// Written out and run by test_ports.py; see there.
const fs = require('fs'), path = require('path');
const GAME = process.argv[2], ROOT = process.argv[3];
globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(GAME, url), 'utf8')) });
require(path.join(ROOT, 'site/lib/c64.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const PAGE = fs.readFileSync(path.join(GAME, 'how-it-works.html'), 'utf8');
const grab = (f, a, b) => { const i = PAGE.indexOf(a), j = PAGE.indexOf(b); if (i < 0 || j < i) throw new Error(a + ' not found in how-it-works.html'); return PAGE.slice(i, j); };
const s = PAGE;
const drawStars = new Function(s.slice(s.indexOf('function drawStars'), s.indexOf('// end of stars')) + '\nreturn drawStars;')();
(async () => {
  const ram = (await C64.load('listing.json')).ram;
  let seed = 77; const rnd = n => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
  let fail = 0, n = 0, hidden = 0, shown = 0;
  for (let t = 0; t < 2000; t++) {
    const m1 = Uint8Array.from(ram);
    for (let a = 0x4800; a < 0x4BE8; a++) m1[a] = rnd(3) ? 0x20 : 0x80 + rnd(0x60);   // spaces and hull
    m1[0x8D] = rnd(16); m1[0x2C] = rnd(8); m1[0x58] = rnd(8); m1[0x4D] = 8 + rnd(8);
    for (let x = 0; x < 16; x++) { const a = 0x4800 + (7 + rnd(16)) * 40 + rnd(40); m1[0xA400 + x] = a >> 8; m1[0xA410 + x] = a & 255; m1[0xA480 + x] = (a >> 8) + 0x90; m1[0xA420 + x] = 0x42 + rnd(2); }
    const m2 = Uint8Array.from(m1);
    const cpu = new CPU(m1, { port: { dir: 0x2F, data: 0x35 }, io: { write(a, v) { if (a >= 0xD800 && a < 0xDC00) m1[a] = v; else throw new Error('write ' + a.toString(16)); }, read(a) { throw new Error('read ' + a.toString(16)); } } });
    cpu.call(0x2ED7); drawStars(m2); n++;
    for (let x = 0; x <= m2[0x8D]; x++) { const a = m2[0xA400 + x] << 8 | m2[0xA410 + x]; if (m2[a] === 0x42 || m2[a] === 0x43) shown++; else hidden++; }
    for (const [x, y] of [[0x4800, 0x4C00], [0xD800, 0xDC00], [0x7A10, 0x7A20]]) for (let a = x; a < y; a++) if (cpu.m[a] !== m2[a]) { fail++; console.log('trial', t, 'differs at $' + a.toString(16)); break; }
  }
  console.log(`${n} frames compared, ${shown} stars drawn and ${hidden} under the hull; ${fail ? fail + ' differ' : 'all match'}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log(e.stack || e); process.exit(1); });
"""

EXTRA_MINE = r"""'use strict';
// Written out and run by test_ports.py; see there.
const fs = require('fs'), path = require('path');
const GAME = process.argv[2], ROOT = process.argv[3];
globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(GAME, url), 'utf8')) });
require(path.join(ROOT, 'site/lib/c64.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const s = fs.readFileSync(path.join(GAME, 'how-it-works.html'), 'utf8');
if (s.indexOf('function flyMine') < 0) throw new Error('flyMine not found in how-it-works.html');
const flyMine = new Function(s.slice(s.indexOf('function flyMine'), s.indexOf('// end of flyMine')) + '\nreturn flyMine;')();
(async () => {
  const ram = (await C64.load('listing.json')).ram;
  let seed = 4242; const rnd = n => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
  let fail = 0, frames = 0, burst = 0, gone = 0;
  for (let t = 0; t < 600; t++) {
    const m = Uint8Array.from(ram), vic = new Uint8Array(0x2F), s0 = rnd(6);
    const o = { x: 24 + rnd(320), y: 0x62 + rnd(0x76), mantaY: 0x62 + rnd(0x76), level: 1 + rnd(15), diff: [0, 0x10, 0x20, 0x30][rnd(4)], phase: rnd(256), frac: rnd(256), frames: 600 };
    for (let a = 0x4800; a < 0x4BE8; a++) m[a] = 0x20;
    m[0x2E] = m[0x2D] = 0; m[0x33] = o.mantaY; m[0x3D] = 0x20; m[0x62] = o.phase; m[0x26] = o.level; m[0x28] = o.diff;
    for (let k = 0; k < 6; k++) m[0xA490 + k] = 0;
    // the slot as spawn_mine leaves it ($1FA6), with the leftover fraction
    m[0xA490 + s0] = 8; m[0xA4B0 + s0] = (o.level * 4 + o.diff) & 255 | 0x80; m[0xA498 + s0] = m[0xA4A8 + s0] = m[0xA4A0 + s0] = 0; m[0xA4C8 + s0] = o.frac;
    vic[2 * s0] = o.x & 255; vic[0x10] = (o.x >> 8) << s0; vic[2 * s0 + 1] = o.y; vic[0x15] = 1 << s0; m[0x4BF8 + s0] = 0x1D;
    const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: {
      write(a, v) { if (a >= 0xD000 && a < 0xD02F) vic[a - 0xD000] = v; else if (!(a >= 0xD400 && a <= 0xD418)) throw new Error('write ' + a.toString(16)); },
      read(a) { if (a >= 0xD000 && a < 0xD02F) return vic[a - 0xD000]; if (a === 0xD41B) return 0xFF; throw new Error('read ' + a.toString(16)); } } });
    const P = flyMine(o);
    let bad = null;
    for (let f = 0; f < P.length + 1 && !bad; f++) {
      cpu.m[0x62] = (cpu.m[0x62] + 1) & 255; cpu.call(0x1BFD); frames++;
      const st = cpu.m[0xA490 + s0], gx = vic[2 * s0] | ((vic[0x10] >> s0) & 1) << 8, gy = vic[2 * s0 + 1], sh = cpu.m[0x4BF8 + s0];
      if (f === P.length) { if (st === 8 || st === 10) bad = `frame ${f}: the game's mine flies on`; else gone++; break; }
      const [px, py, pst, psh] = P[f];
      if (pst === 6) { burst++; if (st !== 6 || sh !== 0x14) bad = `frame ${f}: the port bursts, the game has state ${st}`; break; }
      if (st !== pst || gx !== px || gy !== py || sh !== psh) bad = `frame ${f}: game ${st} ${gx},${gy} $${sh.toString(16)}, port ${pst} ${px},${py} $${psh.toString(16)}`;
    }
    if (bad) { fail++; if (fail < 6) console.log('trial', t, JSON.stringify(o), bad); }
  }
  console.log(`${frames} mine frames compared over 600 mines; ${burst} burst, ${gone - burst > 0 ? gone - burst : 0} left the screen; ${fail ? fail + ' differ' : 'all match'}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log(e.stack || e); process.exit(1); });
"""


def main():
    node = shutil.which("node")
    if not node:
        if os.environ.get("KIT_REQUIRE_TOOLS"):
            sys.exit("FAIL - node is required (KIT_REQUIRE_TOOLS is set)")
        print("SKIP - node is not installed")
        return 0
    with tempfile.TemporaryDirectory() as d:
        script = os.path.join(d, "ports.js")
        with open(script, "w") as f:
            f.write(JS)
        r = subprocess.run([node, script, HERE, ROOT] + PAGES)
        codes = [r.returncode]
        for name, js in (("vaporising", EXTRA_VAPOUR), ("fighters", EXTRA_FIGHTERS), ("shots", EXTRA_SHOTS), ("stars", EXTRA_STARS), ("homing mines", EXTRA_MINE)):
            f = os.path.join(d, name + ".js")
            with open(f, "w") as out:
                out.write(js)
            print("--", name)
            codes.append(subprocess.run([node, f, HERE, ROOT]).returncode)
    ok = not any(codes)
    print("OK - every port matches the game" if ok else "FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
