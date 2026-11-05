'use strict';
// Holds the page's sound players to the game's own code. index.html's zk-music block (createDriver)
// runs the game's sound engine and music on the kit's 6502 from the listing over ZK_DRIVER_RANGES
// alone, with the music's code (sound 1, from the listing of the part music) at $C300 and each tune
// or effect at $9000. Here the same code runs over the listing's whole memory, with the resource
// put somewhere else in the heap ($A000) and the sound tables pointing there, started as the game
// starts it: restart's setting of the built-in sounds 3, 4 and 5 ($04EB-$0511), then startMusic's
// call of $C304 ($57A5) for a tune
// or start_sound's stop_sound and queue_sound ($57BF) for an effect, and sound_frame ($3FE0) once a
// frame as the frame interrupt calls it ($1354), which every sixth frame, when the main loop has
// finished a pass, first lets the engine begin the sounds queued ($12A2, $FC32). For every button of both players, both must make
// the same writes to the SID in the same order every frame, for up to five minutes or until the
// sound ends, and end on the same frame: a tune when the music is off, an effect when
// isSoundRunning ($571C) would say it has, or for sound 2, whose use count is never counted down,
// when no channel in use plays it and it is neither on the list to start nor waiting for a voice.
// A sound counted as running must be on a channel; one with a part still on a channel after its
// count has run out is listed. Then each is stopped halfway as the game stops it
// (stop_music, $4332, or stop_sound), and the two must stay the same for a second after.
//   node games/c64/zak-mckracken-and-the-alien-mindbenders/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
g.sameBlock('zk-music');
const P = g.run(page, 'zk-music', 'createDriver', 'ZK_DRIVER_RANGES'), ZK_DRIVER_RANGES = P.ZK_DRIVER_RANGES;
// made from its source text alone, as the player's AudioWorklet makes it: a driver that leans on
// the page's other names stops there (kit/skills/c64/steps, "sound")
const createDriver = require('vm').runInNewContext('(' + P.createDriver + ')', { atob });   // the worklet's atob, which sid.js gives it
const L = g.listing('parts/main/listing.json');
const player = g.listing('parts/music/listing.json').ram.slice(0xC300, 0xC736);   // sound 1, as the page takes it
const src = g.read(page);
const j = /<script type="application\/json" id="zk-sounds">([\s\S]*?)<\/script>/.exec(src);
if (!j) throw new Error(page + ' has no zk-sounds data');
const S = JSON.parse(j[1]);
if (S.tunes.length !== 4) throw new Error(`${page} carries ${S.tunes.length} tunes, not 4`);
const b64 = (s) => Uint8Array.from(Buffer.from(s, 'base64'));
const mem = ZK_DRIVER_RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
const FRAMES = 5 * 60 * 50, AT = 0xA000, PASS = 6;   // a pass of the main loop every six frames at the speed the game starts at
let bad = 0, frames = 0, buttons = 0, ended = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };

function reference(c) {
  const m = L.ram.slice(), w = [];
  m.set(player, 0xC300);
  m[0x7542] = m[0x7543] = m[0x7544] = 0x80;
  m[0x74C3] = 0x06; m[0x7444] = 0x44; m[0x74C4] = 0x33; m[0x7445] = 0x44; m[0x74C5] = 0x60; m[0x7446] = 0x44;
  m.set(b64(c.b), AT);
  m[0x74C0 + c.n] = AT & 0xFF; m[0x7441 + c.n] = AT >> 8;
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) { w.push(a - 0xD400, v); return; } throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x24 }, io });
  const call = (a, A) => cpu.call(a, { a: A || 0, x: 0, y: 0 }, { maxSteps: 200000 });
  const port = (v) => cpu.portWrite(1, v);
  let frames = 0;
  if (c.music) { port(0x25); call(0xC304, c.n); port(0x24); }
  else { m[0xFC31] |= 0x80; port(0x25); call(0x3E52, c.n); port(0x24); call(0x3FCE, c.n); m[0xFC31] &= 0x7F; }
  return {
    w,
    frame() {
      w.length = 0;
      if (m[0xFC31]) throw new Error('the interrupt would skip sound_frame');
      if (frames++ % PASS === 0) m[0xFC32] = 1;            // the main loop has a pass ready ($12A2)
      port(0x25); call(0x3FE0); port(0x24);
    },
    stop() { w.length = 0; if (c.music) call(0x4332); else { port(0x25); call(0x3E52, c.n); port(0x24); } },
    on() {
      if (c.music) return m[0x43E8] !== 0;
      let on = m[0x43FA] === c.n;
      for (let x = 0; x < 7; x++) if (m[0x43E0] & m[0x435A + x] && m[0x4375 + x] === c.n) on = true;
      for (let i = 0; i < m[0x4405]; i++) if (m[0x43FB + i] === c.n) on = true;
      if (c.n < 6) return on;                              // never counted down ($4328)
      const running = (m[0x753F + c.n] & 0x7F) !== 0;      // isSoundRunning ($571C)
      if (on && !running) partsLeft.add(c.n);              // a part still stepped, uncounted
      if (running && !on) throw new Error(`sound ${c.n}: counted as running with nothing playing it`);
      return running;
    },
  };
}

const lengths = [], partsLeft = new Set();
for (const [list, set] of [[S.tunes, 'tune'], [S.effects, 'effect']]) list.forEach((c, t) => {
  const D = { mem, player, tunes: list };
  const drv = createDriver(D, kit), ref = reference(c);
  drv.init(t);
  buttons++;
  if (drv.writes.join() !== ref.w.join()) { fail(set, c.n, 'start', drv.writes.join(), '|', ref.w.join()); return; }
  let f = 0;
  for (; f < FRAMES; f++) {
    ref.frame(); drv.play(); frames++;
    if (ref.w.join() !== drv.writes.join()) { fail(set, c.n, 'frame ' + f, ref.w.join(), '|', drv.writes.join()); return; }
    if (ref.on() !== drv.playing()) { fail(set, c.n, 'frame ' + f, ref.on() ? 'still plays in the game' : 'has ended in the game'); return; }
    if (!ref.on()) { ended++; break; }
  }
  lengths.push([set, c.n, f + 1]);
  // stopped halfway, as the game stops it
  const half = Math.max(1, f >> 1), d2 = createDriver(D, kit), r2 = reference(c);
  d2.init(t);
  for (let k = 0; k < half; k++) { r2.frame(); d2.play(); }
  r2.stop(); d2.stop();
  if (r2.w.join() !== d2.writes.join()) { fail(set, c.n, 'stop', r2.w.join(), '|', d2.writes.join()); return; }
  for (let k = 0; k < 50; k++) {
    r2.frame(); d2.play();
    if (r2.w.join() !== d2.writes.join()) { fail(set, c.n, 'frame ' + k + ' after the stop', r2.w.join(), '|', d2.writes.join()); return; }
    if (r2.on() || d2.playing()) { fail(set, c.n, 'plays on after the stop'); return; }
  }
});
for (const [set, n, f] of lengths.filter((l) => l[0] === 'tune')) console.log(`  tune ${n}: ${f} frames`);
console.log(`  ${lengths.filter((l) => l[0] === 'effect' && l[2] > FRAMES).length} effects still running after ${FRAMES} frames`);
if (partsLeft.size) console.log(`  sounds ended by isSoundRunning with a part still on a channel: ${[...partsLeft].join(', ')}`);
console.log(`zk-music: ${buttons} buttons, ${frames.toLocaleString('en')} frames, ${ended} ended by themselves: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code'));
process.exit(bad ? 1 : 0);
