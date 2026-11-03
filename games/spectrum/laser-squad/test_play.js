'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine, the pacing) and the memory the page carries, with nothing from work/. The port's own
// tests hold each routine and the whole program to the game's code from a contributor's snapshot
// and tape (port/test); this one holds the page that is published.
// 1. The port, as the page carries it, runs beside the game's own code from the committed listings
//    (port/test/lockstep.js, the bot playing): two players in Moonbase Assault and one player
//    against the computer in Paradise Valley, every byte of memory the same at every read of the
//    controls.
// 2. The page's machine plays the same games from the page's memory, which has no code: given what
//    the port read in (1) (the keys, the refresh register, the stack and the code that the random
//    numbers read), its memory is the game's at every read of the controls, but for the code and
//    the stack. A byte of code the page left out and the port reads would show here.
// 3. Its clock keeps the game's pace: from the first read of the controls to the last, it stands
//    within 3 % of the T-states the game took, half the passes within 5 % of theirs, and every
//    stretch it met has a cost.
// 4. The page's own keys: the first menu answered loads the scenario from the page's tape, the
//    beeper plays, and a game saved in (2) loads again from the first menu's 4 and plays on.
//   node games/spectrum/laser-squad/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'LSPort');
const { LSPage } = globalThis;
const cost = JSON.parse(/^window\.LS_COST = ([\s\S]*?);\n<\/script>/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="ls-data">([^<]*)<\/script>/.exec(page)[1]);
const lib = require('./port/test/lib.js');
const lsm = require('./port/test/lockstep.js');

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const PASS = 0xB0C8, STACK = [0x5E00, 0x5E38];

// The cassette as the page plays it: each block by its flag, whenever it is asked for, and the
// saves kept.
class PageTape {
  constructor(blocks) { this.blocks = blocks; this.saved = []; }
  load(flag) { return this.blocks.find(b => b.flag === flag) || null; }
  save(flag, bytes) { this.saved.push({ flag, bytes: Uint8Array.from(bytes) }); return true; }
}
const TAPE = lib.listingTape();
// the whole memory, the code too, as the listings hold it: the engine's, and each scenario's by its
// number ($B622)
const ENGINE = lib.fromListing().ram;
const SCEN = {};
for (const b of TAPE) SCEN[b.bytes[1] | b.bytes[2] << 8] = b.bytes;
const whole = (M, a) => a < 0x4000 ? 0 : a < 0xB621 ? ENGINE[a] : (SCEN[M[0xB622] | M[0xB623] << 8] || [])[a - 0xB621] || 0;
// memory as the page holds it: FNV-1a over $4000-$FFFF, the bytes it does not carry and the stack
// left out
function hash(M, blank) {
  let h = 0x811C9DC5;
  for (let a = 0x4000; a < 0x10000; a++) {
    if (blank[a] || (a >= STACK[0] && a <= STACK[1])) continue;
    h ^= M[a]; h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// --- 1 and 2: a game beside the game's code, then the same game on the page's machine
function game1(name, o) {
  const t0 = Date.now();
  // the blank map as the page has it, for the scenario in memory
  const pageRt = LSPage.create({ data, cost, tape: new PageTape(TAPE), seed: 1 });
  const blankFor = M => {
    const b = pageRt.blank.slice();
    b.fill(0, 0xB621);
    const s = pageRt.scenarios[M[0xB622] | M[0xB623] << 8];
    if (s) for (const [a, n] of s.blank) b.fill(1, a, a + n); else b.fill(1, 0xB621);
    return b;
  };
  const rec = { in: [], r: [], irq: [], hash: [], T: [] };
  let gameT = 0;
  const out = lsm.run(Object.assign({ clean: true, Tape: PageTape, maxFrames: o.players === 1 ? 40000 : 2000,
    onLockstep: (ls, P) => {
      const IO = P.io;
      for (const [k, into] of [['in', rec.in], ['r', rec.r], ['irqByte', rec.irq]]) {
        const f = IO[k];
        IO[k] = (...a) => { const v = f(...a); into.push(v); return v; };
      }
    },
    timing: s => {
      gameT += s.tstates;
      if (s.to === PASS) rec.T.push(gameT);
    },
    onPass: (n, mm, P) => { rec.hash.push(hash(P.M, blankFor(P.M))); } }, o));
  if (!out.res.ok) { fail(name + ': the port and the game parted: ' + JSON.stringify(out.res.diverged || out.res.diffs[0]).slice(0, 300)); return; }
  console.log(name + ': ' + out.res.passes + ' passes beside the game, identical (' + Math.round((Date.now() - t0) / 1000) + ' s, turn ' + out.m.ram[0xB711] + ')');

  // the same game on the page's machine, fed what the port read
  const tape = new PageTape(TAPE);
  const rt = LSPage.create({ data, cost, tape, seed: 1 });
  const IO = rt.P.io;
  let i = 0, j = 0, k = 0, over = false;
  IO.in = () => (i < rec.in.length ? rec.in[i++] : (over = true, 0xFF));
  IO.r = () => (j < rec.r.length ? rec.r[j++] : (over = true, 0));
  IO.irqByte = () => (k < rec.irq.length ? rec.irq[k++] : (over = true, 0));
  IO.walkByte = a => rt.blank[a] ? whole(rt.M, a) : rt.M[a];
  let beeps = 0, p = 0, firstT = null, firstG = null, diffAt = -1;
  const errs = [];
  let lastT = null, lastG = null;
  rt.onBeep(() => beeps++);
  rt.onCheckpoint((cp, t) => {
    if (cp !== PASS || over || p >= rec.hash.length) return;
    if (diffAt < 0 && hash(rt.M, blankFor(rt.M)) !== rec.hash[p]) diffAt = p;
    // the game's T-states at this pass, counted from the first stretch the lockstep timed
    const G = rec.T[p];
    if (G !== undefined) {
      if (firstT === null) { firstT = t; firstG = G; }
      else {
        const dg = G - rec.T[p - 1], dt = t - lastT;
        if (dg > 0) errs.push((dt - dg) / dg);
      }
      lastT = t; lastG = G;
    }
    p++;
  });
  let f = 0;
  try {
    while (p < rec.hash.length && !over && f < 2e6) { rt.runFrame(); f++; }
  } catch (e) { fail(name + ': the page\'s machine threw at pass ' + p + ': ' + e.message); return; }
  if (p < rec.hash.length) { fail(name + ': the page\'s machine reached pass ' + p + ' of ' + rec.hash.length + (over ? ', having read past what the port read' : '')); return; }
  if (diffAt >= 0) fail(name + ': the page\'s memory differs from the game\'s at pass ' + diffAt);
  else console.log(name + ': the page\'s machine, on the page\'s memory, the same at all ' + p + ' passes');
  if (rt.missing.size) fail(name + ': stretches with no cost: ' + [...rt.missing].join(' '));
  if (!beeps) fail(name + ': the beeper never moved');
  // the pace, from the first pass timed to the last
  const G = lastG - firstG, T = lastT - firstT;
  const whole_ = (T - G) / G;
  errs.sort((a, b) => Math.abs(a) - Math.abs(b));
  const half = errs.length ? Math.abs(errs[errs.length >> 1]) : 0;
  const msg = name + ': the page took ' + (T / 3.5e6).toFixed(1) + ' s of the Spectrum\'s time where the game took ' + (G / 3.5e6).toFixed(1) +
    ' (' + (whole_ * 100).toFixed(2) + ' %); half the passes within ' + (half * 100).toFixed(1) + ' % of the game\'s';
  if (Math.abs(whole_) > 0.03 || half > 0.05) fail(msg); else console.log(msg);
  return { saved: tape.saved, beeps };
}
// the first time the menu between turns is up, it waits for a key and 2 saves the game; once the
// cassette has the save, the bot's keys
let saved = false;
class SavingTape extends PageTape { save(...a) { saved = true; return super.save(...a); } }
const saveOnce = k => (under, M, rnd) => (!saved && under(0xB20C) ? '2' : k(under, M, rnd));
const two = game1('Moonbase Assault, two players', { passes: 2000, scenario: 2, seed: 3, players: 2, level: 1, key: saveOnce,
  stay: () => !saved, Tape: SavingTape });
game1('Paradise Valley against the computer', { passes: 3000, scenario: 6, seed: 4, players: 1, level: 3 });

// --- 4. the page's own keys, from the engine's first instruction
function machine(tape) {
  const rt = LSPage.create({ data, cost, tape, seed: 7 });
  let beeps = 0, f = 0, threw = null;
  rt.onBeep(() => beeps++);
  const run = (n, keys = []) => {
    rt.input.keys = new Set(keys);
    for (let i = 0; i < n && !threw; i++, f++) {
      try { rt.runFrame(); } catch (e) { threw = e; fail('frame ' + f + ': ' + e.message); }
    }
  };
  const press = k => { run(10, [k]); run(40); };
  return { rt, run, press, get beeps() { return beeps; }, get threw() { return threw; } };
}
{
  const m = machine(new PageTape(TAPE));
  m.run(40); m.press('1');
  if (m.rt.P.scenarioId() !== 'assassins') fail('1 at the first menu loaded ' + m.rt.P.scenarioId());
  m.press('4'); m.press('2');
  const shop = m.rt.M[0xB712] === 0 && !m.threw;
  if (!shop) fail('the menus did not reach the first side\'s shop');
  else console.log('the keys: 1 loaded The Assassins, 4 the keys for controls, 2 two players: the first side\'s shop, the beeper moved ' + m.beeps + ' times');
  if (!m.beeps) fail('the menus played no sound');
  if (m.rt.missing.size) fail('stretches with no cost: ' + [...m.rt.missing].join(' '));
  if (Math.abs(m.rt.t / LSPage.FRAME - (m.rt.shown + 1)) > 2) fail('the clock at frame ' + (m.rt.t / LSPage.FRAME).toFixed(1) + ' with frame ' + m.rt.shown + ' shown');
}
// a game saved in Moonbase Assault, loaded from the first menu's 4: the game goes on at its turn
if (two && two.saved.length) {
  const s = two.saved[two.saved.length - 1];
  const tape = new PageTape(TAPE.concat([s]));
  const m = machine(tape);
  m.run(40); m.press('4');
  const turn = s.bytes[0xB711 - 0xB621];
  if (m.rt.P.scenarioId() !== 'moonbase-assault' || m.rt.M[0xB15B] !== 0) fail('4 at the first menu did not load the saved game');
  else if (m.rt.M[0xB711] !== turn) fail('the saved game loaded at turn ' + m.rt.M[0xB711] + ', saved at ' + turn);
  else console.log('a game saved at turn ' + turn + ' of Moonbase Assault loads from the first menu\'s 4');
} else if (two) fail('the two-player game saved nothing, so the load was not tried');

console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
