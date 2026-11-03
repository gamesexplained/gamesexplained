'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine and its pacing) run in node on the memory the page carries, from the game's first
// instruction. The port's lockstep (port/test/lockstep.js) holds each pass of the main program to
// the game's code; this one holds the page that is published, beside the game's own code on the
// kit's C64 (kit/c64/machine.js, from listing.json), with nothing from work/:
// - left alone, the title and the first 2,600 frames of the demonstration it plays after some 2,600
//   of its own, a death among them: each change of the game's state (the demonstration's flag, the enemy's handler, the scene, the
//   shields, the title or play on screen) the C64's, in the same order, within three frames and one
//   in 300 of those played (the page's passes cost what the game's do within a few hundred cycles,
//   and a pass that ends either side of line 256 waits a frame more or less);
// - from three moments of a game on level 5, with the same joystick frame by frame for 600 frames,
//   the same changes within three frames, and the C64's passes of the main loop within a percent;
// - the keys: 5 on the title picks level 5, F5 the next skill, F7 starts a game, Space pauses it and
//   the stick goes on, F1 brings back the title;
// - the raster's seven interrupts run once each a frame in play, on their lines.
// No frame throws, and the clock keeps to the frames.
//   node games/c64/encounter/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64'); g.lib('collide');
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'EncPort');
const { EncPage } = globalThis;
const cost = JSON.parse(/^window\.ENC_COST = (.*);$/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="enc-data">([^<]*)<\/script>/.exec(page)[1]);
const lib = require('./port/test/lib.js');

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const UP = 1, LEFT = 4, RIGHT = 8, FIRE = 16;

// ---- beside the C64: the game's state as each frame begins, the page's from the frame it shows
// (its memory is ahead of it), each part's changes on their own: the demonstration's flag ($71),
// the enemy's handler ($A3), the scene ($63), the shields ($6026) and the screen shown ($D018)
// the screen shown: the title ($6800) or the screens of play, which the interrupts and the main loop
// switch between buffers A and B ($6000, $6400) and their character sets through the frame
const SCREEN = { 0xA: 'title' };
const PARTS = { demo: M => M[0x71], state: M => (M[0xA3] | M[0xA4] << 8).toString(16), scene: M => M[0x63], shields: M => M[0x6026] };
function beside(frames, input, from, from_f = 0) {
  const rt = EncPage.create({ data, cost });
  const m = from ? lib.Machine.restore(from.state) : lib.boot();
  lib.hook(m);
  if (from) rt.restore(from.state, P => P.main({ at: from.at }), from.at);
  const A = {}, B = {};
  for (const k of Object.keys(PARTS).concat('screen')) { A[k] = []; B[k] = []; }
  const note = (L, f, M, d018) => {
    for (const [k, v] of Object.entries(PARTS)) { const x = v(M); if (!L[k].length || L[k][L[k].length - 1][1] !== x) L[k].push([f, x]); }
    const sc = SCREEN[d018 >> 4] || 'play';
    if (!L.screen.length || L.screen[L.screen.length - 1][1] !== sc) L.screen.push([f, sc]);
  };
  let pa = 0, pb = 0;
  const ml = rt.P.main_loop;
  rt.P.main_loop = function* (...a) { pa++; return yield* ml.apply(this, a); };
  const onPass = m.onPass;
  m.onPass = (...a) => { pb++; if (onPass) onPass(...a); };
  for (let f = 0; f < frames; f++) {
    const { keys, joy } = input(f + from_f);
    rt.input.keys = new Set(keys);
    m.keys = new Set(keys.map(k => lib.KEY[k]));
    rt.input.joy = m.joy = 0x1F & ~joy;
    note(B, f, m.ram, m.vic[0x18]);
    let F;
    try { F = rt.runFrame(); } catch (e) { fail('frame ' + f + ': ' + e.message); break; }
    m.runCycles(lib.FRAME);
    if (F) note(A, f, F.mem, F.vic[0x18]);
    if (rt.t < rt.target || rt.t > rt.target + 2 * lib.FRAME) { fail('frame ' + f + ': the clock at ' + rt.t + ', the frame\'s end at ' + rt.target); break; }
  }
  return { A, B, pa, pb, rt, m };
}
// each part's changes the same, in the same order, each within slack(frame) frames of the C64's
function sameEvents(what, A, B, slack, how) {
  let worst = 0, n = 0, where = '';
  for (const k of Object.keys(A)) {
    const a = A[k], b = B[k];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (!a[i] || !b[i] || a[i][1] !== b[i][1]) { fail(what + ': ' + k + ', change ' + i + ': on the page ' + (a[i] || []).join(' at frame ') + ', on the C64 ' + (b[i] || []).join(' at frame ')); return; }
      const o = Math.abs(a[i][0] - b[i][0]) - slack(b[i][0]);
      if (o > worst) { worst = o; where = k + ' ' + JSON.stringify(b[i][1]) + ' at the C64\'s frame ' + b[i][0] + ', ' + Math.abs(a[i][0] - b[i][0]) + ' frames from it'; }
    }
    n += a.length;
  }
  if (worst > 0) fail(what + ': a change further from the C64\'s than it may be (' + where + ')');
  else console.log(what + ': ' + n + ' changes of state, each on the C64\'s frame' + (n > 1 ? 's' : '') + ' within ' + how);
}
{
  // the title's countdown to the demonstration is some 131,000 of its passes; the demonstration plays
  // a game from a recorded stick until its shields run out, which takes it longer than this
  const r = beside(5200, () => ({ keys: [], joy: 0 }));
  if (r.A.demo.length < 2) fail('the demonstration did not start in 5,200 frames');
  sameEvents('left alone: the title, the demonstration', r.A, r.B, f => 3 + f / 300, 'three frames and one in 300 of those played');
}
{
  // moments of play: a game on level 5 (5, then F7) played on the C64 with the stick as a player
  // might hold it, saved at the main loop every 800 frames; from each, both play on for 600 frames
  // with the same stick. Further than that the two part, as a C64 would from itself: a pass that
  // ends a frame later reads the stick a frame later, and the saucers chase a player a pixel away.
  const stick = f => (f % 400 < 250 ? UP : 0) | (f % 400 >= 250 && f % 400 < 300 ? RIGHT : 0) | (f % 97 < 3 ? FIRE : 0) | (f % 700 > 640 ? LEFT : 0);
  const m = lib.boot();
  for (let f = 0; f < 40; f++) {
    if (f === 8) m.press('5'); if (f === 12) m.release('5');
    if (f === 20) m.press('F7'); if (f === 24) m.release('F7');
    m.runCycles(lib.FRAME);
  }
  let pa = 0, pb = 0;
  for (let k = 0; k < 3; k++) {
    lib.stopAt(m, lib.PASS);
    const from = { state: m.save(), at: lib.PASS };
    const r = beside(600, f => ({ keys: [], joy: stick(f) }), from, k * 800);
    sameEvents('a game on level 5 from frame ' + k * 800 + ', 600 frames', r.A, r.B, () => 3, 'three frames');
    pa += r.pa; pb += r.pb;
    for (let f = 0; f < 800; f++) { m.joy = 0x1F & ~stick(k * 800 + f); m.runCycles(lib.FRAME); }
  }
  const d = (pa - pb) / pb;
  if (Math.abs(d) > 0.01) fail('passes of the main loop: ' + pa + ' on the page, ' + pb + ' on the C64');
  else console.log('passes of the main loop in the three: ' + pa + ' on the page, ' + pb + ' on the C64 (' + (d * 100).toFixed(2) + '%)');
}

// ---- the page alone: the keys, the pause, the interrupts
{
  const rt = EncPage.create({ data, cost });
  const M = rt.M;
  let f = 0, threw = null;
  const run = (n, keys = [], joy = 0) => {
    rt.input.keys = new Set(keys); rt.input.joy = 0x1F & ~joy;
    for (let i = 0; i < n && !threw; i++, f++) {
      try { rt.runFrame(); } catch (e) { threw = e; fail('frame ' + f + ': ' + e.message); }
    }
  };
  const state = () => (M[0xA3] | M[0xA4] << 8);
  run(30);
  if (rt.vic[0x18] !== 0xAE) fail('the title is not on screen at frame 30: $D018 $' + rt.vic[0x18].toString(16));
  run(4, ['5']); run(30);
  // the keys 8 to 1 ($6931) give $A8, the level's first scene, as their place in the list x 16
  if (M[0xA8] !== 0x30) fail('5 on the title: level index $' + M[0xA8].toString(16) + ', not $30');
  const skill = M[0x62];
  run(4, ['F5']); run(30);
  if (M[0x62] !== (skill + 2) % 3) fail('F5: skill ' + M[0x62] + ' after ' + skill);
  run(4, ['F7']); run(60);
  if (M[0x63] !== 0x30 || rt.vic[0x18] === 0xAE) fail('F7: no game on level 5 (scene $' + M[0x63].toString(16) + ')');
  else console.log('the title: 5 picks level 5, F5 the next skill, F7 starts the game');
  // the raster's interrupts in a frame of play: each handler once, on its line
  const IRQ = { irq_status_band: 0x10, irq_view_top_sky: 0x42, irq_horizon_band1: 0x79, irq_horizon_band2: 0x7D,
    irq_horizon_band3: 0x80, irq_ground_mirror_charset: 0x82, irq_console_and_frame_tick: 0xC2 };
  const seen = {};
  for (const name of Object.keys(IRQ)) {
    const h = rt.P[name];
    rt.P[name] = function () { (seen[name] = seen[name] || []).push(Math.floor(rt.t / 63) % 312); return h.apply(this, arguments); };
  }
  run(100, [], UP);
  const off = Object.entries(IRQ).filter(([n, l]) => !seen[n] || seen[n].length < 98 || seen[n].length > 102 || seen[n].some(x => x !== l));
  if (off.length) fail('the raster interrupts: ' + off.map(([n]) => n + ' ' + (seen[n] || []).length + ' times').join(', '));
  else console.log('the seven raster interrupts once each a frame, on their lines');
  // Space pauses: the passes stop at the pause loop until the stick moves
  let passes = 0;
  const ml = rt.P.main_loop;
  rt.P.main_loop = function* (...a) { passes++; return yield* ml.apply(this, a); };
  run(3, ['SPACE']); run(10);
  const p0 = passes;
  run(100);
  if (passes !== p0) fail('Space: ' + (passes - p0) + ' passes in 100 frames of the pause');
  run(10, [], LEFT); run(20);
  if (passes === p0) fail('the stick moved: the pause goes on');
  else console.log('Space pauses the game, and the stick moved goes on');
  run(4, ['F1']); run(60);
  if (rt.vic[0x18] !== 0xAE || M[0x71]) fail('F1: no title ($D018 $' + rt.vic[0x18].toString(16) + ')');
  else console.log('F1 brings back the title');
  if (!threw) console.log(f + ' frames on the page alone, none threw');
}

if (fails) { console.log(fails + ' failed'); process.exit(1); }
console.log('ok');
