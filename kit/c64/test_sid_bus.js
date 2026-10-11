'use strict';
// What a read of the SID returns, held against the emulator (#194): every reading in
// kit/c64/fixtures/sid-bus.json, which kit/c64/sid_bus.py recorded in VICE, replayed through the
// chip model in site/lib/sid.js (createSID's read, on its bus) and through kit/c64/machine.js,
// whose reads a port's tests compare against. Then the frame player's readback. Exits 1 on any
// failure. node kit/c64/test_sid_bus.js
const fs = require('fs');
const path = require('path');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'sid.js'));
const { Machine } = require('./machine.js');

const E = globalThis.C64Sid.engine();
const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'sid-bus.json'), 'utf8'));
const hex = v => '$' + v.toString(16).toUpperCase().padStart(2, '0');
let fails = 0, checked = 0;
function check(ok, what) { checked++; if (!ok) { fails++; console.log('FAIL ' + what); } }

// A case's accesses in time order, the last write at 0: earlier writes 6 cycles apart (LDA #,
// STA abs), the reads where the fixture puts them, the measured one at t.
function accesses(c, t) {
  const out = c.writes.map(([r, v], i) => ({ at: (i - c.writes.length + 1) * 6, write: true, r, v }));
  for (const [r, at] of c.before || []) out.push({ at, r });
  out.push({ at: t, r: c.read });
  return out;
}

for (const model of Object.keys(F.models)) {
  for (const c of F.models[model]) {
    // the chip model: its own clock, from 0
    for (const [t, want] of c.reads) {
      const sid = E.createSID(44100, { filter: model });
      let now = 0, got;
      for (const a of accesses(c, t)) {
        sid.skip(1000 + a.at - now); now = 1000 + a.at;
        if (a.write) sid.write(a.r, a.v); else got = sid.read(a.r);
      }
      check(got === want, `sid.js ${model}, ${c.name}, ${t} cycles: read ${hex(got)}, VICE ${hex(want)}`);
    }
    // the test machine, on the processor's clock; it has no voices, so $D41B and $D41C read 0
    if ((c.before || []).some(([r]) => r === 0x1B || r === 0x1C) || c.read === 0x1B || c.read === 0x1C) continue;
    for (const [t, want] of c.reads) {
      const m = new Machine({ ram: new Uint8Array(65536), sid: model });
      let got;
      for (const a of accesses(c, t)) {
        m.cpu.cycles = 1000 + a.at;
        if (a.write) m.ioWrite(0xD400 + a.r, a.v); else got = m.ioRead(0xD400 + a.r);
      }
      check(got === want, `machine.js ${model}, ${c.name}, ${t} cycles: read ${hex(got)}, VICE ${hex(want)}`);
    }
  }
}

// The frame player hands the driver the bus at each frame's start: the 8580 still holds a value
// written a frame before, the 6581's has gone (a frame is 19,656 cycles).
for (const [model, want] of [['8580', 0xA5], ['6581', 0x00]]) {
  const seen = [];
  const drv = {
    sid: new Uint8Array(25), n: 0,
    init() { this.n = 0; }, stop() {}, playing: () => true,
    readback(env3, osc3, bus) { seen.push(bus); },
    play() { this.n++; if (this.n === 1) this.sid[6] = 0xA5; },
  };
  const p = E.createPlayer(drv, 44100, { filter: model });
  p.command({ cmd: 'start', tune: 0 });
  p.render(new Float32Array(44100 / 50 * 3), 44100 / 50 * 3, 0);
  check(seen.length >= 2 && seen[0] === 0 && seen[1] === want,
        `the player, ${model}: readback's bus ${seen.slice(0, 2).map(hex).join(', ')}, expected $00, ${hex(want)}`);
}

console.log(`${checked - fails} of ${checked} reads as ${F.emulator} (${F.engine}) gave them` +
            (fails ? '' : ', and the player hands the driver the bus'));
process.exit(fails ? 1 : 0);
