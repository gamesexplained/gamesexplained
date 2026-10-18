#!/usr/bin/env node
// Moments of play for the port's lockstep, saved at the start of a pass of the main loop that runs
// them, from scripted play on the runner (port/test/lib.js). They hold the game's memory, so they go
// to work/states/ and are never committed.
//   node games/c64/space-rogue/port/scripts/gen-states.js
const lib = require('../test/lib.js');

let seed = 7;
const rnd = (n) => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return Math.floor(seed / 4294967296 * n); };

// Which sets to make: all of them, or those named on the command line (start, base, fight, nav,
// station, title, intro, ending).
const only = process.argv.slice(2);
const want = (k) => !only.length || only.includes(k);
const KEYS = ['A', 'D', 'W', 'X', 'Z', 'C', 'S', '+', '+', 'T', 'V', 'V', 'V', 'SPACE', 'SPACE', 'R', 'I'];

// Flying with keys held and the stick moved at random, a moment every ten seconds or so.
function fly(S, name, count, steps = 20) {
  for (let n = 1; n <= count; n++) {
    for (let i = 0; i < steps; i++) {
      const r = rnd(4);
      if (r === 0) S.key(KEYS[rnd(KEYS.length)], 0.1 + rnd(5) / 10);
      else if (r === 1) { S.m.joy = 0x1F & ~[1, 2, 4, 8, 16, 5, 9][rnd(7)]; S.run(0.2 + rnd(5) / 10); S.m.joy = 0x1F; }
      else S.run(0.3);
    }
    S.stopAt(lib.FLIGHT_PASS);
    const id = name + String(n).padStart(2, '0');
    const s = S.save(id, lib.FLIGHT_PASS);
    const ram = Buffer.from(s.machine.ram, 'base64');
    const slots = [];
    for (let k = 0; k < 20; k++) if (ram[0x05F9 + k]) slots.push(k + ':' + ram[0x060D + k].toString(16));
    console.log(id, 'frame', S.R.frame, 'fixes', S.fixes.length, 'slots', slots.join(' '));
  }
}
// The ship put in another sector as the game's own arrival does it (gate_jump's last steps,
// $7243): the system's map, the navigation tiles, the encounter rolled for A hours, the sector's
// objects, and the view copied to the second buffer (copy_to_bank1); the player's armour made
// large, so that a fight does not end the game.
function arrive(S, x, y, hours, tries = 1) {
  S.ram[0x071E] = x; S.ram[0x071F] = y;
  S.call(0x2E7A);
  S.ram[0x0D04] = S.ram[0x0D05] = S.ram[0x0D06] = 0xFF;
  S.call(0x26B1);
  for (let i = 0; i < tries; i++) if (!(S.call(0x2C1E, { a: hours }).a & 0x80)) break;
  S.call(0x15A0);
  S.call(0x8F40);
  S.ram[0x051D] = 0xFF; S.ram[0x051E] = 0x7F;
}

// A new game, at the cockpit.
const S = lib.runner();
lib.newGame(S);
S.stopAt(lib.FLIGHT_PASS);
S.ram = S.R.ram;
if (want('start')) { S.save('flight-00-start', lib.FLIGHT_PASS); fly(S, 'flight-', 8); }
// Hiathra Starbase's sector (13,19), the base in sight
if (want('base')) {
  const B = lib.runner({ state: lib.readState('flight-00-start') });
  B.ram = B.R.ram;
  B.stopAt(lib.FLIGHT_PASS);
  arrive(B, 13, 19, 0);
  fly(B, 'flight-base-', 6, 10);
}
// An encounter: ships placed around the player as HELM's encounters place them
if (want('fight')) {
  const F = lib.runner({ state: lib.readState('flight-00-start') });
  F.ram = F.R.ram;
  F.stopAt(lib.FLIGHT_PASS);
  arrive(F, 10, 10, 0xFF, 40);
  fly(F, 'flight-fight-', 8, 8);
}
// Navigation, for the checks of its routines alone (check.js's moments 'nav'): from moments of
// flight, the chart and its menu up; then a course laid in with the keys, and some way along it
// on HELM. The game waits in the menu, mid-routine, so these are memory to check on, never a
// pass to start a lockstep from.
if (want('nav')) {
  let n = 0;
  const save = (N) => {
    const id = 'nav-' + String(++n).padStart(2, '0');
    N.save(id);
    const r = N.R.ram;
    console.log(id, 'frame', N.R.frame, 'sector', r[0x5510] + ',' + r[0x5530], 'dest', r[0x072C] + ',' + r[0x072D], 'near', r[0x0D07]);
  };
  for (const from of ['flight-01', 'flight-04', 'flight-base-02', 'flight-fight-02', 'flight-fight-05']) {
    const N = lib.runner({ state: lib.readState(from) });
    N.stopAt(lib.FLIGHT_PASS);
    N.key('N'); N.run(1.5);
    save(N);
    // CHART: the cursor moved a few sectors, and back to the menu
    N.key('RETURN'); N.run(0.5);
    for (let i = 0, k = 2 + rnd(4); i < k; i++) { N.key(['W', 'A', 'D', 'X', 'Q', 'E', 'Z', 'C'][rnd(8)]); N.run(0.3); }
    N.key('RETURN'); N.run(1);
    save(N);
    // HELM, the menu's second line, for a while
    N.key('X'); N.run(0.3); N.key('RETURN'); N.run(4 + rnd(6));
    save(N);
  }
}
// A base, for the checks of its routines alone (check.js's moments 'station') and its lockstep:
// from the moments in Hiathra Starbase's sector, docked as dock_check docks (dock, $7094, with the
// return to the main loop's pass on the stack, as the game drops the draw list's), the arrival's
// message answered, then walked about with the stick, now and then the fire button too, and what
// that opens (a menu, a shop, a talk) answered with the stick. A moment at the start of a pass of
// the base's loop ($A4DF) every so often; a walk that leaves the base ends there.
const BASE_PASS = 0xA4DF;
const DOCK_TRIES = 40;
function dock(S) {
  const R = S.R, c = R.cpu;
  R.ram[0x100 + c.sp] = 0x0D; c.sp = (c.sp - 1) & 255;
  R.ram[0x100 + c.sp] = 0xEC; c.sp = (c.sp - 1) & 255;
  c.pc = 0x7094;
}
// On to a pass of the base's loop, answering what waits; false once the ship has left
function toBasePass(S, n0, answer) {
  for (let i = 0; i < DOCK_TRIES; i++) {
    try { S.stopAt(BASE_PASS, 25); return true; } catch (e) { if (!/not reached/.test(e.message)) throw e; }
    if (S.R.loads.slice(n0).some(l => l[0] === 'LOAD SEG0')) return false;
    answer(S);
  }
  return false;
}
if (want('station')) {
  let n = 0;
  const STICK = [1, 2, 4, 8, 5, 9, 6, 10];
  for (const from of ['flight-base-01', 'flight-base-02', 'flight-base-03', 'flight-base-04', 'flight-base-05', 'flight-base-06']) {
    const B = lib.runner({ state: lib.readState(from) });
    B.stopAt(lib.FLIGHT_PASS);
    const n0 = B.R.loads.length;
    dock(B);
    const press = (bits, s) => { B.m.joy = 0x1F & ~bits; B.run(s); B.m.joy = 0x1F; B.run(0.1); };
    const answer = S => (rnd(3) ? press([0x10, 0x01, 0x02][rnd(3)], 0.1) : S.key('SPACE'));
    if (!toBasePass(B, n0, answer)) continue;
    for (let k = 0; k < 5; k++) {
      let ok = true;
      for (let i = 0, steps = 3 + rnd(6); i < steps && ok; i++) {
        const fire = rnd(5) === 0;
        B.m.joy = 0x1F & ~((fire ? 0x10 : 0) | (rnd(6) ? STICK[rnd(STICK.length)] : 0));
        B.run(0.1 + rnd(3) / 10);
        B.m.joy = 0x1F;
        ok = toBasePass(B, n0, answer);
      }
      if (!ok) break;
      const id = 'station-' + String(++n).padStart(2, '0');
      B.save(id, BASE_PASS);
      const r = B.R.ram;
      console.log(id, 'frame', B.R.frame, 'at', r[0x5510] + ',' + r[0x5530], 'credits', r[0x0728] + r[0x0729] * 256);
    }
  }
}
// The title, the intro and the ending, each a program of its own (src/g-screens.js): moments for
// the checks of their routines alone (check.js's moments 'title', 'intro' and 'ending') and for
// their lockstep. Each -00 is the program's first instruction; the rest stand where the port
// yields a checkpoint: the title at key_waiting ($2BE7) after a frame, the intro and the ending at
// print_inline as a piece of text begins, the keys the player would press given between.
const pad = n => String(n).padStart(2, '0');
// on to the address, SPACE pressed whenever it is not reached in a few seconds; false if never
// the key pressed and held until the address is reached, then let go
function pressTo(S, k, a) {
  S.m.press(k);
  try { S.stopAt(a, 200); } finally { S.m.release(k); }
}
function toText(S, a, tries = 20) {
  for (let i = 0; i < tries; i++) {
    try { S.stopAt(a, 150); return true; } catch (e) { if (!/not reached/.test(e.message)) throw e; }
    S.key('SPACE');
  }
  return false;
}
if (want('title')) {
  const T = lib.runner();
  T.save('title-00', 0x2BE7);
  for (let n = 1; n <= 12; n++) {
    T.run(0.5 + rnd(100) / 10);
    T.stopAt(0x2BE7, 6000);
    T.save('title-' + pad(n), 0x2BE7);
    console.log('title-' + pad(n), 'frame', T.R.frame, 'ship', T.R.ram[0x48] + T.R.ram[0x49] * 256);
  }
}
const INTRO_TEXT = 0x7884, ENDING_TEXT = 0x743E;
if (want('intro')) {
  // a new game: the question, N, the name, the story to SR
  const I = lib.runner();
  I.run(3); I.key('SPACE');
  I.stopAt(0x6800);
  I.save('intro-00', INTRO_TEXT);
  let n = 0;
  const save = (S) => { const id = 'intro-' + pad(++n); S.save(id, INTRO_TEXT); console.log(id, 'frame', S.R.frame); };
  I.stopAt(INTRO_TEXT); save(I);
  I.run(1); pressTo(I, 'N', INTRO_TEXT); save(I);
  I.run(0.5); I.type('PILOT'); pressTo(I, 'RETURN', INTRO_TEXT); save(I);
  // SR, once loaded, runs over $7884 too: a stop there is no longer the intro's
  while (!I.loaded('SR') && toText(I, INTRO_TEXT) && !I.loaded('SR')) { save(I); I.run(0.2 + rnd(20) / 10); }
  // an old game: the manual's question, a wrong answer, ACCESS DENIED
  const O = lib.runner({ state: lib.readState('intro-01') });
  O.run(1); pressTo(O, 'O', INTRO_TEXT); save(O);
  O.run(1); O.type('WRONG'); pressTo(O, 'RETURN', INTRO_TEXT); save(O);
}
if (want('ending')) {
  const E = lib.runner({ boot: { file: 'WON', to: 0x6800 } });
  E.save('ending-00', ENDING_TEXT);
  let n = 0;
  while (toText(E, ENDING_TEXT)) {
    const id = 'ending-' + pad(++n);
    E.save(id, ENDING_TEXT);
    console.log(id, 'frame', E.R.frame);
    E.run(0.2 + rnd(20) / 10);
  }
}
console.log(lib.states().join('\n'));
