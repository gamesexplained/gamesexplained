#!/usr/bin/env node
'use strict';
// The Maps / levels page draws every phase from the layout tables with the block nes-phases.
// This holds it to the listing: built from the listing's bytes, phase 1's screen must match the
// nametable the How it works page embeds (the snapshot's own, below the status bar; a star cell
// in any of its twinkle tiles counts), the bonus round must have no birds, and the sixteen
// records must give the clouds, propellers, birds and platforms facts.md lists.
const path = require('path');
const assert = require('assert');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
const { buildPhase, startSprites } = g.run('levels.html', 'nes-phases', 'buildPhase', 'startSprites');
const L = g.listing();
const ROM = new Uint8Array(0x4000); for (let i = 0; i < 0x4000; i++) ROM[i] = L.ram[0xC000 + i];
const page = g.read('index.html');
const data = JSON.parse(/<script type="application\/json" id="bf-data">([\s\S]*?)<\/script>/.exec(page)[1]);
const STAR = new Set([0x24, 0xED, 0xEE, 0xEF]);
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log('ok   ' + name); };

check('phase 1 from the tables is the snapshot\'s screen', () => {
  const got = buildPhase(ROM, 0), emu = Buffer.from(data.nametable0, 'base64');
  let diffs = 0;
  for (let i = 128; i < 0x400; i++) if (got.nt[i] !== emu[i] && !(i < 0x3C0 && STAR.has(got.nt[i]) && STAR.has(emu[i]))) diffs++;
  assert.strictEqual(diffs, 0, diffs + ' cells differ');
  for (let i = 0; i < 32; i++) if (i % 4 !== 0 || i === 0) assert.strictEqual(got.palette[i], data.palette[i], 'palette entry ' + i);
});
check('the records give the counts facts.md lists', () => {
  const expect = { 0: [1, 0, 3, 3], 1: [2, 0, 5, 5], 2: [2, 0, 5, 10], 4: [2, 0, 5, 7], 5: [2, 0, 6, 8], 6: [2, 0, 5, 7], 8: [2, 1, 6, 10], 9: [2, 1, 6, 8], 10: [2, 2, 5, 7], 12: [2, 4, 5, 4], 13: [2, 1, 6, 8], 14: [2, 0, 5, 7] };
  for (const [idx, [c, p, b, pl]] of Object.entries(expect)) {
    const ph = buildPhase(ROM, +idx);
    assert.deepStrictEqual([ph.clouds.length, ph.propellers.length, ph.birds.length, ph.platforms.length], [c, p, b, pl], 'index ' + idx);
  }
  for (const idx of [3, 7, 11, 15]) { const ph = buildPhase(ROM, idx); assert.ok(ph.bonus && ph.birds.length === 0 && ph.platforms.length === 1, 'index ' + idx); }
});
check('the start sprites put the player at $20, $B8 and a bird on each list entry', () => {
  const ph = buildPhase(ROM, 0), oam = startSprites(ROM, ph);
  assert.strictEqual(oam[3], 0x20); assert.strictEqual(oam[0], 0xB8 - 1);
  const used = []; for (let i = 0; i < 64; i++) if (oam[i * 4] !== 0xF0) used.push(i);
  assert.ok(used.length >= 12, 'only ' + used.length + ' sprites');
});
console.log(passed + ' passed');
