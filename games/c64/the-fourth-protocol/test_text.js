#!/usr/bin/env node
// Hold the page's memo reader against episode one's own printing. index.html's tfp-text block
// unpacks a text as next_word ($642F) reads it and prints it as print_text ($63AC) does. Here the
// game's print_text runs on the kit's simulator over episode one's listing for every text of every
// table the page offers (TFP_TEXT_TABLES), with a hook on the operating system's print-a-character
// entry ($EC03) collecting what it prints. The page's text must be the same characters in the same
// order. It exits 1 on any difference.
//   node games/c64/the-fourth-protocol/test_text.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { TFP_TEXT_TABLES, tfpWords, tfpText } = g.run(page, 'tfp-text', 'TFP_TEXT_TABLES', 'tfpWords', 'tfpText');
const L = g.listing('parts/nato-documents/listing.json');
const W = tfpWords(L.ram);
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
let bad = 0, n = 0, chars = 0;
for (const t of TFP_TEXT_TABLES) for (let i = 0; i < t.n; i++) {
  const ad = L.ram[t.at + 2 * i] | L.ram[t.at + 2 * i + 1] << 8;
  if (!ad) continue;
  let out = '';
  const cpu = new CPU(L.ram.slice(), { port: { dir: 0x2F, data: 0x35 }, io });
  cpu.call(0x63AC, { x: ad & 255, y: ad >> 8 }, { maxSteps: 1e9, hooks: { 0xEC03: (c) => { out += String.fromCharCode(c.a); c.rts(); } } });
  const page = tfpText(L.ram, W, ad);
  n++; chars += out.length;
  if (page !== out && bad++ < 10) console.log('DIFFERS', t.name, i, JSON.stringify(out), '|', JSON.stringify(page));
}
if (n < 100) { console.log('only', n, 'texts: the tables are wrong'); bad++; }
console.log(`${n} texts, ${chars} characters: ` + (bad ? bad + ' differences' : 'every text matches what print_text prints'));
process.exit(bad ? 1 : 0);
