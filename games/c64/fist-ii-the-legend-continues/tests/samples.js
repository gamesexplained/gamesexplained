// Checks reference/fist-samples.js, the port of Fist II's sample player, against the game's own
// routines run in the kit's 6502 simulator on the bytes of the committed listing: play_sample
// ($3DB8), the timer interrupt ($3D8B) and update_sound ($3E1A). For each of the ten sample
// numbers, every frame, the writes to the SID's volume register ($D418) and the cycle each falls
// on must match, and so must the player's state ($3E0C-$3E19, $68-$6D) at the frame's end. The
// game's CIA 1 timers are modelled from what the routines write to them, the same way the port
// models them.
//   node tests/samples.js [frames]      (default 300 frames a sample, six seconds)
const path = require('path');
const { CPU } = require(path.join(__dirname, '../../../../kit/cpu/cpu6502'));
const FISTSAMPLES = require(path.join(__dirname, '../reference/fist-samples.js'));
const L = require(path.join(__dirname, '../listing.json')).records;
const N = +process.argv[2] || 300;
const image = new Uint8Array(65536);
for (const r of L) if (r.b) image.set(r.b, r.a);
const FRAME = FISTSAMPLES.FRAME;
let bad = 0;
for (let n = 1; n <= 10; n++) {
  const port = FISTSAMPLES.createPlayer(image);
  const m = image.slice(); m.copyWithin(0x0200, 0xC700, 0xC900);
  let t = 0, irqOn = false, tNext = 0, latchA = 0, latchB = 0;
  const ev = [];
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) {
      if (a === 0xD418) ev.push([t, v]);
      else if (a === 0xDC04) latchA = latchA & 0xFF00 | v;
      else if (a === 0xDC05) latchA = latchA & 0xFF | v << 8;
      else if (a === 0xDC06) latchB = latchB & 0xFF00 | v;
      else if (a === 0xDC07) latchB = latchB & 0xFF | v << 8;
      else if (a === 0xDC0D) { if (v & 0x80) { if (v & 2) irqOn = true; } else if (v & 2) irqOn = false; }
      else if (a === 0xDC0F) { if ((v & 0x11) === 0x11) tNext = t + (latchB + 1) * (latchA + 1); }
      else if (a === 0xDC0E || a === 0xD417) { /* timer A runs from the clock; the filter is not heard */ }
      else throw new Error('write $' + a.toString(16));
    },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  cpu.call(0x3DB8, { a: n });
  port.play(n);
  let first = -1, frames = 0;
  for (let f = 0; f < N; f++) {
    const end = t + FRAME;
    while (irqOn && tNext < end) { t = tNext; cpu.sp = 0xF0; cpu.irq(0x3D8B); }
    t = end; cpu.call(0x3E1A, {});
    port.frame(); frames++;
    const same = JSON.stringify(ev) === JSON.stringify(port.events);
    let mem = -1;
    for (const a of [...Array(14).keys()].map(i => 0x3E0C + i).concat([0x68, 0x69, 0x6A, 0x6C, 0x6D])) if (m[a] !== port.M[a]) { mem = a; break; }
    if (!same || mem >= 0) {
      first = f;
      console.log(`sample ${n} frame ${f}: ` + (!same ? `volume writes differ (game ${ev.length}, port ${port.events.length})` : `$${mem.toString(16)} game ${m[mem]} port ${port.M[mem]}`));
      break;
    }
  }
  console.log(`sample ${n}: ${frames} frames, ${first < 0 ? ev.length + ' volume writes match' : 'differs'}${port.playing ? ', still playing' : ', ended'}`);
  if (first >= 0) bad++;
}
process.exit(bad ? 1 : 0);
