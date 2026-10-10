'use strict';
// A self-test of kit/c64/kernal_lines.js on a program of its own: it prints a prompt through
// CHROUT, reads a line through CHRIN into $2000, and then echoes the line, SAVEs $2000-$200F, LOADs
// the next file back, or quits to $3000, by the line's first letter. It checks what the game
// printed, the lines it read, the tape, the stops, a KERNAL routine with no hook, and that a
// test's own hook wins. Exits 1 on any failure. node kit/c64/test_kernal_lines.js
const { CPU } = require('./cpu6502.js');
const { KernalLines } = require('./kernal_lines.js');

let fails = 0;
const check = (what, ok, more) => { if (ok) console.log('ok  ', what); else { fails++; console.log('FAIL', what, more === undefined ? '' : more); } };
const text = s => [...s].map(c => c.charCodeAt(0));
const str = bytes => String.fromCharCode(...bytes);

// A few lines of 6502, labels resolved when every byte is placed.
function program() {
  const ram = new Uint8Array(65536), L = {}, fix = [];
  let pc = 0x1000;
  const emit = (...b) => { for (const v of b) ram[pc++] = v; };
  const label = n => { L[n] = pc; };
  const rel = (op, n) => { emit(op, 0); fix.push([pc - 1, n, 'rel']); };
  const abs = (op, n) => { emit(op, 0, 0); fix.push([pc - 2, n, 'abs']); };
  label('start'); emit(0xA2, 0x00);                               // LDX #0
  label('prompt'); abs(0xBD, 'text');                             // LDA text,X
  rel(0xF0, 'read');                                              // BEQ read
  emit(0x20, 0xD2, 0xFF, 0xE8);                                   // JSR CHROUT; INX
  rel(0xD0, 'prompt');                                            // BNE prompt
  label('read'); emit(0xA0, 0x00);                                // LDY #0
  label('char'); emit(0x20, 0xCF, 0xFF, 0x99, 0x00, 0x20, 0xC8, 0xC9, 0x0D); // JSR CHRIN; STA $2000,Y; INY; CMP #$0D
  rel(0xD0, 'char');                                              // BNE char
  emit(0xAD, 0x00, 0x20);                                         // LDA $2000
  emit(0xC9, 0x51); rel(0xF0, 'quit');                            // CMP #'Q'; BEQ quit
  emit(0xC9, 0x53); rel(0xF0, 'save');                            // CMP #'S'; BEQ save
  emit(0xC9, 0x4C); rel(0xF0, 'load');                            // CMP #'L'; BEQ load
  emit(0xC9, 0x47); rel(0xF0, 'get');                             // CMP #'G'; BEQ get
  emit(0xA0, 0x00);                                               // LDY #0
  label('echo'); emit(0xB9, 0x00, 0x20, 0x20, 0xD2, 0xFF, 0xC8, 0xC9, 0x0D); // LDA $2000,Y; JSR CHROUT; INY; CMP #$0D
  rel(0xD0, 'echo');                                              // BNE echo
  abs(0x4C, 'start');                                             // JMP start
  label('save'); emit(0xA9, 0x00, 0x85, 0xFB, 0xA9, 0x20, 0x85, 0xFC, // $FB/$FC = $2000
    0xA9, 0xFB, 0xA2, 0x10, 0xA0, 0x20, 0x20, 0xD8, 0xFF);        // LDA #$FB; LDX #$10; LDY #$20; JSR SAVE
  abs(0x4C, 'start');
  label('load'); emit(0x20, 0xD5, 0xFF, 0x08, 0x68, 0x8D, 0x10, 0x20); // JSR LOAD; PHP; PLA; STA $2010
  abs(0x4C, 'start');
  label('get'); emit(0x20, 0xE4, 0xFF, 0x8D, 0x11, 0x20);         // JSR GETIN; STA $2011
  abs(0x4C, 'start');
  label('quit'); emit(0x4C, 0x00, 0x30);                          // JMP $3000
  label('text'); emit(0x3E, 0x00);                                // ">"
  for (const [at, n, kind] of fix) {
    if (kind === 'rel') ram[at] = (L[n] - (at + 1)) & 0xFF;
    else { ram[at] = L[n] & 0xFF; ram[at + 1] = L[n] >> 8; }
  }
  return ram;
}

function machine(hooks) {
  const cpu = new CPU(program(), { port: { dir: 0x2F, data: 0x36 }, io: {} });
  cpu.pc = 0x1000; cpu.sp = 0xFF;
  return { cpu, k: new KernalLines(cpu, { stops: { 0x3000: 'quit' }, hooks }) };
}

const { cpu, k } = machine();
const executed = new Uint8Array(65536);
check('the start runs to the first line read', k.run(undefined, { executed }) === 'line');
check('what it printed on the way', str(k.out) === '>', JSON.stringify(str(k.out)));
check('executed passes to the run', executed[0x1000] === 1 && executed[0x3000] === 0);
check('a line is read to its RETURN, and the run stops at the next read', k.run(text('HI')) === 'line'
      && str(cpu.m.subarray(0x2000, 0x2003)) === 'HI\r');
check('out holds only what the line printed', str(k.out) === 'HI\r>', JSON.stringify(str(k.out)));
check('an empty line is the RETURN alone', k.run([]) === 'line' && cpu.m[0x2000] === 0x0D && str(k.out) === '\r>');
k.run(text('SAVE'));
check('SAVE keeps the bytes from the pointer to X/Y', k.tape.length === 1 && k.tape[0].addr === 0x2000
      && k.tape[0].bytes.length === 16 && str(k.tape[0].bytes.subarray(0, 5)) === 'SAVE\r', JSON.stringify(k.tape));
cpu.m.fill(0xEE, 0x2005, 0x2010);
cpu.c = 1;
k.run(text('LOAD'));
check('LOAD puts the next file back at its address', str(cpu.m.subarray(0x2000, 0x2005)) === 'SAVE\r' && cpu.m[0x200F] === k.tape[0].bytes[15]);
check('LOAD returns with C clear', (cpu.m[0x2010] & 1) === 0, cpu.m[0x2010].toString(2));
k.run(text('LX'));
check('a LOAD past the last file loads nothing', str(cpu.m.subarray(0x2000, 0x2003)) === 'LX\r');
let threw = '';
try { k.run(text('G')); } catch (e) { threw = e.message; }
check('a KERNAL routine with no hook stops the run with its address', /ffe4|FFE4/.test(threw), threw);
check('a stop returns its name', machine().k.run() === 'line' && (() => { const m = machine(); m.k.run(); return m.k.run(text('Q')); })() === 'quit');
const own = machine({ 0xFFE4: c => { c.a = 0x41; c.rts(); }, 0xFFD2: c => { c.rts(); } });
own.k.run();
check('a test\'s own hooks win over these', own.k.run(text('G')) === 'line' && own.cpu.m[0x2011] === 0x41 && own.k.out.length === 0);

console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);
