#!/usr/bin/env node
// Hold the Discoveries page to the game's code. Its storm-machine block must be the one every page
// carries, index.html's, which test_machine.js checks. Its storm-spell block (SPELL_STEPS) walks the
// spell bug on the page's machine (stormRooms); the same steps are run on the kit's simulator through
// a machine of this test's own with the same calls (enter, pass, hit, spell), over the bytes the page
// reads, and every byte of memory outside the stack page must match after each step but the last.
// The last, the second scroll, must not return on either. It exits 1 on any difference.
//   node games/c64/storm/test_discoveries.js [discoveries.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game, differ } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'discoveries.html';
g.lib('cpu6502');                   // the 6502 the storm-machine block runs on, as the page loads it
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
g.sameBlock('storm-machine', page);   // every page's copy, and the page tested
const { stormRooms } = g.run(page, 'storm-machine', 'stormRooms');
const { SPELL_STEPS } = g.run(page, 'storm-spell', 'SPELL_STEPS');

// The bytes the page has: every byte of listing.json, which it fetches whole
const ram = g.listing().ram.slice();

// The same machine on the kit's simulator: each call starts with A, X and Y 0 and every flag
// clear, as stormCore does, and sfx_start returns at once
function simRooms(image) {
  const m = image.slice();
  const io = {
    read(a) {
      if (a >= 0xD800 && a < 0xDC00) return m[a];
      if (a === 0xD012) return 0xF0;
      if (a === 0xDC00 || a === 0xDC01) return 0xFF;
      throw new Error('read $' + a.toString(16));
    },
    write(a, v) { if (a >= 0xD800 && a < 0xDC00) { m[a] = v; return; } throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x37 }, io });
  const Z = { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 }, quiet = { hooks: { 0x5645: (c) => { c.rts(); } } };
  cpu.call(0x7EA2, Z); cpu.call(0x7EFF, Z);
  const start = m.slice();
  return {
    m,
    enter(r) {
      m.set(start); m[0x8118] = r;
      for (const a of [0x814C, 0x8141, 0x8142, 0x8143, 0x8145, 0x8147, 0x8107, 0x8125]) m[a] = 0;
      m.fill(0, 0x8742, 0x874C); m[0x8643] = m[0x863F] = 0xFF;
      for (const e of [0x5938, 0x5984, 0x5A21, 0x5AD1, 0x5BF8, 0x5CD1]) cpu.call(e, Z);
      m[0x8106] = 0; m[0x8137] = 1; cpu.call(0x65C2, Z); cpu.call(0x65E1, Z);
    },
    pass() { m[0x8149] = m[0x814A] = 0; cpu.call(0x5FB6, Z, quiet); cpu.call(0x5E11, Z, quiet); },
    hit(slot) { cpu.call(0x7D0C, { ...Z, a: 0xA0 + 8 * slot }, quiet); },
    spell() { cpu.call(0x69C0, Z, quiet); },
  };
}

const R = stormRooms(ram), S = simRooms(ram), seen = [];
SPELL_STEPS.forEach((step, i) => {
  const last = i === SPELL_STEPS.length - 1;
  let pageErr = null, simErr = null;
  try { step(R); } catch (e) { pageErr = e; }
  try { step(S); } catch (e) { simErr = e; }
  if (last) {
    if (!pageErr || !simErr) fail('step', i, 'the second scroll returns on', !pageErr ? 'the page' : 'the simulator');
    return;
  }
  if (pageErr || simErr) { fail('step', i, 'stops:', (pageErr || simErr).message); return; }
  const at = differ(R.m, S.m, [[0x0000, 0x00FF], [0x0200, 0xFFFF]]);
  if (at >= 0) fail('step', i, 'at $' + at.toString(16));
  seen.push(R.m[0x8142]);
});
const want_counts = [6, 5, 0, 0, 255, 255];
if (seen.join() !== want_counts.join()) fail('mon_count after each step is', seen.join(), 'not', want_counts.join());
console.log(`${SPELL_STEPS.length} steps of the spell bug, mon_count ${seen.join(', ')}: ${bad ? bad + ' differences' : 'every byte matches, and the second scroll returns on neither'}`);
process.exit(bad ? 1 : 0);
