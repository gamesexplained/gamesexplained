'use strict';
// The Z80 simulator (z80.js) checked against outside references, for whoever changes it.
// Neither runs in CI: one needs the vectors, fetched at run time into a gitignored folder and never
// committed, the other the emulator. The self-test is test_z80.js.
//
//   node kit/spectrum/check_z80.js vectors <dir> [--fetch] [--limit N] [--groups base,cb,ed,dd,fd,ddcb,fdcb]
//       Every instruction from given states, against published results: see below.
//   node kit/spectrum/check_z80.js zesarux [cases] [seed] [--groups base,cb,ed,dd,fd,ddcb,fdcb]
//       The same programs run in ZEsarUX (tools.py --platform spectrum zesarux; KIT_ZESARUX_PORT
//       picks another port) and in the simulator: [cases] random cases (default 16) of every
//       instruction but HALT, with random registers, flags, I, R and memory, the jumps, calls,
//       returns and RSTs taken and not, and LD A,I, LD A,R, RETN and RETI after an EI half the
//       time. The emulator's CPU transaction log gives the registers and the frame's T-state count
//       before every instruction; the simulator steps from each line's registers and is compared
//       with the next, so every register, MEMPTR and every T-state is checked instruction by
//       instruction, and the memory each case may touch at the end. The vectors are the second
//       reference, and where ZEsarUX is already known to differ from them the difference is named
//       and does not fail the run (KNOWN, below); anything else does. Z80_DEBUG=1 prints both
//       states for each difference. It overwrites the screen and $8000-$FFFF and resets the
//       machine at the end, so not during a game you mean to keep.
//
// On 7 October 2026, with the ZEsarUX-13.0 release on Linux x86_64 and node 22.22, the default run
// compared 26,075 executions of 1,601 instructions in 107 programs in about 95 s, and every
// T-state, register and byte of memory agreed apart from the KNOWN differences.
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

// --- ZEsarUX: the same programs run in the emulator and in the simulator --------------------------
//
// Each case is one instruction under test with every register, the flags, I and R, and the 64 bytes
// of memory it may touch, chosen at random. A program of up to PER_PROGRAM cases is loaded at $8000
// and run once in the emulator with its CPU transaction log on, which writes one line per
// instruction: the frame's T-state counter and every register before it runs. The simulator then
// runs the same program from the same memory, one instruction per log line, starting each from the
// emulator's registers, and the state after each one and the T-states it took are compared with
// the next line; memory is compared at the end. Only $8000-$FFFF is ever touched, all of it
// uncontended, and every port the programs use is odd with a high byte outside $40-$7F, so nothing
// the ULA does can lengthen an instruction here.

const net = require('net');

const PROG = 0x8000, DATA = 0xC000, WIN = 64, PER_PROGRAM = 240, PROLOGUE = 29;
const TBL = DATA - PER_PROGRAM * 24;           // each case's 12 register words
const FRAME = 69888;                           // T-states in a 48K frame
const RST = [0x00, 0x08, 0x10, 0x18, 0x20, 0x28, 0x30, 0x38];
const LOGS = path.join(__dirname, '..', '..', 'tools', 'logs', 'z80-zesarux');

// A client for ZRCP, the node twin of kit/spectrum/zesarux.py: one command line out, the reply back
// up to the prompt, `command> ` or `command@cpu-step> ` while the machine is stopped.
function zrcp(port) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(port, '127.0.0.1');
    let buf = '', waiting = null;
    const settle = () => {
      const m = /(^|\n)([^\n]*> )$/.exec(buf);
      if (!m || !waiting) return;
      const w = waiting; waiting = null; clearTimeout(w.timer);
      const text = buf.slice(0, m.index); buf = '';
      w.resolve({ text, prompt: m[2] });
    };
    const reply = (line, ms) => new Promise((res, rej) => {
      waiting = { resolve: res, reject: rej, timer: setTimeout(() => rej(new Error(`no reply to ${line || 'the banner'} in ${ms} ms`)), ms) };
      if (line) sock.write(line + '\n'); else settle();
    });
    sock.setNoDelay(true);
    sock.setEncoding('latin1');
    sock.on('data', d => { buf += d; settle(); });
    sock.on('error', e => (waiting ? waiting.reject(e) : reject(new Error(
      `nothing answering ZRCP on 127.0.0.1:${port} (${e.code || e.message}): start it with ` +
      'python3 kit/scripts/tools.py --platform spectrum zesarux'))));
    sock.on('close', () => waiting && waiting.reject(new Error('the emulator closed the connection')));
    sock.on('connect', () => reply(null, 10000).then(() => resolve({
      cmd: async (line, ms = 30000) => (await reply(line, ms)).text,
      step: async () => {                      // stop on an instruction boundary, and know it stopped
        for (let i = 0; i < 40; i++) {
          const r = await reply('enter-cpu-step', 10000);
          if (r.prompt.includes('cpu-step')) return;
          await new Promise(ok => setTimeout(ok, 100));   // it refuses for a moment after leaving cpu-step
        }
        throw new Error('the emulator would not enter cpu-step');
      },
      close: () => sock.end(),
    }), reject));
  });
}

// Registers as a log line, a run's reply and get-registers print them.
function zState(line) {
  const s = {}, at = line.indexOf('PC=');
  for (const m of line.slice(at).matchAll(/(PC|SP|AF|BC|DE|HL|IX|IY|AF'|BC'|DE'|HL'|I|R|MEMPTR)=([0-9a-fA-F]+)\b/g)) {
    s[{ "AF'": 'af_', "BC'": 'bc_', "DE'": 'de_', "HL'": 'hl_', MEMPTR: 'wz' }[m[1]] || m[1].toLowerCase()] = parseInt(m[2], 16);
  }
  const im = /\bIM(\d)/.exec(line), iff = /\bIFF([1-])([2-])/.exec(line), t = /TSTATES: (\d+)/.exec(line);
  if (im) s.im = +im[1];
  if (iff) { s.iff1 = iff[1] === '1' ? 1 : 0; s.iff2 = iff[2] === '2' ? 1 : 0; }
  s.t = t ? +t[1] : parseInt(line, 10);
  return s;
}

const FIELDS = ['pc', 'sp', 'a', 'f', 'bc', 'de', 'hl', 'ix', 'iy', 'af_', 'bc_', 'de_', 'hl_', 'i', 'r', 'wz', 'im', 'iff1', 'iff2'];
function simState(cpu) {
  return { pc: cpu.pc, sp: cpu.sp, a: cpu.a, f: cpu.f, bc: (cpu.b << 8) | cpu.c, de: (cpu.d << 8) | cpu.e,
           hl: (cpu.h << 8) | cpu.l, ix: cpu.ix, iy: cpu.iy, af_: cpu.af_, bc_: cpu.bc_, de_: cpu.de_, hl_: cpu.hl_,
           i: cpu.i, r: cpu.r, wz: cpu.wz, im: cpu.im, iff1: cpu.iff1, iff2: cpu.iff2 };
}
function emuState(s) { return Object.assign({}, s, { a: s.af >> 8, f: s.af & 0xFF }); }
function setFromEmu(cpu, s) {
  cpu.setRegs({ pc: s.pc, sp: s.sp, a: s.af >> 8, f: s.af & 0xFF, b: s.bc >> 8, c: s.bc & 0xFF, d: s.de >> 8,
                e: s.de & 0xFF, h: s.hl >> 8, l: s.hl & 0xFF, ix: s.ix, iy: s.iy, af_: s.af_, bc_: s.bc_,
                de_: s.de_, hl_: s.hl_, i: s.i, r: s.r, wz: s.wz, im: s.im, iff1: s.iff1, iff2: s.iff2 });
}

// The simulator on the 48K map: the ROM is not written. Every port reads $FF: the programs fill the
// screen with $FF and use only odd ports, which nothing on a 48K answers, so the emulator's read is
// the idle bus, $FF, or a screen byte, also $FF.
class Spectrum extends CPU {
  constructor(mem) { super(mem, { io: { in: () => 0xFF, out: () => {} } }); }
  wr(a, v) { const n = this.resolve(a); if (n < 0x4000) this.tstates += 3; else super.wr(n, v); }
}

// A simulator that notes the data it touches outside the instruction's own bytes, and the ports.
class Probe extends CPU {
  rd(a) { const n = this.resolve(a); if (n < this.lo || n >= this.hi) this.seen.push(n); return super.rd(a); }
  wr(a, v) { this.seen.push(this.resolve(a)); super.wr(a, v); }
}

function rng(seed) {                           // mulberry32, so that a seed repeats a run
  let s = seed >>> 0;
  const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return n => Math.floor(next() * n);
}
const uncontendedHigh = rnd => { const v = rnd(192); return v < 0x40 ? v : v + 0x40; };   // a high byte outside $40-$7F
const safePort = p => (p & 1) === 1 && ((p >> 8) < 0x40 || (p >> 8) >= 0x80);

// Where an instruction can go, by its opcode after any DD/FD prefix: jp, call, jr (JR and DJNZ),
// ret (RET, RETN, RETI), rst, jpr (JP (HL)/(IX)/(IY)). Each case sends every one of them to the
// next case, taken or not.
function flowOf(spec) {
  const op = spec.op;
  if (spec.group === 'ed') return [0x45, 0x4D, 0x55, 0x5D, 0x65, 0x6D, 0x75, 0x7D].includes(op) ? 'ret' : null;
  if (spec.group === 'cb' || indexed(spec)) return null;
  if (op === 0xC3 || (op & 0xC7) === 0xC2) return 'jp';
  if (op === 0xCD || (op & 0xC7) === 0xC4) return 'call';
  if (op === 0x10 || op === 0x18 || (op & 0xE7) === 0x20) return 'jr';
  if (op === 0xC9 || (op & 0xC7) === 0xC0) return 'ret';
  if ((op & 0xC7) === 0xC7) return 'rst';
  if (op === 0xE9) return 'jpr';
  return null;
}
const OPERANDS = { jp: 2, call: 2, jr: 1, ret: 0, rst: 0, jpr: 0 };
// Instructions whose result depends on IFF2 or which change it: half their cases run after an EI.
const eiMatters = s => (s.group === 'ed' && [0x57, 0x5F, 0x45, 0x4D, 0x55, 0x5D, 0x65, 0x6D, 0x75, 0x7D].includes(s.op)) ||
                       (['base', 'dd', 'fd'].includes(s.group) && (s.op === 0xFB || s.op === 0xF3));
const indexed = s => s.group === 'ddcb' || s.group === 'fdcb';
const repeatBC = s => s.group === 'ed' && [0xB0, 0xB1, 0xB8, 0xB9].includes(s.op);    // LDIR CPIR LDDR CPDR
const repeatB = s => s.group === 'ed' && [0xB2, 0xB3, 0xBA, 0xBB].includes(s.op);     // INIR OTIR INDR OTDR

function specs(groups) {
  const out = [], add = (group, prefix, op) => out.push({ group, prefix, op,
    name: group + ' ' + (group === 'ddcb' || group === 'fdcb' ? '__ ' : '') + hx(op) });
  for (const o of BASE_OPS) if (o !== 0x76 && groups.has('base')) add('base', [], o);     // HALT waits for an interrupt
  for (let o = 0; o < 256; o++) if (groups.has('cb')) add('cb', [0xCB], o);
  for (const o of ED_OPS) if (groups.has('ed')) add('ed', [0xED], o);
  for (const g of ['dd', 'fd']) for (const o of BASE_OPS) if (o !== 0x76 && groups.has(g)) add(g, [g === 'dd' ? 0xDD : 0xFD], o);
  for (const g of ['ddcb', 'fdcb']) for (let o = 0; o < 256; o++) if (groups.has(g)) add(g, [g === 'ddcb' ? 0xDD : 0xFD, 0xCB], o);
  for (const s of out) {                       // how many operand bytes follow the opcode
    s.flow = flowOf(s);
    if (indexed(s)) s.operands = 1;                       // the displacement; the opcode follows it
    else if (s.flow) s.operands = OPERANDS[s.flow];
    else {
      const mem = new Uint8Array(65536), cpu = new CPU(mem, { io: { in: () => 0xFF, out: () => {} } });
      mem.set([...s.prefix, s.op], 0x9000);
      cpu.setRegs({ pc: 0x9000, b: 1, c: 1 });
      cpu.step();
      s.operands = cpu.pc === 0x9000 ? 0 : cpu.pc - 0x9000 - s.prefix.length - 1;   // a block instruction going round again
    }
  }
  return out;
}

function bytesOf(spec, operands) {
  return indexed(spec) ? [...spec.prefix, operands[0], spec.op] : [...spec.prefix, spec.op, ...operands];
}

// Run one case in a probe from its own registers: what data it touched, which ports, where it went.
function probe(c) {
  const mem = new Uint8Array(65536);
  mem.set(c.window, c.w);
  mem.set(bytesOf(c.spec, c.operands), c.addr);
  const ports = [], cpu = new Probe(mem, { io: { in: p => { ports.push(p); return 0xFF; }, out: p => { ports.push(p); } } });
  cpu.seen = []; cpu.lo = c.addr; cpu.hi = c.addr + c.len;
  const r = c.regs;
  cpu.setRegs({ pc: c.addr, sp: r.sp, a: r.af >> 8, f: r.af & 0xFF, b: r.bc >> 8, c: r.bc & 0xFF, d: r.de >> 8,
                e: r.de & 0xFF, h: r.hl >> 8, l: r.hl & 0xFF, ix: r.ix, iy: r.iy, af_: r.af_, bc_: r.bc_, de_: r.de_,
                hl_: r.hl_, i: r.i, r: r.r, iff1: c.ei, iff2: c.ei, im: 1 });
  try { for (let n = 0; n === 0 || (cpu.pc === c.addr && n < 64); n++) cpu.step(); }
  catch (e) { return { ok: false, why: e.message }; }
  const inside = cpu.seen.every(a => a >= c.w && a < c.w + WIN);
  const where = c.spec.flow === 'rst' ? cpu.pc === (c.spec.op & 0x38) : cpu.pc >= c.addr + c.len && cpu.pc <= c.next;
  return { ok: inside && where && ports.every(safePort), ports };
}

// Point the named registers (and an nn operand) into the case's window. The prefix's own index
// register is pointed so that index + d lands there.
function point(c, rnd, names) {
  const at = () => c.w + 16 + rnd(32), own = { 0xDD: 'ix', 0xFD: 'iy' }[c.spec.prefix[0]];
  const d = c.operands.length ? (c.operands[0] << 24 >> 24) : 0;
  for (const n of names) {
    if (n === 'nn') { const t = at(); if (c.operands.length === 2) c.operands = [t & 0xFF, t >> 8]; }
    else c.regs[n] = (at() - (n === own ? d : 0)) & 0xFFFF;
  }
}

const TRIES = [[], ['hl'], ['de'], ['bc'], ['sp'], ['ix'], ['iy'], ['nn'], ['hl', 'de'], ['hl', 'sp'], ['ix', 'sp'],
               ['iy', 'sp'], ['hl', 'de', 'bc', 'sp', 'ix', 'iy', 'nn']];

// One case for `spec` at `start`, using window k; null if no draw keeps it inside its window.
function makeCase(spec, k, start, rnd) {
  for (let draw = 0; draw < 20; draw++) {
    const ei = eiMatters(spec) ? rnd(2) : 0;
    const word = () => rnd(65536);
    const base = { spec, k, start, ei, w: DATA + k * WIN, addr: start + PROLOGUE + ei,
      operands: Array.from({ length: spec.operands }, () => rnd(256)),
      window: Uint8Array.from({ length: WIN }, () => rnd(256)),
      regs: { af: word(), bc: word(), de: word(), hl: word(), af_: word(), bc_: word(), de_: word(), hl_: word(),
              ix: word(), iy: word(), sp: word(), i: uncontendedHigh(rnd), r: rnd(256) } };
    base.len = spec.prefix.length + 1 + spec.operands;
    base.pad = spec.flow === 'jr' ? rnd(8) : 0;
    base.next = base.addr + base.len + base.pad;
    let ports = probe(base).ports || [];
    for (const names of TRIES) {
      const c = Object.assign({}, base, { regs: Object.assign({}, base.regs), operands: base.operands.slice(), window: base.window.slice() });
      point(c, rnd, names);
      const r = c.regs;
      if (ports.length) {                    // keep every port odd, its high byte outside $40-$7F
        r.bc = (uncontendedHigh(rnd) << 8) | (r.bc & 0xFF) | 1;
        r.af = (uncontendedHigh(rnd) << 8) | (r.af & 0xFF);
        if (c.operands.length === 1 && !spec.prefix.length) c.operands[0] |= 1;     // IN A,(n), OUT (n),A
      }
      if (spec.group === 'ed' && spec.op === 0x47) r.af = (uncontendedHigh(rnd) << 8) | (r.af & 0xFF);   // LD I,A: the next case starts with it
      if (repeatBC(spec)) r.bc = 1 + rnd(8);
      if (repeatB(spec)) r.bc = ((1 + rnd(8)) << 8) | (r.bc & 0xFF);
      if (spec.flow === 'jp' || spec.flow === 'call') c.operands = [c.next & 0xFF, c.next >> 8];
      if (spec.flow === 'jr') c.operands = [rnd(c.pad + 1)];
      if (spec.flow === 'jpr') r[{ 0xDD: 'ix', 0xFD: 'iy' }[spec.prefix[0]] || 'hl'] = c.next;
      if (spec.flow === 'call' || spec.flow === 'ret' || spec.flow === 'rst') r.sp = c.w + 16 + rnd(32);
      if (spec.flow === 'ret') { c.window[r.sp - c.w] = c.next & 0xFF; c.window[r.sp - c.w + 1] = c.next >> 8; }
      const p = probe(c);
      if (p.ok) return c;
      if (p.ports) ports = p.ports;
    }
  }
  return null;
}

// The program: for each case DI, IM 1, its registers popped from its table, LD SP, the EI if it has
// one, the instruction and any padding; then JR $ at the end.
function program(list, rnd) {
  const img = new Uint8Array(0x10000 - PROG), cases = [], skipped = [];
  const put = (a, bytes) => { for (const b of bytes) img[(a++) - PROG] = b; return a; };
  let pc = PROG;
  while (list.length && cases.length < PER_PROGRAM) {
    const spec = list.shift(), k = cases.length;
    const c = makeCase(spec, k, pc, rnd);
    if (!c) { skipped.push(spec.name); continue; }
    const t = TBL + 24 * k, r = c.regs, sp = r.sp;
    let a = put(pc, [0xF3, 0xED, 0x56, 0x31, t & 0xFF, t >> 8, 0xF1, 0xED, 0x47, 0xF1, 0xED, 0x4F,
                     0xF1, 0xC1, 0xD1, 0xE1, 0xD9, 0x08, 0xDD, 0xE1, 0xFD, 0xE1, 0xC1, 0xD1, 0xE1, 0xF1,
                     0x31, sp & 0xFF, sp >> 8]);
    if (c.ei) a = put(a, [0xFB]);
    if (a !== c.addr) throw new Error('prologue length');
    put(a, bytesOf(spec, c.operands));
    const words = [r.i << 8, r.r << 8, r.af_, r.bc_, r.de_, r.hl_, r.ix, r.iy, r.bc, r.de, r.hl, r.af];
    put(t, words.flatMap(v => [v & 0xFF, v >> 8]));
    put(c.w, c.window);
    cases.push(c);
    pc = c.next;
  }
  const end = pc;
  put(end, [0x18, 0xFE]);
  if (end + 2 > TBL) throw new Error('the program overran its tables');
  const resumes = new Set(cases.filter(c => c.spec.flow === 'rst').map(c => c.addr + c.len));
  return { img, cases, skipped, end, resumes };
}

async function emulatorRun(z, prog, files) {
  fs.writeFileSync(files.img, prog.img);
  await z.cmd(`load-binary ${files.img} 8000H 0`);
  const back = Buffer.from((await z.cmd('read-memory 8000H 32768')).trim(), 'hex');
  if (!back.equals(Buffer.from(prog.img))) throw new Error('load-binary did not take');
  await z.cmd('set-register PC=8000H');
  await z.cmd(`set-breakpoint 1 PC=${prog.end.toString(16)}H`);
  await z.cmd('cpu-transaction-log truncate yes');
  await z.cmd('cpu-transaction-log enabled yes');
  let final = null, why = null;
  try {
    for (let stops = 0; !final && !why && stops <= prog.resumes.size; stops++) {
      const reply = await z.cmd(`run no-stop-on-data ${prog.cases.length * 64 + 1000}`, 120000);
      const hit = /Breakpoint fired: PC=([0-9A-Fa-f]+)H/.exec(reply);
      const pc = hit ? parseInt(hit[1], 16) : null;
      if (pc === prog.end) final = zState(reply.split('\n').find(l => l.startsWith('PC=')));
      else if (RST.includes(pc)) {         // an RST case: back to the instruction after it
        const sp = zState(await z.cmd('get-registers')).sp;
        const ret = Buffer.from((await z.cmd(`read-memory ${sp.toString(16)}H 2`)).trim(), 'hex').readUInt16LE(0);
        if (prog.resumes.has(ret)) await z.cmd(`set-register PC=${ret.toString(16)}H`);
        else why = `an interrupt was taken at $${pc.toString(16)}, returning to $${ret.toString(16)} (sp $${sp.toString(16)})`;
      } else why = 'the run stopped without reaching the end: ' + reply.split('\n')[0];
    }
  } finally { await z.cmd('cpu-transaction-log enabled no'); }
  if (!final && !why) why = 'too many stops';
  if (why) return { why };
  const mem = Buffer.from((await z.cmd('read-memory 8000H 32768')).trim(), 'hex');
  const lines = fs.readFileSync(files.log, 'latin1').split('\n').filter(l => /^\d+ [0-9A-F]{4} /.test(l)).map(zState);
  return { lines, final, mem };
}

// Step the simulator once per log line from that line's registers, and compare.
function replay(prog, rom, run) {
  const mem = new Uint8Array(65536);
  mem.set(rom, 0); mem.fill(0xFF, 0x4000, 0x5B00); mem.set(prog.img, PROG);
  const cpu = new Spectrum(mem), states = run.lines.concat([run.final]), diffs = [];
  const starts = prog.cases.map(c => c.start);
  const caseAt = a => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= a) lo = m; else hi = m - 1; } return prog.cases[lo]; };
  if (states[0].pc !== PROG) diffs.push({ c: prog.cases[0], test: false, opc: states[0].pc, what: ['the log does not start at $8000'] });
  let tested = 0;
  for (let i = 0; i < run.lines.length;) {
    const from = states[i];
    setFromEmu(cpu, from);
    const opc = cpu.pc, c = caseAt(opc), test = opc === c.addr;
    let dt;
    try { dt = cpu.step(); } catch (e) { diffs.push({ c, test, opc, what: ['simulator: ' + e.message] }); i++; continue; }
    if (test && c.spec.flow === 'rst') cpu.pc = mem[cpu.sp] | (mem[(cpu.sp + 1) & 0xFFFF] << 8);
    let j = i + 1;                             // a prefix the emulator ran as an instruction of its own
    while (j < run.lines.length && states[j].pc !== cpu.pc && states[j].pc > opc && states[j].pc < opc + 4) j++;
    const to = emuState(states[j]), got = simState(cpu), what = [];
    for (const k of FIELDS) if (got[k] !== to[k]) what.push(k === 'f' ? `flags ${fbits(got.f ^ to.f)}` : k);
    const et = ((to.t - from.t) % FRAME + FRAME) % FRAME;
    if (dt !== et) what.push(`T ${dt}/${et}`);
    if (test) tested++;
    if (what.length) diffs.push({ c, test, repeat: test && cpu.pc === opc, what, f: got.f ^ to.f, opc, sim: got, emu: to });
    i = j;
  }
  for (let a = PROG; a < 0x10000; a++) {
    if (mem[a] === run.mem[a - PROG]) continue;
    const c = prog.cases.find(x => a >= x.w && a < x.w + WIN);
    diffs.push({ c: c || prog.cases[0], test: !!c, what: ['memory'], f: 0, opc: a });
  }
  return { diffs, tested };
}
const fbits = x => ['S', 'Z', '5', 'H', '3', 'P/V', 'N', 'C'].filter((_, b) => x & (0x80 >> b)).join(' ');

async function zesarux(n, seed, groups) {
  const z = await zrcp(+(process.env.KIT_ZESARUX_PORT || 10000));
  const rnd = rng(seed);
  fs.mkdirSync(LOGS, { recursive: true });
  const files = { img: path.join(LOGS, 'program.bin'), screen: path.join(LOGS, 'screen.bin'), log: path.join(LOGS, 'trace.log') };
  await z.step();
  const machine = (await z.cmd('get-current-machine')).trim(), version = (await z.cmd('get-version')).trim();
  if (!/48k/i.test(machine)) throw new Error(`the emulator is a ${machine}; this check needs a 48K Spectrum`);
  console.log(`ZEsarUX ${version}, ${machine}; ${n} cases an instruction, seed ${seed}`);
  const rom = Buffer.from((await z.cmd('read-memory 0 16384')).trim(), 'hex');
  fs.writeFileSync(files.screen, Buffer.alloc(6912, 0xFF));
  await z.cmd(`load-binary ${files.screen} 4000H 0`);
  await z.cmd('enable-breakpoints');
  for (const [k, v] of RST.entries()) await z.cmd(`set-breakpoint ${k + 2} PC=${v.toString(16)}H`);
  for (const [k, v] of [['logfile', files.log], ['tstates', 'yes'], ['registers', 'yes'], ['address', 'yes'], ['opcode', 'yes']]) {
    await z.cmd(`cpu-transaction-log ${k} ${v}`);
  }
  const list = [];
  for (const s of specs(groups)) for (let i = 0; i < n; i++) list.push(s);
  for (let i = list.length - 1; i > 0; i--) { const j = rnd(i + 1); [list[i], list[j]] = [list[j], list[i]]; }

  const byName = new Map(), skipped = new Map(), other = [];
  let programs = 0, tested = 0;
  try {
    while (list.length) {
      const prog = program(list, rnd);
      for (const s of prog.skipped) skipped.set(s, (skipped.get(s) || 0) + 1);
      if (!prog.cases.length) continue;
      let run;
      for (let tries = 0; tries < 3; tries++) {
        run = await emulatorRun(z, prog, files);
        if (!run.why) break;
        console.log(`program ${programs}: ${run.why}; running it again`);
      }
      if (run.why) throw new Error(`program ${programs}: ${run.why}`);
      const r = replay(prog, rom, run);
      tested += r.tested;
      const kinds = new Map(prog.cases.map(c => [c, new Set()]));
      for (const d of r.diffs) {
        if (!d.test) { other.push(`${d.c.spec.name} case, $${d.opc.toString(16)}: ${d.what.join(', ')}`); continue; }
        if (process.env.Z80_DEBUG && d.sim) console.log(`  ${d.c.spec.name} ${d.what}\n    simulator ${JSON.stringify(d.sim)}\n    emulator  ${JSON.stringify(d.emu)}`);
        kinds.get(d.c).add(JSON.stringify([d.what.map(w => w.replace(/^T .*/, 'T')), d.repeat, explain(d)]));
      }
      for (const [c, ks] of kinds) {
        const e = byName.get(c.spec.name) || { cases: 0, kinds: new Map() };
        e.cases++;
        for (const k of ks) e.kinds.set(k, (e.kinds.get(k) || 0) + 1);
        byName.set(c.spec.name, e);
      }
      programs++;
      if (programs % 20 === 0) console.log(`${programs} programs, ${tested} instructions compared`);
    }
  } finally {
    for (let k = 1; k <= RST.length + 1; k++) await z.cmd(`set-breakpoint ${k}`);
    await z.cmd('hard-reset-cpu');
    await z.cmd('exit-cpu-step');
    z.close();
  }
  const unexplained = [], explained = new Map();
  for (const [name, e] of [...byName].sort()) {
    for (const [k, n] of e.kinds) {
      const [what, repeat, rule] = JSON.parse(k);
      const line = `${name}: ${what.join(', ')}${repeat ? ' (going round again)' : ''} in ${n} of ${e.cases} cases`;
      if (rule === null) unexplained.push(line);
      else explained.set(rule, (explained.get(rule) || []).concat([name]));
    }
  }
  console.log(`\n${programs} programs, ${byName.size} instructions, ${tested} executions compared.`);
  if (explained.size) console.log('\nDifferences already explained:');
  for (const [rule, names] of explained) {
    const ns = [...new Set(names)];
    console.log(`  ${KNOWN[rule].what}: ${ns.length} instruction${ns.length === 1 ? '' : 's'} (${ns.slice(0, 6).join(', ')}${ns.length > 6 ? ', ...' : ''})\n    ${KNOWN[rule].how}`);
  }
  for (const l of other.slice(0, 20)) unexplained.push('outside the instruction under test: ' + l);
  for (const [name, v] of skipped) unexplained.push(`${name}: ${v} case(s) could not be placed`);
  if (unexplained.length) console.log('\nDIFFERENT, and not explained:\n  ' + unexplained.join('\n  '));
  else console.log('\nThe emulator and the simulator agree on every register, flag, T-state and byte of memory, apart from the differences above.');
  return unexplained.length === 0;
}

// Where ZEsarUX 13.0 is already known to differ, and how that is known. A difference is explained
// when it is on one of the rule's instructions and only in the fields the rule names (flag bits in
// f, MEMPTR when wz is true); a rule with repeat applies only to an iteration that goes round again.
const KNOWN = [
  { what: 'SCF and CCF: flag bits 5 and 3', f: 0x28,
    is: s => ['base', 'dd', 'fd'].includes(s.group) && (s.op === 0x37 || s.op === 0x3F),
    how: 'z80full fails SCF, CCF, SCF (ST) and CCF (ST) on ZEsarUX 13.0, and z80ccf says it is not a Zilog part (kit/spectrum/INSTALL.md)' },
  { what: 'BIT n,r: flag bits 5 and 3', f: 0x28,
    is: s => s.group === 'cb' && s.op >= 0x40 && s.op < 0x80 && (s.op & 7) !== 6,
    how: 'z80full fails BIT N,A and BIT N,[R,(HL)] on ZEsarUX 13.0; every BIT N,(HL) passes, and so does every one here' },
  { what: 'LDI, LDD, LDIR, LDDR: flag bits 5 and 3', f: 0x28,
    is: s => s.group === 'ed' && [0xA0, 0xA8, 0xB0, 0xB8].includes(s.op),
    how: 'z80full fails LDI, LDD, LDIR and LDDR on ZEsarUX 13.0' },
  { what: 'a block instruction going round again: flag bits 5, H, 3 and P/V, and MEMPTR', f: 0x3C, wz: true, repeat: true,
    is: s => s.group === 'ed' && s.op >= 0xB0,
    how: "the vectors set them; z80full fails LDIR->NOP', LDDR->NOP', INIR->NOP' and INDR->NOP' on ZEsarUX 13.0, and z80memptr the last two" },
  { what: 'MEMPTR after RET, RET cc, RETN, RETI, RST, JP PE/P/M,nn and INC, DEC and LD n into (IX+d) or (IY+d)', wz: true,
    is: s => (['base', 'dd', 'fd'].includes(s.group) && (s.op === 0xC9 || [0xC0, 0xC7].includes(s.op & 0xC7) ||
              [0xEA, 0xF2, 0xFA].includes(s.op) || (s.group !== 'base' && [0x34, 0x35, 0x36].includes(s.op)))) ||
             (s.group === 'ed' && [0x45, 0x4D, 0x55, 0x5D, 0x65, 0x6D, 0x75, 0x7D].includes(s.op)),
    how: "not settled by a third reference: the vectors set MEMPTR there and ZEsarUX leaves it; after a RET its own BIT n,(HL) reads the old value" },
];
function explain(d) {
  const fields = d.what.map(w => w.split(' ')[0]);
  const rule = KNOWN.findIndex(k => k.is(d.c.spec) && (!k.repeat || d.repeat) &&
    fields.every(f => (f === 'flags' && (d.f & ~(k.f || 0)) === 0) || (f === 'wz' && k.wz)));
  return rule < 0 ? null : rule;
}

module.exports = { zrcp, zState, KNOWN };

const args = process.argv.slice(2);
const mode = args[0];
if (require.main !== module) {
  // required for the ZRCP client (kit/spectrum/check_machine.js)
} else if (mode === 'vectors') {
  const dir = args[1] || 'tools/z80-vectors/';
  const fetch = args.includes('--fetch');
  const limit = (() => { const i = args.indexOf('--limit'); return i >= 0 ? parseInt(args[i + 1], 10) : null; })();
  const groupsArg = (() => { const i = args.indexOf('--groups'); return i >= 0 ? args[i + 1] : 'base,cb,ed,dd,fd,ddcb,fdcb'; })();
  const groups = new Set(groupsArg.split(','));
  const ok = vectors(dir, fetch, limit, groups);
  process.exit(ok ? 0 : 1);
} else if (mode === 'zesarux') {
  const num = args.slice(1).filter(a => /^\d+$/.test(a));
  const groupsArg = (() => { const i = args.indexOf('--groups'); return i >= 0 ? args[i + 1] : 'base,cb,ed,dd,fd,ddcb,fdcb'; })();
  zesarux(+(num[0] || 16), +(num[1] || 20261007), new Set(groupsArg.split(',')))
    .then(ok => process.exit(ok ? 0 : 1), e => { console.error(e.message); process.exit(2); });
} else {
  console.log('usage: node kit/spectrum/check_z80.js vectors <dir> [--fetch] [--limit N] [--groups base,cb,ed,dd,fd,ddcb,fdcb]');
  console.log('       node kit/spectrum/check_z80.js zesarux [cases] [seed] [--groups base,cb,ed,dd,fd,ddcb,fdcb]');
  process.exit(1);
}
