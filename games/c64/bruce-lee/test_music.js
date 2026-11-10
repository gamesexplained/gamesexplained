// Checks the Music tab's driver (reference/bruce-music.js) against the game's own code running in
// kit/c64/machine.js, both from the game's listing. In the machine, as in the game, a raster
// interrupt at line $FD calls the player once a frame: music_frame ($E006) for the menu tune, as
// irq_menu_bottom does ($154C), and the three effect voices ($EB03, $EF73, $F073) for an effect,
// as frame_work does ($15AF). The tune is set up as the menu sets it up ($06CC-$06DA) and an effect
// is started through play_sound ($2509). Every SID write must be the same, in the same order.
// node test_music.js [frames]
const kit = __dirname + '/../../../kit/';
const { Machine, FRAME } = require(kit + 'c64/machine.js');
const C64Cpu = require(kit + 'cpu/cpu6502.js');
const BRUCEMUSIC = require(__dirname + '/reference/bruce-music.js');
const NF = +process.argv[2] || 3000;
const ram = new Uint8Array(0x10000);
for (const r of require(__dirname + '/listing.json').records) if (r.b) ram.set(r.b, r.a);
const IDS = [null, 0, 1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14];

function game(id, frames) {
  const mr = ram.slice(0);
  mr.set([0x58, 0x4C, 0x41, 0x03], 0x340);                 // CLI, then a loop
  // the interrupt: save the registers, call the player, acknowledge, return
  const calls = id === null ? [0x20, 0x06, 0xE0] : [0x20, 0x03, 0xEB, 0x20, 0x73, 0xEF, 0x20, 0x73, 0xF0];
  mr.set([0x48, 0x8A, 0x48, 0x98, 0x48, ...calls, 0xA9, 0xFF, 0x8D, 0x19, 0xD0, 0x68, 0xA8, 0x68, 0xAA, 0x68, 0x40], 0x350);
  mr[0xFFFE] = 0x50; mr[0xFFFF] = 0x03;
  if (id === null) { mr[0xE314] = 3; mr[0xE870] = 0; mr[0xE871] = 0xFF; }
  const m = new Machine({ ram: mr, pc: 0x340, port: { dir: 0x2F, data: 0x35, out: 0x35 }, cia: true });
  m.ioWrite(0xDC0D, 0x7F);
  m.sidLog = [];
  if (id === null) {
    m.cpu.call(0xE000, {}, { maxSteps: 1e6 });
    m.cpu.call(0xE003, {}, { maxSteps: 1e6 });
  } else {
    m.cpu.call(0x255E, {}, { maxSteps: 1e6 });
    m.cpu.call(0x2509, { y: 0x80 | id }, { maxSteps: 1e6 });
  }
  m.cpu.pc = 0x340;
  m.ioWrite(0xD012, 0xFD); m.ioWrite(0xD011, 0x1B); m.ioWrite(0xD01A, 1);
  m.runCycles(frames * FRAME);
  // stop_sounds clears $D420 down to $D400, 33 writes; the first eight, $D420 down to $D419, are
  // past the SID's 25 registers, which the page's driver keeps (the machine logs them as 0-7)
  const log = m.sidLog.map(([, r, v]) => r << 8 | v);
  return id === null ? log : log.slice(8);
}

let bad = 0;
IDS.forEach((id, t) => {
  const frames = id === null ? NF : 300;
  const d = BRUCEMUSIC.createDriver({ base: 0, bytes: ram, ids: IDS }, C64Cpu);
  d.init(t);
  const page = [];
  const take = () => { const w = d.writes; for (let k = 0; k < w.length; k += 2) page.push(w[k] << 8 | w[k + 1]); };
  take();
  for (let i = 0; i < frames; i++) { d.play(); take(); }
  // after an effect ends the page stops calling; the game's voices, all free, write nothing more
  const g = game(id, frames);
  let i = 0; while (i < g.length && i < page.length && g[i] === page[i]) i++;
  const n = Math.min(g.length, page.length);
  const ok = i === n && Math.abs(g.length - page.length) <= (id === null ? 20 : 0) && n > (id === null ? 1000 : 4);
  console.log(`${id === null ? 'menu tune' : 'effect ' + id}: ${i} of ${g.length} writes match (page ${page.length}) ${ok ? 'ok' : 'FAIL'}`);
  if (!ok) bad++;
});
console.log(bad ? 'FAIL' : 'OK'); process.exit(bad ? 1 : 0);
