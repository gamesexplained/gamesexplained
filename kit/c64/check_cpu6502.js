'use strict';
// The 6502 simulator (cpu6502.js) checked against outside references, for whoever changes it.
// Neither runs in CI: one needs downloads, the other the emulator. The self-test is test_cpu6502.js.
//
//   node kit/c64/check_cpu6502.js vectors <dir> [--fetch]
//       Tom Harte's SingleStepTests for the NMOS 6502 (github.com/SingleStepTests/65x02, folder
//       6502/v1, MIT licence): 10,000 cases for each of the 256 opcodes, each one instruction from a
//       given state. Checks the registers, the memory, the cycle count, and that nothing outside the
//       case's RAM is read or written. <dir> holds the files as the project names them (00.json to
//       ff.json). The tests take $EE for ANE's constant, so the simulator does here. With --fetch,
//       each file is fetched into <dir>, checked and deleted: about 1 GB in all, one file of up to
//       6 MB on disk at a time. Ask before fetching (AGENTS.md).
//   node kit/c64/check_cpu6502.js vice [cases] [seed]
//       One program run in the emulator (tools.py vice) and in the simulator from the same snapshot:
//       [cases] random cases (default 16) for every opcode but the JAMs, jumps and branches, with
//       random registers, flags (decimal mode too), memory, stack pointer and page crossings, then
//       branches (taken, not, across a page), JMP ($xxFF), JSR/RTS and BRK/RTI. With the screen off
//       the processor has every cycle. Compares all of RAM, the registers and the cycles between
//       the two snapshots. It resets the machine, so not during a game you mean to keep.
//
// On 26 September 2026, with vice-mcp 3.13.1 on Linux: all 2,560,000 vector cases passed, and
// VICE and the simulator agreed on 14,720 cases in 17 programs, to the byte and the cycle.

const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { CPU, OPCODES, readSnapshot } = require('./cpu6502');

// --- the vectors -----------------------------------------------------------------------------------
const VECTORS = 'https://raw.githubusercontent.com/SingleStepTests/65x02/main/6502/v1/';

// A simulator that notes every address it touches.
class Touching extends CPU {
  rd(a) { this.t.push(a); return super.rd(a); }
  wr(a, v) { this.t.push(a); super.wr(a, v); }
  push(v) { this.t.push(0x100 | this.sp); super.push(v); }
  pull() { const v = super.pull(); this.t.push(0x100 | this.sp); return v; }
  fb(a, first) { this.t.push(a & 0xFFFF); return super.fb(a, first); }
}

function vectorFile(file) {
  const op = parseInt(path.basename(file, '.json'), 16), [name, mode] = OPCODES[op];
  const mem = new Uint8Array(65536), why = {};
  let bad = 0;
  for (const t of JSON.parse(fs.readFileSync(file))) {
    const i = t.initial, f = t.final;
    for (const [a, v] of i.ram) mem[a] = v;
    const cpu = new Touching(mem, { ane: 0xEE });
    cpu.t = [];
    cpu.setRegs({ pc: i.pc, sp: i.s, a: i.a, x: i.x, y: i.y, p: i.p });
    let threw = null;
    try { cpu.step(); } catch (e) { threw = e; }
    const errs = new Set();
    if (name === 'jam') { if (!threw || !/^JAM/.test(threw.message)) errs.add('no stop'); }
    else if (threw) errs.add(threw.message);
    else {
      for (const [k, v] of [['pc', f.pc], ['sp', f.s], ['a', f.a], ['x', f.x], ['y', f.y]]) if (cpu[k] !== v) errs.add(k);
      if ((cpu.p | 0x30) !== (f.p | 0x30)) errs.add('p');                  // B and bit 5 are not flags
      if (f.ram.some(([a, v]) => mem[a] !== v)) errs.add('memory');
      if (cpu.cycles !== t.cycles.length) errs.add('cycles');
      const listed = new Set(i.ram.concat(f.ram).map(r => r[0]));
      if (cpu.t.some(a => !listed.has(a))) errs.add('touched an address not listed');
    }
    if (errs.size) {
      if (++bad <= 2) console.log(`  ${t.name}: ${[...errs].join(', ')}`);
      for (const e of errs) why[e] = (why[e] || 0) + 1;
    }
    for (const a of cpu.t.concat(i.ram.map(r => r[0]), f.ram.map(r => r[0]))) mem[a] = 0;
  }
  console.log(`${path.basename(file)} ${(name + ' ' + mode).padEnd(9)} ${bad ? 'FAIL ' + bad + ' ' + JSON.stringify(why) : 'ok'}`);
  return bad;
}

function vectors(dir, fetch) {
  let bad = 0, files = 0;
  for (let op = 0; op < 256; op++) {
    const file = path.join(dir, op.toString(16).padStart(2, '0') + '.json');
    if (fetch) {
      for (let tries = 0; ; tries++) {
        try { execFileSync('curl', ['-sS', '--fail', '--max-time', '300', '-o', file, VECTORS + path.basename(file)]); break; }
        catch (e) { if (tries === 3) throw e; execFileSync('sleep', [String(2 ** (tries + 1))]); }
      }
    } else if (!fs.existsSync(file)) continue;
    try { bad += vectorFile(file); files++; } finally { if (fetch) fs.unlinkSync(file); }
  }
  console.log(files ? `${files} opcodes, ${bad} cases failed` : 'no vector files in ' + dir);
  return files && !bad;
}

// --- the emulator ----------------------------------------------------------------------------------
// A client for the emulator's MCP server, the node twin of kit/c64/vice.py.
async function connect(url = 'http://127.0.0.1:6510/mcp') {
  let session = null, id = 0;
  async function rpc(method, params, notify) {
    const body = { jsonrpc: '2.0', method };
    if (!notify) body.id = ++id;
    if (params !== undefined) body.params = params;
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
    if (session) headers['Mcp-Session-Id'] = session;
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!session) session = r.headers.get('mcp-session-id');
    const txt = await r.text();
    if (notify) return null;
    const events = txt.split('\n').filter(l => l.startsWith('data:') && l.trim().length > 5);   // server-sent events
    return JSON.parse(events.length ? events[events.length - 1].slice(5) : txt);
  }
  await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'kit', version: '0' } });
  await rpc('notifications/initialized', undefined, true);
  return async (name, args = {}) => {
    const res = await rpc('tools/call', { name, arguments: args });
    const text = res.result && res.result.content ? res.result.content[0].text : JSON.stringify(res);
    try { return JSON.parse(text); } catch (e) { return text; }
  };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const $ = a => '$' + a.toString(16);
async function readMem(vice, a, size) {
  return Buffer.from((await vice('vice_memory_read', { address: $(a), size, encoding: 'hex' })).data_hex, 'hex');
}
async function poke(vice, a, bytes) {
  for (let o = 0; o < bytes.length; o += 4096) {
    await vice('vice_memory_write', { address: $(a + o), data: Array.from(bytes.slice(o, o + 4096)) });
  }
}
async function clearCheckpoints(vice) {
  for (const c of (await vice('vice_checkpoint_list', {})).checkpoints || []) {
    await vice('vice_checkpoint_delete', { checkpoint_num: c.checkpoint_num });
  }
}
async function readyPrompt(vice) {                   // a hard reset, then BASIC's READY.
  await clearCheckpoints(vice);
  await vice('vice_machine_reset', { mode: 'hard', run_after: true });
  await vice('vice_execution_run', {});
  const ready = Buffer.from([0x12, 0x05, 0x01, 0x04, 0x19, 0x2E]);
  for (let i = 0; i < 100; i++) {
    if ((await readMem(vice, 0x0400, 1000)).includes(ready)) return;
    await sleep(100);
  }
  throw new Error('no READY. within 10 s of a hard reset: is the machine running?');
}
async function stopAt(vice, address) {
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    if ((await vice('vice_ping', {})).execution === 'paused') {
      const pc = (await vice('vice_registers_get', {})).PC;
      if (pc !== address) throw new Error('the machine stopped at ' + $(pc) + ', not ' + $(address));
      return;
    }
    await sleep(20);
  }
  throw new Error('the machine did not reach ' + $(address));
}

// The test program. With $01 = $34 all of memory is RAM; the code is at $0800-$9EFF, the results
// (A X Y P S and the operand after each case) at $A000-$BFFF, and the cases' operands where nothing
// else lives: zero page, $0200-$07FF and $C000-$FFEF.
const CODE = 0x0800, CODE_END = 0x9F00, RES = 0xA000, RES_END = 0xC000;
const LEN = { imp: 1, acc: 1, imm: 2, zp: 2, zpx: 2, zpy: 2, rel: 2, abs: 3, abx: 3, aby: 3, ind: 3, izx: 2, izy: 2 };
const CONTROL = /^(jam|brk|jmp|jsr|rts|rti|bcc|bcs|beq|bmi|bne|bpl|bvc|bvs)$/;
const safe = a => a >= 2 && (a < 0x0100 || (a >= 0x0200 && a < 0x0800) || (a >= 0xC000 && a < 0xFFF0));
const PAGES = [];
for (let p = 0x02; p < 0x08; p++) PAGES.push(p);
for (let p = 0xC0; p <= 0xFF; p++) PAGES.push(p);    // $FF: an index that crosses wraps into zero page

function cases(n, seed) {
  let s = seed >>> 0 || 1;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s; };
  const r8 = () => rnd() & 0xFF, pick = xs => xs[rnd() % xs.length];
  const base = (i, cross) => (pick(PAGES) << 8) | (cross && i > 0 ? 0x100 - i + (rnd() % i) : rnd() % (0x100 - i));
  function one(op) {
    const [name, mode] = OPCODES[op];
    for (;;) {
      const t = { op, a: r8(), x: r8(), y: r8(), p: r8(), s: r8(), m: r8(), setup: [], bytes: [op] };
      const cross = rnd() & 1;
      let ea = null, ptr = null;
      if (mode === 'imm') t.bytes.push(r8());
      else if (mode === 'zp') { ea = 2 + (rnd() % 254); t.bytes.push(ea); }
      else if (mode === 'zpx' || mode === 'zpy') { const b = r8(); ea = (b + (mode === 'zpx' ? t.x : t.y)) & 0xFF; t.bytes.push(b); }
      else if (mode === 'abs') { ea = pick([0x0200 + (rnd() % 0x600), 0xC000 + (rnd() % 0x3FF0), 2 + (rnd() % 254)]); t.bytes.push(ea & 0xFF, ea >> 8); }
      else if (mode === 'abx' || mode === 'aby') {
        t.index = mode === 'abx' ? t.x : t.y; t.base = base(t.index, cross);
        ea = (t.base + t.index) & 0xFFFF; t.bytes.push(t.base & 0xFF, t.base >> 8);
      } else if (mode === 'izx') {
        const b = r8(); ptr = (b + t.x) & 0xFF; ea = t.ptr = pick([0x0200 + (rnd() % 0x600), 0xC000 + (rnd() % 0x3FF0)]); t.bytes.push(b);
      } else if (mode === 'izy') {
        ptr = r8(); t.index = t.y; t.base = t.ptr = base(t.y, cross); ea = (t.base + t.y) & 0xFFFF; t.bytes.push(ptr);
      }
      if (ptr !== null) {
        if (ptr < 2 || ptr === 0xFF || ea === ptr || ea === ((ptr + 1) & 0xFF)) continue;
        t.setup.push([ptr, t.ptr & 0xFF], [(ptr + 1) & 0xFF, t.ptr >> 8]);
      }
      if (name === 'pla' || name === 'plp') t.setup.push([0x100 | ((t.s + 1) & 0xFF), t.m]);   // the slot above SP
      if (name === 'pha' || name === 'php') t.ea = 0x100 | t.s;
      if (ea !== null) {
        if (/^sh[axys]$/.test(name) && (t.base & 0xFF) + t.index > 0xFF) {   // the value becomes the high byte
          const r = name === 'shx' ? t.x : name === 'shy' ? t.y : t.a & t.x;
          ea = ((t.base + t.index) & 0xFF) | ((r & ((t.base >> 8) + 1)) << 8);
        }
        if (!safe(ea)) continue;
        t.setup.push([ea, t.m]);
        t.ea = ea;
      }
      return t;
    }
  }
  const out = [];
  for (let k = 0; k < n; k++) for (let op = 0; op < 256; op++) if (!CONTROL.test(OPCODES[op][0])) out.push(one(op));
  return out;
}

class Asm {
  constructor(org) { this.org = org; this.b = []; }
  get pc() { return this.org + this.b.length; }
  e(...bytes) { this.b.push(...bytes); }
  at(a, v) { this.b[a - this.org] = v; }
  imm(op, v) { this.e(op, v & 0xFF); }
  mem(zpOp, absOp, a) { if (a < 0x100) this.e(zpOp, a); else this.e(absOp, a & 0xFF, a >> 8); }
  lda(a) { this.mem(0xA5, 0xAD, a); } sta(a) { this.mem(0x85, 0x8D, a); } stx(a) { this.mem(0x86, 0x8E, a); } sty(a) { this.mem(0x84, 0x8C, a); }
  jmp(a) { this.e(0x4C, a & 0xFF, a >> 8); }
}

// Branches, JMP ($xxFF), JSR/RTS and BRK/RTI, each leaving what it did in a result slot.
function control(A, slot) {
  for (const [op, flag] of [[0x10, 0x80], [0x30, 0x80], [0x50, 0x40], [0x70, 0x40], [0x90, 0x01], [0xB0, 0x01], [0xD0, 0x02], [0xF0, 0x02]]) {
    for (const set of [0, 1]) for (const across of [0, 1]) {
      const r = slot();
      A.imm(0xA9, set ? flag | 0x04 : 0x04); A.e(0x48, 0x28);        // the flag, and I
      A.imm(0xA2, 0);
      if (across) while ((A.pc & 0xFF) !== 0xF0) A.e(0xEA);          // a branch at $xxF0 over $xx00
      A.e(op, 16);
      for (let i = 0; i < 16; i++) A.e(0xE8);                        // INX, skipped when taken
      A.stx(r);
    }
  }
  { // JMP ($C0FF) takes its high byte from $C000
    const r = slot();
    A.imm(0xA9, 0); const lo = A.pc - 1; A.sta(0xC0FF);
    A.imm(0xA9, 0); const hi = A.pc - 1; A.sta(0xC000);
    A.imm(0xA9, 0x12); A.sta(0xC100);
    A.e(0x6C, 0xFF, 0xC0, 0xEA, 0xEA);
    A.at(lo, A.pc & 0xFF); A.at(hi, A.pc >> 8);
    A.imm(0xA2, 0x77); A.stx(r);
  }
  { // JSR and RTS, and what the subroutine sees of the stack
    const r = slot();
    A.imm(0xA2, 0xF0); A.e(0x9A); A.imm(0xA2, 0);
    const jsr = A.pc; A.e(0x20, 0, 0);
    const over = A.pc; A.jmp(0);
    const sub = A.pc; A.e(0xE8, 0xE8, 0xBA, 0x8E, 0x00, 0xC2, 0x60);   // INX INX TSX STX $C200 RTS
    A.at(jsr + 1, sub & 0xFF); A.at(jsr + 2, sub >> 8); A.at(over + 1, A.pc & 0xFF); A.at(over + 2, A.pc >> 8);
    A.stx(r); A.e(0xBA); A.stx(r + 1); A.lda(0xC200); A.sta(r + 2);
  }
  { // BRK and RTI: the handler notes the pushed flags and address, and the flags inside
    const r = slot();
    A.imm(0xA2, 0xE0); A.e(0x9A);
    A.imm(0xA9, 0xC3); A.e(0x48, 0x28);
    const over = A.pc; A.jmp(0);
    const handler = A.pc;
    A.e(0xBA, 0xBD, 0x01, 0x01); A.sta(r); A.e(0xBD, 0x02, 0x01); A.sta(r + 1); A.e(0xBD, 0x03, 0x01); A.sta(r + 2);
    A.e(0x08, 0x68); A.sta(r + 3); A.e(0x40);
    A.at(over + 1, A.pc & 0xFF); A.at(over + 2, A.pc >> 8);
    A.imm(0xA9, handler & 0xFF); A.sta(0xFFFE); A.imm(0xA9, handler >> 8); A.sta(0xFFFF);
    A.e(0x00, 0xEA, 0x08, 0x68); A.sta(r + 4); A.e(0xBA); A.stx(r + 5);   // BRK, its padding byte, then the flags after RTI
  }
}

// One program: the machine quiet, then the control-flow set (first program only) and the cases.
function program(tests, first) {
  const A = new Asm(CODE);
  A.e(0x78);                                                        // SEI
  A.imm(0xA9, 0x7F); A.sta(0xDC0D); A.sta(0xDD0D); A.lda(0xDC0D); A.lda(0xDD0D);   // the CIAs' interrupts off
  A.imm(0xA9, 0); A.sta(0xD01A); A.imm(0xA9, 0xFF); A.sta(0xD019);                 // the VIC's too
  A.imm(0xA9, 0x0B); A.sta(0xD011);                                 // the screen off: no bad lines
  const w1 = A.pc; A.lda(0xD011); A.e(0x10, (w1 - A.pc - 2) & 0xFF);  // wait for the next frame, whose
  const w2 = A.pc; A.lda(0xD011); A.e(0x30, (w2 - A.pc - 2) & 0xFF);  // line $30 sees the screen off
  A.imm(0xA9, 0x34); A.sta(0x01);                                   // all RAM
  const over = A.pc; A.jmp(0);
  const trap = A.pc; A.jmp(trap);                                   // an interrupt nobody asked for lands here
  A.at(over + 1, A.pc & 0xFF); A.at(over + 2, A.pc >> 8);
  A.imm(0xA9, trap & 0xFF); A.sta(0xFFFA); A.sta(0xFFFE); A.imm(0xA9, trap >> 8); A.sta(0xFFFB); A.sta(0xFFFF);
  A.imm(0xA2, 0xFF); A.e(0x9A);
  const start = A.pc; A.e(0xEA);                                    // the first snapshot is taken here
  const index = [];
  let res = RES;
  const slot = () => { const r = res; res += 6; return r; };
  if (first) control(A, slot);
  for (const t of tests) {
    if (A.pc > CODE_END - 80 || res + 6 > RES_END) break;
    A.imm(0xA2, t.s); A.e(0x9A);
    for (const [a, v] of t.setup) { A.imm(0xA9, v); A.sta(a); }
    A.imm(0xA9, t.p); A.e(0x48); A.imm(0xA9, t.a); A.imm(0xA2, t.x); A.imm(0xA0, t.y); A.e(0x28);   // PLP last
    A.e(...t.bytes);
    const r = slot();
    A.e(0x08); A.sta(r); A.stx(r + 1); A.sty(r + 2); A.e(0x68); A.sta(r + 3); A.e(0xBA); A.stx(r + 4);
    if (t.ea !== undefined) { A.lda(t.ea); A.sta(r + 5); }
    index.push([r, t]);
  }
  const end = A.pc; A.jmp(end);                                     // the second snapshot is taken here
  return { bytes: Uint8Array.from(A.b), start, end, index };
}

async function snapshot(vice, name) {
  const s = await vice('vice_snapshot_save', { name, description: 'kit/c64/check_cpu6502.js' });
  if (!s.path) throw new Error('no snapshot: ' + JSON.stringify(s));
  return s.path;
}

async function viceProgram(vice, prog, tag) {
  await readyPrompt(vice);
  await poke(vice, CODE, prog.bytes);
  await poke(vice, RES, new Uint8Array(RES_END - RES));
  await vice('vice_checkpoint_add', { start: $(prog.start), exec: true, stop: true });
  await vice('vice_keyboard_type', { text: 'SYS2048\n' });
  await stopAt(vice, prog.start);
  const before = await snapshot(vice, tag + '_before');
  await clearCheckpoints(vice);
  await vice('vice_checkpoint_add', { start: $(prog.end), exec: true, stop: true });
  await vice('vice_execution_run', {});
  await stopAt(vice, prog.end);
  const after = await snapshot(vice, tag + '_after');
  await clearCheckpoints(vice);
  return [before, after];
}

function compare(before, after, prog) {
  const b = readSnapshot(before), a = readSnapshot(after), lines = [];
  const cpu = CPU.fromSnapshot(before, { io: {} });                 // the program touches no chip after the start
  cpu.run({ until: prog.end, maxSteps: 1e7 });
  const cycles = a.clock - b.clock;
  if (cpu.cycles !== cycles) lines.push(`cycles: VICE ${cycles}, the simulator ${cpu.cycles}`);
  for (const k of ['a', 'x', 'y', 'sp']) if (cpu[k] !== a.regs[k]) lines.push(`${k}: VICE ${$(a.regs[k])}, the simulator ${$(cpu[k])}`);
  if ((cpu.p | 0x30) !== (a.regs.p | 0x30)) lines.push(`P: VICE ${$(a.regs.p)}, the simulator ${$(cpu.p)}`);
  const differ = new Map();
  for (let i = 2; i < 65536; i++) {
    if (cpu.m[i] === a.ram[i]) continue;
    const hit = prog.index.find(([r]) => i >= r && i < r + 6);
    const k = hit ? OPCODES[hit[1].op].join(' ') : $(i);
    differ.set(k, (differ.get(k) || 0) + 1);
  }
  if (differ.size) lines.push('memory differs: ' + [...differ].slice(0, 20).map(([k, n]) => `${k} (${n})`).join(', '));
  return { lines, cycles };
}

async function vice(n, seed) {
  const call = await connect();
  const tests = cases(n, seed);
  let done = 0, batch = 0, ok = true, cycles = 0;
  while (batch === 0 || done < tests.length) {
    const prog = program(tests.slice(done), batch === 0);
    const tag = `cpu6502_check_${process.pid}_${batch}`;
    const files = await viceProgram(call, prog, tag);
    try {
      const r = compare(files[0], files[1], prog);
      cycles += r.cycles;
      console.log(`program ${batch}: ${prog.index.length} cases${batch === 0 ? ' and the control-flow set' : ''}, ${r.cycles} cycles` +
                  (r.lines.length ? '\n  ' + r.lines.join('\n  ') : ', the same'));
      ok = ok && !r.lines.length;
    } finally {
      for (const f of files) for (const x of [f, f.replace(/\.vsf$/, '.json')]) try { fs.unlinkSync(x); } catch (e) {}
    }
    done += prog.index.length; batch++;
  }
  await readyPrompt(call);                                          // leave the machine at READY.
  console.log(ok ? `VICE and the simulator agree: ${tests.length} cases, the control-flow set, ${cycles} cycles`
                 : 'VICE and the simulator DIFFER');
  return ok;
}

// --- main ------------------------------------------------------------------------------------------
(async () => {
  const [what, ...rest] = process.argv.slice(2);
  let ok;
  if (what === 'vectors' && rest[0]) ok = vectors(rest[0], rest.includes('--fetch'));
  else if (what === 'vice') ok = await vice(+(rest[0] || 16), +(rest[1] || 20260926));
  else { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 23).map(l => l.slice(3)).join('\n')); return; }
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e.message); process.exit(2); });
