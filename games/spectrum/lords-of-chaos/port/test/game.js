'use strict';
// The game's own code, run on the kit's Z80 (kit/spectrum/z80.js) from the committed listings, for
// the tests that hold the pages' ports to it. memory(n) is the 64 KB the game runs in with scenario
// n loaded (0: the designer), rebuilt from the engine's listing and the scenario's; call(M, at,
// regs) runs the routine at `at` until it returns, with the interrupts off, and gives the CPU.
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../../../../..');
const GAME = path.resolve(__dirname, '../..');
const { CPU } = require(path.join(ROOT, 'kit/spectrum/z80.js'));

function records(file, M) {
  for (const r of JSON.parse(fs.readFileSync(path.join(GAME, file), 'utf8')).records)
    if (r.b) for (let i = 0; i < r.b.length; i++) M[r.a + i] = r.b[i];
}
const cache = {};
function memory(n) {
  if (!cache[n]) {
    const M = new Uint8Array(0x10000);
    records('parts/engine/listing.json', M);
    records(n ? `parts/scenario-${n}/listing.json` : 'parts/designer/listing.json', M);
    cache[n] = M;
  }
  return cache[n].slice();
}

const SENTINEL = 0x0000;          // the routine returns to $0000, in the ROM, which the game never runs
function call(M, at, regs = {}, opts = {}) {
  const cpu = new CPU(M, { io: opts.io || { in: () => 0xFF, out: () => {} } });
  cpu.sp = regs.sp || 0xFF00;
  for (const k of Object.keys(regs)) if (k !== 'sp') cpu[k] = regs[k];
  cpu.sp = (cpu.sp - 2) & 0xFFFF;
  M[cpu.sp] = SENTINEL & 255; M[cpu.sp + 1] = SENTINEL >> 8;
  cpu.pc = at;
  const hooks = opts.hooks || {};
  let n = 0;
  while (cpu.pc !== SENTINEL) {
    if (hooks[cpu.pc] && hooks[cpu.pc](cpu, M)) continue;
    cpu.step();
    if (++n > (opts.limit || 50e6)) throw new Error('call $' + at.toString(16) + ': no return after ' + n + ' instructions');
  }
  return cpu;
}
module.exports = { memory, call, GAME, ROOT };
