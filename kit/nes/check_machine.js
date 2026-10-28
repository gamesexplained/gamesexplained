#!/usr/bin/env node
'use strict';
// Hold kit/nes/machine.js to jsnes: both start from the same kit snapshot of a game, get the same
// buttons each frame, and are compared after every frame (the 2 KB of RAM, the processor's
// registers, the nametables, the palette and the sprite table; the stack page is left out, and
// the program counter is reported rather than compared, since the snapshot does not say how far
// past the vertical blank's start the server stopped, so the two can stand a few cycles apart in
// the game's wait loop). It needs the kit's server running
// with the game in it (python3 kit/scripts/tools.py jsnes) and a snapshot the server saved, which
// holds the game: run by hand, never in CI (kit/nes/test_machine.js is the test that is).
//   node kit/nes/check_machine.js <snapshot.json.gz> [frames] [seed] [buttons...]
// The buttons are pressed and released by a seeded random walk over those named (default: a b
// left right start), each held for a few frames at a time. Exits 1 at the first difference.
const net = require('net');
const path = require('path');
const { Machine, BUTTON } = require('./machine.js');

const [file, framesArg, seedArg, ...names] = process.argv.slice(2);
if (!file) { console.log('usage: node kit/nes/check_machine.js <snapshot.json.gz> [frames] [seed] [buttons...]\n       node kit/nes/check_machine.js --program [snapshot.json.gz to put back]'); process.exit(2); }
const FRAMES = +framesArg || 300, buttons = names.length ? names : ['a', 'b', 'left', 'right', 'start'];
let seed = +seedArg || 1;
const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed >>> 8; };
const PORT = +(process.env.KIT_JSNES_PORT || 6855);

// a client of the server: one JSON object a line (kit/nes/jsnes.py)
function client() {
  const sock = net.connect(PORT, '127.0.0.1');
  let buf = '', n = 0;
  const waiting = [];
  sock.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); const r = JSON.parse(line); const w = waiting.shift(); if (w) w(r); } });
  sock.on('error', e => { console.log('the server: ' + e.message + ' (start it with python3 kit/scripts/tools.py jsnes)'); process.exit(1); });
  return {
    call: (cmd, args = {}) => new Promise((resolve, reject) => {
      waiting.push(r => { if (!r.ok) reject(new Error(cmd + ': ' + r.error)); else resolve(r); });
      sock.write(JSON.stringify(Object.assign({}, args, { id: ++n, cmd })) + '\n');
    }),
    end: () => sock.end(),
  };
}
const hex = (v, n = 4) => '$' + v.toString(16).toUpperCase().padStart(n, '0');

// --program: kit/nes/test_machine.js's program as a cartridge in the server, run 120 frames with a
// script of buttons, and what jsnes left recorded in kit/nes/fixtures/machine.json for the test to
// hold the machine to. The cartridge is written under tools/ (gitignored); a snapshot named after
// is loaded back, so the game in the server is as it was.
async function fixture(j) {
  const { program } = require('./test_machine.js');
  const ram = program();
  const nes = Buffer.alloc(16 + 0x4000 + 0x2000);
  nes.write('NES\x1a', 0, 'latin1'); nes[4] = 1; nes[5] = 1;
  nes.set(ram.subarray(0xC000), 16);
  const dir = path.resolve(__dirname, '..', '..', 'tools', 'nes-home');
  const fs = require('fs');
  fs.mkdirSync(dir, { recursive: true });
  const cart = path.join(dir, 'machine-test.nes');
  fs.writeFileSync(cart, nes);
  await j.call('cartridge', { path: cart });
  const script = { 5: [['a', 0, true]], 20: [['a', 0, false]], 25: [['start', 0, true]], 30: [['b', 1, true]], 40: [['start', 0, false], ['b', 1, false]],
    50: [['a', 0, true], ['right', 0, true]], 53: [['a', 0, false]], 70: [['right', 0, false], ['select', 1, true]], 90: [['up', 0, true], ['a', 0, true]], 100: [['a', 0, false], ['up', 0, false], ['select', 1, false]] };
  const frames = [];
  for (let f = 0; f < 120; f++) {
    const buttons = script[f] || [];
    for (const [b, c, down] of buttons) await j.call('button', { button: b, down, controller: c + 1 });
    await j.call('run', { frames: 1 });
    frames.push({ buttons });
  }
  const read = (address, length, space) => j.call('read', { address, length, space }).then(r => r.data);
  const out = { recorded: new Date().toISOString().slice(0, 10), jsnes: 'jsnes ' + ((await j.call('status')).jsnes || '2.1.0'), frames,
    ram: await read(0, 0x800, 'cpu'), nametables: await read(0x2000, 0x1000, 'ppu'), palette: await read(0x3F00, 0x20, 'ppu'), oam: await read(0, 0x100, 'oam') };
  const fx = path.join(__dirname, 'fixtures', 'machine.json');
  fs.mkdirSync(path.dirname(fx), { recursive: true });
  fs.writeFileSync(fx, JSON.stringify(out));
  console.log('recorded ' + path.relative(process.cwd(), fx) + ' (' + frames.length + ' frames)');
  if (framesArg) { await j.call('load', { path: path.resolve(framesArg) }); console.log('put back ' + framesArg); }
}

(async () => {
  const j = client();
  if (file === '--program') { await fixture(j); j.end(); process.exit(0); }
  await j.call('load', { path: path.resolve(file) });
  const m = Machine.fromSnapshot(file);
  const r0 = await j.call('registers');
  const regs = r => ({ pc: r.pc !== undefined ? r.pc : r.PC, a: r.a !== undefined ? r.a : r.A });
  console.log('start: jsnes PC ' + hex(regs(r0).pc) + ', kit PC ' + hex(m.cpu.pc) + ', frame ' + m.frames + ', line ' + m.line);
  const held = new Set();
  let diffs = 0, pcDiffs = 0, pcNote = '';
  for (let f = 1; f <= FRAMES; f++) {
    // the buttons for this frame
    if (rnd() % 6 === 0) {
      const b = buttons[rnd() % buttons.length];
      if (held.has(b)) { held.delete(b); m.release(b); await j.call('button', { button: b, down: false, controller: 1 }); }
      else { held.add(b); m.press(b); await j.call('button', { button: b, down: true, controller: 1 }); }
    }
    const r = await j.call('run', { frames: 1 });
    m.runFrames(1);
    const ram = Buffer.from((await j.call('read', { address: 0, length: 0x800, space: 'cpu' })).data, 'base64');
    const nt = Buffer.from((await j.call('read', { address: 0x2000, length: 0x1000, space: 'ppu' })).data, 'base64');
    const pal = Buffer.from((await j.call('read', { address: 0x3F00, length: 0x20, space: 'ppu' })).data, 'base64');
    const oam = Buffer.from((await j.call('read', { address: 0, length: 0x100, space: 'oam' })).data, 'base64');
    const jr = regs(await j.call('registers'));
    const bad = [];
    for (let a = 0; a < 0x800; a++) if (ram[a] !== m.ram[a] && (a < 0x100 || a >= 0x200)) bad.push('RAM ' + hex(a) + ' jsnes ' + hex(ram[a], 2) + ' kit ' + hex(m.ram[a], 2));
    for (let a = 0; a < 0x1000; a++) if (nt[a] !== m.ppu.peek(0x2000 + a)) bad.push('PPU ' + hex(0x2000 + a) + ' jsnes ' + hex(nt[a], 2) + ' kit ' + hex(m.ppu.peek(0x2000 + a), 2));
    for (let a = 0; a < 0x20; a++) if ((pal[a] & 0x3F) !== m.ppu.peek(0x3F00 + a)) bad.push('palette ' + hex(0x3F00 + a) + ' jsnes ' + hex(pal[a], 2) + ' kit ' + hex(m.ppu.peek(0x3F00 + a), 2));
    for (let a = 0; a < 0x100; a++) if (oam[a] !== m.ppu.oam[a]) bad.push('OAM ' + hex(a, 2) + ' jsnes ' + hex(oam[a], 2) + ' kit ' + hex(m.ppu.oam[a], 2));
    if (jr.pc !== m.cpu.pc) { pcDiffs++; if (!pcNote) pcNote = 'frame ' + f + ': PC jsnes ' + hex(jr.pc) + ' kit ' + hex(m.cpu.pc); }
    if (bad.length) {
      diffs++;
      console.log('frame ' + f + ' (' + r.reason + ', held ' + [...held].join(' ') + '): ' + bad.length + ' differ: ' + bad.slice(0, 8).join(', '));
      if (diffs >= 3) break;
    } else if (f % 100 === 0) console.log('frame ' + f + ': identical (PC ' + hex(m.cpu.pc) + ', held ' + [...held].join(' ') + ')');
  }
  if (pcDiffs) console.log('the program counter differed after ' + pcDiffs + ' frames (the snapshot does not say how far past the vertical blank\'s start the server stopped; first: ' + pcNote + ')');
  console.log(diffs ? 'DIFFERENT' : FRAMES + ' frames identical in RAM (the stack page left out), the PPU\'s memory and the sprite table');
  j.end();
  process.exit(diffs ? 1 : 0);
})().catch(e => { console.log(e.message); process.exit(1); });
