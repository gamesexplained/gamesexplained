'use strict';
// The 48K machine (machine.js) checked against ZEsarUX, for whoever changes it. Not in CI: it needs
// the emulator (python3 kit/scripts/tools.py --platform spectrum zesarux; KIT_ZESARUX_PORT picks
// another port). The self-test is test_machine.js.
//
//   node kit/spectrum/check_machine.js [name ...]
//
// Each program below is written into a 48K .sna over the emulator's own RAM, loaded, and run with
// the CPU transaction log on. The log gives the registers and the frame's T-state before every
// instruction, interrupt and halted cycle; the machine starts from the same .sna, with the ROM read
// from the emulator, at the T-state of the log's first line, and runs one step per line. Every
// register, MEMPTR, IFF1, IFF2 and the frame's T-state are compared at every line, and the RAM at
// the end. The first difference stops that program and is printed with the lines before it.
// It overwrites the emulator's memory and resets the machine at the end, so not during a game you
// mean to keep.
//
// The programs:
//   window      IM 2, a loop of EI, then one instruction, then DI, whose period drifts against the
//               frame, so that the instruction after EI ends at every T-state round the frame's
//               start: when the interrupt is taken and when not, and IM 2's vector, read at
//               I x 256 + $FF (the table answers anything else with a different handler)
//   rom         IM 1, EI and HALT in a loop, the ROM's handler scanning the keyboard with keys held;
//               its system variables are in contended memory. Every program but window writes to
//               the ULA's port first: a .sna holds the border, not the last value written, whose bit 4
//               a read of the port returns as its bit 6
//   contended   the same with the loop and the stack in contended memory, so the halted cycles and
//               the interrupt's push wait
//   mix         a loop in contended memory with its data there too: reads, writes, the indexed
//               forms, the stack, the block instructions, DJNZ and JR, I set to $40, and IN and
//               OUT on the ULA's port and others with the high byte in and out of $40-$7F
//   sweep       straight-line code outside contended memory, one probe on each line of four frames'
//               pictures: a read or a write of $4000, or an OUT to $40FE, $40FF or $80FE, each kind
//               starting its access at every T-state from 0 to 135 of a line. A contended access
//               re-aligns the code after it, so that a loop keeps landing on the same few T-states;
//               the padding before each probe is timed on the machine itself, and is only
//               uncontended code, whose timing the Z80 check (check_z80.js) already holds
//
// On 9 October 2026, with the ZEsarUX-13.0 release on Linux x86_64 and node 22.22, every line of the
// five programs agreed, about 750,000 in all, apart from the differences named in explain() below,
// in about 6 s.

const fs = require('fs'), path = require('path');
const { zrcp, zState, KNOWN } = require('./check_z80.js');
const { Machine, loadSna, FRAME } = require('./machine.js');

const LOGS = path.join(__dirname, '..', '..', 'tools', 'logs', 'machine-zesarux');

// A two-pass assembler for the programs: numbers are bytes, 'name:' a label, ['jr', name] a relative
// offset, ['w', name or number] a little-endian word.
function asm(org, items) {
  const labels = {};
  const pass = () => {
    const out = [];
    for (const it of items) {
      if (typeof it === 'string') labels[it.slice(0, -1)] = org + out.length;
      else if (typeof it === 'number') out.push(it & 0xFF);
      else if (it[0] === 'jr') { const to = labels[it[1]]; out.push(to === undefined ? 0 : (to - (org + out.length + 1)) & 0xFF); }
      else { const v = typeof it[1] === 'number' ? it[1] : (labels[it[1]] || 0); out.push(v & 0xFF, v >> 8); }
    }
    return out;
  };
  pass();
  return { org, bytes: pass(), labels };
}

// The keys held during a program, as set-ui-io-ports takes them: eight half-rows, 0 for a key held,
// then the joystick byte.
const NO_KEYS = 'ffffffffffffffff00';

const PROGRAMS = {
  window: {
    lines: 420000,
    regs: { sp: 0xC000, i: 0xFE, im: 2 },
    parts: () => {
      const p = [asm(0x8000, [
        0xF3,                                  // DI
        'a:', 0xFB, 0x00, 0xF3,                // EI; NOP; DI
        0x3A, ['w', 0x9000],                   // LD A,($9000): 37 T-states round
        0x18, ['jr', 'a'],
      ]), asm(0x8100, [
        'b:', 0xFB, 0x3A, ['w', 0x9000], 0xF3, // EI; LD A,($9000); DI
        0x00, 0x00, 0x18, ['jr', 'b'],         // 41 round
      ])];
      // the table: $FD at $FEFF and $FF00, so the vector there gives $FDFD; $FC everywhere else
      const table = { org: 0xFE00, bytes: Array(0x101).fill(0xFC) };
      table.bytes[0xFF] = 0xFD; table.bytes[0x100] = 0xFD;
      // $FDFD: count the interrupts; at the sixth, switch to the second loop. $FCFC: a vector read
      // anywhere else, which stops at a HALT with interrupts off.
      const handler = asm(0xFDFD, [0xF5, 0x3A, ['w', 0x9001], 0x3C, 0x32, ['w', 0x9001], 0xFE, 6, 0x20, ['jr', 'back'],
        0xF1, 0x33, 0x33, 0xC3, ['w', 0x8100], 'back:', 0xF1, 0xC9]);
      return p.concat([table, handler, { org: 0xFCFC, bytes: [0xF3, 0x76] }, { org: 0x9000, bytes: [0, 0] }]);
    },
    pc: 0x8000,
  },
  rom: {
    lines: 90000,
    keys: 'fffefeffffffffee00',               // A, Q, SPACE and B held
    regs: { sp: 0xFF40, iy: 0x5C3A, im: 1 },
    parts: () => [asm(0x8000, [0xF3, 0x3E, 0x07, 0xD3, 0xFE, 0xED, 0x56, 'a:', 0xFB, 0x76, 0x18, ['jr', 'a']])],
    pc: 0x8000,
  },
  contended: {
    lines: 90000,
    regs: { sp: 0x7F00, iy: 0x5C3A, im: 1 },
    parts: () => [asm(0x6000, [0xF3, 0x3E, 0x17, 0xD3, 0xFE, 0xED, 0x56, 'a:', 0xFB, 0x76, 0x18, ['jr', 'a']])],
    pc: 0x6000,
  },
  mix: {
    lines: 90000,
    keys: 'fffefeffffffffee00',
    regs: { sp: 0x7F00, im: 1 },
    parts: () => [asm(0x6000, [
      0xF3, 0x3E, 0x07, 0xD3, 0xFE,            // DI; the border and EAR set, which a .sna does not hold
      0x21, ['w', 0x7000], 0xDD, 0x21, ['w', 0x7000], 0xFD, 0x21, ['w', 0x7080], 0x11, ['w', 0x7100],
      'loop:',
      0x00, 0x7E, 0x34, 0x36, 0x55,            // NOP; LD A,(HL); INC (HL); LD (HL),$55
      0xDD, 0x7E, 5, 0xDD, 0x34, 5, 0xDD, 0x36, 6, 0xAA,          // LD A,(IX+5); INC (IX+5); LD (IX+6),$AA
      0xDD, 0xCB, 7, 0x46, 0xDD, 0xCB, 7, 0x06, 0xFD, 0x35, 3,     // BIT 0,(IX+7); RLC (IX+7); DEC (IY+3)
      0xCB, 0x46, 0xCB, 0x16, 0xED, 0x6F,      // BIT 0,(HL); RL (HL); RLD
      0xE5, 0xE3, 0xE1, 0xC5, 0xC1,            // PUSH HL; EX (SP),HL; POP HL; PUSH BC; POP BC
      0xCD, ['w', 'sub'],                      // CALL sub
      0x09, 0x21, ['w', 0x7000],               // ADD HL,BC; LD HL,$7000
      0x03, 0x0B, 0x01, ['w', 3], 0xED, 0xB0,  // INC BC; DEC BC; LD BC,3; LDIR
      0x21, ['w', 0x7000], 0x11, ['w', 0x7100], 0x01, ['w', 3], 0xED, 0xB1,   // CPIR
      0x21, ['w', 0x7000], 0x06, 3, 'dj:', 0x10, ['jr', 'dj'], 0x18, 0x00,    // DJNZ; JR
      0x3E, 0x7F, 0xDB, 0xFE, 0x3E, 0xFE, 0xDB, 0xFE, 0x3E, 0x00, 0xDB, 0xFE, // IN A,($FE) from $7F, $FE, $00
      0x01, ['w', 0x40FE], 0xED, 0x78, 0x01, ['w', 0xFDFE], 0xED, 0x50,      // IN A,(C) $40FE; IN D,(C) $FDFE
      0x01, ['w', 0x40FF], 0xED, 0x79, 0x01, ['w', 0x80FF], 0xED, 0x79,      // OUT (C),A to $40FF and $80FF
      0x3E, 0x07, 0xD3, 0xFE, 0x3E, 0x57, 0xD3, 0xFE, 0x3E, 0xFE, 0xDB, 0xFE, // OUT ($FE) from $07 and $57
      0xED, 0x57, 0x3E, 0x40, 0xED, 0x47, 0x03, 0x0B, 0x00, 0x3E, 0x3F, 0xED, 0x47,  // I = $40: INC BC; DEC BC; NOP
      0x01, ['w', 0x7FFE], 0xED, 0xA2,         // INI from $7FFE
      0x01, ['w', 0x41FE], 0xED, 0xA3,         // OUTI to $40FE
      0x21, ['w', 0x7000], 0xC3, ['w', 'loop'],
      'sub:', 0xC9,
    ])],
    pc: 0x6000,
  },
  sweep: {
    lines: 60000,
    regs: { sp: 0xC000, im: 1, hl: 0x4000 },
    parts: () => [sweep()],
    pc: 0x8000,
  },
};

// The sweep's code: padding (LD B,n and DJNZ, then NOP, INC DE and LD C,n) up to each probe, run on
// the machine as it is written, so that the probe's access starts at the T-state wanted. It assumes
// the load lands at T-state 6, as ZEsarUX 13.0's does; anywhere else, the probes still land on
// a spread of T-states, only not those.
function sweep() {
  const ram = new Uint8Array(65536), org = 0x8000;
  let pc = org;
  const m = new Machine({ ram, regs: { pc: org, sp: 0xC000, h: 0x40, l: 0 }, tstate: 6 });
  const emit = bytes => { bytes.forEach(b => { ram[pc++] = b; }); while (m.cpu.pc < pc) m.step(); };
  // each probe: its bytes, and the T-states from its start to the access
  const PROBES = [
    { bytes: [0x7E], at: 4 },                          // LD A,(HL)
    { bytes: [0x77], at: 4 },                          // LD (HL),A
    { bytes: [0x3E, 0x40, 0xD3, 0xFE], at: 14 },       // LD A,$40; OUT ($FE),A: $40FE
    { bytes: [0x3E, 0x40, 0xD3, 0xFF], at: 14 },       // $40FF
    { bytes: [0x3E, 0x80, 0xD3, 0xFE], at: 14 },       // $80FE
  ];
  emit([0xF3]);
  for (let p = 0; p < 4 * 192; p++) {
    const kind = PROBES[p % PROBES.length], x = Math.floor(p / PROBES.length) % 136;
    const want = Math.floor(p / 192) * FRAME + 14335 + (p % 192) * 224 + x - kind.at;
    let gap = want - m.cpu.tstates;
    if (gap < 28) throw new Error(`sweep: probe ${p} is ${gap} T-states away`);
    const n = Math.min(255, Math.floor((gap - 15) / 13));
    if (n >= 1) { emit([0x06, n, 0x10, 0xFE]); gap -= 13 * n + 2; }   // LD B,n; DJNZ $: 13n + 2
    while (gap > 25) { emit([0x00]); gap -= 4; }
    const c = [0, 1, 0, 1][gap & 3], b = [0, 1, 1, 0][gap & 3];
    for (let i = 0; i < c; i++) emit([0x0E, 0x00]);                    // LD C,0: 7
    for (let i = 0; i < b; i++) emit([0x13]);                          // INC DE: 6
    gap -= 7 * c + 6 * b;
    for (; gap > 0; gap -= 4) emit([0x00]);
    if (m.cpu.tstates !== want) throw new Error(`sweep: probe ${p} starts at ${m.cpu.tstates}, not ${want}`);
    emit(kind.bytes);
  }
  ram[pc++] = 0x18; ram[pc++] = 0xFE;                                  // JR $, not run here
  return { org, bytes: Array.from(ram.subarray(org, pc)) };
}

// A 48K .sna of the RAM given, with the registers given and the program counter pushed.
function sna(ram, regs, pc) {
  const r = Object.assign({ af: 0, bc: 0, de: 0, hl: 0, ix: 0, iy: 0, af_: 0, bc_: 0, de_: 0, hl_: 0, i: 0x3F, r: 0, iff: 0, im: 1, border: 7 }, regs);
  const sp = (r.sp - 2) & 0xFFFF;
  const mem = Buffer.from(ram);
  mem[sp] = pc & 0xFF; mem[(sp + 1) & 0xFFFF] = pc >> 8;
  const h = Buffer.alloc(27);
  h[0] = r.i;
  [[1, r.hl_], [3, r.de_], [5, r.bc_], [7, r.af_], [9, r.hl], [11, r.de], [13, r.bc], [15, r.iy], [17, r.ix], [21, r.af], [23, sp]]
    .forEach(([o, v]) => h.writeUInt16LE(v & 0xFFFF, o));
  h[19] = r.iff ? 4 : 0; h[20] = r.r; h[25] = r.im; h[26] = r.border;
  return Buffer.concat([h, mem.subarray(0x4000)]);
}

const FIELDS = ['pc', 'sp', 'af', 'bc', 'de', 'hl', 'ix', 'iy', 'af_', 'bc_', 'de_', 'hl_', 'i', 'r', 'wz', 'im', 'iff1', 'iff2'];
function machineState(m) {
  const c = m.cpu;
  return { pc: c.pc, sp: c.sp, af: (c.a << 8) | c.f, bc: (c.b << 8) | c.c, de: (c.d << 8) | c.e, hl: (c.h << 8) | c.l,
    ix: c.ix, iy: c.iy, af_: c.af_, bc_: c.bc_, de_: c.de_, hl_: c.hl_, i: c.i, r: c.r, wz: c.wz, im: c.im, iff1: c.iff1,
    iff2: c.iff2, t: m.tstate };
}
const show = s => `T ${String(s.t).padStart(5)} PC ${s.pc.toString(16).padStart(4, '0')} ` +
  FIELDS.slice(1).map(k => `${k} ${s[k].toString(16)}`).join(' ');

function keysOf(hex) {
  const keys = [];
  for (let row = 0; row < 8; row++) {
    const v = parseInt(hex.slice(row * 2, row * 2 + 2), 16);
    for (let bit = 0; bit < 5; bit++) if (!(v & (1 << bit))) keys.push(row * 8 + bit);
  }
  return keys;
}

async function runOne(z, name, base, rom) {
  const prog = PROGRAMS[name];
  const ram = Buffer.from(base);
  for (const part of prog.parts()) Buffer.from(part.bytes).copy(ram, part.org);
  const files = { sna: path.join(LOGS, name + '.sna'), log: path.join(LOGS, name + '.log') };
  fs.writeFileSync(files.sna, sna(ram, prog.regs, prog.pc));
  const keys = prog.keys || NO_KEYS;
  await z.step();
  await z.cmd(`snapshot-load ${files.sna}`);
  await z.step();
  await z.cmd(`set-ui-io-ports ${keys.toUpperCase()}`);
  const held = (await z.cmd('get-ui-io-ports')).trim().toLowerCase();
  if (held !== keys) throw new Error(`${name}: the emulator holds ${held}, not ${keys}`);
  await z.cmd(`cpu-transaction-log logfile ${files.log}`);
  await z.cmd('cpu-transaction-log truncate yes');
  await z.cmd('cpu-transaction-log enabled yes');
  try { await z.cmd(`run no-stop-on-data ${prog.lines}`, 300000); } finally { await z.cmd('cpu-transaction-log enabled no'); }
  const end = Buffer.from((await z.cmd('read-memory 4000H 49152')).trim(), 'hex');
  await z.cmd(`set-ui-io-ports ${NO_KEYS.toUpperCase()}`);

  const lines = fs.readFileSync(files.log, 'latin1').split('\n').filter(l => /^\d+ [0-9A-F]{4} /.test(l)).map(zState);
  const { ram: mram, regs } = loadSna(files.sna);
  const m = new Machine({ ram: mram, regs, rom, tstate: lines[0].t });
  for (const k of keysOf(keys)) m.press(k);
  m.cpu.wz = lines[0].wz;                      // MEMPTR is not in a .sna: the emulator's own, as it was
  const states = lines;
  const diff = (got, want) => FIELDS.concat(['t']).filter(k => got[k] !== want[k]);
  let d = diff(machineState(m), states[0]);
  if (d.length) return { ok: false, text: `${name}: the machine does not start as the log does (${d.join(', ')})\n  log     ${show(states[0])}\n  machine ${show(machineState(m))}` };
  let interrupts = 0, halted = 0, took = false;
  const explained = new Map();
  const take = m.interrupt.bind(m);
  m.interrupt = () => { interrupts++; took = true; take(); };
  for (let i = 1; i < states.length; i++) {
    const pc = m.cpu.pc, spec = m.cpu.halted ? null : specAt(m.ram, pc);
    if (m.cpu.halted) halted++;
    took = false;
    try { m.step(); } catch (e) { return { ok: false, text: `${name}: line ${i}: the machine stopped: ${e.message}` }; }
    const got = machineState(m);
    d = diff(got, states[i]);
    const why = d.length ? explain(d, got, states[i], spec, took, m.cpu.pc === pc) : null;
    if (why) {
      explained.set(why, (explained.get(why) || 0) + 1);
      // the emulator's, so the run goes on from its state
      m.cpu.f = states[i].af & 0xFF; m.cpu.wz = states[i].wz;
      m.cpu.tstates += ((states[i].t - got.t) % FRAME + FRAME + FRAME / 2) % FRAME - FRAME / 2;
      continue;
    }
    if (d.length) {
      const ctx = states.slice(Math.max(0, i - 4), i).map(s => '  log     ' + show(s)).join('\n');
      return { ok: false, text: `${name}: line ${i} differs (${d.join(', ')})\n${ctx}\n  log     ${show(states[i])}\n  machine ${show(got)}` };
    }
  }
  for (let a = 0x4000; a < 0x10000; a++) {
    if (m.ram[a] !== end[a - 0x4000]) return { ok: false, text: `${name}: RAM at $${a.toString(16)} is ${m.ram[a]} here and ${end[a - 0x4000]} in the emulator` };
  }
  const known = [...explained].map(([why, n]) => `\n        ${n} x ${why}`).join('');
  return { ok: true, text: `${name}: all ${states.length} lines agree (${Math.floor((m.cpu.tstates - m.t0) / FRAME)} frames, ` +
    `${interrupts} interrupts, ${halted} halted cycles), and the RAM${known ? '; differences already explained:' + known : ''}` };
}

// The instruction at pc, as check_z80.js's KNOWN names it: { group, op }.
function specAt(ram, pc) {
  const at = k => ram[(pc + k) & 0xFFFF];
  const b = at(0);
  if (b === 0xDD || b === 0xFD) {
    const g = b === 0xDD ? 'dd' : 'fd';
    return at(1) === 0xCB ? { group: g + 'cb', op: at(3) } : { group: g, op: at(1) };
  }
  if (b === 0xED) return { group: 'ed', op: at(1) };
  if (b === 0xCB) return { group: 'cb', op: at(1) };
  return { group: 'base', op: b };
}

// Where ZEsarUX 13.0's timing is already known to differ from the machine's, and how that is known.
const KNOWN_T = [
  { what: 'LD (IX+d),n and LD (IY+d),n: the two internal cycles after n is read, contended here and not in the emulator',
    is: s => (s.group === 'dd' || s.group === 'fd') && s.op === 0x36,
    how: "the emulator holds the same two cycles of every DD CB instruction on the same byte's address, and the internal " +
      'cycles of every other instruction in mix as the machine does; no third reference here settles it' },
];

// A difference ZEsarUX is already known for: one of check_z80.js's KNOWN rules for the instruction
// (flag bits and MEMPTR), MEMPTR after an interrupt, which the emulator leaves as it does after RST
// and the machine sets to the handler's address as z80.js's RST sets it, or one of KNOWN_T for the
// T-states. Anything else is null.
function explain(d, got, want, spec, took, repeat) {
  const fbits = (got.af ^ want.af) & 0xFF;
  if (d.some(k => k !== 'af' && k !== 'wz' && k !== 't') || (got.af >> 8) !== (want.af >> 8)) return null;
  if (d.includes('t')) {
    const rule = spec && KNOWN_T.find(k => k.is(spec));
    if (!rule) return null;
    if (d.length === 1 || (d.length === 2 && d.includes('wz') && explain(['wz'], got, want, spec, took, repeat))) return rule.what;
    return null;
  }
  if (took && d.length === 1 && d[0] === 'wz') return 'MEMPTR after the interrupt';
  if (!spec) return null;
  const rule = KNOWN.find(k => k.is(spec) && (!k.repeat || repeat) && (fbits & ~(k.f || 0)) === 0 && (!d.includes('wz') || k.wz));
  return rule ? rule.what : null;
}

async function main(names) {
  const z = await zrcp(+(process.env.KIT_ZESARUX_PORT || 10000));
  fs.mkdirSync(LOGS, { recursive: true });
  let ok = true;
  try {
    await z.step();
    const machine = (await z.cmd('get-current-machine')).trim(), version = (await z.cmd('get-version')).trim();
    if (!/48k/i.test(machine)) throw new Error(`the emulator is a ${machine}; this check needs a 48K Spectrum`);
    console.log(`ZEsarUX ${version}, ${machine}`);
    const rom = new Uint8Array(Buffer.from((await z.cmd('read-memory 0 16384')).trim(), 'hex'));
    const base = new Uint8Array(65536);
    base.set(Buffer.from((await z.cmd('read-memory 4000H 49152')).trim(), 'hex'), 0x4000);
    for (const [k, v] of [['tstates', 'yes'], ['registers', 'yes'], ['address', 'yes'], ['opcode', 'yes']]) {
      await z.cmd(`cpu-transaction-log ${k} ${v}`);
    }
    for (const name of names) {
      const r = await runOne(z, name, base, rom);
      console.log((r.ok ? 'ok    ' : 'FAIL  ') + r.text);
      if (!r.ok) ok = false;
    }
  } finally {
    await z.cmd('hard-reset-cpu');
    await z.cmd('exit-cpu-step');
    z.close();
  }
  return ok;
}

const names = process.argv.slice(2);
for (const n of names) if (!PROGRAMS[n]) { console.log(`usage: node kit/spectrum/check_machine.js [${Object.keys(PROGRAMS).join(' ')}]`); process.exit(1); }
main(names.length ? names : Object.keys(PROGRAMS)).then(ok => process.exit(ok ? 0 : 1), e => { console.error(e.message); process.exit(2); });
