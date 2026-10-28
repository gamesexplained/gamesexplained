#!/usr/bin/env node
'use strict';
// The flap widget on index.html (the block nes-flight) is a port of the player's vertical
// flight. This holds it to the game's own routines run on the kit's 6502 over the listing's
// bytes: actor_animate ($EA18), the flap in actor_controls (from $EC49, after the steering) and
// actor_physics ($EA58), once a frame as actors_update calls them, for a player with two
// balloons and with one, over random taps and holds, comparing Y, the velocity, the action and
// the animation frame every frame.
const path = require('path');
const assert = require('assert');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const C64Cpu = globalThis.C64Cpu;
const { flightTables, flightFrame, flightStart } = g.run('index.html', 'nes-flight', 'flightTables', 'flightFrame', 'flightStart');
const page = g.read('index.html');
const data = JSON.parse(/<script type="application\/json" id="bf-data">([\s\S]*?)<\/script>/.exec(page)[1]);
const L = g.listing();
const T = flightTables(data.physics);
for (const [k, a] of Object.entries({ gravity: 0xE601, flap: 0xE60D, max_vy_lo: 0xE661, max_vy_hi: 0xE66D, max_vy_up_lo: 0xE679, max_vy_up_hi: 0xE685 }))
  for (let i = 0; i < 12; i++) assert.strictEqual(data.physics[k][i], L.ram[a + i], k + '[' + i + '] is not the listing\'s');
let seed = 20261019;
const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed >>> 8; };
let frames = 0, flaps = 0;
for (const type of [3, 7]) {
  for (let k = 0; k < 40; k++) {
    const mem = new Uint8Array(65536); mem.set(L.ram.subarray(0xC000), 0xC000);
    const cpu = new C64Cpu.CPU(mem);
    mem[0xCD] = 0xFF; for (let i = 1; i < 9; i++) mem[0x88 + i] = 0xFF;
    const y0 = 0x30 + (rnd() % 0x50);
    mem[0x88] = type === 7 ? 1 : 2; mem[0x7F] = 1; mem[0x91] = 0x80; mem[0x9A] = y0; mem[0x0451] = type; mem[0x043F] = 1; mem[0x0436] = 1;
    const s = flightStart(y0);
    const style = k % 3;
    for (let f = 0; f < 120; f++) {
      const a = style === 0 ? (rnd() & 3) === 0 : style === 2 ? (rnd() & 7) === 0 : false;
      const b = style === 1 ? (rnd() & 1) === 0 : false;
      mem[0x31] = (a ? 0x80 : 0) | (b ? 0x40 : 0);
      if (--mem[0x043F] === 0) { mem[0x043F] = 3; cpu.call(0xEA18, { x: 0 }); cpu.call(0xEC49, { x: 0 }); }
      cpu.call(0xEA58, { x: 0 });
      mem[0x19] = (mem[0x19] + 1) & 0xff;
      flightFrame(s, { a, b }, type, T);
      frames++; if (s.flapped) flaps++;
      if (mem[0x88] !== (type === 7 ? 1 : 2)) break;
      const got = [mem[0x9A], mem[0x0409], mem[0x041B], mem[0x0412], mem[0x7F], mem[0x0436]], port = [s.y, s.yf, s.vyHi, s.vyLo, s.action, s.frame];
      assert.deepStrictEqual(port, got, 'type ' + type + ' case ' + k + ' frame ' + f + ' (y, y fraction, velocity high, low, action, frame)');
    }
  }
}
assert.ok(flaps > 200, 'only ' + flaps + ' flaps were taken');
console.log(frames + ' frames compared with ' + flaps + ' flaps: the port matches the game');
