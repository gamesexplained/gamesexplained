'use strict';
const path = require('path');
const assert = require('assert');
const { game } = require('../../../kit/scripts/port_check.js');
const { CPU } = require('../../../kit/cpu/cpu6502.js');
const g = game(__dirname);
g.sameBlock('icicle-core');
g.lib('c16');
const { IC } = g.run('index.html', 'icicle-core', 'IC');
const source = g.listing().ram;

// Every map, toy-copy window, time and initial character cell is checked
// against the original room loader. TED's raster flag is held ready here.
for (let room = 0; room < 16; room++) {
  const m = source.slice();
  m[0xFF09] = 2;
  m[0x4F] = m[0x25] = m[0x82] = 0;
  m[0x53] = room;
  m[0xA5F1 + room] = 1;
  new CPU(m).call(0x6377, {}, { maxSteps: 400000 });
  const decoded = IC.decodeRoom(source, room);
  assert.deepStrictEqual(Array.from(decoded.tiles), Array.from(m.slice(0x2200, 0x2602)));
  assert.deepStrictEqual(Array.from(decoded.tiles), Array.from(m.slice(0x2800, 0x2C02)));
  assert.deepStrictEqual(Array.from(IC.worldChars(source, decoded.tiles)), Array.from(m.slice(0x1000, 0x2008)));
  const toy = IC.word(source, 0xA5D1 + 2 * room);
  assert.deepStrictEqual(Array.from(m.slice(0x55A8, 0x5768)), Array.from(source.slice(toy, toy + 448)));
  const seconds = (m[0x4E] >> 4) * 1000 + (m[0x4E] & 15) * 100 + (m[0x4D] >> 4) * 10 + (m[0x4D] & 15);
  assert.strictEqual(decoded.time, seconds);
  for (let count = 0; count <= decoded.parts; count++) {
    const x = m.slice();
    x.fill(0, 0xE9B, 0xF6C);
    const c = new CPU(x);
    for (let part = 0; part < count; part++) {
      x[0x43] = part;
      c.call(0x73F7);
    }
    const chars = [];
    for (let y = 0; y < 6; y++) for (let xx = 0; xx < 10; xx++) chars.push(x[0xE9B + y * 40 + xx]);
    assert.deepStrictEqual(Array.from(IC.toyChars(source, room, count)), chars);
  }
}

// The animated live charset is checked through every combination of its
// 8-, 4- and 6-frame periods: their combined period is 24 updates.
for (let tick = 0; tick < 24; tick++) {
  const m = source.slice();
  m.set(source.slice(0x7498, 0x7C98), 0x5000);
  m[0x20] = m[0x2C] = 0;
  m[0x16] = (tick + 255) & 255;
  m[0x2D] = (tick % 6 + 255) & 255;
  new CPU(m).call(0x69D2);
  assert.deepStrictEqual(Array.from(IC.fontFor(source, tick)), Array.from(m.slice(0x5000, 0x5800)));
}

// Hold the custom glyph renderer against the shared TED renderer for all
// 256 glyph codes, in both monochrome and multicolour text.
for (const attribute of [0x71, 0x79]) {
  const m = source.slice(), font = IC.fontFor(source), chars = Uint8Array.from({ length: 256 }, (_, i) => i);
  m.set(font, 0x5000);
  m.fill(attribute, 0x800, 0xC00);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) m[0xC00 + y * 40 + x] = y * 16 + x;
  const ted = new Uint8Array(32);
  ted[6] = 0x1B; ted[7] = 0x98; ted[0x13] = 0x50; ted[0x14] = 8;
  ted[0x15] = 0x56; ted[0x16] = 0x22; ted[0x17] = 6;
  const reference = C16.rgba(C16.render(m, ted));
  const picture = IC.pixels(font, chars, 16, 16, attribute);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++)
    for (let c = 0; c < 4; c++) assert.strictEqual(picture.rgba[(y * 128 + x) * 4 + c], reference[(y * 320 + x) * 4 + c]);
}

for (let gate = 0; gate < 256; gate++) for (let tile = 0; tile < 16; tile++) {
  const cells = [8, 8, 8, tile, 12, 8, 8, 8, 8], m = source.slice(), base = 0x2800 + 10 * 38 + 10 - 39;
  m[0x10] = base & 255; m[0x11] = base >> 8; m[0x14] = m[0x15] = 10;
  m[0xFF1E] = gate; m[0xFF00] = 0;
  for (const [i, off] of [[1, 1], [3, 0x26], [4, 0x27], [5, 0x28], [7, 0x4D]]) m[base + off] = cells[i];
  new CPU(m).call(0x70F9);
  const expected = IC.waterStep(cells, gate).cells;
  for (const [i, off] of [[1, 1], [3, 0x26], [4, 0x27], [5, 0x28], [7, 0x4D]]) assert.strictEqual(m[base + off], expected[i]);
}

const bcd = n => (Math.floor(n / 1000) << 12) | (Math.floor(n / 100) % 10 << 8) | (Math.floor(n / 10) % 10 << 4) | n % 10;
for (const rate of [50, 60]) for (let divider = 0; divider < 256; divider++)
  for (const time of [0, 1, 9, 10, 40, 59, 99, 100, 120, 999]) {
    const m = source.slice(), timeBcd = bcd(time);
    m[0x4A] = 255; m[0x4B] = rate; m[0x4C] = divider; m[0x4D] = timeBcd & 255; m[0x4E] = timeBcd >> 8;
    new CPU(m).call(0x6AFB);
    const result = IC.clockTick({ rate, divider, time, running: true });
    assert.strictEqual(m[0x4C], result.divider);
    assert.strictEqual(m[0x4D] | m[0x4E] << 8, bcd(result.time));
    assert.strictEqual(!!m[0x4A], result.running);
  }

// Feed the actual name-entry loop at its keyboard-buffer read. This tests
// accepted bytes, DELETE, RETURN, and the five-character boundary.
function originalName(sequence) {
  const m = source.slice(), cpu = new CPU(m);
  m[0x45] = 0; m[0x46] = 9;
  let i = 0;
  cpu.call(0x8D5E, { a: 0 }, { maxSteps: 200000, hooks: {
    0x8DE6() { m[0xEF] = 1; m[0x527] = i < sequence.length ? sequence[i++] : 13; }
  } });
  return Array.from(m.slice(0x8C8D, 0x8C92));
}
function portName(sequence) {
  let state = { text: '', done: false };
  for (const code of sequence) state = IC.nameFeed(state, code);
  return Array.from(state.text.padEnd(5, ' '), c => c === ' ' ? 0 : c.charCodeAt(0) + 0x4F);
}
for (let byte = 0; byte < 256; byte++) assert.deepStrictEqual(portName([byte, 13]), originalName([byte, 13]));
for (const sequence of [[65,66,67,68,69,70,13], [65,66,20,67,13], [20,65,32,66,13], [65,13,66]])
  assert.deepStrictEqual(portName(sequence), originalName(sequence));
console.log('16 room loads and toy assembly orders; 24 animation states; 512 glyph modes; 4,096 water cases; 5,120 timer cases; 260 name-entry sequences passed');
