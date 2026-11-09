#!/usr/bin/env node
// Hold the How it works page's music player against the game's own code. index.html's az-music block
// (createDriver) runs the game's code over the bytes in AZ_DRIVER_RANGES only. Here the same path
// runs on the kit's simulator over the whole listing, as the game takes it: the start-up from $1000
// to $103E (the SID's values from $41C0, the interrupt vector $0314, the title's tune), and for a
// level's music the menu's set-up from $1121 to $1158 (its KERNAL call to clear the screen stood in
// for), a level's start ($1CA0) and the stage routine $6530 once for each stage, the stage in $45,
// as the levels call it; then the interrupt, entered through the KERNAL's path to $0314 and left
// through $EA31, 3,000 times. Both must write the same SID registers with the same values in the same
// order at the start and at every interrupt; every button must make sound (a voice gated with a
// pitch other than 0, volume above 0) and move through its tune. The KERNAL's interrupt comes every
// 16,422 cycles (CIA 1 timer A, latch $4025, on a PAL machine); the page's AZ_PERIOD must say so.
// It exits 1 on any difference.
//   node games/c64/aztec-challenge/test_music.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createDriver, AZ_TUNES, AZ_DRIVER_RANGES, AZ_PERIOD } = g.run('index.html', 'az-music', 'createDriver', 'AZ_TUNES', 'AZ_DRIVER_RANGES', 'AZ_PERIOD');
const L = g.listing();
const N = 3000;
let bad = 0, frames = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
if (AZ_PERIOD !== 0x4025 + 1) fail('period', AZ_PERIOD);
const mem = AZ_DRIVER_RANGES.map(([a, b]) => [a, Array.from(L.ram.subarray(a, b + 1))]);
const report = [];
AZ_TUNES.forEach((c, t) => {
  const m = L.ram.slice(), sid = new Uint8Array(25);
  let w = [];
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) {
      if (a >= 0xD400 && a < 0xD800) { const r = (a - 0xD400) & 0x1F; if (r < 25) { sid[r] = v; w.push(r, v); } return; }
      if (a === 0xD01A || a === 0xD020 || a === 0xD021) return;
      throw new Error('write $' + a.toString(16));
    },
  };
  const cpu = new CPU(m, { port: 0x37, io });
  const hooks = { 0xFFD2: (k) => { k.rts(); } };
  cpu.pc = 0x1000; cpu.run({ until: 0x103E, hooks });
  if (c.stage >= 0) {
    cpu.pc = 0x1121; cpu.run({ until: 0x1158, hooks });
    cpu.call(0x1CA0, {});
    for (let s = 1; s <= c.stage; s++) { m[0x45] = s; cpu.call(0x6530, {}); }
  }
  if (c.start) { m[0x34] = c.start & 0xFF; m[0x35] = c.start >> 8; m[0x33] = 0; }
  const drv = createDriver({ mem, list: AZ_TUNES }, kit);
  drv.init(t);
  if (w.join() !== drv.writes.join()) fail(c.name, 'start', w.join(), '|', drv.writes.join());
  const ptr0 = m[0x34] | m[0x35] << 8;
  let sounded = false, steps = 0;
  for (let f = 0; f < N; f++) {
    w = [];
    cpu.irq(null, { kernal: true });
    drv.play();
    if (w.join() !== drv.writes.join()) fail(c.name, 'interrupt ' + f, w.join(), '|', drv.writes.join());
    if (w.length) steps++;
    for (const v of [0, 1, 2]) if ((sid[4 + 7 * v] & 1) && (sid[7 * v] | sid[1 + 7 * v] << 8) && (sid[24] & 15)) sounded = true;
    frames++;
  }
  if (!sounded) fail(c.name, 'makes no sound');
  if (!steps) fail(c.name, 'never steps its tune');
  report.push(c.name.split(':')[0] + ' from $' + ptr0.toString(16).toUpperCase() + ', ' + steps + ' steps');
});
console.log(`${AZ_TUNES.length} buttons, ${frames} interrupts: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + report.join('; ')));
process.exit(bad ? 1 : 0);
