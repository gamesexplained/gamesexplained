#!/usr/bin/env node
// Hold the page's music driver against the game's own code. index.html's cr-music block
// (createDriver) runs Creatures' music player on a 6502 core of its own; this runs the same
// player on the kit's 6502 simulator over the same bytes, as the game starts a tune (the hook
// operands music_set_hooks writes, then music_play) and plays it (music_frame once a frame),
// and compares every SID write of every frame, in order, for every tune: to its end, or for
// 20,000 frames (six and a half minutes) when it repeats. It also checks that every byte the
// page's MUSIC carries is the committed listing's, part by part. Everything it needs is committed.
//   node games/c64/creatures/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { createDriver } = g.run(page, 'cr-music', 'createDriver');
const mm = g.read(page).match(/const MUSIC = (\{.*?\});/);
if (!mm) { console.error('no MUSIC data'); process.exit(1); }
const MUSIC = JSON.parse(mm[1]);
const L = {}, lst = (p) => L[p] || (L[p] = g.listing('parts/' + p + '/listing.json'));
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
// every block's bytes are the listing's: the players from the engine and the title, each tune
// from the part that holds it
const owner = { eng: 'engine', int: 'intro' };
MUSIC.tunes.forEach((T) => { owner[T.blocks[1]] = T.part; });
for (const [name, regions] of Object.entries(MUSIC.blocks)) {
  const Lp = lst(owner[name]);
  for (const [base, hex] of regions) {
    for (let i = 0; i < hex.length / 2; i++) {
      if (!Lp.has[base + i] || Lp.ram[base + i] !== parseInt(hex.substr(2 * i, 2), 16)) { fail(`MUSIC block ${name} at $${(base + i).toString(16)} is not part ${owner[name]}'s byte`); break; }
    }
  }
}
const LIMIT = 20000;
MUSIC.tunes.forEach((T, t) => {
  const P = MUSIC.players[T.player];
  // the game's memory: only what the page carries, so that the page cannot lean on anything else
  const m = new Uint8Array(0x10000);
  for (const name of T.blocks) for (const [base, hex] of MUSIC.blocks[name]) for (let i = 0; i < hex.length / 2; i++) m[base + i] = parseInt(hex.substr(2 * i, 2), 16);
  if (T.hooks) T.hooks.forEach((h, i) => { m[P.hooks[i]] = h; });
  let writes = [];
  const io = {
    read(a) { throw new Error(T.name + ': read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) writes.push(a - 0xD400, v); else throw new Error(T.name + ': write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io, strict: true });
  cpu.call(P.play, { y: T.at & 255, x: T.at >> 8 });
  let first = writes;
  const drv = createDriver(MUSIC);
  drv.init(t);
  let f = 0, notes = 0;
  for (; f < LIMIT && m[P.on]; f++) {
    writes = [];
    cpu.call(P.frame, {});
    const game = first.concat(writes); first = [];
    drv.play();
    if (game.join() !== drv.writes.join()) fail(T.name, 'frame', f, 'game', game.join().slice(0, 120), 'page', drv.writes.join().slice(0, 120));
    for (let i = 0; i < game.length; i += 2) if (game[i] < 21 && game[i] % 7 === 4 && game[i + 1] & 1) notes++;
    if (drv.playing() !== !!m[P.on]) fail(T.name, 'frame', f, 'playing() disagrees');
  }
  console.log(`${T.name}: ${f} frames${m[P.on] ? ' (still playing)' : ', ended'}, ${notes} gate-on writes`);
});
console.log(bad ? `${bad} differences` : 'every write matches');
process.exit(bad ? 1 : 0);
