'use strict';
// The whole port beside the game, pass by pass (kit/c64/lockstep.js): from the moments of play in
// work/states, or from the hand-over through the options panel ("cold"), each driven by the test
// player (lib.bot) seeded from the moment's frame. Routines the port has not written are the game's
// own code (standin.js).
// A session can also force what play seldom reaches, by poking the moment's memory before both
// start (FORCE): "keys@<state>", "war@<state>", "sdi@<state>", "strike@<state>", "year@<state>"
// or "fallout@<state>", and "forced" runs each on the first state of each session.
//   node port/test/lockstep.js [passes, default 400] [state name filter, "cold" or "forced"] [seed]
const path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));
const standin = require('./standin.js');
const { loadPort } = require('./port.js');

// What each forced session pokes: the keyboard as the control (read_controls's call pointed at
// read_keys, $516F, as F1 points it), the player pressing A, Z, N, M and SPACE for its stick; or the
// next pass ends the hour (game_clock's count at $BF), and
const FORCE = {
  keys: { 0x512C: 0x6F, 0x512D: 0x51 },
  // every hostility at 0, which matches the event level $FF: a Total Missile Attack, whichever
  // country the tick picks
  war: Object.assign({ 0x5B54: 0xBF }, ...Array.from({ length: 256 }, (_, i) => ({ [0x5C5C + i]: 0 }))),
  // the war with the six SDI satellites in orbit across the map ($5D5C, 8 bytes each: x, y, the
  // reach, in orbit at byte 6), so that they fire at the missiles
  sdi: null,
  // the hour before the 52nd week's end: the year is over
  year: { 0x5B51: 0x33, 0x5B55: 7, 0x5B54: 0xBF },
  // the radiation at its top as a week ends: the game is over
  fallout: { 0x5B53: 0xFF, 0x5B55: 7, 0x5B54: 0xBF },
};
FORCE.sdi = Object.assign({}, FORCE.war, ...[[48, 48], [96, 80], [144, 112], [192, 64], [72, 96], [168, 128]]
  .map(([x, y], i) => ({ [0x5D5C + 8 * i]: x, [0x5D5D + 8 * i]: y, [0x5D62 + 8 * i]: 1 })));
// every country's hostility to each other at its own event 1 level (event_levels, $958C): a
// limited strike, whichever country the tick picks
FORCE.strike = (() => {
  const M = lib.boot().ram, f = { 0x5B54: 0xBF };
  for (let a = 0; a < 16; a++) for (let b = 0; b < 16; b++) f[0x5C5C + 16 * a + b] = M[0x958C + 32 * a + 1];
  return f;
})();
// The game's own race (src/core.js): an interrupt taken between the main program's store to $04 and
// its read, with the instruction next to run in one of these windows, that leaves $04 changed.
// A session that falls out of step within a few frames of one stops at the game's race, not the
// port's fault.
const RACE = [[0x5158, 0x515B, 'read_controls'], [0x50F9, 0x5104, 'key_down'], [0x5111, 0x511B, 'key_bit'],
  [0x7A48, 0x7A4B, 'the radio\'s filter buttons']];
function watchRace(m) {
  const races = [];
  let depth = 0, before = null;
  m.onInterrupt = mm => {
    if (depth++) return;
    const pc = mm.cpu.pc, w = RACE.find(([lo, hi]) => pc >= lo && pc <= hi);
    before = w ? { pc, where: w[2], v: mm.ram[4], frame: mm.frames } : null;
  };
  m.onReturn = mm => {
    if (--depth) return;
    if (before && mm.ram[4] !== before.v) races.push(Object.assign(before, { now: mm.ram[4] }));
    before = null;
  };
  return races;
}
function run(o) {
  const AM = loadPort();
  const at = o.state.indexOf('@'), force = at >= 0 ? FORCE[o.state.slice(0, at)] : null;
  const state = at >= 0 ? o.state.slice(at + 1) : o.state;
  const cold = state === 'cold';
  const s = cold ? null : lib.readState(state);
  const m = cold ? lib.boot() : lib.restore(s);
  if (force) for (const [a, v] of Object.entries(force)) m.ram[+a] = v;
  const races = watchRace(m);
  const P = AM.makePort(new Uint8Array(65536), {});
  standin.install(P, AM.IRQ_BYTES);
  if (o.onPort) o.onPort(P, m);
  // The player moves the stick once a pass, where the main loop has waited for fire to be let go
  // (the checkpoint at $7CDB, before its frame's wait), so that a press reaches move_cursor and
  // opens what the cursor is on; and where no pass starts (a window, a menu, the war) once a
  // frame, at the port's next yield, where both read it.
  const bot = lib.bot((o.seed || 1) * 7919 + (cold ? 0 : s.frame || 0), o.bot || {});
  const KEYS = [[1, 'A'], [2, 'Z'], [4, 'N'], [8, 'M'], [16, 'SPACE']];
  const play = force === FORCE.keys
    ? mm => { const j = bot(mm); mm.joy = 0x1F; for (const [bit, k] of KEYS) if (j & bit) mm.press(k); else mm.release(k); }
    : bot;
  let passFrame = m.frames, due = false;
  if (cold) m.press('F3');
  const timing = st => { if (o.timing) o.timing(st); if (due && st.to === 0x7CDB) { due = false; if (!cold || m.frames > 400) play(m); } };
  const ls = new Lockstep({ machine: m, port: P, program: P => (cold ? P.main() : P.resume()),
    checkpoints: P.CHECKPOINTS, irqs: { 0x624C: 'irq' }, irqBytes: AM.IRQ_BYTES,
    chips: ['colour', 'vic', 'sid'], ignore: o.ignore || [], maxFrames: o.maxFrames || 4000, timing });
  P.M[0] = m.cpu.pdir; P.M[1] = m.cpu.pdata;
  if (o.onLockstep) o.onLockstep(ls);
  const res = ls.run({ passes: o.passes || 400, stopOnDiff: true,
    onPass: (n, mm, l) => {
      if (o.onPass) o.onPass(n, mm, l); else { passFrame = mm.frames; due = true; }
    },
    onFrame: o.onFrame || ((f, mm) => { if (f - passFrame > 2 && (!cold || f > 400)) play(mm); }) });
  // out of step within 10 frames of the game's race: the race
  const outAt = res.diverged ? res.diverged.frame : res.diffs.length ? res.diffs[0].frame : null;
  const race = !res.ok && outAt !== null ? races.filter(r => r.frame <= outAt && outAt - r.frame <= 10).pop() || null : null;
  return { res, ls, m, P, races, race };
}

if (require.main === module) {
  const passes = +(process.argv[2] || 400), filter = process.argv[3] || '', seed = +(process.argv[4] || 1);
  const firsts = ['s1', 's2', 's3'].map(k => lib.states(k + '-')[0]).filter(Boolean);
  const list = filter === 'cold' ? ['cold'] : filter === 'forced' ? Object.keys(FORCE).flatMap(k => firsts.map(f => k + '@' + f))
    : filter.includes('@') ? [filter] : lib.states(filter);
  let ok = 0, n = 0;
  for (const f of list) {
    n++;
    let out;
    try { out = run({ state: f, passes, seed }); } catch (e) { console.log(f + ': ' + (e.stack || e.message).split('\n').slice(0, 8).join('\n  ')); continue; }
    const used = [...out.P.standInsUsed];
    const race = out.race ? '\n  the game\'s own race: an interrupt at $' + out.race.pc.toString(16).toUpperCase() + ' (' + out.race.where +
      ', frame ' + out.race.frame + ') changed $04 from $' + out.race.v.toString(16) + ' to $' + out.race.now.toString(16) + ': in step until then' : '';
    console.log(f + (used.length ? ' (the game\'s code stood in for ' + used.join(', ') + ')' : '') + ': ' +
      describe(out.res).split('\n').join('\n  ') + race + ' [week ' + out.P.M[0x5B51] + ', hour ' + out.P.M[0x5B55] + ']');
    if ((out.res.ok || out.race) && !used.length) ok++;
  }
  console.log(ok + '/' + n + ' moments in step');
  process.exitCode = ok === n ? 0 : 1;
}

module.exports = { run, FORCE };
