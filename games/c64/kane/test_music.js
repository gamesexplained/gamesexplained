#!/usr/bin/env node
// Hold the page's two sound players against the game's own code. index.html's kane-music block
// (createDriver) runs the game's music and effects on the kit's 6502, handed in as sid.js hands
// it, for every button of the music player (KANE_TUNES) and of the effects player (KANE_EFFECTS).
// The same calls on the kit's simulator over the listing's bytes, with the sound chip's data bus
// answering reads as VICE's does (C64Sid.engine().createBus), must write the same values to the
// same registers in the same order, frame by frame, for 3,000 frames a button:
// - a tune: start_tune ($944B) with the stage set and music_off clear, then play_music ($9475)
//   taken as the game's raster interrupt takes it. For the ending, the game's own loop at
//   $31DC-$31FB runs between the interrupts on a second 6502 over the same memory, and the page's
//   button must stop on the frame that loop gives up (it reaches $31FD).
// - an effect: the bytes the page sets for what an earlier effect left behind, then the bytes set
//   by the game's own instructions that start it (the drum at $1292, the
//   whistle at $1A79, the Marshall's shot at $36D7, a gunman's at $8923, the train's hoofbeats at
//   $2039-$2052 in start_ride, and their volume by ride_loop's own code for three coaches), then play_effects ($91E7), or play_music for the hoofbeats, once a
//   frame. The page's own setup must leave every byte those instructions write as they leave it.
// It exits 1 on any difference.
//   node games/c64/kane/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { createDriver, KANE_TUNES, KANE_EFFECTS, KANE_DRIVER_RANGES, KANE_STEP } =
  g.run(page, 'kane-music', 'createDriver', 'KANE_TUNES', 'KANE_EFFECTS', 'KANE_DRIVER_RANGES', 'KANE_STEP');
g.lib('sid');
const L = g.listing();
const FRAMES = 3000;
// The instructions that start each effect, as [from, to]: run from the first to the second.
const STARTS = { 0x10: [0x1292, 0x1296], 0x20: [0x1A79, 0x1A7F], 0x80: [0x36D7, 0x36DD], 0x40: [0x8923, 0x8929], hoof: [0x2039, 0x2055] };
let bad = 0, frames = 0, notes = [];
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const mem = KANE_DRIVER_RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
for (const [list, set] of [[KANE_TUNES, 'music'], [KANE_EFFECTS, 'effects']]) list.forEach((c, t) => {
  const m = L.ram.slice(), frame = { w: [] };
  const bus = C64Sid.engine().createBus('8580');
  let now = 0;
  const io = {
    read(a, cpu) {
      if (a >= 0xD400 && a <= 0xD41F) return bus.read(a & 31, cpu.cycles, 0);
      const k = 0x4025 - (now + cpu.cycles) % 0x4026;          // CIA 1's timer A, as the page has it
      if (a === 0xDC04) return k & 0xFF;
      if (a === 0xDC05) return k >> 8;
      throw new Error('read $' + a.toString(16));
    },
    write(a, v, cpu) { if (a >= 0xD400 && a <= 0xD418) { frame.w.push(a - 0xD400, v); bus.write(v, cpu.cycles); } else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x36 }, io });
  const drv = createDriver({ mem, tunes: list, step: KANE_STEP }, kit);
  let loop = null;
  if (set === 'music') {
    m[0x907B] = c.stage; m[0x8FA0] = 0;
    cpu.cycles = 0; cpu.call(0x944B, { a: 0, x: 0, y: 0 });
    if (c.ending) { loop = new CPU(m, { port: { dir: 0x2F, data: 0x36 }, io: { read() { throw new Error('loop read'); }, write() { throw new Error('loop write'); } } }); loop.pc = 0x31DC; }
  } else {
    cpu.cycles = 0; cpu.call(0x3B83, { a: 0, x: 0, y: 0 });
    for (const [a, v] of c.set) m[a] = v;                     // what the game leaves there before
    const [from, to] = STARTS[c.bit || 'hoof'];
    if (!c.bit) {                                                // the train with three coaches, as ride_loop sets it
      m[0x8FA0] = 0xFF; m[0x8F99] = 0xFF; m[0x003D] = 3;
      cpu.pc = 0x20E5; cpu.run({ until: 0x2109, maxSteps: 100 });  // the hoofbeats' volume from the coach count
    }
    cpu.pc = from; cpu.run({ until: to, maxSteps: 100 });
  }
  frame.w = [];
  drv.init(t);
  if (set === 'effects') {
    // every byte the game's starting instructions wrote must be as the page's setup left it
    for (let a = 0; a < 0x10000; a++) if (m[a] !== L.ram[a] && ![0x0010, 0x0023, 0x003D].includes(a) && !(a >= 0x0100 && a < 0x0200) && drv.mem[a] !== m[a] && (a < 0xD400 || a > 0xD418))
      fail(set, c.name, 'setup at $' + a.toString(16), 'game', m[a], 'page', drv.mem[a]);
    if (c.bit && !(drv.mem[0x23] & c.bit)) fail(set, c.name, 'effect bit not set');
  }
  let stopped = -1;
  for (let f = 0; f < FRAMES; f++) {
    frame.w = [];
    cpu.cycles = 0; cpu.pc = 0x0C00;
    const run = set === 'music' ? 0x9475 : c.run;
    const live = stopped < 0 && (set === 'music' || !c.bit || m[0x23] & c.bit);
    if (live) cpu.irq(run, { kernal: true, maxSteps: 100000 });
    drv.play();
    if (live && frame.w.join() !== drv.writes.join()) fail(set, c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join());
    if (loop && stopped < 0) { loop.run({ until: 0x31FD, cycles: 4000 }); if (loop.pc === 0x31FD) stopped = f; }
    if (set === 'music' && (stopped >= 0) === drv.playing()) fail(set, c.name, 'frame ' + f, 'game loop ' + (stopped >= 0 ? 'ended' : 'running'), 'page', drv.playing() ? 'playing' : 'stopped');
    now += KANE_STEP;
    frames++;
  }
  if (loop) notes.push(`the ending's loop ends at frame ${stopped} with the tempo at ${m[0x9640]}`);
});
console.log(`${KANE_TUNES.length + KANE_EFFECTS.length} buttons, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + notes.join('; ')));
process.exit(bad ? 1 : 0);
