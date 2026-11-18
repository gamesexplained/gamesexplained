#!/usr/bin/env node
// Holds the Music tab's effect player (reference/bd-sfx.js) to the game: every effect it offers runs
// to its end on the kit's 6502 over listing.json's bytes, turns its voice's gate on, and writes the
// registers the effects table on music.html gives; the table's figures are the listing's bytes.
//   node games/c64/boulder-dash/test_sfx.js
'use strict';
const path = require('path');
const C64Cpu = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js'));
const BDSFX = require(path.join(__dirname, 'reference/bd-sfx.js'));
const ram = new Uint8Array(0x10000);
for (const r of require(path.join(__dirname, 'listing.json')).records) if (r.b) ram.set(r.b, r.a);
const page = require('fs').readFileSync(path.join(__dirname, 'music.html'), 'utf8');
const data = { blocks: [[0, Buffer.from(ram).toString('base64')]] };
let bad = 0;
const fail = (...w) => { bad++; console.log('FAIL', ...w); };
const word = a => ram[a] | ram[a + 1] << 8;
const hx = v => '$' + v.toString(16).toUpperCase().padStart(4, '0');

// effect, voice (0-2), the register table it starts from, the pitch the page quotes
const CASES = [
  [0, 0, 0x7522, '$1478'], [1, 0, null, null], [2, 0, 0x71E7, '$0932'],
  [3, 1, 0x713D, '$1432'], [4, 2, 0x7418, '$2F32'], [5, 1, null, null],
];
for (const [id, v, table, pitch] of CASES) {
  const d = BDSFX.createDriver(data, C64Cpu);
  d.init(id);
  let frames = 0, gated = false, sawPitch = table === null;
  while (d.playing()) {
    d.play(); frames++;
    for (let i = 0; i < d.writes.length; i += 2) {
      const r = d.writes[i], val = d.writes[i + 1];
      if (r === v * 7 + 4 && val & 1) gated = true;
    }
    if (table !== null && (d.sid[v * 7] | d.sid[v * 7 + 1] << 8) === word(table)) sawPitch = true;
    if (frames > 1000) { fail(`effect ${id} never ends`); break; }
  }
  if (!gated && id !== 3) fail(`effect ${id}: voice ${v + 1}'s gate never comes on`);
  if (!sawPitch) fail(`effect ${id}: voice ${v + 1} never gets the pitch at ${hx(table)}`);
  if (pitch && hx(word(table)) !== pitch) fail(`effect ${id}: the listing's pitch is ${hx(word(table))}, the page says ${pitch}`);
  if (pitch && !page.includes('<b>' + pitch + '</b>')) fail(`music.html does not quote ${pitch}`);
}
// the explosion writes voice 2 directly, gate on, before the first frame
{ const d = BDSFX.createDriver(data, C64Cpu); d.init(3); if (!(d.sid[11] & 1)) fail('the explosion does not gate voice 2'); }
console.log(bad ? `${bad} failure(s)` : 'OK - 6 effects run and match the table');
process.exit(bad ? 1 : 0);
