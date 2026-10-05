'use strict';
// The Z80 simulator (z80.js) checked against outside references, for whoever changes it.
// Not run in CI: the vectors are fetched at run time into a gitignored folder and never committed.
//
//   node kit/spectrum/check_z80.js vectors <dir> [--fetch] [--limit N] [--groups base,cb,ed,dd,fd,ddcb,fdcb]
//
// The vectors are SingleStepTests/z80 (github.com/SingleStepTests/z80, branch main, folder v1,
// MIT licence). Each .json is 1000 cases; a case holds the initial and final Z80 state (every
// register plus the internal wz, p, q and the ei latch), the RAM it reads and writes, and, for the
// I/O instructions, one port transaction. One step of the simulator is run per case and every
// field, every listed RAM byte and the port transaction are compared. The vectors' `cycles` array
// is a bus trace and is deliberately not compared (and is not the T-state count; z80.js counts the
// real machine T-states itself). The generator resets the internal p and ei latches to 0 before
// each case, so the initial p and ei in the JSON are ignored here too.
//
// The files are: 00.json..ff.json (base, minus CB/DD/ED/FD), cb XX.json, dd XX.json, fd XX.json
// (each minus the four prefixes), ed XX.json (the 80 real ED opcodes), and dd cb __ XX.json /
// fd cb __ XX.json. The exact set is enumerated from the project's tree API (recorded below);
// the fixed list here matches it. With --fetch each file is fetched into <dir> as it is reached
// and kept (the corpus is ~1.2 GB in all, one file of ~0.5-1 MB in memory at a time); without it,
// a missing file is reported and the run fails, so a partial corpus cannot pass as a green run.
// Ask before fetching (AGENTS.md). Never write vectors outside <dir>.
//
// Run it for the measured counts (the summary prints per-group files/cases/failed).

const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { CPU } = require('./z80');

const PROJECT = 'SingleStepTests/z80';
const VECTORS = 'https://raw.githubusercontent.com/' + PROJECT + '/main/v1/';
const LICENCE = 'MIT';

const hx = v => v.toString(16).padStart(2, '0');

// The set of files, exactly as the project's tree API lists them (verified 5 October 2026).
const BASE_OPS = [], ED_OPS = [];
for (let o = 0x00; o <= 0xFF; o++) if (![0xCB, 0xDD, 0xED, 0xFD].includes(o)) BASE_OPS.push(o);
for (let o = 0x40; o <= 0x7F; o++) ED_OPS.push(o);
for (const o of [0xA0, 0xA1, 0xA2, 0xA3, 0xA8, 0xA9, 0xAA, 0xAB, 0xB0, 0xB1, 0xB2, 0xB3, 0xB8, 0xB9, 0xBA, 0xBB]) ED_OPS.push(o);

function files(groups) {
  const out = [];
  const push = (name, group) => { if (groups.has(group)) out.push({ name, group }); };
  for (const o of BASE_OPS) push(hx(o) + '.json', 'base');
  for (let o = 0x00; o <= 0xFF; o++) push('cb ' + hx(o) + '.json', 'cb');
  for (const o of ED_OPS) push('ed ' + hx(o) + '.json', 'ed');
  for (const o of BASE_OPS) push('dd ' + hx(o) + '.json', 'dd');
  for (const o of BASE_OPS) push('fd ' + hx(o) + '.json', 'fd');
  for (let o = 0x00; o <= 0xFF; o++) push('dd cb __ ' + hx(o) + '.json', 'ddcb');
  for (let o = 0x00; o <= 0xFF; o++) push('fd cb __ ' + hx(o) + '.json', 'fdcb');
  return out;
}

// A simulator that notes every address it touches.
class Touching extends CPU {
  rd(a) { this.touched.push(this.resolve(a)); return super.rd(a); }
  wr(a, v) { this.touched.push(this.resolve(a)); super.wr(a, v); }
  fetch() { this.touched.push(this.pc); return super.fetch(); }
}

const REGS = ['pc', 'sp', 'a', 'b', 'c', 'd', 'e', 'f', 'h', 'l', 'i', 'r', 'ix', 'iy', 'af_', 'bc_', 'de_', 'hl_', 'wz', 'im', 'iff1', 'iff2', 'ei', 'p', 'q'];

function checkFile(file, limit) {
  const cases = JSON.parse(fs.readFileSync(file));
  const mem = new Uint8Array(65536);
  const dirtyMark = new Uint8Array(65536);
  const dirty = [];
  let bad = 0;
  const why = {};

  for (let step = 0; step < cases.length; step++) {
    if (limit !== null && step >= limit) break;
    const t = cases[step];

    // Reset the previous case's memory to zero.
    for (const a of dirty) { mem[a] = 0; dirtyMark[a] = 0; }
    dirty.length = 0;

    // Load this case's initial RAM (opcode bytes, read values, and 0 for written addresses).
    for (const [a, v] of t.initial.ram) {
      mem[a] = v;
      if (dirtyMark[a] !== 1) { dirtyMark[a] = 1; dirty.push(a); }
    }
    const listed = new Set();
    for (const [a] of t.initial.ram) listed.add(a);
    for (const [a] of t.final.ram) listed.add(a);

    const ports = [];
    const touched = [];
    const want = t.ports && t.ports[0];
    const io = {
      in: (p) => { ports.push(['r', p]); return want && want[2] === 'r' ? want[1] : 0xFF; },
      out: (p, v) => { ports.push(['w', p, v]); },
    };

    const cpu = new Touching(mem, { io });
    cpu.touched = touched;
    cpu.setRegs(t.initial);
    cpu.ei = 0; cpu.p = 0;                 // the generator clears both before every case

    let threw = null;
    try { cpu.step(); } catch (e) { threw = e; }

    const errs = [];
    if (threw) errs.push('threw:' + threw.message);
    else {
      const f = t.final;
      for (const k of REGS) {
        const got = cpu[k];
        if (got !== f[k]) errs.push(k + ':' + got + '!=' + f[k]);
      }
      for (const [a, v] of f.ram) if (mem[a] !== v) errs.push('ram$' + hx(a));
      for (const a of touched) if (!listed.has(a)) errs.push('touch$' + a.toString(16));
      if (want) {
        if (ports.length !== 1) errs.push('ports:' + ports.length);
        else if (ports[0][0] !== want[2] || ports[0][1] !== want[0] ||
                 (want[2] === 'w' && ports[0][2] !== want[1])) {
          errs.push('port:' + JSON.stringify(ports[0]) + '!=' + JSON.stringify(want));
        }
      } else if (ports.length !== 0) errs.push('ports:' + ports.length);
    }

    if (errs.length) {
      if (bad < 3) console.log('  ' + t.name + ': ' + errs.join(', '));
      for (const e of errs) { const k = e.split(/[:$]/)[0]; why[k] = (why[k] || 0) + 1; }
      bad++;
    }
    for (const a of touched) if (dirtyMark[a] !== 1) { dirtyMark[a] = 1; dirty.push(a); }
  }
  const n = limit === null ? cases.length : Math.min(cases.length, limit);
  console.log(path.basename(file) + ' ' + (bad ? 'FAIL ' + bad + '/' + n + ' ' + JSON.stringify(why) : 'ok ' + n));
  return { bad, n };
}

function fetchOne(name, dir) {
  const file = path.join(dir, name);
  if (fs.existsSync(file)) return;
  const url = VECTORS + name.replace(/ /g, '%20');
  console.log('fetching ' + url + ' (' + PROJECT + ', ' + LICENCE + ' licence)');
  for (let tries = 0; ; tries++) {
    try { execFileSync('curl', ['-sS', '--fail', '--max-time', '300', '-o', file, url]); return; }
    catch (e) { if (tries === 3) throw e; execFileSync('sleep', [String(2 ** (tries + 1))]); }
  }
}

function vectors(dir, fetch, limit, groups) {
  const list = files(groups);
  const byGroup = {};
  let totalBad = 0, totalN = 0, run = 0, missing = 0;
  for (const { name, group } of list) {
    const file = path.join(dir, name);
    if (fetch) fetchOne(name, dir);
    if (!fs.existsSync(file)) { missing++; continue; }
    const { bad, n } = checkFile(file, limit);
    byGroup[group] = byGroup[group] || { bad: 0, n: 0, files: 0 };
    byGroup[group].bad += bad; byGroup[group].n += n; byGroup[group].files++;
    totalBad += bad; totalN += n; run++;
  }
  console.log('\n--- per group ---');
  for (const g of Object.keys(byGroup).sort()) {
    const s = byGroup[g];
    console.log(g + ': ' + s.files + ' files, ' + s.n + ' cases, ' + s.bad + ' failed');
  }
  console.log('\n' + run + ' files, ' + totalN + ' cases, ' + totalBad + ' failed');
  if (missing) console.log(missing + ' file(s) not present' + (fetch ? '' : ' — run with --fetch'));
  return run > 0 && totalBad === 0 && missing === 0;
}

const args = process.argv.slice(2);
const mode = args[0];
if (mode === 'vectors') {
  const dir = args[1] || 'tools/z80-vectors/';
  const fetch = args.includes('--fetch');
  const limit = (() => { const i = args.indexOf('--limit'); return i >= 0 ? parseInt(args[i + 1], 10) : null; })();
  const groupsArg = (() => { const i = args.indexOf('--groups'); return i >= 0 ? args[i + 1] : 'base,cb,ed,dd,fd,ddcb,fdcb'; })();
  const groups = new Set(groupsArg.split(','));
  const ok = vectors(dir, fetch, limit, groups);
  process.exit(ok ? 0 : 1);
} else {
  console.log('usage: node kit/spectrum/check_z80.js vectors <dir> [--fetch] [--limit N] [--groups base,cb,ed,dd,fd,ddcb,fdcb]');
  process.exit(1);
}
