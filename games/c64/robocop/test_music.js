#!/usr/bin/env node
// Holds the Music page's player to the game's own code. The page's createDriver runs RoboCop's
// driver on the kit's 6502 over the bytes it embeds; this test checks that those bytes are
// $238F-$3710 of level one's listing, then runs the page's driver beside the game's driver
// (level one's memory as the listing records it) and compares every write to the sound chip,
// frame by frame:
//   the five tunes, started by start_tune_always $2480 (X = 6 x tune), then music_tick $254F once
//   a frame, for 6,000 frames each;
//   the fourteen sound effects, with the sound option $A706 at 1 (effects), started by
//   play_effect $2398 (A = effect), then $254F once a frame, for 400 frames each.
// It also runs levels two and three's own copies of the driver and checks that they write the same
// as level one's for every tune and effect, and holds the lengths in the page's tables to what the
// driver does. It exits 1 on any difference.
//   node games/c64/robocop/test_music.js [page.html]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const page = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'music.html');
const { createDriver, RC_DRIVER } = g.run(page, 'createDriver', 'createDriver', 'RC_DRIVER');
const html = g.read(page);
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };

const L1 = g.listing('parts/level-1/listing.json').ram;
if (RC_DRIVER.hex !== Buffer.from(L1.slice(0x238F, 0x3711)).toString('hex')) fail('the page\'s bytes are not $238F-$3710 of level one\'s listing');

// Each level's driver: where it starts a tune and an effect, where the player is, and the sound option.
const LEVELS = {
  1: { tune: 0x2480, fx: 0x2398, tick: 0x254F, option: 0xA706, flags: 0x067C },
  2: { tune: 0x23A1, fx: 0x22B9, tick: 0x2470, option: 0xAA3D, flags: 0x067B },
  3: { tune: 0x2295, fx: 0x21AD, tick: 0x2364, option: 0xA26A, flags: 0x067B },
};
function machine(level) {
  const ram = level === 1 ? L1 : g.listing(`parts/level-${level}/listing.json`).ram;
  const m = new Uint8Array(0x10000);
  for (let a = 0x0F00; a < 0xC000; a++) m[a] = ram[a];
  for (let a = 0x0600; a < 0x0800; a++) m[a] = 0;          // the driver's variables, as at power-on
  let w = [];
  const cpu = new CPU(m, { port: 0x35, io: {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a < 0xD400 || a > 0xD418) throw new Error('write $' + a.toString(16)); w.push(a - 0xD400, v); },
  } });
  return { cpu, m, take() { const x = w; w = []; return x; } };
}
function gameRun(level, fx, n, frames) {
  const P = LEVELS[level], M = machine(level), out = [];
  let end = null;
  if (fx) { M.m[P.option] = 1; M.cpu.call(P.fx, { a: n }); } else M.cpu.call(P.tune, { x: 6 * n });
  let first = M.take();
  for (let f = 0; f < frames; f++) {
    M.cpu.call(P.tick, {});
    out.push((f === 0 ? first.concat(M.take()) : M.take()).join());
    if (end === null && !(M.m[P.flags] | M.m[P.flags + 1] | M.m[P.flags + 2])) end = f + 1;
  }
  return { out, end };
}

const ends = { tune: [], fx: [] };
for (const [kind, count, frames] of [['tune', 5, 6000], ['fx', 14, 400]]) {
  for (let n = 0; n < count; n++) {
    const want = gameRun(1, kind === 'fx', n, frames);
    ends[kind][n] = want.end;
    const d = createDriver({ mode: kind === 'fx' ? 'sfx' : 'tunes', hex: RC_DRIVER.hex }, kit);
    d.init(n);
    for (let f = 0; f < frames; f++) {
      d.play();
      if (d.writes.join() !== want.out[f]) { fail(kind, n, 'frame', f); break; }
      if (d.playing() !== (want.end === null || f + 1 < want.end)) { fail(kind, n, 'playing() differs at frame', f); break; }
    }
    for (const level of [2, 3]) {
      const other = gameRun(level, kind === 'fx', n, frames);
      if (other.out.join('|') !== want.out.join('|')) fail(kind, n, 'level', level, 'writes other values than level one');
    }
  }
}
console.log('tunes end on call', ends.tune.join(', '), '| effects end on call', ends.fx.join(', '));

const attr = (re) => { const m = re.exec(html); return m ? m[1] : null; };
for (let n = 0; n < 5; n++) {
  const got = attr(new RegExp('<tr data-tune="' + n + '"(?: data-end="(\\d*)")?'));
  if ((got || null) !== (ends.tune[n] === null ? null : String(ends.tune[n]))) fail('tune', n, 'ends on call', ends.tune[n], 'but the page says', got);
  if (ends.tune[n] !== null && !html.includes(ends.tune[n] + ' calls (' + (ends.tune[n] / 59.83).toFixed(1) + ' s)')) fail('tune', n, 'length text');
}
for (let n = 0; n < 14; n++) {
  const got = attr(new RegExp('<tr data-fx="' + n + '" data-frames="(\\d*)"'));
  if (got !== (ends.fx[n] === null ? '' : String(ends.fx[n]))) fail('effect', n, 'ends on call', ends.fx[n], 'but the page says', got);
}

// The player through sid.js's model: every tune and effect makes sound in its first second.
g.lib('sid');
const E = globalThis.C64Sid.engine();
for (const [mode, count] of [['tunes', 5], ['sfx', 14]]) for (let n = 0; n < count; n++) {
  const p = E.createPlayer(createDriver({ mode, hex: RC_DRIVER.hex }, kit), 44100, { filter: '6581', ntsc: true });
  p.command({ cmd: 'start', tune: n, run: 1, at: 0 });
  const out = new Float32Array(44100);
  p.render(out, out.length, 0, null);
  let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (!(peak > 0.001)) fail(mode, n, 'makes no sound through the model');
}
console.log(bad ? bad + ' differences' : 'the page agrees with the game');
process.exit(bad ? 1 : 0);
