// Decode the exported GIF independently and compare every pixel with the diagram.
'use strict';
const assert = require('node:assert/strict');
const { encodeGif, sceneIndex, setScene } = require('./reference/goonies-scenes.js');
for (const [value, expected] of [['1', 0], ['8', 7], ['0', 0], ['9', 0], ['2.5', 0], ['oops', 0]]) {
  global.location = { href: 'https://example.test/levels.html?scene=' + value };
  assert.equal(sceneIndex(), expected);
}
global.location = { href: 'https://example.test/levels.html?other=kept#map' };
global.history = { replaceState: (_state, _title, url) => { global.location.href = String(url); } };
setScene(8);
assert.equal(new URL(global.location.href).searchParams.get('other'), 'kept');
assert.equal(new URL(global.location.href).hash, '#map');
assert.equal(sceneIndex(), 7);
delete global.history; delete global.location;
const listing = require('./listing.json');
const ram = new Uint8Array(65536);
for (const r of listing.records) if (r.b) ram.set(r.b, r.a);
const word = a => ram[a] | ram[a + 1] << 8;

function decode(bytes) {
  let p = 0;
  const byte = () => bytes[p++];
  const u16 = () => byte() | byte() << 8;
  const skip = n => { p += n; };
  const blocks = () => { const b = []; for (let n; (n = byte());) { b.push(...bytes.slice(p, p + n)); skip(n); } return b; };
  assert.equal(Buffer.from(bytes.slice(0, 6)).toString(), 'GIF89a'); skip(6);
  const width = u16(), height = u16(), flags = byte(); skip(2);
  assert(flags & 128);
  const palette = Array.from({ length: 2 ** ((flags & 7) + 1) }, () => [byte(), byte(), byte(), 255]);
  const frames = []; let delay = 0;
  while (p < bytes.length) {
    const tag = byte();
    if (tag === 0x3B) break;
    if (tag === 0x21) {
      const kind = byte();
      if (kind === 0xF9) { assert.equal(byte(), 4); byte(); delay = u16(); skip(2); }
      else blocks();
      continue;
    }
    assert.equal(tag, 0x2C);
    assert.equal(u16(), 0); assert.equal(u16(), 0);
    assert.equal(u16(), width); assert.equal(u16(), height); assert.equal(byte(), 0);
    const min = byte(), data = blocks(), clear = 1 << min, end = clear + 1;
    let bits = 0, size = min + 1, dictionary = [], previous = null;
    const output = [];
    function reset() { dictionary = Array.from({length: clear}, (_, i) => [i]); dictionary.push(null, null); size = min + 1; previous = null; }
    function code() { let v = 0; for (let i = 0; i < size; i++, bits++) v |= ((data[bits >> 3] >> (bits & 7)) & 1) << i; return v; }
    reset();
    while (bits < data.length * 8) {
      const c = code();
      if (c === clear) { reset(); continue; }
      if (c === end) break;
      const entry = dictionary[c] || (c === dictionary.length && previous ? [...previous, previous[0]] : null);
      assert(entry, 'invalid GIF dictionary reference'); output.push(...entry);
      if (previous && dictionary.length < 4096) { dictionary.push([...previous, entry[0]]); if (dictionary.length === 2 ** size && size < 12) size++; }
      previous = entry;
    }
    assert.equal(output.length, width * height);
    const rgba = Uint8ClampedArray.from(output.flatMap(i => palette[i]));
    frames.push({ width, height, data: rgba, delay });
  }
  return frames;
}

// Render from the listing, independently of the browser's canvas drawing code.
function diagram(scene, x) {
  const width = 448, height = 120, data = new Uint8ClampedArray(width * height * 4);
  const rect = (left, top, w, h, col) => {
    assert(left >= 0 && left + w <= width && top + h <= height);
    for (let y = top; y < top + h; y++) for (let px = left; px < left + w; px++) data.set([...col, 255], (y * width + px) * 4);
  };
  rect(0, 0, width, height, [0, 0, 0]);
  for (let c = 0; c < width; c += 32) rect(c, 0, 1, height, [46, 46, 46]);
  const block = word(0x7049 + 4 * scene), frame = x & 2 ? 2 : 0, a = word(block + 8 * frame + 2 * (x & 3));
  const cols = [null, [129, 51, 56], [46, 44, 155], [255, 255, 255]];
  for (let y = 0; y < ram[a + 1]; y++) for (let col = 0; col < ram[a]; col++) {
    const value = ram[a + 2 + y * ram[a] + col];
    for (let k = 0; k < 4; k++) { const v = (value >> (6 - 2 * k)) & 3; if (v) rect((x >> 2) * 32 + (col * 8 + k * 2) * 4, 24 + y * 4, 8, 4, cols[v]); }
  }
  rect(8 * x, 0, 2, 20, [255, 225, 77]);
  return { width, height, data };
}
let count = 0;
for (const scene of [0, 2, 1, 3, 4, 5, 6, 7]) {
  const frames = [], block = word(0x7049 + 4 * scene);
  for (let x = 8;; x += 2) {
    const a = word(block + 8 * (x & 2 ? 2 : 0) + 2 * (x & 3));
    if ((x >> 2) * 8 + ram[a] * 8 > 112) break;
    frames.push(diagram(scene, x));
  }
  const decoded = decode(encodeGif(frames));
  assert.equal(decoded.length, frames.length);
  decoded.forEach((f, i) => { assert.equal(f.delay, 8); assert.deepEqual(f.data, frames[i].data); });
  count += frames.length;
}
// Exercise long dictionary growth, resets, and every palette index.
const noise = { width: 256, height: 256, data: new Uint8ClampedArray(256 * 256 * 4) };
let random = 0x13579B;
for (let i = 0; i < noise.data.length; i += 4) { random ^= random << 13; random ^= random >>> 17; random ^= random << 5; const v = random & 255; noise.data.set([v, v, v, 255], i); }
assert.deepEqual(decode(encodeGif([noise]))[0].data, noise.data);
console.log(`OK - ${count} walking frames across eight scenes preserve every pixel and the 80 ms pace; a 256-colour image exercises dictionary resets`);
