'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine, the pacing, and its way through the menu) run in node on listing.json, from the game's
// first instruction at $1800, beside the game's own code on the kit's C16 (kit/c16/machine.js)
// given the same controls. The port's own tests hold each routine and the whole game to the game's
// code (port/test, on moments of play saved in work/); this one holds the page that is published,
// with nothing from work/.
// - the menu comes up within two frames of the C16's, and draws in the five bands' colours;
// - the page's way through the menu (TexPlan) sets SOUND to ON and leaves the cursor on PLAY THE
//   GAME, on the page and, run the same way, on the C16;
// - fire starts level 1, and its first pass comes within two frames of the C16's;
// - in play the page runs as many passes as the C16 in the same frames, to 1 %; right moves Tex,
//   fire shoots with the sound on, and the game writes to TED's sound registers;
// - ESC goes back to the menu;
// - Plus/4 World's pokes do on the page what they do on the C16: with the lives poke Tex falls
//   into the first break and keeps his lives; with the other he runs over it;
// - each level the page offers is reached the game's own way (TexPlan: PLAY THE GAME, then each
//   level before it finished at a pass), with the scene and the enemies next_level gives it, on the
//   C16 as well for level 4, and plays on with the clock keeping to the frames.
// No frame throws.
//   node games/c16/tycoon-tex/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, KEY } = require(path.join(ROOT, 'kit/c16/machine.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c16');
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'TexPort');
const { TexPlan } = g.run(PAGE, 'plan', 'TexPlan');
const { TexPage } = globalThis;
const cost = JSON.parse(/^window\.TEX_COST = (.*);$/m.exec(page)[1]);
const LEVELS = [...(/const LEVELS = \[([\s\S]*?)\];/.exec(page) || ['', ''])[1].matchAll(/\[(\d+), /g)].map(m => +m[1]);

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const { G, bcd } = TexPlan;
const SCENE = 0x1826, ENEMIES = 0xA6, TEX = 0x15, LIVES = 0x80, DYING = 0x7A;
const RIGHT = 0x17, UP = 0x1E, FIRE = 0x0F, STILL = 0x1F;
const BIT = { up: 1, down: 2, left: 4, right: 8, fire: 16 };
const AS_KEYS = { up: KEY[';'], down: KEY['/'], left: KEY.Z, right: KEY.X, fire: KEY.RETURN };
// the menu as the game loads it, with SOUND on, as the page's Start again has it with its sound on
const WANT = { joystick: 1, difficulty: 0, lives: 3, sound: 1 };
const CHEATS = { lives: [[0x249D, 0xAD], [0x24A0, 0xA5]], tough: [[0x1EB7, 0x00], [0x1EEC, 0x00]] };   // cheats.md

const ram = () => g.listing().ram;
const page0 = () => TexPage.create({ ram: ram(), cost });
// the game's own code, the KERNAL's clear screen (start's one call of it) done as the page does it
function c16() {
  const r = ram();
  return new Machine({ ram: r, pc: 0x1800, passAt: 0x2A28, hooks: { 0xFFD2: c => { r.fill(0x20, 0x0C00, 0x0FE8); c.rts(); } } });
}
const rt = page0(), m = c16();
let f = 0, threw = null;
const frames = [];
// a step's controls, stick directions and key numbers, as the page gives them: the stick in port 2,
// or the game's keys with the keyboard chosen
function controls(M, what) {
  let joy = 0x1F;
  const keys = new Set();
  for (const w of what) {
    if (typeof w === 'number') keys.add(w);
    else if (M[G.joystick] === 0) keys.add(AS_KEYS[w]);
    else joy &= ~BIT[w];
  }
  return { joy, keys };
}
function pageFrame(r, c) {
  r.input.joy = c.joy; r.input.keys = c.keys;
  try { return r.runFrame(); } catch (e) { threw = e; fail('frame ' + r.frame + ': ' + e.message); return null; }
}
function c16Frame(mm, c) { mm.joy = c.joy; mm.releaseAll(); for (const k of c.keys) mm.press(k); mm.runFrames(1); }
// n frames of both, the stick held at joy
function run(n, joy = STILL, keys = []) {
  for (let i = 0; i < n && !threw; i++, f++) {
    const c = { joy, keys: new Set(keys) };
    c16Frame(m, c);
    frames[f] = pageFrame(rt, c);
  }
}
const menuUp = M => M[G.menu_on] && !M[G.menu_done] && M[G.menu_turns] >= 1;

// the menu, from the first instruction
let pMenu = -1, mMenu = -1;
for (let i = 0; i < 600 && (pMenu < 0 || mMenu < 0) && !threw; i++) {
  run(1);
  if (pMenu < 0 && menuUp(rt.M)) pMenu = f;
  if (mMenu < 0 && menuUp(m.ram)) mMenu = f;
}
if (pMenu < 0 || mMenu < 0) fail('the menu never came up: the C16 at ' + mMenu + ', the page at ' + pMenu);
else if (Math.abs(pMenu - mMenu) > 2) fail('the menu up in frame ' + pMenu + ', the C16\'s in ' + mMenu);
else console.log('the menu: up in frame ' + pMenu + ', the C16\'s ' + mMenu);
run(20);
const pic = C16.renderBands(frames[f - 1].bands, { size: 0x4000 });
const colours = new Set(pic.px);
if (colours.size < 6 || frames[f - 1].bands.length < 5) fail('the menu drawn in ' + colours.size + ' colours and ' + frames[f - 1].bands.length + ' bands');
else console.log('the menu: ' + colours.size + ' colours, ' + frames[f - 1].bands.length + ' bands');

// the page's way through the menu, on the page and the same way on the C16
function plan(who, M, n, want = WANT) {
  const r = { M, get passes() { return who.passes; } };
  const steps = TexPlan.toLevel(r, want, n);
  return steps;
}
{
  const pp = plan(rt, rt.M, null), mp = plan(m, m.ram, null);
  let pn = 0, mn = 0;
  for (let s = pp.next(); !s.done && !threw && pn < 3000; s = pp.next(), pn++) pageFrame(rt, controls(rt.M, s.value));
  for (let s = mp.next(); !s.done && mn < 3000; s = mp.next(), mn++) c16Frame(m, controls(m.ram, s.value));
  // the two even again, frame for frame
  for (let i = pn; i < mn && !threw; i++) pageFrame(rt, controls(rt.M, []));
  for (let i = mn; i < pn; i++) c16Frame(m, controls(m.ram, []));
  f += Math.max(pn, mn);
  for (const [who, M] of [['page', rt.M], ['C16', m.ram]]) {
    if (M[G.sound] !== 1 || M[G.item] !== 3 || !menuUp(M)) fail('the menu on the ' + who + ': SOUND ' + M[G.sound] + ', the item ' + M[G.item]);
  }
  console.log('the menu set: SOUND ON, the cursor on PLAY THE GAME, in ' + pn + ' frames on the page and ' + mn + ' on the C16');
}

// fire, and the first pass of level 1
const firstPass = who => { const p0 = who.passes; return () => who.passes > p0; };
const mStarted = firstPass(m), pStarted = firstPass(rt);
const f1 = f;
run(12, FIRE);                                     // a turn of the menu and more: its read at the turn's end sees it
let mAt = -1, pAt = -1;
for (let i = 0; i < 400 && (mAt < 0 || pAt < 0) && !threw; i++) {
  run(1);
  if (mAt < 0 && mStarted()) mAt = f;
  if (pAt < 0 && pStarted()) pAt = f;
}
if (mAt < 0 || pAt < 0) fail('level 1 never started: the C16 at ' + mAt + ', the page at ' + pAt);
else if (Math.abs(mAt - pAt) > 2) fail('level 1\'s first pass in frame ' + pAt + ', the C16\'s in ' + mAt);
else console.log('level 1: the first pass ' + (pAt - f1) + ' frames after fire, the C16\'s ' + (mAt - f1));

// play: the passes in the same frames, Tex running right and shooting
const m0 = m.passes, p0 = rt.passes, tex0 = rt.M[TEX] | rt.M[TEX + 1] << 8;
let sounds = 0;
const f0 = f;
run(30, RIGHT); const tex1 = rt.M[TEX] | rt.M[TEX + 1] << 8;
for (let i = 0; i < 8; i++) { run(4, FIRE); run(20, STILL); }
let seed = 1984;
const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
const STICKS = [STILL, RIGHT, RIGHT, UP, FIRE, 0x16, 0x1B];
for (let i = 0; i < 12; i++) run(25, STICKS[rnd(STICKS.length)]);
for (let i = f0; i < f; i++) if (frames[i] && frames[i].sound.length) sounds++;
const dm = m.passes - m0, dp = rt.passes - p0;
if (Math.abs(dp - dm) > Math.max(2, dm / 100)) fail('in ' + (f - f0) + ' frames of play the page ran ' + dp + ' passes, the C16 ' + dm);
else console.log('play: ' + dp + ' passes in ' + (f - f0) + ' frames, the C16 ' + dm);
if (tex1 <= tex0) fail('right held for 30 frames left Tex at $' + tex1.toString(16) + ' from $' + tex0.toString(16));
if (!sounds) fail('no writes to the sound registers in ' + (f - f0) + ' frames of play with SOUND ON');
console.log('Tex: $' + tex0.toString(16) + ' to $' + tex1.toString(16) + '; sound in ' + sounds + ' frames');

// ESC, back to the menu (pressed again while Tex dies, when the game reads no keys)
for (let i = 0; i < 10 && !menuUp(rt.M) && !threw; i++) { run(6, STILL, [KEY.ESC]); run(80); }
if (!menuUp(rt.M)) fail('ESC did not end the game');
else console.log('ESC: the menu again in frame ' + f);

// a level the page's way, on the page (and on the C16 when c is given); the frames it took
function toLevel(r, n, step) {
  const steps = plan(r, r.M || r.ram, n);
  let k = 0;
  for (let s = steps.next(); !s.done && !threw && k < 70000; s = steps.next(), k++) step(controls(r.M || r.ram, s.value));
  return k;
}
// The cheats, on level 1 from the menu: with the lives poke Tex runs right into the first break
// and loses no life, on the page and on the C16; with the invulnerability poke he runs on over it.
for (const [name, want] of [['lives', 'a death and the lives kept'], ['tough', 'no death']]) {
  const r = page0(), mm = c16();
  for (const M of [r.M, mm.ram]) for (const [a, v] of CHEATS[name]) M[a] = v;
  const step = c => pageFrame(r, c), mstep = c => c16Frame(mm, c);
  toLevel(r, 1, step); toLevel(mm, 1, mstep);
  const res = [];
  for (const [M, st] of [[r.M, step], [mm.ram, mstep]]) {
    for (let i = 0; i < 400 && M[G.menu_on]; i++) st(controls(M, []));
    const lives = M[LIVES];
    let died = 0;
    for (let i = 0; i < 1500 && !threw; i++) { const d = M[DYING]; st(controls(M, ['right'])); if (!d && M[DYING]) died++; }
    res.push({ died, kept: M[LIVES] === lives });
  }
  const ok = name === 'lives' ? res.every(x => x.died && x.kept) : res.every(x => !x.died);
  if (!ok) fail('the ' + name + ' poke: the page ' + JSON.stringify(res[0]) + ', the C16 ' + JSON.stringify(res[1]));
  else console.log('the ' + name + ' poke: ' + want + ' running right, on both (' + res[0].died + ' and ' + res[1].died + ' deaths)');
}

// every level the page offers, the page's way, then played for 300 frames with the stick at random
const ENEMY = n => n === 1 ? 0x04 : n === 2 ? 0x02 : n === 3 ? 0x08 : null;   // next_level, enemy_mask
let started = 0;
if (!LEVELS.length) fail('no LEVELS in play.html');
for (const n of LEVELS) {
  if (threw) break;
  const r = page0();
  const k = toLevel(r, n, c => pageFrame(r, c));
  const M = r.M, scene = (n - 1) % 3;
  if (M[G.level] !== bcd(n) || M[SCENE] !== scene) { fail('level ' + n + ': level $' + M[G.level].toString(16) + ', the scene ' + M[SCENE]); continue; }
  // the rest of next_level (the enemies are chosen after it has stepped the level) and, on
  // level 1, the countdown: the enemies as the level's first pass begins
  const p1 = r.passes;
  for (let i = 0; i < 400 && r.passes === p1 && !threw; i++) pageFrame(r, controls(M, []));
  const e = ENEMY(n), mask = M[ENEMIES];
  if ((e !== null && mask !== e) || (n >= 10 && (mask & 0x0F) !== 0x0F) || (n >= 7) !== !!(mask & 0x10)) { fail('level ' + n + ': the enemies $' + mask.toString(16)); continue; }
  const p = r.passes, fr = r.frame;
  for (let i = 0; i < 10; i++) { const s = STICKS[rnd(STICKS.length)]; for (let j = 0; j < 30; j++) pageFrame(r, { joy: s, keys: new Set() }); }
  if (r.passes - p < 40 || r.frame - fr !== 300) fail('level ' + n + ': ' + (r.passes - p) + ' passes and ' + (r.frame - fr) + ' frames of the clock in 300 frames of play');
  else { started++; if (n === 99 || n === 10) console.log('level ' + n + ': reached in ' + k + ' frames, the scene ' + scene + ', the enemies $' + mask.toString(16)); }
}
if (started === LEVELS.length) console.log('every level the page offers (' + LEVELS.join(', ') + ') reached the game\'s way and played');

// level 4 the same way on the C16: the page's way there works on the game's own code
{
  const mm = c16();
  toLevel(mm, 4, c => c16Frame(mm, c));
  mm.runFrames(60);
  if (mm.ram[G.level] !== 0x04 || mm.ram[SCENE] !== 0) fail('level 4 on the C16: level $' + mm.ram[G.level].toString(16) + ', the scene ' + mm.ram[SCENE]);
  else console.log('level 4 on the C16 the page\'s way: the scene 0, the enemies $' + mm.ram[ENEMIES].toString(16) + ' after next_level');
}

console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
