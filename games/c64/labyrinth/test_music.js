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
// Sound effects: the reset $1C6C and the request $1C0C, then $253F and $1C2D a frame at a time until no slot is active ($1C0A).
// The same entries run over the opening's listing; the requests are the ones the selector table at $1FA9 allows.
const LR = g.listing('parts/opening/listing.json');
// Requests 0 and 55 to 58 are not requests: the selector table has 55 bytes, and the streams follow it at $1FE0.
assert.equal(LR.ram[0x1FE0], 0xF0, 'stream 0 should be the filter-form stream the caption describes');
assert.equal(LR.ram[0x1FA9 + 55], LR.ram[0x1FE0], 'selector 55 should read the first stream byte');
const fxData = { common: LAB_MUSIC.common, tunes: LAB_MUSIC.effects };
const wanted = [];
for (let n = 1; n <= 54; n++) if (LR.ram[0x1FA9 + n] & 0x80) wanted.push(n);
assert.deepEqual(LAB_MUSIC.effects.filter((e) => !e.pitch).map((e) => e.fx), wanted, 'effect list differs from the requests the selector table allows');
let fxFrames = 0;
LAB_MUSIC.effects.forEach((e, n) => {
  for (const [a, h] of e.at) assert.equal(h, hex(LR, a, h.length / 2), e.name + ': page bytes differ from the listing');
  const game = [];
  const cpu = new CPU(Uint8Array.from(LR.ram), { port: 0x35, io: { read: () => { throw new Error('I/O read'); }, write: (a, v) => { if (a >= 0xD400 && a <= 0xD418) game.push(a - 0xD400, v); } } });
  const drv = createDriver(fxData, require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js')));
  drv.init(n);
  cpu.call(0x1C6C, {}); if (e.pitch) cpu.call(0x0860, { x: e.fx, a: e.pitch[0], y: e.pitch[1] }); else cpu.call(0x1C0C, { a: e.fx });
  let f = 0;
  for (; f < 5000; f++) {
    game.length = 0;
    cpu.call(0x253F, {}); cpu.call(0x1C2D, {});
    drv.play();
    assert.equal(game.join(), drv.writes.join(), e.name + ': frame ' + f + ' differs');
    writes += game.length / 2;
    if (!cpu.m[0x1C0A]) break;
  }
  assert(!drv.playing(), e.name + ' never ended');
  assert.equal(f + 1, e.frames, e.name + ': length differs from the page data note');
  fxFrames += f + 1;
});
console.log('labyrinth music: ' + LAB_MUSIC.tunes.length + ' tunes, ' + frames + ' frames, ' + LAB_MUSIC.effects.length + ' effects, ' + fxFrames + ' frames, ' + writes + ' SID writes, same as the game’s own code');
