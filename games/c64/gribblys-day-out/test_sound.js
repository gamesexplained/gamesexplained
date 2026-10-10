#!/usr/bin/env node
// Hold How it works' port of the sound driver (createDriver in index.html, the tune and effects
// players) against the game's own driver at $7554, run in kit/c64/cpu6502.js on the bytes of the
// committed listing.json: every SID write of every call, in order, and the driver's zero-page state
// after it. The title tune through two passes and more; every effect on both voices, flagged and
// not, until both voices are idle; 300 runs of random requests on both voices, as play makes them.
// Then the tune player's timing: the page's player, site/lib/sid.js with the period the page passes,
// calls the driver 208 times in 500 PAL frames, as the game did live (facts.md). Needs no snapshot
// and no emulator. Exits 1 on any difference.
//   node games/c64/gribblys-day-out/test_sound.js
'use strict';
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname);
g.lib('c64', 'sid');

const { createDriver } = g.run('index.html', 'createDriver');

(async () => {
  const ram = (await C64.load('listing.json')).ram;
  const slice = (lo, hi) => Array.from(ram.slice(lo, hi + 1));
  const DATA = { inst: slice(0xFB00, 0xFB61), fx: slice(0xFB80, 0xFCFF), freq: slice(0xFD00, 0xFDFF),
    v1: slice(0xFE00, 0xFE60), v2: slice(0xFE80, 0xFEDF), v3: slice(0xFF00, 0xFF5F), requests: [[]] };
  let fail = 0, calls = 0, nwrites = 0;
  function machine() {
    let w = [];
    const io = { write(addr, v) { if (addr >= 0xD400 && addr <= 0xD418) w.push(addr - 0xD400, v); else throw new Error('write ' + addr.toString(16)); },
                 read(addr) { throw new Error('read ' + addr.toString(16)); } };
    const cpu = new CPU(Uint8Array.from(ram), { port: { dir: 0x2F, data: 0x25 }, io });   // start_game's $01
    for (let r = 0xC0; r <= 0xDD; r++) cpu.m[r] = 0;
    for (const r of [0x9E, 0x9F, 0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xAA, 0xE1, 0xED, 0xEE, 0xEF]) cpu.m[r] = 0;
    cpu.m[0x79] = 5;
    return { cpu, call() { w = []; cpu.call(0x7554); return w; } };
  }
  const ZP = [0x9D, 0x9E, 0x9F, 0xA1, 0xA2, 0xA3, 0xA4, 0xAA, 0xE1, 0xED, 0xEE];
  for (let r = 0xC0; r <= 0xDD; r++) ZP.push(r);
  function compare(what, M, d) {
    const w0 = M.call(); d.sound(); const w1 = d.writes.slice(); d.writes.length = 0;
    calls++; nwrites += w0.length / 2;
    if (w0.join() !== w1.join()) { if (fail++ < 5) console.log('DIFFERS', what, 'writes', w0.join(), '|', w1.join()); return false; }
    for (const r of ZP) if (M.cpu.m[r] !== d.z[r]) { if (fail++ < 5) console.log('DIFFERS', what, 'zero page', r.toString(16), M.cpu.m[r], d.z[r]); return false; }
    return true;
  }
  // the title tune: setup, then two whole passes and more (the $FE reload, the $FF loop)
  {
    const M = machine(), d = createDriver(Object.assign({ kind: 'tune' }, DATA));
    d.init(0); M.cpu.m[0x9D] = 0x11;
    for (let k = 0; k < 900; k++) if (!compare('tune call ' + k, M, d)) break;
  }
  // every effect on both voices, flagged and not, from a quiet start until both voices are idle
  for (let n = 1; n <= 24; n++) for (const v of [0x9E, 0x9F]) for (const f of [0, 0x80]) {
    const M = machine(), d = createDriver(Object.assign({ kind: 'fx' }, DATA));
    d.init(0); d.z[0x9D] = M.cpu.m[0x9D] = 0x12;
    compare('setup', M, d);
    M.cpu.m[v] = d.z[v] = n | f;
    for (let k = 0; k < 400; k++) {
      if (!compare(`effect ${n | f} on ${v.toString(16)} call ${k}`, M, d)) break;
      if (!M.cpu.m[0xC6] && !M.cpu.m[0xD5] && !M.cpu.m[0x9E] && !M.cpu.m[0x9F]) break;
    }
  }
  // random requests on both voices at random calls
  let seed = 20261009;
  const rnd = n => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
  for (let run = 0; run < 300; run++) {
    const M = machine(), d = createDriver(Object.assign({ kind: 'fx' }, DATA));
    d.init(0); d.z[0x9D] = M.cpu.m[0x9D] = 0x12;
    compare('setup', M, d);
    for (let k = 0; k < 120; k++) {
      for (const v of [0x9E, 0x9F]) if (rnd(6) === 0) { const n = (1 + rnd(24)) | (rnd(3) === 0 ? 0x80 : 0); M.cpu.m[v] = d.z[v] = n; }
      if (!compare(`random run ${run} call ${k}`, M, d)) break;
    }
  }
  // the tune player's timing: the page's player with the page's period, run for 500 PAL frames,
  // makes 208 calls, the first the setup and every later one counting $E1 down
  {
    const E = C64Sid.engine(), m = /getElementById\('gdo-tune'\)[^;]*?period: (\d+)/.exec(g.read('index.html'));
    const d = createDriver(Object.assign({ kind: 'tune' }, DATA)), RATE = 48000;
    const p = E.createPlayer(d, RATE, { period: m ? +m[1] : undefined });
    p.command({ cmd: 'start', tune: 0 });
    const n = Math.floor(500 * E.FRAME_CYCLES * RATE / E.CLOCK);
    p.render(new Float32Array(n), n, 0);
    if (!m) { fail++; console.log('DIFFERS timing: the tune player passes no period'); }
    else if (((256 - d.z[0xE1]) & 255) !== 207) { fail++; console.log('DIFFERS timing: $E1 =', d.z[0xE1], 'after 500 frames, not 208 calls'); }
  }
  console.log(`${calls} calls compared, ${nwrites} SID writes; ${fail ? fail + ' FAILED' : 'all match'}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log(e.stack || e); process.exit(1); });
