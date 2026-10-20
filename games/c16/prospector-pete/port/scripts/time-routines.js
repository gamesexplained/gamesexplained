'use strict';
// The game's cycles for routines the stretches' fit cannot tell apart, measured instead: those
// that run only where the program waits (start_level builds the mine between its waits, and
// scripts/fit-cost.js leaves a stretch that waits out), and random_below, which the fit sees too
// seldom to price. The page needs them all the same: find_space draws random numbers from TED's
// timers and the beam's place until it finds room for a goodie, and on the page those move on
// only with the cycles the routines called so far cost (page/runtime.js, now). Each routine is
// called on the kit's simulator from the moments in work/states (test/lib.js), its chips' reads
// random, and its own cycles are its whole call's less those of the routines measured before it
// that it calls, at their means. fit-cost.js takes these as known (--measured).
//   node time-routines.js out.json [cases]
const fs = require('fs');
const { states, addrOf, cpuOn, rng } = require('../test/lib.js');
const [out, cases = '2000'] = process.argv.slice(2);
if (!out) { console.log('usage: node time-routines.js out.json [cases]'); process.exit(2); }
const inMap = rnd => 0x38F8 + rnd(0x3FA6 - 0x38F8);
const at = (M, p) => { M[0x0D] = p & 0xFF; M[0x0E] = p >> 8; };
// Callees first: a routine's own cycles take off those of the ones above it that it calls.
const ROUTINES = [
  { name: 'random_below', setup: (M, rnd) => ({ a: 1 + rnd(255), c: rnd(2) }) },
  { name: 'put_square', setup: (M, rnd) => { at(M, inMap(rnd)); return { a: rnd(256) }; } },
  { name: 'put_wide', setup: (M, rnd) => { at(M, inMap(rnd)); return { a: rnd(256) }; } },
  { name: 'put_tall', setup: (M, rnd) => { at(M, inMap(rnd)); return { a: rnd(256) }; } },
  { name: 'find_space', setup: (M, rnd) => ({ a: rnd(4), c: rnd(2) }) },
  // a mine of earth, as start_level leaves it before placing the goodies (test/t-level.js)
  { name: 'place_goodies', setup: (M, rnd) => {
    for (let row = 3; row < 23; row++) for (let col = 1; col < 89; col++) M[0x37EA + row * 0x5A + col] = 1 + (col & 1 ? 0 : 1) + (row & 1 ? 0 : 2);
    M[0xA7] = rnd(16); M[0xB1] = 1 + rnd(4); M[0xB2] = 1 + rnd(3); M[0xB3] = 1 + rnd(3); M[0xB4] = 1 + rnd(4);
    return { c: rnd(2) };
  } },
];
const all = states(), mean = {}, n = +cases;
for (const R of ROUTINES) {
  const rnd = rng(0x5EED ^ addrOf[R.name]);
  // the routines measured before this one, by address, to count its calls to them
  const callees = Object.keys(mean).map(k => [addrOf[k], k]);
  let sum = 0, done = 0;
  for (let i = 0; i < n; i++) {
    const st = all[rnd(all.length)], M = new Uint8Array(65536);
    M.set(st.ram.subarray(0, 0x4000));
    const regs = R.setup(M, rnd);
    const chip = rng(rnd(1 << 30) + 1);
    const cpu = cpuOn(M, { read: () => chip(256), write: () => {} });
    const calls = {}, hooks = {};
    for (const [a, k] of callees) hooks[a] = () => { calls[k] = (calls[k] || 0) + 1; return false; };
    const c0 = cpu.cycles;
    try { cpu.call(addrOf[R.name], Object.assign({ sp: 0xFF }, regs), { hooks, maxSteps: 5e6 }); } catch (e) { continue; }
    let own = cpu.cycles - c0 + 6;                          // with the JSR that calls it
    for (const k in calls) own -= calls[k] * mean[k];
    sum += own; done++;
  }
  mean[R.name] = Math.round(sum / done * 10) / 10;
  console.log(R.name + ': ' + mean[R.name] + ' cycles of its own, over ' + done + ' calls');
}
fs.writeFileSync(out, JSON.stringify({ call: mean }) + '\n');
console.log('wrote ' + out);
