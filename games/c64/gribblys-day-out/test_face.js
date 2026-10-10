#!/usr/bin/env node
// Hold How it works' port of animate_face (animateFace in index.html, the face widget) against the
// game's own routine at $6AAD, run in kit/c64/cpu6502.js on the bytes of the committed listing.json:
// every frame counter 0-255, eight times over, with random SID ($D41B) and raster ($D012) bytes and
// points waiting to be added, taken off, both or neither. After every call the three sprite shapes,
// $3040-$30FF, must agree byte for byte. Needs no snapshot and no emulator. Exits 1 on any difference.
//   node games/c64/gribblys-day-out/test_face.js
'use strict';
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname);
g.lib('c64');

const { animateFace } = g.run('index.html', 'animateFace');

(async () => {
  const base = (await C64.load('listing.json')).ram;
  let sid = 0, raster = 0;
  const io = { read(addr) { if (addr === 0xD41B) return sid; if (addr === 0xD012) return raster; throw new Error('read ' + addr.toString(16)); },
               write(addr) { throw new Error('write ' + addr.toString(16)); } };
  const cpu = new CPU(Uint8Array.from(base), { port: { dir: 0x2F, data: 0x25 }, io });    // start_game's $01
  const port = Uint8Array.from(base);
  let seed = 11, n = 0, fail = 0;
  const rnd = k => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % k; };
  for (let lap = 0; lap < 8; lap++) for (let f = 0; f < 256; f++) {
    sid = rnd(256); raster = rnd(256);
    const add = [0, 0, 1, 37][rnd(4)], sub = [0, 1, 0, 20][rnd(4)];
    cpu.m[0x2E] = f; cpu.m[0x26] = add; cpu.m[0x30] = sub;
    cpu.call(0x6AAD, {}, {});
    animateFace(port, f, sid, raster, add, sub);
    n++;
    const got = cpu.m.subarray(0x3040, 0x3100), want = port.subarray(0x3040, 0x3100);
    if (got.join() !== want.join() && fail++ < 5) console.log('DIFFERS', { f, sid, raster, add, sub });
  }
  console.log(`${n} calls; ${fail ? fail + ' FAILED' : 'all match'}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log(e.stack || e); process.exit(1); });
