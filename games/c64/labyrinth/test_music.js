#!/usr/bin/env node
'use strict';
// Holds the Music page's player against the game's own sound code. music.html's labyrinth-music block
// (createDriver and its data LAB_MUSIC) runs the engine ($253F, $1C2D, started through $0869 or $086F)
// over the bytes the page embeds; here the same entries run over the committed listings, the resident
// part under the opening, scene 1 or scene 26. Every frame's SID writes must be the same, in the same
// order, for each of the five tunes from start to the frame the game's music-stop flag $0357 goes
// negative, and the page's bytes must be the listing's. No disk image, snapshot or emulator.
//   node games/c64/labyrinth/test_music.js
const assert = require('assert'), path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { CPU } = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js'));
const g = require('./layered.js')(game(__dirname));
const { createDriver, LAB_MUSIC } = g.run('music.html', 'labyrinth-music', 'createDriver', 'LAB_MUSIC');
const PARTS = ['opening', 'opening', 'scene-01', 'scene-26', 'scene-26'];
assert.equal(LAB_MUSIC.tunes.length, PARTS.length);
const hex = (L, a, n) => Array.from(L.ram.slice(a, a + n), (v) => v.toString(16).padStart(2, '0')).join('');
let frames = 0, writes = 0;
LAB_MUSIC.tunes.forEach((t, n) => {
  const L = g.listing('parts/' + PARTS[n] + '/listing.json');
  for (const [a, h] of LAB_MUSIC.common.concat(t.at)) {
    for (let i = 0; i < h.length / 2; i++) assert(L.has[a + i], t.name + ': $' + (a + i).toString(16) + ' is not in the listing');
    assert.equal(h, hex(L, a, h.length / 2), t.name + ': page bytes at $' + a.toString(16) + ' differ from the listing');
  }
  const game = [];
  const cpu = new CPU(Uint8Array.from(L.ram), { port: 0x35, io: { read: () => { throw new Error('I/O read'); }, write: (a, v) => { if (a >= 0xD400 && a <= 0xD418) game.push(a - 0xD400, v); else throw new Error('I/O write $' + a.toString(16)); } } });
  const drv = createDriver(LAB_MUSIC, require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js')));
  drv.init(n);
  if (t.jingle) cpu.call(0x0869, {}); else cpu.call(0x086F, { y: t.y, x: t.x });
  assert.equal(game.join(), drv.writes.join(), t.name + ': start differs');
  let f = 0;
  for (; f < 20000; f++) {
    game.length = 0;
    if (!(cpu.m[0x357] & 0x80)) { cpu.call(0x253F, {}); cpu.call(0x1C2D, {}); }
    drv.play();
    assert.equal(game.join(), drv.writes.join(), t.name + ': frame ' + f + ' differs');
    writes += game.length / 2;
    if (!drv.playing()) break;
  }
  assert(!drv.playing(), t.name + ' never ended');
  assert.equal(f, t.frames - 1, t.name + ': length differs from the page data note');
  frames += f + 1;
});
console.log('labyrinth music: ' + LAB_MUSIC.tunes.length + ' tunes, ' + frames + ' frames, ' + writes + ' SID writes, same as the game’s own code');
