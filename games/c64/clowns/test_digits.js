#!/usr/bin/env node
// Hold the page's port of the score printer against the game's own. index.html's clowns-digits
// block (statusDigits) runs beside show_status_number ($F668) on the kit's 6502 simulator, over the
// bytes of the committed listing, for every score from 0 to 65,535: the six cells the routine writes
// at columns 8-13 of the status line must be the port's. It exits 1 on any difference.
//   node games/c64/clowns/test_digits.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { statusDigits } = g.run(page, 'clowns-digits', 'statusDigits');
const image = g.listing().ram;
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
let bad = 0;
for (let v = 0; v < 65536; v++) {
  const m = image.slice();
  new CPU(m, { port: { dir: 0x2F, data: 0xE5 }, io }).call(0xF668, { a: v & 255, x: v >> 8, y: 0 });
  const game = Array.from(m.slice(0x0408, 0x040E)), port = statusDigits(v);
  if (game.join() !== port.join() && bad++ < 10) console.log('DIFFERS', v, game.join(), '|', port.join());
}
console.log(`65536 scores, ${bad ? bad + ' differences' : 'every one matches'}`);
process.exit(bad ? 1 : 0);
