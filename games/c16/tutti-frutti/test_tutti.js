'use strict';

const assert = require('node:assert/strict');
const {game} = require('../../../kit/scripts/port_check.js');
const g = game(__dirname);
g.lib('c16', 'cpu6502', 'ted-sound');
const {ram} = g.listing();

function embedded(page, id) {
  const match = g.read(page).match(new RegExp(`<script type="application/json" id="${id}">([^<]+)</script>`));
  assert.ok(match, id);
  return JSON.parse(match[1]);
}

const {orchardData, drawOrchard} = g.run('levels.html', 'tutti-map', 'orchardData', 'drawOrchard');
const expectedCounts = [
  [46,108,32,6,0,0,0,0],
  [36,128,6,6,0,0,16,0],
  [123,0,0,0,64,4,0,1],
  [47,99,40,6,0,0,0,0],
  [37,127,6,6,0,0,16,0],
  [115,0,0,0,72,4,0,1],
];
for (let level = 1; level <= 6; level++) {
  const {start, tiles} = orchardData(ram, level);
  const board = drawOrchard(ram, level);
  assert.equal(tiles.length, 192);
  assert.deepEqual(Array.from({length: 8}, (_, i) => tiles.filter(tile => tile === i).length), expectedCounts[level - 1]);
  assert.deepEqual(Array.from(board.board), Array.from(ram.slice(start, start + 96)));
  assert.equal(board.px.length, 256 * 192);
  assert.ok(new Set(board.px).size >= 4, `layout ${level} has a rendered palette`);
}

const {drawingCells, movingDrawing} = g.run('graphics.html', 'tutti-shapes', 'drawingCells', 'movingDrawing');
assert.deepEqual(movingDrawing(7.9, 1, 0, 4), {phase: 1, offsetX: 4, offsetY: 0});
assert.deepEqual(movingDrawing(8, 1, 0, 4), {phase: 0, offsetX: 0, offsetY: 0});
assert.deepEqual(movingDrawing(2, -1, 0, 2), {phase: 3, offsetX: 6, offsetY: 0});
assert.deepEqual(movingDrawing(6, 0, -1, 2), {phase: 1, offsetX: 0, offsetY: 2});
assert.deepEqual(movingDrawing(4, 1, 1, 4), {phase: 3, offsetX: 4, offsetY: 4});
function queueCells(kind, direction, phase) {
  const mem = ram.slice();
  mem.fill(0xFF, 0x370, 0x380);
  mem[0xE2] = kind === 'falling' ? 2 : 6;
  const cpu = new C64Cpu.CPU(mem, {ramSize: 0x4000});
  const actor = kind === 'strawberry' || kind === 'enemy';
  const slot = kind === 'strawberry' ? 0 : kind === 'enemy' ? 1 : kind === 'cherry' ? 7 : 0;
  const x = actor ? 0x360 : 0x340;
  const y = actor ? 0x368 : 0x348;
  const dirs = actor ? 0x370 : 0x378;
  mem[x + slot] = direction === 2 ? 0 : phase * (actor ? 2 : 1);
  mem[y + slot] = direction === 2 ? phase * (actor ? 2 : 1) : 0;
  mem[dirs + slot] = direction;
  mem[0x64] = kind === 'cherry' ? 0x28 : 0;
  mem[0xE4] = 0;
  cpu.call(actor ? 0x3000 : 0x3200);
  const count = mem[0xE4] + (actor ? 0 : 1);
  return Array.from({length: count}, (_, i) => [
    (mem[0x380 + i] | (mem[0x3D0 + i] << 8)) - 0xC00,
    mem[0x420 + i],
    mem[0x470 + i],
  ]);
}
let shapes = 0;
for (const kind of ['strawberry','enemy','falling','apple','cherry']) {
  const actor = kind === 'strawberry' || kind === 'enemy';
  const directions = actor ? [0,1,2] : kind === 'falling' ? [2] : [0,2];
  for (const direction of directions) {
    for (let phase = 0; phase < (actor ? 2 : 4); phase++) {
      assert.deepEqual(drawingCells(ram, kind, direction, phase), queueCells(kind, direction, phase),
        `${kind} direction ${direction}, phase ${phase}`);
      shapes++;
    }
  }
}

const traces = embedded('discoveries.html', 'tf-slide-data');
for (let i = 0; i < traces.length; i++) {
  const mem = ram.slice();
  const cpu = new C64Cpu.CPU(mem, {ramSize: 0x4000});
  mem[0xE2] = 5;
  cpu.call(0x2940, {x: 3});
  mem[0xE2] = 6;
  mem.fill(0xFF, 0x378, 0x380);
  mem[0x360] = 48;
  mem[0x368] = 0;
  mem[0x370] = 0x83;
  mem[0xF6] = 0x02;
  mem[0x33F] = i === 0 ? 126 : 0;
  cpu.call(0x2CB3);
  // The delayed branch returns one caller early. Keep the same JSR frame as the IRQ's fruit update.
  mem.set([0x20, 0x80, 0x33, 0x60], 0x700);
  for (const [delay, y] of traces[i]) {
    assert.equal(mem[0x33F], delay);
    assert.equal(mem[0x34F], y);
    cpu.call(0x700);
    cpu.call(0x2400);
  }
}

function readPitches(writes) {
  const register = new Uint8Array(32);
  const voices = [[],[]];
  for (const [, address, value] of writes) {
    register[address & 31] = value;
    if (address === 0xFF12) voices[0].push(register[14] + (value & 3) * 256);
    if (address === 0xFF10) voices[1].push(register[15] + (value & 3) * 256);
  }
  return voices;
}

const tracks = embedded('index.html', 'tf-audio-data');
const soundCases = [
  [0x2B00, 1550, {0xE0: 255, 0xE1: 255}],
  [0x1780, 1550, {0xE0: 255, 0xE1: 255}],
  [0x23D0, 111, {0xE2: 3, 0xE6: 0xE0}],
  [0x1B40, 176, {0x90: 0xC0}],
  [0x1F00, 165, {0x90: 0xC0}],
];
for (let i = 0; i < soundCases.length; i++) {
  const [entry, ticks, setup] = soundCases[i];
  const mem = ram.slice();
  for (const [address, value] of Object.entries(setup)) mem[Number(address)] = value;
  const writes = [];
  const io = C16.io(mem, {log: writes});
  const cpu = new C64Cpu.CPU(mem, {ramSize: 0x4000, ioPages: [0xFD,0xFF], io});
  for (let tick = 0; tick < ticks; tick++) cpu.call(entry);
  const clip = TEDSound.unpack(tracks[i].log);
  const pitches = readPitches(clip.writes);
  if (i === 0) pitches[0].shift(); // Engine startup sets TED's character source before the title tune.
  assert.deepEqual(pitches, readPitches(writes), tracks[i].name);
  const samples = TEDSound.render(clip, 11025);
  assert.ok(samples.some(sample => Math.abs(sample) > 0.01), tracks[i].name + ' has audible output');
}
console.log(`Tutti Frutti: six maps, ${shapes} drawing records, two 128-tick slide traces, and five TED recordings verified.`);
