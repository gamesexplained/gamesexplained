#!/usr/bin/env node
// Hold the page's sound effects against the game's own code. index.html's cr-music block
// (createDriver) also runs the engine's sound effect routines on its 6502 core, for each sound of
// SFX: the pokes and calls that start it (sound_silence, sound_set_music_mode, then the requests
// the game makes), the routines the game's frame runs for sound once a frame (sfx_play_pending
// and sfx_update, with invulnerable_frame and frame_divider for the sound of invulnerability), and
// the requests that come later. This runs the same calls on the kit's 6502 simulator over the
// same bytes and compares every SID write of every frame, in order, to the sound's end. It also
// checks that every byte SFX carries is the engine listing's. Everything it needs is committed.
//   node games/c64/creatures/test_sfx.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { createDriver } = g.run(page, 'cr-music', 'createDriver');
const mm = g.read(page).match(/const SFX = (\{.*?\});/);
if (!mm) { console.error('no SFX data'); process.exit(1); }
const SFX = JSON.parse(mm[1]), E = g.listing('parts/engine/listing.json');
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const [name, regions] of Object.entries(SFX.blocks))
  for (const [base, hex] of regions)
    for (let i = 0; i < hex.length / 2; i++)
      if (!E.has[base + i] || E.ram[base + i] !== parseInt(hex.substr(2 * i, 2), 16)) { fail(`SFX block ${name} at $${(base + i).toString(16)} is not the engine's byte`); break; }
const LIMIT = 5000;
SFX.tunes.forEach((T, t) => {
  const P = SFX.players[T.player], S = T.sfx;
  const m = new Uint8Array(0x10000);
  for (const name of T.blocks) for (const [base, hex] of SFX.blocks[name]) for (let i = 0; i < hex.length / 2; i++) m[base + i] = parseInt(hex.substr(2 * i, 2), 16);
  let writes = [];
  const io = {
    read(a) { throw new Error(T.name + ': read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) writes.push(a - 0xD400, v); else throw new Error(T.name + ': write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io, strict: true });
  const start = (pokes, calls) => { for (const [a, v] of pokes || []) m[a] = v; for (const [a, x, y] of calls || []) cpu.call(a, { x, y }); };
  const busy = (f) => !(S.end && f >= S.end) && P.on.concat(S.on || []).some((a) => m[a]);
  start(S.pokes, S.calls);
  let first = writes;
  const drv = createDriver(SFX);
  drv.init(t);
  let f = 0;
  for (; f < LIMIT && busy(f); f++) {
    writes = [];
    for (const [at, pokes, calls] of S.later || []) if (at === f) start(pokes, calls);
    for (const e of [].concat(S.frame || P.frame)) cpu.call(e, {});
    const gm = first.concat(writes); first = [];
    drv.play();
    if (gm.join() !== drv.writes.join()) fail(T.name, 'frame', f, 'game', gm.join().slice(0, 120), 'page', drv.writes.join().slice(0, 120));
    if (drv.playing() !== busy(f + 1)) fail(T.name, 'frame', f, 'playing() disagrees');
  }
  if (f >= LIMIT) fail(T.name, 'still playing after', LIMIT, 'frames');
  console.log(`${T.name}: ${f} frames`);
});
console.log(bad ? `${bad} differences` : 'every write matches');
process.exit(bad ? 1 : 0);
