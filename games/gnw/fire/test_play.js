'use strict';
// Holds the Play tab's port (play.html, /* fire-port */) to the game's own program: the port and the
// program, rebuilt from listing.json, run side by side in the kit's lockstep (kit/gnw/lockstep.js) on
// the kit's SM5A, and at every checkpoint (each pass, each return from drawing, each pass of the wait
// before a step, each reading of the keys) they must agree on all 65 cells and on the cycles since
// power on. Four sessions: the page's own computer player (/* fire-auto */) through Game A and
// through Game B; the states play seldom reaches, set in both by writing the game's cells where the
// game would: the time and the alarm set with held and tapped presses, the alarm ringing and stopped,
// a game started while it rings, the bonus at 200 and 500 with an angel shown, the test key R3 K3,
// the top speed, 999 going on to 000, both buttons, game keys during a game, three keys at once, the
// R2 pads, the game over and the clock 256 seconds later; and an R3 key held from power on (the
// screen's test), the R2 K1 pad held through misses, and AM turning to PM. In the clock the chip
// wakes once a second, so a press there is held for 1.2 s to reach a checkpoint.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { lockstep, romFromListing, physical } = require(path.resolve(__dirname, '../../../kit/gnw/lockstep.js'));
const g = game(__dirname);
const { FirePort } = g.run('play.html', 'fire-port', 'FirePort');
globalThis.FirePort = FirePort;
const { FireAuto } = g.run('play.html', 'fire-auto', 'FireAuto');
const rom = romFromListing(g.listing().ram);
const HZ = 16384;
const SEEN = new Set(), CHECKS = {};

function session(name, secs, script, initial) {
  let seed = 12345; const random = () => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed / 0x80000000; };
  const decide = FireAuto({ random });
  let P = null, lastSteps = -1, key = null, until = 0, end = false;
  const done = {};
  const auto = s => {
    if (P.steps !== lastSteps) { lastSteps = P.steps; key = decide(P); until = P.T + 650; }
    if (key && P.T < until) s[key] = 1;
  };
  const r = lockstep({
    seen: SEEN, rom, makePort: io => (P = FirePort(io)), checkpoints: [0x004, 0x036, 0x386, 0x500], passes: 5e8, trace: true, initial,
    inputs: (n, s, ram, cyc) => {
      s.rows = [0, 0, 0]; s.alpha = 0; s.beta = 0;
      const t = cyc / HZ;
      if (t > secs) { end = true; return; }
      if ((ram[0x30] & 6) && ram[0x49] === 4) CHECKS['the top speed, a wait of 4 passes'] = true;
      return script(t, n, s, ram, () => auto(s), done);
    },
    stop: () => end,
  });
  console.log((r.ok ? 'ok   ' : 'FAIL ') + name + ': ' + r.passes + ' checkpoints, ' + ((r.cycles || r.gameT || 0) / HZ).toFixed(0) + ' s of the chip, score ' +
              [0x15, 0x16, 0x17].map(c => P.M[c] % 11).join('') + (r.ok ? '' : ', at $' + (r.at || 0).toString(16) + ' ' + JSON.stringify({ why: r.why, diff: r.diff, firstRun: r.firstRun && { addr: r.firstRun.addr, T: r.firstRun.T, game: r.firstRun.game } })));
  return r.ok;
}
const alarmNext = ram => { const p = {}; for (const c of [0x32, 0x33, 0x34, 0x35]) p[c] = ram[c + 4]; p[0x35] = (ram[0x39] + 1) % 10; p[0x34] = p[0x35] ? ram[0x38] : (ram[0x38] + 1) % 6; return p; };
const start = key => (t, s) => { if (t > 1 && t < 2.2) { s.rows[2] = 1; return true; } if (t > 3 && t < 3.3) { s.rows[2] = key; return true; } return t <= 4; };

let fails = 0;
fails += !session('the computer player: Game A', 900, (t, n, s, ram, auto) => { if (!start(4)(t, s)) auto(); });
fails += !session('the computer player: Game B', 900, (t, n, s, ram, auto) => { if (!start(2)(t, s)) auto(); });
fails += !session('the clock, the alarm and the rare states of a game', 1500, (t, n, s, ram, auto, done) => {
  const at = (from, len, f) => { if (t >= from && t < from + len) { f(); return true; } return false; };
  if (t > 0.5 && t < 12) { s.beta = n >> 4 & 1; s.alpha = n >> 6 & 1; return; }            // the time set, tapped and held
  if (t > 12 && t < 14) { s.alpha = 1; s.beta = 1; return; }                               // both at once
  if (at(15, 1.2, () => s.rows[2] = 1)) return;                                             // the clock
  if (at(17, 1.5, () => s.rows[2] = 1)) return;                                             // Time held: the alarm's time
  if (at(19, 1.2, () => s.rows[2] = 8)) return;                                             // the alarm's setting, the alarm on
  if (t > 21 && t < 24) { s.beta = n >> 3 & 1; s.alpha = n >> 5 & 1; if (t > 23) { s.beta = 1; s.alpha = t > 23.5 ? 1 : 0; } return; }
  if (at(24.5, 1.2, () => s.rows[2] = 8)) return;                                           // off
  if (at(26.5, 1.2, () => s.rows[2] = 8)) return;                                           // on again
  if (at(28.5, 1.2, () => s.rows[2] = 1)) return;                                           // the clock
  if (t > 31 && !done.a1) { done.a1 = 1; return alarmNext(ram); }
  if (!done.stopped) { if (ram[0x0a] & 4 && !done.ring) done.ring = t; if (done.ring && t > done.ring + 3) { if (t < done.ring + 4.2) s.rows[2] = 1; else { done.stopped = t; if (!(ram[0x0a] & 4)) CHECKS['Time stopping the alarm'] = true; } } return; }
  if (!done.a2) { done.a2 = 1; return alarmNext(ram); }
  if (!done.g1) { if (ram[0x0a] & 4 && !done.ring2) done.ring2 = t; if (done.ring2 && t > done.ring2 + 3) { if (t < done.ring2 + 4.2) s.rows[2] = 4; else done.g1 = t; } return; }
  const g = t - done.g1;
  if (g < 20) { auto(); return; }
  if (!done.miss1) { if (!(ram[0x10] & 2)) return; done.miss1 = 1; }                        // let one fall: an angel
  if (!done.b200) { done.b200 = 1; return { 0x15: 1, 0x16: 9, 0x17: 7 }; }
  if (g < 90) { auto(); return; }
  if (!done.miss2) { if (!(ram[0x10] & 2)) return; done.miss2 = 1; }
  if (!done.b500) { done.b500 = 1; return { 0x15: 4, 0x16: 9, 0x17: 7 }; }
  if (g < 160) { auto(); if (g > 140 && g < 146) s.rows[1] = 4; return; }                   // R3 K3: points at the ambulance
  if (!done.top) { done.top = 1; return { 0x15: 8, 0x16: 9, 0x17: 0, 0x10: ram[0x10] & 1 }; }   // the top speed, the angels cleared
  if (g < 200) { auto(); return; }
  if (!done.wrap) { done.wrap = 1; return { 0x15: 9, 0x16: 9, 0x17: 6, 0x10: ram[0x10] & 1 }; } // 999 to 000
  if (g < 250) { auto(); if (g > 210 && g < 212) { s.alpha = 1; s.beta = 1; } if (g > 220 && g < 222) s.rows[2] = 4; if (g > 225 && g < 226) s.rows[2] = 7; return; }
  if (g < 700) return;                                                                      // no play: misses, the game over, 256 s on, the clock
  if (at(done.g1 + 700, 1.2, () => s.rows[2] = 7)) return;                                  // three keys: the alarm's setting
  if (at(done.g1 + 702, 1.2, () => s.rows[2] = 3)) return;                                  // Time and Game B
  if (at(done.g1 + 704, 1.2, () => s.rows[2] = 6)) return;                                  // Game A and Game B
  if (at(done.g1 + 706, 1.2, () => s.rows[2] = 1)) return;
  if (at(done.g1 + 708, 1.2, () => s.rows[2] = 2)) return;                                  // Game B
  if (g < 1000) { auto(); if (g > 800 && g < 801) s.rows[2] = 2; return; }                // its key again during the game
  if (g < 1003) { s.rows[0] = 8; return; }                                                  // R2 K4: the alarm rings
  if (g < 1010) return;
  if (g < 1012) { s.rows[0] = 4; return; }                                                  // R2 K3: back to setting the time
});
fails += !session('an R3 key at power on, the R2 pad through misses, AM to PM', 400, (t, n, s, ram, auto, done) => {
  if (t < 1.5) { s.rows[1] = 1; return; }                                                   // the screen's test: 888
  if (t > 2 && t < 3.2) { s.rows[2] = 1; return; }
  if (t > 4 && t < 4.3) { s.rows[2] = 4; return; }
  if (t > 4.3 && t < 80) { s.rows[0] = 1; return; }                                         // the pad held, no play
  if (t >= 80 && !done.pad) { done.pad = 1; if (!(ram[0x10] & 0xe) && ram[0x19] !== undefined) CHECKS['the R2 pad keeping the angels away'] = true; }
  if (t > 82 && t < 140) { auto(); return; }
  if (t > 300 && t < 301.2) { s.rows[2] = 1; return; }                                      // the clock (after 256 s it may be there already)
  if (t > 303 && !done.pm) { done.pm = 1; return { 0x36: 1, 0x37: 1, 0x38: 5, 0x39: 9, 0x3A: 5, 0x3B: 5 }; }   // 11:59:55 AM
  if (t > 320 && !done.pmc) { done.pmc = 1; if (ram[0x36] & 8) CHECKS['AM turning to PM'] = true; }
}, { rows: [0, 1, 0] });
// every state the sessions are there for must have run on the machine
const WANT = { 'a catch': 0x318, 'a miss starting': 0x3C4, 'a miss counted': 0x19C, 'the game over': 0x028, 'past 999': 0x04F, 'a new hundred': 0x05A,
  'the bonus': 0x067, 'the bonus ending': 0x72E, 'the alarm ringing': 0x5A1, "the alarm's time matched": 0x598, "the alarm's buzz": 0x293, 'R2 K3': 0x5AF,
  'the screen test at power on': 0x6DA, 'R3 K3: points at the ambulance': 0x192, 'back to the clock 256 s after a game': 0x222,
  "the alarm's hour set": 0x2E0, "the alarm's minute set": 0x2E5, 'an hour set': 0x2D0, 'a minute set': 0x2D3, 'AM and PM swapped': 0x25C,
  'three keys: the alarm setting': 0x553, 'the best shown': 0x617, 'the lower window': 0x1D1, 'the lower drop': 0x12B,
  'the hurt figures cleared': 0x677, 'the beeps': 0x1AB, "the step's burst": 0x29F, "the catch's tone": 0x2AD };
// pad_pressed's own test for both buttons ($02F3) runs only when the second is pressed within the few
// instructions after read_pad ($03D6) let the first through; the lockstep changes inputs only at
// checkpoints, and read_pad drops a press of both at once, so no session can reach it
for (const k in WANT) if (!SEEN.has(physical(WANT[k]))) { console.log('FAIL the sessions never reached ' + k + ' ($' + WANT[k].toString(16) + ')'); fails++; }
for (const k of ['the top speed, a wait of 4 passes', 'Time stopping the alarm', 'the R2 pad keeping the angels away', 'AM turning to PM'])
  if (!CHECKS[k]) { console.log('FAIL the sessions never showed ' + k); fails++; }
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);
