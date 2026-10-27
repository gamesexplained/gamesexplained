'use strict';
// A self-test of kit/c16/machine.js against plus4emu: the probe programs kit/c16/ted_timing.py
// recorded in kit/c16/fixtures/ted-timing.json, run on the machine from the same place on the
// beam, must leave what they left on the emulator (TED's position, line and timers read at
// drifting places, raster and timer interrupts taken through the KERNAL, the tick each of a stream
// of mixed instructions begins on). Then the keyboard's latch, a saved machine going on as the
// one it was saved from, and the stop at a ROM. Exits 1 on any failure. node kit/c16/test_machine.js
const fs = require('fs');
const path = require('path');
const { Machine, KEY, LINE } = require('./machine.js');

const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'ted-timing.json'), 'utf8'));
let fails = 0;
const check = (what, ok, detail = '') => { if (!ok) { fails++; console.log('FAIL', what, detail); } else console.log('ok  ', what); };

// The tick of a place on the beam as plus4emu gives it: its line count steps at column 98.
const tickAt = ([line, column]) => line * LINE + (column >= 98 ? column - 98 : column + 16);
function machine(p) {
  const ram = new Uint8Array(65536);
  ram.set(Buffer.from(p.code, 'hex'), 0x1000);
  return { ram, m: new Machine({ ram, pc: 0x1000, tick: tickAt(p.start) }) };
}

for (const [name, p] of Object.entries(F.probes)) {
  if (name.startsWith('charline')) continue;               // below
  const { ram, m } = machine(p);
  if (p.run.until !== undefined) { let n = 0; while (m.cpu.pc !== p.run.until && n++ < 1e7) m.step(); }
  else m.runFrames(p.run.frames);
  const [buf, n] = p.buffer, want = Buffer.from(p.result, 'hex');
  let diff = 0, first = -1;
  for (let i = 0; i < n; i++) if (ram[buf + i] !== want[i]) { diff++; if (first < 0) first = i; }
  check(name + ': ' + n + ' bytes as plus4emu left them', diff === 0,
    diff + ' differ, the first at $' + (buf + first).toString(16) + ' (' + want[first] + ' there, ' + ram[buf + first] + ' here)');
}

{
  const p = F.stream, { m } = machine(p);
  m.step();                                                // the ticks are from the end of the first
  let diff = 0, first = -1;
  for (let i = 0; i < p.ticks.length; i++) {
    const t0 = m.tick;
    m.step();
    if (m.tick - t0 !== p.ticks[i]) { if (first < 0) first = i; diff++; m.tick = t0 + p.ticks[i]; }
  }
  check('stream: ' + (p.ticks.length + 1) + ' instructions begin on plus4emu\'s ticks', diff === 0 && m.cpu.pc === p.end,
    diff + ' differ, the first the ' + first + 'th');
}

// $FF1F's line within the character row, with the display on: each read's bits 0-2 as plus4emu
// read them. The flash counter, bits 3-6, is not modelled. A read at tick 2 of a line gets the line
// before's on plus4emu, and now and then that ANDed with the new one: either passes there. The
// line and place read beside each are left to the position probes: with the vertical scroll at 0,
// the machine's place is two ticks past plus4emu's over lines 0 to 14 (not modelled).
for (const [name, p] of Object.entries(F.probes)) {
  if (!name.startsWith('charline')) continue;
  const { ram, m } = machine(p);
  const at = [], read = m.ioRead.bind(m);
  m.ioRead = function (a) { if (a === 0xFF1F) at.push(this.now); return read(a); };
  let n = 0;
  while (m.cpu.pc !== p.run.until && n++ < 1e7) m.step();
  const want = Buffer.from(p.result, 'hex');
  let diff = 0, first = '';
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < 256; i++) {
      const k = r * 256 + i, o = r * 1024 + i, got = ram[0x2000 + o] & 7, w = want[o] & 7;
      const t = at[k], ok = got === w || (t % LINE === 2 && w === (got & m.beam.charLine(t + 1)));
      if (!ok) { diff++; if (!first) first = 'read ' + k + ' at line ' + Math.floor(t / LINE) % 312 + ' tick ' + t % LINE; }
    }
  }
  check(name + ': 1,024 reads of $FF1F as plus4emu gave them', diff === 0 && at.length === 1024, diff + ' differ, the first ' + first);
}

// The keyboard: a write to $FF08 latches the rows $FD30 selects; a key pressed after it is not seen.
{
  const ram = new Uint8Array(65536);
  // lda #$FD; sta $FD30; sta $FF08; lda $FF08; sta $2000; lda $FF08; sta $2001; jmp *
  ram.set([0xA9, 0xFD, 0x8D, 0x30, 0xFD, 0x8D, 0x08, 0xFF, 0xAD, 0x08, 0xFF, 0x8D, 0x00, 0x20,
    0xAD, 0x08, 0xFF, 0x8D, 0x01, 0x20, 0x4C, 0x14, 0x10], 0x1000);
  const m = new Machine({ ram, pc: 0x1000 });
  m.press('A');                                            // row 1, column 2
  for (let i = 0; i < 4; i++) m.step();
  m.press('W');                                            // row 1, column 1: after the latch
  for (let i = 0; i < 4; i++) m.step();
  check('keyboard: $FF08 reads the rows latched by its write', ram[0x2000] === 0xFB && ram[0x2001] === 0xFB,
    '$' + ram[0x2000].toString(16) + ' $' + ram[0x2001].toString(16));
  check('keyboard: key numbers as the KERNAL forms them', KEY.A === 10 && KEY.STOP === 63);
}

// A machine saved in the middle of the timer probe goes on as the one it was saved from.
{
  const name = Object.keys(F.probes).find(k => k.startsWith('timer')), p = F.probes[name];
  const { ram, m } = machine(p);
  m.runFrames(5);
  while (!m.irqFlag && m.b1 === 0) m.step();               // somewhere the interrupt line is moving
  const copy = Machine.restore(JSON.parse(JSON.stringify(m.save())));
  m.runFrames(10); copy.runFrames(10);
  const same = Buffer.compare(Buffer.from(ram.subarray(0, 0x4000)), Buffer.from(copy.ram.subarray(0, 0x4000))) === 0;
  check('save and restore: the copy runs on as the original', same && m.tick === copy.tick && m.cpu.pc === copy.cpu.pc &&
    m.irqs === copy.irqs, 'ticks ' + m.tick + ' ' + copy.tick + ', interrupts ' + m.irqs + ' ' + copy.irqs);
}

// The processor reaching a ROM the kit does not hold stops the run with an error naming it.
{
  const ram = new Uint8Array(65536);
  ram.set([0x4C, 0x00, 0x80], 0x1000);                     // jmp $8000
  const m = new Machine({ ram, pc: 0x1000 });
  let msg = '';
  try { m.runFrames(1); } catch (e) { msg = e.message; }
  check('the processor reaching a ROM stops the run', /the ROM at \$8000/.test(msg), msg);
}

console.log(fails ? fails + ' failed' : 'all passed');
process.exit(fails ? 1 : 0);
