'use strict';
// Holds the Play tab's port (play.html, /* popeye-port */) to the game's own program: the port and
// the program, rebuilt from listing.json, run side by side in the kit's lockstep (kit/gnw/
// lockstep.js) on the kit's SM5A, and at every checkpoint (the main loop's top, each count of the
// delay before a step, each pass while a game key is held, each setup of a mode) they must agree on all 65 cells and on
// the cycles since power on. Two sessions: the page's own computer player (/* popeye-auto */)
// through Game A, Game B, the clock and the alarm's setting; and the states play seldom reaches,
// set in both by writing the game's cells where the game would: the bonus at 200, the
// "infinite lives" pad, a game ended by Bluto, the alarm going off, the test pad's three uses and
// the time set after it.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { lockstep, romFromListing, physical } = require(path.resolve(__dirname, '../../../kit/gnw/lockstep.js'));
const g = game(__dirname);
const { PopeyePort } = g.run('play.html', 'popeye-port', 'PopeyePort');
const { popeyeAuto } = g.run('play.html', 'popeye-auto', 'popeyeAuto');
const rom = romFromListing(g.listing().ram);
const HZ = 16384;
const SEEN = new Set();

function session(name, secs, script) {
  let heldUntil = 0, last = { alpha: 0, beta: 0 };
  const done = {};
  const auto = (s, ram, cyc) => {
    if (cyc < heldUntil) { s.alpha = last.alpha; s.beta = last.beta; return; }
    last = popeyeAuto(ram, last); s.alpha = last.alpha; s.beta = last.beta; heldUntil = cyc + 900;
  };
  let end = false;
  const r = lockstep({
    seen: SEEN, rom, makePort: PopeyePort, checkpoints: [0x036, 0x3B0, 0x0B4, 0x500], passes: 5e6,
    inputs: (n, s, ram, cyc) => {
      s.rows = [0, 0, 0]; s.alpha = 0; s.beta = 0;
      const t = cyc / HZ;
      if (t > secs) { end = true; return { stop: 1 }; }
      return script(t, n, s, ram, () => auto(s, ram, cyc), done);
    },
    stop: () => end,
  });
  const ok = r.ok;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + ': ' + r.passes + ' checkpoints, ' + ((r.cycles || r.gameT || 0) / HZ).toFixed(0) + ' s of the chip' +
              (ok ? '' : ', at $' + (r.at || 0).toString(16) + ' ' + JSON.stringify({ why: r.why, portT: r.portT, gameT: r.gameT, diff: r.diff })));
  return ok;
}

let fails = 0;
fails += !session('the computer player: Game A, Game B, the clock, the alarm', 420, (t, n, s, ram, auto) => {
  if (t > 2 && t < 2.3) s.rows[2] = 1;
  else if (t > 4 && t < 4.3) s.rows[2] = 4;
  else if (t > 5 && t < 200) auto();
  else if (t > 200 && t < 200.3) s.rows[2] = 2;
  else if (t > 201 && t < 400) auto();
  else if (t > 400 && t < 400.3) s.rows[2] = 1;
  else if (t > 401 && t < 401.3) s.rows[2] = 8;
  else if (t > 403 && t < 405) s.alpha = 1;
  else if (t > 406 && t < 406.5) s.beta = 1;
  else if (t > 410 && t < 410.3) s.rows[2] = 1;
});
fails += !session('the states play seldom reaches', 330, (t, n, s, ram, auto, done) => {
  if (t > 2 && t < 2.3) s.rows[2] = 1;                                     // the clock
  else if (t > 4 && t < 4.3) s.rows[2] = 4;                                // Game A
  else if (t > 5 && !done.bonus) { done.bonus = 1; return { 0x15: 1, 0x16: 9, 0x17: 9, 0x06: 1 }; }   // 199, a mark lit
  else if (t > 5 && t < 60) { auto(); if (t > 30 && t < 40) s.rows[0] = 1; }                         // the "infinite lives" pad
  else if (t > 60 && t < 90) {                                             // two marks, the mallet down, Popeye walks into it
    if (!done.hit) { done.hit = 1; return { 0x06: 1, 0x04: 1 | (ram[4] & 12), 0x10: ram[0x10] | 1, 0x01: ram[0x01] & ~2 }; }
    s.beta = n & 1;
  }
  else if (t > 92 && t < 92.3) s.rows[2] = 1;                              // the game is over: the clock
  else if (t > 93 && t < 93.3) s.rows[2] = 8;                              // the alarm's setting, the alarm on
  else if (t > 94 && t < 94.3) s.rows[2] = 1;
  else if (t > 95 && !done.alarm) { done.alarm = 1; const p = {}; for (const c of [0x32, 0x33, 0x34, 0x35]) p[c] = ram[c + 4]; p[0x35] = (ram[0x39] + 1) % 10; return p; }
  else if (t > 160 && t < 160.3) s.rows[2] = 2;                            // Game B, which stops the ringing
  else if (t > 161 && t < 280) auto();
  else if (t > 285 && t < 288) s.rows[0] = 8;                              // the test pad rings the alarm
  else if (t > 290 && t < 293) s.rows[0] = 4;                              // and goes back to the time setting
  else if (t > 295 && t < 310) { s.beta = n >> 3 & 1; s.alpha = n >> 5 & 1; }   // the time set, held and tapped
  else if (t > 310 && t < 315) { s.rows[0] = 1; s.beta = n >> 2 & 1; }     // 888, drawn at each press
  else if (t > 320 && t < 320.3) s.rows[2] = 1;
});
// every state the sessions are there for must have run on the machine
const WANT = { 'the bonus blinking': 0x724, 'the bonus ending': 0x72A, 'the alarm ringing': 0x5A9, "the alarm's buzz": 0x298,
  "the alarm's time matched": 0x59E, 'the test pad resetting': 0x5B9, '888 after power on': 0x6DC, 'a held press repeating': 0x3EB,
  'Popeye hit': 0x373, 'Popeye into his splash': 0x102, 'a miss counted': 0x1AC, 'a lost item, half a miss': 0x1B5,
  'the third miss counted': 0x1B1, 'an hour added': 0x240, "the alarm's setting": 0x2D8, 'Bluto changing boats': 0x398,
  "the demo's Popeye moving": 0x34E, 'Time held: the alarm time': 0x6E3 };
for (const k in WANT) if (!SEEN.has(physical(WANT[k]))) { console.log('FAIL the sessions never reached ' + k + ' ($' + WANT[k].toString(16) + ')'); fails++; }
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);
