'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine, the pacing, and its way through the title and the menu) run in node on listing.json,
// from the game's first instruction at $1AF4, beside the game's own code on the kit's C16
// (kit/c16/machine.js, with the KERNAL's keyboard scan) given the same keys and stick. The port's
// own tests hold each routine and the whole game to the game's code (port/test, on moments of play
// saved in work/); this one holds the page that is published, with nothing from work/.
// - the title comes up within two frames of the C16's, drawn in its colours, and the tune plays;
// - RETURN brings the menu, and F1 the first pass of room 0 within two frames of the C16's;
// - in play the page runs as many passes as the C16 in the same frames, to 1 %; right walks him,
//   Space jumps with a note, and the game writes to TED's sound registers and only to them;
// - P pauses, with no pass until P is pressed again; D loses a life, and with Plus/4 World's
//   lives poke it does not;
// - the page's way to a game (PuniPlan) starts one for one player and one for two, the page and
//   the C16 given the same keys reaching the first pass within two frames of each other; and the
//   keyboard game, F2, walks him with X;
// - played at random for a minute, the clock keeps to the frames.
// No frame throws.
//   node games/c16/mr-puniverse/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, KEY, kernalHooks } = require(path.join(ROOT, 'kit/c16/machine.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c16');
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'PuniPort');
const { PuniPlan } = g.run(PAGE, 'plan', 'PuniPlan');
const { PuniPage, PuniPort } = globalThis;
const { T } = PuniPort;
const cost = JSON.parse(/^window\.PUNI_COST = (.*);$/m.exec(page)[1]);

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const RIGHT = 0x17, FIRE = 0x0F, STILL = 0x1F;

// The game's memory as the page has it, and the C16 at the tape's hand-over with the same bytes
const ram = () => g.listing().ram;
function c16() {
  const r = ram();
  for (const [a, b] of PuniPort.KERNAL_RAM) r.set(b, a);
  const m = new Machine({ ram: r, pc: 0x1AF4, passAt: 0x32BC });
  m.cpu.sp = 0xF6;
  Object.assign(m.hooks, kernalHooks(m));
  return m;
}
const page0 = () => PuniPage.create({ ram: ram(), cost });
let rt = page0(), m = c16(), f = 0, threw = null;
const frames = [];
// n frames of both, the stick held at joy and the keys (KEY numbers) held
function run(n, joy = STILL, keys = []) {
  for (let i = 0; i < n && !threw; i++, f++) {
    rt.input.joy = m.joy = joy; rt.input.keys = new Set(keys);
    m.releaseAll(); for (const k of keys) m.press(k);
    m.runFrames(1);
    try { frames[f] = rt.runFrame(); } catch (e) { threw = e; fail('frame ' + f + ': ' + e.message); }
  }
}
// the frame at which a condition first holds, on each, within n frames
function until(n, mWhen, pWhen, joy = STILL, keys = []) {
  let mAt = -1, pAt = -1;
  for (let i = 0; i < n && (mAt < 0 || pAt < 0) && !threw; i++) {
    run(1, joy, keys);
    if (mAt < 0 && mWhen(m)) mAt = f;
    if (pAt < 0 && pWhen(rt)) pAt = f;
  }
  return [mAt, pAt];
}
const near = (what, [mAt, pAt]) => {
  if (mAt < 0 || pAt < 0) { fail(what + ' never came: the C16 at ' + mAt + ', the page at ' + pAt); return false; }
  if (Math.abs(mAt - pAt) > 2) { fail(what + ' in frame ' + pAt + ', the C16\'s in ' + mAt); return false; }
  console.log(what + ': frame ' + pAt + ', the C16\'s ' + mAt);
  return true;
};
const sounds = (f0, f1) => {
  let n = 0, elsewhere = 0;
  for (let i = f0; i < f1; i++) {
    const s = frames[i].sound;
    if (s.length) n++;
    for (let j = 1; j < s.length; j += 3) if (s[j] < 0xFF0E || s[j] > 0xFF12) elsewhere++;
  }
  if (elsewhere) fail(elsewhere + ' sound writes outside $FF0E-$FF12');
  return n;
};
const block = M => M[0x3F] | M[0x40] << 8;

// the title, its colours and its tune
near('the title', until(200, mm => mm.ram[0x0C32] === 0x10, r => r.M[0x0C32] === 0x10));
run(100);
const colours = new Set(C16.renderBands(frames[f - 1].bands, { size: 0x4000 }).px);
if (colours.size < 4) fail('the title drawn in ' + colours.size + ' colours');
else console.log('the title: ' + colours.size + ' colours, ' + frames[f - 1].bands.length + ' bands');
if (!sounds(f - 100, f)) fail('no tune on the title');

// RETURN, the menu; F1, the first pass of room 0
run(8, STILL, [KEY.RETURN]);
near('the menu', until(100, mm => mm.ram[0x0D21] === 0x06, r => r.M[0x0D21] === 0x06));
run(8, STILL, [KEY.F1]);
const passed = who => { const p0 = who.passes; return () => who.passes > p0; };
const mFirst = passed(m), pFirst = passed(rt);
near('room 0\'s first pass after F1', until(400, mFirst, pFirst));

// play: the passes in the same frames, walking right, jumping
{
  const m0 = m.passes, p0 = rt.passes, b0 = block(rt.M), f0 = f;
  run(60, RIGHT); const b1 = block(rt.M);
  const s0 = f; run(30, FIRE); run(30); const jumpSound = sounds(s0, f);
  run(60, STILL);
  const dm = m.passes - m0, dp = rt.passes - p0;
  if (Math.abs(dp - dm) > Math.max(2, dm / 100)) fail('in ' + (f - f0) + ' frames of play the page ran ' + dp + ' passes, the C16 ' + dm);
  else console.log('play: ' + dp + ' passes in ' + (f - f0) + ' frames, the C16 ' + dm);
  if (b1 <= b0) fail('right held for 60 frames left his block at $' + b1.toString(16) + ' from $' + b0.toString(16));
  if (!jumpSound) fail('no note for the jump');
  console.log('walking: his block from $' + b0.toString(16) + ' to $' + b1.toString(16) + '; the jump\'s note in ' + jumpSound + ' frames');
}

// P pauses until P again
{
  run(6, STILL, [KEY.P]); run(10);
  const p0 = rt.passes, mp0 = m.passes;
  run(100);
  if (rt.passes !== p0 || m.passes !== mp0) fail('paused, the page ran ' + (rt.passes - p0) + ' passes, the C16 ' + (m.passes - mp0));
  run(6, STILL, [KEY.P]); run(30);
  if (rt.passes === p0) fail('P again did not go on');
  else console.log('P paused for 100 frames and P went on');
}

// D: a life lost; with the lives poke, none
{
  const l0 = rt.M[T.lives];
  run(6, STILL, [KEY.D]); run(600);
  if (rt.M[T.lives] !== l0 - 1 || m.ram[T.lives] !== l0 - 1) fail('D left ' + rt.M[T.lives] + ' lives on the page, ' + m.ram[T.lives] + ' on the C16, from ' + l0);
  for (const M of [rt.M, m.ram]) M[0x3367] = 0xBD;
  run(6, STILL, [KEY.D]); run(600);
  if (rt.M[T.lives] !== l0 - 1 || m.ram[T.lives] !== l0 - 1) fail('with the lives poke D left ' + rt.M[T.lives] + ' lives on the page, ' + m.ram[T.lives] + ' on the C16');
  else console.log('D lost a life, and with the poke none: ' + (l0 - 1) + ' left');
}

// the page's way to a game, for one player and for two, and the keyboard game
for (const players of [1, 2]) {
  rt = page0(); m = c16(); f = 0;
  const plan = PuniPlan.start(rt, players);
  let mAt = -1, pAt = -1;
  const mp = passed(m), pp = passed(rt);
  for (let i = 0; i < 1500 && (mAt < 0 || pAt < 0) && !threw; i++) {
    const r = plan.next();
    run(1, STILL, r.done ? [] : r.value);
    if (mAt < 0 && mp()) mAt = f;
    if (pAt < 0 && pp()) pAt = f;
  }
  if (near('PuniPlan, ' + players + (players === 1 ? ' player' : ' players') + ': the first pass', [mAt, pAt])) {
    const want = players === 2 ? [1, 1] : [1, 0];
    if (rt.M[T.active] !== want[0] || rt.M[T.active + 1] !== want[1] || rt.M[T.keyboard] !== 0) fail('PuniPlan for ' + players + ': active ' + rt.M[T.active] + ' ' + rt.M[T.active + 1] + ', keyboard ' + rt.M[T.keyboard]);
  }
}
{
  rt = page0(); m = c16(); f = 0;
  until(200, mm => mm.ram[0x0C32] === 0x10, r => r.M[0x0C32] === 0x10);
  run(30); run(8, STILL, [KEY.RETURN]); run(60); run(8, STILL, [KEY.F2]);
  until(400, passed(m), passed(rt));
  const b0 = block(rt.M);
  run(60, STILL, [KEY.X]);
  if (rt.M[T.keyboard] !== 1 || block(rt.M) <= b0) fail('the keyboard game: keyboard ' + rt.M[T.keyboard] + ', X left his block at $' + block(rt.M).toString(16) + ' from $' + b0.toString(16));
  else console.log('the keyboard game: X walked him from $' + b0.toString(16) + ' to $' + block(rt.M).toString(16));

  // a minute at random: the passes against the C16's, and the clock against the frames
  let seed = 2611;
  const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
  const KEYS = [[], [KEY.X], [KEY.Z], [KEY.SHIFT], [KEY.X, KEY.SHIFT], [KEY.Z, KEY.SHIFT]];
  const p = rt.passes, mp0 = m.passes, f1 = rt.frame;
  for (let i = 0; i < 100; i++) run(30, STILL, KEYS[rnd(KEYS.length)]);
  if (rt.frame - f1 !== 3000) fail('the clock ran ' + (rt.frame - f1) + ' frames in 3000');
  console.log('a minute at random: ' + (rt.passes - p) + ' passes, the C16 ' + (m.passes - mp0));
}

console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
