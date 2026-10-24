#!/usr/bin/env node
// Holds the page's player for Darkman's two sound drivers against the game's own code. The page's
// createDriver runs the driver on the kit's 6502 simulator over the bytes of level 1's listing, as
// sid.js hands it; this test runs the same driver on kit/cpu/cpu6502.js directly, on memory built
// the way the game builds it (copy_to_a000 copies 19 pages from $80B4 to $A000, and copy_to_b000
// copies 13 pages from $747B to $B000 and calls $B0C8), and compares every write to the sound chip,
// in order, frame by frame:
//   the four tunes, started as the title code starts them ($A164 with X = 6 x tune, then $A242
//   once a frame), for 12,000 frames each;
//   the eleven sound effects, each started as a level starts them ($B0C8, then $B0EE with
//   X = 4 x effect, then $B176 once a frame), for 400 frames each.
// It also holds the page's embedded bytes to the listing, the effects' lengths to the table on the
// page, and the numbers the captions give to what this test counts. It exits 1 on any difference.
//   node games/c64/darkman/test_music.js [page.html]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, __dirname.endsWith(path.join('work', 'pages')) ? '../../../../..' : '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const gameDir = fs.existsSync(path.join(__dirname, 'game.json')) ? __dirname : path.resolve(__dirname, '../..');
const g = game(gameDir);
const page = process.argv[2] ? path.resolve(process.argv[2])
  : path.join(__dirname, fs.existsSync(path.join(__dirname, 'music.html')) ? 'music.html' : 'index.html');
const { createDriver, DM_TUNES, DM_SFX } = g.run(page, 'createDriver', 'createDriver', 'DM_TUNES', 'DM_SFX');
const html = g.read(page);
const ram = g.listing('parts/level1/listing.json').ram;
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };

// The page's bytes are the listing's: $817C-$93AB (the title copy, at $A0C8) and $7543-$80B3 (the
// sound-effect copy, at $B0C8).
const hexOf = (a, b) => Buffer.from(ram.slice(a, b + 1)).toString('hex');
if (DM_TUNES.base !== 0xA0C8 || DM_TUNES.mode !== 'tunes' || DM_TUNES.hex !== hexOf(0x817C, 0x93AB)) fail('DM_TUNES is not $817C-$93AB of the listing, at $A0C8');
if (DM_SFX.base !== 0xB0C8 || DM_SFX.mode !== 'sfx' || DM_SFX.hex !== hexOf(0x7543, 0x80B3)) fail('DM_SFX is not $7543-$80B3 of the listing, at $B0C8');

// The game's machine: memory as the copy routines leave it, the chips at $D000-$DFFF. The sound chip
// repeats every 32 bytes through $D400-$D7FF; its registers are 0 to 24. A write of the driver's
// outside those registers is counted (stray) and not sent on.
function machine(sfx) {
  const m = new Uint8Array(0x10000);
  const [from, to, pages] = sfx ? [0x747B, 0xB000, 13] : [0x80B4, 0xA000, 19];
  for (let i = 0; i < pages * 256; i++) m[to + i] = ram[from + i];
  let w = [];
  const stray = new Map();
  const cpu = new CPU(m, { port: 0x35, io: {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) {
      if (a < 0xD400 || a > 0xD7FF) throw new Error('write $' + a.toString(16));
      const r = (a - 0xD400) & 31;
      if (r < 25) w.push(r, v);
      if (a > 0xD418) stray.set(a, (stray.get(a) || 0) + 1);
    },
  } });
  return { cpu, mem: m, stray, take() { const x = w; w = []; return x; } };
}
const active = (M) => (M.mem[0xF7] | M.mem[0xF8] | M.mem[0xF9]) !== 0;

let total = 0;
const perTune = [], lengths = [], strays = [], loops = [];
const FRAMES_TUNE = 12000, FRAMES_FX = 400;
// what the voices show: the pattern numbers that share the address the stream starts at, and the
// wave program numbers, as the tunes use them
const PATTERNS = [['0', '1', '6'], ['2/8', '26', '27', '28', '29', '30', '31'], ['21', '22', '23'], ['69', '70', '71', '73', '75', '76/77', '78']];
const PROGRAMS = [[0, 1], [4, 5, 6], [2, 3], [7, 8, 9, 10]];
const seen = PATTERNS.map(() => new Set()), progs = PROGRAMS.map(() => new Set());

// run: the page's driver beside the game's, for `frames` frames after the start; returns the
// number of frames the voices ran (the voices' flags at $F7-$F9 clear at the end of that frame).
function run(label, sfx, n, frames, tuneIndex) {
  const M = machine(sfx), d = createDriver(sfx ? DM_SFX : DM_TUNES, kit);
  d.init(n);
  if (sfx) { M.cpu.call(0xB0C8, {}); M.cpu.call(0xB0EE, { x: 4 * n }); } else M.cpu.call(0xA164, { x: 6 * n });
  let a = M.take(), count = a.length / 2;
  if (a.join() !== d.writes.join()) fail(label, 'start', a.join(), '|', d.writes.join());
  let ran = 0, over = false, lastKey = -1;
  const firstSeen = new Map(), loop = [];
  loops[n + (sfx ? 4 : 0)] = loop;
  for (let f = 0; f < frames; f++) {
    d.play();
    const b = d.writes.join();
    M.cpu.call(sfx ? 0xB176 : 0xA242, {});
    const w = M.take();
    if (f === 0) a = a.concat(w); else a = w;
    count += w.length / 2;
    if (a.join() !== b) { fail(label, 'frame', f, a.join(), '|', b); return { count, ran }; }
    if (d.playing() !== active(M)) { fail(label, 'playing() differs at frame', f); return { count, ran }; }
    if (!over) { if (active(M)) ran = f + 1; else over = true; }
    if (!sfx) for (let x = 0; x < 3; x++) {
      const v = d.voice(x);
      if (v.running) {
        seen[tuneIndex].add(v.pattern.join('/'));
        v.program.forEach((p) => progs[tuneIndex].add(p));
        if (!v.pattern.length || v.program.length > 1) fail(label, 'voice', x, 'frame', f, JSON.stringify(v));
        if (x === 0) {                                  // where voice 1's track list loops back
          const key = v.at * 256 + M.mem[0xA014];
          if (key !== lastKey) { lastKey = key; if (loop.length === 0 && firstSeen.has(key)) loop.push(firstSeen.get(key), f); else if (!firstSeen.has(key)) firstSeen.set(key, f); }
        }
      }
    }
  }
  return { count, ran };
}

for (let t = 0; t < 4; t++) {
  const r = run('tune ' + t, false, t, FRAMES_TUNE, t);
  perTune.push(r.count); total += r.count;
  console.log(`tune ${t}: ${FRAMES_TUNE} frames agree, ${r.count} writes, ${r.ran < FRAMES_TUNE ? 'voices stop on frame ' + (r.ran + 1) : 'still running'}; track list returns: ${loops[t].join(' -> ') || 'never'}`);
  lengths.push(r.ran + 1);
  const got = [...seen[t]].sort((x, y) => parseInt(x) - parseInt(y)).join(), want = PATTERNS[t].join();
  if (got !== want) fail('tune', t, 'patterns seen', got, 'expected', want);
  const gp = [...progs[t]].sort((a, b) => a - b).join();
  if (gp !== PROGRAMS[t].join()) fail('tune', t, 'wave programs seen', gp, 'expected', PROGRAMS[t].join());
}
for (let n = 0; n <= 10; n++) {
  const r = run('effect ' + n, true, n, FRAMES_FX);
  perTune.push(r.count); total += r.count;
  lengths.push(r.ran < FRAMES_FX - 1 ? r.ran + 1 : null);
  // the zeros the effect's start sends outside the sound chip's own registers
  const S = machine(true); S.cpu.call(0xB0C8, {}); S.cpu.call(0xB0EE, { x: 4 * n });
  strays.push([...S.stray.keys()].map((a) => '$' + a.toString(16).toUpperCase()).join(' '));
  console.log(`effect ${n}: ${FRAMES_FX} frames agree, ${r.count} writes, ${lengths[4 + n] ? 'voices stop on frame ' + lengths[4 + n] : 'never ends'}; stray: ${strays[n] || 'none'}`);
}
const writesTunes = perTune.slice(0, 4).reduce((a, b) => a + b, 0), writesFx = perTune.slice(4).reduce((a, b) => a + b, 0);
console.log('writes compared', writesTunes, 'for the tunes,', writesFx, 'for the effects');
if (process.env.DM_COUNTS) fs.writeFileSync(process.env.DM_COUNTS, JSON.stringify({ perTune, lengths: lengths.slice(4).map((l) => l === null ? 400 : l - 1), strays }));

// The page says what this test measured.
const comma = (n) => n.toLocaleString('en-US');
const attr = (tag, name) => { const m = new RegExp(name + '="([^"]*)"').exec(tag); return m ? m[1] : null; };
const rowOf = (key, n) => { const m = new RegExp('<tr data-' + key + '="' + n + '"[^>]*>').exec(html); if (!m) fail('the page has no row for', key, n); return m ? m[0] : ''; };
for (let t = 0; t < 4; t++) {
  const row = rowOf('tune', t), l = loops[t];
  if (t === 2) { if (attr(row, 'data-end') !== String(lengths[2])) fail('tune 2 ends on frame', lengths[2], 'but the page says', attr(row, 'data-end')); continue; }
  if (attr(row, 'data-opening') !== String(l[0]) || attr(row, 'data-loop') !== String(l[1] - l[0])) fail('tune', t, 'loops from', l[0], 'every', l[1] - l[0], 'but the page says', row);
  const secs = ((l[1] - l[0]) / 50.12).toFixed(1);
  if (!html.includes(comma(l[1] - l[0]) + (t === 1 ? ' (' : ' frames (') + secs + ' s)')) fail('the page does not give the loop of tune', t, 'as', comma(l[1] - l[0]), 'frames,', secs, 's');
}
if (!html.includes('(' + (lengths[2] / 50.12).toFixed(1) + ' s)')) fail('the page does not give the length of tune 2');
for (let n = 0; n <= 10; n++) {
  const row = rowOf('fx', n);
  if (attr(row, 'data-frames') !== String(lengths[4 + n] || '')) fail('effect', n, 'lasts', lengths[4 + n], 'frames but the page says', row);
  if (attr(row, 'data-stray') !== strays[n]) fail('effect', n, 'writes outside the chip at', strays[n], 'but the page says', row);
}
const counts = (k) => { const m = new RegExp('data-count="' + k + '">([^<]*)<').exec(html); return m ? m[1] : null; };
if (counts('tunes') !== comma(writesTunes)) fail('the page counts', counts('tunes'), 'tune writes, not', comma(writesTunes));
if (counts('effects') !== comma(writesFx)) fail('the page counts', counts('effects'), 'effect writes, not', comma(writesFx));
if (!html.includes('over ' + comma(FRAMES_TUNE) + ' frames of each tune') || !html.includes('over ' + comma(FRAMES_FX) + ' frames of each effect')) fail('the page does not give the frames compared');

// The page's player through sid.js's model: each tune and effect, started as the player starts it,
// makes sound for the first two seconds and does not stop the driver with an error.
g.lib('sid');
const E = globalThis.C64Sid.engine();
for (const [label, data, count] of [['tune', DM_TUNES, 4], ['effect', DM_SFX, 11]]) {
  for (let n = 0; n < count; n++) {
    const p = E.createPlayer(createDriver(data, kit), 44100, { filter: '6581' });
    p.command({ cmd: 'start', tune: n, run: 1, at: 0 });
    const out = new Float32Array(44100 * 2);
    p.render(out, out.length, 0, null);
    let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
    if (!(peak > 0.001)) fail(label, n, 'makes no sound through the model, peak', peak);
  }
}
console.log(bad ? bad + ' differences' : 'the page agrees with the game');
process.exit(bad ? 1 : 0);
