#!/usr/bin/env node
// Hold the page's music driver against the game's own code. index.html's gx-music block
// (createDriver) runs Gauntlet's two music players on a 6502 core of its own; this runs the same
// players on the kit's 6502 simulator over the committed listing, as level_intro ($9BEF) and
// treasure_start ($B0D1) call them, and compares every SID write of every frame, in order, for
// all three tunes to their ends. It also checks that the page's MUSIC bytes are the listing's.
// Everything it needs is committed.
//   node games/c64/gauntlet/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { createDriver } = g.run(page, 'gx-music', 'createDriver');
const html = g.read(page);
const mm = html.match(/const MUSIC = (\{.*?\});/);
if (!mm) { console.error('no MUSIC data'); process.exit(1); }
const MUSIC = JSON.parse(mm[1]);
const L = g.listing();
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const [base, hex] of MUSIC.regions) {
  const want = Buffer.from(L.ram.slice(base, base + hex.length / 2)).toString('hex');
  if (want !== hex) fail('MUSIC region $' + base.toString(16) + ' is not the listing\'s bytes');
}
const TUNES = [['title', 0xE003, 0x10, 0xE000, 0xE69E], ['jingle', 0xE003, 0xEA, 0xE000, 0xE69E], ['treasure', 0xA039, 0xE8, 0xA036, 0xA03C]];
TUNES.forEach(([name, init, hi, play, flag], t) => {
  // the game's memory: only what the page carries, so that the page cannot lean on anything else
  const m = new Uint8Array(0x10000);
  for (const [base, hex] of MUSIC.regions) for (let i = 0; i < hex.length / 2; i++) m[base + i] = L.ram[base + i];
  let game = [];
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) game.push(a - 0xD400, v); else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io, strict: true });
  cpu.call(init, { a: 0x00, x: hi });
  m[flag] = 1;
  const drv = createDriver(MUSIC);
  drv.init(t);
  let f = 0, notes = 0;
  for (; f < 5000 && m[flag]; f++) {
    game = [];
    cpu.call(play, {});
    drv.play();
    if (game.join() !== drv.writes.join()) fail(name, 'frame', f, 'game', game.join(), 'page', drv.writes.join());
    for (let i = 0; i < game.length; i += 2) if (game[i] % 7 === 4 && game[i + 1] & 1) notes++;
    if (drv.playing() !== !!m[flag]) fail(name, 'frame', f, 'playing() disagrees');
  }
  if (m[flag]) fail(name, 'did not end in 5000 frames');
  console.log(`${name}: ${f} frames, ${notes} gate-on writes`);
});
console.log(bad ? `${bad} differences` : 'every write matches');
process.exit(bad ? 1 : 0);
