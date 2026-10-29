'use strict';
// The Solution tab's route, played on the game's own code. solution-input.json holds the joystick
// of a game played along the route, a byte a frame from the game's first instruction; this feeds
// it to the kit's C64 (kit/c64/machine.js) started at $4000 with the memory listing.json records,
// and holds the page's table of stages (solution.html, TIMES) to what the game does: each stage
// must come, in order, at the clock and the count the table gives, and the last must leave the
// mission at $1F, MISSION STATUS SUCCEEDED.
//   node games/c64/shadowfire/test_solution.js
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../..');
const { Machine } = require(path.join(ROOT, 'kit/c64/machine.js'));

const rec = JSON.parse(fs.readFileSync(path.join(__dirname, 'solution-input.json'), 'utf8'));
const joy = zlib.inflateRawSync(Buffer.from(rec.joy, 'base64'));
const page = fs.readFileSync(path.join(__dirname, 'solution.html'), 'utf8');
const m0 = page.match(/const TIMES = (\[.*?\]);\n/);
if (!m0) { console.log('FAIL solution.html has no TIMES table'); process.exit(1); }
const TIMES = JSON.parse(m0[1]);

const L = JSON.parse(fs.readFileSync(path.join(__dirname, 'listing.json'), 'utf8'));
const ram = new Uint8Array(65536);
for (const r of L.records) if (r.b) ram.set(r.b, r.a);
// The recording was made on the machine before it took interrupts as the processor does: a byte a
// frame replays only on the timing it was made on, so it runs on that one (legacyInterrupts). The
// route it proves is the page's whatever the timing.
const m = new Machine({ ram, pc: 0x4000, dma: rec.dma, legacyInterrupts: true });
// The start copies the KERNAL's vectors from $FD30 into page 3. The kit holds no ROM, and only the
// KERNAL's routines use them, which the game calls only to load or save: the copy is stepped over.
m.hooks[0x400F] = (c) => { c.pc = 0x4018; return true; };

const M = ram, ent = (e, k) => M[0xCA0E + 18 * e + k];
const TEAM = [1, 2, 4, 0, 5];                  // Sevrina, Manto, Zark, Syylk, Torik
const all = (L) => TEAM.every((c) => ent(c, 2) === L && !(ent(c, 0) & 1));
const any = (L) => TEAM.some((c) => ent(c, 2) === L);
const kills = () => M[0xCF67] * 10 + M[0xCF68];
const clock = () => { const d = [3, 2, 1, 0].map((i) => M[0xCA00 + i]); return `${d[0]}${d[1]}:${d[2]}${d[3]}` + (M[0xCA04] ? ', counting up' : ''); };
let inArmoury = false;
// the stages of the page's table, in its order
const STAGES = [
  () => all(0x16),                              // the five in FIGHTER LAUNCH TUBE ONE
  () => M[0xCFC9 + 3] === 0,                    // door 3, out of the fighter bay entrance, open
  () => all(0x25),                              // all five in the Robot Armoury
  () => { if (all(0x25)) inArmoury = true; return inArmoury && TEAM.some((c) => ent(c, 0) & 1); },
  () => any(0x36),                              // ZOFF SECURITY
  () => any(0x41),                              // the command post
  () => all(0x4D),                              // ZOFF ARMOURY
  () => M[0xCA05] & 2,                          // Kryxix rescued
  () => M[0xCA05] & 0x10,                       // Zoff captured
  () => M[0xCA05] === 0x1F,                     // SUCCEEDED
];
if (TIMES.length !== STAGES.length) { console.log(`FAIL the page lists ${TIMES.length} stages, the test knows ${STAGES.length}`); process.exit(1); }

let n = 0, bad = 0;
for (let f = 0; f < joy.length && n < STAGES.length; f++) {
  if (f === rec.f3[0]) m.press(0x05);
  if (f === rec.f3[1]) m.release(0x05);
  m.joy1 = 0x1F & ~joy[f];
  m.runFrames(1);
  if (STAGES[n]()) {
    const [what, want, count] = TIMES[n], got = clock();
    const ok = got === want && String(kills()) === count;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} frame ${f + 1}: ${what}: the game ${got}, ${kills()}; the page ${want}, ${count}`);
    n++;
  }
}
if (n < STAGES.length) { console.log(`FAIL the recording ended before stage ${n + 1}, ${TIMES[n][0]}`); process.exit(1); }
console.log(`mission $${M[0xCA05].toString(16).toUpperCase()}, killed or captured ${kills()}`);
if (bad || M[0xCA05] !== 0x1F) process.exit(1);
console.log('ok   the route wins');
