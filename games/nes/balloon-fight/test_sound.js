#!/usr/bin/env node
'use strict';
// The music player on index.html runs the game's own sound driver, embedded as data, on the
// kit's 6502 (the block nes-music). This holds the page to the listing: the embedded driver is
// the listing's bytes at $F500-$FFF6, every store to the APU inside the driver is among the
// hooks the page logs writes from, each tune the page lists makes writes to the chip when
// started by its request bit, the short tunes end, and the bonus tune loops.
const path = require('path');
const assert = require('assert');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502'); g.lib('apu');
const { createDriver, TUNES, tuneLog } = g.run('index.html', 'nes-music', 'createDriver', 'TUNES', 'tuneLog');
const page = g.read('index.html');
const data = JSON.parse(/<script type="application\/json" id="bf-data">([\s\S]*?)<\/script>/.exec(page)[1]);
const L = g.listing();
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log('ok   ' + name); };

check('the embedded driver is the listing\'s $F500-$FFF6', () => {
  const bytes = Buffer.from(data.driver, 'base64');
  assert.strictEqual(data.driver_base, 0xF500);
  assert.strictEqual(bytes.length, 0xFFF7 - 0xF500);
  for (let i = 0; i < bytes.length; i++) assert.strictEqual(bytes[i], L.ram[0xF500 + i], 'byte at $' + (0xF500 + i).toString(16));
});
check('every store to the APU in the driver is hooked', () => {
  const hooked = new Set(data.stores.map(s => s[0]));
  const recs = L.listing.records || L.listing;
  for (const r of recs) {
    if (r.a < 0xF500 || !r.m || !/^st[axy]$/i.test(r.m) || !r.b) continue;
    if (r.b.length === 3) { const t = r.b[1] | (r.b[2] << 8); if (t >= 0x4000 && t <= 0x4017) assert.ok(hooked.has(r.a), 'store at $' + r.a.toString(16) + ' not hooked'); }
    if (r.b.length === 2 && r.b[0] === 0x91) assert.ok(hooked.has(r.a), 'indirect store at $' + r.a.toString(16) + ' not hooked');
  }
  assert.ok(data.stores.length >= 30, 'only ' + data.stores.length + ' hooks');
});
check('every tune and effect writes to the chip, the short ones end, the bonus tune loops', () => {
  for (const t of TUNES) {
    const log = tuneLog(data, C64Cpu, t);
    const own = log.writes.filter(w => (w[1] & 0x1f) !== 0x17 && w[1] !== 0x4015);
    assert.ok(own.length > 0, t.name + ' wrote nothing but the frame counter');
    const d = createDriver(data, C64Cpu); d.init(t.req, false);
    let f = 0; for (; f < 3000 && (d.play(), d.playing()); f++);
    if (t.req[0] === 0xF2 && t.req[1] === 0x20) assert.strictEqual(f, 3000, 'the bonus tune stopped at frame ' + f);
    else if (t.hold) assert.ok(f < 5, t.name + ' kept playing without its request: ' + f + ' frames');
    else if (t.kind === 'tune') assert.ok(f < 3000 && f >= 10, t.name + ' played for ' + f + ' frames');
  }
});
check('the thunder request makes no sound', () => {
  const d = createDriver(data, C64Cpu); d.init([0xF1, 0x08]);
  let n = 0; for (let f = 0; f < 90; f++) n += d.play().filter(w => (w[0] & 0x1f) !== 0x17).length;
  assert.strictEqual(n, 0);
});
console.log(passed + ' passed');
