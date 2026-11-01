#!/usr/bin/env node
'use strict';
// Compare the cross widget with the original routine. Decode exported GIFs independently and
// compare every frame with the page's own sprite renderer, including the 107-frame animation.
const assert = require('assert'), vm = require('vm');
const { game } = require('../../../kit/scripts/port_check.js');
const { CPU } = require('../../../kit/cpu/cpu6502.js');
const g = game(__dirname); g.lib('c64');
const ram = g.listing().ram, page = g.read('reference/chiller-page.js');
const crossTaken = vm.runInNewContext('(' + /function crossTaken\([^\n]+/.exec(page)[0] + ')');
for (let who = 0; who < 2; who++) for (let col = 0; col < 16; col++) {
  const m = new Uint8Array(ram);
  m[0xFB] = 0x10; m[0xFC] = 4; m[0x410] = 0x57; m[0xD810] = col; m[0x5A08] = who;
  // Stop the scoring routine only after the original has decided and removed the cross.
  new CPU(m).call(0x7F50, { y: 0 }, { hooks: { [0x5B5E]: cpu => { cpu.rts(); } } });
  assert.strictEqual(crossTaken(who, col), m[0x410] === 0xA0, `player ${who}, colour ${col}`);
}
const sandbox = { C64, Uint8Array };
vm.runInNewContext(g.read('reference/chiller-gif.js'), sandbox);
const spriteMC = vm.runInNewContext('(' + /function spriteMC\([\s\S]*?\n  }/.exec(page)[0] + ')', { C64 });
function raster(pointer, colour) {
  const px = new Uint8Array(72 * 63);
  const ctx = { fillStyle: C64.PAL[0], fillRect(x, y, w, h) {
    const c = C64.PAL.indexOf(this.fillStyle); assert(c >= 0);
    for (let row = y; row < y + h; row++) px.fill(c, row * 72 + x, row * 72 + x + w);
  } };
  spriteMC(ctx, { ram }, pointer, 0, 0, 3, [colour, 9, 1]); return px;
}
function lzw(data, minSize) {
  const clear = 1 << minSize, end = clear + 1;
  let bit = 0, size, next, dict, prev;
  const reset = () => { size = minSize + 1; next = end + 1; dict = Array.from({ length: clear }, (_, i) => [i]); prev = null; };
  reset(); const output = [];
  while (bit + size <= data.length * 8) {
    let code = 0;
    for (let i = 0; i < size; i++, bit++) code |= ((data[bit >> 3] >> (bit & 7)) & 1) << i;
    if (code === clear) { reset(); continue; }
    if (code === end) return Uint8Array.from(output);
    let entry = dict[code];
    if (!entry && code === next && prev) entry = prev.concat(prev[0]);
    assert(entry, `Invalid GIF code ${code}`); output.push(...entry);
    if (prev) { dict[next++] = prev.concat(entry[0]); if (next === (1 << size) && size < 12) size++; }
    prev = entry;
  }
  assert.fail(`Missing GIF end code: decoded ${output.length} pixels, ${size} bits, next ${next}, stream ${data.length} bytes`);
}
function decode(bytes) {
  const text = (at, n) => Buffer.from(bytes.slice(at, at + n)).toString('ascii');
  const word = at => bytes[at] | bytes[at + 1] << 8;
  assert.strictEqual(text(0, 6), 'GIF89a');
  assert.strictEqual(word(6), 72); assert.strictEqual(word(8), 63);
  assert.strictEqual(bytes[10], 0xF3);
  for (let i = 0; i < 16; i++) {
    const rgb = [...bytes.slice(13 + i * 3, 16 + i * 3)].map(v => v.toString(16).padStart(2, '0')).join('');
    assert.strictEqual('#' + rgb, C64.PAL[i].toLowerCase());
  }
  let at = 61, delay = 0, loops = false; const frames = [];
  function blocks() {
    const data = [];
    for (let n = bytes[at++]; n; n = bytes[at++]) { data.push(...bytes.slice(at, at + n)); at += n; }
    return data;
  }
  while (at < bytes.length) {
    const marker = bytes[at++];
    if (marker === 0x3B) { assert(loops); return frames; }
    if (marker === 0x21) {
      const type = bytes[at++];
      if (type === 0xF9) {
        assert.strictEqual(bytes[at++], 4); assert.strictEqual(bytes[at++] & 1, 0);
        delay = word(at) * 10; at += 2; at++; assert.strictEqual(bytes[at++], 0);
      } else if (type === 0xFF) {
        const len = bytes[at++], name = text(at, len); at += len;
        const payload = blocks(); loops = name === 'NETSCAPE2.0' && payload[1] === 0 && payload[2] === 0;
      } else blocks();
      continue;
    }
    assert.strictEqual(marker, 0x2C);
    assert.strictEqual(word(at), 0); assert.strictEqual(word(at + 2), 0);
    assert.strictEqual(word(at + 4), 72); assert.strictEqual(word(at + 6), 63); at += 8;
    assert.strictEqual(bytes[at++], 0);
    const minSize = bytes[at++], px = lzw(blocks(), minSize);
    assert.strictEqual(px.length, 72 * 63); assert.strictEqual(delay, 160); frames.push(px);
  }
  assert.fail('Missing GIF trailer');
}
const jobs = [];
for (let who = 0; who < 2; who++) for (let direction = 0; direction < 2; direction++)
  jobs.push({ pointers: [0, 1, 2, 3].map(i => 0xD8 + who * 16 + direction * 4 + i), colour: 10 });
const colours = [[2,3,4,5,6],[6,7,7,5,7],[11,11,11,5,12],[2,3,4,5,9],[0,3,4,5,6],
  [0,11,1,5,11],[2,3,14,5,9],[11,11,11,5,1],[11,7,7,5,7],[2,3,4,5,0]];
const seen = new Set();
for (let screen = 0; screen < 10; screen++) {
  const rec = ram[0x7290 + 2 * screen] | ram[0x7291 + 2 * screen] << 8;
  for (let slot = 0; slot < 5; slot++) {
    const first = ram[rec + 0x1D + slot], last = ram[rec + 0x22 + slot], key = first + '-' + last;
    if (seen.has(key) || first === last) continue; seen.add(key);
    const pointers = [];
    for (let p = first; pointers.length < 256; p = (p + 1) & 255) { pointers.push(p); if (p === last) break; }
    jobs.push({ pointers, colour: colours[screen][slot] });
  }
}
let total = 0;
for (const { pointers, colour } of jobs) {
  const frames = decode(sandbox.ChillerGIF.encode(ram, pointers, colour));
  assert.strictEqual(frames.length, pointers.length);
  frames.forEach((px, i) => { assert.deepStrictEqual(px, raster(pointers[i], colour)); total++; });
}
assert(jobs.some(j => j.pointers.length === 107));
console.log(`OK — 32 original-code cross cases; ${jobs.length} GIFs and ${total} decoded frames match the page renderer.`);
