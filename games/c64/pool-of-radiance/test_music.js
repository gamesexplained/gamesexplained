#!/usr/bin/env node
// Hold the pages' sound players against the game's own sound driver. index.html's por-music block
// (createDriver) runs the driver on the kit's 6502, handed in as sid.js hands it, from the listing's
// bytes over POR_MUSIC_RANGES (the title part) or POR_SFX_RANGES (the tables part) alone, for every
// button of the music player (POR_TUNES) and of the effects player (POR_EFFECTS). Here the same
// driver runs on the kit's simulator over the part's whole memory, started as the game starts it:
// the title tune by INIT's start_tune ($0D4A, title part) with the entry in A, an effect by sound A
// through $BA03 with the data's base the tables part holds ($BD7B), the way the modules' play_sound
// starts one. Then $BA00 once a call, as irq ($3BEA) makes it. Both must write the same values to
// the same registers in the same order on every call, for 2 minutes of each button or until it
// ends, and end on the same call. It exits 1 on any difference.
//   node games/c64/pool-of-radiance/test_music.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
g.sameBlock('por-music');
const { createDriver, POR_TUNES, POR_EFFECTS, POR_MUSIC_RANGES, POR_SFX_RANGES, POR_PERIOD } =
  g.run('index.html', 'por-music', 'createDriver', 'POR_TUNES', 'POR_EFFECTS', 'POR_MUSIC_RANGES', 'POR_SFX_RANGES', 'POR_PERIOD');
const CALLS = Math.ceil(120 * 1022727 / POR_PERIOD);
let bad = 0, calls = 0, buttons = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const [list, part, ranges, set] of [[POR_TUNES, 'title', POR_MUSIC_RANGES, 'music'], [POR_EFFECTS, 'tables', POR_SFX_RANGES, 'effects']]) {
  const L = g.listing('parts/' + part + '/listing.json');
  const mem = ranges.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
  list.forEach((c, t) => {
    const m = L.ram.slice(), frame = { w: [] };
    const io = {
      read(a) { throw new Error('read $' + a.toString(16)); },
      write(a, v) { if (a >= 0xD400 && a <= 0xD418) { frame.w.push(a - 0xD400, v); return; } throw new Error('write $' + a.toString(16)); },
    };
    const cpu = new CPU(m, { port: 0x35, io });
    if (set === 'music') cpu.call(0x0D4A, { a: c.n, x: 0, y: 0 });
    else cpu.call(0xBA03, { a: c.n, x: 0, y: 0 });
    const on = () => [0xBD35, 0xBD37, 0xBD39, 0xBD42, 0xBD44, 0xBD46].some((a) => m[a] !== 0);
    const drv = createDriver({ mem, tunes: list }, kit);
    drv.init(t);
    buttons++;
    for (let s = 0; s < CALLS; s++) {
      frame.w = [];
      cpu.call(0xBA00, { a: 0, x: 0, y: 0 });
      drv.play();
      calls++;
      if (frame.w.join() !== drv.writes.join()) { fail(set, c.name, 'call ' + s, frame.w.join(), '|', drv.writes.join()); break; }
      if (on() !== drv.playing()) { fail(set, c.name, 'call ' + s, on() ? 'still plays' : 'has ended'); break; }
      if (!on()) { if (set === 'music' && t === 0) console.log(c.name + ' ends after ' + (s + 1) + ' calls'); break; }
    }
  });
}
console.log(`${buttons} buttons, ${calls} calls of $BA00: ` + (bad ? bad + ' differences' : 'every write matches the driver'));
process.exit(bad ? 1 : 0);
