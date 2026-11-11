'use strict';
// Rebuild the page's two music recordings from the original driver in the listing.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../../..');
const { CPU } = require(path.join(root, 'kit/cpu/cpu6502.js'));
vm.runInThisContext(fs.readFileSync(path.join(root, 'site/lib/c16.js'), 'utf8'));

function musicLog(source, title) {
  const m = source.slice(), writes = [], frameCycles = 35568;
  let frame = 0, at = 0, cpu;
  m.fill(0, 0xFF0E, 0xFF13);
  m[0xFF12] = 0xC0;
  m[0x60] = 255;
  m[0x72] = title ? 8 : 0;
  m[0x25] = m[0x26] = m[0x6E] = m[0x71] = 0;
  const io = C16.io(m, { log: writes, now: () => frame * frameCycles + cpu.cycles - at });
  cpu = new CPU(m, { ioPages: [0xFF], io });
  cpu.call(0x8255);
  const frames = (title ? 1104 : 1568) + 1;
  for (frame = 0; frame < frames; frame++) {
    at = cpu.cycles;
    cpu.call(0x8170);
  }
  return { clock: 1773447, frame: frameCycles, start: 0, end: frames * frameCycles, writes };
}

function image() {
  const m = new Uint8Array(65536);
  for (const r of JSON.parse(fs.readFileSync(path.join(__dirname, 'listing.json'))).records)
    if (r.b) m.set(r.b, r.a);
  return m;
}

function effectLog(source, kind) {
  const m = source.slice(), writes = [];
  let frame = 0, at = 0, cpu;
  m.set(m.slice(0x6D29, 0x6D42), 0x0400);
  m.fill(0, 0xFF00, 0xFF20);
  m[0xFF12] = 0xC0;
  m[0x25] = m[0x26] = m[0x4F] = m[0x53] = 0;
  m[0x42] = 1;
  m[0x44] = 3;
  m[0x43] = kind === 'complete' ? 2 : 0;
  m[0x17] = m[0x18] = m[0x14] = m[0x15] = 10;
  const base = 0x2800 + 10 * 38 + 10 - 39;
  m[0x0C] = m[0x0E] = m[0x10] = base & 255;
  m[0x0D] = m[0x11] = base >> 8;
  m[0x0F] = (base >> 8) - 6;
  const io = C16.io(m, { log: writes, now: () => frame * 35568 + cpu.cycles - at });
  cpu = new CPU(m, { ioPages: [0xFF], io });
  if (kind === 'death') cpu.call(0x6E32);
  else if (kind === 'enemy') cpu.call(0x704C, { a: 2 }, { hooks: { 0x6FF1(c) { c.rts(); } } });
  else cpu.call(0x6C68, { a: kind === 'complete' ? 6 : 5 });
  for (frame = 1; frame < 40; frame++) {
    if (!(frame & 1)) continue;
    m[0x20] = frame;
    at = cpu.cycles;
    cpu.call(0x6856, {}, { hooks: { 0x6883(c) { c.rts(); } } });
  }
  return { clock: 1773447, frame: 35568, start: 0, end: 40 * 35568, writes };
}

function digest(log) {
  return crypto.createHash('sha256').update(JSON.stringify(log.writes.map(x => x.slice(1)))).digest('hex');
}

if (require.main === module) {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const match = html.match(/<script type="application\/json" id="ic-audio">([\s\S]*?)<\/script>/);
  assert(match, 'the page must embed its music logs');
  const data = JSON.parse(match[1]), m = image();
  for (const [key, title] of [['game', false], ['title', true]]) {
    const log = musicLog(m, title);
    assert.deepStrictEqual(data[key], log, key + ' music drifted from the original driver');
    assert(log.writes.length > 500, 'a recording must exercise the music');
    const privateCapture = path.join(__dirname, 'work/live-audio-' + key + '.json');
    if (fs.existsSync(privateCapture)) {
      const live = JSON.parse(fs.readFileSync(privateCapture));
      assert.strictEqual(digest(log), digest(live), key + ' register writes differ from plus4emu');
    }
    console.log(key + ': ' + log.writes.length + ' original-driver writes, digest ' + digest(log));
  }
  vm.runInThisContext(fs.readFileSync(path.join(root, 'site/lib/ted-sound.js'), 'utf8'));
  for (const kind of ['collect', 'complete', 'death', 'enemy']) {
    const log = effectLog(m, kind);
    assert.deepStrictEqual(data.effects[kind], log, kind + ' effect drifted');
    const samples = TEDSound.render(log, 22050);
    assert(samples.some(x => Math.abs(x) > 0.001), kind + ' effect must be audible');
  }
}

module.exports = { musicLog, effectLog, image, digest };
