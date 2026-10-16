#!/usr/bin/env node
// Hold the page's tune player against the game's code. index.html's cm-music block (createDriver)
// runs Castle Master's sound driver on its own small 6502 over the bytes the page gives it. The
// same calls on the kit's simulator over the listing's bytes must write the same values to the same
// SID registers, in the same order, frame by frame, with the SID's data bus as kit/c64's machine
// has it (site/lib/sid.js, createBus): every one of the 17 tunes in turn on one driver, as the
// game plays them one after another, SID_PLAYER_INITIALIZE ($CF1B) with the tune in A and then
// SID_PLAYER_TICK ($C885) once a frame until SID_STATE ($C806) says it has ended, and the clear
// the game makes when the sound is turned off ($CFE4, SID_STATE 0), halfway through tune 0. Then
// the sensors' alarm as the raster interrupt plays it ($73A1-$73B0): $CF1B with 16 and then $C885
// on every frame, against the driver's init(17), reached through its map as the Discoveries tab
// reaches it, for 300 frames. discoveries.html carries the same block, and must carry it unchanged.
// It exits 1 on any difference.
//   node games/c64/castle-master/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { createDriver } = g.run(page, 'cm-music', 'createDriver');
g.lib('sid');
const L = g.listing();
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };

// The game's side: the listing's memory with I/O in ($01 = $35, as in play), the SID through the bus
const m = L.ram.slice(), w = [], bus = C64Sid.engine().createBus('8580');
const io = {
  read(a, cpu) { if (a >= 0xD400 && a <= 0xD41F) return bus.read(a & 31, cpu.cycles, 0); throw new Error('read $' + a.toString(16)); },
  write(a, v, cpu) { if (a >= 0xD400 && a <= 0xD41F) { w.push(a & 31, v); bus.write(v, cpu.cycles); } else throw new Error('write $' + a.toString(16)); },
};
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
// The page's side: the data the page gives the driver
const drv = createDriver({ mem: [[0x065A, L.ram.slice(0x065A, 0x1047)], [0xC800, L.ram.slice(0xC800, 0xD000)]] });
const same = (what) => { if (w.join() !== drv.writes.join()) fail(what, w.join(), '|', drv.writes.join()); w.length = 0; };
let frames = 0;
const lengths = [];
for (let t = 0; t < 17; t++) {
  cpu.call(0xCF1B, { a: t }); drv.init(t);
  let f = 0;
  // init's writes stay in the driver's list until its first play(), so they are compared with frame 0's
  while (f < 20000) {
    cpu.cycles += 19656; drv.readback(0, 0, bus.peek(cpu.cycles));
    cpu.call(0xC885, {}); drv.play(); same('tune ' + t + ' frame ' + f); f++;
    if (t === 0 && f === 3000) {
      // the sound turned off in the middle of the music, as the load and save do it
      m[0xC806] = 0; cpu.call(0xCFE4, {}); drv.stop(); same('tune 0 stopped');
      if (drv.playing()) fail('tune 0 plays on after the clear');
      frames += f; break;
    }
    if (m[0xC806] === 0) break;
    if (!drv.playing()) { fail('tune', t, 'the port ended before the game at frame', f); break; }
  }
  if (t === 0) {                     // tune 0 again, to its end
    cpu.call(0xCF1B, { a: 0 }); drv.init(0); f = 0;
    do { cpu.cycles += 19656; drv.readback(0, 0, bus.peek(cpu.cycles)); cpu.call(0xC885, {}); drv.play(); same('tune 0 again, frame ' + f); f++; }
    while (m[0xC806] !== 0 && f < 20000);
  }
  if (drv.playing()) fail('tune', t, 'the port plays on after the game has ended it');
  lengths.push(f); frames += f;
}
// the alarm: the game's interrupt on every frame, against the page's driver with the map of the
// Discoveries tab's player, whose second button is init(17)
const alarm = createDriver({ mem: [[0x065A, L.ram.slice(0x065A, 0x1047)], [0xC800, L.ram.slice(0xC800, 0xD000)]], map: [16, 17] });
alarm.init(1);
const m2 = L.ram.slice(), bus2 = C64Sid.engine().createBus('8580');     // a machine fresh from the listing, as the page's driver is
const io2 = {
  read(a, c) { if (a >= 0xD400 && a <= 0xD41F) return bus2.read(a & 31, c.cycles, 0); throw new Error('read $' + a.toString(16)); },
  write(a, v, c) { if (a >= 0xD400 && a <= 0xD41F) { w.push(a & 31, v); bus2.write(v, c.cycles); } else throw new Error('write $' + a.toString(16)); },
};
const cpu2 = new CPU(m2, { port: { dir: 0x2F, data: 0x35 }, io: io2 });
w.length = 0;
for (let f = 0; f < 300; f++) {
  cpu2.cycles += 19656; alarm.readback(0, 0, bus2.peek(cpu2.cycles));
  cpu2.call(0xCF1B, { a: 16 }); cpu2.call(0xC885, {}); alarm.play();
  if (w.join() !== alarm.writes.join()) fail('the alarm, frame ' + f, w.join(), '|', alarm.writes.join());
  w.length = 0;
}
if (!alarm.playing()) fail('the alarm stopped');
// every page's copy of the block
const mine = g.block(page, 'cm-music').text;
for (const other of ['index.html', 'discoveries.html']) if (g.block(other, 'cm-music').text !== mine) fail(other + "'s cm-music block differs from " + path.basename(page) + "'s");
console.log(`${frames} frames of 17 tunes (${lengths.join(', ')} frames each): ` + (bad ? bad + ' differences' : 'every write matches') + '; the alarm, 300 frames: ' + (bad ? 'see above' : 'every write matches'));
process.exit(bad ? 1 : 0);
