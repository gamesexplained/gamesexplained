#!/usr/bin/env node
// Hold the page's port of the music driver against the game's own. index.html's svs-music block
// (createDriver) runs beside play_music ($954E) on the kit's 6502 simulator, over the bytes of the
// committed listing, with the driver's variables set as reset_play_state ($8F67) sets them. Every
// frame, the SID writes each makes must be the same, in the same order, for 20,000 frames (more
// than five minutes, several passes of both voices' loops); then the music is switched off with S
// ($0263) and on again, as read_controls does, and the two must agree through that too. Everything
// it needs is committed: no disk image, no snapshot, no emulator. It exits 1 on any difference.
//   node games/c64/spy-vs-spy/test_music.js [page.html]
const fs = require('fs'), path = require('path');
const GAME = __dirname + '/', ROOT = path.resolve(GAME, '../../..');
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const html = fs.readFileSync(process.argv[2] || GAME + 'index.html', 'utf8');
const a = html.indexOf('/* svs-music */'), b = html.indexOf('</script>', a);
if (a < 0) { console.error('no /* svs-music */ block'); process.exit(1); }
const createDriver = new Function(html.slice(a, b < 0 ? undefined : b) + '\nreturn createDriver;')();
const dm = html.match(/SVS_MUSIC\s*=\s*(\{[^}]*\})/);
if (!dm) { console.error('no SVS_MUSIC data'); process.exit(1); }
const DATA = JSON.parse(dm[1].replace(/(\w+):/g, '"$1":'));

const image = new Uint8Array(65536);
for (const r of require(GAME + 'listing.json').records) if (r.b) image.set(r.b, r.a);
const hex = Array.from(image.slice(0x23DA, 0x254D), v => v.toString(16).padStart(2, '0')).join('');
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
if (DATA.base !== 0x23DA || DATA.hex !== hex) fail('SVS_MUSIC is not $23DA-$254C of the listing');

const m = image.slice();
let game = [];
const io = {
  read(a) { throw new Error('read $' + a.toString(16)); },
  write(a, v) { if (a >= 0xD400 && a <= 0xD418) game.push(a - 0xD400, v); else throw new Error('write $' + a.toString(16)); },
};
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
function gameStart() {                                     // reset_play_state $8F67-$8F94
  m[0x026C] = m[0x026D] = 1; m[0x0264] = m[0x0265] = 3; m[0x0266] = m[0x0267] = 0xFD;
  m[0x0268] = 0x54; m[0x0269] = 0x78; m[0x0280] = m[0x0281] = m[0x027E] = m[0x027F] = 0;
}
for (let i = 0x0270; i < 0x027E; i++) m[i] = 0;
m[0x0263] = 0; gameStart();
const drv = createDriver(DATA);
drv.init(0);
const N = 20000, OFF = 15000, ON = 15300;
let notes = 0;
for (let f = 0; f < N; f++) {
  if (f === OFF) { m[0x0263] = 1; }                        // S: music off ($9505)
  if (f === ON) { m[0x0263] = 0; gameStart(); drv.again(); } // S again: on, from the top
  game = f === 0 ? [0x15, 0, 0x16, 0, 0x17, 0, 0x18, 0x0F] : [];  // reset_play_state's SID writes, $8F57-$8F64
  cpu.call(0x954E, {});
  if (f === OFF) drv.stop();
  drv.play();
  const port = drv.writes;
  if (game.join() !== port.join()) fail('frame', f, 'game', game.join(), 'port', port.join());
  for (let i = 0; i < game.length; i += 2) if ((game[i] === 11 || game[i] === 18) && game[i + 1] & 1) notes++;
}
console.log(`${N} frames, ${notes} notes started, ${bad ? bad + ' frames differ' : 'every write matches'}`);
process.exit(bad ? 1 : 0);
