'use strict';
// Holds the Play tab's port (play.html, /* octopus-port */) to the game's own program: the port and
// the program, rebuilt from listing.json, run side by side in the kit's lockstep (kit/gnw/
// lockstep.js) on the kit's SM5A, and at every checkpoint (each pass, each pass of the wait before
// a step, each return from drawing, each reading of the keys) they must agree on all 65 cells and
// on the cycles since power on. Two sessions: the page's own computer player (/* octopus-auto */)
// through Game A and Game B, with the clock and the alarm's setting between; and the states play
// seldom reaches, set in both by writing the game's cells where the game would: the bonus at 200
// and 500, 999 going on to 000, the invincibility pad, the alarm going off and stopped, the R3
// test row's two keys, the time set with held and tapped presses, both buttons held, a game key
// held through a game, three keys at once, and 256 seconds after a game is over.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { lockstep, romFromListing, physical } = require(path.resolve(__dirname, '../../../kit/gnw/lockstep.js'));
const g = game(__dirname);
const { OctopusPort } = g.run('play.html', 'octopus-port', 'OctopusPort');
const { OctopusAuto } = g.run('play.html', 'octopus-auto', 'OctopusAuto');
const rom = romFromListing(g.listing().ram);
const HZ = 16384;
const SEEN = new Set();

function session(name, secs, script) {
  let seed = 12345; const random = () => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed / 0x80000000; };
  const decide = OctopusAuto(OctopusPort, { random });
  let P = null, lastSteps = -1, key = null, until = 0, end = false;
  const done = {};
  const auto = s => {
    if (P.steps !== lastSteps) { lastSteps = P.steps; key = decide(P, s.rows[0]); until = P.T + 1300; }
    if (key && P.T < until) s[key] = 1;
  };
  const r = lockstep({
    seen: SEEN, rom, makePort: io => (P = OctopusPort(io)), checkpoints: [0x036, 0x045, 0x004, 0x504], passes: 5e7, trace: true,
    inputs: (n, s, ram, cyc) => {
      s.rows = [0, 0, 0]; s.alpha = 0; s.beta = 0;
      const t = cyc / HZ;
      if (t > secs) { end = true; return; }
      return script(t, n, s, ram, () => auto(s), done);
    },
    stop: () => end,
  });
  console.log((r.ok ? 'ok   ' : 'FAIL ') + name + ': ' + r.passes + ' checkpoints, ' + ((r.cycles || 0) / HZ).toFixed(0) + ' s of the chip, score ' +
              [0x15, 0x16, 0x17].map(c => P.M[c] % 11).join('') + (r.ok ? '' : ', at $' + (r.at || 0).toString(16) + ' ' + JSON.stringify({ why: r.why, diff: r.diff, firstRun: r.firstRun && { addr: r.firstRun.addr, T: r.firstRun.T, game: r.firstRun.game } })));
  return r.ok;
}

let fails = 0;
fails += !session('the computer player: Game A, Game B, the clock, the alarm', 1260, (t, n, s, ram, auto) => {
  if (t > 2 && t < 2.3) s.rows[2] = 1;
  else if (t > 4 && t < 4.3) s.rows[2] = 4;
  else if (t > 5 && t < 600) auto();
  else if (t > 600 && t < 600.3) s.rows[2] = 2;                           // Game B, once Game A is over or not
  else if (t > 601 && t < 1200) auto();
  else if (t > 1230 && t < 1230.3) s.rows[2] = 1;
  else if (t > 1231 && t < 1231.3) s.rows[2] = 8;
  else if (t > 1233 && t < 1235) s.alpha = 1;
  else if (t > 1236 && t < 1236.5) s.beta = 1;
  else if (t > 1240 && t < 1240.3) s.rows[2] = 1;
});
fails += !session('the states play seldom reaches', 1000, (t, n, s, ram, auto, done) => {
  if (t > 0.5 && t < 12) { s.beta = n >> 4 & 1; s.alpha = n >> 6 & 1; }   // the time set after power on, held and tapped
  else if (t > 12 && t < 14) { s.alpha = 1; s.beta = 1; }                   // both
  else if (t > 15 && t < 15.3) s.rows[2] = 1;                              // the clock
  else if (t > 16 && t < 16.3) s.rows[2] = 4;                              // Game A
  else if (t > 17 && !done.b200) { done.b200 = 1; return { 0x15: 1, 0x16: 9, 0x17: 7, 0x04: ram[4] & ~2 }; }   // 197, a spare lost
  else if (t > 17 && t < 60) auto();
  else if (t > 60 && !done.b500) { done.b500 = 1; return { 0x15: 4, 0x16: 9, 0x17: 7, 0x04: ram[4] & ~6 }; }
  else if (t > 60 && t < 110) { auto(); if (t > 90 && t < 100) s.rows[0] = 1; }          // the invincibility pad
  else if (t > 110 && !done.top) { done.top = 1; return { 0x15: 9, 0x16: 9, 0x17: 6 }; }   // 999 going on to 000
  else if (t > 110 && t < 150) { auto(); if (t > 120 && t < 123) { s.alpha = 1; s.beta = 1; } }
  else if (t > 150 && t < 152) s.rows[2] = 4;                               // a game key held during a game
  else if (t > 152 && t < 200) { if (t > 160 && t < 162) s.rows[2] = 7; else if (t > 165) s.alpha = n & 1; }   // three keys; then walk into the tentacles
  else if (t > 200 && t < 470) { }                                          // the game over, and 256 seconds on: the clock
  else if (t > 470 && t < 470.3) s.rows[2] = 8;                             // the alarm's setting, the alarm on
  else if (t > 471 && t < 474) { s.beta = n >> 3 & 1; s.alpha = n >> 5 & 1; }
  else if (t > 475 && t < 475.3) s.rows[2] = 1;
  else if (t > 476 && !done.alarm) { done.alarm = 1; const p = {}; for (const c of [0x32, 0x33, 0x34, 0x35]) p[c] = ram[c + 4]; p[0x35] = (ram[0x39] + 1) % 10; p[0x34] = p[0x35] ? ram[0x38] : (ram[0x38] + 1) % 6; return p; }
  else if (t > 476 && t < 600) { if (t > 560 && t < 560.3) s.rows[2] = 1; }   // it rings; Time stops it
  else if (t > 600 && !done.alarm2) { done.alarm2 = 1; const p = {}; for (const c of [0x32, 0x33, 0x34, 0x35]) p[c] = ram[c + 4]; p[0x35] = (ram[0x39] + 1) % 10; p[0x34] = p[0x35] ? ram[0x38] : (ram[0x38] + 1) % 6; return p; }
  else if (t > 600 && t < 640) { if (t > 630 && t < 630.3) s.rows[2] = 2; } // it rings; Game B starts
  else if (t > 640 && t < 760) auto();
  else if (t > 760 && t < 763) s.rows[1] = 8;                               // R3.K4 rings the alarm
  else if (t > 765 && t < 768) s.rows[1] = 4;                               // R3.K3: back to setting the time
  else if (t > 770 && t < 790) { s.beta = n >> 3 & 1; s.alpha = n >> 5 & 1; }
  else if (t > 790 && t < 795) { s.rows[1] = 8; s.beta = n >> 2 & 1; }     // 888 with R3.K4 held at power on's screen
  else if (t > 800 && t < 800.3) s.rows[2] = 1;
  else if (t > 801 && t < 801.3) s.rows[2] = 2;                             // Game B, played to its end by walking in
  else if (t > 802 && t < 900) s.alpha = n & 1;
});
// every state the sessions are there for must have run on the machine
const WANT = { 'the bonus blinking': 0x654, 'the bonus ending': 0x6ED, 'the alarm ringing': 0x5A4, "the alarm's buzz": 0x299,
  "the alarm's time matched": 0x599, 'the R3 row going back to the time setting': 0x5B2, '888 at power on': 0x6A2, 'a held press repeating': 0x3AE,
  'a diver caught': 0x1DE, 'a caught diver shown': 0x700, 'the game over': 0x730, 'a take of treasure': 0x317, 'a point counted in at the boat': 0x36F,
  'the diver leaving the boat by himself': 0x3F5, 'an hour added': 0x240, "the alarm's setting": 0x2D4, '256 seconds after a game': 0x222,
  'the time shown in the clock': 0x685, 'Time held: the alarm time': 0x6A6, 'a best score beaten': 0x0B1, '999 to 000': 0x08F,
  'the T1 branch chosen': 0x18E, 'the invincibility pad': 0x1C6 };
for (const k in WANT) if (!SEEN.has(physical(WANT[k]))) { console.log('FAIL the sessions never reached ' + k + ' ($' + WANT[k].toString(16) + ')'); fails++; }
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);
