'use strict';
// Holds the Maps and Graphics tabs' drawing, drawScript in reference/jj-page.js, against the
// game's own draw_script ($8A36) and draw_shape ($8A91) run on the kit's simulator over the
// listing's memory: every level's draw script, then each of its change scripts and each bomb's
// wipe on top in the bomb list's order, the bitmap at $4000-$5FFF compared after each.
const path = require('path');
const { game, differ } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { CPU } = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { drawScript } = g.run('reference/jj-page.js', 'drawScript', 'drawScript');
const L = g.listing();
const w = (m, a) => m[a] | m[a + 1] << 8;
const hex = v => '$' + v.toString(16).toUpperCase();
let bad = 0, checks = 0;
for (let n = 0; n < 12; n++) {
  const m = L.ram.slice();
  const cpu = new CPU(m, { port: 0x35, io: { read: () => 0, write: () => {} } });
  cpu.call(0x8049, {}, { maxSteps: 1e6, hooks: { 0x807A: c => c.rts() } });   // the row tables at $1000
  const draw = p => { m[0x3D] = p & 255; m[0x3E] = p >> 8; cpu.call(0x8A36, {}, { maxSteps: 5e6 }); };
  const bmp = new Uint8Array(8192);
  const h = 0xBC00 + 64 * n, script = n === 8 ? 0xB4ED : w(m, h + 0x17);
  const steps = [script];
  for (let p = w(m, h + 0x1B), i = 0; m[p] !== 0xFF; p += 2, i++) {
    const c = m[p + 1] >> 4;
    if (c && w(m, h + 0x1D)) steps.push(w(m, w(m, h + 0x1D) + 2 * c));
    steps.push(['wipe', m[w(m, h + 0x19) + 3 * i], m[w(m, h + 0x19) + 3 * i + 1]]);
  }
  for (const s of steps) {
    if (Array.isArray(s)) {
      const wipe = [0xFE, 0x69, 0x8F, s[1], s[2], 1, 0xFF];
      m.set(wipe, 0x09CA); draw(0x09CA);
      const r = L.ram.slice(); r.set(wipe, 0x09CA); drawScript(r, 0x09CA, bmp);
    } else { draw(s); drawScript(L.ram, s, bmp); }
    checks++;
    const mine = m.subarray(0x4000, 0x6000);
    const at = differ(mine, bmp);
    if (at >= 0) {
      console.log(`level ${n + 1}: ${Array.isArray(s) ? 'wipe' : hex(s)}: ${hex(0x4000 + at)} game ${mine[at]} port ${bmp[at]}`);
      bad++; break;
    }
  }
}
console.log(`${checks} drawings compared, ${bad} differ`);
process.exit(bad ? 1 : 0);
