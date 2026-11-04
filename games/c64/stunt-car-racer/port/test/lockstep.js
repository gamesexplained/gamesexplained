'use strict';
// The whole port beside the game (kit/c64/lockstep.js), from the loader's hand-over
// (work/entry.vsf) through the start-up, the menus and the races, with the controls a session
// scripts: the menus' choices and the name on the way in, then driving, held a random way every
// few passes. Memory, colour RAM and the chips are compared at the start of every pass of the race.
// Routines the port has not written would be the game's own code (standin.js).
//   node lockstep.js [session filter] [passes] [seed]
const path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));
const standin = require('./standin.js');
const { loadPort } = require('./port.js');

// The interrupt's bytes the main program reads in the middle of a stretch: the engine's note,
// which the interrupt moves on each frame and the car's sound reads, and the flag that says the
// bitmap just drawn is on the screen.
const IRQ_BYTES = [0x09, 0x0A, 0xC37B];
// The bytes the port does not keep the game's way (kit/skills/core/70-minisite/play.md): SIN_COS
// keeps the X it was called with at $C780 and gives it back as it leaves, and the port's callers
// pass on only the registers a routine reads, so the X the game's code happens to hold there (what
// the routine before left) is not the port's.
const IGNORE = [0xC780];

// the stick's bits, active low: 1 up, 2 down, 4 left, 8 right, 16 fire
const J = { none: 0x1F, up: 0x1E, down: 0x1D, left: 0x1B, right: 0x17, fire: 0x0F };
const MOVES = [1, 1, 1, 1 | 4, 1 | 8, 1 | 16, 2, 2 | 16, 4, 8, 0, 1 | 4 | 16, 1 | 8 | 16];

// A session: what the controls do frame by frame from power-on (steps of { frames, joy, keys }),
// then in the races the stick held a random way every few passes, with now and then one of the
// session's keys tapped; and wherever the game waits outside a race (a panel, a table, the track
// seen from above), fire or RETURN tapped every so often, so it always goes on.
const tap = (joy, hold = 8, after = 40) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
const type = k => [{ frames: 8, keys: [k] }, { frames: 30 }];
const NAME = [...type('A'), ...type('C'), ...type('E'), ...type('RETURN')];
const SESSIONS = {
  // Single Player League, the name ACE, the league table, then Practise, Division 4, Little Ramp
  practice: { steps: [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...NAME,
    { frames: 200 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire),
    { frames: 300 }, ...tap(J.fire), { frames: 600 }, { frames: 180, joy: J.fire }], keys: [] },
  // the same, with the pause (P, and O a second or few later) and the key that ends a race (C=)
  // now and then
  pause: { steps: [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...NAME,
    { frames: 200 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire),
    { frames: 300 }, ...tap(J.fire), { frames: 600 }, { frames: 180, joy: J.fire }], keys: ['P', 'P', 'CBM', 'RETURN'], every: 40 },
  // Single Player League, the name, then Start the Racing Season: races against the drivers
  season: { steps: [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...NAME,
    { frames: 200 }, ...tap(J.fire), { frames: 100 }, ...tap(J.down), { frames: 60 }, ...tap(J.fire)], keys: ['CBM'] },
  // Multiplayer, every prompt answered with fire or RETURN
  multi: { steps: [{ frames: 400 }, ...tap(J.down), { frames: 60 }, ...tap(J.fire), { frames: 300 }, ...NAME], keys: ['CBM'] },
};

function run(o) {
  const CM = loadPort();
  const m = lib.machine('entry', { passAt: 0x3D08 });
  const P = CM.makePort(new Uint8Array(65536), {});
  standin.install(P, IRQ_BYTES);
  if (o.onPort) o.onPort(P, m);
  const ls = new Lockstep({ machine: m, port: P, program: P => P.STARTUP({}), entry: 0x3FFB, checkpoints: [...new Set(P.CHECKPOINTS)],
    passAt: 0x3D08, irqs: { 0xEA31: null, 0xCDAA: 'IRQ', 0x9A32: 'NMI' }, irqBytes: IRQ_BYTES, hooks: Object.assign({}, m.hooks),
    chips: ['colour', 'vic', 'sid'], ignore: IGNORE.concat(o.ignore || []), maxFrames: o.maxFrames || 20000, timing: o.timing });
  if (o.onLockstep) o.onLockstep(ls);
  let seed = o.seed || 1;
  const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return Math.floor(seed / 4294967296 * n); };
  const S = SESSIONS[o.session], steps = S.steps.slice();
  // a session's key: held for 24 frames, longer than the two passes P waits for at most, and after
  // P, O pressed 50 to 250 frames later, and again until a pass begins
  let left = 0, lastPass = 0, menuTap = null, nextTap = 0, until = 0, keyUp = -1, resume = -1, oPressed = false, curFrame = 0;
  const apply = (mm, s) => { mm.keys.clear(); for (const k of s.keys || []) mm.press(k); mm.joy = s.joy === undefined ? J.none : s.joy; };
  const res = ls.run({ passes: o.passes || 200, stopOnDiff: o.stopOnDiff !== false,
    onFrame: (f, mm) => {
      if (left <= 0 && steps.length) { const st = steps.shift(); left = st.frames; apply(mm, st); }
      curFrame = f;
      if (left > 0) { left--; if (left === 0 && !steps.length) { apply(mm, { joy: J.none }); lastPass = f; } return; }
      if (keyUp >= 0 && f >= keyUp) { mm.keys.clear(); keyUp = -1; }
      // O again every 100 frames until the race goes on (a tap of fire in the pause can lift it)
      if (resume >= 0 && f >= resume && keyUp < 0) { mm.press('O'); keyUp = f + 6; oPressed = true; resume = f + 100; }
      // outside a race: a tap of fire, or of RETURN one time in three, every 90 frames or so
      if (menuTap && f >= menuTap.end) { apply(mm, { joy: J.none }); menuTap = null; nextTap = f + 60 + rnd(60); }
      if (!menuTap && f - lastPass > 90 && f >= nextTap) {
        menuTap = { end: f + 8 };
        apply(mm, rnd(3) ? { joy: J.fire } : { keys: ['RETURN'] });
      }
      curFrame = f;
    },
    onPass: (n, mm) => {
      lastPass = curFrame;
      if (oPressed) { resume = -1; oPressed = false; }
      if (steps.length || left > 0) return;
      if (menuTap) { apply(mm, { joy: J.none }); menuTap = null; }
      if (n >= until) { mm.joy = 0x1F & ~MOVES[rnd(MOVES.length)]; until = n + 1 + rnd(8); }
      if (S.keys.length && keyUp < 0 && resume < 0 && rnd(S.every || 150) === 0) {
        const k = S.keys[rnd(S.keys.length)];
        mm.keys.clear(); mm.press(k); keyUp = curFrame + 24;
        if (k === 'P') resume = curFrame + 50 + rnd(200);
      }
    } });
  return { res, ls, m, P };
}

if (require.main === module) {
  const filter = process.argv[2] || '', passes = +(process.argv[3] || 200), seed = +(process.argv[4] || 1);
  let ok = 0, n = 0;
  for (const s of Object.keys(SESSIONS).filter(k => k.includes(filter))) {
    n++;
    let out;
    try { out = run({ session: s, passes, seed }); } catch (e) { console.log(s + ': ' + (e.stack || e.message).split('\n').slice(0, 8).join('\n  ')); continue; }
    const used = [...(out.P.standInsUsed || [])];
    console.log(s + (used.length ? ' (the game\'s code stood in for ' + used.join(', ') + ')' : '') + ': ' + describe(out.res).split('\n').join('\n  '));
    if (out.res.ok && !out.res.diverged && !used.length) ok++;
  }
  console.log(ok + '/' + n + ' sessions in step');
  process.exitCode = ok === n ? 0 : 1;
}

module.exports = { run, SESSIONS, IRQ_BYTES, IGNORE };
