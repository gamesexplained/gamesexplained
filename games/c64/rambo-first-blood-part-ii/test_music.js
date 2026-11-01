#!/usr/bin/env node
// Hold the page's two sound players against the game's own code. index.html's rb-music block
// (createDriver) runs the music driver on the kit's 6502 over RB_DRIVER_RANGES, for every button of
// the music player (RB_TUNES) and of the effects player (RB_EFFECTS). Here the same commands run on
// the kit's simulator over the whole listing, as message_screen ($044D) sends them: command 1
// (silence), command 26 with X = 7 (all voices for music), the button's command, then each frame
// command 0 as music_tick ($1159) sends it and command 2 (cmd_status, $8466). Both must write the same
// values to the same SID registers in the same order, frame by frame, for 3,000 frames a button, and
// the page's button must stop on the frame cmd_status first returns zero. createDriver is made here
// from its source text alone, in a context of its own, as the player's AudioWorklet makes it.
// It exits 1 on any difference.
//   node games/c64/rambo-first-blood-part-ii/test_music.js [page.html]
const path = require('path'), vm = require('vm'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
const B = g.run(page, 'rb-music', 'createDriver', 'RB_TUNES', 'RB_EFFECTS', 'RB_DRIVER_RANGES');
const { RB_TUNES, RB_EFFECTS, RB_DRIVER_RANGES } = B;
const createDriver = vm.runInNewContext('(' + B.createDriver.toString() + ')', {});
const L = g.listing();
const FRAMES = 3000;
let bad = 0, frames = 0, sounding = 0;
const ends = [];
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const mem = RB_DRIVER_RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
for (const list of [RB_TUNES, RB_EFFECTS]) list.forEach((c, t) => {
  const m = L.ram.slice(), frame = { w: [] };
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a < 0xD800 && ((a - 0xD400) & 31) < 25) frame.w.push((a - 0xD400) & 31, v); else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  const cmd = (a, x) => cpu.call(0x8100, { a, x: x || 0 }, { maxSteps: 200000 });
  const drv = createDriver({ mem, list }, kit);
  cmd(1); cmd(26, c.mask === undefined ? 7 : c.mask); cmd(c.cmd);
  drv.init(t);
  if (frame.w.join() !== drv.writes.join()) fail(c.name, 'start', frame.w.join(), '|', drv.writes.join());
  let done = -1, gate = false;
  for (let f = 0; f < FRAMES && done < 0; f++) {
    frame.w = [];
    cmd(0);
    for (let i = 0; i < frame.w.length; i += 2) if ([4, 11, 18].includes(frame.w[i]) && (frame.w[i + 1] & 1)) gate = true;
    cmd(2);
    const over = cpu.a === 0;
    drv.play();
    if (frame.w.join() !== drv.writes.join()) fail(c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join());
    if (over) done = f;
    if (over === drv.playing()) fail(c.name, 'frame ' + f, 'game', over ? 'done' : 'playing', 'page', drv.playing() ? 'playing' : 'stopped');
    frames++;
  }
  if (gate) sounding++; else console.log("silent:", c.name);
  ends.push(c.name + ' ' + (done < 0 ? 'plays on' : done + 1 + ' frames'));
});
const n = RB_TUNES.length + RB_EFFECTS.length;
if (sounding < n) fail(`${n - sounding} buttons never gate a voice on`);
console.log(`${n} buttons, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + ends.join(', ')));
process.exit(bad ? 1 : 0);
