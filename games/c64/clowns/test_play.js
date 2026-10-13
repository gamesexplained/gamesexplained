#!/usr/bin/env node
// Hold the Play tab's port of the whole game (reference/cl-port.js) against the game's own code, tick
// by tick, in the kit's lockstep (kit/c64/lockstep.js). The game runs on the kit's C64 from the
// cartridge's bytes in the committed listing, started at its reset vector ($F766), with its CIA
// timers; the port runs beside it from the same start. Each pass is one tick: the game's wait_tick
// restarting the timer at $F717. At the start of every pass all of RAM is compared, and so are colour
// RAM and the registers written to the video chip and the SID, except the compiled program's own
// machinery, which the port does not keep: the runtime's scratch bytes $02-$10 (the software stack's
// pointer, the print routines' pointers, the arithmetic's work bytes) and the software stack's frames
// from $0244 (the arguments and links its procedures pass); the stack page is left out as for every
// lockstep.
//
// The input, set at the start of a pass as a player's would be: the title's demonstration, F1 and F1
// for one player, then an autopilot that turns the first paddle so the see-saw's raised end is under
// the falling clown, until the game is over; then F1 and F3 for two players, the paddle wandering
// until that game is over too; and so on, one game of each in turn, to the end. Paddle readings come from the test's own machine, which answers $D419 and $D41A (the kit's
// reads $FF); the port reads them through io.paddle. It exits 1 on any difference.
//   node games/c64/clowns/test_play.js [passes]
// With --cost <file> it also writes the game's median cycles per tick for each loop of the port,
// which the Play tab paces itself by.
const fs = require('fs'), path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, KEY } = require(path.join(ROOT, 'kit/c64/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/c64/lockstep.js'));
const g = game(__dirname);
const { ClownsPort } = g.run('reference/cl-port.js', 'cl-port.js', 'ClownsPort');
const args = process.argv.slice(2);
const costAt = args.indexOf('--cost'), costFile = costAt >= 0 ? args.splice(costAt, 2)[1] : null;
const PASSES = +args[0] || 60000;

class ClownsMachine extends Machine {
  constructor(o) { super(o); this.pot = [0xFF, 0xFF]; }
  ioRead(a) {
    if (a >= 0xD400 && a < 0xD800) { const r = a & 0x1F; if (r === 0x19 || r === 0x1A) return this.pot[r - 0x19]; }
    return super.ioRead(a);
  }
}
const m = new ClownsMachine({ ram: g.listing().ram, pc: 0xF766, port: { dir: 0x2F, data: 0xE5 }, cia: true });
const P = ClownsPort.create(new Uint8Array(65536), { paddle: (n) => m.pot[n] });
P.io.paddle = (n) => m.pot[n];
const costs = new Map();
const ls = new Lockstep({
  machine: m, port: P, program: (p) => p.program(), checkpoints: [0xF717], passAt: 0xF717,
  ignore: [[0x0002, 0x0010], [0x0244, 0x03BF]], chips: ['colour', 'vic', 'sid'], maxFrames: 2000,
  timing: (s) => { if (!costs.has(P.site)) costs.set(P.site, []); costs.get(P.site).push(s.cycles); },
});

// the input: a script of stages, each moved on by the pass count and what the game shows
let stage = 0, at = 0, games = 0;
const R = m.ram;
function autopilot(steer) {
  if (!steer) { m.pot[0] = m.pot[1] = (m.pot[0] + ((at * 7) % 5) - 2) & 255; return; }
  const x = (R[0x0200] & 1) << 8 | R[0x0201], half = R[0x020E] ? 12 : 36;
  const saw = Math.max(0, Math.min(250, x + 12 - half));
  const v = Math.max(0, Math.min(255, Math.round(200 - saw / 1.25)));
  m.pot[0] = m.pot[1] = v;
}
let since = 0, wasPlaying = false;
function onPass(n) {
  at = n;
  m.keys.clear();
  const go = (k) => { stage = k; since = n; };
  const t = n - since;
  if (stage === 0) { if (t > 400) go(1); }                                 // the demonstration runs a while
  else if (stage === 1) { m.keys.add(KEY.F1); if (t > 30) go(2); }         // F1: the menu
  else if (stage === 2) { if (t > 30) go(3); }
  else if (stage === 3) { m.keys.add(games % 2 ? KEY.F3 : KEY.F1); if (t > 30) go(4); }
  else if (stage === 4) {                                                   // a game, until it is over
    autopilot(games % 2 === 0);
    if (R[0x0213]) wasPlaying = true;
    else if (wasPlaying) { wasPlaying = false; games++; go(0); }
  }
}
const r = ls.run({ passes: PASSES, onPass: (n) => onPass(n) });
console.log(describe(r).join ? describe(r).join('\n') : describe(r));
console.log(`${r.passes} ticks, ${games} games played to the end, score ${R[0x021D] << 8 | R[0x021F]}, high score ${(R[0x0211] << 8 | R[0x0212]) * 10}`);
if (costFile) {
  const out = {};
  for (const [k, v] of costs) { v.sort((a, b) => a - b); out[k] = { median: v[v.length >> 1], n: v.length }; }
  fs.writeFileSync(costFile, JSON.stringify(out, null, 1));
  console.log('costs:', JSON.stringify(out));
}
process.exit(r.ok ? 0 : 1);
