#!/usr/bin/env node
'use strict';
// Hold the Music page to the game's own code. music.html runs the game's two sound players on the
// kit's 6502: the tune player at $E000 (createDriver) and the sound-effect player at $B800
// (createSfxDriver, the qx-sfx block). This checks
// - that the bytes the page carries for each player are the listing's;
// - that each driver writes what the game's own code writes, run on the simulator directly over a
//   fresh copy of the listing: every SID write of every frame, in order, for every tune (for up to
//   TUNE_FRAMES frames) and every effect (to its end, or EFFECT_FRAMES frames for the three that
//   repeat);
// - the effects table's lengths in frames, and which effects repeat;
// - that every call to play_sfx ($8814) gives its effect number as the table says, none of them 2,
//   and that no effect's script starts another (command $86).
// Everything it needs is committed.
//   node games/c64/qix/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'music.html';
g.lib('cpu6502');
const C64Cpu = globalThis.C64Cpu;
const html = g.read(page);
const { createDriver } = g.run(page, 'createDriver');
const { createSfxDriver } = g.run(page, 'qx-sfx', 'createSfxDriver');
const MUSIC = JSON.parse(html.match(/const MUSIC = (\{.*?\});/)[1]);
const SFX = JSON.parse(html.match(/const SFX = (\{.*?\});/)[1]);
const L = g.listing();
const TUNE_FRAMES = 3000, EFFECT_FRAMES = 600;
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };
const h4 = (a) => '$' + a.toString(16).toUpperCase().padStart(4, '0');

// 1. The bytes
const same = (base, hex) => { for (let i = 0; i < hex.length / 2; i++) if (!L.has[base + i] || L.ram[base + i] !== parseInt(hex.substr(2 * i, 2), 16)) return base + i; return -1; };
let at = same(MUSIC.base, MUSIC.hex);
if (at >= 0) fail('MUSIC differs from the listing at', h4(at));
for (const [base, hex] of SFX.regions) { at = same(base, hex); if (at >= 0) fail('SFX differs from the listing at', h4(at)); }
if (SFX.regions[0][0] !== 0xB800 || SFX.regions[0][1].length / 2 !== 0x438) fail('SFX is not $B800-$BC37');

// The game's code on the simulator directly: SID writes as [register, value], memory as the listing
function machine(zp) {
  const m = L.ram.slice();
  if (zp) for (let i = 0; i < 16; i++) m[0xF0 + i] = parseInt(zp.substr(2 * i, 2), 16);
  let w = [];
  const cpu = new CPU(m, { port: 0x35, io: {
    read(a) { if (a >= 0xD400 && a < 0xD800) return 0; return m[a]; },
    write(a, v) { if (a >= 0xD400 && a < 0xD800) { if ((a & 0x1F) < 25) w.push(a & 0x1F, v); return; } m[a] = v; },
  } });
  const call = (e, r) => { w = []; cpu.call(e, Object.assign({ a: 0, x: 0, y: 0, d: 0 }, r), { maxSteps: 200000 }); return w; };
  return { m, cpu, call };
}
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// 2. The tunes: init with X = tune, then play once a frame while A comes back non-zero
for (let t = 0; t <= 10; t++) {
  const d = createDriver(MUSIC, C64Cpu), G = machine(MUSIC.zp);
  d.readback(0, 0, 0);
  d.init(t); const gi = G.call(0xE000, { x: t });
  if (!eq(d.writes, gi)) { fail('tune', t, 'init writes differ'); continue; }
  let f = 0, ok = true;
  for (; f < TUNE_FRAMES && d.playing(); f++) {
    d.play(); const gw = G.call(0xE006, {});
    if (!eq(d.writes, gw)) { fail('tune', t, 'frame', f, 'writes differ'); ok = false; break; }
    if ((G.cpu.a === 0) === d.playing()) { fail('tune', t, 'frame', f, 'ends apart from the game'); ok = false; break; }
  }
  if (ok && t === 10 && f < 600) fail('the title tune ends after', f, 'frames');
  if (process.env.QX_VERBOSE) console.log('tune', t, f, 'frames');
}

// 3. The effects: the table's names and lengths
const FRAMES = { 0: 3, 1: 101, 2: 51, 3: 'repeats', 4: 'repeats', 5: 72, 6: 47, 7: 73, 8: 73, 9: 57, 10: 'repeats', 11: 1 };
const sec = html.slice(html.indexOf('02 · The sound effects'));
for (let t = 0; t < 12; t++) {
  const row = sec.match(new RegExp('<tr><td><code>\\$' + t.toString(16).toUpperCase().padStart(2, '0') + '</code></td><td>[^<]*</td><td>.*?</td><td>([^<]*)</td></tr>'));
  const want = FRAMES[t] === 'repeats' ? 'until replaced' : String(FRAMES[t]);
  if (!row || row[1] !== want) fail('the table gives effect', t, row && row[1], 'want', want);
  const d = createSfxDriver(SFX, C64Cpu), G = machine();
  d.readback(0, 0, 0);
  d.init(t);
  const gw = G.call(0xB800, {}).concat([24, 0x4F], G.call(0xB806, { a: t }));
  if (!eq(d.writes, gw)) { fail('effect', t, 'start writes differ'); continue; }
  let f = 0;
  for (; f < EFFECT_FRAMES && d.playing(); f++) {
    d.play(); const w = G.call(0xB803, {});
    if (!eq(d.writes, w)) { fail('effect', t, 'frame', f, 'writes differ'); break; }
  }
  const len = f === EFFECT_FRAMES ? 'repeats' : f;
  if (len !== FRAMES[t]) fail('effect', t, 'lasts', len, 'frames, the table', FRAMES[t]);
}

// 4. The callers: every JSR play_sfx follows LDA #n, except the Qix's step (3 or 4)
const recs = L.listing.records.filter((r) => r.t === 'code');
const byAddr = new Map(recs.map((r) => [r.a, r]));
const asked = new Set();
for (const r of recs) {
  if ((r.m !== 'jsr' && r.m !== 'jmp') || !r.b || (r.b[1] | r.b[2] << 8) !== 0x8814) continue;
  if (r.a === 0x94EE) { [byAddr.get(0x94DB), byAddr.get(0x94E4)].forEach((x) => (x && x.m === 'lda' && x.b.length === 2 ? asked.add(x.b[1]) : fail('the Qix step\'s effects at $94DB, $94E4'))); continue; }
  let p = recs[recs.indexOf(r) - 1];
  if (r.a === 0x8DD3) { asked.add(byAddr.get(0x8DC6).b[1]); p = byAddr.get(0x8DD1); }
  if (!p || p.m !== 'lda' || p.b.length !== 2) { fail('play_sfx at', h4(r.a), 'without LDA #n before it'); continue; }
  asked.add(p.b[1]);
}
// nothing else asks the player for an effect: the JMP at $B966 is sfx_read's command dispatch,
// whose operand sfx_read rewrites before it runs ($B95B, $B961), so the listing's sfx_request there
// is only the snapshot's leftover
const rewrites = [0xB95B, 0xB961].map((a) => byAddr.get(a)).map((x) => x && x.b[1] | x.b[2] << 8);
if (!eq(rewrites, [0xB967, 0xB968])) fail('sfx_read does not rewrite the JMP at $B966');
for (const r of recs) if ((r.m === 'jsr' || r.m === 'jmp') && r.b && [0xB806, 0xB885].includes(r.b[1] | r.b[2] << 8) && ![0x8832, 0xB806, 0xB966].includes(r.a)) fail('another request at', h4(r.a));
const want = [0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11];
if (!eq([...asked].sort((a, b) => a - b), want)) fail('the program asks for effects', [...asked].sort((a, b) => a - b).join(','), 'want', want.join(','));
// no effect starts another: sfx_load ($B85C) runs once, for the effect asked for
for (let t = 0; t < 12; t++) {
  const G = machine(), loads = [];
  const hooks = { 0xB85C: (c) => { loads.push(c.x); } };
  G.cpu.call(0xB800, { a: 0, x: 0, y: 0, d: 0 }, { maxSteps: 200000 });
  G.cpu.call(0xB806, { a: t, x: 0, y: 0, d: 0 }, { maxSteps: 200000 });
  for (let f = 0; f < EFFECT_FRAMES; f++) G.cpu.call(0xB803, { a: 0, x: 0, y: 0, d: 0 }, { maxSteps: 200000, hooks });
  if (!eq(loads, [t])) fail('effect', t, 'loads', loads.join(','));
}
// the alarm's lock: timer_bar_empty sets sfx_lock to $FF, and play_sfx lets only 0, 1, 2, 5 and 9 through
const lock = byAddr.get(0x86A0);
if (!lock || lock.m !== 'sta' || (lock.b[1] | lock.b[2] << 8) !== 0x8813 || byAddr.get(0x869E).b[1] !== 0xFF) fail('the alarm\'s lock at $86A0');
const through = [0x8819, 0x881D, 0x8821, 0x8825, 0x8829].map((a) => byAddr.get(a).b[1]);
if (!eq(through, [5, 1, 2, 0, 9])) fail('play_sfx lets through', through.join(','));
console.log(bad ? `${bad} failures` : 'ok: both players\' bytes are the listing\'s; eleven tunes and twelve effects write as the game\'s code does; the effects table and its callers');
process.exit(bad ? 1 : 0);
