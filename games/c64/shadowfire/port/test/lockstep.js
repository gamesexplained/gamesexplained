'use strict';
// The whole port beside the game, pass by pass (kit/c64/lockstep.js): from the game's first
// instruction with F3 pressed for the joystick (cold), or with no key, so that the demonstration
// runs (demo), or from the moments of play in work/states (port/scripts/gen-states.js). The
// joystick is driven by an explorer that points the cursor at an enabled icon of the screen, picked
// at random, and presses fire. The file name screen's return icon is never picked: it calls the
// KERNAL's load and save, and the kit holds no ROM. The game runs on kit/c64/machine.js; routines
// the port has not written are the game's own code (standin.js).
//   node lockstep.js [passes] [session filter] [seed]
const path = require('path');
const lib = require('./lib.js');
const { Lockstep, standIn, describe } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));
const standin = require('./standin.js');
const { loadPort } = require('./port.js');

const w = (M, a) => M[a] | M[a + 1] << 8;
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;

// The explorer: on each frame the game begins, the joystick for that frame, from the game's own
// memory (the screen at $5435, its icons from $789C, the cursor at $68E5 and the sprite's Y, the
// cursor's cell at $76 and $77, fire_flag at $78).
function explorer(seed) {
  let s = seed >>> 0 || 1;
  const rnd = n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return Math.floor(s / 4294967296 * n); };
  let target = null, since = 0, rest = 0, firing = 0, near = 0;
  const icons = M => {
    const out = [];
    let p = w(M, 0x789C + 2 * M[0x5435]);
    for (let i = 0; i < 64 && w(M, p) !== 0xFFFF; i++, p += 11) {
      const pic = w(M, p), h = w(M, p + 9);
      if (M[p + 4] & 1 && h !== 0x773E) out.push({ col: M[p + 2], row: M[p + 3], wdt: M[pic], hgt: M[pic + 1], h });
    }
    return out;
  };
  return (m) => {
    const M = m.ram;
    if (rest > 0) { rest--; return 0; }
    if (!target || ++since > 500) {
      const list = icons(M);
      if (!list.length) return rnd(4) ? 0 : 1 << rnd(4);
      target = list[rnd(list.length)]; since = 0; firing = 0; near = 0;
    }
    const t = target;
    const row = t.row + 1 + ((t.hgt - 1) >> 1), col = t.col + 1 + ((t.wdt - 1) >> 1);
    if (firing) {
      if (M[0x78] === 0 || ++firing > 60) { target = null; rest = 2 + rnd(30); return 0; }
      return FIRE;
    }
    if (M[0x76] === row && M[0x77] === col) {
      if (M[0x78] === 0xFF) { firing = 1; return FIRE; }
      return 0;
    }
    const dx = col * 4 + 4 - M[0x68E5], dy = row * 8 + 0x24 - m.vic[1];
    let j = 0;
    if (Math.abs(dx) <= 10 && Math.abs(dy) <= 10 && (++near & 1)) return 0;
    if (dx > 1) j |= RIGHT; else if (dx < -1) j |= LEFT;
    if (dy > 1) j |= DOWN; else if (dy < -1) j |= UP;
    return j;
  };
}

// The machine a session starts from.
function machine(session) {
  if (session === 'cold' || session === 'demo') return { m: lib.boot(), keys: session === 'cold' ? [100, 110] : null };
  return { m: lib.restore(session), keys: null };
}

function run(o) {
  const SF = loadPort();
  const { m, keys } = machine(o.session);
  const P = SF.makePort(new Uint8Array(65536), {});
  standin.install(P, SF.IRQ_BYTES);
  // the icons chosen, by handler, for the report
  const chosen = new Map(), handler = P.handler;
  P.handler = h => { chosen.set(h, (chosen.get(h) || 0) + 1); return handler(h); };
  if (o.onPort) o.onPort(P, m);
  const program = o.session === 'cold' || o.session === 'demo' ? P => P.main() : P => P.resume();
  const ls = new Lockstep({ machine: m, port: P, program, checkpoints: P.CHECKPOINTS, waits: P.WAITS,
    irqs: { 0x549B: P.irq && !P.standIns.has('irq') ? 'irq' : standIn(P, 0x549B, { irq: true }) }, irqBytes: SF.IRQ_BYTES,
    chips: ['colour', 'vic', 'sid'], ignore: o.ignore || [], maxFrames: o.maxFrames || 3000, timing: o.timing, hooks: lib.HOOKS });
  if (o.onLockstep) o.onLockstep(ls);
  P.M[0] = m.cpu.pdir; P.M[1] = m.cpu.pdata;
  const joy = explorer(o.seed || 1);
  const res = ls.run({ passes: o.passes || 300, stopOnDiff: o.stopOnDiff !== false, onPass: o.onPass, onFrame: o.onFrame || ((f, mm) => {
    if (keys && f === keys[0]) mm.press(lib.KEY.F3);
    if (keys && f === keys[1]) mm.release(lib.KEY.F3);
    mm.joy1 = 0x1F & ~(o.session === 'demo' || (keys && f < keys[1] + 30) ? 0 : joy(mm));
  }) });
  return { res, ls, m, P, chosen };
}

if (require.main === module) {
  const passes = +(process.argv[2] || 300), filter = process.argv[3] || '', seed = +(process.argv[4] || 1), verbose = !!process.env.VERBOSE;
  const sessions = ['cold', 'demo'].filter(s => s.includes(filter)).concat(lib.states(filter).map(f => f.replace(/\.json$/, '')));
  let ok = 0;
  for (const s of sessions) {
    let out;
    try { out = run({ session: s, passes, seed }); } catch (e) { console.log(s + ': ' + (e.stack || e.message).split('\n').slice(0, 8).join('\n  ')); continue; }
    const used = [...out.P.standInsUsed];
    console.log(s + (used.length ? ' (the game\'s code stood in for ' + used.join(', ') + ')' : '') + ': ' + describe(out.res).split('\n').join('\n  '));
    if (verbose) console.log('  chose ' + [...out.chosen].map(([h, n]) => lib.hex(h) + (n > 1 ? ' x' + n : '')).join(' '));
    if (out.res.ok && !used.length) ok++;
  }
  console.log(ok + '/' + sessions.length + ' sessions in step');
  process.exitCode = ok === sessions.length ? 0 : 1;
}

module.exports = { run, explorer };
