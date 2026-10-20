'use strict';
// Checking a routine of the port against the game's own, on states made from real moments of play
// (kit/skills/core/70-minisite/play.md, "Test each routine alone first"). The game's routine runs
// in the kit's simulator (cpu.call, with the C16's 16 KB and TED's pages) and the port's in P,
// each on its own copy of the same memory. The game's reads of the chips get random values, and
// the port's the same in turn; then memory ($0000-$3FFF but the stack page), the writes to the
// chips in order, and the registers the routine leaves are compared.
//
// const { check } = require('./lib.js');
// check({ name: 'swap_face', cases: 2000, setup: (M, rnd, st) => ({ c: rnd(2) }), outs: ['c'] });
// setup's rnd(n) is an integer below n (rnd() a fraction); it may change M (both sides get it) and
// returns the registers the routine is entered with. outs names the registers compared (default
// none); ignore lists addresses or [first, last] ranges left out. chip(a, rnd) gives a chip read's
// value (default rnd(256)). A routine of the port's that is a generator is run to its end: its
// { cp } and { cycles } yields pass, and a POLL is an error (a routine that waits is checked in the
// lockstep instead), unless poll is given: { pcs, fn }, where fn(M) runs before the game's code
// reaches each of the addresses pcs (a polling loop's compare) and at each of the port's POLLs, for
// a wait on memory an interrupt would change. stopAt ends the game's run at an address (an interrupt
// handler's way out, which pulls registers it did not push here). A routine the port has not got yet is the game's own,
// run on the port's memory and chips (standIn).
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '../../../..');
const { CPU } = require(path.join(REPO, 'kit/cpu/cpu6502.js'));
const { loadListing } = require(path.join(REPO, 'kit/c16/machine.js'));

const LISTING_FILE = path.join(REPO, 'games/c16/prospector-pete/listing.json');
const LISTING = JSON.parse(fs.readFileSync(LISTING_FILE, 'utf8'));
const ROUTINES = LISTING.records.filter(r => r.t === 'code' && r.l && !/^[bjr]_/.test(r.l)).map(r => [r.l, r.a]);
const addrOf = Object.fromEntries(LISTING.records.filter(r => r.t === 'code' && r.l).map(r => [r.l, r.a]));
const PAGES = [];
for (let p = 0x80; p < 0x100; p++) PAGES.push(p);
const isChip = a => a >= 0xFD00 && a < 0xFF40;

require(path.join(ROOT, 'src/core.js'));
for (const f of fs.readdirSync(path.join(ROOT, 'src')).sort()) if (/^g-.*\.js$/.test(f)) require(path.join(ROOT, 'src', f));
const { makePort, GEN, MISSING } = globalThis.PetePort;

// The game's memory as the loader leaves it at $1800: the listing's bytes and those it lacks
// (MISSING, src/core.js).
function boot() {
  const ram = loadListing(LISTING_FILE);
  for (const [a, b] of Object.entries(MISSING)) ram.set(b, +a);
  return ram;
}

let STATES = null;
function states() {
  if (STATES) return STATES;
  const dir = path.join(ROOT, '../work/states');
  STATES = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => {
    const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    return { name: f, ram: new Uint8Array(Buffer.from(s.ram, 'base64')), ted: s.ted };
  });
  return STATES;
}

// A 6502 on memory M whose chips are io; the game's routine at address as a function of the port.
function cpuOn(M, io) {
  return new CPU(M, { ramSize: 0x4000, ioPages: PAGES, io: {
    read: a => (isChip(a) ? io.read(a) : 0),
    write: (a, v) => { if (isChip(a)) io.write(a, v); else M[a & 0x3FFF] = v; } } });
}
function regsIn(r) {
  const regs = { d: 0, sp: 0xFF };
  for (const k of ['a', 'x', 'y', 'c', 'z', 'n', 'v']) if (r && r[k] !== undefined) regs[k] = r[k];
  return regs;
}
const out = c => ({ a: c.a, x: c.x, y: c.y, c: c.c, z: c.z, n: c.n, v: c.v });
function standIn(P, address, gen) {
  let cpu = null;
  const run = r => {
    if (!cpu) cpu = cpuOn(P.M, { read: a => P.io.read(a), write: (a, v) => P.io.write(a, v) });
    cpu.call(address, regsIn(r), { maxSteps: 5e6 });
    return out(cpu);
  };
  return gen ? function* (r) { return run(r); } : run;
}
function withStandIns(P) {
  for (const [name, a] of ROUTINES) if (typeof P[name] !== 'function') P[name] = standIn(P, a, GEN.has(name));
  return P;
}

function rng(seed) {
  let s = seed >>> 0 || 1;
  const f = n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return n === undefined ? s / 4294967296 : s % n; };
  return f;
}
const hex = (v, n = 4) => '$' + v.toString(16).toUpperCase().padStart(n, '0');
function ignored(ignore) {
  const s = new Set();
  for (const i of ignore || []) if (Array.isArray(i)) for (let a = i[0]; a <= i[1]; a++) s.add(a); else s.add(i);
  return s;
}

function check(o) {
  const name = o.name, address = addrOf[name];
  if (address === undefined) throw new Error('no routine ' + name + ' in the listing');
  const cases = o.cases || 1000, ign = ignored(o.ignore), outs = o.outs || [];
  const all = states(), rnd = rng(o.seed || 0x9E3779B9 ^ address);
  let fails = 0, first = null, skipped = 0;
  for (let n = 0; n < cases; n++) {
    const st = all[rnd(all.length)];
    const M0 = new Uint8Array(65536);
    M0.set(st.ram.subarray(0, 0x4000));
    const regs = o.setup ? o.setup(M0, rnd, st) || {} : {};
    // the game
    const MG = M0.slice(), reads = [], writes = [], cr = rng(rnd(1 << 30) + 1);
    const cpu = cpuOn(MG, { read: a => { const v = o.chip ? o.chip(a, cr) : cr(256); reads.push(a, v); return v; },
      write: (a, v) => writes.push(a, v) });
    let why = null;
    const hooks = {};
    if (o.poll) for (const pc of o.poll.pcs) hooks[pc] = () => { o.poll.fn(MG); };
    if (o.stopAt !== undefined) hooks[o.stopAt] = () => true;
    // a state the game's own routine cannot finish from (a loop the setup made endless) is passed over
    try { cpu.call(address, regsIn(regs), { maxSteps: o.maxSteps || 5e6, hooks }); } catch (e) {
      if (/step limit/.test(e.message)) { skipped++; continue; }
      why = 'the game: ' + e.message;
    }
    // the port
    const MP = M0.slice();
    let ri = 0, wi = 0;
    const io = {
      read(a) {
        if (ri >= reads.length) throw new Error('the port read ' + hex(a) + ', and the game read no more');
        if (reads[ri] !== a) throw new Error('the port read ' + hex(a) + ' where the game read ' + hex(reads[ri]));
        ri += 2; return reads[ri - 1];
      },
      write(a, v) {
        if (wi >= writes.length) throw new Error('the port wrote ' + hex(v, 2) + ' to ' + hex(a) + ', and the game wrote no more');
        if (writes[wi] !== a || writes[wi + 1] !== (v & 0xFF)) throw new Error('the port wrote ' + hex(v & 0xFF, 2) + ' to ' + hex(a) +
          ' where the game wrote ' + hex(writes[wi + 1], 2) + ' to ' + hex(writes[wi]));
        wi += 2;
      },
      sei() {}, cli() {},
    };
    const P = withStandIns(makePort(MP, io));
    let res;
    if (!why) {
      try {
        res = P[name](Object.assign({}, regs));
        if (res && typeof res.next === 'function') {
          let s;
          while (!(s = res.next()).done) if (s.value && s.value.poll) {
            if (!o.poll) throw new Error('the port polled');
            o.poll.fn(MP);
          }
          res = s.value;
        }
        if (ri < reads.length) throw new Error('the game read ' + hex(reads[ri]) + ', and the port read no more');
        if (wi < writes.length) throw new Error('the game wrote ' + hex(writes[wi + 1], 2) + ' to ' + hex(writes[wi]) + ', and the port wrote no more');
      } catch (e) { why = e.message + (o.trace ? '\n' + e.stack : ''); }
    }
    if (!why) {
      const d = [];
      for (let a = 0; a < 0x4000; a++) if (MG[a] !== MP[a] && (a >> 8) !== 1 && !ign.has(a)) d.push(hex(a) + ' game ' + hex(MG[a], 2) + ' port ' + hex(MP[a], 2));
      for (const k of outs) if ((res || {})[k] !== cpu[k]) d.push(k + ' game ' + cpu[k] + ' port ' + (res || {})[k]);
      if (d.length) why = d.slice(0, 12).join(', ') + (d.length > 12 ? ' (' + d.length + ' in all)' : '');
    }
    if (why) {
      fails++;
      if (!first) first = { n, state: st.name, regs, why };
    }
  }
  const ok = fails === 0;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + ': ' + (cases - fails - skipped) + ' of ' + (cases - skipped) +
    (skipped ? ' (' + skipped + ' states the game itself could not finish)' : '') + (first ? '\n     first: case ' + first.n + ', ' +
    first.state + ', ' + JSON.stringify(first.regs) + ': ' + first.why : ''));
  if (!ok) process.exitCode = 1;
  return ok;
}

module.exports = { check, boot, MISSING, LISTING, REPO, states, addrOf, ROUTINES, makePort, withStandIns, standIn, cpuOn, rng, hex };
