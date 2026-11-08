// Checks GOONMUSIC.createEffects (reference/goonies-music.js), the port of The Goonies' sound
// effects, against the game's own code run in the kit's 6502 simulator on the committed listing:
// effects_init ($C8F0), then start_sound ($92C7) with each effect's sound number, then
// effects_play ($BA09) once a frame. Every SID write must match, in order, every frame.
//   node test_effects.js [frames]      (default 3000 frames an effect, a minute)
const path = require('path');
const { CPU } = require(path.join(__dirname, '../../../kit/cpu/cpu6502'));
const GOONMUSIC = require(path.join(__dirname, 'reference/goonies-music.js'));
const L = require(path.join(__dirname, 'listing.json')).records;
const N = +process.argv[2] || 3000;
const image = new Uint8Array(65536);
for (const r of L) if (r.b) image.set(r.b, r.a);
const data = { sounds: image.slice(0x9384, 0x93EC), driver: image.slice(0xBA00, 0xD000) };
let bad = 0, n = 0;
for (let snd = 0; snd < 25; snd++) {
  if (image[0x93CF + snd]) continue;                   // a tune
  n++;
  const m = image.slice();
  let got = [];
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) got.push(a - 0xD400, v); else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  const fx = GOONMUSIC.createEffects(data);
  cpu.call(0xC8F0, {}); cpu.call(0x92C7, { a: snd });
  fx.init(snd);
  const check = (f, w) => {
    const a = got.join(), b = w.join();
    if (a !== b) { if (bad < 5) console.log(`sound ${snd} frame ${f}: game [${a}] port [${b}]`); bad++; }
    got = [];
  };
  check(-1, fx.writes);
  let end = -1;
  for (let f = 0; f < N; f++) {
    cpu.call(0xBA09, {}); fx.play(); check(f, fx.writes);
    if (end < 0 && !fx.playing()) end = f;
  }
  console.log(`sound ${snd} (effect ${image[0x9384 + snd]}): ${end < 0 ? 'still playing after ' + N + ' frames' : 'ends at frame ' + end}`);
}
if (bad) { console.log(`FAIL - ${bad} frames differ`); process.exit(1); }
console.log(`OK - ${n} effects, every SID write matches the game's own code for ${N} frames each`);
