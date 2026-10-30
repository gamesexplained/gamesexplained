#!/usr/bin/env node
// Hold the page's three sound players against the game's own code. index.html's wg-music block
// (createDriver) runs the game's players on the kit's 6502 over the bytes WG_RANGES names, for
// every button: the anthems and the ceremony's tunes (WG_ANTHEMS), each event's tune
// (WG_EVENT_TUNES) and the effects (WG_EFFECTS). The game's own code runs here on the kit's
// simulator over the whole of each part's listing: for Bobsled first its start-up's copy of the
// sound engine to $C000 (copy_engine, $1062-$1083), as the event does before it plays a sound. An
// anthem starts as the menu starts one, music_init and then music_start with the place's Y, and
// steps twice a frame through music_step; an event's sound starts as the event starts it, stop_all
// and then start_sound with the sound's number in A, and steps once a frame through sound_step.
// Both must write the same values to the same registers in the same order, frame by frame, for up
// to 7,300 frames a button, and the page's button must stop on the frame the game's player is done:
// the tune number back at $FF for an anthem, every slot idle for an event's sound. createDriver is
// made here from its source text alone, in a context of its own, as the player's AudioWorklet makes
// it, so a driver that leans on anything else of the page fails here as it fails there.
// It exits 1 on any difference.
//   node games/c64/winter-games/test_music.js [page.html]
const path = require('path'), vm = require('vm'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
const B = g.run(page, 'wg-music', 'createDriver', 'WG_RANGES', 'WG_ANTHEMS', 'WG_EVENT_TUNES', 'WG_EFFECTS');
const { WG_RANGES, WG_ANTHEMS, WG_EVENT_TUNES, WG_EFFECTS } = B;
const createDriver = vm.runInNewContext('(' + B.createDriver.toString() + ')', {});
const FRAMES = 7300;
const L = {};
for (const p in WG_RANGES) L[p] = g.listing('parts/' + p + '/listing.json');
// the data the page's sound() gives the players
const mems = {};
for (const p in WG_RANGES) mems[p] = WG_RANGES[p].map(([a, b, at]) => [at === undefined ? a : at, L[p].ram.slice(a, b + 1)]);
let bad = 0, frames = 0, buttons = 0;
const ends = [];
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const list of [WG_ANTHEMS, WG_EVENT_TUNES, WG_EFFECTS]) list.forEach((c, t) => {
  const m = L[c.mem].ram.slice(), frame = { w: [] };
  const io = {
    read(a) { if (a === 0xDC00 || a === 0xDC01) return 0xFF; throw new Error('read $' + a.toString(16)); },
    write(a, v) {
      if (a >= 0xD400 && a <= 0xD418) frame.w.push(a - 0xD400, v);
      else if (a === 0xD012 || a === 0xDC00 || a === 0xDC02) return;
      else throw new Error('write $' + a.toString(16));
    },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  if (c.mem === 'bobsled') { cpu.pc = 0x1062; cpu.run({ until: 0x1084, maxSteps: 100000 }); }   // copy_engine
  const drv = createDriver({ mems, list }, kit);
  if (c.kind === 'anthem') { cpu.call(c.init, {}); cpu.call(c.start, { y: c.y }); }
  else { cpu.call(c.stop, {}); cpu.call(c.start, { a: c.a }); }
  drv.init(t);
  if (frame.w.join() !== drv.writes.join()) fail(c.name, 'start', frame.w.join(), '|', drv.writes.join());
  const done = () => {
    if (c.kind === 'anthem') return m[c.now] === 0xFF;
    for (let s = 0; s < c.n; s++) if (!(m[c.slots + 32 * s] & 0x80)) return false;
    return true;
  };
  let end = -1;
  for (let f = 0; f < FRAMES && end < 0; f++) {
    frame.w = [];
    cpu.call(c.step, {}, { maxSteps: 200000 });
    if (c.kind === 'anthem') cpu.call(c.step, {}, { maxSteps: 200000 });
    drv.play();
    if (frame.w.join() !== drv.writes.join()) fail(c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join());
    if (done()) end = f;
    if ((end >= 0) === drv.playing()) fail(c.name, 'frame ' + f, 'game', end >= 0 ? 'done' : 'playing', 'page', drv.playing() ? 'playing' : 'stopped');
    frames++;
  }
  buttons++;
  ends.push(c.name + ' ' + (end < 0 ? 'plays on' : end + 1 + ' frames'));
});
console.log(`${buttons} buttons, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + ends.join(', ')));
process.exit(bad ? 1 : 0);
