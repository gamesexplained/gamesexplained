'use strict';
// The Game & Watch's lockstep: a game's port run beside the game's own code on the kit's SM5A
// (kit/gnw/sm5a.js), compared at every checkpoint the port yields (kit/skills/core/70-minisite,
// play.md). There is no interrupt on the chip, so a checkpoint is simply an address the game's
// main loop passes: the port yields { at } with the listing's (logical) address, the machine runs
// to that address, and the two must agree there on every data cell and on the cycles since power
// on. The buttons are held the same for both from one checkpoint to the next.
//
//   const { lockstep } = require('kit/gnw/lockstep.js');
//   const r = lockstep({ rom, makePort, checkpoints, inputs, passes, trace });
//     rom          the chip's 1,856 bytes, in the ROM's own order (from listing.json: romFromListing)
//     makePort(io) the port, given io = { keys(rows), alpha(), beta(), buzz(level, T), trace }
//     checkpoints  the logical addresses the port yields at ([0x036, ...])
//     inputs(n, state, ram, cycles) called before stretch n with { rows: [R2, R3, R4], alpha,
//                  beta } to set (the same object feeds the port and the machine), the machine's
//                  cells and its cycles, for a player that looks at the game. It may return
//                  { cell: value } to write into both, to start a test where play seldom goes
//     passes       how many checkpoints to compare (default 1000)
//     stop()       optional: true ends the run (checked after inputs)
//     seen         optional: a Set the machine adds each physical pc it runs to
//     trace        true: on a difference, the first straight run where the port's cycle count
//                  parted from the machine's, from both traces of the stretch
//   r: { ok, passes, at, cycles, diff: [{ cell, port, game }], firstRun, sleeps }
//
//   romFromListing(listing)  the ROM in its own order from a game's listing.json (g.listing().ram)
//
// A run of sleep (CEND) is the port's { sleep: n }; the machine sleeps through it on its own.

const path = require('path');
const SM5A = require(path.join(__dirname, 'sm5a.js'));

function order() {
  const step = pl => ((pl >> 1 ^ pl) & 1 ? 0 : 0x20) | (pl >> 1 & 0x1f);
  const o = []; let pl = 0;
  for (let i = 0; i < 63; i++) { o.push(pl); pl = step(pl); }
  return o;
}
const ORDER = order();
const physical = a => (a & ~0x3f) | ((a & 0x3f) < 63 ? ORDER[a & 0x3f] : 0x3f);
const logical = pc => { const i = ORDER.indexOf(pc & 0x3f); return (pc & ~0x3f) | (i < 0 ? 0x3f : i); };

function romFromListing(ram) {
  const rom = new Uint8Array(0x740);
  for (let a = 0; a < 0x740; a++) rom[physical(a)] = ram[a];
  return rom;
}

function lockstep(o) {
  const state = { rows: [0, 0, 0], alpha: 0, beta: 0 };
  const m = new SM5A(o.rom);
  const sync = () => { m.rows = state.rows.slice(); m.alpha = state.alpha; m.beta = state.beta; };
  let ptrace = [], gtrace = [];
  const io = {
    keys: rows => { let v = 0; for (let i = 0; i < 3; i++) if (rows >> i & 1) v |= state.rows[i]; return v & 15; },
    alpha: () => state.alpha, beta: () => state.beta, buzz: () => {},
    trace: o.trace ? (a, T) => { if (ptrace.length < 4e5) ptrace.push([a, T]); } : null,
  };
  const port = o.makePort(io), it = port.run();
  const want = new Set((o.checkpoints || [0x036]).map(physical));
  const passes = o.passes || 1000;
  let n = 0, sleeps = 0;
  for (;;) {
    const y = it.next().value;
    if (y.sleep) { sleeps++; continue; }
    // the machine runs to the same checkpoint
    const target = physical(y.at);
    let guard = 0;
    while (true) {
      if (!m.halt && want.has(m.pc) && !m.skip && guard > 0) break;
      if (o.trace && !m.halt && gtrace.length < 4e5) gtrace.push([logical(m.pc), m.cycles]);
      if (o.seen && !m.halt) o.seen.add(m.pc);
      m.step(); if (++guard > 2e6) { let firstRun = null; if (o.trace) { const gt = new Map(); for (const [a, c] of gtrace) if (!gt.has(c)) gt.set(c, a); for (const [a, T] of ptrace) if (gt.get(T) !== a) { firstRun = { addr: a, T, game: gt.get(T) }; break; } } return { ok: false, passes: n, why: 'the machine never reached $' + y.at.toString(16), firstRun }; }
    }
    const diff = [];
    for (let c = 0; c < 0x80; c++) if ((c & 15) <= 12 && (c >> 4) <= 4 && port.M[c] !== m.ram[c]) diff.push({ cell: c, port: port.M[c], game: m.ram[c] });
    const at = logical(m.pc);
    if (at !== y.at || diff.length || port.T !== m.cycles) {
      let firstRun = null;
      if (o.trace) {
        const gt = new Map(); for (const [a, c] of gtrace) if (!gt.has(c)) gt.set(c, a);
        for (const [a, T] of ptrace) if (gt.get(T) !== a) { firstRun = { addr: a, T, game: gt.get(T) }; break; }
        if (firstRun) { const h = x => x[0].toString(16) + '@' + x[1]; firstRun.portTail = ptrace.filter(x => x[1] <= firstRun.T && x[1] > firstRun.T - 60).map(h).join(' '); firstRun.gameTail = gtrace.filter(x => x[1] <= firstRun.T + 5 && x[1] > firstRun.T - 60).map(h).join(' '); }
      }
      return { ok: false, passes: n, at: y.at, gameAt: at, portT: port.T, gameT: m.cycles, diff, firstRun, sleeps, portM: Array.from(port.M.slice(0, 0x50)), gameM: Array.from(m.ram.slice(0, 0x50)) };
    }
    ptrace = []; gtrace = [];
    if (++n >= passes || (o.stop && o.stop())) return { ok: true, passes: n, cycles: m.cycles, sleeps };
    if (o.inputs) {
      const pokes = o.inputs(n, state, m.ram, m.cycles);
      if (o.stop && o.stop()) return { ok: true, passes: n, cycles: m.cycles, sleeps };
      if (pokes) for (const c in pokes) { m.ram[+c] = pokes[c] & 15; port.M[+c] = pokes[c] & 15; }
      sync();
    }
  }
}

module.exports = { lockstep, romFromListing, physical, logical };
