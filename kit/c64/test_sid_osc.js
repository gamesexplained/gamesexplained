'use strict';
// What $D41B reads, held against the emulator (#786): every reading in
// kit/c64/fixtures/sid-osc.json, which kit/c64/sid_osc.py recorded in VICE, replayed through the
// oscillators in site/lib/sid.js (createOsc), and each probe's own bytes run on kit/c64/machine.js.
// Then the model against itself (a jump of many cycles and the same cycles one at a time; a
// state saved and loaded), the machine's start from a snapshot's registers, and the lockstep
// handing a port the bytes the game read. Exits 1 on any failure. node kit/c64/test_sid_osc.js
const fs = require('fs');
const os = require('os');
const path = require('path');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'sid.js'));
const { Machine } = require('./machine.js');
const { Lockstep } = require('./lockstep.js');

const E = globalThis.C64Sid.engine();
const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'sid-osc.json'), 'utf8'));
const hex = v => '$' + v.toString(16).toUpperCase().padStart(2, '0');
let fails = 0, checked = 0;
function check(ok, what) { checked++; if (!ok) { fails++; console.log('FAIL ' + what); } }
const first = (got, want) => { const i = got.findIndex((v, k) => v !== want[k]); return i < 0 ? '' : `read ${i + 1} is ${hex(got[i])}, VICE ${hex(want[i])}`; };

// 1. The model alone, on the fixture's clock.
for (const model of Object.keys(F.models)) {
  for (const c of F.models[model]) {
    const osc = E.createOsc(model), got = [];
    for (const e of c.events) if (e.length === 3) osc.write(e[1], e[2], e[0]); else got.push(osc.read(e[0]));
    check(got.length === c.reads.length && !first(got, c.reads), `createOsc ${model}, ${c.name}: ${first(got, c.reads)}`);
  }
}

// 2. The probes themselves on the machine: the processor's cycles, the machine's wiring.
for (const model of Object.keys(F.models)) {
  for (const c of F.models[model]) {
    const ram = new Uint8Array(65536);
    ram.set(Buffer.from(c.program, 'hex'), F.org);
    const m = new Machine({ ram, pc: F.org, sid: model });
    for (let i = 0; i < 2000 && ram[F.result] !== 1; i++) m.runCycles(19656);
    const got = Array.from(ram.subarray(F.result + 1, F.result + 1 + c.reads.length));
    check(ram[F.result] === 1 && !first(got, c.reads), `machine ${model}, ${c.name}: ${ram[F.result] === 1 ? first(got, c.reads) : 'the probe did not finish'}`);
  }
}

// 3. A jump is the same cycles taken one at a time: random writes and reads, one oscillator
// read on every cycle (which never jumps) and one read only where the other's value is wanted.
{
  let seed = 12345;
  const rnd = n => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) % n; };
  const REGS = [0, 1, 4, 7, 8, 11, 14, 15, 16, 17, 18];
  for (const model of ['6581', '8580']) {
    let bad = '';
    for (let run = 0; run < 40 && !bad; run++) {
      const slow = E.createOsc(model), fast = E.createOsc(model);
      let t = 0;
      for (let k = 0; k < 60 && !bad; k++) {
        const gap = rnd(4) === 0 ? 5000 + rnd(60000) : 1 + rnd(400);
        for (let i = 1; i < gap; i++) slow.read(t + i);
        t += gap;
        if (rnd(3)) {
          const r = REGS[rnd(REGS.length)];
          // a frequency's high byte kept low at times, so that bit 19 rises rarely; controls of every kind
          const v = r % 7 === 4 ? [0x80, 0x80, 0x20, 0x10, 0x40, 0x88, 0x08, 0x82, 0x14, 0x90, 0x00, 0x22][rnd(12)] : rnd(256);
          slow.write(r, v, t); fast.write(r, v, t);
        }
        const a = slow.read(t), b = fast.read(t);
        if (a !== b) bad = `run ${run}, cycle ${t}: ${hex(b)} after a jump, ${hex(a)} cycle by cycle`;
        else if (JSON.stringify(slow.save()) !== JSON.stringify(fast.save())) bad = `run ${run}, cycle ${t}: the states differ`;
      }
    }
    check(!bad, `createOsc ${model}, a jump against single cycles: ${bad}`);
  }
}

// 4. A state saved and loaded goes on as the one it was taken from.
{
  const a = E.createOsc('6581');
  a.write(0x0E, 0x37, 10); a.write(0x0F, 0xA1, 16); a.write(0x12, 0x80, 22);
  a.read(4000);
  const b = E.createOsc('6581');
  b.load(JSON.parse(JSON.stringify(a.save())));
  let same = true;
  for (let t = 4003; t < 9000; t += 37) if (a.read(t) !== b.read(t)) same = false;
  check(same, 'createOsc: a loaded state reads as the one saved');
}

// 5. The machine: a write to a mirror of the SID reaches voice 3, a saved machine goes on with the
// same numbers, and a machine made from a snapshot runs the voice the snapshot's registers set up.
{
  const noise = m => { m.ioWrite(0xD40E, 0xFF); m.ioWrite(0xD42F, 0xFF); m.ioWrite(0xD412, 0x80); };
  const reads = (m, n) => { const out = []; for (let i = 0; i < n; i++) { m.cpu.cycles += 211; out.push(m.ioRead(0xD41B)); } return out; };
  const m = new Machine({ ram: new Uint8Array(65536), pc: 0x1000 });
  noise(m);
  const head = reads(m, 20);
  check(new Set(head).size > 8, 'machine: voice 3 set to noise reads as noise at $D41B, ' + new Set(head).size + ' values in 20 reads');
  check(reads(m, 4).length === 4 && m.ioRead(0xD43B) === m.ioRead(0xD41B), 'machine: $D43B is $D41B');
  const copy = Machine.restore(JSON.parse(JSON.stringify(m.save())));
  check(reads(copy, 30).join() === reads(m, 30).join(), 'machine: a restored machine reads the numbers the saved one goes on to read');
  // a state saved before the machine kept its oscillators: the voice runs from the registers
  const old = m.save();
  delete old.sidOsc;
  check(new Set(reads(Machine.restore(old), 20)).size > 8, 'machine: a state with no oscillators in it runs voice 3 from its registers');
  // a snapshot as x64sc writes one, its SID module 1.5: the count of SIDs, sound, the engine, the
  // model, then the 32 registers as last written (vice-mcp v3.14.0 wrote these four bytes and
  // this layout for a program that had set voice 3 so, 11 November 2026)
  const mod = (name, major, minor, body) => {
    const h = Buffer.alloc(22);
    h.write(name, 0, 'latin1'); h[16] = major; h[17] = minor; h.writeUInt32LE(22 + body.length, 18);
    return Buffer.concat([h, body]);
  };
  const headB = Buffer.alloc(58);
  headB.write('VICE Snapshot File\x1a', 0, 'latin1'); headB[19] = 2; headB.write('C64SC', 21, 'latin1');
  headB.write('VICE Version\x1a', 37, 'latin1'); headB[50] = 3; headB[51] = 10;
  const cpu = Buffer.alloc(103);
  cpu[11] = 0xF3; cpu.writeUInt16LE(0x1000, 12); cpu[14] = 0x24;
  const mem = Buffer.alloc(4 + 65536 + 1);
  mem[0] = 0x35; mem[1] = 0x2F;
  const vic = Buffer.alloc(200);
  vic[0] = 1;
  const sid = Buffer.alloc(36);
  sid.set([0, 1, 8, 1]); sid[4 + 0x0E] = 0x34; sid[4 + 0x0F] = 0x12; sid[4 + 0x12] = 0x81; sid[4 + 0x18] = 0x8F;
  const file = path.join(os.tmpdir(), 'test_sid_osc_' + process.pid + '.vsf');
  try {
    fs.writeFileSync(file, Buffer.concat([headB, mod('MAINC64CPU', 1, 5, cpu), mod('C64MEM', 0, 1, mem), mod('SID', 1, 5, sid), mod('VIC-IISC', 1, 4, vic)]));
    const v = Machine.fromSnapshot(file);
    check(v.sidw[0x0E] === 0x34 && v.sidw[0x12] === 0x81 && v.sidw[0x18] === 0x8F, 'fromSnapshot: the SID\'s registers are the snapshot\'s');
    const fresh = E.createOsc('8580');
    fresh.write(0x0E, 0x34, 0); fresh.write(0x0F, 0x12, 0); fresh.write(0x12, 0x81, 0);
    const want = []; for (let i = 1; i <= 40; i++) want.push(fresh.read(i * 211));
    const got = reads(v, 40);
    check(got.join() === want.join() && new Set(got).size > 4, 'fromSnapshot: voice 3 runs from the snapshot\'s frequency and control');
  } finally { fs.rmSync(file, { force: true }); }
}

// 6. The lockstep. A game that rolls three numbers a pass from voice 3's noise and waits a time
// the last one sets, so that the reads fall on cycles a port could not know; the port reads
// $D41B through its io and gets the game's bytes in turn.
{
  const MAIN = 0x1020, ROLL = 0x1040, SPIN = 0x1060;
  const program = () => {
    const ram = new Uint8Array(65536);
    const at = (a, bytes) => bytes.forEach((b, i) => { ram[a + i] = b; });
    // $1000: SEI; $01 = $35; voice 3 at frequency $FFFF, noise; JMP main
    at(0x1000, [0x78, 0xA9, 0x35, 0x85, 0x01, 0xA9, 0xFF, 0x8D, 0x0E, 0xD4, 0x8D, 0x0F, 0xD4, 0xA9, 0x80, 0x8D, 0x12, 0xD4,
      0x4C, MAIN & 255, MAIN >> 8]);
    // main: INC $2000; JSR roll; JSR roll; JSR spin; JSR roll; JMP main
    at(MAIN, [0xEE, 0x00, 0x20, 0x20, 0x40, 0x10, 0x20, 0x40, 0x10, 0x20, 0x60, 0x10, 0x20, 0x40, 0x10, 0x4C, MAIN & 255, MAIN >> 8]);
    // roll: LDA $D41B; STA $2002; LDX $2001; STA $2100,X; INC $2001; RTS
    at(ROLL, [0xAD, 0x1B, 0xD4, 0x8D, 0x02, 0x20, 0xAE, 0x01, 0x20, 0x9D, 0x00, 0x21, 0xEE, 0x01, 0x20, 0x60]);
    // spin: LDX $2002; INX; DEX; BNE (to the DEX); RTS
    at(SPIN, [0xAE, 0x02, 0x20, 0xE8, 0xCA, 0xD0, 0xFD, 0x60]);
    return ram;
  };
  const port = (rolls) => {
    const M = new Uint8Array(65536), P = { M };
    P.roll = () => { const v = P.io.sidRead(0x1B); M[0x2002] = v; M[0x2100 + M[0x2001]] = v; M[0x2001] = (M[0x2001] + 1) & 255; };
    P.main_loop = function* () {
      for (;;) {
        yield { cp: MAIN };
        M[0x2000] = (M[0x2000] + 1) & 255;
        for (let i = 0; i < rolls; i++) P.roll();
      }
    };
    return P;
  };
  const start = new Machine({ ram: program(), pc: 0x1000, passAt: MAIN });
  start.runUntilPass(q => q.passes >= 2);
  const state = start.save();
  const run = (rolls) => {
    const m = Machine.restore(state), P = port(rolls);
    const r = new Lockstep({ machine: m, port: P, program: p => p.main_loop(), checkpoints: [MAIN] }).run({ passes: 60, stopOnDiff: true });
    return { r, m, P };
  };
  const good = run(3);
  check(good.r.ok && good.r.passes === 60, 'lockstep: a port that reads $D41B where the game does stays in step for 60 passes' +
    (good.r.ok ? '' : ', differing first in pass ' + (good.r.diffs[0] && good.r.diffs[0].pass)));
  const rolled = Array.from(good.m.ram.subarray(0x2100, 0x2200));
  check(new Set(rolled).size > 60, 'lockstep: the game rolled noise, ' + new Set(rolled).size + ' values in 256');
  check(rolled.join() === Array.from(good.P.M.subarray(0x2100, 0x2200)).join(), 'lockstep: the port rolled the game\'s numbers');
  const short = run(2);
  check(!short.r.ok, 'lockstep: a port that reads it once fewer is caught');
}

console.log(fails ? `${fails} of ${checked} checks failed` : `$D41B: ${checked} checks pass`);
process.exit(fails ? 1 : 0);
