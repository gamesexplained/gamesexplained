#!/usr/bin/env node
// Moments of play for the port's lockstep, saved at the start of a pass of the main loop that runs
// them, from scripted play on the runner (port/test/lib.js). They hold the game's memory, so they go
// to work/states/ and are never committed.
//   node games/c64/space-rogue/port/scripts/gen-states.js
const lib = require('../test/lib.js');

let seed = 7;
const rnd = (n) => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return Math.floor(seed / 4294967296 * n); };

// Which sets to make: all of them, or those named on the command line (start, base, fight).
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
console.log(lib.states().join('\n'));
