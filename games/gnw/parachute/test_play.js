'use strict';
// Holds the Play tab's port (play.html, /* parachute-port */) to the game's own program: the port
// and the program, rebuilt from listing.json, run side by side in the kit's lockstep (kit/gnw/
// lockstep.js) on the kit's SM5A, and at every checkpoint (each pass, each pass of the wait before
// a step, each return from drawing, each reading of the keys, each pass of the wait for the R3 pads at power on) they must agree on all 65 cells and
// on the cycles since power on. Three sessions: the page's own computer player (/* parachute-auto */)
// through Game A and Game B; the states play seldom reaches, set in both by writing the game's
// cells where the game would: the time and the alarm set with held and tapped presses, the alarm
// ringing and stopped, a game started while it rings, the bonus at 200 and 500, the top speed, 999
// going on to 000, R3's fourth key in and out of a game, both buttons, game keys during a game,
// three keys at once, the game over and the clock 255 seconds later; and an R3 key held at power
// on, which turns the misses off. In the clock the chip wakes once a second, so a press there is
// held for 1.2 s to reach a checkpoint.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { lockstep, romFromListing, physical } = require(path.resolve(__dirname, '../../../kit/gnw/lockstep.js'));
const g = game(__dirname);
const { ParachutePort } = g.run('play.html', 'parachute-port', 'ParachutePort');
const { ParachuteAuto } = g.run('play.html', 'parachute-auto', 'ParachuteAuto');
const rom = romFromListing(g.listing().ram);
const HZ = 16384;
const SEEN = new Set();

function session(name, secs, script, initial) {
  let seed = 12345; const random = () => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed / 0x80000000; };
  const decide = ParachuteAuto({ random });
  let P = null, lastSteps = -1, key = null, until = 0, end = false;
  const done = {};
  const auto = s => {
    if (P.steps !== lastSteps) { lastSteps = P.steps; key = decide(P); until = P.T + 650; }
    if (key && P.T < until) s[key] = 1;
  };
  const r = lockstep({
    seen: SEEN, rom, makePort: io => (P = ParachutePort(io)), checkpoints: [0x036, 0x046, 0x004, 0x506, 0x3D3], passes: 5e7, trace: true, initial,
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
const alarmNext = ram => { const p = {}; for (const c of [0x32, 0x33, 0x34, 0x35]) p[c] = ram[c + 4]; p[0x35] = (ram[0x39] + 1) % 10; p[0x34] = p[0x35] ? ram[0x38] : (ram[0x38] + 1) % 6; return p; };

let fails = 0;
fails += !session('the computer player: Game A, then Game B', 1220, (t, n, s, ram, auto) => {
  if (t > 2 && t < 3.2) s.rows[2] = 1;
  else if (t > 4 && t < 4.3) s.rows[2] = 4;
  else if (t > 5 && t < 600) auto();
  else if (t > 600 && t < 610) { }                                         // left alone: misses come
  else if (t > 610 && t < 611.2) s.rows[2] = 2;                             // Game B, once Game A is over or not
  else if (t > 612) auto();
});
fails += !session('the clock, the alarm and the rare states of a game', 1500, (t, n, s, ram, auto, done) => {
  const at = (k, from, len, f) => { if (t >= from && t < from + len) { f(); return true; } return false; };
  if (t > 0.5 && t < 12) { s.beta = n >> 4 & 1; s.alpha = n >> 6 & 1; return; }
  if (t > 12 && t < 14) { s.alpha = 1; s.beta = 1; return; }
  if (at(0, 15, 1.2, () => s.rows[2] = 1)) return;                          // the clock
  if (at(0, 17, 1.5, () => s.rows[2] = 1)) return;                          // Time held: the alarm's time
  if (at(0, 19, 1.2, () => s.rows[2] = 8)) return;                          // the alarm's setting, the alarm on
  if (t > 21 && t < 24) { s.beta = n >> 3 & 1; s.alpha = n >> 5 & 1; if (t > 23) { s.beta = 1; s.alpha = t > 23.5 ? 1 : 0; } return; }
  if (at(0, 24.5, 1.2, () => s.rows[2] = 8)) return;                        // off
  if (at(0, 26.5, 1.2, () => s.rows[2] = 8)) return;                        // on again
  if (at(0, 28.5, 1.2, () => s.rows[2] = 1)) return;                        // the clock
  if (t > 31 && !done.a1) { done.a1 = 1; return alarmNext(ram); }
  if (!done.stopped) { if (ram[0x30] === 1 && ram[0x14] & 1 && !done.ring) done.ring = t; if (done.ring && t > done.ring + 3) { if (t < done.ring + 4.2) s.rows[2] = 1; else done.stopped = t; } return; }   // it rings; Time stops it
  if (!done.a2) { done.a2 = 1; return alarmNext(ram); }
  if (!done.g1) { if (ram[0x30] === 1 && ram[0x14] & 1 && !done.ring2) done.ring2 = t; if (done.ring2 && t > done.ring2 + 3) { if (t < done.ring2 + 4.2) s.rows[2] = 4; else done.g1 = t; } return; }   // a game while it rings
  const g = t - done.g1;
  if (g < 30) { auto(); return; }
  if (!done.b200) { done.b200 = 1; return { 0x15: 1, 0x16: 9, 0x17: 7, 0x18: ram[0x18] | 4 }; }
  if (g < 90) { auto(); return; }
  if (!done.b500) { done.b500 = 1; return { 0x15: 4, 0x16: 9, 0x17: 7, 0x18: ram[0x18] | 6 }; }
  if (g < 150) { auto(); if (g > 130 && g < 133) s.rows[1] = 8; return; }   // R3 K4 during a game
  if (!done.top) { done.top = 1; return { 0x15: 8, 0x16: 9, 0x17: 0 }; }   // the top speed
  if (g < 190) { auto(); return; }
  if (!done.wrap) { done.wrap = 1; return { 0x15: 9, 0x16: 9, 0x17: 6 }; }   // 999 to 000
  if (g < 240) { if (g > 209 && g < 210) return; if (g > 210 && g < 212) { s.alpha = 1; s.beta = 1; return; } auto(); if (g > 220 && g < 222) s.rows[2] = 4; if (g > 225 && g < 226) s.rows[2] = 7; return; }
  if (g < 600) return;                                                      // no play: misses, the game over, 255 s on, the clock
  if (at(0, done.g1 + 600, 1.2, () => s.rows[2] = 7)) return;               // three keys: the alarm's setting
  if (at(0, done.g1 + 602, 1.2, () => s.rows[2] = 3)) return;               // Time and Game B
  if (at(0, done.g1 + 604, 1.2, () => s.rows[2] = 6)) return;               // Game A and Game B
  if (at(0, done.g1 + 606, 1.2, () => s.rows[2] = 1)) return;
  if (at(0, done.g1 + 608, 1.2, () => s.rows[2] = 2)) return;               // Game B
  if (g < 1000) { auto(); if (g > 700 && g < 701) s.rows[2] = 2; return; }  // its key again during the game
  if (g < 1003) s.rows[1] = 8;                                              // R3 K4 out of a game
});
fails += !session('misses off: an R3 key held at power on', 400, (t, n, s, ram, auto, done) => {
  if (t < 1.5) s.rows[1] = 1;
  else if (t > 2 && t < 3.2) s.rows[2] = 1;
  else if (t > 4 && t < 5.2) s.rows[2] = 4;
  else if (t > 4 && t < 200) { }                                            // no play: misses do not count
  else if (t > 200 && t < 200.3) s.rows[2] = 2;
  else if (t > 201 && t < 400) auto();
}, { rows: [0, 1, 0] });
// every state the sessions are there for must have run on the machine
const WANT = { 'a catch': 0x4A0, 'a late catch': 0x322, 'a miss starting': 0x3A9, 'a miss counted': 0x376, 'the game over': 0x379, 'misses off': 0x372,
  'the tree catching one': 0x1DB, 'the tree letting go': 0x1F2, 'the bonus beeping': 0x728, 'the bonus ending': 0x72E, 'the top speed': 0x0E8,
  'the hundreds and tens past 14': 0x0C7, 'a best score beaten': 0x0B3, 'the alarm ringing': 0x5B0, "the alarm's buzz": 0x299, "the alarm's time matched": 0x5A2,
  'Time stopping the alarm': 0x549, 'R3 K4': 0x5AD, 'an R3 key at power on': 0x3D6, '888 with misses off': 0x6DF, 'a held press repeating': 0x39E,
  'an hour added': 0x240, "the alarm's setting": 0x2D2, '255 seconds after a game': 0x220, 'Time held: the alarm time': 0x6C4, 'both buttons, dropped': 0x388 };
// move_boat's own test for both buttons ($0306) runs only when the second is pressed within the few
// instructions after read_pad ($0385) let the first through; the lockstep changes inputs only at
// checkpoints, and there is none between, so the sessions hold the press read_pad drops instead
for (const k in WANT) if (!SEEN.has(physical(WANT[k]))) { console.log('FAIL the sessions never reached ' + k + ' ($' + WANT[k].toString(16) + ')'); fails++; }
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);
